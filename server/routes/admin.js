const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const { getDatabase } = require('../database/init');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// アップロードディレクトリの作成
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer設定
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['.xlsx', '.xls'];
        const fileExt = path.extname(file.originalname).toLowerCase();
        
        if (allowedTypes.includes(fileExt)) {
            cb(null, true);
        } else {
            cb(new Error('Excelファイル（.xlsx, .xls）のみアップロード可能です'));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB制限
    }
});

// Excelファイルアップロード・データインポート
router.post('/import-excel', authenticateToken, requireAdmin, upload.single('excelFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Excelファイルをアップロードしてください' });
    }

    try {
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const db = await getDatabase();
        
        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (const row of jsonData) {
            try {
                // Microsoft Formsの列名に基づいてデータを抽出
                const respondentEmail = row['メール'];
                const respondentName = row['名前'];
                const evaluationWeek = row['実施週：週を選択してください'];

                if (!respondentEmail || !respondentName || !evaluationWeek) {
                    errorCount++;
                    errors.push(`行スキップ: 必須項目が不足（メール: ${respondentEmail}, 名前: ${respondentName}, 週: ${evaluationWeek}）`);
                    continue;
                }

                // 各評価カテゴリのデータを処理
                const evaluations = [
                    {
                        evaluateeName: row['氏名'],
                        content: row['具体的な行動内容'],
                        category: 'value_practice'
                    },
                    {
                        evaluateeName: row['氏名2'],
                        content: row['具体的な行動内容'],
                        category: 'principle_practice'
                    },
                    {
                        evaluateeName: row['氏名：'],
                        content: row['具体的な行動内容：'],
                        category: 'contribution'
                    },
                    {
                        evaluateeName: row['氏名3'],
                        content: row['具体的な行動内容3'],
                        category: 'value_promotion'
                    }
                ];

                for (const evaluation of evaluations) {
                    if (evaluation.evaluateeName && evaluation.content) {
                        await new Promise((resolve, reject) => {
                            db.run(
                                `INSERT INTO evaluations 
                                 (respondent_email, respondent_name, evaluation_week, evaluatee_name, 
                                  evaluation_category, evaluation_content) 
                                 VALUES (?, ?, ?, ?, ?, ?)`,
                                [respondentEmail, respondentName, evaluationWeek, 
                                 evaluation.evaluateeName, evaluation.category, evaluation.content],
                                function(err) {
                                    if (err) {
                                        reject(err);
                                    } else {
                                        resolve();
                                    }
                                }
                            );
                        });
                        successCount++;
                    }
                }
            } catch (error) {
                errorCount++;
                errors.push(`行処理エラー: ${error.message}`);
            }
        }

        db.close();

        // アップロードファイルを削除
        fs.unlinkSync(req.file.path);

        res.json({
            message: 'データインポートが完了しました',
            summary: {
                totalRows: jsonData.length,
                successCount,
                errorCount,
                errors: errors.slice(0, 10) // 最初の10件のエラーのみ表示
            }
        });

    } catch (error) {
        // エラー時もファイルを削除
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'インポート処理中にエラーが発生しました: ' + error.message });
    }
});

// 参加者リストアップロード
router.post('/import-participants', authenticateToken, requireAdmin, upload.single('participantFile'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Excelファイルをアップロードしてください' });
    }

    try {
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const db = await getDatabase();
        
        let successCount = 0;
        let errorCount = 0;

        for (const row of jsonData) {
            try {
                const officialName = row['正式氏名'] || row['氏名'] || Object.values(row)[0];
                const email = row['メールアドレス'] || row['メール'];

                if (!officialName) {
                    errorCount++;
                    continue;
                }

                await new Promise((resolve, reject) => {
                    db.run(
                        'INSERT OR REPLACE INTO participants (official_name, email) VALUES (?, ?)',
                        [officialName, email],
                        function(err) {
                            if (err) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        }
                    );
                });
                successCount++;
            } catch (error) {
                errorCount++;
            }
        }

        db.close();
        fs.unlinkSync(req.file.path);

        res.json({
            message: '参加者リストのインポートが完了しました',
            summary: {
                totalRows: jsonData.length,
                successCount,
                errorCount
            }
        });

    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'インポート処理中にエラーが発生しました: ' + error.message });
    }
});

// 統計情報取得
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const db = await getDatabase();
        
        const stats = await Promise.all([
            new Promise((resolve) => {
                db.get('SELECT COUNT(*) as count FROM users', [], (err, result) => {
                    resolve(err ? 0 : result.count);
                });
            }),
            new Promise((resolve) => {
                db.get('SELECT COUNT(*) as count FROM evaluations', [], (err, result) => {
                    resolve(err ? 0 : result.count);
                });
            }),
            new Promise((resolve) => {
                db.get('SELECT COUNT(DISTINCT evaluation_week) as count FROM evaluations', [], (err, result) => {
                    resolve(err ? 0 : result.count);
                });
            }),
            new Promise((resolve) => {
                db.get('SELECT COUNT(*) as count FROM participants', [], (err, result) => {
                    resolve(err ? 0 : result.count);
                });
            })
        ]);

        db.close();

        res.json({
            users: stats[0],
            evaluations: stats[1],
            weeks: stats[2],
            participants: stats[3]
        });

    } catch (error) {
        res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
});

// ユーザー一覧取得
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const db = await getDatabase();
        
        db.all(
            'SELECT id, email, name, is_admin, created_at FROM users ORDER BY created_at DESC',
            [],
            (err, users) => {
                db.close();
                
                if (err) {
                    return res.status(500).json({ error: 'データベースエラー' });
                }

                res.json({ users });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
});

module.exports = router;