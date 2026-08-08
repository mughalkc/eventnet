import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import {
  PencilIcon,
  TrashIcon,
  QrCodeIcon,
  ShareIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';

const VendorEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user || user.role !== 'vendor') {
      navigate('/login');
      return;
    }
    fetchEvents();
  }, [user, navigate]);

  const fetchEvents = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      const response = await fetch('http://${window.location.hostname}:5001/api/vendor/events', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 401) {
        navigate('/login');
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  const handleSendAbsentEmails = async (eventId, eventName) => {
    if (!window.confirm(`Send "missed event" emails to all absent attendees of "${eventName}"?`)) return;
    try {
      const response = await fetch(`http://${window.location.hostname}:5001/api/vendor/events/${eventId}/send-absent-emails`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message);
      } else {
        toast.error(data.message || 'Failed to send emails');
      }
    } catch (error) {
      toast.error('Network error. Please try again.');
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;

    try {
      const response = await fetch(`http://${window.location.hostname}:5001/api/vendor/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setEvents(events.filter(event => event._id !== eventId));
        toast.success('Event deleted successfully');
      } else {
        throw new Error('Failed to delete event');
      }
    } catch (error) {
      toast.error('Failed to delete event');
    }
  };

  const handleShareEvent = async (eventId) => {
    try {
      const eventUrl = `${window.location.origin}/events/${eventId}`;
      await navigator.clipboard.writeText(eventUrl);
      toast.success('Event link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy event link');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'ongoing':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-gray-200 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredEvents = activeTab === 'all'
    ? events
    : events.filter(event => event.liveStatus === activeTab);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Events</h1>
        <Link
          to="/vendor-dashboard/events/create"
          className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all"
        >
          Create New Event
        </Link>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex space-x-2 mb-6 border-b border-gray-200">
        {[
          { key: 'all', label: 'All' },
          { key: 'upcoming', label: 'Upcoming' },
          { key: 'ongoing', label: 'Ongoing' },
          { key: 'expired', label: 'Expired' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            {tab.key !== 'all' && (
              <span className="ml-1 text-xs text-gray-400">
                ({events.filter(e => e.liveStatus === tab.key).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date & Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registrations
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEvents.map((event) => (
                <tr key={event._id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {event.name || 'Unnamed Event'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {event.location && typeof event.location === 'object' 
                            ? (event.location.isVirtual ? 'Virtual Event' : event.location.address) 
                            : event.location || 'No location provided'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {event.startDate ? new Date(event.startDate).toLocaleDateString() : 'Invalid Date'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {event.startTime || 'No time specified'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(event.liveStatus)}`}>
                      {event.liveStatus === 'expired' ? 'Expired' :
                       event.liveStatus === 'ongoing' ? 'Ongoing' : 'Upcoming'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {event.attendees ? event.attendees.length : 0} registrations
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-3">
                      <Link
                        to={`/vendor-dashboard/events/${event._id}/edit`}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit Event"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </Link>
                      <button
                        onClick={() => handleShareEvent(event._id)}
                        className="text-green-600 hover:text-green-900"
                        title="Share Event"
                      >
                        <ShareIcon className="h-5 w-5" />
                      </button>
                      <Link
                        to={`/vendor-dashboard/qr-codes`}
                        className="text-purple-600 hover:text-purple-900"
                        title="Generate QR Code"
                      >
                        <QrCodeIcon className="h-5 w-5" />
                      </Link>
                      <button
                        onClick={() => handleDeleteEvent(event._id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Event"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                      {event.liveStatus === 'expired' && (
                        <button
                          onClick={() => handleSendAbsentEmails(event._id, event.name)}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Send absent emails to non-attendees"
                        >
                          <EnvelopeIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEvents.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    {activeTab === 'all'
                      ? 'No events found. Create your first event!'
                      : `No ${activeTab} events found.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VendorEvents; 