require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
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

// CORS設定（リバースプロキシ用に調整）
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://www.unitecloudone-demo.com', 'http://localhost:5000'] // リバースプロキシ用
        : ['http://localhost:3000'],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// リクエストログを追加（デバッグ用）
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// ヘルスチェック用エンドポイント
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ルート設定
console.log('Loading auth routes...');
app.use('/api/auth', require('./routes/auth'));
console.log('Loading evaluations routes...');
app.use('/api/evaluations', require('./routes/evaluations'));
console.log('Loading admin routes...');
app.use('/api/admin', require('./routes/admin'));

// 静的ファイルの提供は削除（IISが担当）

// エラーハンドリング
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'サーバー内部エラーが発生しました' });
});

// 404ハンドリング
app.use((req, res) => {
    console.log(`404 - Route not found: ${req.method} ${req.url}`);
    res.status(404).json({ error: 'エンドポイントが見つかりません' });
});

// データベース初期化とサーバー起動
async function startServer() {
    try {
        await initDatabase();
        console.log('データベースが正常に初期化されました');
        
        app.listen(PORT, '127.0.0.1', () => {
            console.log(`Node.jsサーバーがポート ${PORT} で起動しました`);
            console.log(`ヘルスチェック: http://127.0.0.1:${PORT}/health`);
            console.log('登録されているルート:');
            app._router.stack.forEach(function(r){
                if (r.route && r.route.path){
                    console.log(`  ${Object.keys(r.route.methods).join(', ').toUpperCase()} ${r.route.path}`);
                } else if (r.name === 'router') {
                    console.log(`  Router middleware: ${r.regexp}`);
                }
            });
        });
    } catch (error) {
        console.error('サーバー起動エラー:', error);
        process.exit(1);
    }
}

startServer();