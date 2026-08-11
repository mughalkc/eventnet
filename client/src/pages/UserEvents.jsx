import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toast } from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'

const EventCard = ({ event }) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  // Use a local placeholder image instead of via.placeholder.com to avoid network issues
  const defaultImage = '/default-event.jpg';

  // Ensure image URL is properly formatted
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return defaultImage;
    
    // If it's already a full URL (starts with http or https), use it as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // Otherwise, prepend the server URL
    return `https://eventnet-production.up.railway.app/${imageUrl.replace(/^\//, '')}`;
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
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-lg shadow-md overflow-hidden h-full"
    >
      <div className="relative h-48">
        {!imageLoaded && !imageError && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
        {imageError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
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
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{event.name}</h3>
        <p className="text-sm text-gray-600 mb-2">{event.description?.substring(0, 100) || 'No description'}...</p>
        <div className="flex items-center text-sm text-gray-500 mb-2">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {new Date(event.startDate).toLocaleDateString()}
        </div>
        <div className="flex items-center text-sm text-gray-500 mb-2">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {typeof event.location === 'object' 
            ? (event.location.isVirtual ? 'Virtual Event' : event.location.address) 
            : event.location || 'No location provided'}
        </div>
        {event.capacity && (
          <div className="flex items-center text-sm text-gray-500">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {event.capacity === 'limited' ? `${event.attendees?.length || 0}/${event.maxCapacity} spots filled` : 'Unlimited capacity'}
          </div>
        )}
        <div className="mt-4 flex justify-center">
          <Link to={`/events/${event._id}`} className="text-blue-600 hover:text-blue-800 px-4 py-2 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors">
            View Details
          </Link>
        </div>
      </div>
    </motion.div>
  )
}

export default function UserEvents() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    fetchUserEvents()
  }, [])

  const fetchUserEvents = async () => {
    try {
      const response = await fetch(`https://eventnet-production.up.railway.app/api/events/user/registered`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format')
      }
      setEvents(data.map(event => ({
        ...event,
        attendees: event.attendees || []
      })))
    } catch (error) {
      console.error('Error fetching user events:', error)
      toast.error(`Failed to fetch your events: ${error.message}`)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  const handleCancelRegistration = async (eventId) => {
    try {
      const response = await fetch(`https://eventnet-production.up.railway.app/api/events/${eventId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }
      
      toast.success('Successfully cancelled registration')
      // Refresh the events list
      fetchUserEvents()
    } catch (error) {
      console.error('Error cancelling registration:', error)
      toast.error(`Failed to cancel registration: ${error.message}`)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-8 md:mb-0">
              <h1 className="text-4xl font-bold mb-4">My Events</h1>
              <p className="text-xl opacity-90">View and manage all events you've registered for</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800">Your Registered Events</h2>
          <p className="text-gray-600">You have registered for {events.length} event{events.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <div key={event._id}>
              <EventCard event={event} />
            </div>
          ))}
        </div>

        {events.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">You haven't registered for any events yet</h3>
            <p className="text-gray-600 mb-6">Browse events and register to see them here!</p>
            <Link
              to="/events"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Explore Events
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}