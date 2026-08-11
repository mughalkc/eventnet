import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-hot-toast'
import { 
  CalendarIcon, 
  MapPinIcon, 
  UserGroupIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline'

const EventCard = ({ event, onRegister, onCancel }) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const { user } = useAuth()
  // Properly compare IDs — convert both to string to avoid ObjectId vs string mismatch
  const isRegistered = user && event.attendees?.some(attendee => {
    const attendeeId = (attendee._id || attendee.id || attendee || '').toString()
    const userId = (user?.id || user?._id || '').toString()
    return attendeeId && userId && attendeeId === userId
  })
  const hasPaidTickets = event.tickets && event.tickets.some(ticket => parseFloat(ticket.price) > 0)
  const defaultImage = '/default-event.jpg'
  const isExpired = event.liveStatus === 'expired'
  const isFull = event.capacity === 'limited' && (event.attendees?.length || 0) >= event.maxCapacity

  // Ensure image URL is properly formatted
  const getImageUrl = (imageUrl) => {
    console.log('Original image URL:', imageUrl);
    
    if (!imageUrl) return defaultImage;
    
    // If it's already a full URL (starts with http or https), use it as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // For URLs that contain backslashes (Windows paths in URLs), fix them
      if (imageUrl.includes('\\')) {
        // Extract just the filename from the path
        const parts = imageUrl.split(/[\\/]/);  // Split by both forward and backslashes
        const filename = parts[parts.length - 1];
        console.log('Extracted filename from URL:', filename);
        return `https://eventnet-production.up.railway.app/uploads/events/${filename}`;
      }
      return imageUrl;
    }
    
    // For relative paths
    if (imageUrl.includes('\\')) {
      // Handle Windows-style paths with backslashes
      const parts = imageUrl.split(/[\\/]/);  // Split by both forward and backslashes
      const filename = parts[parts.length - 1];
      console.log('Extracted filename from path:', filename);
      return `https://eventnet-production.up.railway.app/uploads/events/${filename}`;
    } else {
      // Handle Unix-style paths with forward slashes
      const cleanPath = imageUrl.replace(/^\//, ''); // Remove leading slash if present
      return `https://eventnet-production.up.railway.app/${cleanPath}`;
    }
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  }

  const handleImageError = () => {
    console.log('Image failed to load:', event.image);
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
                // If even the default image fails, show a colored background with text
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
          <span className={`px-2 py-1 rounded-full text-xs ${
            event.liveStatus === 'upcoming' ? 'bg-blue-100 text-blue-800' :
            event.liveStatus === 'ongoing' ? 'bg-green-100 text-green-800' :
            'bg-gray-200 text-gray-700'
          }`}>
            {event.liveStatus === 'expired' ? 'Event Ended' :
             event.liveStatus === 'ongoing' ? 'Ongoing' : 'Upcoming'}
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
    const { user, isAdmin } = useAuth()
    const navigate = useNavigate()
    const [ws, setWs] = useState(null)

    // Initialize WebSocket connection
    useEffect(() => {
      if (!user) return;

      const socket = new WebSocket(`wss://eventnet-production.up.railway.app/ws/events/${user.id}`);

      socket.onopen = () => {
        console.log('WebSocket connected');
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'registration_update') {
          // Update the specific event's registration status
          setEvents(prevEvents => 
            prevEvents.map(event => 
              event._id === data.eventId 
                ? { ...event, attendees: data.attendees } 
                : event
            )
          );
        }
      };

      socket.onclose = () => {
        console.log('WebSocket disconnected');
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      setWs(socket);

      return () => {
        socket.close();
      };
    }, [user]);

    useEffect(() => {
      if (!user) {
        navigate('/login')
        return
      }

      fetchEvents()
    }, [user]);

    // Update events when WebSocket receives a message
    useEffect(() => {
      if (ws) {
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'registration_update') {
            // Update events list
            setEvents(prevEvents => 
              prevEvents.map(event => 
                event._id === data.eventId 
                  ? { ...event, attendees: data.attendees } 
                  : event
              )
            );
          }
        };
      }
    }, [ws]);

    const fetchEvents = async (retryCount = 0) => {
      try {
        setLoading(true)
        console.log('Fetching events...')
        const response = await fetch('https://eventnet-production.up.railway.app/api/events/public')
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('Server error response:', errorData)
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        console.log('Received events data:', data)
        
        if (!Array.isArray(data)) {
          console.error('Invalid response format:', data)
          throw new Error('Invalid response format: expected an array of events')
        }
        
        setEvents(data)
      } catch (error) {
        console.error('Failed to fetch events:', error)
        
        // Retry up to 3 times with exponential backoff
        if (retryCount < 3) {
          const delay = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
          console.log(`Retrying in ${delay}ms... (attempt ${retryCount + 1})`)
          setTimeout(() => fetchEvents(retryCount + 1), delay)
          return
        }
        
        toast.error(error.message || 'Failed to fetch events. Please try again later.')
        setEvents([])
      } finally {
        setLoading(false)
      }
    }

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

        const data = await response.json()
        toast.success('Successfully registered for the event!')
        
        // Send registration update to WebSocket
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'registration_update',
            eventId: eventId,
            userId: user.id
          }))
        }

        // Format user object to match the expected structure
        const formattedUser = {
          _id: user.id || user._id,
          id: user.id || user._id,
          name: user.name,
          email: user.email
        };
        
        // Update events state immediately
        setEvents(prevEvents => 
          prevEvents.map(event => 
            event._id === eventId 
              ? { ...event, attendees: [...(event.attendees || []), formattedUser] } 
              : event
          )
        )
      } catch (error) {
        console.error('Error registering for event:', error)
        toast.error(error.message || 'Failed to register for the event. Please try again.')
      }
    }

    const onCancel = async (eventId) => {
      try {
        const response = await fetch(`https://eventnet-production.up.railway.app/api/events/${eventId}/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ userId: user.id })
        });

        if (!response.ok) {
          throw new Error('Cancellation failed')
        }

        const data = await response.json()
        toast.success('Successfully cancelled registration!')
        
        // Send cancellation update to WebSocket
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'registration_update',
            eventId: eventId,
            userId: user.id
          }))
        }

        // Update events list immediately
        setEvents(prevEvents => 
          prevEvents.map(event => 
            event._id === eventId 
              ? { ...event, attendees: event.attendees?.filter(attendee => attendee._id !== user.id) || [] } 
              : event
          )
        )
      } catch (error) {
        console.error('Error cancelling registration:', error)
        toast.error('Failed to cancel registration. Please try again.')
      }
    }

    const handleRegister = async (eventId) => {
      try {
        // First, get the event details to check if it has paid tickets
        const eventResponse = await fetch(`https://eventnet-production.up.railway.app/api/events/${eventId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (!eventResponse.ok) {
          throw new Error('Failed to fetch event details')
        }

        const event = await eventResponse.json()

        if (event.tickets && event.tickets.some(ticket => parseFloat(ticket.price) > 0)) {
          // For paid events, navigate to checkout
          navigate(`/events/${eventId}/checkout`)
          return
        }

        // For free events, proceed with registration
        await onRegister(eventId)
      } catch (error) {
        console.error('Registration error:', error)
        toast.error(error.message || 'Failed to register for event')
      }
    }

    const handleCancel = async (eventId) => {
      try {
        await onCancel(eventId)
      } catch (error) {
        console.error('Cancellation error:', error)
        toast.error(error.message || 'Failed to cancel registration')
      }
    }

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">Explore Events</h1>
            <p className="text-gray-600 mt-2">Discover amazing events happening around you</p>
          </div>
          
          {/* Search bar */}
          <div className="relative max-w-md mx-auto md:mx-0">
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        ) : (
          // Filter events based on search query
          events.filter(event => {
            if (!searchQuery) return true;
            const query = searchQuery.toLowerCase();
            return (
              event.name?.toLowerCase().includes(query) ||
              event.description?.toLowerCase().includes(query) ||
              (typeof event.location === 'string' && event.location.toLowerCase().includes(query)) ||
              (typeof event.location === 'object' && event.location.address?.toLowerCase().includes(query))
            );
          }).length === 0 ? (
          // No search results
          <div className="text-center py-8">
            <p className="text-gray-600">No events found matching "{searchQuery}"</p>
            <button 
              onClick={() => setSearchQuery('')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Clear Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events
              .filter(event => {
                if (!searchQuery) return true;
                const query = searchQuery.toLowerCase();
                return (
                  event.name?.toLowerCase().includes(query) ||
                  event.description?.toLowerCase().includes(query) ||
                  (typeof event.location === 'string' && event.location.toLowerCase().includes(query)) ||
                  (typeof event.location === 'object' && event.location.address?.toLowerCase().includes(query))
                );
              })
              .map(event => (
                <EventCard
                  key={event._id}
                  event={event}
                  onRegister={handleRegister}
                  onCancel={handleCancel}
                />
              ))}
          </div>
        ))}
      </div>
    )
  }

  export default EventList 