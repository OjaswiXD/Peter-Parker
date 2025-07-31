import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

function LandownerDashboard() {
  const [parkingSpots, setParkingSpots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({
    totalSpots: 0,
    totalBookings: 0,
    activeBookings: 0,
    revenue: 0
  });
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();

  // Memoize the user object to prevent re-parsing on every render
  const user = useMemo(() => JSON.parse(localStorage.getItem('user')) || {}, []);

  const fetchParkingSpots = async (userId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/parking-spots/landowner/${userId}`);
      setParkingSpots(response.data);
      setStats(prev => ({ ...prev, totalSpots: response.data.length }));
    } catch (error) {
      console.error('Error fetching parking spots:', error);
    }
  };

  const fetchBookings = async (userId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/bookings/landowner/${userId}`);
      setBookings(response.data);
      
      // Calculate statistics
      const totalBookings = response.data.length;
      const activeBookings = response.data.filter(b => b.status === 'confirmed').length;
      const revenue = response.data
        .filter(b => b.status === 'confirmed' || b.status === 'completed')
        .reduce((sum, b) => sum + b.total_cost, 0);
      
      setStats(prev => ({
        ...prev,
        totalBookings,
        activeBookings,
        revenue
      }));
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const fetchNotifications = useCallback(async (id) => {
    try {
      console.log('LandownerDashboard: Fetching notifications for ID:', id);
      const response = await axios.get(`http://localhost:5000/api/notifications/${id}`);
      const fetchedNotifications = response.data;
      console.log('LandownerDashboard: Raw notifications fetched:', fetchedNotifications);
      // Filter notifications to show only booking-related ones with vehicle owner name
      const bookingNotifications = fetchedNotifications.filter(notif => 
        notif.message.toLowerCase().includes('booking') && 
        notif.message.toLowerCase().includes('by')
      );
      console.log('LandownerDashboard: Filtered booking notifications:', bookingNotifications);
      setNotifications(bookingNotifications);
      if (bookingNotifications.length === 0) {
        console.log('LandownerDashboard: No relevant booking notifications found for this landowner.');
      }
    } catch (error) {
      console.error('LandownerDashboard: Error fetching notifications:', error.message);
    }
  }, []);

  useEffect(() => {
    if (!user.id) {
      navigate('/login');
      return;
    }
    fetchParkingSpots(user.id);
    fetchBookings(user.id);
    fetchNotifications(user.id);
  }, [user.id, navigate]); // Depend on user.id to avoid re-renders

  // Add auto-refresh useEffect after the initial useEffect
  useEffect(() => {
    if (user.id) {
      const interval = setInterval(() => {
        fetchParkingSpots(user.id);
        fetchBookings(user.id);
        fetchNotifications(user.id);
      }, 5000); // Refresh every 5 seconds
      
      return () => clearInterval(interval);
    }
  }, [user.id, fetchParkingSpots, fetchBookings, fetchNotifications]);

  const markNotificationAsRead = async (notificationId) => {
    try {
      console.log('LandownerDashboard: Marking notification as read:', notificationId);
      const response = await axios.put(`http://localhost:5000/api/notifications/${notificationId}/read`);
      console.log('LandownerDashboard: Notification marked as read:', response.data);
      setNotifications((prevNotifications) =>
        prevNotifications.filter((notif) => notif._id !== notificationId)
      );
    } catch (error) {
      console.error('LandownerDashboard: Error marking notification as read:', error.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  const toggleProfileMenu = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  return (
    <div style={{ paddingTop: '60px' }}>
      <nav
        style={{
          backgroundColor: 'black',
          color: 'white',
          padding: '10px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          height: '60px',
          boxShadow: '0 2px 5px rgba(0, 0, 0, 0.3)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <Link to="/">
            <img
              src="http://localhost:3000/Logo.png"
              alt="Peter Parker Parking Logo"
              style={{ height: '40px' }}
            />
          </Link>
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <Link to="/landowner-home" style={{ color: 'red', textDecoration: 'none' }}>
            Home
          </Link>
          <Link to="/landowner-dashboard" style={{ color: 'red', textDecoration: 'none' }}>
            Dashboard
          </Link>
          <div className="notification-container">
            <button onClick={toggleNotifications} className="notification-bell-btn">
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
                  <p className="no-notifications">No relevant booking notifications at the moment.</p>
                )}
              </div>
            )}
          </div>
          <div className="profile-menu-container" style={{ position: 'relative' }}>
            <button 
              onClick={toggleProfileMenu}
              style={{
                background: 'none',
                border: 'none',
                color: 'red',
                cursor: 'pointer',
                padding: '5px'
              }}
            >
              <i className="fas fa-bars" style={{ fontSize: '1.2rem' }}></i>
            </button>
            {showProfileMenu && (
              <div style={{
                position: 'absolute',
                top: '40px',
                right: '0',
                backgroundColor: 'white',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                borderRadius: '8px',
                padding: '10px',
                minWidth: '200px',
                zIndex: 1001
              }}>
                <div style={{ 
                  padding: '10px', 
                  borderBottom: '1px solid #eee',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: '#f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <i className="fas fa-user" style={{ color: '#666' }}></i>
                  </div>
                  <div>
                    <div style={{ fontWeight: 'bold', color: '#333' }}>{user.full_name || user.username}</div>
                    <div style={{ fontSize: '0.8rem', color: '#666' }}>{user.email || user.gmail}</div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px',
                    textAlign: 'left',
                    border: 'none',
                    background: 'none',
                    color: '#ff4444',
                    cursor: 'pointer',
                    fontSize: '1rem'
                  }}
                >
                  <i className="fas fa-sign-out-alt" style={{ marginRight: '10px' }}></i>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
      
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', color: '#8B0000', marginBottom: '30px' }}>Landowner Dashboard</h1>
        
        {/* Statistics Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '20px',
          marginBottom: '40px' 
        }}>
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#fff', 
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <h3>Total Spots</h3>
            <p style={{ fontSize: '24px', color: '#8B0000' }}>{stats.totalSpots}</p>
          </div>
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <h3>Total Bookings</h3>
            <p style={{ fontSize: '24px', color: '#008000' }}>{stats.totalBookings}</p>
          </div>
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <h3>Active Bookings</h3>
            <p style={{ fontSize: '24px', color: '#0000FF' }}>{stats.activeBookings}</p>
          </div>
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <h3>Total Revenue</h3>
            <p style={{ fontSize: '24px', color: '#008000' }}>Rs {stats.revenue.toFixed(2)}</p>
          </div>
        </div>

        {/* Parking Spots Summary */}
        <h2 style={{ marginBottom: '20px' }}>Your Parking Spots</h2>
        <div style={{ overflowX: 'auto', marginBottom: '40px' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            backgroundColor: '#fff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Location</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Car Slots</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Bike Slots</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Car Cost/hr</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Bike Cost/hr</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {parkingSpots.map(spot => (
                <tr key={spot._id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>{spot.location}</td>
                  <td style={{ padding: '12px' }}>{spot.car_slots}</td>
                  <td style={{ padding: '12px' }}>{spot.bike_slots}</td>
                  <td style={{ padding: '12px' }}>Rs {spot.car_cost.toFixed(2)}</td>
                  <td style={{ padding: '12px' }}>Rs {spot.bike_cost.toFixed(2)}</td>
                  <td style={{ padding: '12px' }}>{spot.available ? 'Available' : 'Unavailable'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recent Bookings */}
        <h2 style={{ marginBottom: '20px' }}>Recent Bookings</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ 
            width: '100%', 
            borderCollapse: 'collapse', 
            backgroundColor: '#fff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <thead>
              <tr style={{ backgroundColor: '#f5f5f5' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Location</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Customer</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Vehicle Type</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Duration</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(booking => (
                <tr key={booking._id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>{booking.parking_spot_id.location}</td>
                  <td style={{ padding: '12px' }}>{booking.vehicle_owner_id.username}</td>
                  <td style={{ padding: '12px' }}>{booking.vehicle_type}</td>
                  <td style={{ padding: '12px' }}>
                    {new Date(booking.start_time).toLocaleDateString()} - {new Date(booking.end_time).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px' }}>{booking.status}</td>
                  <td style={{ padding: '12px' }}>Rs {booking.total_cost.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default LandownerDashboard;