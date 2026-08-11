import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getEventsLink = () => {
    if (!user) return '/events';
    if (user.role === 'vendor') {
      return '/vendor-dashboard/events';
    }
    return '/events'; // For regular users, this is the explore page
  };

  const getDashboardLink = () => {
    if (!user) return null;
    if (user.role === 'vendor') {
      return '/vendor-dashboard';
    }
    return null;
  };

  const isActivePath = (path) => {
    if (path === '/vendor-dashboard/events') {
      return location.pathname.startsWith('/vendor-dashboard/events');
    }
    return location.pathname === path;
  };

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-12">
            {/* Logo */}
            <Link to="/" className="flex items-center">
              <span className="text-2xl font-bold">
                <span className="text-[#4169E1]">Event</span>
                <span className="text-[#FF1493]">Net</span>
              </span>
            </Link>

            {/* Navigation Links */}
            <div className="hidden sm:flex sm:space-x-8">
              <Link
                to={getEventsLink()}
                className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                  isActivePath(getEventsLink())
                    ? 'text-[#4169E1] border-b-2 border-[#4169E1]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {user?.role === 'vendor' ? 'My Events' : 'Explore'}
              </Link>
              {user && user.role === 'user' && (
                <Link
                  to="/my-events"
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                    isActivePath('/my-events')
                      ? 'text-[#4169E1] border-b-2 border-[#4169E1]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  My Events
                </Link>
              )}
              {user && user.role === 'user' && (
                <Link
                  to="/my-tickets"
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                    isActivePath('/my-tickets')
                      ? 'text-[#4169E1] border-b-2 border-[#4169E1]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  My Tickets
                </Link>
              )}
              {user && user.role === 'user' && (
                <Link
                  to="/payments"
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                    isActivePath('/payments')
                      ? 'text-[#4169E1] border-b-2 border-[#4169E1]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Payments
                </Link>
              )}
              {user && user.role === 'vendor' && (
                <Link
                  to="/vendor-dashboard/revenue"
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                    isActivePath('/vendor-dashboard/revenue')
                      ? 'text-[#4169E1] border-b-2 border-[#4169E1]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Revenue
                </Link>
              )}
              {user && getDashboardLink() && (
                <Link
                  to={getDashboardLink()}
                  className={`inline-flex items-center px-1 pt-1 text-sm font-medium ${
                    isActivePath(getDashboardLink())
                      ? 'text-[#4169E1] border-b-2 border-[#4169E1]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Dashboard
                </Link>
              )}
            </div>
          </div>

          {/* Right side - Profile/Auth */}
          <div className="flex items-center">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center space-x-2 focus:outline-none"
                >
                  <div className="h-9 w-9 rounded-full bg-gradient-to-r from-[#4169E1] to-[#FF1493] flex items-center justify-center text-white text-lg font-medium overflow-hidden">
                    {user && user.photo && user.photo.startsWith('/uploads') ? (
                      <img 
                        src={`https://eventnet-production.up.railway.app${user.photo}`} 
                        alt="Profile" 
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          console.log('Image load error:', e);
                          e.target.style.display = 'none';
                          e.target.parentNode.textContent = (user && user.name) ? user.name.charAt(0).toUpperCase() : 'U';
                        }}
                      />
                    ) : (
                      (user && user.name) ? user.name.charAt(0).toUpperCase() : 'U'
                    )}
                  </div>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isProfileOpen ? 'transform rotate-180' : ''}`} 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                </button>

                {/* Profile Dropdown */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      Profile
                    </Link>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsProfileOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-x-4">
                <Link
                  to="/login"
                  className="text-gray-500 hover:text-gray-700"
                >
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="bg-gradient-to-r from-[#4169E1] to-[#FF1493] text-white px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
                >
                  Sign up
                </Link>
                <Link
                  to="/vendor/register"
                  className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
                >
                  Vendor Registration
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 