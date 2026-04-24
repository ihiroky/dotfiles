---
name: commit-title
description: Generate a commit title from staged git changes. Runs git diff --staged and proposes a Conventional Commits-style title.
user-invocable: true
---

# commit-title

staging されている変更を `git diff --staged` で取得し、Conventional Commits 形式のコミットタイトルを提案する。

## 使い方

```
/commit-title
/commit-title <追加の指示>
```

`$ARGUMENTS` に補足指示（例: "日本語で"、"スコープを省略して"）を渡すことができる。

## 実行手順

1. 次のコマンドを実行して staging された変更を取得する:
   ```bash
   git diff --staged
   ```
2. diff が空の場合 → "staging されている変更がありません。`git add` で変更を追加してください。" と伝えて終了する。
3. diff の内容を分析して以下を判断する:
   - **type**: 変更の種類（下記一覧を参照）
   - **scope**: 変更の影響範囲（ディレクトリ名・モジュール名など。自明でなければ省略可）
   - **subject**: 変更内容の簡潔な説明（命令形、現在形、50文字以内）
4. Conventional Commits 形式でタイトルを組み立てる:
   ```
   <type>(<scope>): <subject>
   ```
   scope が不明確または不要な場合は括弧ごと省略:
   ```
   <type>: <subject>
   ```
5. タイトル候補を **1〜3 案** 提示する。最も推奨する案を先頭に置く。
6. `$ARGUMENTS` に指示がある場合はその指示に従って調整する（例: 日本語にする、スコープを省略するなど）。

## type 一覧

| type | 使いどころ |
|---|---|
| `feat` | 新機能の追加 |
| `fix` | バグ修正 |
| `docs` | ドキュメントのみの変更 |
| `style` | コードの動作に影響しないフォーマット変更 |
| `refactor` | バグ修正でも機能追加でもないコード変更 |
| `test` | テストの追加・修正 |
| `chore` | ビルドプロセス・補助ツール・依存関係の変更 |
| `perf` | パフォーマンス改善 |
| `ci` | CI 設定の変更 |
| `revert` | 以前のコミットの取り消し |

## 出力形式

```
## コミットタイトル案

1. `<推奨タイトル>` ← おすすめ
2. `<代替タイトル>`
3. `<代替タイトル>`（任意）

## 判断の根拠
- type を <type> にした理由: <理由>
- subject の要点: <変更の要点>
```
