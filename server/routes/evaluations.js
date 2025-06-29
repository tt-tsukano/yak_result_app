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
                is_name_valid,
                needs_name_correction,
                original_evaluatee_name,
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

                // SQLiteのBOOLEAN値を明示的にboolean型に変換
                const processedEvaluations = evaluations.map(evaluation => ({
                    ...evaluation,
                    is_anonymous: Boolean(evaluation.is_anonymous),
                    is_hidden: Boolean(evaluation.is_hidden),
                    is_name_valid: evaluation.is_name_valid !== null ? Boolean(evaluation.is_name_valid) : null,
                    needs_name_correction: Boolean(evaluation.needs_name_correction)
                }));

                res.json({ evaluations: processedEvaluations });
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
        { key: 'contribution', name: 'チームに貢献' },
        { key: 'value_promotion', name: 'チャットでの貢献' }
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

// 名前バリデーションを実行
router.post('/validate-names', authenticateToken, async (req, res) => {
    try {
        const db = await getDatabase();
        
        // 参加者リストを取得
        db.all('SELECT official_name FROM participants', [], (err, participants) => {
            if (err) {
                db.close();
                return res.status(500).json({ error: 'データベースエラー' });
            }

            const validNames = participants.map(p => p.official_name);
            
            // 名前マッピングも取得
            db.all('SELECT variant_name, official_name FROM name_mappings', [], (err, mappings) => {
                if (err) {
                    db.close();
                    return res.status(500).json({ error: 'データベースエラー' });
                }

                // 評価の名前をバリデーション
                db.all('SELECT id, evaluatee_name FROM evaluations WHERE is_name_valid IS NULL', [], (err, evaluations) => {
                    if (err) {
                        db.close();
                        return res.status(500).json({ error: 'データベースエラー' });
                    }

                    let processedCount = 0;
                    const totalCount = evaluations.length;

                    if (totalCount === 0) {
                        db.close();
                        return res.json({ message: 'バリデーション対象の評価がありません', validated: 0 });
                    }

                    evaluations.forEach(evaluation => {
                        let isValid = false;
                        let correctedName = evaluation.evaluatee_name;

                        // 直接一致をチェック
                        if (validNames.includes(evaluation.evaluatee_name)) {
                            isValid = true;
                        } else {
                            // マッピングをチェック
                            const mapping = mappings.find(m => m.variant_name === evaluation.evaluatee_name);
                            if (mapping) {
                                isValid = true;
                                correctedName = mapping.official_name;
                            }
                        }

                        // 結果を更新
                        db.run(
                            `UPDATE evaluations SET 
                                is_name_valid = ?, 
                                needs_name_correction = ?,
                                evaluatee_name = ?,
                                updated_at = CURRENT_TIMESTAMP
                             WHERE id = ?`,
                            [isValid, !isValid, correctedName, evaluation.id],
                            (err) => {
                                processedCount++;
                                if (processedCount === totalCount) {
                                    db.close();
                                    res.json({ 
                                        message: 'バリデーションが完了しました',
                                        validated: totalCount 
                                    });
                                }
                            }
                        );
                    });
                });
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
});

// 名前修正が必要な評価を取得
router.get('/name-corrections', authenticateToken, async (req, res) => {
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
                is_name_valid,
                needs_name_correction,
                original_evaluatee_name
            FROM evaluations 
            WHERE respondent_email = ? AND needs_name_correction = 1
            ORDER BY evaluation_week DESC, created_at DESC`,
            [userEmail],
            (err, evaluations) => {
                db.close();
                
                if (err) {
                    return res.status(500).json({ error: 'データベースエラー' });
                }

                // SQLiteのBOOLEAN値を明示的にboolean型に変換
                const processedEvaluations = evaluations.map(evaluation => ({
                    ...evaluation,
                    is_name_valid: evaluation.is_name_valid !== null ? Boolean(evaluation.is_name_valid) : null,
                    needs_name_correction: Boolean(evaluation.needs_name_correction)
                }));

                res.json({ evaluations: processedEvaluations });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
});

// 評価対象者名を修正
router.put('/:id/correct-name', authenticateToken, async (req, res) => {
    const evaluationId = req.params.id;
    const userEmail = req.user.email;
    const { corrected_name } = req.body;

    if (!corrected_name || corrected_name.trim() === '') {
        return res.status(400).json({ error: '修正後の名前を入力してください' });
    }

    try {
        const db = await getDatabase();
        
        // 自分の評価かどうか確認
        db.get(
            'SELECT id, evaluatee_name FROM evaluations WHERE id = ? AND respondent_email = ?',
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

                // 参加者リストで修正後の名前をチェック
                db.get(
                    'SELECT official_name FROM participants WHERE official_name = ?',
                    [corrected_name.trim()],
                    (err, participant) => {
                        if (err) {
                            db.close();
                            return res.status(500).json({ error: 'データベースエラー' });
                        }

                        if (!participant) {
                            db.close();
                            return res.status(400).json({ 
                                error: '修正後の名前が参加者リストに存在しません。正しい名前を確認してください。' 
                            });
                        }

                        // 名前を修正
                        db.run(
                            `UPDATE evaluations 
                             SET evaluatee_name = ?, 
                                 original_evaluatee_name = ?,
                                 is_name_valid = 1,
                                 needs_name_correction = 0,
                                 updated_at = CURRENT_TIMESTAMP
                             WHERE id = ?`,
                            [corrected_name.trim(), evaluation.evaluatee_name, evaluationId],
                            (err) => {
                                db.close();
                                
                                if (err) {
                                    return res.status(500).json({ error: '名前の修正に失敗しました' });
                                }

                                res.json({ message: '評価対象者名を修正しました' });
                            }
                        );
                    }
                );
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
});

// 名前修正統計を取得
router.get('/name-correction-stats', authenticateToken, async (req, res) => {
    const userEmail = req.user.email;

    try {
        const db = await getDatabase();
        
        db.all(
            `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN needs_name_correction = 1 THEN 1 ELSE 0 END) as needs_correction,
                SUM(CASE WHEN is_name_valid = 0 THEN 1 ELSE 0 END) as invalid_names,
                SUM(CASE WHEN is_name_valid = 1 THEN 1 ELSE 0 END) as valid_names
            FROM evaluations 
            WHERE respondent_email = ?`,
            [userEmail],
            (err, stats) => {
                db.close();
                
                if (err) {
                    return res.status(500).json({ error: 'データベースエラー' });
                }

                res.json({ stats: stats[0] });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
});

module.exports = router;