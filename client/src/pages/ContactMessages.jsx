// ============================================================
// CONTACT MESSAGES PAGE
//
// This page is used by both Admin and Vendor dashboards.
//
// Features:
// - Shows all Contact Us messages
// - Shows name, email, message and date
// - One-click delete
// - Automatically works with localhost and production API
// ============================================================

import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import config from '../config';

export default function ContactMessages() {

  // ----------------------------------------------------------
  // Store all messages
  // ----------------------------------------------------------

  const [messages, setMessages] = useState([]);

  // Loading state
  const [loading, setLoading] = useState(true);
  // Reply text for each message (keyed by message id)
  const [replyTexts, setReplyTexts] = useState({});

  // Which message's reply is currently being sent
  const [sendingId, setSendingId] = useState(null);

  // ----------------------------------------------------------
  // Fetch messages
  // ----------------------------------------------------------

  const fetchMessages = async () => {

    try {

      setLoading(true);

      const token = localStorage.getItem('token');

      const response = await fetch(
        `${config.apiUrl}/contact`,
        {
          method: 'GET',

          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();

      setMessages(Array.isArray(data) ? data : []);

    } catch (error) {

      console.error('Contact messages error:', error);

      toast.error('Failed to load messages');

    } finally {

      setLoading(false);

    }
  };


  // ----------------------------------------------------------
  // Load messages when page opens
  // ----------------------------------------------------------

  useEffect(() => {
    fetchMessages();
  }, []);


  // ----------------------------------------------------------
  // Delete message
  // ----------------------------------------------------------

  const handleDelete = async (id) => {

    const confirmed = window.confirm(
      'Are you sure you want to delete this message?'
    );

    if (!confirmed) {
      return;
    }

    try {

      const token = localStorage.getItem('token');

      const response = await fetch(
        `${config.apiUrl}/contact/${id}`,
        {
          method: 'DELETE',

          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {

        const errorData = await response.json().catch(() => ({}));

        throw new Error(
          errorData.message || 'Failed to delete message'
        );
      }

      // Remove deleted message immediately from UI
      setMessages((currentMessages) =>
        currentMessages.filter(
          (message) => message._id !== id
        )
      );

      toast.success('Message deleted successfully');

    } catch (error) {

      console.error('Delete message error:', error);

      toast.error(error.message || 'Failed to delete message');

    }
  };

   // Send reply to the user who sent this message
 

  const handleReply = async (id) => {

    const replyText = (replyTexts[id] || '').trim();

    if (!replyText) {
      toast.error('Please write a reply first');
      return;
    }

    try {

      setSendingId(id);

      const token = localStorage.getItem('token');

      const response = await fetch(
        `${config.apiUrl}/contact/${id}/reply`,
        {
          method: 'POST',

          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },

          body: JSON.stringify({ replyText })
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to send reply');
      }

      // Clear the box only for this message
      setReplyTexts((current) => ({ ...current, [id]: '' }));

      toast.success('Reply sent successfully');

    } catch (error) {

      console.error('Reply error:', error);

      toast.error(error.message || 'Failed to send reply');

    } finally {

      setSendingId(null);

    }
  };

  // ==========================================================
  // LOADING STATE
  // ==========================================================

  if (loading) {

    return (
      <div className="min-h-screen bg-gray-50 p-6">

        <div className="max-w-6xl mx-auto">

          <h1 className="text-2xl font-bold text-gray-900 mb-6">
            Contact Messages
          </h1>

          <div className="bg-white rounded-lg shadow p-8 text-center">
            Loading messages...
          </div>

        </div>

      </div>
    );
  }


  // ==========================================================
  // PAGE UI
  // ==========================================================

  return (
    <div className="min-h-screen bg-gray-50 p-6">

      <div className="max-w-6xl mx-auto">

        {/* Page heading */}
        <div className="mb-6">

          <h1 className="text-2xl font-bold text-gray-900">
            Contact Messages
          </h1>

          <p className="text-gray-600 mt-1">
            Messages submitted by users through Contact Us.
          </p>

        </div>


        {/* No messages */}
        {messages.length === 0 ? (

          <div className="bg-white rounded-lg shadow p-8 text-center">

            <p className="text-gray-500">
              No contact messages found.
            </p>

          </div>

        ) : (

          /* Messages list */

          <div className="space-y-4">

            {messages.map((message) => (

              <div
                key={message._id}
                className="bg-white rounded-lg shadow p-6"
              >

                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">

                  {/* Message information */}

                  <div className="flex-1">

                    <div className="flex flex-wrap items-center gap-3 mb-2">

                      <h2 className="text-lg font-semibold text-gray-900">
                        {message.name}
                      </h2>

                      <span className="text-sm text-gray-500">
                        {message.email}
                      </span>

                    </div>


                    {/* Date */}

                    <p className="text-xs text-gray-400 mb-4">

                      {message.createdAt
                        ? new Date(
                            message.createdAt
                          ).toLocaleString()
                        : 'Date unavailable'}

                    </p>


                    {/* User message */}

                    <div className="bg-gray-50 rounded-lg p-4">

                      <p className="text-gray-700 whitespace-pre-wrap">
                        {message.message}
                      </p>

                    </div>

                      {/* Reply box */}
                      
                     <div className="mt-4">

                      <textarea
                        rows={3}
                        value={replyTexts[message._id] || ''}
                        onChange={(e) =>
                          setReplyTexts((current) => ({
                            ...current,
                            [message._id]: e.target.value
                          }))
                        }
                        placeholder={`Reply to ${message.name}...`}
                        className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />

                      <button
                        type="button"
                        onClick={() => handleReply(message._id)}
                        disabled={sendingId === message._id}
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                      >
                        {sendingId === message._id ? 'Sending...' : 'Send Reply'}
                      </button>

                    </div>
                  </div>


                  {/* Delete button */}

                  <button
                    type="button"
                    onClick={() => handleDelete(message._id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>

    </div>
  );
}
