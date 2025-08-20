// client/src/App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE = process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [currentView, setCurrentView] = useState('appointments');
  
  useEffect(() => {
    if (token) {
      fetchUserData();
    }
  }, [token]);

  const fetchUserData = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user data:', error);
      logout();
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
    setCurrentView('appointments');
  };

  if (!token) {
    return <LoginPage setToken={setToken} />;
  }

  return (
    <div className="App">
      <header className="header">
        <h1>Appointment Management</h1>
        <div className="user-info">
          <span>Welcome, {user?.name}</span>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </header>
      
      <nav className="nav">
        <button 
          className={currentView === 'appointments' ? 'active' : ''}
          onClick={() => setCurrentView('appointments')}
        >
          My Appointments
        </button>
        <button 
          className={currentView === 'create' ? 'active' : ''}
          onClick={() => setCurrentView('create')}
        >
          Create Appointment
        </button>
      </nav>

      <main className="main">
        {currentView === 'appointments' && (
          <AppointmentList token={token} user={user} />
        )}
        {currentView === 'create' && (
          <CreateAppointment token={token} user={user} />
        )}
      </main>
    </div>
  );
}

function LoginPage({ setToken }) {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_BASE}/api/auth/login`, {
        username: username.trim()
      });

      const { token } = response.data;
      localStorage.setItem('token', token);
      setToken(token);
    } catch (error) {
      setError(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-form">
        <h2>Login</h2>
        <p className="login-help">Available users: john, jane, tom, laufey, jeremy, james, jenson, albert</p>
        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
            required
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        {error && <div className="error">{error}</div>}
      </div>
    </div>
  );
}

function AppointmentList({ token, user }) {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointments();
  }, []);

  const fetchAppointments = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/appointments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAppointments(response.data);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateTimeString) => {
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return <div className="loading">Loading appointments...</div>;
  }

  return (
    <div className="appointment-list">
      <h2>My Appointments</h2>
      {user && (
        <p className="timezone-info">Times shown in your timezone: {user.preferred_timezone}</p>
      )}
      
      {appointments.length === 0 ? (
        <p>No appointments found.</p>
      ) : (
        <div className="appointments">
          {appointments.map((appointment) => (
            <div key={appointment.id} className="appointment-card">
              <h3>{appointment.title}</h3>
              <p><strong>Created by:</strong> {appointment.creator_name}</p>
              <p><strong>Start:</strong> {formatDateTime(appointment.start_time_local)}</p>
              <p><strong>End:</strong> {formatDateTime(appointment.end_time_local)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateAppointment({ token, user }) {
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data.filter(u => u.id !== user?.id));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleParticipantToggle = (userId) => {
    setSelectedParticipants(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !startTime || !endTime) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await axios.post(`${API_BASE}/api/appointments`, {
        title,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        participants: selectedParticipants
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('Appointment created successfully!');
      setTitle('');
      setStartTime('');
      setEndTime('');
      setSelectedParticipants([]);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create appointment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-appointment">
      <h2>Create New Appointment</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Start Time</label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>End Time</label>
          <input
            type="datetime-local"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Participants (optional)</label>
          <div className="participant-list">
            {users.map(u => (
              <label key={u.id} className="participant-option">
                <input
                  type="checkbox"
                  checked={selectedParticipants.includes(u.id)}
                  onChange={() => handleParticipantToggle(u.id)}
                  disabled={loading}
                />
                {u.name} ({u.preferred_timezone})
              </label>
            ))}
          </div>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Appointment'}
        </button>
      </form>

      {success && <div className="success">{success}</div>}
      {error && <div className="error">{error}</div>}
      
      <div className="working-hours-note">
        <p><strong>Note:</strong> Appointments must be scheduled within working hours (09:00-17:00) for all participants in their respective timezones.</p>
      </div>
    </div>
  );
}

export default App;
