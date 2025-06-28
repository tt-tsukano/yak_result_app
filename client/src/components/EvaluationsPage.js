import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Evaluations.css';

function EvaluationsPage({ user }) {
  const [evaluations, setEvaluations] = useState([]);
  const [categories, setCategories] = useState([]);
  const [weeks, setWeeks] = useState([]);
  const [filters, setFilters] = useState({
    category: '',
    week: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchEvaluations();
  }, [filters]);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const [categoriesResponse, weeksResponse] = await Promise.all([
        axios.get('/api/evaluations/categories'),
        axios.get('/api/evaluations/weeks', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setCategories(categoriesResponse.data.categories);
      setWeeks(weeksResponse.data.weeks);
    } catch (error) {
      console.error('初期データの取得エラー:', error);
    }
  };

  const fetchEvaluations = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      
      if (filters.category) params.append('category', filters.category);
      if (filters.week) params.append('week', filters.week);

      const response = await axios.get(`/api/evaluations/received?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setEvaluations(response.data.evaluations);
      setLoading(false);
    } catch (error) {
      console.error('評価データの取得エラー:', error);
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      week: ''
    });
  };

  const getCategoryName = (category) => {
    const categoryObj = categories.find(c => c.key === category);
    return categoryObj ? categoryObj.name : category;
  };

  if (loading) {
    return <div className="loading">読み込み中...</div>;
  }

  return (
    <div className="evaluations-page">
      <div className="page-header">
        <h1>他己評価一覧</h1>
        <p>あなたが受け取った他己評価をご覧いただけます</p>
      </div>

      <div className="filters-section">
        <h3>フィルター</h3>
        <div className="filters">
          <div className="filter-group">
            <label htmlFor="category">評価項目</label>
            <select
              id="category"
              name="category"
              value={filters.category}
              onChange={handleFilterChange}
            >
              <option value="">すべて</option>
              {categories.map((category) => (
                <option key={category.key} value={category.key}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="week">実施週</label>
            <select
              id="week"
              name="week"
              value={filters.week}
              onChange={handleFilterChange}
            >
              <option value="">すべて</option>
              {weeks.map((week) => (
                <option key={week} value={week}>
                  {week}
                </option>
              ))}
            </select>
          </div>

          <button 
            onClick={clearFilters}
            className="clear-filters-button"
          >
            フィルターをクリア
          </button>
        </div>
      </div>

      <div className="evaluations-section">
        <div className="section-header">
          <h3>評価一覧</h3>
          <span className="evaluation-count">
            {evaluations.length}件の評価
          </span>
        </div>

        {evaluations.length > 0 ? (
          <div className="evaluations-grid">
            {evaluations.map((evaluation) => (
              <div key={evaluation.id} className="evaluation-card">
                <div className="evaluation-header">
                  <div className="category-badge">
                    {getCategoryName(evaluation.evaluation_category)}
                  </div>
                  <div className="week-badge">
                    {evaluation.evaluation_week}
                  </div>
                </div>

                <div className="evaluation-content">
                  <p>{evaluation.evaluation_content}</p>
                </div>

                <div className="evaluation-footer">
                  <div className="evaluator-info">
                    <span className="evaluator-label">評価者:</span>
                    <span className="evaluator-name">
                      {evaluation.display_name}
                    </span>
                  </div>
                  <div className="evaluation-date">
                    {new Date(evaluation.created_at).toLocaleDateString('ja-JP')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-evaluations">
            <div className="no-evaluations-content">
              <h4>評価が見つかりません</h4>
              <p>
                {filters.category || filters.week 
                  ? 'フィルター条件に一致する評価がありません。フィルターを変更してみてください。'
                  : 'まだ他己評価がありません。'
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EvaluationsPage;