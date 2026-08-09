import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('adminToken')
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      checkAuthStatus()
    } else {
      setLoading(false)
    }
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await axios.get(`https://eventnet-production.up.railway.app/api/auth/me`)
      if (response.data.role === 'admin') {
        setUser(response.data)
      } else {
        logout()
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      logout()
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      const response = await axios.post(`https://eventnet-production.up.railway.app/api/auth/login`, {
        email,
        password,
        role: 'admin'
      })
      
      const { token, user: userData } = response.data
      
      if (userData.role !== 'admin') {
        toast.error('Access denied. Admin privileges required.')
        return false
      }
      
      localStorage.setItem('adminToken', token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      setUser(userData)
      toast.success('Successfully logged in as admin')
      return true
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed'
      toast.error(message)
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem('adminToken')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
  }

  const value = {
    user,
    loading,
    login,
    logout,
    token: localStorage.getItem('adminToken')
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
} 