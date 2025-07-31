import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { debounce } from 'lodash';
import './AdminDashboard.css';

function AdminSpots() {
  const navigate = useNavigate();
  const location = useLocation();
  const [parkingSpots, setParkingSpots] = useState([]);
  const [landowners, setLandowners] = useState([]);
  const [message, setMessage] = useState('');
  const [filteredSpots, setFilteredSpots] = useState([]);
  const [filters, setFilters] = useState({
    searchTerm: '',
    availability: 'all',
    priceRange: 'all',
    slotsAvailable: 'all'
  });
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState(null);
  const user = JSON.parse(localStorage.getItem('user')) || {};

  const fetchData = async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      // First fetch landowners to ensure we have the data
      const landownersResponse = await axios.get('http://localhost:5000/api/users', {
        headers: { 
          'user-id': user.id,
          'Cache-Control': 'no-cache'
        },
        timeout: 5000
      });
      const landownerUsers = landownersResponse.data.filter(user => user.role === 'landowner');
      setLandowners(landownerUsers);

      // Then fetch parking spots
      const spotsResponse = await axios.get('http://localhost:5000/api/parking-spots', {
        headers: { 
          'user-id': user.id,
          'Cache-Control': 'no-cache'
        },
        timeout: 5000
      });
      setParkingSpots(spotsResponse.data);
      setFilteredSpots(spotsResponse.data);
      
      setLastError(null);
      setMessage('');
    } catch (error) {
      if (!silent) {
        setLastError(error);
        if (!error.code?.includes('ERR_NETWORK')) {
          setMessage('Error loading spots data');
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

  const handleEditSpot = (spot) => {
    // Since this function is called but not defined in the original code,
    // I'll implement a basic version that logs the action.
    // You may want to expand this based on your application's needs.
    console.log(`Editing spot: ${spot._id}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  useEffect(() => {
    if (user.id) {
      fetchData(true); // Initial fetch
      
      const interval = setInterval(() => {
        fetchData(true); // Silent refresh
      }, 30000); // Increased to 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [user.id]);

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

  // Replace the existing filter useEffect with debounced version
  const debouncedFilter = useCallback(
    debounce((filters, spots) => {
      let result = [...spots];
      
      if (filters.searchTerm) {
        result = result.filter(spot => 
          spot.location.toLowerCase().includes(filters.searchTerm.toLowerCase())
        );
      }

      if (filters.availability !== 'all') {
        result = result.filter(spot => 
          filters.availability === 'fulltime' ? spot.full_time : !spot.full_time
        );
      }

      if (filters.priceRange !== 'all') {
        result = result.filter(spot => {
          const maxPrice = Math.max(spot.car_cost, spot.bike_cost);
          switch(filters.priceRange) {
            case 'low': return maxPrice <= 500;
            case 'medium': return maxPrice > 500 && maxPrice <= 1000;
            case 'high': return maxPrice > 1000;
            default: return true;
          }
        });
      }

      if (filters.slotsAvailable !== 'all') {
        result = result.filter(spot => {
          const totalSlots = spot.car_slots + spot.bike_slots;
          return filters.slotsAvailable === 'available' ? totalSlots > 0 : totalSlots === 0;
        });
      }

      setFilteredSpots(result);
    }, 300),
    []
  );

  useEffect(() => {
    debouncedFilter(filters, parkingSpots);
  }, [filters, parkingSpots]);

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
          <h1>Parking Spots Management</h1>
          
          <div className="filter-section">
            <input
              type="text"
              placeholder="Search by location..."
              value={filters.searchTerm}
              onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
              className="search-input"
            />
            <select
              value={filters.availability}
              onChange={(e) => setFilters({ ...filters, availability: e.target.value })}
              className="filter-select"
            >
              <option value="all">All Availability</option>
              <option value="fulltime">24/7 Available</option>
              <option value="limited">Limited Hours</option>
            </select>
            <select
              value={filters.priceRange}
              onChange={(e) => setFilters({ ...filters, priceRange: e.target.value })}
              className="filter-select"
            >
              <option value="all">All Prices</option>
              <option value="low">Budget (≤Rs 500/hr)</option>
              <option value="medium">Standard (Rs 500-1000/hr)</option>
              <option value="high">Premium (&gt;Rs 1000/hr)</option>
            </select>
            <select
              value={filters.slotsAvailable}
              onChange={(e) => setFilters({ ...filters, slotsAvailable: e.target.value })}
              className="filter-select"
            >
              <option value="all">All Slots</option>
              <option value="available">Slots Available</option>
              <option value="full">Fully Occupied</option>
            </select>
          </div>
        </div>

        {message && <div className={`alert ${message.includes('successfully') ? 'success' : 'error'}`}>
          {message}
        </div>}

        <div className="parking-spots-list">
          {filteredSpots.length === 0 ? (
            <div className="empty-state">No parking spots found</div>
          ) : (
            filteredSpots.map((spot) => {
              const landowner = landowners.find(l => l._id === spot.landowner_id);
              const landownerName = landowner ? 
                (landowner.full_name || landowner.username) : 
                'Unknown';
              // Determine availability display
              const availabilityText = spot.full_time ? '24/7' : 
                (spot.start_time && spot.end_time ? 
                  `${spot.start_time} - ${spot.end_time}` : 
                  'Limited Hours');
              return (
                <div key={spot._id} className="spot-item">
                  <h3>{spot.location}</h3>
                  <p>
                    <span>Landowner</span>
                    <span>{landownerName}</span>
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
                      {availabilityText}
                    </span>
                  </p>
                  <div className="spot-actions">
                    <button onClick={() => handleEditSpot(spot)}>Edit</button>
                    <button onClick={() => handleDeleteParkingSpot(spot._id)}>Delete</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminSpots;