---
name: slack-fetch
description: "Slack から読む。(1) URL でメッセージとスレッドを取得 (2) 参加中の全チャネル・MPDM を横断検索して背景・経緯を調べる (3) チャネル履歴を取得。ある決定の経緯を追う、誰がいつ何を言ったか探す、社内の議論を裏取りする、Slack を調査するときに使う。Requires rbw (Bitwarden) to be pre-unlocked."
metadata:
  requires:
    bins:
      - python3
      - rbw
---

# slack-fetch

Slack を読むための単一の入口。3 モードある。

```bash
S=~/.claude/skills/slack-fetch/slack_fetch.py

python3 $S "<slack-url>"                    # メッセージ + スレッド
python3 $S search "<query>" [options]       # 横断検索
python3 $S history <channel|url> [options]  # チャネル履歴
```

## 前提条件

- `rbw` が認証済み（unlocked）であること
- Bitwarden に `tt-slack-token` というアイテムがあり、パスワードに Slack API Token が入っていること

rbw が locked の場合はスクリプトがエラー終了する（unlock の試みはしない）。

## トークンのスコープ（実測値）

| 状態 | スコープ |
|---|---|
| **あり** | `identify` `channels:history` `groups:history` `im:history` `mpim:history` `files:read` `search:read` `users:read` |
| **なし** | `channels:read` `groups:read` `mpim:read` `im:read` |

実務上の含意:

- `conversations.info` は **必ず `missing_scope` で失敗する**。チャネル ID → 名前の解決に使えない
- 一方 `search.messages` は結果に `channel.name` を含めて返す。**チャネルを特定したいときは search のほうが安い**
- `conversations.history` / `conversations.replies` / `search.messages` / `users.info` / `files.info` は通る

## ⚠ 検索の到達範囲と取り扱い

`search:read` はユーザートークンなので、**検索は自分が参加しているすべての場所に届く**。パブリックチャネルだけでなく:

- プライベートチャネル
- MPDM（複数人 DM。チャネル名が `mpdm-alice--bob--carol-1` の形で出てくる）
- DM

つまり「このチャネルを見て」と言われて検索したら、人事・採用・報酬などの機微な内容が同じ結果に混ざって出てくることがある。

- 出力は**起点のチャネルより機微度が高いもの**として扱う
- **自動で永続化しない**。ファイルに書く前に、何を残すかを人間の指示で確定させる
- リポジトリ固有の選別規則があるなら、そのリポジトリの規約に従う（このスキル自体は規約を持たない）

## モード 1: URL

```bash
python3 $S "https://tech-touch.slack.com/archives/C075GMQAVRV/p1784102059066809"
```

出力: `channel:` / `url:` / `ts:` / `## Root message` / `## Thread (N other messages)`

- **URL が返信を指していても動く**。`?thread_ts=` が付いていれば親を辿ってスレッド全体を出し、`thread_ts: ... (this message is a reply)` と表示する
  - query string を落とした素の返信 URL でも、その発言自体は正しく出る（ただしスレッド文脈は付かない）。経緯を追うなら `?thread_ts=` 付きの permalink を使うこと
- **ts のないチャネル URL**（`/archives/C0123456` で終わる）を渡すと、警告を出して `history` にフォールバックする（30 件、1 メッセージ 600 字上限）
- 単発メッセージとスレッドの `--truncate` 既定は 0（全文）。既存の呼び出し元との互換のため。チャネル URL のフォールバックだけは 600 字で抑える（30 件を全文で出すとコンテキストが溢れるため）

## モード 2: search

```bash
python3 $S search "承認エージェント" --count 20
python3 $S search "岩上" --in hiring_forstartups --sort timestamp
python3 $S search "CSE" --from tatsuya.yano --after 2026-04-01
python3 $S search "AIコスト" --expand --expand-limit 3
```

| オプション | 既定 | 意味 |
|---|---|---|
| `--count N` | 20 | 取得件数 |
| `--sort score\|timestamp` | `score` | `score` = 関連度。`timestamp` = 新しい順 |
| `--expand` | off | ヒットのスレッドを展開する |
| `--expand-limit N` | 5 | 展開するスレッド数の上限 |
| `--in <channel>` | — | `in:#channel` を付与 |
| `--from <user>` | — | `from:@user` を付与 |
| `--after` / `--before` | — | `YYYY-MM-DD` |
| `--truncate N` | 600 | 1 メッセージあたりの文字数上限（0 = 無制限） |
| `--json` | off | 生の match 配列を出す |

### 検索は2段構えで使う

**`search.messages` はスレッドの文脈を返さない。ヒットの断片だけで結論を出さないこと。**

決定や合意はたいていスレッドの中で覆される。検索で当たった 1 発言が結論だと思って読むと逆の意味に取ることがある。だから `--expand` でスレッドまで見る。

`--expand` を付けない場合も、重要なヒットは URL モードで開き直す。

### `--sort` の使い分け

- **経緯を追う**（いつ何が決まったか）→ `--sort timestamp`。時系列に並ぶので流れが読める
- **論点を探す**（そもそも何が議論されているか）→ `--sort score`（既定）

## モード 3: history

```bash
python3 $S history C075GMQAVRV --limit 100
python3 $S history C075GMQAVRV --oldest 1784116775 --grep "CSE|AIC"
python3 $S history <url> --grep "障害" --expand
```

| オプション | 既定 | 意味 |
|---|---|---|
| `--limit N` | 50 | 取得件数 |
| `--oldest` / `--latest` | — | ts で範囲指定 |
| `--grep REGEX` | — | 本文が正規表現に一致するものだけ残す |
| `--expand` | off | `reply_count > 0` のスレッドを展開 |
| `--expand-limit N` | 5 | 展開上限 |
| `--truncate N` | 600 | 文字数上限（0 = 無制限） |
| `--json` | off | 生メッセージを出す |

出力は**古い順**（時系列に読めるようにするため）。`--grep` は取得後にローカルで絞る。広い `--limit` と併用するのが実用的。

## スレッド解決の落とし穴（重要）

`conversations.replies` に**返信の ts を渡すと、`ok=true` のままその 1 件だけが返る**。エラーにならない。無言で文脈が落ちる。

```
親の ts (1784102059.066809) → 4 messages  ✅
返信の ts (1784111396.733939) → 1 message  ❌ ok=true のまま
```

さらに `conversations.history` で親を引くこともできない。**スレッドの返信は history ストリームに含まれない**ため、`latest=oldest=<返信の ts>` で引いても `thread_ts` は取れない。

正しい解決方法は **permalink から親を取る**こと。`search.messages` の各 match は

```
https://tech-touch.slack.com/archives/C.../p<ts>?thread_ts=<親のts>
```

の形の `permalink` を返すので、追加の API 呼び出しなしで親が判る。スクリプトの `thread_ts_from_permalink()` がこれをやっている。

`history` 経由の場合はトップレベルのメッセージしか返らないので、`msg["thread_ts"] or msg["ts"]` で足りる。

## コンテキスト消費に注意

`--expand` の実質的な制約はレート制限ではなく**出力量**。`--count 20 --expand` は膨大なテキストになる。

- まず `--expand` なしで一覧を見て、当たりを付ける
- そのうえで `--expand-limit` を小さく保つ、または `--truncate` で削る
- 展開したスレッドが上限に達すると `# note: expanded N of M hits` が出る。**黙って打ち切らない**

同じスレッドに複数ヒットした場合、スレッド本体は 1 回だけ出力し、2 回目以降は `### thread: already shown at [n]` と表示する。

## エラー対処

| エラーメッセージ | 原因 | 対処 |
|---|---|---|
| `failed to get token from rbw` | rbw がロックされている | ユーザーに `rbw unlock` を依頼 |
| `rbw returned an empty value` | アイテムにパスワードが未設定 | Bitwarden で `tt-slack-token` を確認 |
| `missing_scope` on `conversations.info` | 仕様（上のスコープ表を参照） | `search.messages` の `channel.name` を使う |
| `channel_not_found` | トークンがチャンネルにアクセス不可 | チャンネルにアプリを招待 or User Token を使用 |
| `not_in_channel` | Bot が未招待 | Slack で `/invite @app-name` を実行 |
| `Invalid Slack URL` | URL 形式が違う | `/archives/<CID>` か `/archives/<CID>/p<ts>` の形にする |
| スレッドが 1 件しか返らない | 返信の ts を渡している | 上の「スレッド解決の落とし穴」を参照 |

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
