import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Added Link here
import './Login.css';
import LMSImage from '../assets/LMS.png'; 
import { getUsers } from '../db'; 

const Login = ({ setUser }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [dbUsers, setDbUsers] = useState([]); 
  const navigate = useNavigate();

  useEffect(() => {
    const loadUsers = async () => {
      const users = await getUsers();
      setDbUsers(users);
    };
    loadUsers();
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    
    const foundUser = dbUsers.find(u => u.username === username && u.password === password);

    if (foundUser) {
      localStorage.setItem('libraryUser', JSON.stringify(foundUser));
      setUser(foundUser);
      navigate('/dashboard');
    } else {
      alert("Invalid Username or Password!");
    }
  };

  return (
    <div className="split-screen">
      <div className="left-pane">
        <img className="book-image" src={LMSImage} alt="Library" />
        <div className="welcome-text">
          <h2>Library Management System</h2>
          <p>Read.Learn.Grow</p>
        </div>
      </div>
      <div className="right-pane">
        <div className="login-box">
          <h2 className="logo-text">LMS</h2>
          <h2 className="form-title">Login</h2>
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label>Username</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            {/* --- FORGOT PASSWORD LINK ADDED HERE --- */}
            <div className="forgot-pass">
              <Link to="/forgot">Forgot Password?</Link>
            </div>

            <button type="submit" className="login-btn">Log In</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;