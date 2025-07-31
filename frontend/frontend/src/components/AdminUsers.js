import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { debounce } from 'lodash';
import './AdminDashboard.css';

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState(null);
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const navigate = useNavigate();
  const location = useLocation();

  // Update filters to more practical options
  const [filters, setFilters] = useState({
    searchTerm: '',
    role: 'all',
    accountStatus: 'all'  // renamed from status
  });

  const fetchUsers = async (silent = false) => {
    if (!silent) setIsLoading(true);
    let retryCount = 0;
    const maxRetries = 3;
    const attemptFetch = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/users', {
          headers: { 
            'user-id': user.id,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          },
          timeout: 5000
        });
        setUsers(response.data);
        setFilteredUsers(response.data);
        setLastError(null);
        setMessage('');
      } catch (error) {
        if (retryCount < maxRetries && error.code === 'ERR_NETWORK') {
          retryCount++;
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          return attemptFetch();
        }
        if (!silent) {
          setLastError(error);
          if (!error.code?.includes('ERR_NETWORK')) {
            setMessage('Error loading users');
          }
        }
      }
    };
    await attemptFetch();
    if (!silent) setIsLoading(false);
  };

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/admin/notifications', {
        headers: { 
          'user-id': user.id,
          'Cache-Control': 'no-cache'
        },
        timeout: 5000
      });
      if (response.status === 200) {
        setNotifications(response.data);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        // Endpoint not found, silently fail
        console.warn('Notifications endpoint not available');
      } else if (!error.code?.includes('ERR_NETWORK')) {
        console.error('Error fetching notifications:', error);
      }
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

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await axios.delete(`http://localhost:5000/api/users/${userId}`, {
          headers: { 'user-id': user.id }
        });
        setUsers(users.filter(u => u._id !== userId));
        setMessage('User deleted successfully');
      } catch (error) {
        setMessage(error.response?.data?.message || 'Error deleting user');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Modify the auto-refresh useEffect
  useEffect(() => {
    if (user.id) {
      fetchUsers(true); // Initial fetch
      
      const interval = setInterval(() => {
        fetchUsers(true); // Silent refresh
      }, 30000); // Increased to 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [user.id]);

  // Add this useEffect for notifications auto-refresh
  useEffect(() => {
    if (user.id) {
      fetchNotifications();
      const notificationInterval = setInterval(() => {
        fetchNotifications();
      }, 15000); // Check for new notifications every 15 seconds
      
      return () => clearInterval(notificationInterval);
    }
  }, [user.id, fetchNotifications]);

  // Add session persistence useEffect
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

  // Add this to handle notification click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifications && !event.target.closest('.notification-container')) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  // Replace the existing filter useEffect with this debounced version
  const debouncedFilter = useCallback(
    debounce((filters, users) => {
      let result = [...users];
      
      if (filters.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase();
        result = result.filter(user => 
          (user.full_name && user.full_name.toLowerCase().includes(searchTerm)) ||
          user.username.toLowerCase().includes(searchTerm) ||
          (user.email && user.email.toLowerCase().includes(searchTerm)) ||
          (user.phone_number && user.phone_number.includes(searchTerm))
        );
      }

      if (filters.role !== 'all') {
        result = result.filter(user => user.role === filters.role);
      }

      if (filters.accountStatus !== 'all') {
        result = result.filter(user => {
          if (filters.accountStatus === 'active') {
            return user.isActive !== false;
          }
          return user.isActive === false;
        });
      }

      setFilteredUsers(result);
    }, 300), // 300ms delay
    []
  );

  useEffect(() => {
    debouncedFilter(filters, users);
  }, [filters, users]);

  return (
    <div className="admin-dashboard">
      {isLoading && <div className="loading-overlay">Loading...</div>}
      <nav className="admin-navbar">
        <div className="navbar-brand">
          <Link to="/admin/dashboard">
            <img src="http://localhost:3000/Logo.png" alt="Logo" className="navbar-logo" />
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
          <h1>User Management</h1>
          
          <div className="filter-section">
            <input
              type="text"
              placeholder="Search by name, username, email, or phone..."
              value={filters.searchTerm}
              onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
              className="search-input"
            />
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              className="filter-select"
            >
              <option value="all">All Roles</option>
              <option value="vehicle_owner">Vehicle Owner</option>
              <option value="landowner">Landowner</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={filters.accountStatus}
              onChange={(e) => setFilters({ ...filters, accountStatus: e.target.value })}
              className="filter-select"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {message && <div className={`alert ${message.includes('successfully') ? 'success' : 'error'}`}>
          {message}
        </div>}

        <div className="users-grid">
          {filteredUsers.length === 0 ? (
            <div className="empty-state">No users found</div>
          ) : (
            filteredUsers.map(user => (
              <div key={user._id} className="user-card">
                <h3>{user.full_name || user.username}</h3>
                <p>
                  <span>Username</span>
                  <span>{user.username}</span>
                </p>
                <p>
                  <span>Email</span>
                  <span>{user.email || 'N/A'}</span>
                </p>
                <p>
                  <span>Phone</span>
                  <span>{user.phone_number || 'N/A'}</span>
                </p>
                <p>
                  <span>Role</span>
                  <span className={`role-tag ${user.role}`}>{user.role}</span>
                </p>
                <div className="user-actions">
                  <button 
                    onClick={() => handleDeleteUser(user._id)}
                    className="delete-btn"
                  >
                    Delete User
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminUsers;