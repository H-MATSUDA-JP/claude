# プロジェクト概要

ロリポップサーバーにFTPデプロイするWebサイト/Webアプリケーション。

## ローカルプレビュー

Claude Preview MCP を使用してプレビューする。

## デプロイ（FTPアップロード）

```bash
node deploy.js
```

FTP接続情報は `.env` に設定（`.env.example` を参考）。

## ファイル構成

- `index.html` — 目次ページ（ゲーム一覧）
- `tetris/index.html` — テトリス
- `deploy.js` — FTPデプロイスクリプト（アップロード対象外）
- `.env` — FTP接続情報（gitに含めない）
- `.env.example` — .envのテンプレート

新しいゲームを追加する場合は、フォルダを作成し `index.html` の目次にカードを追加する。

## デプロイ対象外ファイル

`deploy.js` 内の `IGNORE` リストで管理。以下はアップロードされない：
node_modules, .git, .env, .env.example, deploy.js, package.json, package-lock.json, CLAUDE.md, .gitignore
