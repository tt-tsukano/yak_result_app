const express = require('express');
const { getDatabase } = require('../database/init');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// 自分への他己評価を取得
router.get('/received', authenticateToken, async (req, res) => {
    const { category, week } = req.query;
    const userEmail = req.user.email;

    try {
        const db = await getDatabase();
        
        let query = `
            SELECT 
                e.id,
                e.respondent_name,
                e.evaluation_week,
                e.evaluation_category,
                e.evaluation_content,
                e.is_anonymous,
                e.created_at,
                CASE 
                    WHEN e.is_anonymous = 1 THEN '匿名'
                    ELSE e.respondent_name 
                END as display_name
            FROM evaluations e
            WHERE e.evaluatee_name = (SELECT name FROM users WHERE email = ?)
            AND e.is_hidden = 0
        `;
        
        const params = [userEmail];

        if (category) {
            query += ' AND e.evaluation_category = ?';
            params.push(category);
        }

        if (week) {
            query += ' AND e.evaluation_week = ?';
            params.push(week);
        }

        query += ' ORDER BY e.evaluation_week DESC, e.created_at DESC';

        db.all(query, params, (err, evaluations) => {
            db.close();
            
            if (err) {
                return res.status(500).json({ error: 'データベースエラー' });
            }

            res.json({ evaluations });
        });
    } catch (error) {
        res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
});

// 自分が行った他己評価を取得
router.get('/given', authenticateToken, async (req, res) => {
    const userEmail = req.user.email;

    try {
        const db = await getDatabase();
        
        db.all(
            `SELECT 
                id,
                evaluatee_name,
                evaluation_week,
                evaluation_category,
                evaluation_content,
                is_anonymous,
                is_hidden,
                created_at,
                updated_at
            FROM evaluations 
            WHERE respondent_email = ?
            ORDER BY evaluation_week DESC, created_at DESC`,
            [userEmail],
            (err, evaluations) => {
                db.close();
                
                if (err) {
                    return res.status(500).json({ error: 'データベースエラー' });
                }

                res.json({ evaluations });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
});

// 自分が行った評価の設定を更新
router.put('/:id/settings', authenticateToken, async (req, res) => {
    const evaluationId = req.params.id;
    const userEmail = req.user.email;
    const { is_anonymous, evaluation_content, is_hidden } = req.body;

    try {
        const db = await getDatabase();
        
        // 自分の評価かどうか確認
        db.get(
            'SELECT id FROM evaluations WHERE id = ? AND respondent_email = ?',
            [evaluationId, userEmail],
            (err, evaluation) => {
                if (err) {
                    db.close();
                    return res.status(500).json({ error: 'データベースエラー' });
                }

                if (!evaluation) {
                    db.close();
                    return res.status(404).json({ error: '評価が見つからないか、編集権限がありません' });
                }

                // 設定を更新
                db.run(
                    `UPDATE evaluations 
                     SET is_anonymous = ?, evaluation_content = ?, is_hidden = ?, updated_at = CURRENT_TIMESTAMP
                     WHERE id = ?`,
                    [is_anonymous, evaluation_content, is_hidden, evaluationId],
                    (err) => {
                        db.close();
                        
                        if (err) {
                            return res.status(500).json({ error: '更新に失敗しました' });
                        }

                        res.json({ message: '評価設定を更新しました' });
                    }
                );
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
});

// 評価カテゴリ一覧を取得
router.get('/categories', (req, res) => {
    const categories = [
        { key: 'value_practice', name: '3つのバリューの実践' },
        { key: 'principle_practice', name: 'プリンシプルの実践' },
        { key: 'contribution', name: 'プロジェクトメンバー評価（貢献度）' },
        { key: 'value_promotion', name: 'プロジェクトメンバー評価（バリュー実践）' }
    ];
    
    res.json({ categories });
});

// 実施週一覧を取得
router.get('/weeks', authenticateToken, async (req, res) => {
    try {
        const db = await getDatabase();
        
        db.all(
            'SELECT DISTINCT evaluation_week FROM evaluations ORDER BY evaluation_week DESC',
            [],
            (err, weeks) => {
                db.close();
                
                if (err) {
                    return res.status(500).json({ error: 'データベースエラー' });
                }

                res.json({ weeks: weeks.map(w => w.evaluation_week) });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
});

module.exports = router;