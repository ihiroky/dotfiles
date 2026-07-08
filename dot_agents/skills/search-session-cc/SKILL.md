---
name: search-session-cc
description: "Claude Code (claude / claude agents CLI) の過去セッション記録 (~/.claude/projects/**/*.jsonl) を全文検索するスキル。キーワード・正規表現・プロジェクト・発言者ロールで絞り込み、ヒットしたセッションと該当発言を整形表示する。過去に Claude Code で何を相談・実装したか思い出したいときに使う"
metadata:
  requires:
    bins:
      - python3
---

# search-session-cc

Claude Code のセッションは JSONL 形式で `~/.claude/projects/<エンコード済みパス>/*.jsonl` に平文保存される。
このスキルはその本文を抽出して全文検索し、どのセッションで何を話したかを素早く見つける。

`claude --resume` はタイトル・日時で選ぶだけで本文検索はできないため、
「あの相談どのセッションだっけ」を本文から辿るときに使う。

## 使い方

```
/search-session-cc <キーワード> [オプション]
```

## ワークフロー

### Step 1: スクリプトを実行する

```bash
python3 /home/hiroki/.claude/skills/search-session-cc/search_sessions.py "<キーワード>" [オプション]
```

主なオプション:

| オプション | 説明 |
|---|---|
| `--project <部分文字列>` | プロジェクトディレクトリ名で絞り込む（例: `--project memo`） |
| `--role user\|assistant\|all` | 発言者ロールで絞り込む（既定: `all`） |
| `--regex` | キーワードを正規表現として扱う |
| `--case-sensitive` | 大文字小文字を区別する（既定: 区別しない） |
| `--full` | 発言全文を表示（既定は200字で省略） |
| `--context N` | 1セッションあたり表示する発言数（既定: 4） |
| `--limit N` | 表示するセッション数の上限（既定: 無制限） |

セッションは更新日時の新しい順に走査する。

### Step 2: 出力を読む

出力例:

```
=== 3c256f75-8cf6-4878-9a1c-9df5150d92ad.jsonl  (3 件) ===
    project: /home/hiroki/.config/memo
    updated: 2026-07-05 14:22
    resume : claude --resume 3c256f75-8cf6-4878-9a1c-9df5150d92ad
  [user] https://linear.app/techtouch/issue/DE-3982/ において timezone で…
  [assistant] ## DE-3982の経緯整理 …
  … 他 1 件

合計: 1 セッション / 3 発言
```

各セッションブロックには以下が含まれる:

- **ファイル名（セッションID）** とヒット件数
- **project**: 元の作業ディレクトリ（近似復元。パスに `-` を含む場合はずれる可能性あり）
- **updated**: 最終更新日時
- **resume**: そのまま実行すればセッションを再開できるコマンド
- ヒットした発言（ロール付き・冒頭200字）

### Step 3: 結果をユーザーに提示する

ヒットしたセッションを要約して伝える。ユーザーが特定のセッションを深掘りしたい場合は:

- 該当 `.jsonl` を直接読む、または
- `resume` 行のコマンドで再開する

ことを案内する。

## 使用例

```bash
# memo プロジェクトでの timezone に関する相談を探す
python3 .../search_sessions.py "timezone" --project memo

# 自分の発言だけを正規表現で検索し、全文表示
python3 .../search_sessions.py "DE-\d+" --regex --role user --full

# 直近のヒット3セッションだけ確認
python3 .../search_sessions.py "保守工数" --limit 3
```

## エラー対処

| 状況 | 対処 |
|---|---|
| `セッションディレクトリが見つかりません` | `~/.claude/projects` が存在するか確認 |
| ヒット0件 | キーワードを短く / `--project` を外す / `--regex` を試す |
| 出力が多すぎる | `--limit` `--context` で絞る、`--project` で対象を限定 |
