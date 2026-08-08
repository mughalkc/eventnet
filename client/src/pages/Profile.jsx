import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';

// Helper function to get file extension
const getFileExtension = (filename) => {
  return filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 1);
};

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    photo: null
  });
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phoneNumber || user.phone || '',
        photo: null
      });
      if (user.photo) {
        // Set the preview URL from the user's photo
        setPreviewUrl(user.photo.startsWith('/uploads') 
          ? `http://${window.location.hostname}:5001${user.photo}` 
          : user.photo);
      }
    }
    setLoading(false);
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        photo: file
      }));
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Create FormData object for file upload
      const formDataToSend = new FormData();
      
      // Add text fields
      formDataToSend.append('name', formData.name);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('phone', formData.phone || '');
      
      // Only append photo if it exists and is a File object
      if (formData.photo && formData.photo instanceof File) {
        console.log('Appending photo to form data:', formData.photo.name);
        formDataToSend.append('photo', formData.photo);
      } else {
        console.log('No photo to upload or photo is not a File object');
      }

      // Get the token from localStorage
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required');
      }

      console.log('Sending profile update request...');
      
      // Determine the correct endpoint based on user role
      const endpoint = user.role === 'vendor' 
        ? 'http://${window.location.hostname}:5001/api/vendor/profile' 
        : 'http://${window.location.hostname}:5001/api/auth/users/profile';
      
      console.log(`Using endpoint for ${user.role} role:`, endpoint);
      
      // Important: Do NOT set Content-Type header when sending FormData
      // The browser will automatically set it with the correct boundary
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries([...response.headers]));
      
      if (response.ok) {
        const responseData = await response.json();
        
        // Handle different response formats based on user role
        let updatedUserData;
        
        if (user.role === 'vendor') {
          console.log('Vendor profile update response:', responseData);
          
          // For vendor response, extract the user data
          if (responseData.user) {
            // Server returned user data
            updatedUserData = responseData.user;
          } else {
            // Server returned null for user, create a minimal user object
            console.log('Server returned null for user, creating minimal user object');
            updatedUserData = {
              id: user.id,
              _id: user._id,
              name: formData.name || user.name,
              email: formData.email || user.email,
              phone: formData.phone || user.phone,
              role: 'vendor',
              status: user.status
            };
            
            // If a photo was uploaded, add the expected path
            if (formData.photo && formData.photo instanceof File) {
              // Construct a likely path based on filename
              const filename = `profile-${Date.now()}-${Math.round(Math.random() * 1E9)}${getFileExtension(formData.photo.name)}`;
              updatedUserData.photo = `/uploads/profiles/${filename}`;
              console.log('Constructed photo path:', updatedUserData.photo);
            } else if (user.photo) {
              // Keep existing photo
              updatedUserData.photo = user.photo;
            }
          }
          
          // Merge with vendor data if available
          if (responseData.vendor) {
            updatedUserData = {
              ...updatedUserData,
              businessName: responseData.vendor.businessName,
              status: responseData.vendor.status
            };
          }
          
          // Preserve the role and other important fields from the current user
          updatedUserData = {
            ...user, // Start with all existing user data
            ...updatedUserData, // Override with new data
            role: user.role,  // Ensure role is preserved
            // Preserve any other important fields that might be missing
            id: updatedUserData.id || user.id,
            _id: updatedUserData._id || user._id
          };
        } else {
          // For regular user response
          updatedUserData = {
            ...user, // Start with all existing user data
            ...responseData // Override with new data
          };
        }
        
        console.log('Processed user data for state update:', updatedUserData);
        
        // Update the preview URL with the new photo path from the server
        if (updatedUserData.photo && updatedUserData.photo.startsWith('/uploads')) {
          setPreviewUrl(`http://${window.location.hostname}:5001${updatedUserData.photo}`);
        }
        
        // Update the global user state
        updateUser(updatedUserData);
        
        // Update form data with the updated values
        setFormData({
          name: updatedUserData.name || '',
          email: updatedUserData.email || '',
          phone: updatedUserData.phoneNumber || updatedUserData.phone || '',
          photo: null // Reset photo input but keep the preview
        });
        
        toast.success('Profile updated successfully');
      } else {
        // Try to get the error message from the response
        let errorMessage = 'Failed to update profile';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.error('Server error details:', errorData);
        } catch (jsonError) {
          console.error('Could not parse error response:', jsonError);
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Profile update error:', error);
      console.error('Error details:', error.stack);
      toast.error(error.message || 'Failed to update profile');
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Profile Settings</h1>
        
        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <div className="flex items-center space-x-4 mb-4">
                <div className="h-24 w-24 rounded-full bg-gradient-to-r from-[#4169E1] to-[#FF1493] flex items-center justify-center text-white text-2xl font-medium overflow-hidden">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Profile"
                      className="h-full w-full rounded-full object-cover"
                      onError={(e) => {
                        console.log('Profile image load error:', e);
                        e.target.style.display = 'none';
                        e.target.parentNode.textContent = (user && user.name) ? user.name.charAt(0).toUpperCase() : 'U';
                      }}
                    />
                  ) : (
                    (user && user.name) ? user.name.charAt(0).toUpperCase() : 'U'
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profile Photo
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                  />
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role
              </label>
              <input
                type="text"
                value={user.role}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Update Profile
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile; 