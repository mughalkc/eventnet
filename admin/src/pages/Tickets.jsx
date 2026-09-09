import React, { useState, useEffect } from 'react';
import {
MagnifyingGlassIcon,
ArrowDownTrayIcon,
XMarkIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import toast from 'react-hot-toast';

const Tickets = () => {
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingTicket, setCreatingTicket] = useState(false);
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);

  const [newTicket, setNewTicket] = useState({
  event: '',
  user: '',
  ticketType: 'General',
  quantity: 1,
  totalAmount: ''
});
  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await axios.get('https://eventnet-production.up.railway.app/api/admin/tickets');
      setTickets(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to fetch tickets');
      setLoading(false);
    }
  };

  const fetchCreateTicketData = async () => {
  try {
    const [eventsResponse, usersResponse] = await Promise.all([
      axios.get('https://eventnet-production.up.railway.app/api/events'),
      axios.get('https://eventnet-production.up.railway.app/api/admin/users')
    ]);

    setEvents(Array.isArray(eventsResponse.data) ? eventsResponse.data : []);
    setUsers(Array.isArray(usersResponse.data) ? usersResponse.data : []);
  } catch (error) {
    console.error('Error fetching ticket form data:', error);
    toast.error('Failed to load events and users');
  }
};

const handleCreateTicket = async (e) => {
  e.preventDefault();

  if (!newTicket.event || !newTicket.user) {
    toast.error('Please select an event and user');
    return;
  }

  try {
    setCreatingTicket(true);

    await axios.post(
      'https://eventnet-production.up.railway.app/api/admin/tickets',
      {
        event: newTicket.event,
        user: newTicket.user,
        ticketType: newTicket.ticketType,
        quantity: Number(newTicket.quantity),
        totalAmount: Number(newTicket.totalAmount)
      }
    );

    toast.success('Ticket created successfully');

    setNewTicket({
      event: '',
      user: '',
      ticketType: 'General',
      quantity: 1,
      totalAmount: ''
    });

    setShowCreateModal(false);

    await fetchTickets();

  } catch (error) {
    console.error('Error creating ticket:', error);

    toast.error(
      error.response?.data?.message ||
      'Failed to create ticket'
    );
  } finally {
    setCreatingTicket(false);
  }
};

  const handleSearch = (e) => {
    setSearchText(e.target.value);
  };

  const handleStatusFilter = (e) => {
    setSelectedStatus(e.target.value);
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      (ticket.ticketId?.toLowerCase().includes(searchText.toLowerCase())) ||
      (ticket.event?.name?.toLowerCase().includes(searchText.toLowerCase())) ||
      (ticket.user?.name?.toLowerCase().includes(searchText.toLowerCase())) ||
      (ticket.user?.email?.toLowerCase().includes(searchText.toLowerCase()));
    
    const matchesStatus = selectedStatus === '' || ticket.status?.toLowerCase() === selectedStatus.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  const handleDownload = async (ticketId) => {
    try {
      setGenerating(true);
      const response = await axios.get(`https://eventnet-production.up.railway.app/api/admin/tickets/${ticketId}/download`, {
        responseType: 'blob'
      });
      
      // Create a blob URL for the PDF
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Ticket-${ticketId}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(url);
      setGenerating(false);
      toast.success('Ticket downloaded successfully');
    } catch (error) {
      console.error('Error downloading ticket:', error);
      toast.error('Failed to download ticket');
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Header Section */}
      <div className="border-b border-gray-200 pb-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-pink-500 text-transparent bg-clip-text">Ticket Management</h1>
            <p className="mt-1 text-sm text-gray-500">Manage and track event tickets</p>
          </div>
          <button
             onClick={() => {
            setShowCreateModal(true);
             fetchCreateTicketData();
                       }}
              className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow"
          >
               Create New Ticket
          </button>
        </div>
      </div>

      {/* Filters Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
        <div className="relative w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search tickets..."
            value={searchText}
            onChange={handleSearch}
            className="block w-full pl-10 pr-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={selectedStatus}
            onChange={handleStatusFilter}
            className="block w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
          >
            <option value="">Filter by status</option>
            <option value="paid">Paid</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="text-center p-8 text-gray-500">No tickets found</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ticket ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTickets.map((ticket) => (
                  <tr key={ticket._id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {ticket.ticketId || `#TICK${ticket._id.slice(-5)}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ticket.event?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ticket.user?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ticket.user?.email || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium 
                        ${ticket.status === 'completed' ? 'bg-green-100 text-green-800' : 
                          ticket.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 
                          'bg-red-100 text-red-800'}`}
                      >
                        {ticket.status ? ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1) : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ticket.quantity || 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      ${typeof ticket.price === 'number' ? ticket.price.toFixed(2) : '0.00'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button 
                        onClick={() => handleDownload(ticket.ticketId)}
                        disabled={generating}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ArrowDownTrayIcon className="h-3 w-3 mr-1" /> Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
            {/* Create Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Create New Ticket
              </h2>

              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={handleCreateTicket}
              className="p-6 space-y-4"
            >

              {/* Event */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event
                </label>

                <select
                  value={newTicket.event}
                  onChange={(e) =>
                    setNewTicket({
                      ...newTicket,
                      event: e.target.value
                    })
                  }
                  required
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Event</option>

                  {events.map((event) => (
                    <option
                      key={event._id}
                      value={event._id}
                    >
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* User */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  User
                </label>

                <select
                  value={newTicket.user}
                  onChange={(e) =>
                    setNewTicket({
                      ...newTicket,
                      user: e.target.value
                    })
                  }
                  required
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select User</option>

                  {users.map((user) => (
                    <option
                      key={user._id}
                      value={user._id}
                    >
                      {user.name} — {user.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ticket Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ticket Type
                </label>

                <input
                  type="text"
                  value={newTicket.ticketType}
                  onChange={(e) =>
                    setNewTicket({
                      ...newTicket,
                      ticketType: e.target.value
                    })
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. General, VIP"
                />
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>

                <input
                  type="number"
                  min="1"
                  value={newTicket.quantity}
                  onChange={(e) =>
                    setNewTicket({
                      ...newTicket,
                      quantity: e.target.value
                    })
                  }
                  required
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Total Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Amount
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newTicket.totalAmount}
                  onChange={(e) =>
                    setNewTicket({
                      ...newTicket,
                      totalAmount: e.target.value
                    })
                  }
                  required
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter amount"
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-4">

                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creatingTicket}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingTicket ? 'Creating...' : 'Create Ticket'}
                </button>

              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tickets;
