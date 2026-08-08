import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import MyTickets from './MyTickets'
import AnimatedPhone from '../components/AnimatedPhone'

export default function Home() {
  const { user } = useAuth()

  // Render different content based on user role
  const renderUserContent = () => {
    // Vendor-specific content
    if (user && user.role === 'vendor') {
      return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between pt-12 lg:pt-20 gap-8">
            {/* Left Content */}
            <div className="w-full lg:w-1/2 text-center lg:text-left">
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="mb-6"
              >
                <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  Welcome back, {user.name}!
                </span>
              </motion.div>
              
              <motion.h1
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
              >
                Manage
                <br />
                your{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
                  events
                </span>
                {' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">
                  easily
                </span>
              </motion.h1>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-lg sm:text-xl text-gray-300 mb-8 max-w-xl mx-auto lg:mx-0"
              >
                Create and manage events, track registrations, and grow your business with our powerful vendor tools.
              </motion.p>

              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Link
                  to="/vendor-dashboard/events/create"
                  className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all hover:shadow-lg hover:shadow-purple-500/25 inline-block text-center"
                >
                  Create New Event
                </Link>
                <Link
                  to="/vendor-dashboard/events"
                  className="bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all hover:bg-white/20 inline-block text-center"
                >
                  Manage Events
                </Link>
              </motion.div>
            </div>

            {/* Right Content - Animated Phone */}
            <div className="w-full lg:w-1/2 h-[400px] lg:h-[500px] relative">
              <AnimatedPhone />
            </div>
          </div>
        </div>
      )
    }
    
    // Regular user content
    if (user) {
      return (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center justify-between pt-12 lg:pt-20 gap-8">
            {/* Left Content */}
            <div className="w-full lg:w-1/2 text-center lg:text-left">
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="mb-6"
              >
                <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  Welcome back, {user.name}!
                </span>
              </motion.div>
              
              <motion.h1
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
              >
                Discover
                <br />
                amazing{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
                  events
                </span>
                {' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">
                  today
                </span>
              </motion.h1>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-lg sm:text-xl text-gray-300 mb-8 max-w-xl mx-auto lg:mx-0"
              >
                Browse events, join exciting gatherings, and purchase tickets for unforgettable experiences.
              </motion.p>

              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Link
                  to="/events"
                  className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all hover:shadow-lg hover:shadow-purple-500/25 inline-block text-center"
                >
                  Browse Events
                </Link>
                <Link
                  to="/my-tickets"
                  className="bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all hover:bg-white/20 inline-block text-center"
                >
                  My Tickets
                </Link>
              </motion.div>
            </div>

            {/* Right Content - Animated Phone */}
            <div className="w-full lg:w-1/2 h-[400px] lg:h-[500px] relative">
              <AnimatedPhone />
            </div>
          </div>
        </div>
      )
    }

    // Non-logged in user content (default)
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Hero Section */}
      {user ? (
        // Logged-in user content based on role
        renderUserContent()
      ) : (
        // Non-logged-in user hero section
        <div className="container mx-auto px-28">
          <div className="flex flex-col lg:flex-row items-center justify-between pt-12 lg:pt-20 gap-8">
            {/* Left Content */}
            <div className="w-full lg:w-1/2 text-center lg:text-left">
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="mb-6"
              >
                <span className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  EventNet
                </span>
              </motion.div>
              
              <motion.h1
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight"
              >
                Delightful
                <br />
                events{' '}
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
                  start
                </span>
                {' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">
                  here
                </span>
              </motion.h1>

              <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="text-lg sm:text-xl text-gray-300 mb-8 max-w-xl mx-auto lg:mx-0"
              >
                Set up an event page, invite friends and <br />sell tickets. Host a memorable event <br /> today
              </motion.p>

              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="space-x-4"
              >
                <Link
                  to="/register"
                  className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all hover:shadow-lg hover:shadow-purple-500/25 inline-block"
                >
                  Create Your First Event
                </Link>
                <Link
                  to="/login"
                  className="bg-white/10 backdrop-blur-sm text-white px-8 py-4 rounded-lg text-lg font-semibold transition-all hover:bg-white/20 inline-block mt-4 lg:mt-0"
                >
                  Sign In
                </Link>
              </motion.div>
            </div>

            {/* Right Content - Animated Phone */}
            <div className="w-full lg:w-1/2 h-[400px] lg:h-[500px] relative">
              <AnimatedPhone />
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 