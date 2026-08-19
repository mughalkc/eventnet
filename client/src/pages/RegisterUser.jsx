import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export default function RegisterUser() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [showOTP, setShowOTP] = useState(false);
  const [userId, setUserId] = useState(null);
  const [otp, setOtp] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post('https://eventnet-production.up.railway.app/api/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: 'user'
      });

      if (response.data.requiresVerification) {
          setUserId(response.data.userId);
          setShowOTP(true);
          toast.success('OTP sent to your email!');
        }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
  e.preventDefault();

  if (!otp || otp.length !== 6) {
    toast.error('Please enter the 6-digit OTP');
    return;
  }

  setIsLoading(true);

  try {
    const response = await axios.post(
      'https://eventnet-production.up.railway.app/api/auth/verify-otp',
      {
        userId,
        otp
      }
    );

    if (response.data.token) {
      toast.success('Email verified! Registration complete.');
      navigate('/login');
    }
  } catch (error) {
    toast.error(
      error.response?.data?.message || 'Invalid OTP'
    );
  } finally {
    setIsLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <Link to="/" className="inline-block">
            <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              EventNet
            </span>
          </Link>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white/10 backdrop-blur-lg rounded-xl p-8 shadow-xl"
        >
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
          
          {showOTP ? 'Verify your Email' : 'Create Your user account'}
          </h2>
        {showOTP ?  (
  <form onSubmit={handleVerifyOTP} className="space-y-4">
    <h3 className="text-white text-center text-lg font-semibold">
      Enter OTP
    </h3>

    <p className="text-gray-400 text-center text-sm">
      Check <span className="font-semibold text-purple-400">{formData.email}</span> for the 6-digit code.
    </p>

    <input
      type="text"
      maxLength={6}
      value={otp}
      onChange={(e) =>
        setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
      }
      required
      className="w-full px-4 py-3 bg-white/10 border border-gray-600 rounded-lg text-white text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-purple-500"
      placeholder="000000"
    />

    <button
      type="submit"
      disabled={isLoading}
      className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white py-3 rounded-lg font-semibold"
    >
      {isLoading ? 'Verifying...' : 'Verify Email'}
    </button>
    <button
  type="button"
  onClick={() => setShowOTP(false)}
  className="w-full text-sm text-gray-400 hover:text-white transition-colors pt-2 mt-2"
>
  ← Edit Registration Details
</button>
  </form>
) : (


          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Create a password"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-white/10 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Confirm your password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white py-3 rounded-lg font-semibold transition-all hover:shadow-lg hover:shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating account...' : 'Create User Account'}
            </button>
          </form>
)}
          <p className="mt-6 text-center text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
} 