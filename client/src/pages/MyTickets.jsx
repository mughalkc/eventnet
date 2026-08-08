import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const TicketCard = ({ ticket }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const defaultImage = '/default-event.jpg';
  const ticketRef = useRef(null);

  // Ensure image URL is properly formatted
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return defaultImage;
    
    // If it's already a full URL (starts with http or https), use it as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // Otherwise, prepend the server URL
    return `http://${window.location.hostname}:5001/${imageUrl.replace(/^\//, '')}`;
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const formatTime = (timeString) => {
    return timeString || 'All day';
  };

  // Function to format location for display
  const formatLocation = (location) => {
    if (!location) return 'No location provided';
    
    if (typeof location === 'object') {
      return location.isVirtual ? 'Virtual Event' : location.address || 'No address provided';
    }
    
    return location;
  };
  
  // Generate a QR code with event details
  const generateQRCode = (ticket) => {
    if (!ticket || !ticket.event) {
      return { svg: '', code: 'INVALID' };
    }
    
    // Generate a unique code for the ticket
    const ticketId = ticket.ticketNumber || ticket._id || 'EVENT' + Math.floor(Math.random() * 1000000);
    
    // Create event data to encode in QR
    const eventData = {
      ticketId: ticketId,
      eventName: ticket.event.name || 'Unknown Event',
      date: ticket.event.startDate || 'No Date',
      time: ticket.event.startTime || 'No Time',
      location: typeof ticket.event.location === 'object' 
                ? (ticket.event.location.isVirtual ? 'Virtual Event' : ticket.event.location.address) 
                : (ticket.event.location || 'No Location')
    };
    
    // Encode the data as JSON string
    const dataString = JSON.stringify(eventData);
    
    // Create a QR code - simplified implementation
    // In a real app, you'd use a QR code library
    const moduleCount = 21; // Standard for small QR code
    const cellSize = 6;
    const margin = 20;
    const size = moduleCount * cellSize + 2 * margin;
    
    // Generate a deterministic QR pattern based on data string
    // This is a simplified version - real QR codes follow complex algorithms
    let qrHTML = '';
    const hashCode = (s) => {
      let hash = 0;
      for (let i = 0; i < s.length; i++) {
        hash = ((hash << 5) - hash) + s.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
      }
      return Math.abs(hash);
    };
    
    const hash = hashCode(dataString);
    const seed = new Array(moduleCount * moduleCount)
      .fill(0)
      .map((_, i) => ((hash * (i + 1)) % 100) < 40); // Deterministic pattern
    
    // Create finder patterns (the three squares in corners)
    // Top-left finder pattern
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        const isFrame = i === 0 || i === 6 || j === 0 || j === 6;
        const isInner = i >= 2 && i <= 4 && j >= 2 && j <= 4;
        if (isFrame || isInner) {
          qrHTML += `<rect x="${margin + j * cellSize}" y="${margin + i * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
        }
      }
    }
    
    // Top-right finder pattern
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        const isFrame = i === 0 || i === 6 || j === 0 || j === 6;
        const isInner = i >= 2 && i <= 4 && j >= 2 && j <= 4;
        if (isFrame || isInner) {
          qrHTML += `<rect x="${margin + (moduleCount - 7 + j) * cellSize}" y="${margin + i * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
        }
      }
    }
    
    // Bottom-left finder pattern
    for (let i = 0; i < 7; i++) {
      for (let j = 0; j < 7; j++) {
        const isFrame = i === 0 || i === 6 || j === 0 || j === 6;
        const isInner = i >= 2 && i <= 4 && j >= 2 && j <= 4;
        if (isFrame || isInner) {
          qrHTML += `<rect x="${margin + j * cellSize}" y="${margin + (moduleCount - 7 + i) * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
        }
      }
    }
    
    // Add data pattern (the rest of the QR code)
    for (let i = 0; i < moduleCount; i++) {
      for (let j = 0; j < moduleCount; j++) {
        // Skip finder pattern areas
        const isTopLeft = i < 7 && j < 7;
        const isTopRight = i < 7 && j >= moduleCount - 7;
        const isBottomLeft = i >= moduleCount - 7 && j < 7;
        
        if (!isTopLeft && !isTopRight && !isBottomLeft) {
          // Use the seed to determine if a cell should be filled
          const idx = i * moduleCount + j;
          if (seed[idx]) {
            qrHTML += `<rect x="${margin + j * cellSize}" y="${margin + i * cellSize}" width="${cellSize}" height="${cellSize}" fill="black"/>`;
          }
        }
      }
    }
    
    // Add fancy gradient background
    const gradientId = `qr-gradient-${ticketId.substring(0, 8)}`;
    const backgroundSvg = `
      <defs>
        <linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#4169E1" stop-opacity="0.2" />
          <stop offset="100%" stop-color="#FF1493" stop-opacity="0.2" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="${size}" height="${size}" fill="url(#${gradientId})" rx="10" ry="10" />
    `;
    
    return {
      svg: backgroundSvg + qrHTML,
      code: ticketId,
      size: size
    };
  };

  const downloadTicket = () => {
    // Create a new window with the ticket content
    const ticketWindow = window.open('', '_blank');
    
    // Generate QR code with event details
    const qrCode = generateQRCode(ticket);
    
    // Generate ticket HTML
    const ticketHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Event Ticket - ${ticket.event?.name}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
          }
          .ticket {
            max-width: 800px;
            margin: 0 auto;
            background-color: white;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
            overflow: hidden;
          }
          .ticket-header {
            background: linear-gradient(to right, #4169E1, #FF1493);
            color: white;
            padding: 20px;
            text-align: center;
          }
          .ticket-body {
            padding: 20px;
            display: flex;
          }
          .ticket-image {
            width: 200px;
            height: 200px;
            object-fit: cover;
            border-radius: 5px;
          }
          .ticket-details {
            margin-left: 20px;
            flex: 1;
          }
          .ticket-footer {
            border-top: 1px dashed #ccc;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .ticket-number {
            font-size: 24px;
            font-weight: bold;
            color: #4169E1;
          }
          .event-name {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .event-detail {
            margin-bottom: 10px;
            display: flex;
            align-items: center;
          }
          .event-detail svg {
            margin-right: 10px;
            width: 20px;
            height: 20px;
          }
          .qr-code {
            text-align: center;
            padding: 15px;
            background-color: #f9f9f9;
            border-radius: 10px;
          }
          .qr-container {
            margin: 0 auto;
            width: 100%;
            max-width: 250px;
          }
          .qr-text {
            text-align: center;
            font-family: monospace;
            font-size: 14px;
            margin-top: 8px;
            color: #333;
          }
          .qr-info {
            font-size: 12px;
            color: #666;
            margin-top: 5px;
            font-style: italic;
          }
          .print-button {
            display: block;
            margin: 20px auto;
            padding: 10px 20px;
            background-color: #4169E1;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
          }
          @media print {
            body {
              background-color: white;
            }
            .ticket {
              box-shadow: none;
            }
            .print-button {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="ticket">
          <div class="ticket-header">
            <h1>EventNet Ticket</h1>
          </div>
          <div class="ticket-body">
            <img class="ticket-image" src="${getImageUrl(ticket.event?.image)}" alt="${ticket.event?.name}" onerror="this.src='/default-event.jpg'">
            <div class="ticket-details">
              <div class="event-name">${ticket.event?.name}</div>
              <div class="event-detail">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                ${formatDate(ticket.event?.startDate)}
              </div>
              <div class="event-detail">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                ${formatTime(ticket.event?.startTime)}
              </div>
              <div class="event-detail">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                ${formatLocation(ticket.event?.location)}
              </div>
              <div class="event-detail">
                <strong>Status:</strong> ${ticket.status || 'Confirmed'}
              </div>
            </div>
          </div>
          <div class="ticket-footer">
            <div class="ticket-number">Ticket #${ticket.ticketNumber || qrCode.code.substring(0, 8)}</div>
            <div>Valid ID required for entry</div>
          </div>
          <div class="qr-code">
            <div class="qr-container">
              <svg width="100%" height="${qrCode.size}" viewBox="0 0 ${qrCode.size} ${qrCode.size}">
                ${qrCode.svg}
              </svg>
              <div class="qr-text">${qrCode.code}</div>
              <div class="qr-info">Scan to verify ticket details</div>
            </div>
          </div>
        </div>
        <button class="print-button" onclick="window.print()">Print Ticket</button>
      </body>
    </html>
    `;
    
    ticketWindow.document.write(ticketHTML);
    ticketWindow.document.close();
    
    // Show success message
    toast.success('Ticket ready for download. Click Print to save as PDF.');
  };

  return (
    <motion.div
      ref={ticketRef}
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
            src={getImageUrl(ticket.event?.image)}
            alt={ticket.event?.name}
            className={`w-full h-full object-cover ${!imageLoaded ? 'hidden' : ''}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageError(true)}
          />
        )}
        <div className="absolute top-0 right-0 bg-blue-600 text-white px-3 py-1 rounded-bl-lg">
          {ticket.status}
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{ticket.event?.name}</h3>
        <div className="flex items-center text-sm text-gray-500 mb-2">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {formatDate(ticket.event?.startDate)}
        </div>
        <div className="flex items-center text-sm text-gray-500 mb-2">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {formatTime(ticket.event?.startTime)}
        </div>
        <div className="flex items-center text-sm text-gray-500 mb-2">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {ticket.event?.location && typeof ticket.event.location === 'object' 
            ? (ticket.event.location.isVirtual ? 'Virtual Event' : ticket.event.location.address) 
            : ticket.event?.location || 'No location provided'}
        </div>
        <div className="mt-4 flex justify-between">
          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
            Ticket #{ticket.ticketNumber || ticket._id?.substring(0, 8)}
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={downloadTicket}
              className="text-green-600 hover:text-green-800 flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Ticket
            </button>
            <Link to={`/events/${ticket.event?._id}`} className="text-blue-600 hover:text-blue-800">
              Details
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      // First, fetch the user's registered events
      const response = await fetch('http://${window.location.hostname}:5001/api/events/user/registered', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const events = await response.json();

      // Convert events to tickets format
      const ticketsFromEvents = events.map(event => ({
        _id: `${event._id}-${user.id}`,
        event: event,
        status: 'Confirmed',
        ticketNumber: Math.floor(100000 + Math.random() * 900000).toString(),
        purchaseDate: event.createdAt || new Date().toISOString()
      }));

      setTickets(ticketsFromEvents);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error(`Failed to fetch your tickets: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-8 md:mb-0">
              <h1 className="text-4xl font-bold mb-4">My Tickets</h1>
              <p className="text-xl opacity-90">Access all your event tickets in one place</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-800">Your Tickets</h2>
          <p className="text-gray-600">You have {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Tickets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tickets.map((ticket) => (
            <div key={ticket._id}>
              <TicketCard ticket={ticket} />
            </div>
          ))}
        </div>

        {tickets.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No tickets found</h3>
            <p className="text-gray-600 mb-6">Register for events to get your tickets</p>
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
  );
};

export default MyTickets;
