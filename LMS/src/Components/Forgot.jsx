import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import LMSImage from '../assets/LMS.png'; 
import './Login.css'; // Using existing CSS
import { getUsers, updateUserPasswordDB } from '../db'; 

// --- SWEETALERT2 ---
import Swal from 'sweetalert2';

// --- RJSF IMPORTS ---
import Form from '@rjsf/core';
import validator from '@rjsf/validator-ajv8';

// ==============================
// SCHEMAS (4 STEPS)
// ==============================

// STEP 1: EMAIL
const emailSchema = {
  type: "object",
  required: ["email"],
  properties: {
    email: { type: "string", title: "Email Address", format: "email" }
  }
};

// STEP 2: OTP
const otpSchema = {
  type: "object",
  required: ["otp"],
  properties: {
    otp: { type: "string", title: "Enter OTP", minLength: 4, maxLength: 4 }
  }
};

// STEP 3: USERNAME (NEW STEP)
const usernameSchema = {
  type: "object",
  required: ["username"],
  properties: {
    username: { type: "string", title: "Enter Username to Reset", minLength: 3 }
  }
};

// STEP 4: RESET PASSWORD
const resetSchema = {
  type: "object",
  required: ["newPassword", "confirmPassword"],
  properties: {
    newPassword: { type: "string", title: "New Password", minLength: 4 },
    confirmPassword: { type: "string", title: "Confirm Password", minLength: 4 }
  }
};

// ==============================
// UI SCHEMAS
// ==============================
const commonUiSchema = {
  "ui:submitButtonOptions": { norender: true }
};

const emailUiSchema = {
  ...commonUiSchema,
  email: {
    "ui:placeholder": "Enter your registered email",
    "ui:classNames": "modern-input-group",
    "ui:autofocus": true
  }
};

const otpUiSchema = {
  ...commonUiSchema,
  otp: {
    "ui:placeholder": "Enter 4-digit OTP",
    "ui:classNames": "modern-input-group",
    "ui:autofocus": true
  }
};

const usernameUiSchema = {
  ...commonUiSchema,
  username: {
    "ui:placeholder": "E.g admin or librarian or student",
    "ui:classNames": "modern-input-group",
    "ui:autofocus": true
  }
};

const resetUiSchema = {
  ...commonUiSchema,
  newPassword: {
    "ui:widget": "password",
    "ui:placeholder": "Enter new password",
    "ui:classNames": "modern-input-group",
    "ui:autofocus": true
  },
  confirmPassword: {
    "ui:widget": "password",
    "ui:placeholder": "Confirm new password",
    "ui:classNames": "modern-input-group"
  }
};

const Forgot = () => {
  const navigate = useNavigate();
  
  // STATES
  const [step, setStep] = useState(1); // 1:Email, 2:OTP, 3:Username, 4:Password
  const [generatedOTP, setGeneratedOTP] = useState(null);
  const [targetUserId, setTargetUserId] = useState(null);
  const [verifiedUsername, setVerifiedUsername] = useState("");

  // --- STEP 1: SEND OTP ---
  const handleEmailSubmit = async ({ formData }) => {
    const inputEmail = formData.email.toLowerCase().trim();

    // 1. Specific Email Validation
    if (inputEmail !== "thulasikumar282@gmail.com") {
      Swal.fire({ icon: 'error', title: 'Access Denied', text: 'Email not found.', confirmButtonColor: '#d33' });
      return;
    }

    // 2. Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    setGeneratedOTP(otp);

    // 3. Show OTP Popup
    Swal.fire({
      icon: 'info',
      title: 'OTP Sent!',
      html: `OTP sent to <b>${inputEmail}</b><br><br>Code: <b style="font-size:24px; color:#6c63ff">${otp}</b>`,
      confirmButtonText: 'I received it',
      confirmButtonColor: '#6c63ff'
    }).then(() => {
      setStep(2); // Go to OTP Step
    });
  };

  // --- STEP 2: VERIFY OTP ---
  const handleOTPSubmit = ({ formData }) => {
    if (formData.otp === generatedOTP) {
      Swal.fire({
        icon: 'success',
        title: 'Verified!',
        text: 'OTP Correct. Now enter the username.',
        timer: 1500,
        showConfirmButton: false
      });
      setStep(3); // Go to Username Step (NEW)
    } else {
      Swal.fire({ icon: 'error', title: 'Wrong OTP', text: 'Please try again.', confirmButtonColor: '#d33' });
    }
  };

  // --- STEP 3: VERIFY USERNAME (NEW STEP) ---
  const handleUsernameSubmit = async ({ formData }) => {
    const enteredUsername = formData.username.trim();
    const users = await getUsers();
    
    // Check if username exists in DB
    const foundUser = users.find(u => u.username === enteredUsername);

    if (foundUser) {
      setTargetUserId(foundUser.id);
      setVerifiedUsername(foundUser.username);
      
      Swal.fire({
        icon: 'success',
        title: 'User Found!',
        text: `Resetting password for: ${foundUser.username}`,
        timer: 1500,
        showConfirmButton: false
      });
      setStep(4); // Go to Password Reset Step
    } else {
      Swal.fire({
        icon: 'error',
        title: 'User Not Found',
        text: `Username "${enteredUsername}" does not exist.`,
        confirmButtonColor: '#d33'
      });
    }
  };

  // --- STEP 4: UPDATE PASSWORD ---
  const handleResetSubmit = async ({ formData }) => {
    if (formData.newPassword !== formData.confirmPassword) {
      Swal.fire({ icon: 'warning', title: 'Mismatch', text: 'Passwords do not match!', confirmButtonColor: '#f39c12' });
      return;
    }

    if (targetUserId) {
      await updateUserPasswordDB(targetUserId, formData.newPassword);
    }

    Swal.fire({
      icon: 'success',
      title: 'Password Changed!',
      text: `Password for ${verifiedUsername} has been updated.`,
      confirmButtonColor: '#6c63ff',
      confirmButtonText: 'Go to Login'
    }).then(() => {
      navigate('/');
    });
  };

  return (
    <div className="split-screen">
      
      {/* LEFT PANE */}
      <div className="left-pane">
        <div className="glass-overlay">
          <img src={LMSImage} alt="Library" className="hero-image" />
          <div className="welcome-text">
            <h2>Account Recovery</h2>
            <p>Reset your password.</p>
          </div>
        </div>
      </div>
      
      {/* RIGHT PANE */}
      <div className="right-pane">
        <div className="login-card">
          <div className="login-header">
            <h1 className="brand-logo">LMS</h1>
            
            {/* Dynamic Titles */}
            {step === 1 && <><h3>Forgot Password?</h3><p className="subtitle">Enter your email to receive OTP.</p></>}
            {step === 2 && <><h3>Enter OTP</h3><p className="subtitle">Enter the 4-digit code sent to your email.</p></>}
            {step === 3 && <><h3>Find Account</h3><p className="subtitle">Enter username to change password.</p></>}
            {step === 4 && <><h3>Reset Password</h3><p className="subtitle">Set new password for <b>{verifiedUsername}</b>.</p></>}
          </div>

          {/* STEP 1: EMAIL */}
          {step === 1 && (
            <Form schema={emailSchema} uiSchema={emailUiSchema} validator={validator} onSubmit={handleEmailSubmit} className="rjsf-pro-form">
              <div className="form-footer" style={{marginTop: '0'}}>
                <button type="submit" className="pro-login-btn">Send OTP</button>
                <Link to="/" className="back-link"><span style={{marginRight: '5px'}}>←</span> Back to Login</Link>
              </div>
            </Form>
          )}

          {/* STEP 2: OTP */}
          {step === 2 && (
            <Form schema={otpSchema} uiSchema={otpUiSchema} validator={validator} onSubmit={handleOTPSubmit} className="rjsf-pro-form">
              <div className="form-footer" style={{marginTop: '0'}}>
                <button type="submit" className="pro-login-btn">Verify OTP</button>
                <button type="button" className="back-link" onClick={() => setStep(1)} style={{background:'none', border:'none', width:'100%', cursor:'pointer'}}>Change Email</button>
              </div>
            </Form>
          )}

          {/* STEP 3: USERNAME (NEW) */}
          {step === 3 && (
            <Form schema={usernameSchema} uiSchema={usernameUiSchema} validator={validator} onSubmit={handleUsernameSubmit} className="rjsf-pro-form">
              <div className="form-footer" style={{marginTop: '0'}}>
                <button type="submit" className="pro-login-btn">Verify User</button>
                <button type="button" className="back-link" onClick={() => setStep(1)} style={{background:'none', border:'none', width:'100%', cursor:'pointer'}}>Cancel</button>
              </div>
            </Form>
          )}

          {/* STEP 4: PASSWORD */}
          {step === 4 && (
            <Form schema={resetSchema} uiSchema={resetUiSchema} validator={validator} onSubmit={handleResetSubmit} className="rjsf-pro-form">
              <div className="form-footer" style={{marginTop: '0'}}>
                <button type="submit" className="pro-login-btn">Update Password</button>
              </div>
            </Form>
          )}

        </div>
      </div>
    </div>
  );
};

export default Forgot;