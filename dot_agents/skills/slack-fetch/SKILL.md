---
name: slack-fetch
description: "Slack: Fetch a message and its thread from a Slack URL. Requires rbw (Bitwarden) to be pre-unlocked."
metadata:
  requires:
    bins:
      - python3
      - rbw
---

# slack-fetch

Slack URLからメッセージとスレッドを取得する。

## 前提条件

- `rbw` が認証済み（unlocked）であること
- Bitwarden に `tt-slack-token` というアイテムがあり、パスワードに Slack API Token が入っていること
- トークンは `channels:history`、`groups:history`、`users:read` スコープを持つこと

rbw が locked の場合はスクリプトがエラー終了する（unlock の試みはしない）。

## 使い方

```bash
python3 ~/.claude/skills/slack-fetch/slack_fetch.py "<slack-url>"
```

## ワークフロー

ユーザーが Slack URL を渡してきたとき:

1. スクリプトを実行する:
   ```bash
   python3 ~/.claude/skills/slack-fetch/slack_fetch.py "<url>"
   ```
2. 出力の構造:
   - `channel:` — チャンネル ID
   - `## Root message` — リンク先のメッセージ（author情報・タイムスタンプ付き）
   - `## Thread (N replies)` — スレッド返信（あれば）
3. 取得した内容をユーザーの指示に従って処理する（queue.yaml への追記、要約など）

## エラー対処

| エラーメッセージ | 原因 | 対処 |
|---|---|---|
| `failed to get token from rbw` | rbw がロックされている | ユーザーに `rbw unlock` を依頼 |
| `rbw returned an empty value` | アイテムにパスワードが未設定 | Bitwarden で `tt-slack-token` を確認 |
| `channel_not_found` | トークンがチャンネルにアクセス不可 | チャンネルにアプリを招待 or User Token を使用 |
| `not_in_channel` | Bot が未招待 | Slack で `/invite @app-name` を実行 |
