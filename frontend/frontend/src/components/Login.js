import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
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
      className="container"
      style={{
        background: `url('http://localhost:3000/Web.png') no-repeat center center fixed`,
        backgroundSize: 'cover'
      }}
    >
      <div className="login-content">
        <form onSubmit={handleSubmit}>
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
          <p style={{ marginTop: '20px', textAlign: 'center' }}>
            Don't have an account? Register as a{' '}
            <Link to="/register/vehicle-owner" style={{ color: '#ca1d2a', textDecoration: 'underline' }}>
              Vehicle Owner
            </Link>{' '}
            or{' '}
            <Link to="/register/landowner" style={{ color: '#ca1d2a', textDecoration: 'underline' }}>
              Landowner
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default Login;