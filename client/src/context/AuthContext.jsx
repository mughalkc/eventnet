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
      const response = await axios.get(`${config.apiUrl}/auth/me`)
      setUser({
        ...response.data,
        id: response.data._id // Ensure we have both _id and id
      })
    } catch (error) {
      console.error('Auth check failed:', error)
      localStorage.removeItem('token')
      delete axios.defaults.headers.common['Authorization']
    } finally {
      setLoading(false)
    }
  }

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