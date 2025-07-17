import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import ForgotPasswordPage from './components/ForgotPasswordPage';
import ResetPasswordPage from './components/ResetPasswordPage';
import Dashboard from './components/Dashboard';
import EvaluationsPage from './components/EvaluationsPage';
import SettingsPage from './components/SettingsPage';
import AdminPage from './components/AdminPage';
import Navbar from './components/Navbar';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUserData = JSON.parse(userData);
        const processedUserData = {
          ...parsedUserData,
          isAdmin: Boolean(parsedUserData.isAdmin)
        };
        setUser(processedUserData);
      } catch (error) {
        console.error('ユーザーデータの解析エラー:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData, token) => {
    const processedUserData = {
      ...userData,
      isAdmin: Boolean(userData.isAdmin)
    };
    setUser(processedUserData);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(processedUserData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">読み込み中...</div>
      </div>
    );
  }

  return (
    <Router basename="/YAK_result_app">
      <div className="App">
        {user && <Navbar user={user} onLogout={handleLogout} />}
        
        <main className="main-content">
          <Routes>
            <Route 
              path="/login" 
              element={
                user ? <Navigate to={user.isAdmin ? "/admin" : "/dashboard"} /> : 
                <LoginPage onLogin={handleLogin} />
              } 
            />
            <Route 
              path="/register" 
              element={
                // 登録後はダッシュボード（またはログイン）に遷移するため、ここは変更なしでOK
                user ? <Navigate to="/dashboard" /> : 
                <RegisterPage />
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                user ? <Dashboard user={user} /> : 
                <Navigate to="/login" />
              } 
            />
            <Route 
              path="/evaluations" 
              element={
                user ? <EvaluationsPage user={user} /> : 
                <Navigate to="/login" />
              } 
            />
            <Route 
              path="/settings" 
              element={
                user ? <SettingsPage user={user} /> : 
                <Navigate to="/login" />
              } 
            />
            <Route 
              path="/admin" 
              element={
                user && Boolean(user.isAdmin) ? <AdminPage user={user} /> : 
                user ? <Navigate to="/dashboard" /> :
                <Navigate to="/login" />
              } 
            />
            <Route 
              path="/" 
              element={
                user ? <Navigate to={user.isAdmin ? "/admin" : "/dashboard"} /> : 
                <Navigate to="/login" />
              } 
            />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;