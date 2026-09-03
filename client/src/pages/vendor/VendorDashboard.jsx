import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
import {
  CalendarIcon,
  UserGroupIcon,
  ChartBarIcon,
  QrCodeIcon,
  PlusIcon,
  ClipboardDocumentListIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';


const VendorDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalEvents: 0,
    activeEvents: 0,
    totalRegistrations: 0,
    totalRevenue: 0
  });
  const [recentEvents, setRecentEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showRegistrationsModal, setShowRegistrationsModal] = useState(false);
  const [registrations, setRegistrations] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const [statsRes, eventsRes] = await Promise.all([
        fetch('https://eventnet-production.up.railway.app/api/vendor/stats', { headers }),
        fetch('https://eventnet-production.up.railway.app/api/vendor/events/recent', { headers })
      ]);

      if (!statsRes.ok || !eventsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const statsData = await statsRes.json();
      const eventsData = await eventsRes.json();

      setStats({
        ...statsData,
        totalRevenue: statsData.totalRevenue || 0 // Provide default value
      });
      setRecentEvents(eventsData);
    } catch (error) {
      console.error('Dashboard error:', error);
      toast.error('Failed to fetch dashboard data');
      setStats({
        totalEvents: 0,
        activeEvents: 0,
        totalRegistrations: 0,
        totalRevenue: 0
      });
      setRecentEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      console.log('Fetching vendor events...');
      const token = localStorage.getItem('token');
      const response = await fetch('https://eventnet-production.up.railway.app/api/events/vendor', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        console.error('Failed to fetch events:', response.status, response.statusText);
        throw new Error('Failed to fetch events');
      }
      
      const text = await response.text();
      console.log('Raw response:', text);
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('Failed to parse JSON:', e);
        throw new Error('Invalid response format');
      }
      
      console.log('Parsed events data:', data);
      setEvents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error in fetchEvents:', error);
      toast.error('Failed to fetch events');
      setEvents([]);
    }
  };

  const handleViewRegistrations = async (event) => {
    setSelectedEvent(event);
    setShowRegistrationsModal(true);
    try {
      console.log(`Fetching guests for event: ${event.name} (${event._id})`);
      const response = await fetch(`https://eventnet-production.up.railway.app/api/events/${event._id}/guests`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        console.error(`Failed to fetch guests for event ${event._id}`);
        throw new Error('Failed to fetch guests');
      }
      
      const attendees = await response.json();
      console.log(`Guests for event ${event.name}:`, attendees);
      
      // Format the attendees into our registration format
      const formattedRegistrations = attendees.map(attendee => ({
        _id: `${event._id}-${attendee._id}`,
        userId: attendee._id,
        userName: attendee.name,
        userEmail: attendee.email,
        userAvatar: attendee.avatar,
        eventId: event._id,
        eventTitle: event.name,
        eventDate: event.startDate,
        createdAt: event.createdAt,
        status: 'approved' // Default to approved since no status field exists
      }));
      
      console.log('Formatted registrations:', formattedRegistrations);
      setRegistrations(formattedRegistrations);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      toast.error('Failed to fetch registrations');
      setRegistrations([]);
    }
  };

  const handleUnregisterUser = async (userId) => {
    try {
      const response = await fetch(`https://eventnet-production.up.railway.app/api/events/${selectedEvent._id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ userId })
      });
      if (response.ok) {
        toast.success('User unregistered successfully');
        handleViewRegistrations(selectedEvent); // Refresh list
      } else {
        throw new Error('Failed to unregister user');
      }
    } catch (error) {
      toast.error('Failed to unregister user');
    }
  };

  const handleStatusChange = async (registrationId, newStatus) => {
    try {
      const [eventId, userId] = registrationId.split('-');
      const response = await fetch(`https://eventnet-production.up.railway.app/api/events/${eventId}/registrations/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setRegistrations(registrations.map(reg => 
          reg._id === registrationId ? { ...reg, status: newStatus } : reg
        ));
        toast.success(`Registration ${newStatus} successfully`);
        fetchAllRegistrations(); // Refresh the list
      } else {
        throw new Error('Failed to update registration status');
      }
    } catch (error) {
      toast.error('Failed to update registration status');
    }
  };

  const handleUnregister = async (registrationId) => {
    try {
      const [eventId, userId] = registrationId.split('-');
      const response = await fetch(`https://eventnet-production.up.railway.app/api/events/${eventId}/registrations/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast.success('User unregistered successfully');
        fetchAllRegistrations(); // Refresh the list
      } else {
        throw new Error('Failed to unregister user');
      }
    } catch (error) {
      toast.error('Failed to unregister user');
    }
  };

  const handleContactUser = async (email) => {
    // This would typically open your default email client
    window.location.href = `mailto:${email}`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const fetchAllRegistrations = async () => {
    setLoading(true);
    try {
      console.log('Fetching all registrations...');
      // First, get all events created by this vendor
      const eventsResponse = await fetch('https://eventnet-production.up.railway.app/api/events/vendor', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!eventsResponse.ok) {
        throw new Error('Failed to fetch events');
      }
      
      const eventsData = await eventsResponse.json();
      console.log('Fetched events:', eventsData);
      
      if (!Array.isArray(eventsData) || eventsData.length === 0) {
        console.log('No events found');
        setRegistrations([]);
        return;
      }
      
      // For each event, fetch its registrations
      const allRegistrationsPromises = eventsData.map(async (event) => {
        try {
          console.log(`Fetching registrations for event: ${event.name} (${event._id})`);
          const response = await fetch(`https://eventnet-production.up.railway.app/api/events/${event._id}/registrations`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (!response.ok) {
            console.error(`Failed to fetch registrations for event ${event._id}`);
            return [];
          }
          
          const data = await response.json();
          console.log(`Registrations for event ${event.name}:`, data);
          return Array.isArray(data) ? data : [];
        } catch (error) {
          console.error(`Error fetching registrations for event ${event._id}:`, error);
          return [];
        }
      });
      
      // Wait for all registration fetches to complete
      const registrationsArrays = await Promise.all(allRegistrationsPromises);
      
      // Combine all registrations into a single array
      const allRegistrations = registrationsArrays.flat();
      console.log('All registrations combined:', allRegistrations);
      
      setRegistrations(allRegistrations);
    } catch (error) {
      console.error('Error fetching all registrations:', error);
      toast.error('Failed to fetch registrations');
      setRegistrations([]);
    } finally {
      setLoading(false);
    }
  };

  const DashboardCard = ({ title, value, icon: Icon, bgColor }) => (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${bgColor} bg-opacity-10 mr-4`}>
          <Icon className={`h-6 w-6 ${bgColor.replace('bg-', 'text-')}`} />
        </div>
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user?.name || 'Vendor'}!
        </h1>
        <p className="mt-1 text-gray-500">
          Here's what's happening with your events today.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Link
          to="/vendor-dashboard/events/create"
          className="flex items-center p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all"
        >
          <PlusIcon className="h-6 w-6 mr-2" />
          <span>Create New Event</span>
        </Link>
        <Link
          to="/vendor-dashboard/events"
          className="flex items-center p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all"
        >
          <CalendarIcon className="h-6 w-6 mr-2" />
          <span>Manage Events</span>
        </Link>
        <Link
          to="/vendor-dashboard/registrations"
          className="flex items-center p-4 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all"
        >
          <ClipboardDocumentListIcon className="h-6 w-6 mr-2" />
          <span>View Registrations</span>
        </Link>
        <Link
          to="/vendor-dashboard/qr-codes"
          className="flex items-center p-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all"
        >
          <QrCodeIcon className="h-6 w-6 mr-2" />
          <span>Generate QR Codes</span>
        </Link>
        {/* Contact Messages */}
        <Link
          to="/vendor-dashboard/messages"
          className="flex items-center p-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all"
        >
          <EnvelopeIcon className="h-6 w-6 mr-2" />
          <span>Messages</span>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <DashboardCard
          title="Total Events"
          value={stats.totalEvents}
          icon={CalendarIcon}
          bgColor="bg-blue-500"
        />
        <DashboardCard
          title="Active Events"
          value={stats.activeEvents}
          icon={ChartBarIcon}
          bgColor="bg-green-500"
        />
        <DashboardCard
          title="Total Registrations"
          value={stats.totalRegistrations}
          icon={UserGroupIcon}
          bgColor="bg-purple-500"
        />
        <DashboardCard
          title="Total Revenue"
          value={`Rs ${stats.totalRevenue.toFixed(2)}`}
          icon={ChartBarIcon}
          bgColor="bg-pink-500"
        />
      </div>

      {/* Recent Events */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Events</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {recentEvents.map((event) => {
            const now = new Date();
            const start = new Date(event.startDate || event.date);
            const end = new Date(event.endDate || event.date);
            if (event.startTime) { const [h, m] = event.startTime.split(':'); start.setHours(+h, +m); }
            if (event.endTime) { const [h, m] = event.endTime.split(':'); end.setHours(+h, +m); }

            const isExpired = now > end;
            const isOngoing = now >= start && now <= end;

            const badgeBg = isExpired ? 'bg-gray-200 text-gray-700' : isOngoing ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
            const badgeText = isExpired ? 'Expired' : isOngoing ? 'Ongoing' : 'Upcoming';

            return (
              <div key={event._id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {event.title || event.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {new Date(event.date || event.startDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      Registered: {event.attendees ? event.attendees.length : 0}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${badgeBg}`}>
                      {badgeText}
                    </span>
                    <Link
                      to={`/vendor-dashboard/events/${event._id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
          {recentEvents.length === 0 && (
            <div className="px-6 py-4 text-center text-gray-500">
              No events found. Create your first event!
            </div>
          )}
        </div>
      </div>

      {/* Registrations Modal */}
      {showRegistrationsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg">
            <h2 className="text-2xl font-semibold mb-4">Registered Users</h2>
            <div className="divide-y divide-gray-200">
              {registrations.map((registration) => (
                <div key={registration._id} className="py-2">
                  <p className="text-sm text-gray-900">{registration.user.name}</p>
                  <button
                    onClick={() => handleUnregisterUser(registration._id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Unregister
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowRegistrationsModal(false)}
              className="mt-4 bg-blue-500 text-white px-4 py-2 rounded-md"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorDashboard;