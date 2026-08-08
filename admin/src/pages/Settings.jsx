import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';
import { PhotoIcon } from '@heroicons/react/24/outline';

const Settings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  const [formValues, setFormValues] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    // Initialize form with user data when component mounts
    if (user) {
      setFormValues(prev => ({
        ...prev,
        name: user.name || '',
        email: user.email || ''
      }));
      
      // Set profile image if user has one
      if (user.avatar) {
        setImagePreview(user.avatar.startsWith('http') 
          ? user.avatar 
          : `http://${window.location.hostname}:5001/${user.avatar}`);
      }
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormValues({
      ...formValues,
      [name]: type === 'checkbox' ? checked : value
    });
  };
  
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const loadingToast = toast.loading('Updating profile...');
      
      // Validate password fields if attempting to change password
      if (formValues.newPassword) {
        if (formValues.newPassword !== formValues.confirmPassword) {
          toast.dismiss(loadingToast);
          toast.error('New passwords do not match');
          setLoading(false);
          return;
        }
        
        if (!formValues.currentPassword) {
          toast.dismiss(loadingToast);
          toast.error('Current password is required to set a new password');
          setLoading(false);
          return;
        }
      }
      
      // Update user profile
      const profileData = {
        name: formValues.name,
        email: formValues.email
      };
      
      if (formValues.newPassword && formValues.currentPassword) {
        profileData.currentPassword = formValues.currentPassword;
        profileData.newPassword = formValues.newPassword;
      }
      
      // First, update profile data
      await axios.put('http://${window.location.hostname}:5001/api/admin/profile', profileData);
      
      // Then, if there's a new image, upload it
      if (profileImage) {
        const formData = new FormData();
        formData.append('avatar', profileImage);
        
        await axios.post('http://${window.location.hostname}:5001/api/admin/profile/avatar', formData);
      }
      
      toast.dismiss(loadingToast);
      toast.success('Profile updated successfully');
      
      // Clear password fields after successful update
      setFormValues(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(`Failed to update profile: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Header Section */}
      <div className="border-b border-gray-200 pb-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-pink-500 text-transparent bg-clip-text">Admin Profile</h1>
            <p className="mt-1 text-sm text-gray-500">Update your profile information and password</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Profile Picture Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4 bg-gradient-to-r from-blue-600 to-pink-500 text-transparent bg-clip-text">Profile Picture</h2>
            <div className="flex items-center space-x-6">
              <div className="relative">
                {imagePreview ? (
                  <img 
                    src={imagePreview} 
                    alt="Profile" 
                    className="h-24 w-24 rounded-full object-cover border-2 border-gray-200" 
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center">
                    <PhotoIcon className="h-12 w-12 text-gray-400" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Change profile picture
                </label>
                <input
                  type="file"
                  name="profileImage"
                  id="profileImage"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="mt-1 text-xs text-gray-500">JPG, PNG or GIF up to 2MB</p>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4 bg-gradient-to-r from-blue-600 to-pink-500 text-transparent bg-clip-text">Profile Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formValues.name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formValues.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
                />
              </div>
            </div>
          </div>
          
          {/* Password Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4 bg-gradient-to-r from-blue-600 to-pink-500 text-transparent bg-clip-text">Change Password</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  name="currentPassword"
                  value={formValues.currentPassword}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  name="newPassword"
                  value={formValues.newPassword}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formValues.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900"
                />
                {formValues.newPassword && formValues.confirmPassword && 
                 formValues.newPassword !== formValues.confirmPassword && (
                  <p className="mt-1 text-sm text-red-500">Passwords do not match</p>
                )}
              </div>
              <div className="text-sm text-gray-500">
                <p>Leave password fields empty if you don't want to change your password.</p>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end space-x-4">
            <button
              type="submit"
              disabled={loading}
              className={`px-4 py-2 bg-blue-600 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default Settings;
