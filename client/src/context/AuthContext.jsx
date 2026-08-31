import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import config from '../config'
import toast from 'react-hot-toast'

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      checkAuthStatus()
    } else {
      setLoading(false)
    }
  }, [])

const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) throw new Error("Token missing")

      // Token decoding
      const payloadBase64 = token.split('.')[1]
      if (!payloadBase64) throw new Error("Invalid token format")
      
      const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));

      // DEBUG: Check karein token mein kya aa raha hai
      console.log("👉 DECODED PAYLOAD:", payload);

      if (payload.role === 'vendor' || payload.vendorId !== undefined) {
        
        console.log("👉 VENDOR API CALLING...");
        
        // Yahan maine explicit header add kiya hai jo aap ke purane code mein tha
        const response = await axios.get(`${config.apiUrl}/vendor/profile`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        setUser({
          id: response.data.id || response.data._id || payload.vendorId || payload.id,
          name: response.data.businessName || response.data.name || 'Vendor',
          email: response.data.email || response.data.contactEmail,
          role: 'vendor',
          status: response.data.status
        });

        console.log("👉 VENDOR LOGIN SUCCESSFUL ON REFRESH!");

      } else {
        
        console.log("👉 REGULAR USER API CALLING...");
        const response = await axios.get(`${config.apiUrl}/auth/me`, {
           headers: { Authorization: `Bearer ${token}` }
        });
        
        setUser({
          ...response.data,
          id: response.data._id || response.data.id
        });
      }
    } catch (error) {
      console.error('❌ AUTH CHECK FAILED:', error.response?.data || error.message);
      if (error.response?.status === 401 || error.response?.status === 403 || error.response?.status === 404) {
         console.error(`Backend ne request reject kar di. Status: ${error.response.status}`);
      }
      
      localStorage.removeItem('token')
      delete axios.defaults.headers.common['Authorization']
      setUser(null)
    } finally {
      setLoading(false)
    }
  }
//     // Vendor authentication
   
//     const vendorResponse = await axios.get(
//       `${config.apiUrl}/vendor/profile`,
//       {
//         headers: {
//           Authorization: `Bearer ${token}`
//         }
//       }
//     )

//     const vendor = vendorResponse.data
//     // Restore vendor user state after page refresh
    
//     setUser({
//       id: vendor.id,
//       name: vendor.businessName || 'Vendor',
//       email: vendor.email,
//       role: 'vendor',
//       status: vendor.status
//     })

//   } catch (error) {

//     console.error('Auth check failed:', error)

//     // Token is invalid/expired
//     localStorage.removeItem('token')

//     delete axios.defaults.headers.common['Authorization']

//     setUser(null)

//   } finally {
//     setLoading(false)
//   }
// }

  const login = async (email, password, role) => {
    try {
      let response;
      
      // Use different endpoint for vendor login
      if (role === 'vendor') {
       response = await axios.post(`${config.apiUrl}/vendor/login`, {
          email,
          password
        });
        
        const { token, vendor } = response.data;
        const normalizedUser = {
          id: vendor.id,
          name: vendor.businessName,
          email: vendor.contactEmail,
          role: 'vendor',
          status: vendor.status
        };
        
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(normalizedUser);
        return normalizedUser;
      } else {
        response = await axios.post(`${config.apiUrl}/auth/login`, {
          email,
          password,
          role
        });
        
        const { token, user } = response.data;
        const normalizedUser = {
          ...user,
          id: user._id // Ensure we have both _id and id
        };
        
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(normalizedUser);
        return normalizedUser;
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  }

  const register = async (userData) => {
    try {
      const response = await axios.post(`${config.apiUrl}/auth/register`, userData);
      const { token, user } = response.data;
      const normalizedUser = {
        ...user,
        id: user._id // Ensure we have both _id and id
      };
      
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(normalizedUser);
      return normalizedUser;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  }

  const updateUser = (updatedUserData) => {
    // Ensure we have both _id and id for consistency
    const normalizedUser = {
      ...updatedUserData,
      id: updatedUserData._id || updatedUserData.id
    };
    
    setUser(normalizedUser);
    return normalizedUser;
  }

  const hasRole = (requiredRole) => {
    return user?.role === requiredRole;
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    hasRole
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
} 