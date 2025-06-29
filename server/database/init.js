const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'yak_result.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

function initDatabase() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('データベース接続エラー:', err.message);
                reject(err);
                return;
            }
            console.log('SQLiteデータベースに接続しました');
        });

        const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
        
        db.exec(schema, (err) => {
            if (err) {
                console.error('スキーマ実行エラー:', err.message);
                reject(err);
                return;
            }
            console.log('データベーススキーマを初期化しました');
            
            // 既存のevaluationsテーブルに新しいカラムを追加（存在しない場合のみ）
            const migrations = [
                `ALTER TABLE evaluations ADD COLUMN is_name_valid BOOLEAN DEFAULT NULL`,
                `ALTER TABLE evaluations ADD COLUMN needs_name_correction BOOLEAN DEFAULT FALSE`,
                `ALTER TABLE evaluations ADD COLUMN original_evaluatee_name VARCHAR(255)`
            ];
            
            let migrationCount = 0;
            migrations.forEach((migration, index) => {
                db.run(migration, (err) => {
                    migrationCount++;
                    if (!err) {
                        console.log(`マイグレーション ${index + 1} 完了`);
                    }
                    if (migrationCount === migrations.length) {
                        resolve(db);
                    }
                });
            });
        });
    });
}

function getDatabase() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                reject(err);
                return;
            }
            
            // SQLiteの設定を最適化
            db.run('PRAGMA journal_mode = WAL', (err) => {
                if (err) {
                    console.warn('WALモード設定警告:', err.message);
                }
            });
            
            db.run('PRAGMA synchronous = NORMAL', (err) => {
                if (err) {
                    console.warn('同期モード設定警告:', err.message);
                }
            });
            
            db.run('PRAGMA cache_size = 10000', (err) => {
                if (err) {
                    console.warn('キャッシュサイズ設定警告:', err.message);
                }
            });
            
            resolve(db);
        });
    });
}

module.exports = {
    initDatabase,
    getDatabase,
    DB_PATH
};