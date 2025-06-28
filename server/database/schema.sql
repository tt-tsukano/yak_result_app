-- 他己評価閲覧アプリ データベーススキーマ

-- ユーザーテーブル
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 参加者リストテーブル（氏名表記統一用）
CREATE TABLE participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    official_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 氏名変換テーブル（表記ゆれ対応）
CREATE TABLE name_mappings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    variant_name VARCHAR(255) NOT NULL,
    official_name VARCHAR(255) NOT NULL,
    participant_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (participant_id) REFERENCES participants(id)
);

-- 他己評価テーブル
CREATE TABLE evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    respondent_email VARCHAR(255) NOT NULL,
    respondent_name VARCHAR(255) NOT NULL,
    evaluation_week VARCHAR(255) NOT NULL,
    evaluatee_name VARCHAR(255) NOT NULL,
    evaluation_category VARCHAR(100) NOT NULL, -- 'value_practice', 'principle_practice', 'contribution', 'value_promotion'
    evaluation_content TEXT NOT NULL,
    is_anonymous BOOLEAN DEFAULT TRUE,
    is_hidden BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (respondent_email) REFERENCES users(email)
);

-- インデックス作成
CREATE INDEX idx_evaluations_evaluatee ON evaluations(evaluatee_name);
CREATE INDEX idx_evaluations_respondent ON evaluations(respondent_email);
CREATE INDEX idx_evaluations_category ON evaluations(evaluation_category);
CREATE INDEX idx_evaluations_week ON evaluations(evaluation_week);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_name_mappings_variant ON name_mappings(variant_name);

-- 初期管理者データ挿入（パスワードは 'admin123' のハッシュ）
INSERT INTO users (email, password_hash, name, is_admin) VALUES 
('admin1@company.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '管理者1', TRUE),
('admin2@company.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '管理者2', TRUE),
('admin3@company.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '管理者3', TRUE);