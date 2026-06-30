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

## ファイルダウンロード

### 前提条件

トークンに `files:read` スコープが必要。スコープがない場合は `missing_scope` エラーが返る。

### ファイルIDの取得

Slack のファイル URL は以下の形式：

```
https://tech-touch.slack.com/files/<user_id>/<file_id>/<filename>
```

例: `https://tech-touch.slack.com/files/UP3K00Q4W/F0B9J2046BY/scribe_research_deck_ja.pptx`
→ ファイルID は `F0B9J2046BY`（URL の3番目のパスセグメント）

### ダウンロード手順（Python スクリプト例）

```python
import json, urllib.request, urllib.parse, subprocess, os

token = subprocess.run(["rbw", "get", "tt-slack-token"], capture_output=True, text=True).stdout.strip()

for file_id, fname in [("F0B9J2046BY", "output.pptx")]:
    # 1. files.info でダウンロードURLを取得
    url = "https://slack.com/api/files.info"
    data = urllib.parse.urlencode({"file": file_id}).encode()
    req = urllib.request.Request(url, data=data, headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/x-www-form-urlencoded",
    })
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read())

    f = result["file"]
    dl_url = f.get("url_private_download") or f.get("url_private")

    # 2. ダウンロード
    req2 = urllib.request.Request(dl_url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req2) as resp2:
        with open(fname, "wb") as fp:
            fp.write(resp2.read())
```

### PPTX テキスト抽出（python-pptx がない場合）

`python-pptx` モジュールが使えない環境では、`unzip` で XML から直接テキストを抽出できる：

```bash
unzip -p file.pptx "ppt/slides/slide*.xml" | python3 -c "
import sys, re
content = sys.stdin.read()
texts = re.findall(r'<a:t[^>]*>([^<]+)</a:t>', content)
for t in texts:
    t = t.strip()
    if t:
        print(t)
"
```

### トークンスコープ確認

```bash
python3 -c "
import json, urllib.request, urllib.parse, subprocess
token = subprocess.run(['rbw', 'get', 'tt-slack-token'], capture_output=True, text=True).stdout.strip()
url = 'https://slack.com/api/auth.test'
req = urllib.request.Request(url, data=b'', headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/x-www-form-urlencoded'})
with urllib.request.urlopen(req) as resp:
    print(json.dumps(json.loads(resp.read()), indent=2))
"
```

### rbw キャッシュの更新

権限変更後にトークンが古いままの場合は同期する：

```bash
rbw sync
```
