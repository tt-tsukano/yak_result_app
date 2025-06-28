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
            resolve(db);
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
            resolve(db);
        });
    });
}

module.exports = {
    initDatabase,
    getDatabase,
    DB_PATH
};