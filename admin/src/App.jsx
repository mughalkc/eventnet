import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import { AuthProvider, useAuth } from './context/AuthContext'
import AdminLayout from './layouts/AdminLayout'

// Import other pages (create these files if they don't exist)
import Events from './pages/Events'
import EventDetails from './pages/EventDetails'
import Users from './pages/Users'
import Vendors from './pages/Vendors'
import VendorApprovals from './pages/VendorApprovals'
import UserManagement from './pages/UserManagement'
import Tickets from './pages/Tickets'
import Reports from './pages/Reports'
import Settings from './pages/Settings'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!user || user.role !== 'admin') {
    return <Navigate to="/login" />
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
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="events" element={<Events />} />
          <Route path="events/:eventId" element={<EventDetails />} />
          <Route path="users" element={<Users />} />
          <Route path="vendors" element={<Vendors />} />
          <Route path="vendor-approvals" element={<VendorApprovals />} />
          <Route path="user-management" element={<UserManagement />} />
          <Route path="tickets" element={<Tickets />} />
          <Route path="reports" element={<Reports />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="/" element={<Navigate to="/admin" />} />
      </Routes>
    </AuthProvider>
  )
}

export default App
