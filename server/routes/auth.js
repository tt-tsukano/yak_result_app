const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database/init');
const { validateCompanyEmail } = require('../middleware/auth');
const router = express.Router();

// ユーザー登録
router.post('/register', async (req, res) => {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
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
        
        // 既存ユーザーチェック
        db.get('SELECT id FROM users WHERE email = ?', [email], async (err, existingUser) => {
            if (err) {
                db.close();
                return res.status(500).json({ error: 'データベースエラー' });
            }

            if (existingUser) {
                db.close();
                return res.status(400).json({ error: 'このメールアドレスは既に登録されています' });
            }

            // パスワードハッシュ化
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            // ユーザー挿入
            db.run(
                'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)',
                [email, passwordHash, name],
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
                        isAdmin: user.is_admin
                    }
                });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'サーバーエラーが発生しました' });
    }
});

module.exports = router;