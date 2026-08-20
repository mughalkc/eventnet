import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import FloatingChatbot from './components/FloatingChatbot'
import Home from './pages/Home'
import Login from './pages/Login'
import RegisterUser from './pages/RegisterUser'
import CreateEvent from './pages/CreateEvent'
import EventDetails from './pages/EventDetails'
import EventList from './pages/EventList'
import UserEvents from './pages/UserEvents'
import MyTickets from './pages/MyTickets'
import VendorDashboard from './pages/vendor/VendorDashboard'
import VendorEvents from './pages/vendor/VendorEvents'
import VendorRegistration from './pages/vendor/VendorRegistration'
import VendorRegistrations from './pages/vendor/VendorRegistrations'
import VendorRevenue from './pages/vendor/VendorRevenue'
import VendorQRCodes from './pages/vendor/VendorQRCodes'
import PaymentPage from './pages/PaymentPage'
import Profile from './pages/Profile'
import RegisterOrganizer from './pages/RegisterOrganizer'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" />
  }

  return children
}

function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#333',
            color: '#fff',
          },
        }}
      />
      <Navbar />
      <main className="min-h-screen w-full overflow-x-hidden bg-gray-50">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<RegisterUser />} />
          <Route path="/register-organizer" element={<RegisterOrganizer />} />
          <Route path="/events" element={<EventList />} />
          <Route path="/events/:eventId" element={<EventDetails />} />
          <Route path="/events/:eventId/checkout" element={<PaymentPage />} />
          <Route path="/payment/:eventId" element={<PaymentPage />} />
          <Route path="/vendor/register" element={<VendorRegistration />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          
          {/* Protected Vendor Routes */}
          <Route
            path="/vendor-dashboard/*"
            element={
              <ProtectedRoute allowedRoles={['vendor']}>
                <Routes>
                  <Route index element={<VendorDashboard />} />
                  <Route path="events" element={<VendorEvents />} />
                  <Route path="events/create" element={<CreateEvent />} />
                  <Route path="events/:eventId" element={<EventDetails />} />
                  <Route path="events/:eventId/edit" element={<CreateEvent />} />
                  <Route path="registrations" element={<VendorRegistrations />} />
                  <Route path="revenue" element={<VendorRevenue />} />
                  <Route path="qr-codes" element={<VendorQRCodes />} />
                </Routes>
              </ProtectedRoute>
            }
          />

          {/* Protected User Routes */}
          <Route
            path="/my-events"
            element={
              <ProtectedRoute allowedRoles={['user']}>
                <UserEvents />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-tickets"
            element={
              <ProtectedRoute allowedRoles={['user']}>
                <MyTickets />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments"
            element={
              <ProtectedRoute allowedRoles={['user']}>
                <PaymentPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
      <Footer />
      <FloatingChatbot />
    </AuthProvider>
  )
}

export default App
