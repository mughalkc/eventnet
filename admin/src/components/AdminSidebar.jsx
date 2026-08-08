import { Link, useLocation } from 'react-router-dom'
import {
  CalendarIcon,
  UserGroupIcon,
  TicketIcon,
  ChartBarIcon,
  CogIcon,
  BuildingStorefrontIcon,
  ShieldCheckIcon,
  UserCircleIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: ChartBarIcon },
  { name: 'Events', href: '/admin/events', icon: CalendarIcon },
  { name: 'Users', href: '/admin/users', icon: UserGroupIcon },
  { name: 'Vendors', href: '/admin/vendors', icon: BuildingStorefrontIcon },
  { name: 'Vendor Approvals', href: '/admin/vendor-approvals', icon: ShieldCheckIcon },
  { name: 'User Management', href: '/admin/user-management', icon: UserCircleIcon },
  { name: 'Tickets', href: '/admin/tickets', icon: TicketIcon },
  // { name: 'Reports', href: '/admin/reports', icon: ClipboardDocumentCheckIcon },
  // { name: 'Settings', href: '/admin/settings', icon: CogIcon },
]

const AdminSidebar = () => {
  const location = useLocation()

  return (
    <div className="w-64 bg-white shadow-lg h-screen fixed left-0 top-0 border-r border-gray-200">
      <div className="h-full px-3 py-4">
        <div className="mb-8 px-2">
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-pink-500 text-transparent bg-clip-text">Admin Panel</h2>
        </div>
        <nav className="space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-50 to-pink-50 text-blue-600 shadow-sm'
                    : 'text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900'
                }`}
              >
                <item.icon
                  className={`mr-3 h-5 w-5 transition-colors duration-200 ${
                    isActive ? 'text-blue-600' : 'text-gray-500 group-hover:text-gray-700'
                  }`}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

export default AdminSidebar 