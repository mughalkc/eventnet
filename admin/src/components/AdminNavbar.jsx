import { BellIcon, UserCircleIcon } from '@heroicons/react/24/outline'

const AdminNavbar = () => {
  return (
    <nav className="bg-white shadow-sm fixed top-0 right-0 left-64 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold text-gray-800">Admin Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            {/* <button
              type="button"
              className="p-1 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <span className="sr-only">View notifications</span>
              <BellIcon className="h-6 w-6" aria-hidden="true" />
            </button> */}
            <div className="flex items-center space-x-2">
              <UserCircleIcon className="h-8 w-8 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Admin User</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default AdminNavbar 