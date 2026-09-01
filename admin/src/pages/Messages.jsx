import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { EnvelopeIcon, TrashIcon } from '@heroicons/react/24/outline';

const Messages = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const response = await fetch('https://eventnet-production.up.railway.app/api/contact', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to fetch messages');
      const data = await response.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Fetch messages error:', error);
      toast.error('Failed to load messages');
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (messageId) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      setDeletingId(messageId);
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`https://eventnet-production.up.railway.app/api/contact/${messageId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Failed to delete message');
      setMessages(prev => prev.filter(m => m._id !== messageId));
      toast.success('Message deleted successfully');
    } catch (error) {
      toast.error('Failed to delete message');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Contact Messages</h1>

      {messages.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <EnvelopeIcon className="h-16 w-16 mx-auto text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-700 mt-4">No messages found</h2>
        </div>
      ) : (
        <div className="space-y-4">
          {messages.map((message) => (
            <div key={message._id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-gray-900">{message.name}</h2>
                  <p className="text-sm text-blue-600 mt-1">{message.email}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {message.createdAt ? new Date(message.createdAt).toLocaleString() : ''}
                  </p>
                  <div className="mt-4 bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">{message.message}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(message._id)}
                  disabled={deletingId === message._id}
                  className="flex items-center gap-2 px-3 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50"
                >
                  <TrashIcon className="h-5 w-5" />
                  {deletingId === message._id ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Messages;