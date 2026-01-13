# メンテナンス記録管理システム - 開発進捗

## プロジェクト概要

AWS上で動作する設備メンテナンス記録管理システム。
AIチャット（Claude 3.5 Sonnet via Bedrock）がユーザー入力を「症状」「原因」「対策」に分類・整理する。

## デプロイ情報

| 項目 | 値 |
|------|-----|
| リージョン | us-west-2 |
| CloudFront URL | https://d1x41ktw0cfzop.cloudfront.net |
| API Gateway URL | https://c2fv7r19kd.execute-api.us-west-2.amazonaws.com/prod |
| User Pool ID | us-west-2_rjur2fYfO |
| User Pool Client ID | 7d59854bbo16qe8f3vf6dk9nse |
| テストユーザー | test@example.com / TestPass123! |

## 進捗状況

### Phase 1: プロジェクト基盤構築 - 完了 ✅

- [x] プロジェクトディレクトリ構造作成
- [x] バックエンド初期化 (TypeScript, esbuild)
- [x] フロントエンド初期化 (Vite, React, TypeScript)
- [x] インフラ初期化 (AWS CDK)
- [x] 共通設定ファイル (ESLint, Prettier, tsconfig)
- [x] Git初期化

### Phase 2: バックエンド実装 - 完了 ✅

- [x] DynamoDB テーブル設計 (Equipment, Record, ChatSession, ChatMessage)
- [x] Lambda ハンドラー実装
  - [x] Equipment CRUD (/equipment)
  - [x] Record CRUD (/records, /records/export)
  - [x] Chat Sessions & Messages (/chat/sessions, /chat/sessions/{id}/messages)
  - [x] File Upload (/files/upload-url)
- [x] Bedrock連携 (Claude 3.5 Sonnet)
- [x] S3連携 (PDF アップロード)
- [x] Cognito認証

### Phase 3: フロントエンド実装 - 完了 ✅

- [x] React Router セットアップ
- [x] AWS Amplify 認証設定
- [x] Zustand 状態管理 (authStore)
- [x] React Query データフェッチング
- [x] ページ実装
  - [x] LoginPage - ログイン画面
  - [x] ChatPage - AIチャット画面
  - [x] RecordsPage - 記録一覧・検索・CSVエクスポート
  - [x] EquipmentPage - 設備マスタ管理
- [x] コンポーネント (Layout, ProtectedRoute)
- [x] API クライアント (equipment, chat, records, files)

### Phase 4: インフラ・デプロイ - 完了 ✅

- [x] CDK スタック実装
  - [x] AuthStack - Cognito User Pool
  - [x] DatabaseStack - DynamoDB テーブル
  - [x] StorageStack - S3 バケット, CloudFront
  - [x] ApiStack - API Gateway, Lambda
- [x] us-west-2 リージョンへのデプロイ
- [x] フロントエンドビルド & S3アップロード
- [x] CloudFront キャッシュ無効化

### Phase 5: 動作確認テスト - 完了 ✅

| テスト項目 | 結果 |
|-----------|------|
| ログイン/認証 | ✅ 成功 |
| 設備マスタ CRUD | ✅ 成功 |
| チャットセッション作成 | ✅ 成功 |
| AI応答 (Bedrock連携) | ✅ 成功 |
| 症状/原因/対策の抽出・分類 | ✅ 成功 |
| メンテナンス記録保存 | ✅ 成功 |
| 記録一覧表示 | ✅ 成功 |
| CSVエクスポート | ✅ 成功 |

### Phase 6: 自動テスト - 完了 ✅

- [x] バックエンドユニットテスト (Vitest) - 30テスト合格
- [x] E2Eテスト (Playwright) - 11テスト合格

#### テスト詳細

**バックエンド (Vitest)**
- `src/utils/response.test.ts` - 15テスト (レスポンスユーティリティ)
- `src/handlers/equipment.test.ts` - 15テスト (設備CRUD操作)

**E2E (Playwright)**
- `e2e/auth.spec.ts` - 4テスト (認証フロー)
- `e2e/chat.spec.ts` - 4テスト (チャット機能)
- `e2e/equipment.spec.ts` - 3テスト (設備管理)

#### テスト実行コマンド

```bash
# バックエンドユニットテスト
cd backend && npm run test

# E2Eテスト
cd frontend && npm run test:e2e
```

## 修正履歴

### 2026-01-13

1. **リージョン変更**: ap-northeast-1 → us-west-2
2. **Bedrockモデル修正**: `bedrock.ts`
   - リージョン: `'ap-northeast-1'` → `'us-west-2'`
   - モデルID: `anthropic.claude-sonnet-4-20250514-v1:0` → `anthropic.claude-3-5-sonnet-20241022-v2:0`
3. **DynamoDB getSession修正**: `chat.ts`
   - QueryCommand → ScanCommand (id検索のため)
4. **CORS修正**: `api-stack.ts`
   - Gateway Responses追加 (4xx/5xx エラー時のCORSヘッダー)
5. **認証トークン修正**: `authStore.ts`
   - accessToken → idToken (Cognito User Pool Authorizer用)
6. **React無限ループ修正**: `ChatPage.tsx`
   - useEffect依存配列からsetSessionsを除外

## ファイル構成

```
maintenance-record-app/
├── backend/
│   ├── src/
│   │   ├── handlers/
│   │   │   ├── equipment.ts
│   │   │   ├── equipment.test.ts    # ユニットテスト
│   │   │   ├── chat.ts
│   │   │   ├── record.ts
│   │   │   └── file.ts
│   │   └── utils/
│   │       ├── dynamodb.ts
│   │       ├── response.ts
│   │       ├── response.test.ts      # ユニットテスト
│   │       ├── bedrock.ts
│   │       └── s3.ts
│   └── vitest.config.ts
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── ChatPage.tsx
│   │   │   ├── RecordsPage.tsx
│   │   │   └── EquipmentPage.tsx
│   │   ├── components/
│   │   ├── stores/
│   │   ├── api/
│   │   └── App.tsx
│   ├── e2e/                          # E2Eテスト
│   │   ├── auth.spec.ts
│   │   ├── chat.spec.ts
│   │   └── equipment.spec.ts
│   ├── playwright.config.ts
│   └── .env
├── infra/
│   ├── bin/
│   │   └── app.ts
│   ├── lib/
│   │   ├── auth-stack.ts
│   │   ├── database-stack.ts
│   │   ├── storage-stack.ts
│   │   └── api-stack.ts
│   └── deploy.ps1
└── PROGRESS.md
```

## 次のステップ

1. CI/CDパイプライン構築 (GitHub Actions)
2. 本番環境用の設定最適化
3. モニタリング・アラート設定
4. ドキュメント整備
