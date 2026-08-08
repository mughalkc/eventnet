import { ChartBarIcon, UserGroupIcon, TicketIcon, CalendarIcon } from '@heroicons/react/24/outline'

const stats = [
  { name: 'Total Events', value: '24', icon: CalendarIcon },
  { name: 'Total Users', value: '1,234', icon: UserGroupIcon },
  { name: 'Total Tickets Sold', value: '5,678', icon: TicketIcon },
  { name: 'Revenue', value: '$12,345', icon: ChartBarIcon },
]

const AdminDashboard = () => {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.name}
            className="relative overflow-hidden rounded-lg bg-white px-4 pt-5 pb-12 shadow sm:px-6 sm:pt-6"
          >
            <dt>
              <div className="absolute rounded-md bg-indigo-500 p-3">
                <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <p className="ml-16 truncate text-sm font-medium text-gray-500">{item.name}</p>
            </dt>
            <dd className="ml-16 flex items-baseline pb-6 sm:pb-7">
              <p className="text-2xl font-semibold text-gray-900">{item.value}</p>
            </dd>
          </div>
        ))}
      </div>
    </div>
  )
}

export default AdminDashboard 