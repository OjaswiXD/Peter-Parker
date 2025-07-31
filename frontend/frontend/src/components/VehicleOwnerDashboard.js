import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

function VehicleOwnerDashboard() {
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({
    totalBookings: 0,
    activeBookings: 0,
    completedBookings: 0,
    totalSpent: 0
  });
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();

  // Memoize the user object to prevent re-parsing on every render
  const user = useMemo(() => JSON.parse(localStorage.getItem('user')) || {}, []);

  // Move fetchBookings up, before useEffect
  const fetchBookings = useCallback(async (userId) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/bookings/vehicle-owner/${userId}`);
      setBookings(response.data);
      
      // Calculate statistics
      const totalBookings = response.data.length;
      const activeBookings = response.data.filter(b => b.status === 'confirmed').length;
      const completedBookings = response.data.filter(b => b.status === 'completed').length;
      const totalSpent = response.data
        .filter(b => b.status === 'confirmed' || b.status === 'completed')
        .reduce((sum, b) => sum + b.total_cost, 0);
      
      setStats({
        totalBookings,
        activeBookings,
        completedBookings,
        totalSpent
      });
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  }, []);

  const fetchNotifications = useCallback(async (id) => {
    try {
      console.log('VehicleOwnerDashboard: Fetching notifications for ID:', id);
      const response = await axios.get(`http://localhost:5000/api/notifications/${id}`);
      console.log('VehicleOwnerDashboard: Notifications fetched:', response.data);
      setNotifications(response.data);
    } catch (error) {
      console.error('VehicleOwnerDashboard: Error fetching notifications:', error.message);
    }
  }, []);

  useEffect(() => {
    if (!user.id) {
      navigate('/login');
      return;
    }
    console.log('VehicleOwnerDashboard: User data at render:', user);
    fetchBookings(user.id);
    fetchNotifications(user.id);
  }, [user.id, navigate, fetchBookings, fetchNotifications]);

  // Update the auto-refresh useEffect
  useEffect(() => {
    if (user.id) {
      fetchBookings(user.id);
      fetchNotifications(user.id);
      
      const interval = setInterval(() => {
        fetchBookings(user.id);
        fetchNotifications(user.id);
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [user.id, fetchBookings, fetchNotifications]);

  const markNotificationAsRead = async (notificationId) => {
    try {
      console.log('VehicleOwnerDashboard: Marking notification as read:', notificationId);
      const response = await axios.put(`http://localhost:5000/api/notifications/${notificationId}/read`);
      console.log('VehicleOwnerDashboard: Notification marked as read:', response.data);
      setNotifications((prevNotifications) =>
        prevNotifications.filter((notif) => notif._id !== notificationId)
      );
    } catch (error) {
      console.error('VehicleOwnerDashboard: Error marking notification as read:', error.message);
    }
  };

  const handleLogout = () => {
    setShowProfileMenu(false); // Close profile menu on logout
    localStorage.removeItem('user');
    navigate('/');
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  const toggleProfileMenu = () => {
    console.log('VehicleOwnerDashboard: Toggling profile menu, user:', user);
    setShowProfileMenu(!showProfileMenu);
  };

  return (
    <div style={{ paddingTop: '60px' }}>
      <nav style={{
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
      }}>
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
          <Link to="/vehicle-owner-home" style={{ color: 'red', textDecoration: 'none' }}>
            Home
          </Link>
          <Link to="/vehicle-owner-dashboard" style={{ color: 'red', textDecoration: 'none' }}>
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
                  <p className="no-notifications">No new notifications</p>
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
        <h1 style={{ fontSize: '2rem', color: '#8B0000', marginBottom: '30px' }}>Vehicle Owner Dashboard</h1>
        
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
            <h3>Total Bookings</h3>
            <p style={{ fontSize: '24px', color: '#8B0000' }}>{stats.totalBookings}</p>
          </div>
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <h3>Active Bookings</h3>
            <p style={{ fontSize: '24px', color: '#008000' }}>{stats.activeBookings}</p>
          </div>
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <h3>Completed Bookings</h3>
            <p style={{ fontSize: '24px', color: '#0000FF' }}>{stats.completedBookings}</p>
          </div>
          <div style={{ 
            padding: '20px', 
            backgroundColor: '#fff',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            textAlign: 'center'
          }}>
            <h3>Total Spent</h3>
            <p style={{ fontSize: '24px', color: '#008000' }}>
              Rs {stats.totalSpent.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Booking History */}
        <h2 style={{ marginBottom: '20px' }}>Booking History</h2>
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
                <th style={{ padding: '12px', textAlign: 'left' }}>Vehicle Type</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Duration</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Cost</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(booking => (
                <tr key={booking._id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '12px' }}>
                    {booking.parking_spot_id ? booking.parking_spot_id.location : 'Spot unavailable'}
                  </td>
                  <td style={{ padding: '12px' }}>{booking.vehicle_type}</td>
                  <td style={{ padding: '12px' }}>
                    {new Date(booking.start_time).toLocaleDateString()} - {new Date(booking.end_time).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '12px' }}>{booking.status}</td>
                  <td style={{ padding: '12px' }}>
                    Rs {booking.total_cost.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default VehicleOwnerDashboard;