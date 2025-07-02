import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/Navbar.css';

function Navbar({ user, onLogout }) {
  const location = useLocation();

  const isActive = (path) => {
    // 管理者ページ内のタブもアクティブに見せるため、前方一致に変更
    if (path === '/admin') {
      return location.pathname.startsWith(path) ? 'active' : '';
    }
    return location.pathname === path ? 'active' : '';
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-brand">
          {/* 管理者は管理者パネルへ、一般ユーザーはダッシュボードへリンク */}
          <Link to={user.isAdmin ? "/admin" : "/dashboard"}>他己評価閲覧アプリ</Link>
        </div>
        
        <div className="navbar-menu">
          {user.isAdmin ? (
            // --- 管理者用のメニュー ---
            <Link 
              to="/admin" 
              className={`navbar-item ${isActive('/admin')}`}
            >
              管理者パネル
            </Link>
          ) : (
            // --- 一般ユーザー用のメニュー ---
            <>
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
            </>
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