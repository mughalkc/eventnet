import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { CalendarIcon, MapPinIcon, UserIcon, PhotoIcon, TicketIcon, CurrencyDollarIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { toast } from 'react-hot-toast'
import { useTheme, themes as themeConfig } from '../context/ThemeContext'
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api'
import config from '../config'

const themeOptions = [
  { 
    id: 'minimal', 
    name: 'Minimal', 
    icon: '◻️',
    description: 'Clean and simple design',
    gradient: 'from-gray-50 to-gray-100',
    borderColor: 'border-gray-200'
  },
  { 
    id: 'quantum', 
    name: 'Quantum', 
    icon: '🌌',
    description: 'Modern and futuristic',
    gradient: 'from-purple-50 to-indigo-100',
    borderColor: 'border-indigo-200'
  },
  { 
    id: 'warp', 
    name: 'Warp', 
    icon: '🌀',
    description: 'Dynamic and energetic',
    gradient: 'from-blue-50 to-cyan-100',
    borderColor: 'border-cyan-200'
  },
  { 
    id: 'emoji', 
    name: 'Emoji', 
    icon: '😊',
    description: 'Fun and playful',
    gradient: 'from-yellow-50 to-orange-100',
    borderColor: 'border-yellow-200'
  },
  { 
    id: 'confetti', 
    name: 'Confetti', 
    icon: '🎉',
    description: 'Celebratory and festive',
    gradient: 'from-pink-50 to-rose-100',
    borderColor: 'border-rose-200'
  },
  { 
    id: 'pattern', 
    name: 'Pattern', 
    icon: '🔷',
    description: 'Geometric and structured',
    gradient: 'from-teal-50 to-emerald-100',
    borderColor: 'border-emerald-200'
  },
]

export default function CreateEvent() {
  const navigate = useNavigate()
  const { eventId } = useParams() // Get eventId from URL params if in edit mode
  const location = useLocation() // Check if we're in /edit route
  const [isEditMode, setIsEditMode] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const { setCurrentTheme, themeColors } = useTheme()
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    location: {
      address: '',
      coordinates: {
        lat: null,
        lng: null
      },
      isVirtual: false
    },
    description: '',
    theme: 'minimal',
    isPublic: true,
    requireApproval: false,
    capacity: 'unlimited',
    maxCapacity: '',
    tickets: [
      {
        type: 'free',
        name: 'General Admission',
        price: 0,
        quantity: null,
        description: 'Standard entry to the event'
      }
    ]
  })
  const [image, setImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  // Map configuration
  const mapContainerStyle = {
    width: '100%',
    height: '300px'
  };
  const [mapCenter, setMapCenter] = useState({
    lat: 31.5204, // Default to Lahore, Pakistan
    lng: 74.3587
  });
  const [selectedLocation, setSelectedLocation] = useState(null);
  
  // Handle form field changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    
    if (name === 'isVirtual') {
      setFormData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          isVirtual: checked
        }
      }))
      return;
    }
    
    if (name === 'address') {
      setFormData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          address: value
        }
      }))
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }
  
  // Handle map click to set location
  const handleMapClick = (event) => {
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    
    setSelectedLocation({ lat, lng });
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        coordinates: {
          lat,
          lng
        }
      }
    }));
  }
  
  // ── Feature 1: Generate AI description ──────────────────────────────────────
  const handleGenerateDescription = async () => {
    if (!formData.name) {
      toast.error('Please enter an event name first')
      return
    }
    setAiLoading(true)
    try {
      const response = await fetch('http://${window.location.hostname}:5001/api/vendor/ai/generate-description', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          name: formData.name,
          location: formData.location?.address,
          startDate: formData.startDate,
          endDate: formData.endDate,
          startTime: formData.startTime,
          endTime: formData.endTime,
          eventType: formData.eventType
        })
      })
      const data = await response.json()
      if (response.ok && data.description) {
        setFormData(prev => ({ ...prev, description: data.description }))
        toast.success('AI description generated!')
      } else {
        toast.error(data.message || 'Failed to generate description')
      }
    } catch (error) {
      toast.error('AI service unavailable. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }

  // ── Feature 2: Check conflict before submit ──────────────────────────────────
  const checkConflict = async () => {
    if (!formData.startDate || !formData.startTime) return false
    try {
      const response = await fetch('http://${window.location.hostname}:5001/api/vendor/events/check-conflict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          startDate: formData.startDate,
          endDate: formData.endDate || formData.startDate,
          startTime: formData.startTime,
          endTime: formData.endTime,
          location: formData.location?.address,
          excludeEventId: eventId // ignore self when editing
        })
      })
      const data = await response.json()
      if (data.conflict) {
        toast.error('⚠️ ' + data.message, { duration: 5000 })
        return true
      }
      return false
    } catch {
      return false // don't block if conflict check fails
    }
  }

  // Check if in edit mode and fetch event data
  useEffect(() => {
    // Detect if we're in edit mode by checking URL path or eventId
    const isInEditMode = location.pathname.includes('/edit') || eventId;
    setIsEditMode(isInEditMode);
    
    if (isInEditMode && eventId) {
      fetchEventData();
    }
  }, [eventId, location.pathname]);

  // Fetch event data for editing
  const fetchEventData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`http://${window.location.hostname}:5001/api/events/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch event data');
      }
      
      const eventData = await response.json();
      
      // Format dates and times for form inputs
      const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      };
      
      // Prepare the form data
      setFormData({
        name: eventData.name || '',
        startDate: formatDateForInput(eventData.startDate),
        startTime: eventData.startTime || '',
        endDate: formatDateForInput(eventData.endDate),
        endTime: eventData.endTime || '',
        location: {
          address: typeof eventData.location === 'object' ? eventData.location.address : eventData.location || '',
          coordinates: typeof eventData.location === 'object' && eventData.location.coordinates ? {
            lat: eventData.location.coordinates.lat || null,
            lng: eventData.location.coordinates.lng || null
          } : {
            lat: null,
            lng: null
          },
          isVirtual: typeof eventData.location === 'object' ? !!eventData.location.isVirtual : false
        },
        description: eventData.description || '',
        theme: eventData.theme || 'minimal',
        isPublic: eventData.isPublic !== undefined ? eventData.isPublic : true,
        requireApproval: eventData.requireApproval || false,
        capacity: eventData.maxCapacity ? 'limited' : 'unlimited',
        maxCapacity: eventData.maxCapacity || '',
        tickets: Array.isArray(eventData.tickets) && eventData.tickets.length > 0 
          ? eventData.tickets.map(ticket => ({
              type: ticket.price > 0 ? 'paid' : 'free',
              name: ticket.name || '',
              price: ticket.price || 0,
              quantity: ticket.quantity || null,
              description: ticket.description || ''
            }))
          : [
              {
                type: 'free',
                name: 'General Admission',
                price: 0,
                quantity: null,
                description: 'Standard entry to the event'
              }
            ]
      });
      
      // If there's an image, set the preview
      if (eventData.image) {
        // Check if it's a full URL or relative path
        const imageUrl = eventData.image.startsWith('http') 
          ? eventData.image 
          : `http://${window.location.hostname}:5001/${eventData.image.replace(/^\//, '')}`;
          
        setImagePreview(imageUrl);
      }
      
      // If there are coordinates, update the map
      if (typeof eventData.location === 'object' && eventData.location.coordinates) {
        const coordinates = eventData.location.coordinates;
        if (coordinates.lat && coordinates.lng) {
          setMapCenter({
            lat: coordinates.lat,
            lng: coordinates.lng
          });
          setSelectedLocation({
            lat: coordinates.lat,
            lng: coordinates.lng
          });
        }
      }
      
      toast.success('Event data loaded successfully');
    } catch (error) {
      console.error('Error fetching event data:', error);
      toast.error('Failed to load event data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Geocode address to get coordinates
  const geocodeAddress = async () => {
    if (!formData.location.address) {
      toast.error('Please enter an address first');
      return;
    }
    
    try {
      // Using OpenStreetMap Nominatim — completely free, no API key needed
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.location.address)}&limit=1`,
        { headers: { 'Accept-Language': 'en', 'User-Agent': 'EventNet-App' } }
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setSelectedLocation({ lat, lng });
        setMapCenter({ lat, lng });
        setFormData(prev => ({
          ...prev,
          location: {
            ...prev.location,
            coordinates: { lat, lng }
          }
        }));
        toast.success('Location found: ' + data[0].display_name.split(',').slice(0, 2).join(','));
      } else {
        toast.error('Could not find this location. Try a more specific address (e.g. "Gulberg, Lahore, Pakistan")');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      toast.error('Error finding location. Please check your internet connection.');
    }
  }
  
  // Add a new ticket type
  const addTicket = () => {
    setFormData(prev => ({
      ...prev,
      tickets: [...prev.tickets, {
        type: 'free',
        name: '',
        price: 0,
        quantity: null,
        description: ''
      }]
    }));
  }
  
  // Remove a ticket type
  const removeTicket = (index) => {
    if (formData.tickets.length <= 1) {
      toast.error('You must have at least one ticket type');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      tickets: prev.tickets.filter((_, i) => i !== index)
    }));
  }
  
  // Handle ticket field changes
  const handleTicketChange = (index, field, value) => {
    const updatedTickets = [...formData.tickets];
    
    if (field === 'type' && value === 'free') {
      updatedTickets[index] = {
        ...updatedTickets[index],
        [field]: value,
        price: 0
      };
    } else {
      updatedTickets[index] = {
        ...updatedTickets[index],
        [field]: value
      };
    }
    
    setFormData(prev => ({
      ...prev,
      tickets: updatedTickets
    }));
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error('Image size should be less than 5MB')
        return
      }
      setImage(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleThemeChange = (themeId) => {
    setFormData(prev => ({ ...prev, theme: themeId }))
    setCurrentTheme(themeId)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Feature 2: Block submit if there is a time/location conflict
    const hasConflict = await checkConflict()
    if (hasConflict) return
    
    // Validate tickets
    const hasInvalidTickets = formData.tickets.some(ticket => {
      if (!ticket.name.trim()) {
        toast.error('All tickets must have a name')
        return true
      }
      if (ticket.type === 'paid' && (!ticket.price || ticket.price <= 0)) {
        toast.error('Paid tickets must have a price greater than 0')
        return true
      }
      return false
    })
    
    if (hasInvalidTickets) return
    
    // Validate location
    if (!formData.location.isVirtual && !formData.location.address) {
      toast.error('Please provide a location address')
      return
    }
    
    try {
      // For edit mode, ALWAYS use JSON approach instead of FormData
      if (isEditMode) {
        const jsonData = {
          name: formData.name,
          startDate: formData.startDate,
          startTime: formData.startTime,
          endDate: formData.endDate,
          endTime: formData.endTime,
          description: formData.description,
          theme: formData.theme,
          isPublic: formData.isPublic,
          requireApproval: formData.requireApproval,
          capacity: formData.capacity,
          tickets: formData.tickets,
          location: {
            address: formData.location.address,
            isVirtual: formData.location.isVirtual,
            coordinates: formData.location.coordinates.lat && formData.location.coordinates.lng ? {
              lat: formData.location.coordinates.lat,
              lng: formData.location.coordinates.lng
            } : null
          }
        }
        
        if (formData.capacity === 'limited' && formData.maxCapacity) {
          jsonData.maxCapacity = formData.maxCapacity
        }
        
        // Event already exists, update it
        try {
          console.log('Updating event with ID:', eventId);
          let response;
          
          // If updating with a new image, use FormData approach instead of JSON
          if (image) {
            console.log('Updating event with new image');
            const formDataToSend = new FormData();
            
            // Add all form fields to FormData
            Object.keys(jsonData).forEach(key => {
              if (jsonData[key] !== null && jsonData[key] !== undefined) {
                // Handle objects (like location) by converting to JSON string
                if (typeof jsonData[key] === 'object') {
                  formDataToSend.append(key, JSON.stringify(jsonData[key]));
                } else {
                  formDataToSend.append(key, jsonData[key]);
                }
              }
            });
            
            // Add the image
            formDataToSend.append('image', image);
            
            // Send update with image
            response = await fetch(`http://${window.location.hostname}:5001/api/vendor/events/${eventId}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: formDataToSend
            });
          } else {
            // No new image, use JSON approach
            console.log('Updating event with JSON data:', jsonData);
            response = await fetch(`http://${window.location.hostname}:5001/api/vendor/events/${eventId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify(jsonData)
            });
          }
          
          if (response.ok) {
            const data = await response.json();
            console.log('Event updated successfully:', data);
            toast.success('Event updated successfully!');
            
            // Use a short delay to ensure server processing is complete
            setTimeout(() => {
              // Use full page reload to ensure fresh data
             navigate(`/vendor-dashboard/events/${eventId}`);
            }, 1000);
          } else {
            const error = await response.json();
            throw new Error(error.message || 'Failed to update event');
          }
        } catch (error) {
          console.error('Event update error:', error);
          toast.error(error.message || 'Failed to update event');
        }
        
        return // Exit early for edit mode
      }
      
      // For CREATE mode, use FormData approach
      const formDataToSend = new FormData()
      formDataToSend.append('name', formData.name)
      formDataToSend.append('description', formData.description)
      formDataToSend.append('startDate', formData.startDate)
      formDataToSend.append('startTime', formData.startTime)
      formDataToSend.append('endDate', formData.endDate)
      formDataToSend.append('endTime', formData.endTime)
      formDataToSend.append('theme', formData.theme)
      formDataToSend.append('isPublic', formData.isPublic)
      formDataToSend.append('requireApproval', formData.requireApproval)
      formDataToSend.append('capacity', formData.capacity)
      if (formData.maxCapacity) {
        formDataToSend.append('maxCapacity', formData.maxCapacity)
      }
      
      // For create mode, handle location data
      formDataToSend.append('location[address]', formData.location.address)
      formDataToSend.append('location[isVirtual]', formData.location.isVirtual)
      if (formData.location.coordinates.lat && formData.location.coordinates.lng) {
        formDataToSend.append('location[coordinates][lat]', formData.location.coordinates.lat)
        formDataToSend.append('location[coordinates][lng]', formData.location.coordinates.lng)
      }
      
      // Add tickets data
      formDataToSend.append('tickets', JSON.stringify(formData.tickets))
      
      // Append image if exists
      if (image) {
        formDataToSend.append('image', image)
      }

      // For new events, use the standard endpoint
      const endpoint = 'http://${window.location.hostname}:5001/api/vendor/events';
      console.log('Creating new event, sending FormData to:', endpoint);
      
      // Send the create request
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formDataToSend
      });
      
      if (response.ok) {
        const data = await response.json()
        console.log('Event created successfully:', data)
        toast.success('Event created successfully!')
        
        // For new events, navigate to the event details page
        navigate(`/vendor-dashboard/events/${data.eventId}`)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to create event')
      }
    } catch (error) {
      console.error('Create event error:', error)
      toast.error('An error occurred while creating the event')
    }
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="md:grid md:grid-cols-3 md:gap-6">
          <div className="md:col-span-1">
            <div className="px-4 sm:px-0">
              <h3 className={`text-2xl font-bold mb-2 ${themeColors.text}`}>
                {isEditMode ? 'Update Event' : 'Create Event'}
              </h3>
              <p className={`text-sm opacity-75 ${themeColors.text}`}>
                {isEditMode 
                  ? 'Make changes to update your event details.' 
                  : 'Fill out the details below to create your event page.'}
              </p>
            </div>
          </div>

          <div className="mt-5 md:mt-0 md:col-span-2">
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              onSubmit={handleSubmit}
              className="shadow-xl rounded-xl overflow-hidden backdrop-blur-sm"
            >
              <div className={`px-4 py-5 ${themeColors.cardBg} sm:p-6`}>
                <div className="grid grid-cols-6 gap-6">
                  <div className="col-span-6">
                    <label htmlFor="name" className={`block text-sm font-medium ${themeColors.text} mb-1`}>
                      Event Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      id="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className={`block w-full rounded-md ${themeColors.inputBg} ${themeColors.inputBorder} ${themeColors.inputFocus} sm:text-sm`}
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="startDate" className={`block text-sm font-medium ${themeColors.text} mb-1`}>
                      Start Date
                    </label>
                    <input
                      type="date"
                      name="startDate"
                      id="startDate"
                      required
                      value={formData.startDate}
                      onChange={handleChange}
                      className={`block w-full rounded-md ${themeColors.inputBg} ${themeColors.inputBorder} ${themeColors.inputFocus} sm:text-sm`}
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="startTime" className={`block text-sm font-medium ${themeColors.text} mb-1`}>
                      Start Time
                    </label>
                    <input
                      type="time"
                      name="startTime"
                      id="startTime"
                      required
                      value={formData.startTime}
                      onChange={handleChange}
                      className={`block w-full rounded-md ${themeColors.inputBg} ${themeColors.inputBorder} ${themeColors.inputFocus} sm:text-sm`}
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="endDate" className={`block text-sm font-medium ${themeColors.text} mb-1`}>
                      End Date
                    </label>
                    <input
                      type="date"
                      name="endDate"
                      id="endDate"
                      required
                      value={formData.endDate}
                      onChange={handleChange}
                      className={`block w-full rounded-md ${themeColors.inputBg} ${themeColors.inputBorder} ${themeColors.inputFocus} sm:text-sm`}
                    />
                  </div>

                  <div className="col-span-6 sm:col-span-3">
                    <label htmlFor="endTime" className={`block text-sm font-medium ${themeColors.text} mb-1`}>
                      End Time
                    </label>
                    <input
                      type="time"
                      name="endTime"
                      id="endTime"
                      required
                      value={formData.endTime}
                      onChange={handleChange}
                      className={`block w-full rounded-md ${themeColors.inputBg} ${themeColors.inputBorder} ${themeColors.inputFocus} sm:text-sm`}
                    />
                  </div>

                  <div className="col-span-6">
                    <label className={`block text-sm font-medium ${themeColors.text} mb-1`}>
                      Location
                    </label>
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        name="isVirtual"
                        id="isVirtual"
                        checked={formData.location.isVirtual}
                        onChange={handleChange}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="isVirtual" className={`ml-2 text-sm ${themeColors.text}`}>
                        This is a virtual event
                      </label>
                    </div>
                    
                    {formData.location.isVirtual ? (
                      <input
                        type="text"
                        name="address"
                        id="address"
                        placeholder="Virtual event link or instructions"
                        value={formData.location.address}
                        onChange={handleChange}
                        className={`block w-full rounded-md ${themeColors.inputBg} ${themeColors.inputBorder} ${themeColors.inputFocus} sm:text-sm`}
                      />
                    ) : (
                      <div>
                        <div className="flex space-x-2 mb-3">
                          <input
                            type="text"
                            name="address"
                            id="address"
                            placeholder="Enter physical address"
                            value={formData.location.address}
                            onChange={handleChange}
                            className={`block w-full rounded-md ${themeColors.inputBg} ${themeColors.inputBorder} ${themeColors.inputFocus} sm:text-sm`}
                          />
                          <button
                            type="button"
                            onClick={geocodeAddress}
                            className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white ${themeColors.buttonBg} hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${themeColors.inputFocus}`}
                          >
                            Find
                          </button>
                        </div>
                        
                        <div className="rounded-md overflow-hidden border border-gray-300 mb-2">
                          <LoadScript googleMapsApiKey={config.googleMapsApiKey}>
                            <GoogleMap
                              mapContainerStyle={mapContainerStyle}
                              center={mapCenter}
                              zoom={13}
                              onClick={handleMapClick}
                            >
                              {selectedLocation && (
                                <Marker position={selectedLocation} />
                              )}
                            </GoogleMap>
                          </LoadScript>
                        </div>
                        <p className={`text-xs ${themeColors.text} opacity-70`}>
                          Click on the map to set the exact location or use the address search above
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="col-span-6">
                    <label htmlFor="description" className={`block text-sm font-medium ${themeColors.text} mb-1`}>
                      Description
                    </label>
                    <textarea
                      name="description"
                      id="description"
                      rows={3}
                      value={formData.description}
                      onChange={handleChange}
                      className={`block w-full rounded-md ${themeColors.inputBg} ${themeColors.inputBorder} ${themeColors.inputFocus} sm:text-sm`}
                    />
                    <button
                      type="button"
                      onClick={handleGenerateDescription}
                      disabled={aiLoading}
                      className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:opacity-90 disabled:opacity-60 transition"
                    >
                      {aiLoading ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                          </svg>
                          Generating...
                        </>
                      ) : (
                        <>✨ Generate with AI</>
                      )}
                    </button>
                  </div>

                  <div className="col-span-6">
                    <label className={`block text-sm font-medium ${themeColors.text} mb-3`}>
                      Choose a Theme
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {themeOptions.map((theme) => (
                        <motion.div
                          key={theme.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`
                            relative overflow-hidden rounded-xl cursor-pointer transition-all duration-200
                            backdrop-blur-sm
                            ${formData.theme === theme.id ? 'ring-2 ring-offset-2' : ''}
                            ${formData.theme === theme.id ? `ring-${themeConfig[theme.id].accent}-500` : ''}
                          `}
                          onClick={() => handleThemeChange(theme.id)}
                        >
                          <div className={`
                            h-full bg-gradient-to-br ${theme.gradient}
                            border ${theme.borderColor} p-6 rounded-xl
                            ${formData.theme === theme.id ? 'shadow-lg' : 'hover:shadow-md'}
                          `}>
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-3xl">{theme.icon}</span>
                              {formData.theme === theme.id && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className={`${themeConfig[theme.id].buttonBg} text-white rounded-full p-1`}
                                >
                                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                                  </svg>
                                </motion.div>
                              )}
                            </div>
                            <h3 className={`text-lg font-semibold mb-1 ${themeColors.text}`}>
                              {theme.name}
                            </h3>
                            <p className={`text-sm opacity-75 ${themeColors.text}`}>
                              {theme.description}
                            </p>
                            <div className="absolute inset-0 bg-gradient-to-t from-white/50 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-6">
                    <label htmlFor="capacity" className={`block text-sm font-medium ${themeColors.text} mb-1`}>
                      Capacity
                    </label>
                    <select
                      name="capacity"
                      id="capacity"
                      value={formData.capacity}
                      onChange={handleChange}
                      className={`block w-full rounded-md ${themeColors.inputBg} ${themeColors.inputBorder} ${themeColors.inputFocus} sm:text-sm`}
                    >
                      <option value="unlimited">Unlimited</option>
                      <option value="limited">Limited</option>
                    </select>
                  </div>

                  {formData.capacity === 'limited' && (
                    <div className="col-span-6">
                      <label htmlFor="maxCapacity" className={`block text-sm font-medium ${themeColors.text} mb-1`}>
                        Maximum Capacity
                      </label>
                      <input
                        type="number"
                        name="maxCapacity"
                        id="maxCapacity"
                        min="1"
                        required={formData.capacity === 'limited'}
                        value={formData.maxCapacity}
                        onChange={handleChange}
                        className={`block w-full rounded-md ${themeColors.inputBg} ${themeColors.inputBorder} ${themeColors.inputFocus} sm:text-sm`}
                      />
                    </div>
                  )}

                  <div className="col-span-6">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        name="requireApproval"
                        id="requireApproval"
                        checked={formData.requireApproval}
                        onChange={handleChange}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="requireApproval" className={`ml-2 text-sm text-gray-700 ${themeColors.text}`}>
                        Require approval for registrations
                      </label>
                    </div>
                  </div>
                  
                  <div className="col-span-6">
                    <div className="flex items-center justify-between mb-3">
                      <label className={`block text-sm font-medium ${themeColors.text}`}>
                        Tickets
                      </label>
                      <button
                        type="button"
                        onClick={addTicket}
                        className={`inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white ${themeColors.buttonBg} hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 ${themeColors.inputFocus}`}
                      >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Add Ticket
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {formData.tickets.map((ticket, index) => (
                        <div key={index} className={`p-4 rounded-lg border ${themeColors.inputBorder} ${themeColors.cardBg}`}>
                          <div className="flex justify-between items-center mb-3">
                            <h4 className={`font-medium ${themeColors.text}`}>Ticket #{index + 1}</h4>
                            {formData.tickets.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeTicket(index)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-6 gap-4">
                            <div className="col-span-6 sm:col-span-3">
                              <label className={`block text-sm font-medium ${themeColors.text} mb-1`}>
                                Ticket Name
                              </label>
                              <input
                                type="text"
                                placeholder="e.g., General Admission, VIP"
                                value={ticket.name}
                                onChange={(e) => handleTicketChange(index, 'name', e.target.value)}
                                className={`block w-full rounded-md ${themeColors.inputBg} ${themeColors.inputBorder} ${themeColors.inputFocus} sm:text-sm`}
                                required
                              />
                            </div>
                            
                            <div className="col-span-6 sm:col-span-3">
                              <label className={`block text-sm font-medium ${themeColors.text} mb-1`}>
                                Ticket Type
                              </label>
                              <select
                                value={ticket.type}
                                onChange={(e) => handleTicketChange(index, 'type', e.target.value)}
                                className={`block w-full rounded-md ${themeColors.inputBg} ${themeColors.inputBorder} ${themeColors.inputFocus} sm:text-sm`}
                              >
                                <option value="free">Free</option>
                                <option value="paid">Paid</option>
                              </select>
                            </div>
                            
                            {ticket.type === 'paid' && (
                              <div className="col-span-6 sm:col-span-3">
                                <label className={`block text-sm font-medium ${themeColors.text} mb-1`}>
                                  Price
                                </label>
                                <div className="relative rounded-md shadow-sm">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className={`text-gray-500 sm:text-sm`}>$</span>
                                  </div>
                                  <input
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    value={ticket.price}
                                    onChange={(e) => handleTicketChange(index, 'price', parseFloat(e.target.value) || 0)}
                                    className={`block w-full pl-7 rounded-md ${themeColors.inputBg} ${themeColors.inputBorder} ${themeColors.inputFocus} sm:text-sm`}
                                    required={ticket.type === 'paid'}
                                  />
                                </div>
                              </div>
                            )}
                            
                            <div className="col-span-6 sm:col-span-3">
                              <label className={`block text-sm font-medium ${themeColors.text} mb-1`}>
                                Quantity
                              </label>
                              <select
                                value={ticket.quantity === null ? 'unlimited' : 'limited'}
                                onChange={(e) => handleTicketChange(index, 'quantity', e.target.value === 'unlimited' ? null : 100)}
                                className={`block w-full rounded-md ${themeColors.inputBg} ${themeColors.inputBorder} ${themeColors.inputFocus} sm:text-sm`}
                              >
                                <option value="unlimited">Unlimited</option>
                                <option value="limited">Limited</option>
                              </select>
                            </div>
                            
                            {ticket.quantity !== null && (
                              <div className="col-span-6 sm:col-span-3">
                                <label className={`block text-sm font-medium ${themeColors.text} mb-1`}>
                                  Available Tickets
                                </label>
                                <input
                                  type="number"
                                  min="1"
                                  value={ticket.quantity}
                                  onChange={(e) => handleTicketChange(index, 'quantity', parseInt(e.target.value) || 1)}
                                  className={`block w-full rounded-md ${themeColors.inputBg} ${themeColors.inputBorder} ${themeColors.inputFocus} sm:text-sm`}
                                  required={ticket.quantity !== null}
                                />
                              </div>
                            )}
                            
                            <div className="col-span-6">
                              <label className={`block text-sm font-medium ${themeColors.text} mb-1`}>
                                Description (Optional)
                              </label>
                              <input
                                type="text"
                                placeholder="What's included with this ticket"
                                value={ticket.description}
                                onChange={(e) => handleTicketChange(index, 'description', e.target.value)}
                                className={`block w-full rounded-md ${themeColors.inputBg} ${themeColors.inputBorder} ${themeColors.inputFocus} sm:text-sm`}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="col-span-6">
                    <label className={`block text-sm font-medium ${themeColors.text} mb-1`}>
                      Event Image
                    </label>
                    <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md ${themeColors.inputBorder}`}>
                      <div className="space-y-1 text-center">
                        {imagePreview ? (
                          <div className="relative">
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="mx-auto h-32 w-auto rounded-md"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setImage(null)
                                setImagePreview(null)
                              }}
                              className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full p-1 text-xs"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <PhotoIcon className={`mx-auto h-12 w-12 ${themeColors.text} opacity-50`} />
                        )}
                        <div className="flex text-sm text-gray-600">
                          <label
                            htmlFor="image-upload"
                            className="relative cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500"
                          >
                            <span>Upload an image</span>
                            <input
                              id="image-upload"
                              name="image-upload"
                              type="file"
                              accept="image/*"
                              className="sr-only"
                              onChange={handleImageChange}
                            />
                          </label>
                          <p className="pl-1">or drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, GIF up to 5MB
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`px-4 py-3 ${themeColors.cardBg} text-right sm:px-6`}>
                <button
                  type="submit"
                  className={`
                    inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium 
                    rounded-md text-white ${themeColors.buttonBg} focus:outline-none focus:ring-2 
                    focus:ring-offset-2 ${themeColors.inputFocus}
                  `}
                >
                  {isEditMode ? 'Update Event' : 'Create Event'}
                </button>
              </div>
            </motion.form>
          </div>
        </div>
      </div>
    </div>
  )
} 