import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Dashboard.css';

function Dashboard({ user }) {
  const [stats, setStats] = useState({
    received: 0,
    weeks: 0,
    categories: 0
  });
  const [nameCorrectionStats, setNameCorrectionStats] = useState({
    total: 0,
    needs_correction: 0,
    invalid_names: 0,
    valid_names: 0
  });
  const [recentEvaluations, setRecentEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [evaluationsResponse, categoriesResponse, weeksResponse, nameCorrectionResponse] = await Promise.all([
        axios.get('api/evaluations/received', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('api/evaluations/categories'),
        axios.get('api/evaluations/weeks', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get('api/evaluations/name-correction-stats', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const evaluations = evaluationsResponse.data.evaluations;
      
      setStats({
        received: evaluations.length,
        weeks: weeksResponse.data.weeks.length,
        categories: categoriesResponse.data.categories.length
      });

      setNameCorrectionStats(nameCorrectionResponse.data.stats);
      setRecentEvaluations(evaluations.slice(0, 5));
      setLoading(false);
    } catch (error) {
      console.error('ダッシュボードデータの取得エラー:', error);
      setLoading(false);
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

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>{user.name}さん、おかえりなさい</h1>
        <p>あなたへの他己評価をご確認いただけます</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{stats.received}</div>
          <div className="stat-label">受け取った評価</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-number">{stats.weeks}</div>
          <div className="stat-label">実施週数</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-number">{stats.categories}</div>
          <div className="stat-label">評価項目</div>
        </div>
      </div>

      {nameCorrectionStats.total > 0 && (
        <div className="name-correction-section">
          <h2>あなたが行った評価の名前チェック</h2>
          <div className="name-correction-stats">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-number">{nameCorrectionStats.total}</div>
                <div className="stat-label">行った評価数</div>
              </div>
              
              {nameCorrectionStats.needs_correction > 0 && (
                <div className="stat-card warning">
                  <div className="stat-number">{nameCorrectionStats.needs_correction}</div>
                  <div className="stat-label">名前修正が必要</div>
                </div>
              )}
              
              <div className="stat-card success">
                <div className="stat-number">{nameCorrectionStats.valid_names}</div>
                <div className="stat-label">正しい名前</div>
              </div>
            </div>
            
            {nameCorrectionStats.needs_correction > 0 && (
              <div className="name-correction-notice">
                <div className="notice-content">
                  <strong>⚠️ 注意：名前が間違っている評価があります</strong>
                  <p>
                    名前が間違っていると、評価を受ける人にメッセージが届きません。
                    正しい名前に修正することで、相手に評価が届くようになります。
                  </p>
                  <a href="/settings" className="fix-names-button">
                    名前を修正する
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="recent-evaluations">
        <h2>最新の他己評価</h2>
        {recentEvaluations.length > 0 ? (
          <div className="evaluation-list">
            {recentEvaluations.map((evaluation) => (
              <div key={evaluation.id} className="evaluation-card">
                <div className="evaluation-header">
                  <span className="evaluation-category">
                    {getCategoryName(evaluation.evaluation_category)}
                  </span>
                  <span className="evaluation-week">
                    {evaluation.evaluation_week}
                  </span>
                </div>
                <div className="evaluation-content">
                  {evaluation.evaluation_content}
                </div>
                <div className="evaluation-footer">
                  <span className="evaluator-name">
                    評価者: {evaluation.display_name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-evaluations">
            <p>まだ他己評価がありません</p>
          </div>
        )}
      </div>

      <div className="quick-actions">
        <h2>クイックアクション</h2>
        <div className="action-buttons">
          <a href="/evaluations" className="action-button primary">
            すべての評価を見る
          </a>
          <a href="/settings" className="action-button secondary">
            評価設定を変更
          </a>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;