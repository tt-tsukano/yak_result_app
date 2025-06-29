import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Settings.css';

function SettingsPage({ user }) {
  const [givenEvaluations, setGivenEvaluations] = useState([]);
  const [nameCorrections, setNameCorrections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [correctingNameId, setCorrectingNameId] = useState(null);
  const [correctedName, setCorrectedName] = useState('');
  const [editForm, setEditForm] = useState({
    is_anonymous: true,
    evaluation_content: '',
    is_hidden: false
  });

  useEffect(() => {
    fetchGivenEvaluations();
    fetchNameCorrections();
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

  const fetchNameCorrections = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/evaluations/name-corrections', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNameCorrections(response.data.evaluations);
    } catch (error) {
      console.error('名前修正データの取得エラー:', error);
    }
  };

  const getCategoryName = (category) => {
    const categories = {
      value_practice: '3つのバリューの実践',
      principle_practice: 'プリンシプルの実践',
      contribution: 'チームに貢献',
      value_promotion: 'チャットでの貢献'
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

  const handleBulkAnonymityChange = async (isAnonymous) => {
    if (!window.confirm(`すべての評価を${isAnonymous ? '匿名' : '実名'}に変更しますか？`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      // 新しい一括更新APIを使用
      const response = await axios.put('/api/evaluations/bulk-anonymity', {
        is_anonymous: isAnonymous
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // フロントエンドの状態も更新
      setGivenEvaluations(prev => 
        prev.map(evaluation => ({
          ...evaluation,
          is_anonymous: isAnonymous
        }))
      );
      
      alert(response.data.message);
    } catch (error) {
      console.error('一括更新エラー:', error);
      if (error.response?.data?.error) {
        alert(`一括更新に失敗しました: ${error.response.data.error}`);
      } else {
        alert('一括更新に失敗しました');
      }
    }
  };

  const startNameCorrection = (evaluation) => {
    setCorrectingNameId(evaluation.id);
    setCorrectedName(evaluation.evaluatee_name);
  };

  const cancelNameCorrection = () => {
    setCorrectingNameId(null);
    setCorrectedName('');
  };

  const saveNameCorrection = async (evaluationId) => {
    if (!correctedName.trim()) {
      alert('修正後の名前を入力してください');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/evaluations/${evaluationId}/correct-name`, {
        corrected_name: correctedName.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // データを再取得
      await fetchGivenEvaluations();
      await fetchNameCorrections();
      
      setCorrectingNameId(null);
      setCorrectedName('');
      alert('名前を修正しました');
    } catch (error) {
      console.error('名前修正エラー:', error);
      alert(error.response?.data?.error || '名前の修正に失敗しました');
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
            <li><strong>名前修正:</strong> 評価対象者の名前が間違っている場合、正しい名前に修正できます</li>
          </ul>
        </div>
      </div>

      {nameCorrections.length > 0 && (
        <div className="name-correction-section">
          <div className="section-header">
            <h3>⚠️ 名前修正が必要な評価</h3>
            <p className="correction-notice">
              以下の評価は名前が間違っているため、評価対象者にメッセージが届いていません。
              正しい名前に修正してください。
            </p>
          </div>
          
          <div className="correction-list">
            {nameCorrections.map((evaluation) => (
              <div key={evaluation.id} className="correction-item">
                <div className="correction-header">
                  <div className="correction-meta">
                    <span className="category-badge error">
                      {getCategoryName(evaluation.evaluation_category)}
                    </span>
                    <span className="week-badge">
                      {evaluation.evaluation_week}
                    </span>
                  </div>
                  <span className="status-badge error">名前要修正</span>
                </div>

                <div className="current-name">
                  <strong>現在の名前（間違い）:</strong> {evaluation.evaluatee_name}
                </div>

                {correctingNameId === evaluation.id ? (
                  <div className="name-correction-form">
                    <div className="form-group">
                      <label htmlFor={`corrected_name_${evaluation.id}`}>正しい名前:</label>
                      <input
                        type="text"
                        id={`corrected_name_${evaluation.id}`}
                        value={correctedName}
                        onChange={(e) => setCorrectedName(e.target.value)}
                        placeholder="正しい名前を入力してください"
                      />
                    </div>
                    
                    <div className="form-actions">
                      <button 
                        onClick={() => saveNameCorrection(evaluation.id)}
                        className="save-button"
                      >
                        名前を修正
                      </button>
                      <button 
                        onClick={cancelNameCorrection}
                        className="cancel-button"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="correction-actions">
                    <button 
                      onClick={() => startNameCorrection(evaluation)}
                      className="correct-name-button"
                    >
                      名前を修正する
                    </button>
                  </div>
                )}
                
                <div className="evaluation-preview">
                  <strong>評価内容:</strong>
                  <p>{evaluation.evaluation_content}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="evaluations-section">
        <div className="section-header">
          <h3>あなたが行った評価一覧</h3>
          {givenEvaluations.length > 0 && (
            <div className="bulk-actions">
              <div className="bulk-anonymity">
                <span>匿名化一括設定:</span>
                <button 
                  onClick={() => handleBulkAnonymityChange(true)}
                  className="bulk-button anonymous"
                >
                  すべて匿名にする
                </button>
                <button 
                  onClick={() => handleBulkAnonymityChange(false)}
                  className="bulk-button named"
                >
                  すべて実名にする
                </button>
              </div>
            </div>
          )}
        </div>
        
        {givenEvaluations.length > 0 ? (
          <div className="evaluations-list">
            {givenEvaluations.map((evaluation) => (
              <div key={evaluation.id} className={`evaluation-item ${evaluation.needs_name_correction ? 'needs-correction' : ''}`}>
                <div className="evaluation-header">
                  <div className="evaluation-meta">
                    <span className={`category-badge ${evaluation.needs_name_correction ? 'error' : ''}`}>
                      {getCategoryName(evaluation.evaluation_category)}
                    </span>
                    <span className="week-badge">
                      {evaluation.evaluation_week}
                    </span>
                    <span className={`evaluatee-name ${evaluation.needs_name_correction ? 'error' : ''}`}>
                      評価対象: {evaluation.evaluatee_name}
                      {Boolean(evaluation.needs_name_correction) && ' ⚠️'}
                    </span>
                  </div>
                  
                  <div className="evaluation-status">
                    {Boolean(evaluation.needs_name_correction) && (
                      <span className="status-badge error">名前要修正</span>
                    )}
                    {Boolean(evaluation.is_hidden) && (
                      <span className="status-badge hidden">非公開</span>
                    )}
                    <span className={`status-badge ${evaluation.is_anonymous ? 'anonymous' : 'named'}`}>
                      {evaluation.is_anonymous ? '匿名' : '実名'}
                    </span>
                  </div>
                </div>

                {editingId === evaluation.id ? (
                  <div className="edit-form">
                  <div className="edit-form-options">
                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        id={`is_anonymous_${evaluation.id}`}
                        name="is_anonymous"
                        checked={editForm.is_anonymous}
                        onChange={handleFormChange}
                      />
                      <label htmlFor={`is_anonymous_${evaluation.id}`}>匿名で表示する</label>
                    </div>
                    
                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        id={`is_hidden_${evaluation.id}`}
                        name="is_hidden"
                        checked={editForm.is_hidden}
                        onChange={handleFormChange}
                      />
                      <label htmlFor={`is_hidden_${evaluation.id}`}>この評価を非公開にする</label>
                    </div>
                  </div>
                
                  <div className="form-group">
                    <label htmlFor={`evaluation_content_${evaluation.id}`}>評価内容:</label>
                    <textarea
                      id={`evaluation_content_${evaluation.id}`}
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