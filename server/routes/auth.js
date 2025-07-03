const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const { getDatabase } = require('../database/init');
const { validateCompanyEmail } = require('../middleware/auth');
const router = express.Router();

// パスワードリセット用のレート制限（5分間に3回まで）
const passwordResetLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5分
    max: 3, // 最大3リクエスト
    message: { error: 'パスワードリセットの試行回数が多すぎます。5分後に再試行してください。' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Gmail SMTPトランスポーターを作成する関数
function createGmailTransporter() {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        throw new Error('Gmail SMTP設定が不完全です。EMAIL_USERとEMAIL_PASSを設定してください。');
    }

    return nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false, // Gmail SMTPは587ポートでSTARTTLS
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS, // Gmailアプリパスワード
        },
        tls: {
            rejectUnauthorized: false
        }
    });
}

// セキュアなトークン生成関数
function generateSecureToken() {
    return crypto.randomBytes(32).toString('hex'); // より長いトークン
}

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
router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'メールアドレスを入力してください。' });
    }

    if (!validateCompanyEmail(email)) {
        const companyDomain = process.env.COMPANY_DOMAIN || 'company.com';
        return res.status(400).json({ 
            error: `社内ドメイン（@${companyDomain}）のメールアドレスを使用してください` 
        });
    }

    try {
        const db = await getDatabase();
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                db.close();
                return res.status(500).json({ error: 'データベースエラーが発生しました。' });
            }

            if (!user) {
                db.close();
                // セキュリティのため、ユーザーが存在しない場合でも成功メッセージを返す
                return res.status(200).json({ 
                    message: 'パスワード再設定用のメールを送信しました。受信トレイをご確認ください。' 
                });
            }

            // セキュアなトークンを生成
            const token = generateSecureToken();
            const expiryHours = parseInt(process.env.RESET_PASSWORD_EXPIRY_HOURS) || 1;
            const expires = Date.now() + (expiryHours * 60 * 60 * 1000); // 設定可能な有効期限

            db.run(
                'UPDATE users SET reset_password_token = ?, reset_password_expires = ? WHERE email = ?',
                [token, expires, email],
                async (updateErr) => {
                    db.close();
                    if (updateErr) {
                        console.error('トークン保存エラー:', updateErr);
                        return res.status(500).json({ error: 'トークンの保存に失敗しました。' });
                    }

                    try {
                        // Gmail SMTP設定をチェック
                        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
                            console.error('Gmail SMTP設定が未完了です。');
                            return res.status(500).json({ 
                                error: 'メール送信設定が未完了です。管理者にお問い合わせください。' 
                            });
                        }

                        const transporter = createGmailTransporter();
                    
                        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
                        const resetURL = `${frontendUrl}/reset-password/${token}`;
                        const fromEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
                        
                        const mailOptions = {
                            from: `"他己評価閲覧アプリ" <${fromEmail}>`,
                            to: user.email,
                            subject: 'パスワード再設定のご案内',
                            text: `${user.name}様\n\nパスワードを再設定するには、以下のリンクをクリックしてください。\n\n${resetURL}\n\nこのリンクの有効期限は${expiryHours}時間です。\n\n※このメールに心当たりがない場合は、このメールを無視してください。`,
                            html: `
                                <h2>パスワード再設定のご案内</h2>
                                <p>${user.name}様</p>
                                <p>パスワードを再設定するには、以下のリンクをクリックしてください。</p>
                                <p><a href="${resetURL}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">パスワードを再設定する</a></p>
                                <p>または、以下のURLをブラウザにコピー＆ペーストしてください：</p>
                                <p>${resetURL}</p>
                                <p><strong>このリンクの有効期限は${expiryHours}時間です。</strong></p>
                                <hr>
                                <p><small>※このメールに心当たりがない場合は、このメールを無視してください。</small></p>
                            `
                        };

                        const info = await transporter.sendMail(mailOptions);
                        
                        console.log('パスワードリセットメール送信成功:', info.messageId);
                        console.log('送信先:', user.email);

                        res.status(200).json({ 
                            message: 'パスワード再設定用のメールを送信しました。受信トレイをご確認ください。' 
                        });

                    } catch (mailError) {
                        console.error('メール送信エラー:', mailError);
                        return res.status(500).json({ 
                            error: 'メールの送信に失敗しました。しばらく時間をおいて再試行するか、管理者にお問い合わせください。' 
                        });
                    }
                }
            );
        });
    } catch (error) {
        console.error('パスワードリセット申請エラー:', error);
        res.status(500).json({ error: 'サーバーエラーが発生しました。' });
    }
});

// パスワード再設定
router.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ error: '新しいパスワードを入力してください。' });
    }

    if (!token) {
        return res.status(400).json({ error: '無効なリセットトークンです。' });
    }

    // パスワード強度チェック
    if (password.length < 6) {
        return res.status(400).json({ error: 'パスワードは6文字以上である必要があります。' });
    }

    try {
        const db = await getDatabase();
        // トークンが有効で、かつ有効期限内かチェック
        db.get(
            'SELECT * FROM users WHERE reset_password_token = ? AND reset_password_expires > ?',
            [token, Date.now()],
            async (err, user) => {
                if (err) {
                    db.close();
                    console.error('データベースエラー:', err);
                    return res.status(500).json({ error: 'データベースエラーが発生しました。' });
                }

                if (!user) {
                    db.close();
                    return res.status(400).json({ error: '無効なトークンか、有効期限が切れています。新しいパスワードリセットを申請してください。' });
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
                            console.error('パスワード更新エラー:', updateErr);
                            return res.status(500).json({ error: 'パスワードの更新に失敗しました。再度お試しください。' });
                        }
                        
                        console.log('パスワード正常更新:', user.email);
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