# AI メンテナンス記録アシスタント

設備のメンテナンス記録を管理し、AI を活用して記録作成を支援するWebアプリケーションです。

## 概要

このアプリケーションは、設備のメンテナンス記録を効率的に管理するためのシステムです。AI チャット機能を使用して、メンテナンス作業の症状、原因、解決策を対話形式で抽出し、構造化された記録として保存できます。

## 主な機能

- **設備管理**: 設備マスタの登録、編集、削除
- **メンテナンス記録管理**: 過去のメンテナンス記録の検索、閲覧、作成、編集
- **AI チャットアシスタント**: 
  - 対話形式でメンテナンス情報（症状、原因、解決策）を抽出
  - PDF ファイルのアップロードと内容の分析
  - 抽出された情報から自動的にメンテナンス記録を生成
- **認証機能**: Amazon Cognito を使用した安全なユーザー認証
- **ファイル管理**: PDF ファイルのアップロードとダウンロード

## 技術スタック

### フロントエンド
- React 18
- TypeScript
- Vite (ビルドツール)
- React Router (ルーティング)
- TanStack Query (データフェッチング)
- Zustand (状態管理)
- Panda CSS (スタイリング)
- AWS Amplify (認証)

### バックエンド
- AWS Lambda (サーバーレス関数)
- API Gateway (REST API)
- DynamoDB (データベース)
- S3 (ファイルストレージ)
- Amazon Bedrock (AI 機能)
- TypeScript

### インフラストラクチャ
- AWS CDK (Infrastructure as Code)
- Amazon Cognito (ユーザー認証)

## 前提条件

- Node.js 20.x 以上
- npm 9.x 以上
- AWS CLI (設定済み)
- AWS CDK CLI
- AWS アカウント

## セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/Masa-1021/ai-maintenance-assistant.git
cd ai-maintenance-assistant
```

### 2. 依存関係のインストール

```bash
npm install
```

これにより、すべてのワークスペース（frontend、backend、shared、infra）の依存関係がインストールされます。

### 3. AWS インフラストラクチャのデプロイ

```bash
npm run infra:deploy
```

デプロイが完了すると、以下の情報が出力されます：
- API エンドポイント URL
- Cognito User Pool ID
- Cognito User Pool Client ID

### 4. フロントエンド環境変数の設定

`frontend/.env` ファイルを作成し、デプロイで出力された値を設定します：

```bash
cd frontend
cp .env.example .env
```

`.env` ファイルを編集：

```
VITE_API_ENDPOINT=https://your-api-id.execute-api.ap-northeast-1.amazonaws.com/prod
VITE_USER_POOL_ID=ap-northeast-1_XXXXXXXXX
VITE_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 開発

### フロントエンドの開発サーバー起動

```bash
npm run frontend:dev
```

ブラウザで `http://localhost:5173` を開きます。

### バックエンドのビルド

```bash
npm run backend:build
```

### テストの実行

すべてのテストを実行：

```bash
npm test
```

バックエンドのテストのみ：

```bash
npm run backend:test
```

フロントエンドのテスト：

```bash
cd frontend
npm test
```

E2E テスト：

```bash
cd frontend
npm run test:e2e
```

## プロジェクト構成

```
.
├── frontend/          # React フロントエンドアプリケーション
│   ├── src/
│   │   ├── components/    # 再利用可能なコンポーネント
│   │   ├── pages/         # ページコンポーネント
│   │   ├── lib/           # ライブラリとユーティリティ
│   │   └── stores/        # 状態管理
│   └── e2e/              # E2E テスト
│
├── backend/           # Lambda 関数
│   └── src/
│       ├── handlers/      # Lambda ハンドラー
│       └── utils/         # ユーティリティ関数
│
├── shared/            # 共通の型定義
│   └── types/
│
├── infra/             # AWS CDK インフラストラクチャコード
│   └── lib/
│       ├── auth-stack.ts      # 認証スタック
│       ├── database-stack.ts  # データベーススタック
│       ├── storage-stack.ts   # ストレージスタック
│       ├── api-stack.ts       # API スタック
│       └── main-stack.ts      # メインスタック
│
└── package.json       # ルートパッケージ（モノレポ設定）
```

## API エンドポイント

### 設備 (Equipment)
- `GET /equipment` - 設備一覧の取得
- `GET /equipment/{id}` - 設備詳細の取得
- `POST /equipment` - 設備の作成
- `PUT /equipment/{id}` - 設備の更新
- `DELETE /equipment/{id}` - 設備の削除

### メンテナンス記録 (Records)
- `GET /records` - 記録一覧の取得（フィルタリング可能）
- `GET /records/{id}` - 記録詳細の取得
- `POST /records` - 記録の作成
- `PUT /records/{id}` - 記録の更新
- `DELETE /records/{id}` - 記録の削除

### チャット (Chat)
- `GET /chat/sessions` - チャットセッション一覧の取得
- `GET /chat/sessions/{sessionId}` - セッション詳細の取得
- `POST /chat/sessions` - 新しいセッションの作成
- `POST /chat/sessions/{sessionId}/messages` - メッセージの送信
- `GET /chat/sessions/{sessionId}/messages` - メッセージ履歴の取得
- `POST /chat/sessions/{sessionId}/complete` - セッションの完了

### ファイル (Files)
- `POST /files/upload-url` - アップロード用署名付き URL の取得
- `POST /files/download-url` - ダウンロード用署名付き URL の取得

## 使い方

### 1. ユーザー登録とログイン

初回利用時は、管理者が AWS Cognito コンソールでユーザーを作成する必要があります。

### 2. 設備の登録

「設備管理」ページで、メンテナンス対象の設備を登録します。

### 3. AI チャットでメンテナンス記録を作成

1. 「チャット」ページで設備を選択
2. メンテナンス作業について AI と対話
3. 必要に応じて PDF ファイルをアップロード
4. AI が症状、原因、解決策を抽出
5. 「記録を保存」ボタンで記録を作成

### 4. 記録の検索と閲覧

「記録一覧」ページで、過去のメンテナンス記録を検索・閲覧できます。

## デプロイ

### 本番環境へのデプロイ

インフラストラクチャのデプロイ：

```bash
npm run infra:deploy
```

フロントエンドのビルド：

```bash
npm run frontend:build
```

ビルドされたファイルは `frontend/dist` ディレクトリに出力されます。これを静的ホスティングサービス（S3 + CloudFront など）にデプロイしてください。

### インフラストラクチャの削除

```bash
npm run infra:destroy
```

## トラブルシューティング

### デプロイエラー

- AWS CLI が正しく設定されているか確認してください
- AWS アカウントに必要な権限があるか確認してください
- CDK のブートストラップが実行されているか確認してください：`cdk bootstrap`

### フロントエンドが起動しない

- `.env` ファイルが正しく設定されているか確認してください
- `node_modules` を削除して再インストールしてください：`rm -rf node_modules && npm install`

### API エラー

- API Gateway のエンドポイント URL が正しく設定されているか確認してください
- Lambda 関数のログを CloudWatch Logs で確認してください

## ライセンス

このプロジェクトはプライベートです。

## 開発者向け情報

### コード規約

- TypeScript の厳密モードを使用
- ESLint ルールに従う
- コンポーネントは機能ごとに分割

### ビルドコマンド

```bash
# フロントエンドのビルド
npm run frontend:build

# バックエンドのビルド
npm run backend:build
```

### 型チェック

```bash
cd frontend
npm run typecheck
```

### リント

```bash
cd frontend
npm run lint
```
