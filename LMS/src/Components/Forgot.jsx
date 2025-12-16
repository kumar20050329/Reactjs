import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';
import { getUsers, updateUserPasswordDB } from '../db'; // DB functions import seigirom

const Forgot = () => {
  const navigate = useNavigate();
  
  // --- STATE ---
  const [step, setStep] = useState(1); // 1: Username, 2: Password
  const [usernameInput, setUsernameInput] = useState(""); 
  const [userId, setUserId] = useState(null);
  
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  
  const [showPopup, setShowPopup] = useState(false);
  const [errorMsg, setErrorMsg] = useState(""); // Red color error message kaata

  // --- HANDLERS ---
  
  // Step 1: Check Username
  const handleUserSubmit = async () => {
    if (!usernameInput) {
      setErrorMsg("Please enter your username");
      return;
    }

    const users = await getUsers();
    const foundUser = users.find(u => u.username === usernameInput);

    if (foundUser) {
      setUserId(foundUser.id); // Save User ID
      setErrorMsg(""); // Clear errors
      setStep(2); // Go to next step
    } else {
      setErrorMsg("Username not found!");
    }
  };

  // Step 2: Update Password
  const handleChangePassword = async () => {
    // Validation
    if (!newPass || !confirmPass) {
      setErrorMsg("Please fill both password fields");
      return;
    }
    if (newPass !== confirmPass) {
      setErrorMsg("Passwords do not match!"); // Ipo Red color la varum
      return;
    }

    // Update in Database
    if (userId) {
      await updateUserPasswordDB(userId, newPass);
      setShowPopup(true); // Show Success Popup
    }
  };

  const handleClosePopup = () => {
    setShowPopup(false);
    navigate('/'); // Go back to Login
  };

  return (
    <div className="login-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f0f2f5' }}>
      <div className="login-box" style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '10px', width: '380px' }}>
        
        {/* --- STEP 1: USERNAME INPUT --- */}
        {step === 1 && (
          <>
            <h2>Reset Password</h2>
            <p style={{color:'#666', marginBottom:'20px'}}>Enter your username to find account.</p>
            
            <input 
              type="text" 
              placeholder="Enter Username" 
              value={usernameInput}
              onChange={(e) => {
                setUsernameInput(e.target.value);
                setErrorMsg("");
              }}
              style={{ padding: '12px', width: '100%', marginBottom: '10px', border:'1px solid #ddd', borderRadius:'6px' }} 
            />
            
            {/* Error Message */}
            {errorMsg && <p style={{color: 'red', fontSize: '13px', marginBottom: '15px'}}>{errorMsg}</p>}

            <button className="login-btn" onClick={handleUserSubmit}>Submit</button>
          </>
        )}

        {/* --- STEP 2: NEW PASSWORD INPUTS --- */}
        {step === 2 && (
          <>
            <h2>Set New Password</h2>
            <p style={{color:'#666', marginBottom:'20px'}}>Create a new password.</p>
            
            <input 
              type="password" 
              placeholder="New Password" 
              value={newPass}
              onChange={(e) => {
                setNewPass(e.target.value);
                setErrorMsg("");
              }}
              style={{ padding: '12px', width: '100%', marginBottom: '15px', border:'1px solid #ddd', borderRadius:'6px' }} 
            />
            <input 
              type="password" 
              placeholder="Confirm Password" 
              value={confirmPass}
              onChange={(e) => {
                setConfirmPass(e.target.value);
                setErrorMsg("");
              }}
              style={{ padding: '12px', width: '100%', marginBottom: '10px', border:'1px solid #ddd', borderRadius:'6px' }} 
            />
            
            {/* Error Message */}
            {errorMsg && <p style={{color: 'red', fontSize: '13px', marginBottom: '15px'}}>{errorMsg}</p>}

            <button className="login-btn" onClick={handleChangePassword}>Change Password</button>
          </>
        )}

        <div style={{ marginTop: '20px' }}>
            <Link to="/" style={{ color: '#6c63ff', textDecoration: 'none' }}>Back to Login</Link>
        </div>

      </div>

      {/* --- SUCCESS POPUP --- */}
      {showPopup && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{ background: 'white', padding: '30px', borderRadius: '10px', textAlign: 'center', width: '300px', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '50px', color: '#28c76f', marginBottom: '15px' }}>✓</div>
            <h3 style={{ margin: '0 0 10px', color: '#333' }}>Success!</h3>
            <p style={{ color: '#666', marginBottom: '25px' }}>Password changed successfully.</p>
            <button 
              className="login-btn" 
              onClick={handleClosePopup}
            >
              Go to Login
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default Forgot;