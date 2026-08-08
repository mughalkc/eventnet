import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

const API_BASE_URL = 'http://${window.location.hostname}:5001/api';

const VendorDashboard = () => {
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [servicesRes, eventsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/vendor/services`),
          fetch(`${API_BASE_URL}/vendor/events`)
        ]);
        const servicesData = await servicesRes.json();
        const eventsData = await eventsRes.json();
        setServices(servicesData);
        setEvents(eventsData);
      } catch (error) {
        console.error('Dashboard error:', error);
        toast.error('Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleServiceStatus = async (serviceId, status) => {
    try {
      const response = await fetch(`${API_BASE_URL}/vendor/services/${serviceId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        toast.success('Service status updated successfully');
        setServices(services.map(service =>
          service._id === serviceId ? { ...service, status } : service
        ));
      }
    } catch (error) {
      toast.error('Failed to update service status');
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Vendor Dashboard</h1>

      {/* Services Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">My Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map(service => (
            <div key={service._id} className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-2">{service.name}</h3>
              <p className="text-gray-600 mb-4">{service.description}</p>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">${service.price}</span>
                <select
                  value={service.status}
                  onChange={(e) => handleServiceStatus(service._id, e.target.value)}
                  className="border rounded px-2 py-1"
                >
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Events Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Assigned Events</h2>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {events.map(event => (
                <tr key={event._id}>
                  <td className="px-6 py-4 whitespace-nowrap">{event.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(event.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      event.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      event.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {event.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button className="text-blue-600 hover:text-blue-800 mr-4">View Details</button>
                    <button className="text-green-600 hover:text-green-800">Accept</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default VendorDashboard; 