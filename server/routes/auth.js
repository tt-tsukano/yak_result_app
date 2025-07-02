const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { getDatabase } = require('../database/init');
const { validateCompanyEmail } = require('../middleware/auth');
const router = express.Router();

// ユーザー登録
router.post('/register', async (req, res) => {
    // nameをリクエストボディから削除
    const { email, password } = req.body;

    // nameの必須チェックを削除
    if (!email || !password) {
        return res.status(400).json({ error: '全ての項目を入力してください' });
    }

    if (!validateCompanyEmail(email)) {
        const companyDomain = process.env.COMPANY_DOMAIN || 'company.com';
        return res.status(400).json({ 
            error: `社内ドメイン（@${companyDomain}）のメールアドレスを使用してください` 
        });
    }

    try {
        const db = await getDatabase();
        
        // 1. 評価データからメールアドレスで氏名を取得
        db.get('SELECT respondent_name FROM evaluations WHERE respondent_email = ? LIMIT 1', [email], async (err, evaluation) => {
            if (err) {
                db.close();
                return res.status(500).json({ error: 'データベースエラーが発生しました。' });
            }

            // 評価データにメールアドレスが存在しない場合はエラー
            if (!evaluation) {
                db.close();
                return res.status(400).json({ error: '評価回答履歴が見つかりません。アンケートで使用したメールアドレスで登録してください。' });
            }

            const officialName = evaluation.respondent_name; // 取得した氏名

            // 2. 既存ユーザーチェック
            db.get('SELECT id FROM users WHERE email = ?', [email], async (err, existingUser) => {
                if (err) {
                    db.close();
                    return res.status(500).json({ error: 'データベースエラーが発生しました。' });
                }

                if (existingUser) {
                    db.close();
                    return res.status(400).json({ error: 'このメールアドレスは既に登録されています' });
                }

                // 3. パスワードハッシュ化
                const saltRounds = 10;
                const passwordHash = await bcrypt.hash(password, saltRounds);

                // 4. ユーザー挿入（取得した氏名を使用）
                db.run(
                    'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
                    [email, passwordHash, officialName],
                    function(err) {
                        db.close();
                        
                        if (err) {
                            return res.status(500).json({ error: 'ユーザー登録に失敗しました' });
                        }

                        res.status(201).json({ 
                            message: 'ユーザー登録が完了しました',
                            userId: this.lastID 
                        });
                    }
                );
            });
        });

    } catch (error) {
        res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
});

// ログイン
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'メールアドレスとパスワードを入力してください' });
    }

    try {
        const db = await getDatabase();
        
        db.get(
            'SELECT id, email, password_hash, name, is_admin FROM users WHERE email = ?',
            [email],
            async (err, user) => {
                db.close();
                
                if (err) {
                    return res.status(500).json({ error: 'データベースエラー' });
                }

                if (!user) {
                    return res.status(401).json({ error: 'メールアドレスまたはパスワードが間違っています' });
                }

                // パスワード検証
                const isPasswordValid = await bcrypt.compare(password, user.password_hash);
                
                if (!isPasswordValid) {
                    return res.status(401).json({ error: 'メールアドレスまたはパスワードが間違っています' });
                }

                // JWT生成
                const token = jwt.sign(
                    { userId: user.id, email: user.email },
                    process.env.JWT_SECRET,
                    { expiresIn: '24h' }
                );

                res.json({
                    message: 'ログインに成功しました',
                    token,
                    user: {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                        isAdmin: Boolean(user.is_admin)
                    }
                });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
});

// パスワードリセット申請
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        const db = await getDatabase();
        db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
            if (err || !user) {
                db.close();
                // ユーザーが存在しない場合でも、セキュリティのため成功メッセージを返す
                return res.status(200).json({ message: 'パスワード再設定用のメールを送信しました。受信トレイをご確認ください。' });
            }

            // トークンを生成
            const token = crypto.randomBytes(20).toString('hex');
            const expires = Date.now() + 3600000; // 1時間有効

            db.run(
                'UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE email = ?',
                [token, expires, email],
                async (err) => {
                    db.close();
                    if (err) {
                        return res.status(500).json({ error: 'トークンの保存に失敗しました。' });
                    }

                    const testAccount = await nodemailer.createTestAccount();

                    const transporter = nodemailer.createTransport({
                        host: 'smtp.ethereal.email',
                        port: 587,
                        secure: false, // true for 465, false for other ports
                        auth: {
                            user: testAccount.user, // Etherealのユーザー名
                            pass: testAccount.pass, // Etherealのパスワード
                        },
                    });
                    
                    const resetURL = `http://localhost:3000/reset-password/${token}`;
                    
                    const mailOptions = {
                        from: '"他己評価閲覧アプリ" <noreply@example.com>',
                        to: user.email,
                        subject: 'パスワード再設定のご案内',
                        text: `パスワードを再設定するには、以下のリンクをクリックしてください。\n\n${resetURL}\n\nこのリンクの有効期限は1時間です。`,
                        html: `<p>パスワードを再設定するには、以下のリンクをクリックしてください。</p><a href="${resetURL}">${resetURL}</a><p>このリンクの有効期限は1時間です。</p>`
                    };

                    try {
                        const info = await transporter.sendMail(mailOptions);
                        
                        console.log('--- Ethereal メールプレビュー ---');
                        console.log('メールが正常に送信（シミュレート）されました。');
                        console.log('プレビューURL: ' + nodemailer.getTestMessageUrl(info));
                        console.log('---------------------------------');

                    } catch (mailError) {
                        console.error('メール送信エラー:', mailError);
                        return res.status(500).json({ error: 'メールの送信に失敗しました。' });
                    }
                    
                    res.status(200).json({ message: 'パスワード再設定用のメールを送信しました。受信トレイをご確認ください。' });
                }
            );
        });
    } catch (error) {
        res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
});

// パスワード再設定
router.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ error: '新しいパスワードを入力してください。' });
    }

    try {
        const db = await getDatabase();
        // トークンが有効で、かつ有効期限内かチェック
        db.get(
            'SELECT * FROM users WHERE reset_password_token = ? AND reset_password_expires > ?',
            [token, Date.now()],
            async (err, user) => {
                if (err || !user) {
                    db.close();
                    return res.status(400).json({ error: '無効なトークンか、有効期限が切れています。' });
                }

                // 新しいパスワードをハッシュ化
                const saltRounds = 10;
                const passwordHash = await bcrypt.hash(password, saltRounds);

                // パスワードを更新し、トークンを無効化
                db.run(
                    'UPDATE users SET password_hash = ?, reset_password_token = NULL, reset_password_expires = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                    [passwordHash, user.id],
                    (updateErr) => {
                        db.close();
                        if (updateErr) {
                            return res.status(500).json({ error: 'パスワードの更新に失敗しました。' });
                        }
                        res.status(200).json({ message: 'パスワードが正常に更新されました。ログインしてください。' });
                    }
                );
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
});

module.exports = router;