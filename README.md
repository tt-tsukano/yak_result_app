# 他己評価閲覧アプリ

社内で実施した週次アンケートの他己評価結果を社員が閲覧できるWebアプリケーションです。

## 機能概要

- **ユーザー認証**: 社内ドメインメールアドレスによる認証
- **他己評価閲覧**: 自分に対する他己評価の閲覧、カテゴリ・週別フィルタリング
- **評価設定変更**: 評価者が自分の過去評価の匿名性・内容を変更
- **管理者機能**: Excelファイルからのデータインポート、ユーザー管理
- **氏名表記統一**: 日本語氏名の表記ゆれ対応（要実装）

## 技術スタック

- **Frontend**: React 19, React Router, Axios
- **Backend**: Node.js, Express
- **Database**: SQLite
- **File Processing**: XLSX (Excel処理)
- **Authentication**: JWT + bcrypt

## 開発環境セットアップ

### 1. 依存関係のインストール

```bash
# ルートディレクトリで
npm install

# フロントエンド依存関係
cd client
npm install
cd ..
```

### 2. 環境変数設定

`.env`ファイルを編集:
```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=5000
NODE_ENV=development
COMPANY_DOMAIN=company.com
```

### 3. 開発サーバー起動

```bash
# バックエンド起動 (ポート 5000)
node server/index.js

# フロントエンド起動 (ポート 3000)
cd client
npm start
```

## 初期設定

### 管理者アカウント

初期管理者アカウント（パスワード: `admin123`）:
- admin1@company.com
- admin2@company.com 
- admin3@company.com

### データインポート

1. 管理者でログイン
2. 管理者パネル → データインポート
3. Microsoft Forms出力のExcelファイルをアップロード

## API エンドポイント

### 認証
- `POST /api/auth/register` - ユーザー登録
- `POST /api/auth/login` - ログイン

### 評価
- `GET /api/evaluations/received` - 受け取った評価一覧
- `GET /api/evaluations/given` - 行った評価一覧
- `PUT /api/evaluations/:id/settings` - 評価設定更新
- `GET /api/evaluations/categories` - 評価カテゴリ一覧
- `GET /api/evaluations/weeks` - 実施週一覧

### 管理者
- `POST /api/admin/import-excel` - 評価データインポート
- `POST /api/admin/import-participants` - 参加者リストインポート
- `GET /api/admin/stats` - システム統計
- `GET /api/admin/users` - ユーザー一覧

## データベーススキーマ

### users テーブル
ユーザー情報とログイン認証

### evaluations テーブル
他己評価データ（4つのカテゴリ）

### participants テーブル
参加者リスト（氏名表記統一用）

### name_mappings テーブル
氏名の表記ゆれ管理

## 評価カテゴリ

1. **3つのバリューの実践** (value_practice)
   - 横軸：組織としての横のつながりを大事にする姿勢
   - 感動：熟考して立ち止まるのではなく感じたらすぐに動いて行動に移す姿勢
   - 技研：最新の情報をインプットし自身の技術を研く姿勢

2. **プリンシプルの実践** (principle_practice)

3. **プロジェクトメンバー評価（貢献度）** (contribution)

4. **プロジェクトメンバー評価（バリュー実践）** (value_promotion)

## セキュリティ

- JWT認証による API アクセス制御
- 社内ドメインメールアドレス制限
- ユーザーは自分の評価データのみアクセス可能
- 評価者は自分が行った評価のみ変更可能
- レート制限とセキュリティヘッダー設定

## 本番デプロイ

1. `NODE_ENV=production` に設定
2. JWT_SECRET を強固なものに変更
3. `npm run build` でフロントエンドをビルド
4. 静的ファイルを Express で配信

## 今後の拡張予定

- 氏名表記統一機能の完全実装
- 新規アンケート実施機能
- レポート・分析機能
- モバイル対応
- 通知機能