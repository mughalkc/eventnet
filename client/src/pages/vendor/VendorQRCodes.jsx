import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../../context/ThemeContext'
import { toast } from 'react-hot-toast'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'
import { CalendarIcon, ShareIcon } from '@heroicons/react/24/outline'

const VendorQRCodes = () => {
  const { currentTheme, themeColors } = useTheme()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [qrSize, setQrSize] = useState(200)
  const qrCanvasRef = useRef(null)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://${window.location.hostname}:5001/api/vendor/events', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setEvents(data)
        if (data.length > 0) {
          setSelectedEvent(data[0])
        }
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to fetch events')
      }
    } catch (error) {
      console.error('Fetch events error:', error)
      toast.error('An error occurred while fetching events')
    } finally {
      setLoading(false)
    }
  }

  const getEventUrl = (eventId) => {
    return `${window.location.origin}/events/${eventId}`
  }

  const downloadQRCode = () => {
    if (!selectedEvent || !qrCanvasRef.current) return
    
    try {
      // Get the canvas element - QRCodeCanvas creates an actual canvas element
      const canvas = qrCanvasRef.current
      
      // Convert canvas to data URL
      const url = canvas.toDataURL('image/png')
      
      // Create download link
      const link = document.createElement('a')
      link.href = url
      link.download = `${selectedEvent.name.replace(/\s+/g, '-').toLowerCase()}-qr-code.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('QR code downloaded successfully!')
    } catch (error) {
      console.error('Error downloading QR code:', error)
      toast.error('Failed to download QR code')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="container mx-auto px-4 py-8"
    >
      <h1 className={`text-2xl font-bold ${themeColors.text} mb-6`}>Event QR Codes</h1>
      
      {loading ? (
        <div className="flex justify-center my-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : events.length === 0 ? (
        <div className={`p-6 rounded-lg shadow-sm ${themeColors.cardBg} border ${themeColors.borderColor} text-center`}>
          <p className={`${themeColors.text} mb-4`}>You don't have any events yet.</p>
          <a 
            href="/vendor-dashboard/events/create" 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Create Your First Event
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`lg:col-span-1 p-6 rounded-lg shadow-sm ${themeColors.cardBg} border ${themeColors.borderColor}`}>
            <h2 className={`text-lg font-semibold ${themeColors.text} mb-4`}>Select Event</h2>
            <div className="space-y-4">
              {events.map(event => (
                <div 
                  key={event._id}
                  onClick={() => setSelectedEvent(event)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedEvent && selectedEvent._id === event._id 
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                      : `${themeColors.borderColor} hover:border-blue-300`
                  }`}
                >
                  <div className="flex items-start">
                    <CalendarIcon className="h-5 w-5 text-blue-500 mt-0.5 mr-2" />
                    <div>
                      <h3 className={`font-medium ${themeColors.text}`}>{event.name}</h3>
                      <p className={`text-sm text-gray-500 dark:text-gray-300`}>
                        {formatDate(event.startDate)}
                      </p>
                      <p className={`text-xs text-gray-500 dark:text-gray-300 mt-1`}>
                        {event.location && typeof event.location === 'object' 
                          ? (event.location.isVirtual ? 'Virtual Event' : event.location.address) 
                          : event.location || 'No location provided'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className={`lg:col-span-2 p-6 rounded-lg shadow-sm ${themeColors.cardBg} border ${themeColors.borderColor}`}>
            {selectedEvent ? (
              <div>
                <h2 className={`text-lg font-semibold ${themeColors.text} mb-4`}>QR Code for {selectedEvent.name}</h2>
                
                <div className="flex flex-col items-center mb-6">
                  <div className={`p-6 bg-white rounded-lg shadow-sm mb-4`}>
                    {/* Visible SVG QR Code for display */}
                    <QRCodeSVG 
                      value={getEventUrl(selectedEvent._id)} 
                      size={qrSize} 
                      level="H"
                      includeMargin={true}
                    />
                    {/* Hidden Canvas QR Code for download */}
                    <div style={{ display: 'none' }}>
                      <QRCodeCanvas 
                        ref={qrCanvasRef}
                        value={getEventUrl(selectedEvent._id)} 
                        size={qrSize} 
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4 mb-4">
                    <button
                      onClick={() => setQrSize(Math.max(100, qrSize - 50))}
                      className={`px-3 py-1 border ${themeColors.borderColor} rounded-md ${themeColors.text}`}
                      disabled={qrSize <= 100}
                    >
                      -
                    </button>
                    <span className={`${themeColors.text}`}>{qrSize}px</span>
                    <button
                      onClick={() => setQrSize(Math.min(400, qrSize + 50))}
                      className={`px-3 py-1 border ${themeColors.borderColor} rounded-md ${themeColors.text}`}
                      disabled={qrSize >= 400}
                    >
                      +
                    </button>
                  </div>
                  
                  <div className="flex space-x-4">
                    <button
                      onClick={downloadQRCode}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download QR Code
                    </button>
                    
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(getEventUrl(selectedEvent._id))
                        toast.success('Event URL copied to clipboard!')
                      }}
                      className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <ShareIcon className="h-5 w-5 mr-2" />
                      Copy URL
                    </button>
                  </div>
                </div>
                
                <div className={`p-4 rounded-lg bg-gray-50 dark:bg-gray-800 ${currentTheme === 'dark' ? 'text-white' : 'text-gray-500'} text-sm`}>
                  <h3 className="font-medium mb-2">How to use this QR code:</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Print and display this QR code at your event location</li>
                    <li>Include it in promotional materials and social media</li>
                    <li>Attendees can scan the code to view event details and register</li>
                    <li>You can download the image or copy the direct URL</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64">
                <p className={`${themeColors.text} mb-4`}>Select an event to generate a QR code</p>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  )
}

export default VendorQRCodes
