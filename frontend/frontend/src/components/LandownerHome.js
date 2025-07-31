import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import './LandownerHome.css';
import Map from './Map';

function LandownerHome() {
  const [formData, setFormData] = useState({
    location: '',
    car_slots: '',
    bike_slots: '',
    car_cost: '',
    bike_cost: '',
    full_time: false,
    start_time: '',
    end_time: '',
    latitude: '',
    longitude: ''
  });
  const [parkingSpots, setParkingSpots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [message, setMessage] = useState('');
  const [landownerId, setLandownerId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mapCenter, setMapCenter] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();

  // Update user state management
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : {};
  });

  const handleLogout = () => {
    console.log('LandownerHome: Logout button clicked');
    setShowProfileMenu(false);
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleSubmit = async (e) => {
    console.log('LandownerHome: List Spot button clicked');
    e.preventDefault();
    
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (!storedUser || !storedUser.id || storedUser.role !== 'landowner') {
      setMessage('Please log in as a landowner to list a parking spot.');
      navigate('/');
      return;
    }
    
    if (!formData.latitude || !formData.longitude) {
      setMessage('Please select a location on the map.');
      return;
    }

    const spotData = {
      landowner_id: storedUser.id,
      location: formData.location,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      car_slots: parseInt(formData.car_slots),
      bike_slots: parseInt(formData.bike_slots),
      car_cost: parseFloat(formData.car_cost),
      bike_cost: parseFloat(formData.bike_cost),
      full_time: formData.full_time,
      start_time: formData.full_time ? '00:00' : formData.start_time,
      end_time: formData.full_time ? '23:59' : formData.end_time,
      available: true
    };

    try {
      console.log('Sending parking spot data:', spotData);
      const response = await axios.post('http://localhost:5000/api/parking-spots', spotData);
      setMessage(response.data.message);
      setFormData({
        location: '',
        car_slots: '',
        bike_slots: '',
        car_cost: '',
        bike_cost: '',
        full_time: false,
        start_time: '',
        end_time: '',
        latitude: '',
        longitude: ''
      });
      setMapCenter(null);
      fetchParkingSpots(landownerId);
    } catch (error) {
      console.error('Error details:', error.response?.data);
      setMessage(error.response?.data?.message || 'Error listing parking spot: ' + error.message);
    }
  };

  const handleUpdateBookingStatus = async (bookingId, status) => {
    console.log(`LandownerHome: handleUpdateBookingStatus called with bookingId: ${bookingId}, status: ${status}`);
    try {
      const response = await axios.put(`http://localhost:5000/api/bookings/${bookingId}`, { status });
      console.log('LandownerHome: Update booking response:', response.data);
      setMessage(response.data.message);
      fetchBookings(landownerId);
      fetchNotifications(landownerId);
    } catch (error) {
      console.error('LandownerHome: Error updating booking status:', error.message);
      setMessage(error.response?.data?.message || 'Error updating booking status');
    }
  };

  // Add user validation to fetchNotifications
  const fetchNotifications = async (id) => {
    if (!id) return;
    try {
      const storedUser = localStorage.getItem('user');
      const currentUser = storedUser ? JSON.parse(storedUser) : null;
      
      if (!currentUser || currentUser.id !== id) {
        console.log('User mismatch, skipping notification fetch');
        return;
      }

      console.log('LandownerHome: Fetching notifications for ID:', id);
      const response = await axios.get(`http://localhost:5000/api/notifications/${id}`);
      const fetchedNotifications = response.data;
      console.log('LandownerHome: Raw notifications fetched:', fetchedNotifications);
      
      if (Array.isArray(fetchedNotifications)) {
        const bookingNotifications = fetchedNotifications.filter(notif => 
          notif.message.toLowerCase().includes('booking') && 
          notif.message.toLowerCase().includes('by')
        );
        console.log('LandownerHome: Filtered booking notifications:', bookingNotifications);
        setNotifications(bookingNotifications);
        if (bookingNotifications.length === 0) {
          console.log('LandownerHome: No relevant booking notifications found for this landowner.');
        }
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('LandownerHome: Error fetching notifications:', error.message);
      setMessage('Error fetching notifications: ' + error.message);
      setNotifications([]);
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    console.log('LandownerHome: Dismiss button clicked for notification:', notificationId);
    try {
      console.log('LandownerHome: Marking notification as read:', notificationId);
      const response = await axios.put(`http://localhost:5000/api/notifications/${notificationId}/read`);
      console.log('LandownerHome: Notification marked as read:', response.data);
      setNotifications((prevNotifications) =>
        prevNotifications.filter((notif) => notif._id !== notificationId)
      );
    } catch (error) {
      console.error('LandownerHome: Error marking notification as read:', error.message);
      console.error('LandownerHome: Error details:', error.response?.data);
      setMessage(error.response?.data?.message || 'Error dismissing notification: ' + error.message);
    }
  };

  const toggleNotifications = () => {
    console.log('LandownerHome: Notification bell clicked, toggling dropdown');
    setShowNotifications(!showNotifications);
  };

  const toggleProfileMenu = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  const handleSearchLocation = async (e) => {
    console.log('LandownerHome: Search Location button clicked');
    e.preventDefault();
    if (!formData.location) {
      setMessage('Please enter a location to search.');
      return;
    }
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(formData.location)}&format=json&limit=1&accept-language=en`
      );
      if (response.data.length === 0) {
        setMessage('Location not found. Please try a different search.');
        return;
      }
      const { lat, lon } = response.data[0];
      setMapCenter([parseFloat(lat), parseFloat(lon)]);
      setFormData({
        ...formData,
        latitude: parseFloat(lat),
        longitude: parseFloat(lon)
      });
    } catch (error) {
      console.error('Error geocoding location:', error);
      setMessage('Error searching for location. Please try again.');
    }
  };

  // Update the main useEffect
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/');
      return;
    }

    const userData = JSON.parse(storedUser);
    if (!userData.id || userData.role !== 'landowner') {
      navigate('/');
      return;
    }

    setUser(userData);
    setLandownerId(userData.id);
    fetchParkingSpots(userData.id);
    fetchBookings(userData.id);
    fetchNotifications(userData.id);
  }, [navigate]);

  // Update the auto-refresh useEffect
  useEffect(() => {
    if (!landownerId) return;

    const storedUser = localStorage.getItem('user');
    if (!storedUser) return;

    const userData = JSON.parse(storedUser);
    if (userData.id !== landownerId) return;

    const interval = setInterval(() => {
      fetchParkingSpots(landownerId);
      fetchBookings(landownerId);
      fetchNotifications(landownerId);
    }, 5000);

    return () => clearInterval(interval);
  }, [landownerId]);

  const fetchParkingSpots = async (id) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/parking-spots/landowner/${id}`);
      setParkingSpots(response.data);
    } catch (error) {
      setMessage('Error fetching your parking spots: ' + error.message);
    }
  };

  const fetchBookings = async (id) => {
    try {
      const response = await axios.get(`http://localhost:5000/api/bookings/landowner/${id}`);
      setBookings(response.data);
    } catch (error) {
      setMessage('Error fetching bookings: ' + error.message);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleLocationSelect = async (coords) => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json&accept-language=en`
      );
      const placeName = response.data.display_name || 'Unknown location';
      setFormData({
        ...formData,
        latitude: coords.latitude,
        longitude: coords.longitude,
        location: placeName
      });
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      setFormData({
        ...formData,
        latitude: coords.latitude,
        longitude: coords.longitude,
        location: 'Unknown location'
      });
    }
  };

  const handleCenterChange = async (coords) => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json&accept-language=en`
      );
      const placeName = response.data.display_name || 'Unknown location';
      setFormData({
        ...formData,
        latitude: coords.latitude,
        longitude: coords.longitude,
        location: placeName
      });
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      setFormData({
        ...formData,
        latitude: coords.latitude,
        longitude: coords.longitude,
        location: 'Unknown location'
      });
    }
  };

  const handleMapClick = (e) => {
    e.stopPropagation(); // Prevent map clicks from bubbling up
  };

  return (
    <div className="landowner-home" style={{ paddingTop: '60px' }}>
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
                    backgroundColor: 'white',
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

      <div className="hero-section">
        <h1 className="hero-title">Landowner Control Hub</h1>
        <p className="hero-subtitle">Rule the streets with web-slinging precision</p>
      </div>

      <section className="add-spot">
        <h2>List New Parking Spot</h2>
        <form onSubmit={handleSubmit} className="add-spot-form">
          <div className="form-field">
            <label>Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              placeholder="Enter city or address, then search or click on map"
            />
            <button type="button" onClick={handleSearchLocation} className="submit-btn" style={{ marginTop: '10px' }}>
              Search Location
            </button>
          </div>
          <div className="form-field">
            <label>Latitude</label>
            <input
              type="text"
              name="latitude"
              value={formData.latitude}
              onChange={handleChange}
              placeholder="Click on the map to select"
              readOnly
            />
          </div>
          <div className="form-field">
            <label>Longitude</label>
            <input
              type="text"
              name="longitude"
              value={formData.longitude}
              onChange={handleChange}
              placeholder="Click on the map to select"
              readOnly
            />
          </div>
          <div className="map-container" style={{ height: '300px', marginBottom: '20px' }} onClick={handleMapClick}>
            <Map 
              spots={parkingSpots} 
              onLocationSelect={handleLocationSelect} 
              onCenterChange={handleCenterChange}
              centerPosition={mapCenter}
            />
          </div>
          <div className="form-field">
            <label>Car Slots</label>
            <input
              type="number"
              name="car_slots"
              value={formData.car_slots}
              onChange={handleChange}
              required
              placeholder="e.g., 5"
            />
          </div>
          <div className="form-field">
            <label>Bike Slots</label>
            <input
              type="number"
              name="bike_slots"
              value={formData.bike_slots}
              onChange={handleChange}
              required
              placeholder="e.g., 10"
            />
          </div>
          <div className="form-field">
            <label>Car Cost (per hour)</label>
            <input
              type="number"
              name="car_cost"
              value={formData.car_cost}
              onChange={handleChange}
              required
              placeholder="e.g., 8"
            />
          </div>
          <div className="form-field">
            <label>Bike Cost (per hour)</label>
            <input
              type="number"
              name="bike_cost"
              value={formData.bike_cost}
              onChange={handleChange}
              required
              placeholder="e.g., 4"
            />
          </div>
          <div className="form-checkbox">
            <label>
              <input
                type="checkbox"
                name="full_time"
                checked={formData.full_time}
                onChange={handleChange}
              />
              24/7 Availability
            </label>
          </div>
          {!formData.full_time && (
            <>
              <div className="form-field">
                <label>Start Time</label>
                <input
                  type="time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-field">
                <label>End Time</label>
                <input
                  type="time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleChange}
                  required
                />
              </div>
            </>
          )}
          <button type="submit" className="submit-btn">
            List Spot
          </button>
        </form>
        {message && <p className={message.includes('successfully') ? 'success' : 'error'}>{message}</p>}
      </section>

      <section className="parking-spots">
        <h2>Your Parking Spots</h2>
        {parkingSpots.length > 0 ? (
          <div className="spots-grid">
            {parkingSpots.map((spot) => (
              <div key={spot._id} className="spot-card">
                <h3>{spot.location}</h3>
                <p>Latitude: {spot.latitude}</p>
                <p>Longitude: {spot.longitude}</p>
                <p>Cars: {spot.car_slots} (Rs {spot.car_cost.toFixed(2)}/hr)</p>
                <p>Bikes: {spot.bike_slots} (Rs {spot.bike_cost.toFixed(2)}/hr)</p>
                <p>Hours: {spot.full_time ? '24/7' : `${spot.start_time} - ${spot.end_time}`}</p>
                <p>Status: {spot.available ? 'Open' : 'Closed'}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No spots listed yet—get started!</p>
        )}
      </section>

      <section className="bookings">
        <h2>Bookings</h2>
        {bookings.length > 0 ? (
          <div className="bookings-grid">
            {bookings.map((booking) => (
              <div key={booking._id} className="booking-card">
                <p>Location: {booking.parking_spot_id.location}</p>
                <p>By: {booking.vehicle_owner_id.first_name} ({booking.vehicle_owner_id.username})</p>
                <p>Vehicle: {booking.vehicle_type}</p>
                <p>Start: {new Date(booking.start_time).toLocaleString()}</p>
                <p>End: {new Date(booking.end_time).toLocaleString()}</p>
                <p>Cost: Rs {booking.total_cost.toFixed(2)}</p>
                <p>Status: {booking.status}</p>
                {booking.status === 'pending' && (
                  <div className="booking-actions">
                    <button
                      onClick={() => {
                        console.log(`Confirm button clicked for booking ${booking._id}`);
                        handleUpdateBookingStatus(booking._id, 'confirmed');
                      }}
                      className="confirm-btn"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => {
                        console.log(`Cancel button clicked for booking Г ${booking._id}`);
                        handleUpdateBookingStatus(booking._id, 'cancelled');
                      }}
                      className="cancel-btn"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No bookings yet—watch this space!</p>
        )}
      </section>
    </div>
  );
}

export default LandownerHome;