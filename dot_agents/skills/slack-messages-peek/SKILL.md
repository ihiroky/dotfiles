---
name: slack-messages-peek
description: "Slack: 指定した発言者（省略時は自分）の発言を一時取得し、保存せずに検討の種として扱う。指定日（省略時は当日）の発言をリストアップし、指定されたスレッドを展開して会話の中で要約・論点抽出・比較する。raw/inbox/items/ には一切書き込まない。--from で他ユーザーや複数人、--in でチャネルを指定できる。"
metadata:
  requires:
    bins:
      - python3
      - rbw
---

# slack-messages-peek

指定日（省略時は当日）の指定発言者（省略時は自分）の Slack 発言を**一時的に**取得し、内容を会話の中で検討するためのスキル。`raw/inbox/items/` には**書き込まない**。眺めて「やはり残したい」となったら [`slack-messages-save`](../slack-messages-save/SKILL.md) を案内する。

取得スクリプトは `slack-messages-save` と共有する（このスキルは取得して見せるだけで、永続化処理を持たない点だけが異なる）。

## 前提条件

- `rbw` が認証済み（unlocked）であること
- `tt-slack-token` が `search:read`、`users:read`、`channels:history`、`groups:history` スコープを持つこと

rbw が locked の場合はスクリプトがエラー終了する（unlock の試みはしない）。

## 使い方

```
/slack-messages-peek [YYYYMMDD] [--from user1,user2,...] [--in channel]
```

引数はすべて省略可能。

| 引数 | 省略時 | 説明 |
|---|---|---|
| `YYYYMMDD`（位置引数） | 当日（JST） | 取得対象日 |
| `--from` | 自分 | 発言者ハンドル。カンマ区切りで**複数人指定可**（例: `--from tanaka,sato`）。`@` は付けても付けなくてもよい |
| `--in` | 全チャネル | チャネル絞り込み（例: `--in #dev` または `--in dev`） |

## ワークフロー

**Step 1: スクリプト実行**

`slack-messages-save` の取得スクリプトを共有して使う:

```bash
python3 {Base directory for this skill}/../slack-messages-save/slack_messages.py [YYYYMMDD] [--from user1,user2,...] [--in channel]
```

**Step 2: 一覧表示**

JSON を受け取り、以下の形式でユーザーに表示する。各スレッドの発言者は `authors` フィールドに入る:

```
{date} の発言 ({count} 件)  対象: {from の値}

1. [10:30] #general  by tanaka  (3 replies)
   メッセージ冒頭...
   URL: https://tech-touch.slack.com/archives/.../p...

2. [14:15] #dev  by tanaka, sato  (0 replies)
   ...
```

件数が 0 の場合は「{date} の{対象}発言は見つかりませんでした」と表示して終了する。

**Step 3: 展開するスレッドの指定を求める**

「中身を見たい番号をカンマ区切りで入力してください（例: 1,3）。一覧だけでよければ `none`」

`none` または空の入力なら、一覧の提示のみで終了する。

**Step 4: 指定スレッドを展開**

指定された各スレッドの URL を slack-fetch で取得し、本文・スレッド返信を提示する。

```bash
python3 ~/.claude/skills/slack-fetch/slack_fetch.py "{url}"
```

**Step 5: 会話の中で検討する**

展開した内容をもとに、ユーザーの意図に応じて要約・論点抽出・比較・アイデア出しなどを行う。
**`raw/inbox/items/` には書き込まない。** ファイルも作らない（一時的な検討用）。

検討の結果「この内容は記録として残したい」となった場合は、`/slack-messages-save` を同じ引数で実行すれば正規化済みアイテムとして保存できることを案内する。

## エラー対処

| エラー | 原因 | 対処 |
|---|---|---|
| `failed to get token from rbw` | rbw がロック | ユーザーに `rbw unlock` を依頼 |
| `Slack API error [search.messages]: not_allowed_token_type` / `missing_scope` | トークンに `search:read` がない | Slack App の OAuth スコープを確認するようユーザーに通知 |
| 件数 0 | 該当発言なし or 日付・対象指定ミス | 日付・`--from`・`--in` を確認してユーザーに通知 |
