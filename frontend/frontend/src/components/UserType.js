import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './UserType.css';

function UserType() {
  const navigate = useNavigate();
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Check if URL has login parameter
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.get('login') === 'true') {
      setShowLogin(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/login', {
        username,
        password
      });
      setMessage(response.data.message);
      if (response.data.message === 'Login successful') {
        localStorage.setItem('user', JSON.stringify(response.data.user));
        const role = response.data.user.role;
        if (role === 'admin') {
          navigate('/admin/dashboard'); // Fixed redirection path
        } else if (role === 'vehicle_owner') {
          navigate('/vehicle-owner-home');
        } else if (role === 'landowner') {
          navigate('/landowner-home');
        }
      }
    } catch (error) {
      setMessage(error.response?.data?.message || 'Error logging in');
    }
  };

  return (
    <div
      className="user-type-container"
      style={{
        background: `url('http://localhost:3000/Web.png') no-repeat center center fixed`,
        backgroundSize: 'cover'
      }}
    >
      <div className="content-wrapper">
        <h2>Welcome to Peter Parker Parking</h2>
        <p>Are you a Vehicle Owner or a Landowner?</p>
        <button onClick={() => navigate('/register/vehicle-owner')}>
          Vehicle Owner
        </button>
        <button onClick={() => navigate('/register/landowner')}>
          Landowner
        </button>
        <p style={{ marginTop: '20px' }}>
          Already registered?{' '}
          <span
            onClick={() => setShowLogin(!showLogin)}
            style={{ color: '#ca1d2a', textDecoration: 'underline', cursor: 'pointer' }}
          >
            Login here
          </span>
        </p>
        {showLogin && (
          <div className="login-content" style={{ marginTop: '20px' }}>
            <form onSubmit={handleLogin}>
              <h2 className="title">Welcome</h2>
              <div className="input-div one">
                <div className="i">
                  <i className="fas fa-user"></i>
                </div>
                <div className="div">
                  <h5>Email</h5>
                  <input
                    type="email"
                    className="input"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
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
                    className="input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <input type="submit" className="btn" value="Login" />
              {message && <p style={{ color: message.includes('successful') ? 'green' : 'red' }}>{message}</p>}
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserType;