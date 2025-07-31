import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import UserType from './components/UserType';
import Register from './components/Register';
import OwnerRegister from './components/OwnerRegister';
import VehicleOwnerHome from './components/VehicleOwnerHome';
import LandownerHome from './components/LandownerHome';
import AdminDashboard from './components/AdminDashboard';
import Terms from './components/Terms';
import Privacy from './components/Privacy';
import VehicleOwnerDashboard from './components/VehicleOwnerDashboard';
import LandownerDashboard from './components/LandownerDashboard';
import AdminUsers from './components/AdminUsers';
import AdminSpots from './components/AdminSpots';
import AdminBookings from './components/AdminBookings';
import Login from './components/Login';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<UserType />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register/vehicle-owner" element={<Register role="vehicle_owner" />} />
        <Route path="/register/landowner" element={<OwnerRegister />} />
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/spots" element={<AdminSpots />} />
        <Route path="/admin/bookings" element={<AdminBookings />} />
        <Route path="/vehicle-owner-home" element={<VehicleOwnerHome />} />
        <Route path="/landowner-home" element={<LandownerHome />} />
        <Route path="/vehicle-owner-dashboard" element={<VehicleOwnerDashboard />} />
        <Route path="/landowner-dashboard" element={<LandownerDashboard />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
      </Routes>
    </Router>
  );
}

export default App;