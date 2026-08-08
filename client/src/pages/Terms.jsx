import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { FaGavel, FaUserShield, FaCalendarAlt, FaCreditCard, FaExclamationTriangle } from 'react-icons/fa'

export default function Terms() {
  const { user } = useAuth()
  
  // Different content based on user role
  const getTermsContent = () => {
    if (user && user.role === 'vendor') {
      return (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <FaGavel className="text-3xl text-blue-400" />
            <h2 className="text-2xl font-bold">Vendor Terms of Service</h2>
          </div>
          <p className="mb-6">
            These Terms of Service ("Terms") govern your access to and use of EventNet's platform and services as a vendor or event organizer.
            By using our services, you agree to be bound by these Terms.
          </p>
          
          <div className="bg-gray-700 p-6 rounded-lg my-8 border-l-4 border-blue-400">
            <div className="flex items-center gap-3 mb-4">
              <FaUserShield className="text-2xl text-blue-400" />
              <h3 className="text-xl font-semibold">Vendor Accounts</h3>
            </div>
            <p className="mb-4">
              To use our services as a vendor, you must create an account and provide accurate information. 
              You are responsible for maintaining the security of your account and password.
              EventNet cannot and will not be liable for any loss or damage from your failure to comply with this security obligation.
            </p>
          </div>
          
          <div className="bg-gray-700 p-6 rounded-lg my-8 border-l-4 border-purple-500">
            <div className="flex items-center gap-3 mb-4">
              <FaCalendarAlt className="text-2xl text-purple-500" />
              <h3 className="text-xl font-semibold">Event Creation and Management</h3>
            </div>
            <ul className="list-none pl-6 mb-6 space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">•</span>
                <span>You are responsible for the accuracy of all event information you provide</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">•</span>
                <span>You must have all necessary rights and permissions to host your events</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">•</span>
                <span>You agree not to create events that violate our community guidelines or applicable laws</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">•</span>
                <span>EventNet reserves the right to remove events that violate our policies</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-gray-700 p-6 rounded-lg my-8 border-l-4 border-pink-500">
            <div className="flex items-center gap-3 mb-4">
              <FaCreditCard className="text-2xl text-pink-500" />
              <h3 className="text-xl font-semibold">Fees and Payments</h3>
            </div>
            <p className="mb-4">
              EventNet charges fees for the use of our platform. These fees are outlined during the event creation process.
              Payments to vendors are processed according to our payment schedule, typically within 5-7 business days after an event concludes.
            </p>
          </div>
          
          <div className="bg-gray-700 p-6 rounded-lg my-8 border-l-4 border-blue-400">
            <div className="flex items-center gap-3 mb-4">
              <FaExclamationTriangle className="text-2xl text-yellow-500" />
              <h3 className="text-xl font-semibold">Cancellations and Refunds</h3>
            </div>
            <p className="mb-4">
              As a vendor, you are responsible for your cancellation and refund policies, which must be clearly communicated to attendees.
              In the event of a dispute, EventNet reserves the right to make the final decision regarding refunds.
            </p>
          </div>
          
          <div className="bg-gray-700 p-6 rounded-lg my-8 border-l-4 border-red-500">
            <div className="flex items-center gap-3 mb-4">
              <FaExclamationTriangle className="text-2xl text-red-500" />
              <h3 className="text-xl font-semibold">Termination</h3>
            </div>
            <p className="mb-4">
              EventNet reserves the right to terminate or suspend your account at any time for violations of these Terms or for any other reason.
            </p>
          </div>
        </div>
      )
    } else {
      return (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <FaGavel className="text-3xl text-blue-400" />
            <h2 className="text-2xl font-bold">User Terms of Service</h2>
          </div>
          <p className="mb-6">
            These Terms of Service ("Terms") govern your access to and use of EventNet's platform and services as an event attendee or user.
            By using our services, you agree to be bound by these Terms.
          </p>
          
          <div className="bg-gray-700 p-6 rounded-lg my-8 border-l-4 border-blue-400">
            <div className="flex items-center gap-3 mb-4">
              <FaUserShield className="text-2xl text-blue-400" />
              <h3 className="text-xl font-semibold">User Accounts</h3>
            </div>
            <p className="mb-4">
              To register for events, you must create an account and provide accurate information. 
              You are responsible for maintaining the security of your account and password.
              You must notify us immediately of any breach of security or unauthorized use of your account.
            </p>
          </div>
          
          <div className="bg-gray-700 p-6 rounded-lg my-8 border-l-4 border-purple-500">
            <div className="flex items-center gap-3 mb-4">
              <FaCalendarAlt className="text-2xl text-purple-500" />
              <h3 className="text-xl font-semibold">Event Registration</h3>
            </div>
            <ul className="list-none pl-6 mb-6 space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">•</span>
                <span>Ticket purchases are final and subject to the event organizer's refund policy</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">•</span>
                <span>EventNet is not responsible for the quality, safety, or content of events</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">•</span>
                <span>You agree to comply with all rules and regulations set by event organizers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">•</span>
                <span>Tickets may not be resold or transferred without the event organizer's permission</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-gray-700 p-6 rounded-lg my-8 border-l-4 border-pink-500">
            <div className="flex items-center gap-3 mb-4">
              <FaExclamationTriangle className="text-2xl text-pink-500" />
              <h3 className="text-xl font-semibold">User Conduct</h3>
            </div>
            <p className="mb-4">
              You agree not to engage in any activity that interferes with or disrupts the services or servers.
              You also agree not to use our platform for any illegal or unauthorized purpose.
            </p>
          </div>
          
          <div className="bg-gray-700 p-6 rounded-lg my-8 border-l-4 border-yellow-500">
            <div className="flex items-center gap-3 mb-4">
              <FaExclamationTriangle className="text-2xl text-yellow-500" />
              <h3 className="text-xl font-semibold">Limitation of Liability</h3>
            </div>
            <p className="mb-4">
              EventNet is not liable for any damages or losses related to your use of the services.
              We are not responsible for the actions, content, information, or data of third parties.
            </p>
          </div>
          
          <div className="bg-gray-700 p-6 rounded-lg my-8 border-l-4 border-red-500">
            <div className="flex items-center gap-3 mb-4">
              <FaExclamationTriangle className="text-2xl text-red-500" />
              <h3 className="text-xl font-semibold">Termination</h3>
            </div>
            <p className="mb-4">
              EventNet reserves the right to terminate or suspend your account at any time for violations of these Terms or for any other reason.
            </p>
          </div>
        </div>
      )
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Hero Section with Background Image */}
      <div className="w-full bg-cover bg-center h-96" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1556761175-b413da4baf72?ixlib=rb-1.2.1&auto=format&fit=crop&w=1567&q=80')" }}>
        <div className="w-full h-full flex items-center justify-center bg-black bg-opacity-60">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center px-4"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
              Terms of Service
            </h1>
            <div className="flex justify-center mb-6">
              <FaGavel className="text-4xl text-blue-400" />
            </div>
            <p className="text-xl text-gray-200 max-w-2xl mx-auto">
              Please read these terms carefully before using our platform
            </p>
          </motion.div>
        </div>
      </div>
      
      {/* Content Section */}
      <div className="container mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="max-w-5xl mx-auto bg-gray-800 rounded-lg shadow-xl p-8 border border-gray-700"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="prose prose-invert max-w-none text-gray-300"
          >
            {getTermsContent()}
            
            <div className="mt-12 pt-6 border-t border-gray-700">
              <p className="text-sm text-gray-400">
                Last updated: May 4, 2025
              </p>
              <p className="text-sm text-gray-400 mt-2">
                By using EventNet, you acknowledge that you have read and understood these Terms and agree to be bound by them.
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
