require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initDatabase } = require('./database/init');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// セキュリティミドルウェア
app.use(helmet());

// レート制限
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分
    max: 100, // 最大100リクエスト
    message: { error: 'リクエストが多すぎます。しばらくしてから再試行してください。' }
});
app.use(limiter);

// CORS設定
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['http://localhost:3000'] // 本番環境では適切なドメインに変更
        : ['http://localhost:3000'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ルート設定
app.use('/api/auth', require('./routes/auth'));
app.use('/api/evaluations', require('./routes/evaluations'));
app.use('/api/admin', require('./routes/admin'));

// 本番環境では静的ファイルを提供
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, '../client/build')));
    
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
    });
}

// エラーハンドリング
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'サーバー内部エラーが発生しました' });
});

// 404ハンドリング
app.use((req, res) => {
    res.status(404).json({ error: 'エンドポイントが見つかりません' });
});

// データベース初期化とサーバー起動
async function startServer() {
    try {
        await initDatabase();
        console.log('データベースが正常に初期化されました');
        
        app.listen(PORT, () => {
            console.log(`サーバーがポート ${PORT} で起動しました`);
            console.log(`開発環境: http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('サーバー起動エラー:', error);
        process.exit(1);
    }
}

startServer();