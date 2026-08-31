import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { toast } from 'react-hot-toast'

export default function EventCheckin() {
  const { eventId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    markAttendance()
  }, [user])

  const markAttendance = () => {
    const doCheckin = (latitude, longitude) => {
      const body = {}
      if (latitude && longitude) {
        body.latitude = latitude
        body.longitude = longitude
      }

      fetch(`https://eventnet-production.up.railway.app/api/events/${eventId}/self-checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(body)
      })
        .then(async (res) => {
          const data = await res.json()
          if (res.ok) {
            setStatus('success')
          } else if (data.message?.toLowerCase().includes('not registered')) {
            setStatus('notregistered')
          } else if (data.message?.toLowerCase().includes('already')) {
            setStatus('already')
          } else {
            setStatus('error')
            toast.error(data.message || 'Could not mark attendance')
          }
        })
        .catch(() => {
          setStatus('error')
          toast.error('Network error. Please try again.')
        })
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => doCheckin(pos.coords.latitude, pos.coords.longitude),
        () => doCheckin(null, null),
        { timeout: 8000 }
      )
    } else {
      doCheckin(null, null)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
        {status === 'checking' && (
          <>
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Marking your attendance...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-green-700 mb-2">Attendance Marked!</h2>
            <p className="text-gray-600 mb-6">You're checked in. Enjoy the event!</p>
            <Link to="/" className="text-blue-600 hover:underline">Go to Home</Link>
          </>
        )}

        {status === 'already' && (
          <>
            <div className="text-5xl mb-4">ℹ️</div>
            <h2 className="text-xl font-bold text-blue-700 mb-2">Already Checked In</h2>
            <p className="text-gray-600 mb-6">Your attendance was already marked earlier.</p>
            <Link to="/" className="text-blue-600 hover:underline">Go to Home</Link>
          </>
        )}

        {status === 'notregistered' && (
          <>
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-red-700 mb-2">Not Registered</h2>
            <p className="text-gray-600 mb-6">You haven't registered for this event yet.</p>
            <Link to={`/events/${eventId}`} className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
              Register Now
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl font-bold text-red-700 mb-2">Something Went Wrong</h2>
            <p className="text-gray-600 mb-6">Please try scanning the QR code again.</p>
          </>
        )}
      </div>
    </div>
  )
}