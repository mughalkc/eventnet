const Event = require('../src/models/Event');
const Registration = require('../src/models/Registration');
const Revenue = require('../src/models/Revenue');

const listUpcomingEvents = {
  name: 'listUpcomingEvents',
  description: 'Get a list of upcoming events from the EventNet platform. Returns comprehensive event details including titles, descriptions, dates, locations, pricing, and availability.',
  func: async (filter = {}) => {
    try {
      const query = { startDate: { $gte: new Date() } };
      
      // Add filtering logic
      if (filter.location) query['location.address'] = { $regex: filter.location, $options: 'i' };
      if (filter.minPrice) query['tickets.price'] = { $gte: filter.minPrice };
      if (filter.isVirtual !== undefined) query['location.isVirtual'] = filter.isVirtual;
      if (filter.theme) query.theme = filter.theme;
      
      const events = await Event.find(query)
        .populate('createdBy', 'name email')
        .sort({ startDate: 1 })
        .limit(20);
      
      const enrichedEvents = events.map(event => ({
        id: event._id,
        name: event.name,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        startTime: event.startTime,
        endTime: event.endTime,
        location: event.location,
        capacity: event.capacity,
        maxCapacity: event.maxCapacity,
        organizer: event.createdBy,
        tickets: event.tickets,
        image: event.image,
        coverImage: event.coverImage,
        status: event.status,
        theme: event.theme,
        isPublic: event.isPublic,
        requireApproval: event.requireApproval,
        attendeesCount: event.attendees ? event.attendees.length : 0,
        createdAt: event.createdAt
      }));
      
      return {
        success: true,
        count: enrichedEvents.length,
        events: enrichedEvents,
        message: `Found ${enrichedEvents.length} upcoming events`
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch events',
        message: 'Unable to retrieve events at the moment'
      };
    }
  }
};

const checkSeatAvailability = {
  name: 'checkSeatAvailability',
  description: 'Check seat availability for a specific event by event ID. Returns detailed availability information including remaining spots, capacity, and ticket types.',
  func: async (eventId) => {
    try {
      const event = await Event.findById(eventId);
      if (!event) {
        return {
          success: false,
          error: 'Event not found',
          message: 'The specified event could not be found'
        };
      }

      const totalSold = event.tickets.reduce((sum, ticket) => sum + (ticket.soldCount || 0), 0);
      const totalCapacity = event.capacity === 'unlimited' ? 'unlimited' : event.maxCapacity;
      const remainingSpots = event.capacity === 'unlimited' ? 'unlimited' : (event.maxCapacity - totalSold);

      const availabilityData = {
        success: true,
        eventId: event._id,
        eventName: event.name,
        capacity: event.capacity,
        maxCapacity: event.maxCapacity,
        totalSold: totalSold,
        remainingSpots: remainingSpots,
        tickets: event.tickets.map(ticket => ({
          id: ticket._id,
          name: ticket.name,
          type: ticket.type,
          price: ticket.price,
          quantity: ticket.quantity,
          soldCount: ticket.soldCount,
          available: ticket.quantity ? (ticket.quantity - ticket.soldCount) : 'unlimited'
        })),
        status: event.status
      };

      return availabilityData;
    } catch (error) {
      return {
        success: false,
        error: 'Failed to check availability',
        message: 'Unable to check seat availability at the moment'
      };
    }
  }
};

const getEventRegistrations = {
  name: 'getEventRegistrations',
  description: 'Get registration details for a specific event. Returns list of registered attendees and registration statistics. (Organizer only)',
  func: async (eventId) => {
    try {
      const registrations = await Registration.find({ event: eventId })
        .populate('user', 'name email')
        .populate('event', 'title');
      
      const event = await Event.findById(eventId);
      
      return {
        success: true,
        eventId: eventId,
        eventName: event?.name,
        totalRegistrations: registrations.length,
        registrations: registrations.map(reg => ({
          id: reg._id,
          user: reg.user,
          registrationDate: reg.createdAt,
          status: reg.status,
          ticketType: reg.ticketType
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch registrations',
        message: 'Unable to retrieve registration data'
      };
    }
  }
};

const getEventRevenue = {
  name: 'getEventRevenue',
  description: 'Get revenue and sales analytics for a specific event. Returns total revenue, tickets sold, and financial breakdown. (Organizer only)',
  func: async (eventId) => {
    try {
      const revenue = await Revenue.findOne({ event: eventId });
      const event = await Event.findById(eventId);
      
      const revenueData = revenue || { totalRevenue: 0, ticketsSold: 0 };
      
      return {
        success: true,
        eventId: eventId,
        eventName: event?.name,
        totalRevenue: revenueData.totalRevenue,
        ticketsSold: revenueData.ticketsSold,
        ticketBreakdown: event?.tickets.map(ticket => ({
          name: ticket.name,
          type: ticket.type,
          price: ticket.price,
          soldCount: ticket.soldCount,
          revenue: ticket.price * ticket.soldCount
        })) || []
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to fetch revenue data',
        message: 'Unable to retrieve revenue information'
      };
    }
  }
};

module.exports = {
  listUpcomingEvents,
  checkSeatAvailability,
  getEventRegistrations,
  getEventRevenue,
};
