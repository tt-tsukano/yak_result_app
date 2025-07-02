import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/Auth.css';

function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { token } = useParams(); // URLからトークンを取得
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('パスワードが一致しません。');
      return;
    }
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await axios.post(`/api/auth/reset-password/${token}`, { password });
      setMessage(response.data.message + ' 3秒後にログインページへ移動します。');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'パスワードの再設定に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>新しいパスワードを設定</h2>

        {message && <div className="success-message">{message}</div>}
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="password">新しいパスワード</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength="6"
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">新しいパスワード（確認用）</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength="6"
            />
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={loading || message}
          >
            {loading ? '更新中...' : 'パスワードを更新'}
          </button>
        </form>
        
        {message && (
          <div className="auth-links">
            <Link to="/login">すぐにログインページへ</Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default ResetPasswordPage;