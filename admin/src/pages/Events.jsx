import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { 
  CalendarIcon, 
  MapPinIcon, 
  UserGroupIcon, 
  TrashIcon, 
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TicketIcon
} from '@heroicons/react/24/outline';

// Dynamic Status Calculation Helper Function
const getCalculatedStatus = (event) => {
  if (!event || !event.startDate) return 'upcoming';

  try {
    const now = new Date();
    const dateObj = new Date(event.startDate);
    const year = dateObj.getUTCFullYear();
    const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getUTCDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const parseTime = (t, defaultVal) => {
      if (!t) return defaultVal;
      const match = String(t).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
      if (match) {
        let h = parseInt(match[1], 10);
        const m = match[2];
        const p = match[3];
        if (p) {
          if (p.toUpperCase() === 'PM' && h < 12) h += 12;
          if (p.toUpperCase() === 'AM' && h === 12) h = 0;
        }
        return `${String(h).padStart(2, '0')}:${m}`;
      }
      return t;
    };

    const startTime = parseTime(event.startTime, '00:00');
    const endTime = parseTime(event.endTime, '23:59');

    const start = new Date(`${dateStr}T${startTime}:00`);
    const end = new Date(`${dateStr}T${endTime}:59`);

    if (now.getTime() > end.getTime()) return 'expired';
    if (now.getTime() >= start.getTime() && now.getTime() <= end.getTime()) return 'ongoing';
    return 'upcoming';
  } catch (err) {
    return event.liveStatus || 'upcoming';
  }
};

const getImageUrl = (imageUrl) => {
  const defaultImage = '/default-event.jpg';
  if (!imageUrl) return defaultImage;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    if (imageUrl.includes('\\')) {
      const parts = imageUrl.split(/[\\/]/);
      const filename = parts[parts.length - 1];
      return `https://eventnet-production.up.railway.app/uploads/events/${filename}`;
    }
    return imageUrl;
  }
  if (imageUrl.includes('\\')) {
    const parts = imageUrl.split(/[\\/]/);
    const filename = parts[parts.length - 1];
    return `https://eventnet-production.up.railway.app/uploads/events/${filename}`;
  } else {
    const cleanPath = imageUrl.replace(/^\//, '');
    return `https://eventnet-production.up.railway.app/${cleanPath}`;
  }
};

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all'); // 'all', 'upcoming', 'ongoing', 'expired'
  const [selectedEventDetails, setSelectedEventDetails] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('https://eventnet-production.up.railway.app/api/events', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.message || 'Error loading events');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`https://eventnet-production.up.railway.app/api/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete event');
      }

      toast.success('Event deleted successfully');
      setEvents(prev => prev.filter(e => e._id !== eventId));
      if (selectedEventDetails?._id === eventId) setSelectedEventDetails(null);
    } catch (error) {
      toast.error(error.message || 'Error deleting event');
    }
  };

  // Dynamically compute statuses and filter events
  const computedEvents = useMemo(() => {
    return events.map(evt => ({
      ...evt,
      computedStatus: getCalculatedStatus(evt)
    }));
  }, [events]);

  const filteredEvents = useMemo(() => {
    return computedEvents.filter(evt => {
      const matchesTab = selectedTab === 'all' || evt.computedStatus === selectedTab;
      
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q || (
        evt.name?.toLowerCase().includes(q) ||
        evt.description?.toLowerCase().includes(q) ||
        (typeof evt.location === 'string' && evt.location.toLowerCase().includes(q)) ||
        (typeof evt.location === 'object' && evt.location.address?.toLowerCase().includes(q)) ||
        evt.createdBy?.name?.toLowerCase().includes(q)
      );

      return matchesTab && matchesSearch;
    });
  }, [computedEvents, selectedTab, searchQuery]);

  const stats = useMemo(() => {
    const total = computedEvents.length;
    const upcoming = computedEvents.filter(e => e.computedStatus === 'upcoming').length;
    const ongoing = computedEvents.filter(e => e.computedStatus === 'ongoing').length;
    const expired = computedEvents.filter(e => e.computedStatus === 'expired').length;
    return { total, upcoming, ongoing, expired };
  }, [computedEvents]);

  return (
    <div className="space-y-6">
      {/* Header & Counters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events</h1>
          <p className="text-gray-500 text-sm">Explore and manage platform events and registrations.</p>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="bg-white p-3 rounded-lg border shadow-sm">
            <div className="text-xs font-medium text-gray-500">Total</div>
            <div className="text-xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 shadow-sm">
            <div className="text-xs font-medium text-blue-600">Upcoming</div>
            <div className="text-xl font-bold text-blue-700">{stats.upcoming}</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg border border-green-100 shadow-sm">
            <div className="text-xs font-medium text-green-600">Ongoing</div>
            <div className="text-xl font-bold text-green-700">{stats.ongoing}</div>
          </div>
          <div className="bg-gray-100 p-3 rounded-lg border border-gray-200 shadow-sm">
            <div className="text-xs font-medium text-gray-600">Ended</div>
            <div className="text-xl font-bold text-gray-700">{stats.expired}</div>
          </div>
        </div>
      </div>

      {/* Search Bar & Tab Navigation */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search event name, location, creator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-full sm:w-auto overflow-x-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'ongoing', label: 'Ongoing' },
            { id: 'expired', label: 'Ended' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id)}
              className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap ${
                selectedTab === tab.id
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No Events Found</h3>
          <p className="text-gray-500 text-sm mt-1">Try relaxing your search terms or changing tab filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredEvents.map(event => (
              <motion.div
                key={event._id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                <div>
                  {/* Card Header & Image */}
                  <div className="relative h-44 bg-gray-100">
                    <img
                      src={getImageUrl(event.image)}
                      alt={event.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = '/default-event.jpg';
                      }}
                    />
                    <div className="absolute top-3 right-3 flex gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm ${
                        event.computedStatus === 'upcoming' ? 'bg-blue-600 text-white' :
                        event.computedStatus === 'ongoing' ? 'bg-green-600 text-white' :
                        'bg-gray-700 text-white'
                      }`}>
                        {event.computedStatus === 'expired' ? 'Ended' :
                         event.computedStatus === 'ongoing' ? 'Ongoing' : 'Upcoming'}
                      </span>
                    </div>

                    <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-md text-xs text-white flex items-center gap-1">
                      <UserGroupIcon className="h-3.5 w-3.5" />
                      <span>{event.attendees?.length || 0} registered</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-3">
                    <h3 className="font-bold text-gray-900 line-clamp-1">{event.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2">{event.description}</p>

                    <div className="space-y-1.5 pt-2 text-xs text-gray-600 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-gray-400 shrink-0" />
                        <span>{new Date(event.startDate).toLocaleDateString()} ({event.startTime || 'TBA'} - {event.endTime || 'TBA'})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPinIcon className="h-4 w-4 text-gray-400 shrink-0" />
                        <span className="truncate">
                          {typeof event.location === 'object'
                            ? (event.location.isVirtual ? 'Virtual' : event.location.address)
                            : (event.location || 'N/A')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <TicketIcon className="h-4 w-4 text-gray-400 shrink-0" />
                        <span>Created by: <strong>{event.createdBy?.name || 'Unknown User'}</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center gap-2">
                  <button
                    onClick={() => setSelectedEventDetails(event)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View Attendees ({event.attendees?.length || 0})
                  </button>

                  <button
                    onClick={() => handleDeleteEvent(event._id)}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Event"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Attendee Details Modal */}
      {selectedEventDetails && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] flex flex-col overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-bold text-gray-900">{selectedEventDetails.name}</h3>
                <p className="text-xs text-gray-500">Attendee Roster</p>
              </div>
              <button
                onClick={() => setSelectedEventDetails(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold px-2"
              >
                &times;
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              {!selectedEventDetails.attendees || selectedEventDetails.attendees.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-6">No users registered for this event yet.</p>
              ) : (
                selectedEventDetails.attendees.map((att, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg border border-gray-100">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{att.name || 'Anonymous User'}</div>
                      <div className="text-xs text-gray-500">{att.email || 'No email registered'}</div>
                    </div>
                    <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  </div>
                ))
              )}
            </div>

            <div className="p-3 bg-gray-50 border-t border-gray-200 text-right">
              <button
                onClick={() => setSelectedEventDetails(null)}
                className="px-4 py-1.5 text-xs bg-gray-200 hover:bg-gray-300 rounded-md font-medium text-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;