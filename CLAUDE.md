# maplestoyr-boss-scheduler

このファイルは Claude Code がこのリポジトリで作業する際に参照するプロジェクト設定です。

## 概要

メイプルストーリーのボス討伐日程をパーティー内で調整するWebツール。
詳細は [docs/implementation-plan.md](docs/implementation-plan.md)、Firebaseの手動セットアップ手順は
[docs/firebase-setup.md](docs/firebase-setup.md) を参照。

- フロントエンド: React + TypeScript + Vite + Tailwind CSS
- データ共有: Firebase Firestore（匿名認証で識別）
- ホスティング: GitHub Pages（`main` push で GitHub Actions が自動デプロイ）

## 開発コマンド

```bash
npm install        # 依存関係のインストール
npm run dev         # 開発サーバー起動
npm run build       # 本番ビルド（tsc + vite build）
npm run preview     # ビルド結果のプレビュー
```

ローカル開発には `.env.local`（`.env.local.example` をコピーして作成）に
Firebaseの設定値が必要。詳細は [docs/firebase-setup.md](docs/firebase-setup.md) を参照。
