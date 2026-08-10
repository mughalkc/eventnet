import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  CalendarIcon,
  MapPinIcon,
  UserGroupIcon,
  ChartBarIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

export default function EventDetails() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [registrations, setRegistrations] = useState([]);
  const [insights, setInsights] = useState(null);

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  useEffect(() => {
    if (event) {
      fetchRegistrations();
      fetchInsights();
    }
  }, [event]);

  const fetchEventDetails = async () => {
    try {
      const response = await fetch(`https://eventnet-production.up.railway.app/api/admin/events/${eventId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch event details');
      const data = await response.json();
      setEvent(data);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to fetch event details');
    } finally {
      setLoading(false);
    }
  };

  const fetchRegistrations = async () => {
    try {
      const response = await fetch(`https://eventnet-production.up.railway.app/api/admin/events/${eventId}/registrations`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch registrations');
      const data = await response.json();
      setRegistrations(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchInsights = async () => {
    try {
      const response = await fetch(`https://eventnet-production.up.railway.app/api/admin/events/${eventId}/insights`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch insights');
      const data = await response.json();
      setInsights(data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`https://eventnet-production.up.railway.app/api/admin/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        toast.success('Event deleted successfully');
        navigate('/admin/events');
      } else {
        throw new Error('Failed to delete event');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to delete event');
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const response = await fetch(`https://eventnet-production.up.railway.app/api/admin/events/${eventId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (response.ok) {
        toast.success(`Event ${newStatus} successfully`);
        fetchEventDetails();
      } else {
        throw new Error(`Failed to ${newStatus} event`);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(`Failed to ${newStatus} event`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold mb-4">Event not found</h2>
        <button
          onClick={() => navigate('/admin/events')}
          className="text-blue-600 hover:text-blue-800"
        >
          Return to Events
        </button>
      </div>
    );
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'registrations':
        return (
          <div className="bg-white shadow rounded-lg mt-6 p-6">
            <h2 className="text-xl font-semibold mb-4">Event Registrations</h2>
            {registrations && registrations.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {registrations.map((registration) => (
                      <tr key={registration._id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {registration.user?.name || 'Unknown User'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {registration.user?.email || 'No email provided'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                            ${registration.status === 'confirmed' || registration.status === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : registration.status === 'pending' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : 'bg-red-100 text-red-800'}`}>
                            {registration.status || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {registration.createdAt ? new Date(registration.createdAt).toLocaleDateString() : 'Unknown date'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {registration.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleRegistrationAction(registration._id, 'approve')}
                                className="text-green-600 hover:text-green-900 mr-4"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRegistrationAction(registration._id, 'reject')}
                                className="text-red-600 hover:text-red-900"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {registration.status !== 'pending' && (
                            <span className="text-gray-400">No actions available</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto h-12 w-12 text-gray-400">
                  <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No registrations found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  This event doesn't have any registrations yet.
                </p>
              </div>
            )}
          </div>
        );
      case 'insights':
        return (
          <div className="bg-white shadow rounded-lg mt-6 p-6">
            <h2 className="text-xl font-semibold mb-4">Event Insights</h2>
            {insights ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-indigo-50 p-6 rounded-lg shadow-sm">
                  <h3 className="text-lg font-medium text-indigo-800 mb-2">Views</h3>
                  <p className="text-3xl font-bold text-indigo-600">{insights.views.toLocaleString()}</p>
                  <p className="text-sm text-indigo-600 mt-1">Total page views</p>
                </div>
                <div className="bg-emerald-50 p-6 rounded-lg shadow-sm">
                  <h3 className="text-lg font-medium text-emerald-800 mb-2">Registrations</h3>
                  <p className="text-3xl font-bold text-emerald-600">{insights.registrations.toLocaleString()}</p>
                  <p className="text-sm text-emerald-600 mt-1">Total registrations</p>
                </div>
                <div className="bg-purple-50 p-6 rounded-lg shadow-sm">
                  <h3 className="text-lg font-medium text-purple-800 mb-2">Revenue</h3>
                  <p className="text-3xl font-bold text-purple-600">
                    ${typeof insights.revenue === 'number' ? insights.revenue.toFixed(2) : '0.00'}
                  </p>
                  <p className="text-sm text-purple-600 mt-1">Total revenue</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="mx-auto h-12 w-12 text-gray-400">
                  <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No insights available</h3>
                <p className="mt-1 text-sm text-gray-500">
                  We're still collecting data for this event.
                </p>
              </div>
            )}
          </div>
        );
      default:
        return (
          <div className="bg-white shadow rounded-lg mt-6">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.name}</h1>
                  <div className="flex items-center text-gray-500 mb-4">
                    <CalendarIcon className="h-5 w-5 mr-2" />
                    <span>
                      {new Date(event.startDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                      {' '}
                      {event.startTime} - {event.endTime}
                    </span>
                  </div>
                  {event.location && (
                    <div className="flex items-center text-gray-500">
                      <MapPinIcon className="h-5 w-5 mr-2" />
                      <span>
                        {typeof event.location === 'object' 
                          ? (event.location.isVirtual ? 'Virtual Event' : event.location.address) 
                          : event.location || 'No location provided'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    event.status === 'published' ? 'bg-green-100 text-green-800' :
                    event.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {event.status}
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <h2 className="text-lg font-semibold mb-2">About this event</h2>
                <p className="text-gray-600 whitespace-pre-wrap">{event.description}</p>
              </div>

              <div className="mt-8">
                <h2 className="text-lg font-semibold mb-4">Event Settings</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-md font-medium mb-2">Registration Settings</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Capacity:</span>
                        <span>{event.capacity === 'limited' ? `${event.maxCapacity} spots` : 'Unlimited'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Approval Required:</span>
                        <span>{event.requireApproval ? 'Yes' : 'No'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-md font-medium mb-2">Pricing</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Price:</span>
                        <span>{event.price ? `$${event.price}` : 'Free'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Early Bird:</span>
                        <span>{event.earlyBirdPrice ? `$${event.earlyBirdPrice}` : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-pink-500 text-transparent bg-clip-text">
              Event Management
            </h1>
            <p className="mt-1 text-sm text-gray-500">Manage event details and settings</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/admin/events/${eventId}/edit`)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <PencilIcon className="h-5 w-5 mr-2" />
              Edit Event
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-500 hover:bg-red-600"
            >
              <TrashIcon className="h-5 w-5 mr-2" />
              Delete Event
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`${
                activeTab === 'overview'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('registrations')}
              className={`${
                activeTab === 'registrations'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Registrations
            </button>
            <button
              onClick={() => setActiveTab('insights')}
              className={`${
                activeTab === 'insights'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Insights
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {renderTabContent()}
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4">Delete Event</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this event? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleDelete();
                  setShowDeleteModal(false);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 