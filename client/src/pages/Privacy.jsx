import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { FaShieldAlt, FaDatabase, FaUserLock, FaClipboardList, FaFileAlt } from 'react-icons/fa'

export default function Privacy() {
  const { user } = useAuth()
  
  // Different content based on user role
  const getPrivacyContent = () => {
    if (user && user.role === 'vendor') {
      return (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <FaShieldAlt className="text-3xl text-blue-400" />
            <h2 className="text-2xl font-bold">Vendor Privacy Policy</h2>
          </div>
          <p className="mb-6">
            This Privacy Policy describes how EventNet collects, uses, and discloses your information when you use our platform as a vendor.
          </p>
          
          <div className="bg-gray-700 p-6 rounded-lg my-8 border-l-4 border-blue-400">
            <div className="flex items-center gap-3 mb-4">
              <FaClipboardList className="text-2xl text-blue-400" />
              <h3 className="text-xl font-semibold">Information We Collect</h3>
            </div>
            <ul className="list-none pl-6 mb-6 space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Business information such as company name, address, and tax identification numbers</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Personal information of business representatives including name, email, phone number</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Event details and content you create on our platform</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Financial information for payment processing</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Analytics related to your events and attendee interactions</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-gray-700 p-6 rounded-lg my-8 border-l-4 border-purple-500">
            <div className="flex items-center gap-3 mb-4">
              <FaFileAlt className="text-2xl text-purple-500" />
              <h3 className="text-xl font-semibold">How We Use Your Information</h3>
            </div>
            <ul className="list-none pl-6 mb-6 space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">•</span>
                <span>Process payments and fulfill our contractual obligations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">•</span>
                <span>Provide analytics and insights about your events</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">•</span>
                <span>Improve our vendor tools and services</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">•</span>
                <span>Comply with legal obligations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">•</span>
                <span>Communicate important updates about our platform</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-gray-700 p-6 rounded-lg my-8 border-l-4 border-pink-500">
            <div className="flex items-center gap-3 mb-4">
              <FaDatabase className="text-2xl text-pink-500" />
              <h3 className="text-xl font-semibold">Data Retention</h3>
            </div>
            <p className="mb-4">
              We retain your information for as long as your account is active or as needed to provide services, 
              comply with legal obligations, resolve disputes, and enforce our agreements.
            </p>
          </div>
          
          <div className="bg-gray-700 p-6 rounded-lg my-8 border-l-4 border-blue-400">
            <div className="flex items-center gap-3 mb-4">
              <FaUserLock className="text-2xl text-blue-400" />
              <h3 className="text-xl font-semibold">Your Rights</h3>
            </div>
            <p className="mb-4">
              As a vendor, you have the right to access, correct, or delete your personal information. 
              You may also request a copy of the personal data we hold about you.
            </p>
          </div>
        </div>
      )
    } else {
      return (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <FaShieldAlt className="text-3xl text-blue-400" />
            <h2 className="text-2xl font-bold">User Privacy Policy</h2>
          </div>
          <p className="mb-6">
            This Privacy Policy describes how EventNet collects, uses, and discloses your information when you use our service as an attendee or event participant.
          </p>
          
          <div className="bg-gray-700 p-6 rounded-lg my-8 border-l-4 border-blue-400">
            <div className="flex items-center gap-3 mb-4">
              <FaClipboardList className="text-2xl text-blue-400" />
              <h3 className="text-xl font-semibold">Information We Collect</h3>
            </div>
            <ul className="list-none pl-6 mb-6 space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Personal information such as name, email address, and phone number</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Account information and profile details</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Transaction and payment information</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Event participation history</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span>Device information and usage data</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-gray-700 p-6 rounded-lg my-8 border-l-4 border-purple-500">
            <div className="flex items-center gap-3 mb-4">
              <FaFileAlt className="text-2xl text-purple-500" />
              <h3 className="text-xl font-semibold">How We Use Your Information</h3>
            </div>
            <ul className="list-none pl-6 mb-6 space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">•</span>
                <span>Provide access to events and process ticket purchases</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">•</span>
                <span>Personalize your experience and recommend events</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">•</span>
                <span>Communicate important information about events you've registered for</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">•</span>
                <span>Improve our services and develop new features</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500 mt-1">•</span>
                <span>Ensure the security of your account</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-gray-700 p-6 rounded-lg my-8 border-l-4 border-pink-500">
            <div className="flex items-center gap-3 mb-4">
              <FaDatabase className="text-2xl text-pink-500" />
              <h3 className="text-xl font-semibold">Sharing Your Information</h3>
            </div>
            <p className="mb-4">
              We share your information with event organizers for events you register for. 
              We may also share information with service providers who help us operate our platform.
            </p>
          </div>
          
          <div className="bg-gray-700 p-6 rounded-lg my-8 border-l-4 border-blue-400">
            <div className="flex items-center gap-3 mb-4">
              <FaUserLock className="text-2xl text-blue-400" />
              <h3 className="text-xl font-semibold">Your Choices</h3>
            </div>
            <p className="mb-4">
              You can update your account information at any time. You can also opt out of marketing communications
              while still receiving important updates about events you've registered for.
            </p>
          </div>
        </div>
      )
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Hero Section with Background Image */}
      <div className="w-full bg-cover bg-center h-96" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1557804506-669a67965ba0?ixlib=rb-1.2.1&auto=format&fit=crop&w=1567&q=80')" }}>
        <div className="w-full h-full flex items-center justify-center bg-black bg-opacity-60">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center px-4"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500">
              Privacy Policy
            </h1>
            <div className="flex justify-center mb-6">
              <FaShieldAlt className="text-4xl text-blue-400" />
            </div>
            <p className="text-xl text-gray-200 max-w-2xl mx-auto">
              We value your privacy and are committed to protecting your personal information
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
            {getPrivacyContent()}
            
            <div className="mt-12 pt-6 border-t border-gray-700">
              <p className="text-sm text-gray-400">
                Last updated: May 4, 2025
              </p>
              <p className="text-sm text-gray-400 mt-2">
                If you have any questions about this Privacy Policy, please contact us at privacy@eventnet.com
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
