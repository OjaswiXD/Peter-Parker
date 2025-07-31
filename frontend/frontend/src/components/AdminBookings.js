import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { debounce } from 'lodash';
import './AdminBookings.css';

function AdminBookings() {
  const navigate = useNavigate();
  const location = useLocation();
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [message, setMessage] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    vehicleType: 'all',
    dateRange: 'all',
    searchTerm: ''
  });
  const [sortConfig, setSortConfig] = useState({
    key: 'start_time',
    direction: 'desc'
  });
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState(null);

  const user = JSON.parse(localStorage.getItem('user')) || {};

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const fetchBookings = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const response = await axios.get('http://localhost:5000/api/bookings', {
        headers: { 
          'user-id': user.id,
          'Cache-Control': 'no-cache'
        },
        timeout: 5000
      });
      setBookings(response.data);
      setFilteredBookings(response.data);
      setLastError(null);
      setMessage('');
    } catch (error) {
      if (!silent) {
        setLastError(error);
        if (!error.code?.includes('ERR_NETWORK')) {
          setMessage('Error loading bookings');
        }
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/notifications', {
        headers: { 'user-id': user.id }
      });
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [user.id]);

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
    if (user.id) {
      fetchBookings(true);
      fetchNotifications();
      
      const bookingInterval = setInterval(() => {
        fetchBookings(true);
      }, 30000); // 30 seconds for bookings
      
      const notificationInterval = setInterval(() => {
        fetchNotifications();
      }, 15000); // 15 seconds for notifications
      
      return () => {
        clearInterval(bookingInterval);
        clearInterval(notificationInterval);
      };
    }
  }, [user.id, fetchNotifications]);

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

  // Add click outside handler for notifications
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && !event.target.closest('.notification-container')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  const debouncedFilter = useCallback(
    debounce((filters, sortConfig, bookings) => {
      let result = [...bookings];

      // Apply filters
      if (filters.status !== 'all') {
        // Map 'completed' filter to 'cancelled' since we're using 'cancelled' to represent completed bookings
        const statusFilter = filters.status === 'completed' ? 'cancelled' : filters.status;
        result = result.filter(booking => booking.status === statusFilter);
      }
      if (filters.vehicleType !== 'all') {
        result = result.filter(booking => booking.vehicle_type === filters.vehicleType);
      }
      if (filters.dateRange !== 'all') {
        const now = new Date();
        switch (filters.dateRange) {
          case 'today':
            result = result.filter(booking => {
              const bookingDate = new Date(booking.start_time);
              return bookingDate.toDateString() === now.toDateString();
            });
            break;
          case 'week':
            const weekAgo = new Date(now.setDate(now.getDate() - 7));
            result = result.filter(booking => new Date(booking.start_time) >= weekAgo);
            break;
          case 'month':
            const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
            result = result.filter(booking => new Date(booking.start_time) >= monthAgo);
            break;
          default:
            break;
        }
      }
      if (filters.searchTerm) {
        result = result.filter(booking => 
          booking._id.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
          booking.vehicle_type.toLowerCase().includes(filters.searchTerm.toLowerCase())
        );
      }

      // Apply sorting
      result.sort((a, b) => {
        if (sortConfig.key === 'total_cost') {
          return sortConfig.direction === 'asc' 
            ? a[sortConfig.key] - b[sortConfig.key]
            : b[sortConfig.key] - a[sortConfig.key];
        }
        return sortConfig.direction === 'asc'
          ? new Date(a[sortConfig.key]) - new Date(b[sortConfig.key])
          : new Date(b[sortConfig.key]) - new Date(a[sortConfig.key]);
      });

      setFilteredBookings(result);
    }, 300),
    []
  );

  useEffect(() => {
    debouncedFilter(filters, sortConfig, bookings);
  }, [filters, sortConfig, bookings]);

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      // Optimistically update the local state
      const mappedStatus = newStatus === 'completed' ? 'cancelled' : newStatus;
      setFilteredBookings(prevBookings =>
        prevBookings.map(booking =>
          booking._id === bookingId ? { ...booking, status: mappedStatus } : booking
        )
      );

      const response = await axios.put(`http://localhost:5000/api/bookings/${bookingId}`, 
        { 
          status: mappedStatus
        },
        { 
          headers: { 
            'user-id': user.id,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      // Update bookings state with the server response
      setBookings(prevBookings =>
        prevBookings.map(booking =>
          booking._id === bookingId ? response.data.booking : booking
        )
      );
      setMessage('Booking status updated successfully');
    } catch (error) {
      console.error('Error updating booking:', error.response?.data || error.message);
      setMessage(error.response?.data?.message || 'Server error updating booking status');
      // Revert the optimistic update if the request fails
      await fetchBookings();
    }
  };

  // Helper function to display status in the UI
  const displayStatus = (status) => {
    return status === 'cancelled' ? 'Completed' : status;
  };

  return (
    <div className="admin-dashboard">
      {isLoading && <div className="loading-overlay">Loading...</div>}
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
          <h1>Bookings Management</h1>
          <div className="filter-section">
            <input
              type="text"
              placeholder="Search bookings..."
              value={filters.searchTerm}
              onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
              className="search-input"
            />
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="cancelled">Cancelled</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={filters.vehicleType}
              onChange={(e) => setFilters({ ...filters, vehicleType: e.target.value })}
              className="filter-select"
            >
              <option value="all">All Vehicles</option>
              <option value="car">Cars</option>
              <option value="bike">Bikes</option>
            </select>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
              className="filter-select"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>

        {message && <div className={`alert ${message.includes('successfully') ? 'success' : 'error'}`}>
          {message}
        </div>}

        <div className="bookings-stats">
          <div className="stat-card">
            <h3>Total Bookings</h3>
            <p>{bookings.length}</p>
          </div>
          <div className="stat-card">
            <h3>Active Bookings</h3>
            <p>{bookings.filter(b => b.status === 'confirmed').length}</p>
          </div>
          <div className="stat-card">
            <h3>Today's Bookings</h3>
            <p>{bookings.filter(b => new Date(b.start_time).toDateString() === new Date().toDateString()).length}</p>
          </div>
        </div>

        <div className="bookings-grid">
          {filteredBookings.map((booking) => (
            <div key={booking._id} className="booking-card">
              <div className="booking-header">
                <h3>Booking #{booking._id.slice(-6)}</h3>
                <span className={`status-tag ${booking.status.toLowerCase()}`}>
                  {displayStatus(booking.status)}
                </span>
              </div>
              <div className="booking-details">
                <p><strong>Vehicle Type:</strong> {booking.vehicle_type}</p>
                <p><strong>Start Time:</strong> {new Date(booking.start_time).toLocaleString()}</p>
                <p><strong>End Time:</strong> {new Date(booking.end_time).toLocaleString()}</p>
                <p><strong>Duration:</strong> {
                  Math.round((new Date(booking.end_time) - new Date(booking.start_time)) / (1000 * 60 * 60)
                )} hours</p>
                <p><strong>Total Cost:</strong> Rs {booking.total_cost.toFixed(2)}</p>
              </div>
              <div className="booking-actions">
                {booking.status === 'pending' && (
                  <>
                    <button 
                      onClick={() => handleStatusUpdate(booking._id, 'confirmed')}
                      className="confirm-btn"
                    >
                      Confirm
                    </button>
                    <button 
                      onClick={() => handleStatusUpdate(booking._id, 'cancelled')}
                      className="cancel-btn"
                    >
                      Cancel
                    </button>
                  </>
                )}
                {booking.status === 'confirmed' && (
                  <button 
                    onClick={() => {
                      console.log(`Mark as Completed button clicked for booking ${booking._id}`);
                      handleStatusUpdate(booking._id, 'completed');
                    }}
                    className="complete-btn"
                  >
                    Mark as Completed
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default AdminBookings;