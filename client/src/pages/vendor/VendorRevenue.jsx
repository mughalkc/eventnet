import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../../context/ThemeContext'
import { toast } from 'react-hot-toast'
import { CurrencyDollarIcon, TicketIcon, CalendarIcon, CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'

const VendorRevenue = () => {
  const { themeColors } = useTheme()
  const [loading, setLoading] = useState(true)
  const [revenue, setRevenue] = useState([])
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pendingRevenue: 0,
    paidRevenue: 0,
    totalTickets: 0
  })
  const [filter, setFilter] = useState('all') // all, pending, paid
  const [timeRange, setTimeRange] = useState('all') // all, month, week
  const [activeTab, setActiveTab] = useState('overview') // overview, transactions

  useEffect(() => {
    fetchRevenue()
  }, [])

  const fetchRevenue = async () => {
    try {
      setLoading(true)
      
      // First fetch revenue data
      const revenueResponse = await fetch('http://${window.location.hostname}:5001/api/vendor/revenue', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (!revenueResponse.ok) {
        throw new Error('Failed to fetch revenue data')
      }
      
      const revenueData = await revenueResponse.json()
      setRevenue(revenueData.revenue)
      
      // Next fetch all events to count total registrations
      const eventsResponse = await fetch('http://${window.location.hostname}:5001/api/vendor/events', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (!eventsResponse.ok) {
        throw new Error('Failed to fetch events data')
      }
      
      const eventsData = await eventsResponse.json()
      
      // Count total registrations across all events
      let totalRegistrations = 0
      eventsData.forEach(event => {
        if (event.attendees && Array.isArray(event.attendees)) {
          totalRegistrations += event.attendees.length
        }
      })
      
      console.log('Total registrations found:', totalRegistrations)
      
      // Calculate revenue statistics
      const totalRevenue = revenueData.revenue.reduce((sum, item) => sum + item.amount, 0)
      const pendingRevenue = revenueData.revenue.filter(item => item.status === 'pending').reduce((sum, item) => sum + item.amount, 0)
      const paidRevenue = revenueData.revenue.filter(item => item.status === 'paid').reduce((sum, item) => sum + item.amount, 0)
      
      setStats({
        totalRevenue,
        pendingRevenue,
        paidRevenue,
        totalTickets: totalRegistrations
      })
    } catch (error) {
      console.error('Fetch revenue error:', error)
      toast.error('An error occurred while fetching revenue data')
    } finally {
      setLoading(false)
    }
  }

  const getFilteredRevenue = () => {
    let filtered = [...revenue]
    
    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(item => item.status === filter)
    }
    
    // Apply time range filter
    if (timeRange !== 'all') {
      const now = new Date()
      const cutoffDate = new Date()
      
      if (timeRange === 'week') {
        cutoffDate.setDate(now.getDate() - 7)
      } else if (timeRange === 'month') {
        cutoffDate.setMonth(now.getMonth() - 1)
      }
      
      filtered = filtered.filter(item => new Date(item.createdAt) >= cutoffDate)
    }
    
    return filtered
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }
  
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown Date'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const filteredRevenue = getFilteredRevenue()

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="container mx-auto px-4 py-8"
    >
      <div className="flex justify-between items-center mb-6">
        <h1 className={`text-2xl font-bold ${themeColors.text}`}>Revenue Dashboard</h1>
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'overview' 
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' 
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'transactions' 
              ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm' 
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
          >
            Transactions
          </button>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className={`p-6 rounded-lg shadow-sm ${themeColors.cardBg} border ${themeColors.cardBorder} transition-all hover:shadow-md`}>
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900 mr-4">
              <CurrencyDollarIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className={`text-sm font-medium ${themeColors.textSecondary}`}>Total Revenue</p>
              <p className={`text-xl font-bold ${themeColors.text}`}>{formatCurrency(stats.totalRevenue)}</p>
            </div>
          </div>
        </div>
        
        <div className={`p-6 rounded-lg shadow-sm ${themeColors.cardBg} border ${themeColors.cardBorder} transition-all hover:shadow-md`}>
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900 mr-4">
              <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className={`text-sm font-medium ${themeColors.textSecondary}`}>Paid Revenue</p>
              <p className={`text-xl font-bold ${themeColors.text}`}>{formatCurrency(stats.paidRevenue)}</p>
            </div>
          </div>
        </div>
        
        <div className={`p-6 rounded-lg shadow-sm ${themeColors.cardBg} border ${themeColors.cardBorder} transition-all hover:shadow-md`}>
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900 mr-4">
              <TicketIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className={`text-sm font-medium ${themeColors.textSecondary}`}>Total Tickets Sold</p>
              <p className={`text-xl font-bold ${themeColors.text}`}>{stats.totalTickets || 0}</p>
            </div>
          </div>
        </div>
      </div>
      
      {activeTab === 'overview' ? (
        <div className={`p-6 rounded-lg shadow-sm ${themeColors.cardBg} border ${themeColors.cardBorder}`}>
          <h2 className={`text-xl font-semibold ${themeColors.text} mb-4`}>Revenue Overview</h2>
          <p className={`${themeColors.textSecondary} mb-4`}>This dashboard provides an overview of your revenue from ticket sales. You can view your total revenue, ticket sales counts, and completed transactions.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <h3 className={`text-lg font-medium ${themeColors.text} mb-2`}>Revenue Breakdown</h3>
              <div className="mt-2 space-y-3">
                <div className="flex justify-between items-center">
                  <span className={`${themeColors.textSecondary}`}>Total Revenue</span>
                  <span className={`font-medium ${themeColors.text}`}>{formatCurrency(stats.totalRevenue || 0)}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-4">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '100%' }}></div>
                </div>
                
                <div className="flex justify-between items-center mt-4">
                  <span className={`${themeColors.textSecondary}`}>Paid Revenue</span>
                  <span className={`font-medium ${themeColors.text}`}>{formatCurrency(stats.paidRevenue || 0)}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div className="bg-green-500 h-2.5 rounded-full" style={{ width: `${stats.totalRevenue ? (stats.paidRevenue / stats.totalRevenue) * 100 : 0}%` }}></div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className={`text-lg font-medium ${themeColors.text} mb-2`}>Quick Actions</h3>
              <div className="space-y-4">
                <div className={`p-4 rounded-lg border ${themeColors.cardBorder} ${themeColors.cardBg} hover:shadow-md transition-shadow`}>
                  <h4 className={`font-medium ${themeColors.text}`}>Create New Event</h4>
                  <p className={`text-sm ${themeColors.textSecondary} mt-1`}>Create a new event with ticketing options to generate more revenue.</p>
                  <button 
                    onClick={() => window.location.href = '/vendor-dashboard/events/create'}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Create Event
                  </button>
                </div>
                
                <div className={`p-4 rounded-lg border ${themeColors.cardBorder} ${themeColors.cardBg} hover:shadow-md transition-shadow`}>
                  <h4 className={`font-medium ${themeColors.text}`}>View All Events</h4>
                  <p className={`text-sm ${themeColors.textSecondary} mt-1`}>Manage your existing events and their ticket sales.</p>
                  <button 
                    onClick={() => window.location.href = '/vendor-dashboard/events'}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                  >
                    View Events
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div>
              <label className={`block text-sm font-medium ${themeColors.textSecondary} mb-1`}>Status</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className={`rounded-md border ${themeColors.inputBorder} ${themeColors.inputBg} ${themeColors.text} py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500`}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            
            <div>
              <label className={`block text-sm font-medium ${themeColors.textSecondary} mb-1`}>Time Range</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className={`rounded-md border ${themeColors.inputBorder} ${themeColors.inputBg} ${themeColors.text} py-2 px-3 text-sm focus:ring-blue-500 focus:border-blue-500`}
              >
                <option value="all">All Time</option>
                <option value="month">Last Month</option>
                <option value="week">Last Week</option>
              </select>
            </div>
          </div>
          
          {/* Revenue Table */}
          <div className={`bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden border ${themeColors.cardBorder}`}>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Event</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ticket</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Quantity</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Fee</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Net Amount</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                        </div>
                      </td>
                    </tr>
                  ) : filteredRevenue.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                        No revenue data found
                      </td>
                    </tr>
                  ) : (
                    filteredRevenue.map((item, index) => (
                      <tr key={index} className={`${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'} hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{item.event?.name || 'Unknown Event'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{item.ticket?.name || 'Unknown Ticket'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{item.quantity}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{formatCurrency(item.amount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{formatCurrency(item.fee)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{formatCurrency(item.netAmount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${item.status === 'paid' 
                            ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100'}`}>
                            {item.status === 'paid' ? 'Paid' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </motion.div>
  )
}

export default VendorRevenue
