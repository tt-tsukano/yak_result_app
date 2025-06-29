import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/Navbar.css';

function Navbar({ user, onLogout }) {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          <Link to="/dashboard">他己評価閲覧アプリ</Link>
        </div>
        
        <div className="navbar-menu">
          <Link 
            to="/dashboard" 
            className={`navbar-item ${isActive('/dashboard')}`}
          >
            ダッシュボード
          </Link>
          
          <Link 
            to="/evaluations" 
            className={`navbar-item ${isActive('/evaluations')}`}
          >
            他己評価閲覧
          </Link>
          
          <Link 
            to="/settings" 
            className={`navbar-item ${isActive('/settings')}`}
          >
            評価設定
          </Link>
          
          {Boolean(user.isAdmin) && (
            <Link 
              to="/admin" 
              className={`navbar-item ${isActive('/admin')}`}
            >
              管理者
            </Link>
          )}
        </div>
        
        <div className="navbar-user">
          <span className="user-name">{user.name}</span>
          <button 
            onClick={onLogout}
            className="logout-button"
          >
            ログアウト
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;