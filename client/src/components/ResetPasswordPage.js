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
  const [passwordStrength, setPasswordStrength] = useState('');
  const { token } = useParams(); // URLからトークンを取得
  const navigate = useNavigate();

  // パスワード強度をチェックする関数
  const checkPasswordStrength = (password) => {
    if (password.length === 0) return '';
    if (password.length < 6) return 'weak';
    if (password.length >= 6 && password.length < 8) return 'medium';
    if (password.length >= 8) return 'strong';
    return 'medium';
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    setPasswordStrength(checkPasswordStrength(newPassword));
  };

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
      const response = await axios.post(`api/auth/reset-password/${token}`, { password });
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
              onChange={handlePasswordChange}
              required
              minLength="6"
              disabled={loading || message}
            />
            {passwordStrength && (
              <div className={`password-strength ${passwordStrength}`}>
                パスワード強度: {
                  passwordStrength === 'weak' ? '弱い（6文字以上必要）' :
                  passwordStrength === 'medium' ? '普通' :
                  passwordStrength === 'strong' ? '強い' : ''
                }
              </div>
            )}
            <small className="form-help">6文字以上のパスワードを入力してください</small>
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
              disabled={loading || message}
            />
            {confirmPassword && password !== confirmPassword && (
              <div className="password-mismatch">パスワードが一致しません</div>
            )}
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