---
name: commit
description: Stage changes and commit with an auto-generated Conventional Commits title. Proposes 1-3 title candidates, asks the user to confirm, then runs git commit.
user-invocable: true
---

# commit

staging されている変更（または指定ファイル）を分析し、Conventional Commits 形式のコミットタイトルを提案してユーザーに確認を取った後、`git commit` を実行する。

## 使い方

```
/commit
/commit <追加の指示>
```

`$ARGUMENTS` に補足指示（例: "日本語で"、"スコープを省略して"、"feat にして"）を渡すことができる。

## 実行手順

1. staging 状態を確認する:
   ```bash
   git diff --staged --stat
   ```
   staging が空の場合 → `git status --short` を確認し、未 stage のファイルがあれば
   "staging されている変更がありません。`git add` で変更を追加してください。" と伝えて終了する。

2. 差分の詳細を取得する:
   ```bash
   git diff --staged
   ```

3. diff の内容を分析して以下を判断する:
   - **type**: 変更の種類（下記一覧を参照）
   - **scope**: 変更の影響範囲（ディレクトリ名・モジュール名など。自明でなければ省略可）
   - **subject**: 変更内容の簡潔な説明（命令形、現在形、50文字以内）

4. Conventional Commits 形式でタイトルを **1〜3 案** 組み立てる。推奨案を先頭に置く。
   ```
   <type>(<scope>): <subject>
   ```
   scope が不明確または不要な場合は括弧ごと省略:
   ```
   <type>: <subject>
   ```

5. `$ARGUMENTS` に指示がある場合はその指示に従って調整する。

6. 以下の形式でユーザーに提示し、番号選択または自由入力を促す:

   ```
   ## コミットタイトル案

   1. `<推奨タイトル>` ← おすすめ
   2. `<代替タイトル>`
   3. `<代替タイトル>`（任意）

   ## 判断の根拠
   - type を <type> にした理由: <理由>
   - subject の要点: <変更の要点>

   番号を選ぶか、タイトルを直接入力してください（Enter でおすすめを採用 / q でキャンセル）:
   ```

7. ユーザーの入力を受け取る:
   - **数字（1/2/3）**: 対応するタイトルを採用
   - **空 Enter**: 推奨案（1番）を採用
   - **自由テキスト**: そのテキストをタイトルとして採用
   - **`q` または `n`**: コミットをキャンセルして終了

8. 採用タイトルが確定したら、以下のコマンドでコミットを実行する:
   ```bash
   git commit -m "<採用タイトル>"
   ```

9. コミット結果を確認し、成功したら以下を表示して完了:
   ```
   ✔ コミット完了: <採用タイトル>
   (<short-hash> <branch> <stat summary>)
   ```

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

## 注意事項

- `--no-verify` は使用しない。pre-commit hook が失敗した場合は原因を調査して修正する。
- force push や `--amend` はこのスキルのスコープ外。
- セキュリティ上の理由から `.env` や認証情報を含むファイルが staging に含まれている場合は警告を出して中断する。
