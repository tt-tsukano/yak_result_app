import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Admin.css';

function AdminPage({ user }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [participantFile, setParticipantFile] = useState(null);
  const [uploadResult, setUploadResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchStats();
    } else if (activeTab === 'users') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('統計データの取得エラー:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data.users);
    } catch (error) {
      console.error('ユーザーデータの取得エラー:', error);
    }
  };

  const handleFileUpload = async (type) => {
    const file = type === 'evaluation' ? uploadFile : participantFile;
    if (!file) {
      alert('ファイルを選択してください');
      return;
    }

    setLoading(true);
    setUploadResult(null);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      if (type === 'evaluation') {
        formData.append('excelFile', file);
        const response = await axios.post('/api/admin/import-excel', formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        setUploadResult(response.data);
        setUploadFile(null);
      } else {
        formData.append('participantFile', file);
        const response = await axios.post('/api/admin/import-participants', formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
        setUploadResult(response.data);
        setParticipantFile(null);
      }
      
      fetchStats();
    } catch (error) {
      console.error('アップロードエラー:', error);
      setUploadResult({
        message: 'アップロードに失敗しました',
        error: error.response?.data?.error || error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNameValidation = async () => {
    if (!window.confirm('すべての未検証の評価に対して名前の検証を実行しますか？データ量によっては時間がかかる場合があります。')) {
      return;
    }
  
    setLoading(true);
    setValidationResult(null);
  
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('/api/evaluations/validate-names', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setValidationResult(response.data);
    } catch (error) {
      console.error('名前検証エラー:', error);
      setValidationResult({
        message: '名前の検証に失敗しました',
        error: error.response?.data?.error || error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const renderDashboard = () => (
    <div className="admin-dashboard">
      <h2>システム統計</h2>
      <div className="stats-grid">
        <div className="stat-card">
          <h3>登録ユーザー数</h3>
          <div className="stat-number">{stats.users || 0}</div>
        </div>
        <div className="stat-card">
          <h3>評価データ数</h3>
          <div className="stat-number">{stats.evaluations || 0}</div>
        </div>
        <div className="stat-card">
          <h3>実施週数</h3>
          <div className="stat-number">{stats.weeks || 0}</div>
        </div>
        <div className="stat-card">
          <h3>参加者数</h3>
          <div className="stat-number">{stats.participants || 0}</div>
        </div>
      </div>
    </div>
  );

  const renderDataImport = () => (
    <div className="data-import">
      <h2>データインポート</h2>
      
      <div className="import-section">
        <h3>評価データ（Microsoft Forms Excel）</h3>
        <div className="upload-area">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setUploadFile(e.target.files[0])}
            disabled={loading}
          />
          <button 
            onClick={() => handleFileUpload('evaluation')}
            disabled={!uploadFile || loading}
            className="upload-button"
          >
            {loading ? 'アップロード中...' : '評価データをインポート'}
          </button>
        </div>
        <div className="upload-info">
          <p>Microsoft Formsから出力されたExcelファイルをアップロードしてください。</p>
        </div>
      </div>

      <div className="import-section">
        <h3>参加者リスト</h3>
        <div className="upload-area">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setParticipantFile(e.target.files[0])}
            disabled={loading}
          />
          <button 
            onClick={() => handleFileUpload('participant')}
            disabled={!participantFile || loading}
            className="upload-button"
          >
            {loading ? 'アップロード中...' : '参加者リストをインポート'}
          </button>
        </div>
        <div className="upload-info">
          <p>正式氏名が記載されたExcelファイルをアップロードしてください。</p>
        </div>
      </div>

      <div className="import-section">
      <h3>名前の検証</h3>
      <div className="upload-area">
        <button 
          onClick={handleNameValidation}
          disabled={loading}
          className="upload-button"
        >
          {loading ? '検証中...' : '名前を検証'}
        </button>
      </div>
        <div className="upload-info">
          <p>すべての評価データに対して、参加者リストとの名前の照合を実行します。</p>
        </div>
      </div>

      {validationResult && (
        <div className={`upload-result ${validationResult.error ? 'error' : 'success'}`}>
          <h4>{validationResult.error ? '検証エラー' : '検証結果'}</h4>
          <p>{validationResult.message}</p>
          {validationResult.validated !== undefined && (
            <p>処理件数: {validationResult.validated}件</p>
          )}
        </div>
      )}

      {uploadResult && (
        <div className={`upload-result ${uploadResult.error ? 'error' : 'success'}`}>
          <h4>{uploadResult.error ? 'エラー' : '結果'}</h4>
          <p>{uploadResult.message}</p>
          {uploadResult.summary && (
            <div className="upload-summary">
              <p>処理結果:</p>
              <ul>
                <li>総行数: {uploadResult.summary.totalRows}</li>
                <li>成功: {uploadResult.summary.successCount}</li>
                <li>エラー: {uploadResult.summary.errorCount}</li>
              </ul>
              {uploadResult.summary.errors && uploadResult.summary.errors.length > 0 && (
                <div className="errors">
                  <p>エラー詳細:</p>
                  <ul>
                    {uploadResult.summary.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderUsers = () => (
    <div className="user-management">
      <h2>ユーザー管理</h2>
      <div className="users-table">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>氏名</th>
              <th>メールアドレス</th>
              <th>管理者</th>
              <th>登録日</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.is_admin ? '✓' : ''}</td>
                <td>{new Date(user.created_at).toLocaleDateString('ja-JP')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="admin-page">
      <div className="admin-header">
        <h1>管理者パネル</h1>
        <p>システム管理とデータ管理</p>
      </div>

      <div className="admin-tabs">
        <button 
          className={activeTab === 'dashboard' ? 'active' : ''}
          onClick={() => setActiveTab('dashboard')}
        >
          ダッシュボード
        </button>
        <button 
          className={activeTab === 'import' ? 'active' : ''}
          onClick={() => setActiveTab('import')}
        >
          データインポート
        </button>
        <button 
          className={activeTab === 'users' ? 'active' : ''}
          onClick={() => setActiveTab('users')}
        >
          ユーザー管理
        </button>
      </div>

      <div className="admin-content">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'import' && renderDataImport()}
        {activeTab === 'users' && renderUsers()}
      </div>
    </div>
  );
}

export default AdminPage;