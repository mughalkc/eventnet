import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { UsersIcon, TicketIcon, CalendarIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'

const StatsCard = ({ title, value, icon: Icon }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <Icon className="h-8 w-8 text-indigo-600" />
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="text-2xl font-semibold text-gray-900">{value}</dd>
          </dl>
        </div>
      </div>
    </div>
  )
}

const Dashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingVendors: 0,
    activeEvents: 0,
    totalRevenue: 0
  })
  const [chartData, setChartData] = useState({
    monthlyRevenue: [],
    eventDistribution: [],
    userActivity: [],
    summaryStats: {
      totalRevenue: 0,
      totalEvents: 0,
      activeUsers: 0,
      ticketSales: 0
    }
  })

  // Track recent activities 
  const [recentActivities, setRecentActivities] = useState([])
  const [activitiesLoading, setActivitiesLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    fetchRecentActivities()
  }, [])

  const fetchRecentActivities = async () => {
    setActivitiesLoading(true);
    try {
      // Use the same fetch pattern as other admin components
      const response = await fetch('https://eventnet-production.up.railway.app/api/admin/recent-activities?limit=10', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch recent activities');
      }
      
      const data = await response.json();
      console.log('Fetched recent activities:', data);
      
      // Process timestamps into Date objects for easier formatting
      const activities = data.map(activity => ({
        ...activity,
        timestamp: new Date(activity.timestamp)
      }));
      
      setRecentActivities(activities);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      toast.error('Failed to fetch recent activities');
      setRecentActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch basic dashboard stats
      const statsResponse = await axios.get('https://eventnet-production.up.railway.app/api/admin/dashboard-stats')
      setStats(statsResponse.data)
      
      // Fetch events for distribution data
      const eventsResponse = await axios.get('https://eventnet-production.up.railway.app/api/admin/events')
      const events = eventsResponse.data
      
      // Fetch users for user activity
      const usersResponse = await axios.get('https://eventnet-production.up.railway.app/api/admin/users')
      const users = usersResponse.data

      // Process monthly revenue data
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const currentDate = new Date()
      const monthlyRevenueData = []
      
      // Create last 6 months of revenue data
      for (let i = 5; i >= 0; i--) {
        const month = new Date(currentDate)
        month.setMonth(currentDate.getMonth() - i)
        const monthName = monthNames[month.getMonth()]
        
        // Filter events by month and sum revenue
        const monthEvents = events.filter(event => {
          const eventDate = new Date(event.startDate)
          return eventDate.getMonth() === month.getMonth() && eventDate.getFullYear() === month.getFullYear()
        })
        
        const monthRevenue = monthEvents.reduce((sum, event) => {
          return sum + ((event.registrations?.length || 0) * (event.price || 0))
        }, 0)
        
        monthlyRevenueData.push({ month: monthName, revenue: monthRevenue })
      }
      
      // Process event distribution data
      const eventTypes = {}
      events.forEach(event => {
        const category = event.category || 'Other'
        if (!eventTypes[category]) {
          eventTypes[category] = 0
        }
        eventTypes[category]++
      })
      
      const eventDistributionData = Object.keys(eventTypes).map(key => ({
        name: key,
        value: eventTypes[key]
      }))
      
      // Process user activity data (last 5 days)
      const userActivityData = []
      for (let i = 4; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        const dateStr = `${date.getDate()}/${date.getMonth() + 1}`
        
        // Count users created on this date
        const dayUsers = users.filter(user => {
          if (!user.createdAt) return false
          const userDate = new Date(user.createdAt)
          return userDate.getDate() === date.getDate() && 
                 userDate.getMonth() === date.getMonth() && 
                 userDate.getFullYear() === date.getFullYear()
        }).length
        
        userActivityData.push({ date: dateStr, users: dayUsers })
      }
      
      // Calculate summary statistics
      const summaryStats = {
        totalRevenue: statsResponse.data.totalRevenue || 0,
        totalEvents: events.length,
        activeUsers: users.filter(user => user.status === 'active').length,
        ticketSales: events.reduce((sum, event) => sum + (event.attendees?.length || 0), 0)
      }
      
      // Update chart data state
      setChartData({
        monthlyRevenue: monthlyRevenueData,
        eventDistribution: eventDistributionData,
        userActivity: userActivityData,
        summaryStats
      })
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast.error('Failed to fetch dashboard statistics')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // In a real app, these would come from an API
  const statsData = [
    { title: 'Total Users', value: stats.totalUsers, icon: UsersIcon },
    { title: 'Pending Vendors', value: stats.pendingVendors, icon: UsersIcon },
    { title: 'Active Events', value: stats.activeEvents, icon: CalendarIcon },
    { title: 'Total Revenue', value: stats.totalRevenue, icon: CurrencyDollarIcon },
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[#4169E1] to-[#FF1493] text-transparent bg-clip-text">
            Admin Dashboard
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">Welcome, {user?.name}</span>
            <button
              onClick={handleLogout}
              className="bg-gray-900 text-white font-medium px-4 py-2 rounded-md hover:bg-gray-800 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        </div>
        <div className="mt-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {statsData.map((stat) => (
                <StatsCard key={stat.title} {...stat} />
              ))}
            </div>

            {/* Recent Activity Section */}
            <div className="mt-8">
              <h2 className="text-lg font-medium text-gray-900">Recent Activity</h2>
              <div className="mt-4 bg-white shadow rounded-lg p-6">
                {activitiesLoading ? (
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : recentActivities.length === 0 ? (
                  <p className="text-gray-500">No recent activity</p>
                ) : (
                  <div className="flow-root">
                    <ul className="-mb-8">
                      {recentActivities.map((activity, activityIdx) => (
                        <li key={activity.id}>
                          <div className="relative pb-8">
                            {activityIdx !== recentActivities.length - 1 ? (
                              <span
                                className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200"
                                aria-hidden="true"
                              />
                            ) : null}
                            <div className="relative flex items-start space-x-3">
                              <div className="relative">
                                <div className={
                                  `h-10 w-10 rounded-full flex items-center justify-center ring-8 ring-white ${
                                    activity.type === 'user_registration' ? 'bg-blue-500' :
                                    activity.type === 'vendor_approval' ? 'bg-green-500' :
                                    activity.type === 'new_event' ? 'bg-purple-500' :
                                    activity.type === 'payment' ? 'bg-yellow-500' :
                                    'bg-gray-500'
                                  }`
                                }>
                                  <span className="text-white text-sm font-medium">
                                    {activity.type === 'user_registration' ? 'U' :
                                     activity.type === 'vendor_approval' ? 'V' :
                                     activity.type === 'new_event' ? 'E' :
                                     activity.type === 'payment' ? 'P' : 'A'}
                                  </span>
                                </div>
                              </div>
                              <div className="min-w-0 flex-1">
                                <div>
                                  <div className="text-sm">
                                    <a href="#" className="font-medium text-gray-900">
                                      {activity.user}
                                    </a>
                                  </div>
                                  <p className="mt-0.5 text-sm text-gray-500">
                                    {activity.timestamp.toLocaleString()}
                                  </p>
                                </div>
                                <div className="mt-2 text-sm text-gray-700">
                                  {/* Show detail text based on activity type */}
                                  {activity.type === 'user_registration' && (
                                    <p>Registered a new account with email {activity.email}</p>
                                  )}
                                  {activity.type.startsWith('vendor_') && (
                                    <p>{activity.details || `Vendor ${activity.type.replace('vendor_', '')}: ${activity.email}`}</p>
                                  )}
                                  {activity.type === 'new_event' && (
                                    <p>Created a new event titled "{activity.title}"</p>
                                  )}
                                  {activity.type === 'payment' && (
                                    <p>{activity.details || `Made a payment of $${activity.amount} for ${activity.eventName}`}</p>
                                  )}
                                  {!['user_registration', 'new_event', 'payment'].includes(activity.type) && 
                                   !activity.type.startsWith('vendor_') && activity.details && (
                                    <p>{activity.details}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Reports Section */}
            <div className="mt-8">
              <h2 className="text-lg font-medium text-gray-900">Analytics & Reports</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
                {/* Monthly Revenue Chart */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-md font-medium text-gray-800 mb-4">Monthly Revenue</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData.monthlyRevenue}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => `$${value}`} />
                        <Legend />
                        <Bar dataKey="revenue" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Event Distribution */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-md font-medium text-gray-800 mb-4">Event Distribution</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={chartData.eventDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chartData.eventDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042'][index % 4]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* User Activity */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-md font-medium text-gray-800 mb-4">User Activity</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData.userActivity}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="users" stroke="#8884d8" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-md font-medium text-gray-800 mb-4">Summary Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600 font-medium">Total Revenue</p>
                      <p className="text-2xl font-bold text-blue-800">${chartData.summaryStats.totalRevenue.toLocaleString()}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-600 font-medium">Total Events</p>
                      <p className="text-2xl font-bold text-green-800">{chartData.summaryStats.totalEvents}</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-purple-600 font-medium">Active Users</p>
                      <p className="text-2xl font-bold text-purple-800">{chartData.summaryStats.activeUsers}</p>
                    </div>
                    <div className="p-4 bg-pink-50 rounded-lg">
                      <p className="text-sm text-pink-600 font-medium">Ticket Sales</p>
                      <p className="text-2xl font-bold text-pink-800">{chartData.summaryStats.ticketSales}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Dashboard 