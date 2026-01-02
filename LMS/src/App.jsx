import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Components/Login.jsx';
import Dashboard from './Components/Dashboard.jsx';
import Forgot from './Components/Forgot.jsx'; // Forgot page iruntha vechukonga

function App() {
  const [user, setUser] = useState(null);

  // Refresh pannalum login pogama irukka
  useEffect(() => {
    const storedUser = localStorage.getItem('libraryUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login setUser={setUser} />} />
        <Route path="/forgot" element={<Forgot />} />
        <Route 
          path="/dashboard" 
          element={user ? <Dashboard user={user} setUser={setUser} /> : <Navigate to="/" />} 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;