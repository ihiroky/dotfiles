---
name: google-slides-deck
description: deck JSON からデザインガイドライン準拠の Google スライドを生成・更新する。「Google スライドを作って」「スライドにして」「プレゼン資料を作成」「この内容を資料化」「スライドを更新して」と依頼されたときに使う。表・矢羽・タイムライン・タイトル付きボックス・概念図・箇条書き・目次・中表紙を含む 12 レイアウトを持ち、密度検査 → PPTX 描画 → Drive で Google スライドへ変換 → PDF で目視検査 の順で仕上げる。HTML のスライドが欲しい場合は使わない。
---

# google-slides-deck

内容を deck JSON として記述し、Techtouch のスライドデザインガイドラインに準拠した
**ネイティブの Google スライド**を生成する。

**このスキルを使う条件:** 成果物が Google スライド（`docs.google.com/presentation/...`）であること。
HTML のスライドが目的なら `slide-design` を使う。図解 HTML なら `ttnize-html` を使う。

## 仕組み — なぜ PPTX を経由するか

```
deck JSON → 検査 → PPTX（pptxgenjs） → Drive が変換 → ネイティブ Google スライド → PDF で目視検査
```

Slides API の `batchUpdate` を直接叩くと 1 ページあたり数十リクエストになり、
ローカルで中身を確認できない。PPTX を作って Drive にアップロードすると、Drive が
**編集可能なネイティブ Google スライドへ変換する**。図形もテキストも選択・編集できる。

検証済みの事実（2026-08-21 時点、この環境で実測）:

| 確認したこと | 結果 |
|---|---|
| PPTX → Google スライド変換 | `mimeType: application/vnd.google-apps.presentation` を付けたアップロードで成功 |
| フォント指定の保持 | `weightedFontFamily: {BIZ UDPGothic, 700}` として API 応答に残る |
| 色の保持 | `#0974e8` が誤差なく往復する |
| キャンバス | 10in × 5.625in = 16:9。**960px = 10in なので 96 DPI で 1:1** |
| 既存ファイルの上書き | `files.update --upload` で **同一 fileId・同一 URL のまま**更新できる |
| PDF エクスポート | `files.export` で取得でき、`Read` で目視検査できる |

## 前提

```bash
gws auth login          # Drive の書き込み権限が必要
cd ~/.claude/skills/google-slides-deck && npm install
```

`gws` が認証エラーを返す場合、ユーザーに `! gws auth login` の実行を依頼する。

## 使い方

```bash
node ~/.claude/skills/google-slides-deck/bin/generate.js <deck.json> [options]
```

| オプション | 意味 |
|---|---|
| `--no-upload` | ローカル PPTX の生成まで。認証なしで確認できる |
| `--out <path>` | PPTX の出力先（既定: deck.json と同じ場所・同じ名前） |
| `--file-id <id>` | **既存の Google スライドを in-place 更新する。URL が変わらない** |
| `--folder-id <id>` | 新規作成先の Drive フォルダ |
| `--name <title>` | Drive 上のファイル名（既定: `deck.title`） |
| `--pdf <path>` | 発行後に PDF をエクスポートする（目視検査用） |
| `--force` | warning があっても続行する |
| `--json` | 結果（fileId・URL・PDF パス）を JSON で標準出力に出す |

終了コード: `2` = 検査 error、`3` = 検査 warning（`--force` 未指定）、`1` = その他の失敗。

## ワークフロー

### 1. 内容を視覚関係へ分類する

ページごとに主関係を **一つ** 決める。`references/layout-catalog.md` の Decision table を使う。

| 関係 | レイアウト |
|---|---|
| 単一の主張・結論 | `statement` |
| 同列項目 | `bullets` |
| 行列で比較 | `table` |
| 左から右への短い手順（3〜5） | `chevrons-h` |
| 段階と各段の説明（3〜7） | `chevrons-v` |
| 確定した時系列 | `timeline` |
| 見出し付き並列情報（2〜4） | `titled-boxes` |
| 土台と構成要素 | `concept-base` |

deck 上の役割からフレームを選ぶ: `cover` / `toc-1col` / `section` / `closing`。

### 2. deck JSON を書く

内容は**渡されたものを変えない**。メッセージ、数値、固有名詞、出典、ページ順を勝手に
変更しない。要約・分割・統合が必要なら、まずデザイン上の不足として報告し、許可を得る。
不足値は文脈から安全に補い、何を仮定したかを報告に残す。

本文ページには原則 `lead`（タイトル直下の 1 行）を置く。正本の 1〜64 ページのうち
42 ページがこの構成で、**タイトル＋リード文＋本文が標準のページ構成**である。
渡された内容に要旨が無いなら、無理に作らず `lead` を省く。

### 3. 検査を通す

```bash
node bin/generate.js deck.json --no-upload
```

`error` はレイアウトの不整合・必須項目の欠落。deck JSON を直す。
`warning` は内容過多。**文字を縮めて詰め込まない。** 次の順で対処する:

1. レイアウトのバリアントを変える（横型 → 縦型、`cols-3` → `rows-3` など）
2. 内容過多として依頼者へ報告する
3. ページ分割を提案する

その密度で意図どおりなら `--force` を付ける。

### 4. 発行する

新規作成は URL が変わるので、**2 回目以降は必ず `--file-id` か `deck.drive.fileId` を使う**。
誰かに共有済みの URL を、再生成のたびに変えてはいけない。

```bash
# 初回
node bin/generate.js deck.json --folder-id <folder> --pdf /tmp/deck.pdf --json
# → 出力された fileId を deck.json の "drive": {"fileId": "..."} に書き戻す

# 2 回目以降（同じ URL のまま更新される）
node bin/generate.js deck.json --pdf /tmp/deck.pdf
```

### 5. PDF で目視検査する

`--pdf` で出した PDF を `Read` ツールで開き、少なくとも次を確認する。
PPTX → Slides の変換で折り返し位置は完全に一致しないため、**この工程は省略しない**。

- 一瞥でページの結論が分かる
- 文字切れ、意図しない折返し、要素の衝突がない
- 揃えるべき辺・ベースラインが揃っている
- 強調色が競合していない
- 写真・ロゴ・アイコンの代用物が紛れ込んでいない

### 6. 完了報告

出力 URL、ページ数、使った主要レイアウト、検査結果、残課題（未提供アセット・内容過多）
だけを報告する。

## deck JSON の契約

```jsonc
{
  "title": "資料タイトル",
  "subtitle": "副題",
  "author": "",
  "footer": { "left": "© Techtouch, Inc.", "confidential": true },
  "drive": {
    "fileId": null,      // 2 回目以降はここに fileId を入れる（URL が保たれる）
    "folderId": null,
    "name": "Drive 上のファイル名"
  },
  "slides": [ /* 下記のいずれか */ ]
}
```

`confidential` は既定で `true`（フッター右に `confidential` を出す）。社外配布時のみ `false`。

本文レイアウト共通の任意項目:

| 項目 | 表示 |
|---|---|
| `lead` | タイトル直下の 1 行のリード文（12pt）。**正本の標準ページ構成**なので、原則すべての本文ページに置く。55 字まで。指定すると本文の開始位置が 78.2px へ下がる |
| `note` | 本文帯の下端に、幅いっぱいの薄青（`#f1f8fe`）の帯として 10pt 中央揃えで置く |
| `source` | 本文の外・フッターの上に 6pt で右寄せ。頭に「出典: 」が付く |

`lead` は表紙・目次・中表紙・最終ページには置けない（error になる）。

```jsonc
// 表紙。全面ブランドグラデーション背景。タイトルは中央、subtitle は左下、
// meta は上部の小ラベル（日付・部署名など）
{ "layout": "cover", "title": "...", "subtitle": "...", "meta": ["2026-08-21", "部署名"] }

// 目次（1〜7 項目）。アクセントバーなし・青太字タイトル・● の箇条書き 14pt・
// 下端にグラデーションバンド。自動採番と罫線は付かない（番号を出すなら項目文字列に含める）。
// lead / note / source / フッターは持たない
{ "layout": "toc-1col", "title": "目次", "items": ["01　章名", "..."] }

// 中表紙（章タイトルページ）。全面ブランドブルー背景 + 中央揃え白太字 28pt + 下端の白バンド
// （「04B_セクションタイトル（番号なし）反転」実測）。番号なしレイアウトのため
// number は受け取っても描画しない。フッターは持たない
{ "layout": "section", "title": "章名" }

// 単一の主張。supports は 0〜2 件
{ "layout": "statement", "title": "...", "claim": "60 字までの主張",
  "supports": ["根拠 1", "根拠 2"] }

// 箇条書き。level は 1〜3。role で色ロールを指定できる
{ "layout": "bullets", "title": "...",
  "items": [{ "text": "...", "level": 1, "role": "strong" }, "文字列だけでも可"] }

// 表。rowHeader: true で 1 列目を行見出しにする（塗りなし・青の太字になる）
// 列見出しは薄いグレー、罫線は #D9D9D9。6 列以上は自動で文字を一段落とす（11 列まで）
// columnWidths は px 指定（省略時は均等）。cell に {text, role, align, fill} も渡せる
{ "layout": "table", "title": "...", "rowHeader": true,
  "columns": ["列 A", "列 B"], "rows": [["値", "値"]], "columnWidths": [300, 630] }

// 横型矢羽（3〜5 段）。矢羽は独立して並ぶ。lead は矢羽の下の太字のリード（任意）、
// detail はその下のグレー枠の箱。段数が増えると文字サイズが一段落ちる
{ "layout": "chevrons-h", "title": "...",
  "steps": [{ "label": "段階", "lead": "要約", "detail": "説明" }] }

// 縦型矢羽（3〜7 段）。details を 2 列にすると比較になる（全段で列数を揃える）。
// 説明は 1 列 60 字まで。段数が増えると文字サイズが一段落ちる（7 段で 8pt）
{ "layout": "chevrons-v", "title": "...", "detailHeadings": ["観点 A", "観点 B"],
  "steps": [{ "label": "段階", "details": ["A の説明", "B の説明"] }] }

// タイムライン（3〜14 点、説明付きは 6 点まで）。日付は軸の上に一列、
// 説明は軸の下に引き出し線つきで交互に配置される
{ "layout": "timeline", "title": "...",
  "points": [{ "date": "4 月", "detail": "出来事" }] }

// タイトル付きボックス（2〜4 個）
// variant: cols-2 | cols-3 | cols-4 | rows-2 | rows-3 | grid-4
// cols-* と grid-4 は帯が上、rows-* は帯が左のラベル列になる（縦型の見出しは 14 字まで）
{ "layout": "titled-boxes", "title": "...", "variant": "cols-3",
  "boxes": [{ "heading": "見出し", "body": "100 字までの本文" }] }

// 概念図（土台 + 3〜5 要素）
{ "layout": "concept-base", "title": "...",
  "elements": ["要素 A", "要素 B"], "foundation": "土台となる概念" }

// 最終ページ。全面ブランドグラデーション背景 + 中央の縦積みロゴのみ
// （「99_最終ページ_ロゴのみ」実測: x=387.9 y=184.7 184.3×170.5）。
// message は任意。指定するとロゴを上げて下に添える
{ "layout": "closing", "message": "以上" }
```

`role` に使える色ロール: `normal` / `emphasis` / `strong` / `alert` / `muted`。
色を先に選ばず、**何を強調するかを決めてから**割り当てる。

黄色（`#ffca3a`）は文字色でも背景塗りでもなく、ハイライトツールチップの説明を囲む
**枠線**として使う色である。この用途の枠線と、UI を指す青枠・警告の赤枠は
`theme.component.annotation` にトークンとして定義してあるが、deck JSON からは
まだ指定できない（必要になったら `lib/layouts.js` に描画を足す）。

## デザインの正本

**`lib/theme.js` がデザイントークンの単一の正である。** 色・フォント・寸法の変更は
原則このファイルだけを直せばよい。`lib/layouts.js` に値を直書きしないこと。

正本は次の 2 ファイルで、2026-08-21 に Slides API で全ページ・全レイアウトを実測して
突き合わせた結果、**マスターとレイアウトは同一**であることを確認した。したがって
`theme.js` の値はどちらからも同じ値が得られる実測値である（暫定値ではない）。

- https://docs.google.com/presentation/d/1Zl3JeTevIMaI1VQjNjvYrky_oJ5Eo4zh8CUJI0Bsizc/edit
  「テンプレートガイドライン」2025.05.22 更新。**デザインの内容は 5〜64 ページ**
  （3〜4 は目次、65 以降はロゴとイラストレーションの一覧）。
  ローカルの写し: `~/.config/memo/skills/slide-design/guideline.pdf`
- https://docs.google.com/presentation/d/1unclsUhqrGK3gPmlvFP_AEFjVkUsd4z3Wozb5R4ccb4/edit
  （`tt-template-202608`）。空のプレースホルダを持つ 5 枚のサンプルだけを含む実物テンプレート

唯一の差異は「02_目次」BODY の行送り（ガイドライン 1.5 / テンプレート 2.0）で、
目次はテンプレート側を正として 2.0 を採っている。
中表紙はマスターに番号あり（`04`）と番号なし反転（`04B 反転`）の両方があり、
本スキルは **`04B 反転` を採る**方針で確定している。

抽出した背景画像・ロゴは `assets/` に置いてある（下記ファイル構成を参照）。
デザイン方針が指示されたら、`lib/theme.js` を書き換え、`references/` の 2 ファイルを
正本に合わせて更新する。

## 既知の制約

| 制約 | 内容 |
|---|---|
| フォントの実描画 | API 応答には `BIZ UDPGothic` が残る。ただし **PDF エクスポートでは代替フォント（Noto Sans JP 系）で描画されることを実測で確認した**。フォント指定は失われていないので、Slides の編集画面で「フォントを追加」から BIZ UDPGothic を有効にすれば正しく表示される。配布前にこの一手間を案内すること |
| 折り返しの差異 | PPTX → Slides で折り返し位置が完全一致しない。テキスト枠は縦に余裕を持たせてある。最終確認は PDF 目視で行う |
| `gws` のパス制約 | `--upload` と `-o` はカレントディレクトリ配下しか受け付けない。`bin/generate.js` は対象ファイルのディレクトリを cwd にして basename を渡すことで回避している |
| 画像・ロゴ・アイコン | `cover` / `toc-1col` / `closing` は `assets/` の提供アセット（グラデーション背景・ロゴ）を使う。それ以外のレイアウトで写真やアイコンが必要な場合、提供アセットがなければ**代用も生成もしない** |
| autofit を使わない | テキストボックス単位の自動縮小は使わない。8px（6pt）未満のサイズ指定は例外を投げる。ただし矢羽と密な表は、**正本が定めている段数・列数に連動した段階的なサイズ**を適用する（例: 縦型矢羽は 3 段 12pt 〜 7 段 8pt）。これは autofit ではなく実測どおりの規定である |

## 未実装のレイアウト

`references/layout-catalog.md` には載っているが、まだ実装していない:
`org-chart` / `member-grid` / `member-rows` / `concept-2` / `concept-3` / `roadmap` /
`toc-2col` / `07_メリハリスライド`（全面青・全面黄の強調ページ）/
`99_最終ページ`（ミッション文つきの版）。

`content-heading` は専用レイアウトではなく、本文レイアウト共通の任意項目 `lead` として
実装済みである。

必要になったら `lib/layouts.js` に追加し、`lib/validate.js` の `BUDGET` に許容量を、
本ファイルの契約表に記法を足す。3 箇所すべてを更新すること。

## ファイル構成

```
lib/theme.js       色・フォント・寸法の単一の正（★ デザイン変更はここ）
lib/layouts.js     1 スライドを図形へ落とす。座標は px で書き inch へ変換する
lib/validate.js    描画前の密度・構造検査。内容は削らない
lib/render.js      deck JSON → PPTX
bin/generate.js    CLI。検査 → 描画 → 発行 → PDF
references/        デザインガイドラインとレイアウトカタログ（正本の写し）
assets/            cover / toc-1col / closing 用のブランド画像（tt-template-202608 から抽出）
examples/          全 12 レイアウトを 1 回ずつ使う見本
```
