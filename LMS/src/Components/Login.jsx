import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import LMSImage from '../assets/LMS.png'; 
import { getUsers } from '../db'; 
import './Login.css'; 

// --- RJSF IMPORTS ---
import Form from '@rjsf/core';
import validator from '@rjsf/validator-ajv8';

// ==============================
// 1. SCHEMA
// ==============================
const loginSchema = {
  type: "object",
  required: ["username", "password"],
  properties: {
    username: { type: "string", title: "Username" },
    password: { type: "string", title: "Password", minLength: 1 }
  }
};

// ==============================
// 2. UI SCHEMA (Modern Configuration)
// ==============================
const loginUiSchema = {
  "ui:submitButtonOptions": { norender: true },
  
  username: {
    "ui:placeholder": "Enter your username",
    "ui:classNames": "modern-input-group", 
    "ui:autofocus": true
  },
  
  password: {
    "ui:widget": "password",
    "ui:placeholder": "Enter your password",
    "ui:classNames": "modern-input-group"
  }
};

const Login = ({ setUser }) => {
  const [dbUsers, setDbUsers] = useState([]); 
  const navigate = useNavigate();

  useEffect(() => {
    const loadUsers = async () => {
      const users = await getUsers();
      setDbUsers(users);
    };
    loadUsers();
  }, []);

  const handleRJSFSubmit = ({ formData }) => {
    const foundUser = dbUsers.find(
      u => u.username === formData.username && u.password === formData.password
    );

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
      
      {/* LEFT PANE (Image & Gradient) */}
      <div className="left-pane">
        <div className="glass-overlay">
          <img src={LMSImage} alt="Library" className="hero-image" />
          <div className="welcome-text">
            <h2>Library Management System</h2>
            <p>Read.Learn.Grow</p>
          </div>
        </div>
      </div>
      
      {/* RIGHT PANE (Form) */}
      <div className="right-pane">
        <div className="login-card">
          <div className="login-header">
            <h1 className="brand-logo">LMS</h1>
            <h3>Welcome Back</h3>
            <p className="subtitle">Please enter your details to sign in.</p>
          </div>

          <Form 
            schema={loginSchema}
            uiSchema={loginUiSchema}
            validator={validator}
            onSubmit={handleRJSFSubmit}
            className="rjsf-pro-form"
          >
            <div className="form-footer">
              <Link to="/forgot" className="forgot-link">Forgot Password?</Link>
              <button type="submit" className="pro-login-btn">Log In</button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
};

export default Login;