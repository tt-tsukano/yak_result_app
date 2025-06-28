import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Settings.css';

function SettingsPage({ user }) {
  const [givenEvaluations, setGivenEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({
    is_anonymous: true,
    evaluation_content: '',
    is_hidden: false
  });

  useEffect(() => {
    fetchGivenEvaluations();
  }, []);

  const fetchGivenEvaluations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/evaluations/given', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGivenEvaluations(response.data.evaluations);
      setLoading(false);
    } catch (error) {
      console.error('評価データの取得エラー:', error);
      setLoading(false);
    }
  };

  const getCategoryName = (category) => {
    const categories = {
      value_practice: '3つのバリューの実践',
      principle_practice: 'プリンシプルの実践',
      contribution: 'プロジェクト貢献度',
      value_promotion: 'バリュー実践促進'
    };
    return categories[category] || category;
  };

  const startEditing = (evaluation) => {
    setEditingId(evaluation.id);
    setEditForm({
      is_anonymous: evaluation.is_anonymous,
      evaluation_content: evaluation.evaluation_content,
      is_hidden: evaluation.is_hidden
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({
      is_anonymous: true,
      evaluation_content: '',
      is_hidden: false
    });
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm({
      ...editForm,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const saveEvaluation = async (evaluationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/evaluations/${evaluationId}/settings`, editForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setGivenEvaluations(prev => 
        prev.map(evaluation => 
          evaluation.id === evaluationId 
            ? { ...evaluation, ...editForm }
            : evaluation
        )
      );
      
      setEditingId(null);
      alert('設定を更新しました');
    } catch (error) {
      console.error('更新エラー:', error);
      alert('更新に失敗しました');
    }
  };

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>評価設定管理</h1>
        <p>あなたが行った他己評価の設定を変更できます</p>
      </div>

      <div className="settings-info">
        <div className="info-card">
          <h3>設定について</h3>
          <ul>
            <li><strong>匿名/実名:</strong> 評価対象者にあなたの名前を表示するかを選択できます</li>
            <li><strong>評価内容:</strong> 過去に記入した評価内容を編集できます</li>
            <li><strong>非公開:</strong> 特定の評価を評価対象者から見えないようにできます</li>
          </ul>
        </div>
      </div>

      <div className="evaluations-section">
        <h3>あなたが行った評価一覧</h3>
        
        {givenEvaluations.length > 0 ? (
          <div className="evaluations-list">
            {givenEvaluations.map((evaluation) => (
              <div key={evaluation.id} className="evaluation-item">
                <div className="evaluation-header">
                  <div className="evaluation-meta">
                    <span className="category-badge">
                      {getCategoryName(evaluation.evaluation_category)}
                    </span>
                    <span className="week-badge">
                      {evaluation.evaluation_week}
                    </span>
                    <span className="evaluatee-name">
                      評価対象: {evaluation.evaluatee_name}
                    </span>
                  </div>
                  
                  <div className="evaluation-status">
                    {evaluation.is_hidden && (
                      <span className="status-badge hidden">非公開</span>
                    )}
                    <span className={`status-badge ${evaluation.is_anonymous ? 'anonymous' : 'named'}`}>
                      {evaluation.is_anonymous ? '匿名' : '実名'}
                    </span>
                  </div>
                </div>

                {editingId === evaluation.id ? (
                  <div className="edit-form">
                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          name="is_anonymous"
                          checked={editForm.is_anonymous}
                          onChange={handleFormChange}
                        />
                        匿名で表示する
                      </label>
                    </div>
                    
                    <div className="form-group">
                      <label>
                        <input
                          type="checkbox"
                          name="is_hidden"
                          checked={editForm.is_hidden}
                          onChange={handleFormChange}
                        />
                        この評価を非公開にする
                      </label>
                    </div>
                    
                    <div className="form-group">
                      <label>評価内容:</label>
                      <textarea
                        name="evaluation_content"
                        value={editForm.evaluation_content}
                        onChange={handleFormChange}
                        rows={4}
                      />
                    </div>
                    
                    <div className="form-actions">
                      <button 
                        onClick={() => saveEvaluation(evaluation.id)}
                        className="save-button"
                      >
                        保存
                      </button>
                      <button 
                        onClick={cancelEditing}
                        className="cancel-button"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="evaluation-content">
                    <p>{evaluation.evaluation_content}</p>
                    <div className="evaluation-actions">
                      <button 
                        onClick={() => startEditing(evaluation)}
                        className="edit-button"
                      >
                        設定を変更
                      </button>
                    </div>
                  </div>
                )}
                
                <div className="evaluation-footer">
                  <span className="evaluation-date">
                    作成日: {new Date(evaluation.created_at).toLocaleDateString('ja-JP')}
                  </span>
                  {evaluation.updated_at !== evaluation.created_at && (
                    <span className="evaluation-date">
                      更新日: {new Date(evaluation.updated_at).toLocaleDateString('ja-JP')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-evaluations">
            <p>あなたが行った評価がありません</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsPage;