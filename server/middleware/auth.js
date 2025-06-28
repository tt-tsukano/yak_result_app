const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database/init');

async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'アクセストークンが必要です' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const db = await getDatabase();
        
        db.get(
            'SELECT id, email, name, is_admin FROM users WHERE id = ?',
            [decoded.userId],
            (err, user) => {
                db.close();
                
                if (err) {
                    return res.status(500).json({ error: 'データベースエラー' });
                }
                
                if (!user) {
                    return res.status(403).json({ error: '無効なトークンです' });
                }
                
                req.user = user;
                next();
            }
        );
    } catch (error) {
        return res.status(403).json({ error: '無効なトークンです' });
    }
}

function requireAdmin(req, res, next) {
    if (!req.user.is_admin) {
        return res.status(403).json({ error: '管理者権限が必要です' });
    }
    next();
}

function validateCompanyEmail(email) {
    const companyDomain = process.env.COMPANY_DOMAIN || 'company.com';
    return email.endsWith(`@${companyDomain}`);
}

module.exports = {
    authenticateToken,
    requireAdmin,
    validateCompanyEmail
};