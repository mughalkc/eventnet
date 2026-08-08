import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { CheckIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const Vendors = () => {
  const { user } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchVendors();
    }
  }, [user]);

  const fetchVendors = async () => {
    try {
      setError(null);
      setLoading(true);
      
      // Fetch all vendors
      const response = await fetch('http://${window.location.hostname}:5001/api/admin/vendors', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch vendors');
      
      const data = await response.json();
      console.log('Fetched vendors:', data);
      
      // Fetch event counts for each vendor
      const eventCounts = await fetchEventCounts(data.map(v => v._id));
      
      // Combine vendor data with event counts
      const vendorsWithCounts = data.map(vendor => ({
        ...vendor,
        eventCount: eventCounts[vendor._id] || 0
      }));
      
      setVendors(vendorsWithCounts);
    } catch (error) {
      console.error('Error fetching vendors:', error);
      setError(error.message);
      toast.error('Failed to fetch vendors');
    } finally {
      setLoading(false);
    }
  };

  const fetchEventCounts = async (vendorIds) => {
    try {
      const response = await fetch('http://${window.location.hostname}:5001/api/admin/vendors/event-counts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ vendorIds })
      });
      
      if (!response.ok) throw new Error('Failed to fetch event counts');
      return await response.json();
    } catch (error) {
      console.error('Error fetching event counts:', error);
      return {};
    }
  };

  const handleSearch = (e) => {
    setSearchText(e.target.value);
  };

  const handleStatusFilter = (e) => {
    setSelectedStatus(e.target.value);
  };

  const handleStatusUpdate = async (vendor, newStatus) => {
    try {
      const response = await fetch(`http://${window.location.hostname}:5001/api/admin/vendors/${vendor._id}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update vendor status');
      
      // Refresh the vendor list
      await fetchVendors();
      toast.success(`Vendor status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating vendor status:', error);
      toast.error(error.response?.data?.message || 'Failed to update vendor status');
    }
  };

  const filteredVendors = vendors.filter(vendor => {
    const businessName = vendor.businessName || vendor.name || '';
    const contactEmail = vendor.contactEmail || vendor.email || '';
    const matchesSearch = businessName.toLowerCase().includes(searchText.toLowerCase()) ||
                         contactEmail.toLowerCase().includes(searchText.toLowerCase());
    const matchesStatus = !selectedStatus || vendor.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-600 font-bold">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/30 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
          <p className="mt-1 text-sm text-gray-500">Manage vendor approvals and status</p>
        </div>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchText}
              onChange={handleSearch}
              className="block w-full pl-10 pr-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500"
            />
          </div>
          <select
            value={selectedStatus}
            onChange={handleStatusFilter}
            className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Vendors Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Business Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Events
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVendors.map((vendor) => (
                <tr key={vendor._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{vendor.businessName || vendor.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{vendor.contactEmail || vendor.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{vendor.contactPhone || vendor.phoneNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${vendor.status === 'approved' ? 'bg-green-100 text-green-800' : 
                        vendor.status === 'rejected' ? 'bg-red-100 text-red-800' : 
                        'bg-yellow-100 text-yellow-800'}`}>
                      {vendor.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-semibold">{vendor.eventCount}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {vendor.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(vendor, 'approved')}
                          className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-xs font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow mr-2"
                        >
                          <CheckIcon className="h-4 w-4 mr-1" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(vendor, 'rejected')}
                          className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow"
                        >
                          <XMarkIcon className="h-4 w-4 mr-1" />
                          Reject
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Vendors; 