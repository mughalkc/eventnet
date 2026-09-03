import React, { useState, useEffect } from 'react';
import axios from 'axios';

const EventAttendanceView = ({ eventId }) => {
  const [attendance, setAttendance] = useState(null);
  const [activeTab, setActiveTab] = useState('present');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/vendor/events/${eventId}/attendance`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setAttendance(res.data);
      } catch (err) {
        console.error('Error fetching attendance:', err);
      } finally {
        setLoading(false);
      }
    };

    if (eventId) fetchAttendance();
  }, [eventId]);

  if (loading) return <div className="p-4 text-center">Loading attendance data...</div>;
  if (!attendance) return null;

  return (
    <div className="bg-white p-5 rounded-lg shadow-md border mt-4">
      <h3 className="text-xl font-bold mb-4 text-gray-800">Attendance Breakdown</h3>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-center">
          <p className="text-sm text-green-600 font-medium">Present</p>
          <p className="text-2xl font-bold text-green-700">{attendance.presentCount}</p>
        </div>
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-center">
          <p className="text-sm text-red-600 font-medium">Absent</p>
          <p className="text-2xl font-bold text-red-700">{attendance.absentCount}</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-center">
          <p className="text-sm text-gray-600 font-medium">Total Tickets</p>
          <p className="text-2xl font-bold text-gray-700">{attendance.totalAttendees}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b mb-4">
        <button
          className={`py-2 px-4 font-semibold text-sm mr-2 ${
            activeTab === 'present'
              ? 'border-b-2 border-green-600 text-green-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('present')}
        >
          Present Attendees ({attendance.presentCount})
        </button>
        <button
          className={`py-2 px-4 font-semibold text-sm ${
            activeTab === 'absent'
              ? 'border-b-2 border-red-600 text-red-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('absent')}
        >
          Absent Attendees ({attendance.absentCount})
        </button>
      </div>

      {/* List */}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {activeTab === 'present' ? (
          attendance.presentList.length > 0 ? (
            attendance.presentList.map((user) => (
              <div key={user._id} className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                <div>
                  <p className="font-semibold text-gray-800">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <span className="px-3 py-1 text-xs font-bold text-green-700 bg-green-100 rounded-full">
                  Present ✅
                </span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm py-2">No present attendees yet.</p>
          )
        ) : (
          attendance.absentList.length > 0 ? (
            attendance.absentList.map((user) => (
              <div key={user._id} className="flex justify-between items-center p-3 bg-gray-50 rounded border">
                <div>
                  <p className="font-semibold text-gray-800">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <span className="px-3 py-1 text-xs font-bold text-red-700 bg-red-100 rounded-full">
                  Absent ❌
                </span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm py-2">No absent attendees.</p>
          )
        )}
      </div>
    </div>
  );
};

export default EventAttendanceView;