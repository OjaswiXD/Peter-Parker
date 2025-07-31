import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './AdminDashboard.css';
import { FaUsers, FaParking, FaBookmark, FaRupeeSign } from 'react-icons/fa';

function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [parkingSpots, setParkingSpots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [message, setMessage] = useState('');
  const [landowners, setLandowners] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showSpotModal, setShowSpotModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingSpot, setEditingSpot] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const user = useMemo(() => JSON.parse(localStorage.getItem('user')) || {}, []);

  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone_number: '',
    role: 'vehicle_owner'
  });

  const [spotForm, setSpotForm] = useState({
    location: '',
    car_slots: '',
    bike_slots: '',
    car_cost: '',
    bike_cost: '',
    full_time: false,
    landowner_id: '',
    start_time: '',
    end_time: ''
  });

  // Add dashboardStats state
  const [dashboardStats, setDashboardStats] = useState({
    totalUsers: 0,
    availableSpots: 0,
    activeBookings: 0,
    totalRevenue: 0
  });

  // Update the calculateDashboardStats function
  const calculateDashboardStats = useCallback(() => {
    // Calculate total revenue from all completed bookings
    const totalRevenue = bookings
      .filter(booking => booking.status === 'completed')
      .reduce((sum, booking) => {
        const cost = parseFloat(booking.total_cost || 0);
        return isNaN(cost) ? sum : sum + cost;
      }, 0);
    
    // Calculate total available spots (car + bike slots)
    const totalAvailableSpots = parkingSpots.reduce((sum, spot) => {
      const carSlots = parseInt(spot.car_slots || 0);
      const bikeSlots = parseInt(spot.bike_slots || 0);
      return sum + (isNaN(carSlots) ? 0 : carSlots) + (isNaN(bikeSlots) ? 0 : bikeSlots);
    }, 0);

    // Calculate active bookings
    const activeBookings = bookings.filter(booking => 
      booking.status === 'active' || booking.status === 'confirmed'
    ).length;

    setDashboardStats(prevStats => ({
      ...prevStats,
      totalUsers: users.filter(user => user.role !== 'admin').length || 0,
      availableSpots: totalAvailableSpots || 0,
      activeBookings: activeBookings || 0,
      totalRevenue: totalRevenue || 0
    }));
  }, [bookings, parkingSpots, users]);

  // Update the fetchData function to prevent constant console output
  const fetchData = useCallback(async () => {
    try {
      const [usersRes, spotsRes, bookingsRes] = await Promise.all([
        axios.get('http://localhost:5000/api/users', {
          headers: { 
            'user-id': user.id,
            'Cache-Control': 'no-cache',
            'If-None-Match': '*'
          }
        }),
        axios.get('http://localhost:5000/api/parking-spots', {
          headers: { 
            'user-id': user.id,
            'Cache-Control': 'no-cache',
            'If-None-Match': '*'
          }
        }),
        axios.get('http://localhost:5000/api/bookings', {
          headers: { 
            'user-id': user.id,
            'Cache-Control': 'no-cache',
            'If-None-Match': '*'
          }
        })
      ]);

      // Only update state if data has changed
      const hasDataChanged = 
        JSON.stringify(usersRes.data) !== JSON.stringify(users) ||
        JSON.stringify(spotsRes.data) !== JSON.stringify(parkingSpots) ||
        JSON.stringify(bookingsRes.data) !== JSON.stringify(bookings);

      if (hasDataChanged) {
        setUsers(usersRes.data);
        setParkingSpots(spotsRes.data);
        setBookings(bookingsRes.data);
        calculateDashboardStats();
      }
    } catch (error) {
      if (error.response?.status !== 304) {
        console.error('Critical error:', error.message);
      }
      setMessage('Error loading dashboard data');
    }
  }, [user.id, calculateDashboardStats, users, parkingSpots, bookings]);

  // Update fetchNotifications to include proper error handling and headers
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/notifications', {
        headers: { 
          'user-id': user.id,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (response.data && Array.isArray(response.data)) {
        setNotifications(response.data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [user.id]);

  const fetchLandowners = async () => {
    let retryCount = 0;
    const maxRetries = 3;

    const attemptFetchLandowners = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/users', {
          headers: { 
            'user-id': user.id,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          timeout: 10000 // Increased timeout to 10 seconds
        });
        const landownerUsers = response.data.filter(user => user.role === 'landowner');
        setLandowners(landownerUsers);
      } catch (error) {
        if (retryCount < maxRetries && (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED')) {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount)); // Progressive delay: 1s, 2s, 3s
          return attemptFetchLandowners();
        }
        console.error('Error fetching landowners:', error);
      }
    };

    await attemptFetchLandowners();
  };

  const handleDeleteParkingSpot = async (spotId) => {
    if (window.confirm('Are you sure you want to delete this parking spot?')) {
      try {
        await axios.delete(`http://localhost:5000/api/parking-spots/${spotId}`, {
          headers: { 'user-id': user.id }
        });
        setParkingSpots(parkingSpots.filter((spot) => spot._id !== spotId));
        setMessage('Parking spot deleted successfully');
      } catch (error) {
        setMessage(error.response?.data?.message || 'Error deleting parking spot');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleUserFormSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await axios.put(`http://localhost:5000/api/users/${editingUser._id}`, userForm, {
          headers: { 'user-id': user.id }
        });
        setMessage('User updated successfully');
      } else {
        await axios.post('http://localhost:5000/api/register', {
          ...userForm,
          first_name: userForm.full_name,
        });
        setMessage('User created successfully');
      }
      setShowUserModal(false);
      setEditingUser(null);
      setUserForm({
        username: '',
        password: '',
        full_name: '',
        email: '',
        phone_number: '',
        role: 'vehicle_owner'
      });
      fetchData();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error processing user');
    }
  };

  const handleSpotFormSubmit = async (e) => {
    e.preventDefault();
    try {
      const spotData = {
        location: spotForm.location,
        car_slots: parseInt(spotForm.car_slots),
        bike_slots: parseInt(spotForm.bike_slots),
        car_cost: parseFloat(spotForm.car_cost),
        bike_cost: parseFloat(spotForm.bike_cost),
        full_time: spotForm.full_time,
        landowner_id: spotForm.landowner_id,
        start_time: spotForm.start_time,
        end_time: spotForm.end_time
      };

      if (editingSpot) {
        const response = await axios.put(
          `http://localhost:5000/api/parking-spots/${editingSpot._id}`,
          spotData,
          {
            headers: { 
              'user-id': user.id,
              'Content-Type': 'application/json'
            }
          }
        );
        setMessage('Parking spot updated successfully');
      } else {
        await axios.post('http://localhost:5000/api/parking-spots', spotData, {
          headers: { 'user-id': user.id }
        });
        setMessage('Parking spot created successfully');
      }
      setShowSpotModal(false);
      setEditingSpot(null);
      setSpotForm({
        location: '',
        car_slots: '',
        bike_slots: '',
        car_cost: '',
        bike_cost: '',
        full_time: false,
        landowner_id: '',
        start_time: '',
        end_time: ''
      });
      fetchData();
    } catch (error) {
      // Only log critical errors
      if (error.response?.status !== 304) {
        console.error('Error processing parking spot:', error.message);
      }
      setMessage(error.response?.data?.message || 'Error processing parking spot');
    }
  };

  const handleEditSpot = (spot) => {
    setEditingSpot(spot);
    setSpotForm({
      location: spot.location,
      car_slots: spot.car_slots,
      bike_slots: spot.bike_slots,
      car_cost: spot.car_cost,
      bike_cost: spot.bike_cost,
      full_time: spot.full_time,
      landowner_id: spot.landowner_id,
      start_time: spot.start_time,
      end_time: spot.end_time
    });
    setShowSpotModal(true);
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await axios.put(`http://localhost:5000/api/admin/notifications/${notificationId}/read`, {}, {
        headers: { 'user-id': user.id }
      });
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  useEffect(() => {
    fetchData();
    fetchLandowners();
    fetchNotifications();
    calculateDashboardStats();
  }, [fetchData, calculateDashboardStats, user, fetchNotifications]);

  // Update the useEffect to use a ref for tracking updates
  useEffect(() => {
    if (user.id) {
      const controller = new AbortController();
      
      const fetchWithThrottle = async () => {
        await fetchData();
      };

      fetchWithThrottle();
      const interval = setInterval(fetchWithThrottle, 15000);
      
      return () => {
        controller.abort();
        clearInterval(interval);
      };
    }
  }, [user.id, fetchData]);

  // Update the auto-refresh useEffect to handle both data and notifications
  useEffect(() => {
    if (user.id) {
      // Initial fetches
      fetchData();
      fetchNotifications();
      
      // Set intervals for both data and notifications
      const dataInterval = setInterval(() => {
        fetchData();
      }, 15000); // 15 seconds for data refresh
      
      const notificationInterval = setInterval(() => {
        fetchNotifications();
      }, 15000); // 15 seconds for notifications
      
      return () => {
        clearInterval(dataInterval);
        clearInterval(notificationInterval);
      };
    }
  }, [user.id, fetchData, fetchNotifications]);

  // Add this to handle session persistence
  useEffect(() => {
    const checkAuth = () => {
      const userData = localStorage.getItem('user');
      if (!userData) {
        navigate('/login');
      }
    };
    window.addEventListener('focus', checkAuth);
    window.addEventListener('storage', checkAuth);
    
    return () => {
      window.removeEventListener('focus', checkAuth);
      window.removeEventListener('storage', checkAuth);
    };
  }, [navigate]);

  return (
    <div className="admin-dashboard">
      <nav className="admin-navbar">
        <div className="navbar-brand">
          <Link to="/admin/dashboard">
            <img src="http://localhost:5000/Logo.png" alt="Logo" className="navbar-logo" />
          </Link>
          <span className="navbar-title">Admin Panel</span>
        </div>
        <div className="navbar-menu">
          <Link 
            to="/admin/dashboard" 
            className={`nav-link ${location.pathname === '/admin/dashboard' ? 'active' : ''}`}
          >
            Dashboard
          </Link>
          <Link 
            to="/admin/users" 
            className={`nav-link ${location.pathname === '/admin/users' ? 'active' : ''}`}
          >
            Users
          </Link>
          <Link 
            to="/admin/spots" 
            className={`nav-link ${location.pathname === '/admin/spots' ? 'active' : ''}`}
          >
            Parking Spots
          </Link>
          <Link 
            to="/admin/bookings" 
            className={`nav-link ${location.pathname === '/admin/bookings' ? 'active' : ''}`}
          >
            Bookings
          </Link>
          <div className="notification-container">
            <button onClick={() => setShowNotifications(!showNotifications)} className="notification-bell-btn">
              <i className="fas fa-bell" style={{ color: 'red', fontSize: '1.2rem' }}></i>
              {notifications.length > 0 && (
                <span className="notification-badge">
                  {notifications.length}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="notification-dropdown">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div key={notif._id} className="notification-item">
                      <p>{notif.message}</p>
                      <button
                        onClick={() => markNotificationAsRead(notif._id)}
                        className="dismiss-btn"
                      >
                        Dismiss
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="no-notifications">No new notifications</p>
                )}
              </div>
            )}
          </div>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </nav>

      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Admin Dashboard</h1>
          <div className="action-buttons">
            <button onClick={() => setShowUserModal(true)} className="add-btn">
              <FaUsers /> Add User
            </button>
            <button onClick={() => setShowSpotModal(true)} className="add-btn">
              <FaParking /> Add Parking Spot
            </button>
          </div>
        </div>

        {message && (
          <div className={`alert ${message.includes('successfully') ? 'success' : 'error'}`}>
            {message}
          </div>
        )}

        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-icon">
              <FaUsers />
            </div>
            <div className="stat-info">
              <h3>Total Users</h3>
              <p>{dashboardStats.totalUsers}</p>
              <span className="stat-trend positive">↑ Active Users</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <FaParking />
            </div>
            <div className="stat-info">
              <h3>Available Spots</h3>
              <p>{dashboardStats.availableSpots}</p>
              <span className="stat-trend">Total Capacity</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <FaBookmark />
            </div>
            <div className="stat-info">
              <h3>Active Bookings</h3>
              <p>{dashboardStats.activeBookings}</p>
              <span className="stat-trend">Current Status</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <FaRupeeSign />
            </div>
            <div className="stat-info">
              <h3>Total Revenue</h3>
              <p>Rs {dashboardStats.totalRevenue.toLocaleString()}</p>
              <span className="stat-trend positive">↑ Overall Earnings</span>
            </div>
          </div>
        </div>

        {/* User Modal */}
        {showUserModal && (
          <div className="modal">
            <div className="modal-content">
              <h2>{editingUser ? 'Edit User' : 'Add New User'}</h2>
              <form onSubmit={handleUserFormSubmit}>
                <input
                  type="text"
                  placeholder="Username"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  required
                />
                {!editingUser && (
                  <input
                    type="password"
                    placeholder="Password"
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    required
                  />
                )}
                <input
                  type="text"
                  placeholder="Full Name"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={userForm.phone_number}
                  onChange={(e) => setUserForm({ ...userForm, phone_number: e.target.value })}
                />
                <select
                  value={userForm.role}
                  onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                >
                  <option value="vehicle_owner">Vehicle Owner</option>
                  <option value="landowner">Landowner</option>
                  <option value="admin">Admin</option>
                </select>
                <div className="modal-actions">
                  <button type="submit" className="submit-btn">
                    {editingUser ? 'Update' : 'Create'}
                  </button>
                  <button type="button" onClick={() => setShowUserModal(false)} className="cancel-btn">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Parking Spot Modal */}
        {showSpotModal && (
          <div className="modal">
            <div className="modal-content">
              <h2>{editingSpot ? 'Edit Parking Spot' : 'Add New Parking Spot'}</h2>
              <form onSubmit={handleSpotFormSubmit}>
                <select
                  value={spotForm.landowner_id}
                  onChange={(e) => setSpotForm({ ...spotForm, landowner_id: e.target.value })}
                  required
                >
                  <option value="">Select Landowner</option>
                  {landowners.map(landowner => (
                    <option key={landowner._id} value={landowner._id}>
                      {landowner.full_name || landowner.username}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Location"
                  value={spotForm.location}
                  onChange={(e) => setSpotForm({ ...spotForm, location: e.target.value })}
                  required
                />
                <input
                  type="number"
                  placeholder="Car Slots"
                  value={spotForm.car_slots}
                  onChange={(e) => setSpotForm({ ...spotForm, car_slots: e.target.value })}
                  required
                />
                <input
                  type="number"
                  placeholder="Bike Slots"
                  value={spotForm.bike_slots}
                  onChange={(e) => setSpotForm({ ...spotForm, bike_slots: e.target.value })}
                  required
                />
                <input
                  type="number"
                  placeholder="Car Cost per Hour"
                  value={spotForm.car_cost}
                  onChange={(e) => setSpotForm({ ...spotForm, car_cost: e.target.value })}
                  required
                />
                <input
                  type="number"
                  placeholder="Bike Cost per Hour"
                  value={spotForm.bike_cost}
                  onChange={(e) => setSpotForm({ ...spotForm, bike_cost: e.target.value })}
                  required
                />
                <label>
                  <input
                    type="checkbox"
                    checked={spotForm.full_time}
                    onChange={(e) => setSpotForm({ ...spotForm, full_time: e.target.checked })}
                  />
                  24/7 Availability
                </label>
                {!spotForm.full_time && (
                  <>
                    <input
                      type="time"
                      placeholder="Start Time"
                      value={spotForm.start_time}
                      onChange={(e) => setSpotForm({ ...spotForm, start_time: e.target.value })}
                    />
                    <input
                      type="time"
                      placeholder="End Time"
                      value={spotForm.end_time}
                      onChange={(e) => setSpotForm({ ...spotForm, end_time: e.target.value })}
                    />
                  </>
                )}
                <div className="modal-actions">
                  <button type="submit" className="submit-btn">
                    {editingSpot ? 'Update' : 'Create'}
                  </button>
                  <button type="button" onClick={() => setShowSpotModal(false)} className="cancel-btn">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="parking-spots-list">
          {parkingSpots.map((spot) => (
            <div key={spot._id} className="spot-item">
              <h3>{spot.location}</h3>
              <p>
                <span>Landowner</span>
                <span>{landowners.find(l => l._id === spot.landowner_id)?.full_name || 'Unknown'}</span>
              </p>
              <p>
                <span>Car Slots</span>
                <span>{spot.car_slots}</span>
              </p>
              <p>
                <span>Bike Slots</span>
                <span>{spot.bike_slots}</span>
              </p>
              <p>
                <span>Car Cost</span>
                <span>Rs {spot.car_cost.toFixed(2)}/hr</span>
              </p>
              <p>
                <span>Bike Cost</span>
                <span>Rs {spot.bike_cost.toFixed(2)}/hr</span>
              </p>
              <p>
                <span>Availability</span>
                <span className={`availability-tag ${spot.full_time ? 'full-time' : 'limited-hours'}`}>
                  {spot.full_time ? '24/7' : 'Limited Hours'}
                </span>
              </p>
              <div className="spot-actions">
                <button onClick={() => handleEditSpot(spot)}>Edit</button>
                <button onClick={() => handleDeleteParkingSpot(spot._id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;