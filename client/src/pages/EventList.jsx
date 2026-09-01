import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-hot-toast'
import { 
  CalendarIcon, 
  MapPinIcon, 
  UserGroupIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

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

const EventCard = ({ event, onRegister, onCancel }) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const { user } = useAuth()

  // Dynamic live calculation on client
  const dynamicStatus = getCalculatedStatus(event);

  const isRegistered = user && event.attendees?.some(attendee => {
    const attendeeId = (attendee._id || attendee.id || attendee || '').toString()
    const userId = (user?.id || user?._id || '').toString()
    return attendeeId && userId && attendeeId === userId
  })

  const hasPaidTickets = event.tickets && event.tickets.some(ticket => parseFloat(ticket.price) > 0)
  const defaultImage = '/default-event.jpg'
  const isExpired = dynamicStatus === 'expired'
  const isFull = event.capacity === 'limited' && (event.attendees?.length || 0) >= event.maxCapacity

  const getImageUrl = (imageUrl) => {
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

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  }

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
    >
      <div className="relative h-48">
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
        {imageError ? (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <img 
              src={defaultImage} 
              alt="Default event" 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentNode.innerHTML = '<div class="flex items-center justify-center w-full h-full bg-gray-200"><span class="text-gray-500">Event Image</span></div>';
              }}
            />
          </div>
        ) : (
          <img
            src={getImageUrl(event.image)}
            alt={event.name}
            className={`w-full h-full object-cover ${!imageLoaded ? 'hidden' : ''}`}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
        <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded-full text-sm">
          {event.capacity === 'limited' ? `${event.attendees?.length || 0}/${event.maxCapacity}` : 'Unlimited'}
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">{event.name}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">{event.description}</p>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <CalendarIcon className="h-4 w-4 mr-2" />
            {new Date(event.startDate).toLocaleDateString()}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <MapPinIcon className="h-4 w-4 mr-2" />
            {typeof event.location === 'object' 
              ? (event.location.isVirtual ? 'Virtual Event' : event.location.address) 
              : event.location || 'No location provided'}
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <UserGroupIcon className="h-4 w-4 mr-2" />
            {event.attendees?.length || 0} attendees
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
              Created by: {event.createdBy?.name || 'Unknown'}
            </span>
          </div>
        </div>

        <div className="flex justify-between items-center">
          {/* Dynamic Real-time Status Badge */}
          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
            dynamicStatus === 'upcoming' ? 'bg-blue-100 text-blue-800' :
            dynamicStatus === 'ongoing' ? 'bg-green-100 text-green-800' :
            'bg-gray-200 text-gray-700'
          }`}>
            {dynamicStatus === 'expired' ? 'Event Ended' :
             dynamicStatus === 'ongoing' ? 'Ongoing' : 'Upcoming'}
          </span>
          
          {user && (
            isRegistered ? (
              <div className="flex items-center space-x-2">
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs flex items-center">
                  <CheckCircleIcon className="h-3 w-3 mr-1" />
                  Registered
                </span>
                <button
                  onClick={() => onCancel(event._id)}
                  className="text-red-600 hover:text-red-800 text-xs font-medium"
                >
                  Cancel
                </button>
              </div>
            ) : isExpired ? (
              <button
                disabled
                className="bg-gray-300 text-gray-600 px-3 py-1.5 rounded-md text-sm font-medium cursor-not-allowed"
              >
                Event Ended
              </button>
            ) : isFull ? (
              <button
                disabled
                className="bg-gray-300 text-gray-600 px-3 py-1.5 rounded-md text-sm font-medium cursor-not-allowed"
              >
                Capacity Full
              </button>
            ) : (
              <button
                onClick={() => onRegister(event._id)}
                className={`${hasPaidTickets ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'} text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center`}
              >
                {hasPaidTickets ? (
                  <>
                    <span className="mr-1">💰</span>
                    Pay & Register
                  </>
                ) : (
                  'Register'
                )}
              </button>
            )
          )}
        </div>
      </div>
    </motion.div>
  )
}

const EventList = () => {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const { user } = useAuth()
  const navigate = useNavigate()
  const [ws, setWs] = useState(null)

  useEffect(() => {
    if (!user) return;
    const socket = new WebSocket(`wss://eventnet-production.up.railway.app/ws/events/${user.id || user._id}`);
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'registration_update') {
        setEvents(prevEvents => 
          prevEvents.map(evt => 
            evt._id === data.eventId 
              ? { ...evt, attendees: data.attendees } 
              : evt
          )
        );
      }
    };

    setWs(socket);
    return () => socket.close();
  }, [user]);

  const fetchEvents = async (retryCount = 0) => {
    try {
      setLoading(true)
      const response = await fetch('https://eventnet-production.up.railway.app/api/events/public')
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format: expected an array of events')
      }
      
      setEvents(data)
    } catch (error) {
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000
        setTimeout(() => fetchEvents(retryCount + 1), delay)
        return
      }
      toast.error(error.message || 'Failed to fetch events.')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    fetchEvents()
  }, [user, navigate]);

  const onRegister = async (eventId) => {
    try {
      const response = await fetch(`https://eventnet-production.up.railway.app/api/events/${eventId}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.message || 'Registration failed')
      }

      toast.success('Successfully registered for the event!')
      
      const userIdStr = user.id || user._id;

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'registration_update',
          eventId: eventId,
          userId: userIdStr
        }))
      }

      const formattedUser = {
        _id: userIdStr,
        id: userIdStr,
        name: user.name,
        email: user.email
      };
      
      setEvents(prevEvents => 
        prevEvents.map(evt => 
          evt._id === eventId 
            ? { ...evt, attendees: [...(evt.attendees || []), formattedUser] } 
            : evt
        )
      )
    } catch (error) {
      toast.error(error.message || 'Failed to register.')
    }
  }

  const onCancel = async (eventId) => {
    try {
      const userIdStr = user.id || user._id;

      const response = await fetch(`https://eventnet-production.up.railway.app/api/events/${eventId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ userId: userIdStr })
      });

      if (!response.ok) throw new Error('Cancellation failed');

      toast.success('Successfully cancelled registration!')
      
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'registration_update',
          eventId: eventId,
          userId: userIdStr
        }))
      }

      setEvents(prevEvents => 
        prevEvents.map(evt => 
          evt._id === eventId 
            ? { ...evt, attendees: evt.attendees?.filter(a => (a._id || a.id || a).toString() !== userIdStr.toString()) || [] } 
            : evt
        )
      )
    } catch (error) {
      toast.error('Failed to cancel registration.')
    }
  }

  const handleRegister = async (eventId) => {
    try {
      const eventResponse = await fetch(`https://eventnet-production.up.railway.app/api/events/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!eventResponse.ok) throw new Error('Failed to fetch event details')

      const event = await eventResponse.json()

      if (event.tickets && event.tickets.some(t => parseFloat(t.price) > 0)) {
        navigate(`/events/${eventId}/checkout`)
        return
      }

      await onRegister(eventId)
    } catch (error) {
      toast.error(error.message || 'Failed to register')
    }
  }

  const handleCancel = async (eventId) => {
    try {
      await onCancel(eventId)
    } catch (error) {
      toast.error(error.message || 'Failed to cancel')
    }
  }

  const filteredEvents = events.filter(evt => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      evt.name?.toLowerCase().includes(q) ||
      evt.description?.toLowerCase().includes(q) ||
      (typeof evt.location === 'string' && evt.location.toLowerCase().includes(q)) ||
      (typeof evt.location === 'object' && evt.location.address?.toLowerCase().includes(q))
    );
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">Explore Events</h1>
          <p className="text-gray-600 mt-2">Discover amazing events happening around you</p>
        </div>
        
        <div className="relative max-w-md mx-auto md:mx-0">
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center min-h-[300px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No events found.</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No events found matching "{searchQuery}"</p>
          <button 
            onClick={() => setSearchQuery('')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map(event => (
            <EventCard
              key={event._id}
              event={event}
              onRegister={handleRegister}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default EventList;