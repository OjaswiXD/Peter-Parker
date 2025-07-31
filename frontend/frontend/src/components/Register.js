import React, { useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './Register.css';

function Register({ role }) {
  const [formData, setFormData] = useState({
    first_name: '',
    username: '',
    password: ''
  });
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/register', {
        ...formData,
        role
      });
      setMessage(response.data.message);
    } catch (error) {
      setMessage(error.response.data.message);
    }
  };

  return (
    <div
      className="register-container"
      style={{
        background: `url('http://localhost:3000/Web.png') no-repeat center center fixed`,
        backgroundSize: 'cover'
      }}
    >
      <div className="register-content">
        <form onSubmit={handleSubmit}>
          <h2 className="title">
            Register as {role === 'vehicle_owner' ? 'Vehicle Owner' : 'Landowner'}
          </h2>
          <div className="input-div one">
            <div className="i">
              <i className="fas fa-user"></i>
            </div>
            <div className="div">
              <h5>Name</h5>
              <input
                type="text"
                name="first_name"
                className="input"
                value={formData.first_name}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="input-div one">
            <div className="i">
              <i className="fas fa-envelope"></i>
            </div>
            <div className="div">
              <h5>Email</h5>
              <input
                type="email"
                name="username"
                className="input"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <div className="input-div pass">
            <div className="i">
              <i className="fas fa-lock"></i>
            </div>
            <div className="div">
              <h5>Password</h5>
              <input
                type="password"
                name="password"
                className="input"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
          </div>
          <input type="submit" className="btn" value="Register" />
          {message && <p className={message === 'Registration successful' ? 'success' : 'error'}>{message}</p>}
        </form>
        <p className="register-text">
          Already have an account? <Link to="/?login=true" className="link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;