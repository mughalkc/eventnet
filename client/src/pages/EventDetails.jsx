import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-hot-toast'
import { QRCodeSVG } from 'qrcode.react'

import {
  CalendarIcon,
  MapPinIcon,
  ShareIcon,
  UserGroupIcon,
  ChartBarIcon,
  ChatBubbleLeftIcon,
  CogIcon,
  PlusIcon,
  QrCodeIcon,
  ClipboardIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

// Helper function to get correct image URL
const getImageUrl = (event) => {
  // Default placeholder if no event or image
  if (!event || !event.image) return 'https://via.placeholder.com/400x300?text=Event+Image';
  
  // If it's already a full URL (starts with http or https), use it as is
  if (event.image.startsWith('http://') || event.image.startsWith('https://')) {
    return event.image;
  }
  
  // Otherwise, prepend the server URL
  // Remove any leading slash if present and normalize backslashes to forward slashes
  const cleanPath = event.image.replace(/^\//, '').replace(/\\/g, '/');
  return `http://${window.location.hostname}:5001/${cleanPath}`;
};

export default function EventDetails() {
  const { eventId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  console.log('Current eventId:', eventId)
  const [event, setEvent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [showShareModal, setShowShareModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [guests, setGuests] = useState([])
  const [registrations, setRegistrations] = useState([])
  const [insights, setInsights] = useState(null)

  useEffect(() => {
    fetchEventDetails()
    
    // Check for the updated parameter in the URL which indicates we should refresh
    const queryParams = new URLSearchParams(window.location.search)
    const isUpdated = queryParams.has('updated')
    
    if (isUpdated) {
      console.log('Detected update parameter, ensuring data is refreshed')
      // Remove the updated parameter from URL to avoid confusion on page refresh
      const cleanUrl = window.location.pathname
      window.history.replaceState({}, document.title, cleanUrl)
    }
  }, [eventId, window.location.search])

  useEffect(() => {
    if (event && isCreator) {
      fetchGuests()
      fetchRegistrations()
      fetchInsights()
    }
  }, [event])
  
  // Add the keyframes animation to the document
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes gradient {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      // Clean up on unmount
      document.head.removeChild(style);
    };
  }, [])

  const fetchEventDetails = async () => {
    try {
      // Add cache-busting query parameter to ensure we get fresh data
      const timestamp = new Date().getTime();
      const response = await fetch(`http://${window.location.hostname}:5001/api/events/${eventId}?_t=${timestamp}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
          // Removed problematic cache-control headers that were causing CORS issues
        },
        // Use cache: 'no-store' to prevent using cached responses
        cache: 'no-store'
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json()
      console.log('Fetched event data:', data)
      console.log('Event image property:', data.image)
      
      // Check if image needs to be formatted
      if (data.image) {
        const formattedImageUrl = getImageUrl({image: data.image})
        console.log('Formatted image URL:', formattedImageUrl)
      }
      
      setEvent(data)
    } catch (error) {
      console.error('Error fetching event details:', error)
      toast.error('Failed to fetch event details')
    } finally {
      setLoading(false)
    }
  }

  const fetchGuests = async () => {
    try {
      const response = await fetch(`http://${window.location.hostname}:5001/api/events/${eventId}/guests`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        // If the event object already has attendees, use that data
        if (event?.attendees) {
          setGuests(event.attendees);
          return;
        }
        throw new Error('Failed to fetch guests');
      }

      const data = await response.json();
      setGuests(data);
    } catch (error) {
      console.error('Error fetching guests:', error);
      // If the event object has attendees, use that data as fallback
      if (event?.attendees) {
        setGuests(event.attendees);
      } else {
        setGuests([]);
      }
    }
  };

  const fetchRegistrations = async () => {
    try {
      const response = await fetch(`http://${window.location.hostname}:5001/api/events/${eventId}/registrations`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        setRegistrations(data);
      } catch (err) {
        toast.error('Failed to fetch registrations: Invalid server response');
        setRegistrations([]);
      }
    } catch (error) {
      toast.error('Failed to fetch registrations');
      setRegistrations([]);
    }
  };

  const fetchInsights = async () => {
    try {
      const response = await fetch(`http://${window.location.hostname}:5001/api/events/${eventId}/insights`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        setInsights(data);
      } catch (err) {
        toast.error('Failed to fetch insights: Invalid server response');
        setInsights(null);
      }
    } catch (error) {
      toast.error('Failed to fetch insights');
      setInsights(null);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`http://${window.location.hostname}:5001/api/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.ok) {
        toast.success('Event deleted successfully')
        navigate('/vendor-dashboard/events')
      } else {
        throw new Error('Failed to delete event')
      }
    } catch (error) {
      toast.error('Failed to delete event')
    }
  }

  const handleRegister = async () => {
    if (!user) {
      toast.error('Please login to register for the event');
      navigate('/login');
      return;
    }
    try {
      const response = await fetch(`http://${window.location.hostname}:5001/api/events/${eventId}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      const data = await response.json()

      if (response.ok) {
        toast.success('Successfully registered for the event!')
        fetchEventDetails() // Refresh event details
      } else {
        throw new Error(data.message || 'Registration failed')
      }
    } catch (error) {
      toast.error(error.message || 'Failed to register for the event')
    }
  }

  const handleUnregister = async () => {
    if (!user) {
      toast.error('Please login to unregister from the event');
      navigate('/login');
      return;
    }
    try {
      const response = await fetch(`http://${window.location.hostname}:5001/api/events/${eventId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      if (response.ok) {
        toast.success('Successfully unregistered from the event!');
        fetchEventDetails();
      } else {
        throw new Error('Unregistration failed');
      }
    } catch (error) {
      toast.error('Failed to unregister from the event');
    }
  };

  // Feature: Self attendance with optional GPS verification
  const handleSelfCheckin = async () => {
    if (!user) {
      toast.error('Please login first');
      navigate('/login');
      return;
    }

    // Try to get GPS location from browser
    const markAttendance = async (latitude, longitude) => {
      try {
        const body = {}
        if (latitude && longitude) {
          body.latitude = latitude
          body.longitude = longitude
        }

        const response = await fetch(`http://${window.location.hostname}:5001/api/events/${eventId}/self-checkin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(body)
        })

        const data = await response.json()

        if (response.ok) {
          toast.success(data.message, { duration: 4000 })
          fetchEventDetails()
        } else if (data.tooFar) {
          toast.error(`📍 ${data.message}`, { duration: 6000 })
        } else {
          toast.error(data.message || 'Could not mark attendance')
        }
      } catch (error) {
        toast.error('Network error. Please try again.')
      }
    }

    // Ask browser for GPS location
    if (navigator.geolocation) {
      toast('📍 Getting your location...', { duration: 2000 })
      navigator.geolocation.getCurrentPosition(
        (position) => {
          markAttendance(position.coords.latitude, position.coords.longitude)
        },
        () => {
          // User denied GPS or not available — still allow attendance without GPS
          markAttendance(null, null)
        },
        { timeout: 8000 }
      )
    } else {
      // Browser doesn't support GPS
      markAttendance(null, null)
    }
  }

  const copyEventLink = () => {
    const eventUrl = `${window.location.origin}/events/${eventId}`
    navigator.clipboard.writeText(eventUrl)
    toast.success('Event link copied to clipboard!')
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold mb-4">Event not found</h2>
        <Link to="/" className="text-blue-600 hover:text-blue-800">
          Return to Home
        </Link>
      </div>
    )
  }

  const isCreator = user && (
    (event.createdBy && event.createdBy._id === user.id) || 
    (event.createdBy === user.id) ||
    user.role === 'admin' ||
    user.role === 'vendor'
  )
  
  // Check multiple ways a user might be registered since IDs can be in different formats
  const isRegistered = user && event.attendees?.some(attendee => 
    (attendee._id === user.id) || 
    (attendee.userId === user.id) ||
    (attendee._id === user._id) ||
    (typeof attendee === 'string' && attendee === user.id)
  );

  // Whether the event has already finished (backend computes this as 'expired')
  const isExpired = event.liveStatus === 'expired'

  // Whether the event has reached its max capacity
  const isFull = event.capacity === 'limited' &&
    (event.attendees?.length || 0) >= event.maxCapacity

  // Whether current user has already checked in
  const isCheckedIn = user && event.checkIns?.some(c => {
    const uid = c.user?._id || c.user
    return uid?.toString() === user.id
  }) && event.checkIns?.find(c => {
    const uid = c.user?._id || c.user
    return uid?.toString() === user.id
  })?.checkedIn === true

  const renderTabContent = () => {
    switch (activeTab) {
      case 'guests':
        return (
          <div className="bg-white shadow rounded-lg mt-6 p-6">
            <h2 className="text-xl font-semibold mb-4">Guest List</h2>
            {guests.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {guests.map((guest) => (
                  <div key={guest._id} className="py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <img
                        src={guest.avatar || 'https://via.placeholder.com/40'}
                        alt={guest.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{guest.name}</p>
                        <p className="text-sm text-gray-500">{guest.email}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      guest.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {guest.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No guests registered yet.</p>
            )}
          </div>
        )
      case 'registration':
        return (
          <div className="bg-white shadow rounded-lg mt-6 p-6">
            <h2 className="text-xl font-semibold mb-4">Registration Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-2">Registration Status</h3>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Capacity:</span>
                  <span className="font-medium">{event.capacity === 'limited' ? event.maxCapacity : 'Unlimited'}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-gray-600">Registered:</span>
                  <span className="font-medium">{registrations.length}</span>
                </div>
                {event.capacity === 'limited' && (
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-gray-600">Spots Left:</span>
                    <span className="font-medium">{event.maxCapacity - registrations.length}</span>
                  </div>
                )}
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-2">Registration Settings</h3>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Approval Required:</span>
                  <span className="font-medium">{event.requireApproval ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-gray-600">Registration Deadline:</span>
                  <span className="font-medium">
                    {event.registrationDeadline ? new Date(event.registrationDeadline).toLocaleDateString() : 'None'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return (
          <div className="bg-white shadow rounded-lg mt-6">
            <div className="p-6">
              <div className="md:flex md:gap-8">
                {/* Event details on the left */}
                <div className="md:w-3/5">
                  <div className="flex items-center gap-3 mb-4">
                    <h1 className="text-3xl font-bold text-gray-900">{event.name}</h1>
                    {event.liveStatus === 'expired' && (
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-700">
                        Event Ended
                      </span>
                    )}
                    {event.liveStatus === 'ongoing' && (
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                        Ongoing
                      </span>
                    )}
                    {event.liveStatus === 'upcoming' && (
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                        Upcoming
                      </span>
                    )}
                  </div>
                  <div className="flex items-center text-gray-500 mb-4">
                    <CalendarIcon className="h-5 w-5 mr-2" />
                    <span>
                      {new Date(event.startDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                      {' '}
                      {event.startTime} - {event.endTime}
                    </span>
                  </div>
                  {event.location && (
                    <div className="flex items-center text-gray-500 mb-4">
                      <MapPinIcon className="h-5 w-5 mr-2" />
                      <span>
                        {typeof event.location === 'object' 
                          ? (event.location.isVirtual ? 'Virtual Event' : event.location.address) 
                          : event.location || 'No location provided'}
                      </span>
                    </div>
                  )}
                  <div className="mt-6">
                    <h2 className="text-lg font-semibold mb-2">About this event</h2>
                    <p className="text-gray-600 whitespace-pre-wrap">{event.description}</p>
                  </div>
                </div>
                
                {/* Event image on the right */}
                <div className="md:w-2/5 mt-6 md:mt-0">
                  {/* Animated border container */}
                  <div className="relative p-1 rounded-lg overflow-hidden bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-[length:400%_400%]" style={{animation: 'gradient 3s ease infinite'}}>
                    <div className="relative bg-white rounded-lg overflow-hidden shadow-md h-auto min-h-[300px]">
                      {/* Loading placeholder */}
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                      
                      {/* Event image with error handling */}
                      <img
                        src={getImageUrl(event)}
                        alt={event.name}
                        className="w-full h-full object-cover absolute inset-0"
                        onLoad={(e) => {
                          console.log('Image loaded successfully:', e.target.src);
                          e.target.style.position = 'relative';
                          e.target.previousElementSibling.style.display = 'none';
                        }}
                        onError={(e) => {
                          console.log('Image failed to load:', e.target.src);
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/400x300?text=Event+Image';
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Host Information */}
              <div className="mt-8">
                <h2 className="text-lg font-semibold mb-4">Hosted by</h2>
                <div className="flex items-center">
                  <div className="relative overflow-hidden rounded-full w-12 h-12 border-2 border-gray-200">
                    <img
                      src={event.createdBy?.avatar || '/default-user.png'}
                      alt="Host"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null;
                        // Use a simple colored div as fallback instead of external placeholder
                        const parent = e.target.parentNode;
                        if (parent) {
                          const initials = event.createdBy?.name?.charAt(0) || 'H';
                          parent.innerHTML = `<div class="flex items-center justify-center w-full h-full bg-blue-500 text-white font-bold text-lg">${initials}</div>`;
                        }
                      }}
                    />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      {event.createdBy?.name || event.createdBy?.businessName || 'Event Organizer'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {event.createdBy?.email || ''}
                    </p>
                  </div>
                </div>
              </div>


            </div>
          </div>
        )
    }
  }


  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="text-xl font-bold bg-gradient-to-r from-[#4169E1] to-[#FF1493] text-transparent bg-clip-text">
                  EventNet
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`${
                    activeTab === 'overview'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  Overview
                </button>
                {isCreator && (
                  <>
                    <button
                      onClick={() => setActiveTab('guests')}
                      className={`${
                        activeTab === 'guests'
                          ? 'border-blue-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                    >
                      Guests
                    </button>
                    <button
                      onClick={() => setActiveTab('registration')}
                      className={`${
                        activeTab === 'registration'
                          ? 'border-blue-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                    >
                      Registration
                    </button>

                  </>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {isCreator && (
                <>
                  <Link
                    to={`/vendor-dashboard/events/${eventId}/edit`}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Edit Event
                  </Link>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
                  >
                    <TrashIcon className="h-5 w-5 mr-2" />
                    Delete Event
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Action Buttons */}
        <div className="mb-8 flex space-x-4">
          <button
            onClick={() => setShowShareModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ShareIcon className="h-5 w-5 mr-2 text-gray-500" />
            Share Event
          </button>
          {!isCreator && (
            isRegistered ? (
              <div className="flex flex-col gap-2">
                {/* Attendance button — only during ongoing events */}
                {event.liveStatus === 'ongoing' && (
                  isCheckedIn ? (
                    <span className="inline-flex items-center gap-1 px-4 py-2 rounded-md text-sm font-medium bg-green-100 text-green-700">
                      ✅ Attendance Marked
                    </span>
                  ) : (
                    <button
                      onClick={handleSelfCheckin}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-500 hover:opacity-90"
                    >
                      📍 Mark My Attendance
                    </button>
                  )
                )}
                <button
                  onClick={handleUnregister}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-red-500 to-pink-500 hover:opacity-90"
                >
                  Unregister
                </button>
              </div>
            ) : isExpired ? (
              <button
                disabled
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-400 cursor-not-allowed"
              >
                Event Ended
              </button>
            ) : isFull ? (
              <button
                disabled
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-400 cursor-not-allowed"
              >
                Capacity Full
              </button>
            ) : (
              <button
                onClick={handleRegister}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-[#4169E1] to-[#FF1493] hover:opacity-90"
              >
                <UserGroupIcon className="h-5 w-5 mr-2" />
                Register Now
              </button>
            )
          )}
        </div>

        {/* Tab Content */}
        {renderTabContent()}

        {/* Share Modal */}
        {showShareModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Share this event</h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center mb-6 p-4 bg-gray-50 rounded-lg">
                <QRCodeSVG
                  value={`${window.location.origin}/events/${eventId}`}
                  size={200}
                  level="H"
                  includeMargin={true}
                  className="mb-4"
                />
                <button
                  onClick={() => {
                    const canvas = document.querySelector('canvas')
                    canvas.toBlob(blob => {
                      navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                      ])
                      toast.success('QR code copied to clipboard!')
                    })
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                >
                  <QrCodeIcon className="w-4 h-4 mr-1" />
                  Copy QR Code
                </button>
              </div>

              {/* Share Options */}
              <div className="space-y-4">
                <button
                  onClick={copyEventLink}
                  className="flex items-center justify-between w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <span className="flex items-center">
                    <ClipboardIcon className="w-5 h-5 mr-2 text-gray-500" />
                    Copy event link
                  </span>
                  <ShareIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full">
              <h3 className="text-lg font-semibold mb-4">Delete Event</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this event? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleDelete()
                    setShowDeleteModal(false)
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}