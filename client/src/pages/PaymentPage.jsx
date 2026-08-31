import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  CreditCardIcon,
  UserIcon,
  TicketIcon,
  CalendarIcon,
  MapPinIcon,
  ClockIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

export default function PaymentPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth(); // Get user and role information
  const [event, setEvent] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState('history');
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
  });
  
  // Initialize totalPrice here to avoid reference errors
  const totalPrice = selectedTicket ? selectedTicket.price * quantity : 0;

  useEffect(() => {
    if (eventId) {
      fetchEventDetails();
    } else {
      // If no eventId, we're on the main payments page
      setLoading(false);
      fetchPaymentHistory();
    }
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      const response = await fetch(`https://eventnet-production.up.railway.app/api/events/${eventId}`);
      const data = await response.json();
      setEvent(data);
      if (data.tickets && data.tickets.length > 0) {
        setSelectedTicket(data.tickets[0]);
      }
    } catch (error) {
      toast.error('Failed to fetch event details');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    setLoadingHistory(true);
    try {
      // Fetch real payment history from the server
      const response = await fetch('https://eventnet-production.up.railway.app/api/payments/history', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.payments) {
        // Transform the data to match our expected format
        const formattedPayments = data.payments.map(payment => ({
          _id: payment._id || `payment-${Math.random().toString(36).substr(2, 9)}`,
          eventId: payment.event?._id || 'unknown',
          eventName: payment.event?.name || 'Unknown Event',
          date: payment.createdAt,
          amount: payment.totalAmount || 0,
          status: payment.paymentStatus || 'unknown',
          ticketCount: payment.quantity || 0,
          ticketCode: payment.ticketCode || '-',
          cardLast4: payment.paymentMethod === 'stripe' ? payment.paymentId?.slice(-4) || '****' : '****'
        }));
        
        setPaymentHistory(formattedPayments);
      } else {
        setPaymentHistory([]);
      }
    } catch (error) {
      console.error('Error fetching payment history:', error);
      toast.error('Failed to fetch payment history');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Function to handle direct registration for free tickets
  const handleFreeTicketRegistration = async () => {
    if (!user) {
      toast.error('Please login to register for this event');
      navigate('/login');
      return false;
    }

    try {
      // Register user directly for free event
      const response = await fetch(`https://eventnet-production.up.railway.app/api/events/${eventId}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }
      
      toast.success('Successfully registered for the event!');
      navigate(`/events/${eventId}`);
      return true;
    } catch (error) {
      toast.error(error.message || 'Failed to register for the event');
      return false;
    }
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to purchase tickets');
      navigate('/login');
      return;
    }

    if (!selectedTicket) {
      toast.error('Please select a ticket type');
      return;
    }

    // If the selected ticket is free, skip payment and register directly
    if (selectedTicket.price === 0) {
      await handleFreeTicketRegistration();
      return;
    }

    setPaymentProcessing(true);
    try {
      // Process the payment on the server
      const paymentData = {
        eventId: eventId,
        ticketId: selectedTicket._id,
        quantity: quantity,
        amount: selectedTicket.price * quantity,
        paymentMethod: {
          cardNumber: paymentDetails.cardNumber.slice(-4),
          cardName: paymentDetails.cardName
        }
      };

      const response = await fetch('https://eventnet-production.up.railway.app/api/payments/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(paymentData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Payment processing failed');
      }

      const result = await response.json();
      
      toast.success('Payment successful! You are now registered for the event.');
      
      // Add the payment to history
      const newPayment = {
        _id: result.paymentId || Date.now().toString(),
        eventId: eventId,
        eventName: event.name,
        date: new Date().toISOString(),
        amount: selectedTicket.price * quantity,
        status: 'completed',
        ticketCount: quantity,
        cardLast4: paymentDetails.cardNumber.slice(-4)
      };
      
      setPaymentHistory(prev => [newPayment, ...prev]);
      navigate(`/events/${eventId}`);
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment failed. Please try again.');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'cardNumber') {
      // Format card number with spaces
      const formatted = value.replace(/\s/g, '').match(/.{1,4}/g)?.join(' ') || value;
      setPaymentDetails(prev => ({ ...prev, [name]: formatted }));
    } else {
      setPaymentDetails(prev => ({ ...prev, [name]: value }));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // If we're on the main payments page (no eventId)
  if (!eventId) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-8 px-6 rounded-lg shadow-md mb-6">
            <h1 className="text-3xl font-bold">Payments & Transactions</h1>
            <p className="mt-2 text-lg opacity-90">Manage your payments and view your transaction history</p>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
            <div className="flex border-b border-gray-200">
              {/* For regular users, show only payment history tab */}
              {!isAdmin ? (
                <div className="flex-1 py-4 px-6 text-center font-medium text-blue-600 border-b-2 border-blue-600">
                  Payment History
                </div>
              ) : (
                /* For admins, show all tabs */
                <>
                  <button
                    className={`flex-1 py-4 px-6 text-center font-medium ${
                      activeTab === 'history'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveTab('history')}
                  >
                    Payment History
                  </button>
                  <button
                    className={`flex-1 py-4 px-6 text-center font-medium ${
                      activeTab === 'methods'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveTab('methods')}
                  >
                    Payment Methods
                  </button>
                  <button
                    className={`flex-1 py-4 px-6 text-center font-medium ${
                      activeTab === 'payment'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setActiveTab('payment')}
                  >
                    Payment Form
                  </button>
                </>
              )}
            </div>

            <div className="p-6">
              {/* For regular users, always show payment history regardless of activeTab */}
              {!isAdmin || activeTab === 'history' ? (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Recent Transactions</h2>
                  
                  {loadingHistory ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : paymentHistory.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Event
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Amount
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {paymentHistory.map((payment) => (
                            <tr key={payment._id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{payment.eventName}</div>
                                <div className="text-sm text-gray-500">{payment.ticketCount} ticket(s)</div>
                                <div className="text-xs text-blue-600 mt-1 font-mono">
                                  Ticket: {payment.ticketCode || payment._id.substring(0, 8)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {new Date(payment.date).toLocaleDateString()}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {new Date(payment.date).toLocaleTimeString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">
                                  ${typeof payment.amount === 'number' ? payment.amount.toFixed(2) : payment.amount}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {payment.paymentMethod || 'Card'} {payment.cardLast4 ? `ending in ${payment.cardLast4}` : ''}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  payment.status === 'completed' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {payment.status === 'completed' ? 'Completed' : 'Pending'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                                <Link to={`/events/${payment.eventId}`}>
                                  View Event
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <TicketIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No transactions yet</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Your payment history will appear here once you purchase tickets.
                      </p>
                      <div className="mt-6">
                        <Link
                          to="/events"
                          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                        >
                          Browse Events
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {/* Show payment methods tab for admin only */}
              {isAdmin && activeTab === 'methods' && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Saved Payment Methods</h2>
                  <div className="bg-gray-50 rounded-lg p-6 text-center">
                    <CreditCardIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No saved payment methods</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      For security reasons, we don't store complete payment information.
                    </p>
                  </div>
                </div>
              )}

              {/* Show payment form tab for admin only */}
              {isAdmin && activeTab === 'payment' && (
                <div>
                  <h2 className="text-xl font-semibold mb-4">Payment Form</h2>
                  <form onSubmit={handlePaymentSubmit} className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Card Number
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          name="cardNumber"
                          autoComplete="off"
                          value={paymentDetails.cardNumber}
                          onChange={handleInputChange}
                          maxLength="19"
                          placeholder="1234 5678 9012 3456"
                          className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                        <CreditCardIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cardholder Name
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          name="cardName"
                          autoComplete="off"
                          value={paymentDetails.cardName}
                          onChange={handleInputChange}
                          placeholder="John Doe"
                          className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                        <UserIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Expiry Date
                        </label>
                        <input
                          type="text"
                          name="expiryDate"
                          autoComplete="off"
                          value={paymentDetails.expiryDate}
                          onChange={handleInputChange}
                          placeholder="MM/YY"
                          maxLength="5"
                          className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CVV
                        </label>
                        <input
                          type="text"
                          name="cvv"
                          autoComplete="off"
                          value={paymentDetails.cvv}
                          onChange={handleInputChange}
                          placeholder="123"
                          maxLength="3"
                          className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>

                    {/* Order Summary */}
                    <div className="border-t border-gray-200 pt-4 mt-6">
                      <div className="flex justify-between text-sm mb-2">
                        <span>Subtotal</span>
                        <span>Rs{totalPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Processing Fee</span>
                        <span>Rs{(totalPrice * 0.029 + 0.30).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-lg mt-4">
                        <span>Total</span>
                        <span>Rs{(totalPrice + totalPrice * 0.029 + 0.30).toFixed(2)}</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={paymentProcessing || !selectedTicket}
                      className={`w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-white text-lg font-medium ${
                        paymentProcessing || !selectedTicket
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-gradient-to-r from-[#4169E1] to-[#FF1493] hover:opacity-90'
                      }`}
                    >
                      {paymentProcessing ? 'Processing...' : 'Complete Purchase'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-bold mb-4">Event not found</h2>
        <button
          onClick={() => navigate('/')}
          className="text-blue-600 hover:text-blue-800"
        >
          Return to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-lg overflow-hidden"
        >
          {/* Event Summary */}
          <div className="p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <h1 className="text-2xl font-bold mb-2">{event.name}</h1>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <CalendarIcon className="w-5 h-5 mr-2" />
                <span>
                  {new Date(event.startDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center">
                <MapPinIcon className="w-5 h-5 mr-2" />
                <span>
                  {typeof event.location === 'object' 
                    ? (event.location.isVirtual ? 'Virtual Event' : event.location.address) 
                    : event.location || 'No location provided'}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Ticket Selection */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-2">Select Ticket Type</h2>
              <p className="text-sm text-gray-600 mb-4">Choose one ticket type. Free tickets will process immediately.</p>
              <div className="space-y-4">
                {event.tickets?.map((ticket) => (
                  <div
                    key={ticket._id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedTicket?._id === ticket._id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-500'
                    }`}
                    onClick={() => {
                      setSelectedTicket(ticket);
                      // If it's a free ticket, automatically register
                      if (ticket.price === 0) {
                        handleFreeTicketRegistration();
                      }
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-medium">{ticket.name}</h3>
                        <p className="text-sm text-gray-600">{ticket.description}</p>
                        {ticket.price === 0 && (
                          <span className="inline-block mt-2 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                            Free Ticket
                          </span>
                        )}
                      </div>
                      <div className="text-lg font-semibold">
                        {ticket.price === 0 ? 'FREE' : `Rs ${ticket.price}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedTicket && (
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <select
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[...Array(10)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Payment Form */}
            <form onSubmit={handlePaymentSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Card Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="cardNumber"
                    autoComplete="off"
                    value={paymentDetails.cardNumber}
                    onChange={handleInputChange}
                    maxLength="19"
                    placeholder="1234 5678 9012 3456"
                    className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <CreditCardIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cardholder Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="cardName"
                    autoComplete="off"
                    value={paymentDetails.cardName}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <UserIcon className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    name="expiryDate"
                    autoComplete="off"
                    value={paymentDetails.expiryDate}
                    onChange={handleInputChange}
                    placeholder="MM/YY"
                    maxLength="5"
                    className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CVV
                  </label>
                  <input
                    type="text"
                    name="cvv"
                    autoComplete="off"
                    value={paymentDetails.cvv}
                    onChange={handleInputChange}
                    placeholder="123"
                    maxLength="3"
                    className="block w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Order Summary */}
              <div className="border-t border-gray-200 pt-4 mt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span>Subtotal</span>
                  <span>Rs{totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span>Processing Fee</span>
                  <span>Rs{(totalPrice * 0.029 + 0.30).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg mt-4">
                  <span>Total</span>
                  <span>Rs{(totalPrice + totalPrice * 0.029 + 0.30).toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={paymentProcessing || !selectedTicket}
                className={`w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-white text-lg font-medium ${
                  paymentProcessing || !selectedTicket
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#4169E1] to-[#FF1493] hover:opacity-90'
                }`}
              >
                {paymentProcessing ? 'Processing...' : 'Complete Purchase'}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}