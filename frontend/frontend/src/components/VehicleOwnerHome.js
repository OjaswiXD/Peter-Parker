import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import './VehicleOwnerHome.css';
import Map from './Map';

function VehicleOwnerHome() {
  const [location, setLocation] = useState('');
  const [parkingSpots, setParkingSpots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [message, setMessage] = useState('');
  const [bookingData, setBookingData] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mapCenter, setMapCenter] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const navigate = useNavigate();

  // Memoize the user object to prevent re-parsing on every render
  const user = useMemo(() => JSON.parse(localStorage.getItem('user')) || {}, []);

  const fetchBookings = useCallback(async (id) => {
    try {
      console.log('VehicleOwnerHome: Fetching bookings for ID:', id);
      const response = await axios.get(`http://localhost:5000/api/bookings/vehicle-owner/${id}`);
      console.log('VehicleOwnerHome: Bookings fetched:', response.data);
      setBookings(response.data);
    } catch (error) {
      console.error('VehicleOwnerHome: Error fetching bookings:', error.message);
      setMessage('Error fetching your bookings: ' + error.message);
    }
  }, []);

  // Update the fetchNotifications function to handle errors better
  const fetchNotifications = useCallback(async (id) => {
    if (!id) return; // Add early return if no ID
    try {
      const response = await axios.get(`http://localhost:5000/api/notifications/${id}`);
      if (response.data && Array.isArray(response.data)) { // Validate response data
        setNotifications(response.data);
      } else {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]); // Reset on error
    }
  }, []);

  // Update the useEffect for initial data loading
  useEffect(() => {
    const currentUser = localStorage.getItem('user');
    if (!currentUser) {
      navigate('/login');
      return;
    }
    
    const userData = JSON.parse(currentUser);
    if (!userData.id) {
      navigate('/login');
      return;
    }

    fetchBookings(userData.id);
    fetchNotifications(userData.id);
  }, [navigate, fetchBookings, fetchNotifications]);

  // Update the auto-refresh useEffect
  useEffect(() => {
    const currentUser = localStorage.getItem('user');
    if (!currentUser) return;

    const userData = JSON.parse(currentUser);
    if (!userData.id) return;

    const interval = setInterval(() => {
      fetchBookings(userData.id);
      fetchNotifications(userData.id);
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchBookings, fetchNotifications]);

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      const trimmedLocation = location.trim();
      console.log('VehicleOwnerHome: Searching for location:', trimmedLocation);
      const response = await axios.get('http://localhost:5000/api/parking-spots', {
        params: { location: trimmedLocation }
      });
      setParkingSpots(response.data);
      const initialBookingData = {};
      response.data.forEach(spot => {
        if (spot && spot._id) {
          initialBookingData[spot._id] = {
            vehicle_type: 'car',
            start_time: '',
            end_time: ''
          };
        }
      });
      console.log('VehicleOwnerHome: Initialized booking data:', initialBookingData);
      setBookingData(initialBookingData);
      if (response.data.length === 0) {
        setMessage('No parking spots found for this location.');
      } else {
        setMessage('');
      }
    } catch (error) {
      setMessage('Error fetching parking spots: ' + error.message);
    }
  };

  const handleBookingChange = (e, spotId) => {
    const { name, value } = e.target;
    console.log('VehicleOwnerHome: Changing booking data for spot:', spotId, 'Field:', name, 'Value:', value);
    setBookingData(prev => {
      const updatedData = {
        ...prev,
        [spotId]: {
          ...prev[spotId],
          [name]: value
        }
      };
      console.log('VehicleOwnerHome: Updated booking data:', updatedData);
      return updatedData;
    });
  };

  const handleBook = async (e, spotId) => {
    e.preventDefault();
    console.log('Booking attempt started');
    if (!user || !user.id) {
      setMessage('Please login to book a spot');
      return;
    }
    const spotBooking = bookingData[spotId];
    if (!spotBooking?.start_time || !spotBooking?.end_time) {
      setMessage('Please select both start and end times');
      return;
    }
    const startTime = new Date(spotBooking.start_time);
    const endTime = new Date(spotBooking.end_time);
    const now = new Date();
    // Simplified time validation
    if (startTime < now) {
      setMessage('Please select a future start time');
      return;
    }
    if (endTime <= startTime) {
      setMessage('End time must be after start time');
      return;
    }
    try {
      console.log('Sending booking request...');
      const payload = {
        parking_spot_id: spotId,
        vehicle_owner_id: user.id,
        vehicle_type: spotBooking.vehicle_type,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString()
      };
      const response = await axios.post('http://localhost:5000/api/bookings', payload);
      console.log('Booking response:', response.data);
      setMessage('Booking successful!');
      // Immediately fetch updated bookings
      await fetchBookings(user.id);
      await fetchNotifications(user.id);
      // Reset form and refresh data
      setBookingData(prev => ({
        ...prev,
        [spotId]: {
          vehicle_type: 'car',
          start_time: '',
          end_time: ''
        }
      }));
    } catch (error) {
      console.error('Booking error:', error);
      setMessage(error.response?.data?.message || 'Booking failed. Please try again.');
    }
  };

  const handleCancelBooking = async (bookingId) => {
    try {
      console.log('VehicleOwnerHome: Cancelling booking ID:', bookingId);
      const response = await axios.put(`http://localhost:5000/api/bookings/${bookingId}`, { status: 'cancelled' });
      console.log('VehicleOwnerHome: Cancel booking response:', response.data);
      setMessage(response.data.message);
      fetchBookings(user.id);
      fetchNotifications(user.id);
    } catch (error) {
      console.error('VehicleOwnerHome: Error cancelling booking:', error.message);
      setMessage(error.response?.data?.message || 'Error cancelling booking');
    }
  };

  const handleLogout = () => {
    console.log('VehicleOwnerHome: Logging out');
    setShowProfileMenu(false); // Close profile menu on logout
    localStorage.removeItem('user');
    navigate('/');
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  const toggleProfileMenu = () => {
    console.log('VehicleOwnerHome: Toggling profile menu, user:', user);
    setShowProfileMenu(!showProfileMenu);
  };

  const handleLocationSelect = async (coords) => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json&accept-language=en`
      );
      const placeName = response.data.display_name || 'Unknown location';
      setLocation(placeName);
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      setLocation('Unknown location');
    }
  };

  const handleCenterChange = async (coords) => {
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json&accept-language=en`
      );
      const placeName = response.data.display_name || 'Unknown location';
      setLocation(placeName);
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      setLocation('Unknown location');
    }
  };

  const handleSearchLocation = async (e) => {
    e.preventDefault();
    if (!location) {
      setMessage('Please enter a location to search.');
      return;
    }
    try {
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1&accept-language=en`
      );
      if (response.data.length === 0) {
        setMessage('Location not found. Please try a different search.');
        return;
      }
      const { lat, lon } = response.data[0];
      setMapCenter([parseFloat(lat), parseFloat(lon)]);
    } catch (error) {
      console.error('Error geocoding location:', error);
      setMessage('Error searching for location. Please try again.');
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      await axios.put(`http://localhost:5000/api/notifications/${notificationId}/read`);
      setNotifications(prevNotifications => 
        prevNotifications.filter(notif => notif._id !== notificationId)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <div className="vehicle-owner-home" style={{ paddingTop: '60px' }}>
      {/* Navigation Bar */}
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

      {/* Map and Search Section */}
      <section className="map-section">
        <div className="map-container">
          <Map
            onLocationSelect={handleLocationSelect}
            onCenterChange={handleCenterChange}
            centerPosition={mapCenter}
          />
        </div>
        <form onSubmit={handleSearchLocation} className="search-form" style={{ position: 'relative', zIndex: 2 }}>
          <div className="form-field">
            <label>Search by Location</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Downtown"
            />
          </div>
          <button type="submit" className="search-btn">Search Location on Map</button>
          <button type="button" onClick={handleSearch} className="search-btn" style={{ marginLeft: '10px' }}>
            Search Spots
          </button>
        </form>
      </section>

      {/* Parking Spots Section */}
      <section className="parking-spots">
        <h2>Available Spots</h2>
        {parkingSpots.length > 0 ? (
          <div className="spots-grid">
            {parkingSpots.map((spot) => spot && (
              <div key={spot._id} className="spot-card">
                <h3>{spot.location}</h3>
                <p>Owner: {spot.landowner_id?.full_name || 'N/A'}</p>
                <p>Contact: {spot.landowner_id?.phone_number || 'N/A'}</p>
                <p>Address: {spot.landowner_id?.contact_address || 'N/A'}</p>
                <p>Cars: {spot.car_slots} (Rs {spot.car_cost.toFixed(2)}/hr)</p>
                <p>Bikes: {spot.bike_slots} (Rs {spot.bike_cost.toFixed(2)}/hr)</p>
                <p>Hours: {spot.full_time ? '24/7' : `${spot.start_time} - ${spot.end_time}`}</p>
                <p>Status: {spot.available ? 'Available' : 'Unavailable'}</p>
                {spot.available && (
                  <form onSubmit={(e) => handleBook(e, spot._id)} className="booking-form">
                    <div className="form-field">
                      <label>Vehicle Type</label>
                      <select
                        name="vehicle_type"
                        value={bookingData[spot._id]?.vehicle_type || 'car'}
                        onChange={(e) => handleBookingChange(e, spot._id)}
                        required
                      >
                        <option value="car">Car</option>
                        <option value="bike">Bike</option>
                      </select>
                    </div>
                    <div className="form-field">
                      <label>Start Time</label>
                      <input
                        type="datetime-local"
                        name="start_time"
                        value={bookingData[spot._id]?.start_time || ''}
                        onChange={(e) => handleBookingChange(e, spot._id)}
                        required
                      />
                    </div>
                    <div className="form-field">
                      <label>End Time</label>
                      <input
                        type="datetime-local"
                        name="end_time"
                        value={bookingData[spot._id]?.end_time || ''}
                        onChange={(e) => handleBookingChange(e, spot._id)}
                        required
                      />
                    </div>
                    <button type="submit" className="book-btn">
                      Book Now
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No spots found—try a new search!</p>
        )}
      </section>

      {/* Bookings Section */}
      <section className="bookings">
        <h2>Your Bookings</h2>
        {bookings.length > 0 ? (
          <div className="bookings-grid">
            {bookings.map((booking) => (
              <div key={booking._id} className="booking-card">
                <p>Location: {booking.parking_spot_id?.location || 'Spot unavailable'}</p>
                <p>Vehicle: {booking.vehicle_type}</p>
                <p>Start: {new Date(booking.start_time).toLocaleString()}</p>
                <p>End: {new Date(booking.end_time).toLocaleString()}</p>
                <p>Cost: Rs {booking.total_cost.toFixed(2)}</p>
                <p>Status: {booking.status}</p>
                {(booking.status === 'pending' || booking.status === 'confirmed') && (
                  <button
                    onClick={() => handleCancelBooking(booking._id)}
                    className="cancel-btn"
                  >
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state">No bookings yet—hit the streets!</p>
        )}
      </section>
    </div>
  );
}

export default VehicleOwnerHome;