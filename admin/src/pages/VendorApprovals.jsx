import { useEffect, useState } from 'react'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import axios from 'axios'
import { toast } from 'react-hot-toast'

const API_BASE = 'https://eventnet-production.up.railway.app/api/admin/vendors'

const VendorApprovals = () => {
  const [pendingVendors, setPendingVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [selectedVendor, setSelectedVendor] = useState(null)
  const [modalType, setModalType] = useState(null)

  useEffect(() => {
    fetchPendingVendors()
  }, [])

  const fetchPendingVendors = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await axios.get(`${API_BASE}/pending`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        }
      })
      console.log('Fetched pending vendors:', res.data)
      setPendingVendors(res.data)
    } catch (err) {
      console.error('Error fetching pending vendors:', err)
      setError('Failed to fetch pending vendors.')
      toast.error('Failed to fetch pending vendors')
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (vendor, type) => {
    setSelectedVendor(vendor)
    setModalType(type)
  }

  const confirmAction = async () => {
    if (!selectedVendor) return
    setActionLoading(true)
    try {
      const response = await axios.put(
        `${API_BASE}/${selectedVendor._id}/status`,
        { status: modalType === 'approve' ? 'approved' : 'rejected' },
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          }
        }
      )
      
      if (response.data) {
        await fetchPendingVendors()
        toast.success(`Vendor ${modalType === 'approve' ? 'approved' : 'rejected'} successfully`)
      } else {
        throw new Error('No response data received')
      }
    } catch (err) {
      console.error('Error updating vendor status:', err)
      setError('Failed to update vendor status.')
      toast.error(err.response?.data?.message || 'Failed to update vendor status')
    } finally {
      setActionLoading(false)
      setSelectedVendor(null)
      setModalType(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Header Section */}
      <div className="border-b border-gray-200 pb-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-pink-500 text-transparent bg-clip-text">Vendor Approvals</h1>
            <p className="mt-1 text-sm text-gray-500">Review and approve vendor applications</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-500">{error}</div>
          ) : pendingVendors.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No pending vendors.</div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Business Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Applied Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingVendors.map((vendor) => (
                  <tr key={vendor._id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{vendor.businessName || vendor.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{vendor.contactEmail || vendor.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{vendor.contactPhone || vendor.phoneNumber}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(vendor.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleAction(vendor, 'approve')}
                        className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-xs font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow mr-2"
                      >
                        <CheckIcon className="h-4 w-4 mr-1" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(vendor, 'reject')}
                        className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow"
                      >
                        <XMarkIcon className="h-4 w-4 mr-1" />
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal for Approve/Reject Confirmation */}
      {modalType && selectedVendor && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 bg-gradient-to-r from-blue-600 to-pink-500 text-transparent bg-clip-text">
              {modalType === 'approve' ? 'Approve Vendor' : 'Reject Vendor'}
            </h2>
            <p className="mb-6 text-gray-600">
              Are you sure you want to {modalType} <b>{selectedVendor.businessName || selectedVendor.name}</b>?
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setModalType(null)
                  setSelectedVendor(null)
                }}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors duration-200"
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                onClick={confirmAction}
                className={`px-4 py-2 rounded-lg text-white transition-all duration-200 ${
                  modalType === 'approve'
                    ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                    : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                }`}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : modalType === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VendorApprovals 