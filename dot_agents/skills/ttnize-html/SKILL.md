---
name: ttnize-html
description: "説明用の HTML アーティファクト・図解・ダイアグラムを作成または調整するときに適用する Techtouch 社内デザインスタイル（ttnize）。MANDATORY: 説明資料・図解・フロー図・概念図・ダッシュボードなどの HTML を Artifact ツールで作成する前後に必ず起動し、フォント（BIZ UDPGothic）・カラーパレット・テキストロール・コンポーネントスタイル・Artifact レイアウト制約を適用する。既存 HTML のデザイン調整にも使う。スライド固有のテンプレート/スロットは扱わない。"
---

# ttnize-html

説明用に作成する HTML アーティファクトや単体の図解 HTML を読み込み、Techtouch 社内デザインガイドライン
（フォント・色・テキストロール・コンポーネント）に沿ったスタイルへ変換（**ttnize** = techtouch + ize）する。

`slide-design` がスライド（固定キャンバス + テンプレート + スロット）を対象にするのに対し、本スキルは
**レスポンシブ／自己完結な Web ページ（Artifact・図解 HTML）** を対象とする。テンプレート・スロット・
スライドタイプ・はみ出しキャンバスチェックは扱わない。

**自動適用（重要）:**
本スキルは説明用 HTML の**作成・調整時に自動で適用する**。具体的には次の状況で必ず起動する:
- Artifact ツールで説明資料・図解・フロー図・概念図・ダッシュボード等の HTML を作成するとき
- 既存の説明用 HTML / 図解 HTML のデザインを調整・修正するとき

作成時は、ガイドライン（G01–G05）を**最初から満たす形で HTML を書き**、書き終えたら Step 2–6 の
チェックを通して取りこぼしを修正する。既存ファイルを渡された場合は Step 1 から実行する。

**やること:**
- フォント・色・テキストロール・サイズの違反を検出・修正する
- コンテンツをガイドラインのコンポーネントパターン（表・矢羽・タイムライン等）へ変換する
- Artifact 制約（自己完結性・レスポンシブ・横スクロール防止）に照らしたレイアウトチェックを行う

**スコープ外（デザイナー確認が必要なもの）:**
- 画像・写真（`<img>` タグ）
- Techtouch ブランドロゴ・イラスト・SVG アイコン本体
- テキスト内容・コピーライティングの変更
- ページ全体の情報設計・構造の作り替え

## 使い方

説明用 HTML / 図解の作成・調整時に**自動で適用される**。明示的に既存ファイルへ適用したいときは:

```
/ttnize-html <HTMLファイルのパス> [--no-font-import]
```

| サブコマンド / オプション | 動作 |
|---|---|
| `<HTMLファイル>`（省略なし） | 違反修正 → コンポーネント変換 の両方を実施 |
| `--no-font-import` | Google Fonts の `<link>` import を追加しない（`font-family` 指定のみ）。Artifact 公開専用で外部参照を一切持ちたくない場合に使う |

**ガイドラインの正本:** デザインルール（フォント・色・コンポーネント）の出典は、Techtouch 社内
デザインガイドラインのスライドである:

https://docs.google.com/presentation/d/1Zl3JeTevIMaI1VQjNjvYrky_oJ5Eo4zh8CUJI0Bsizc/edit?slide=id.g23a6f50ba2f_0_307#slide=id.g23a6f50ba2f_0_307

本スキルは下記 G01–G05 にこのスライドのルールをテキストで内包する。ガイドラインが改訂されたときは、
**必ず上記スライドを正本として参照し**、その内容に基づいて G01–G05 を更新する。

---

## デザインガイドライン参照

### G01. フォント

| 項目 | 値 |
|---|---|
| フォントファミリー | `BIZ UDPGothic` |
| 使用可能ウェイト | `400`（Regular）, `700`（Bold）のみ |
| 禁止 | italic、他ウェイト（100/300/500/600/800/900）|
| 見出しサイズ | `20px`（≈ 15pt）以上 |
| 本文サイズ | `16px`（≈ 12pt） |
| 注釈・キャプション最小サイズ | `8px`（≈ 6pt） |

**フォント指定の方針（Artifact 対応）:**

`font-family` には**必ず `sans-serif` フォールバックを付ける**:
```css
font-family: 'BIZ UDPGothic', sans-serif;
```

`<head>` への Google Fonts import を追加する（`--no-font-import` 指定時は省略）:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=BIZ+UDPGothic:wght@400;700&display=swap" rel="stylesheet">
```

**重要 — Artifact 公開時の挙動:**
- 単体の図解 HTML をブラウザで直接開く場合、この import が効いて BIZ UDPGothic が適用される。
- claude.ai の **Artifact として公開すると CSP が外部フォント取得をブロックする**。その場合 import は
  黙って無視され、`font-family` の `sans-serif` フォールバックが効く（壊れずに劣化する）。
- したがって import を入れても害はない。両環境で破綻しないよう **import あり + sans-serif フォールバック必須** を既定とする。
- 外部参照を一切残したくない（厳密な CSP 自己完結を求める）場合のみ `--no-font-import` を使う。

CSS チェックパターン:
```css
/* 正 */
font-family: 'BIZ UDPGothic', sans-serif;
font-weight: 400; /* または 700 */

/* 違反 → 修正 */
font-family: Arial;          /* → 'BIZ UDPGothic', sans-serif */
font-family: 'BIZ UDPGothic';/* フォールバック欠落 → 'BIZ UDPGothic', sans-serif */
font-weight: 600;            /* → 700 */
font-style: italic;          /* → 削除 */
font-size: 10px;             /* 本文として小さすぎ → 16px */
```

---

### G02. カラーパレット

**主要3色:**

| 色名 | HEX | 用途 |
|---|---|---|
| Blue | `#0974e8` | 強強調テキスト色、アクセント、コンポーネントヘッダー背景 |
| Yellow | `#ffca3a` | ハイライト背景専用（`color:` への使用禁止） |
| Red | `#ff595e` | 警告・アラートテキスト色 |

**ブルーグラデーション（背景・アクセント用）:**
```
#2d8ef7 → #469bf8 → #5ea8f9 → #8fc3fb → #c0ddfd → #d9eafe → #f1f8fe
```

**テキストカラーロール（必須ルール）:**

| ロール | color | font-weight |
|---|---|---|
| 通常テキスト | `#000000` | `400` |
| 強調（エンファシス） | `#000000` | `700` |
| 強強調（ストロングエンファシス） | `#0974e8` | `700` |
| 警告・アラート | `#ff595e` | `700` |
| ハイライト背景 | — | — （`background-color: #ffca3a`） |

**ルール:** 色は最小限にする。何を強調するかを決めてから色を適用する。

---

### G03. レイアウト原則（Artifact 制約）

`slide-design` の固定キャンバス（960×540）はみ出しチェックは行わない。代わりに、Artifact／図解 HTML が
**自己完結・レスポンシブ・横スクロールしない**ことを確認する。

**L-1 自己完結性（Artifact の CSP 制約）:**
- 外部 CDN のスクリプト・スタイルシート・リモート画像・`fetch`/`XHR`/WebSocket は CSP でブロックされる。
- 例外はフォント import のみ（G01 のとおり黙って劣化する）。それ以外の外部参照は違反として記録する。
- 画像は `data:` URI で埋め込む（実画像の差し込みはデザイナー対応・スコープ外）。

**L-2 横スクロール防止:**
- ページ本体（`body`）が横スクロールを起こしてはならない。
- 幅の広い要素（表・図・コードブロック・ダイアグラム）は自身を `overflow-x: auto` のコンテナでラップする。

**L-3 レスポンシブ:**
- 相対単位（`%`, `rem`, `vw`, `fr`）を優先する。
- 固定 `px` 幅がコンテナを超えうる箇所は `max-width: 100%` を付与する。
- 画像・メディアには `max-width: 100%; height: auto;` を付ける。

**L-4 はみ出し（緩いチェック）:**
- `width: X%` で 100% 超、`width: Xpx` が親より明らかに大きい、`white-space: nowrap` の長文など、
  横あふれを起こしうるパターンを記録する。座標の自動修正は行わず「要手動確認」として残す。

**L-5 固定キャンバス図解（任意）:**
- ソースが `width`/`height` を固定した「箱」前提の図解の場合は、その固定枠を壊さずスタイルのみ整える。
- ただし固定枠がページ幅を超える場合は L-2/L-3 に従いラップ／レスポンシブ化を提案する。

L-1（外部参照）と L-2（横スクロール源）は違反として記録する。L-2 のラップ追加・L-3 の `max-width: 100%`
付与は自動修正可能。座標・サイズの意図に関わる L-4 は自動修正せず注記する。

---

### G04. コンポーネント CSS パターン（修正・変換の正解）

すべての `font-family` は `'BIZ UDPGothic', sans-serif` を使う。

#### 表（Table）

```css
table { border-collapse: collapse; width: 100%; font-family: 'BIZ UDPGothic', sans-serif; }
thead th {
  background-color: #f3f3f3;
  color: #000000;
  font-weight: 700;
  padding: 6px 8px;
  text-align: left;
}
tbody th {
  background-color: #469bf8;
  color: #ffffff;
  font-weight: 700;
  padding: 6px 8px;
  text-align: left;
}
td {
  background-color: #ffffff;
  color: #000000;
  font-weight: 400;
  padding: 5px 8px;
  border: 1px solid #c0ddfd;
}
```

幅の広い表は `<div style="overflow-x:auto">` でラップする（L-2）。

#### 箇条書き（Bulleted List）

```css
ul {
  padding-left: 0;
  list-style-position: outside;
  font-family: 'BIZ UDPGothic', sans-serif;
}
ul li {
  margin-left: 0.25cm;
  padding-left: 0.25cm;
  color: #000000;
  font-weight: 400;
  font-size: 16px;
}
```

#### タイトル付きボックス（Titled Box）

```css
.titled-box {
  border-radius: 4px;
  overflow: hidden;
}
.titled-box .box-title {
  background-color: #0974e8;
  color: #ffffff;
  font-family: 'BIZ UDPGothic', sans-serif;
  font-weight: 700;
  font-size: 16px;
  padding: 4px 8px;
}
.titled-box .box-content {
  font-family: 'BIZ UDPGothic', sans-serif;
  font-weight: 400;
  color: #000000;
  font-size: 16px;
  padding: 8px;
}
```

複数カラム配置（横2〜4、縦2〜3）は `display: flex; gap: 8px; flex-wrap: wrap;` でラップする。

#### 矢羽・横（Horizontal Arrow Banner）

3〜5 ステップ向け。

```html
<div class="arrow-banner">
  <div class="arrow-step">ステップ1</div>
  <div class="arrow-step">ステップ2</div>
  <div class="arrow-step">ステップ3</div>
</div>
```

```css
.arrow-banner { display: flex; align-items: stretch; gap: 10px; flex-wrap: wrap; }
.arrow-step {
  background-color: #0974e8;
  color: #ffffff;
  font-family: 'BIZ UDPGothic', sans-serif;
  font-weight: 700;
  font-size: 16px;
  padding: 10px 28px 10px 16px;
  clip-path: polygon(0 0, calc(100% - 16px) 0, 100% 50%, calc(100% - 16px) 100%, 0 100%);
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

#### 矢羽・縦（Vertical Arrow Banner）

3〜7 ステップ向け。

```html
<div class="arrow-banner-v">
  <div class="arrow-step-v">
    <div class="label">項目</div>
    <div class="content">説明テキスト</div>
  </div>
</div>
```

```css
.arrow-banner-v { display: flex; flex-direction: column; gap: 0; }
.arrow-step-v {
  display: flex;
  align-items: center;
  background-color: #0974e8;
  color: #ffffff;
  font-family: 'BIZ UDPGothic', sans-serif;
  margin-bottom: 4px;
  padding: 8px 12px;
  clip-path: polygon(0 0, 100% 0, 100% calc(100% - 12px), 50% 100%, 0 calc(100% - 12px));
}
.arrow-step-v .label { font-weight: 700; font-size: 16px; min-width: 60px; }
.arrow-step-v .content { font-weight: 400; font-size: 14px; }
```

#### タイムライン（Timeline）

```html
<div class="timeline">
  <div class="tl-item">
    <div class="tl-marker"></div>
    <div class="tl-label">2月</div>
    <div class="tl-content">テキスト</div>
  </div>
</div>
```

```css
.timeline {
  display: flex;
  position: relative;
  align-items: flex-start;
  padding-top: 40px;
  font-family: 'BIZ UDPGothic', sans-serif;
}
.timeline::before {
  content: '';
  position: absolute;
  top: 20px;
  left: 0; right: 0;
  height: 3px;
  background-color: #0974e8;
}
.tl-item { flex: 1; text-align: center; }
.tl-marker {
  width: 14px; height: 14px;
  border-radius: 50%;
  background-color: #0974e8;
  margin: -7px auto 8px;
  position: relative;
  top: -27px;
}
.tl-label { font-weight: 700; font-size: 14px; color: #000; margin-top: -20px; }
.tl-content { font-weight: 400; font-size: 14px; color: #000; margin-top: 4px; }
```

#### 体制図（Org Chart / Structure）

2カラム並列（お客様 | テックタッチ）向け。

```html
<div class="structure-chart">
  <div class="structure-col customer">
    <div class="col-header">お客様の社名</div>
    <div class="col-body">内容</div>
  </div>
  <div class="structure-col techtouch">
    <div class="col-header">テックタッチ</div>
    <div class="col-body">内容</div>
  </div>
</div>
```

```css
.structure-chart { display: flex; gap: 16px; flex-wrap: wrap; }
.structure-col { flex: 1; min-width: 200px; border: 2px solid #0974e8; border-radius: 4px; overflow: hidden; }
.col-header {
  background-color: #0974e8;
  color: #fff;
  font-family: 'BIZ UDPGothic', sans-serif;
  font-weight: 700;
  font-size: 16px;
  padding: 6px 12px;
}
.col-body {
  padding: 12px;
  font-family: 'BIZ UDPGothic', sans-serif;
  font-size: 14px;
  color: #000;
}
```

#### 概念図（Concept Diagram）

土台＋要素の構成。

```html
<div class="concept-diagram">
  <div class="concept-elements">
    <div class="element">要素A</div>
    <div class="element">要素B</div>
    <div class="element">要素C</div>
  </div>
  <div class="concept-base">土台となる概念</div>
</div>
```

```css
.concept-diagram { display: flex; flex-direction: column; gap: 4px; }
.concept-elements { display: flex; gap: 8px; flex-wrap: wrap; }
.element {
  flex: 1;
  background-color: #eeeeee;
  border-radius: 4px;
  padding: 8px;
  font-family: 'BIZ UDPGothic', sans-serif;
  font-weight: 700;
  font-size: 14px;
  color: #000000;
  text-align: center;
}
.concept-base {
  background-color: #0974e8;
  color: #fff;
  font-family: 'BIZ UDPGothic', sans-serif;
  font-weight: 700;
  font-size: 16px;
  padding: 10px;
  text-align: center;
  border-radius: 4px;
}
```

#### メンバー紹介（Member Card）

```html
<div class="members-grid">
  <div class="member-card">
    <div class="member-photo">[写真エリア]</div>
    <div class="member-name">氏名</div>
    <div class="member-role">役職・部署</div>
  </div>
</div>
```

```css
.members-grid { display: flex; flex-wrap: wrap; gap: 12px; }
.member-card {
  text-align: center;
  width: 120px;
  font-family: 'BIZ UDPGothic', sans-serif;
}
.member-photo {
  width: 80px; height: 80px;
  border-radius: 50%;
  background-color: #d9eafe;
  margin: 0 auto 8px;
}
.member-name { font-weight: 700; font-size: 14px; color: #000; }
.member-role { font-weight: 400; font-size: 12px; color: #000; }
```

#### 接続矢印（Connection Arrow）

要素 A → 要素 B のような前後・因果・変換関係を視覚的に示す矢印。
矢羽バナーとは異なり、2つの要素をつなぐシンプルな指示矢印として使う。

横方向（水平）:

```html
<div class="connection-row">
  <div class="conn-item">Before</div>
  <div class="conn-arrow">→</div>
  <div class="conn-item">After</div>
</div>
```

```css
.connection-row { display: flex; align-items: center; gap: 8px; font-family: 'BIZ UDPGothic', sans-serif; }
.conn-item {
  flex: 1;
  background-color: #f1f8fe;
  border: 1px solid #0974e8;
  border-radius: 4px;
  padding: 8px 12px;
  font-weight: 400;
  font-size: 16px;
  color: #000000;
  text-align: center;
}
.conn-arrow {
  color: #0974e8;
  font-weight: 700;
  font-size: 20px;
  flex-shrink: 0;
}
```

縦方向（垂直）:

```html
<div class="connection-col">
  <div class="conn-item">上位概念</div>
  <div class="conn-arrow-v">↓</div>
  <div class="conn-item">下位概念</div>
</div>
```

```css
.connection-col { display: flex; flex-direction: column; align-items: center; gap: 4px; font-family: 'BIZ UDPGothic', sans-serif; }
.conn-arrow-v {
  color: #0974e8;
  font-weight: 700;
  font-size: 20px;
}
```

---

### G05. アイコン（Icons）

| アイコン種別 | 対応 |
|---|---|
| SVG アイコン（ブランドカタログ掲載品） | 提案のみ。アイコン名・用途を HTML コメントで挿入し、SVG 本体はデザイナーが差し込む |
| Unicode インジケーター（▶ ● ✓ ⚠ 等）| CSS でスタイリングして直接挿入可能 |

**Unicode インジケーターの CSS スタイル:**

```css
/* チェック・完了 */
.icon-check::before { content: '✓'; color: #0974e8; font-weight: 700; margin-right: 6px; }

/* 警告・注意 */
.icon-warn::before  { content: '⚠'; color: #ff595e; font-weight: 700; margin-right: 6px; }

/* ポイント・強調リスト */
.icon-point::before { content: '▶'; color: #0974e8; font-weight: 700; margin-right: 6px; }
```

**SVG アイコン提案フォーマット（HTML コメントで挿入）:**

```html
<!-- [ICON: アイコン名（例: icon-check / icon-arrow-right）をブランドカタログから選択して挿入 ] -->
```

---

## ワークフロー

### Step 1: ファイルを読み込む

Read ツールで HTML ファイル全体を読む。ファイルが存在しない場合は終了する。
`<head>` がないインライン断片の場合は `<style>` 内の CSS とインラインスタイルのみを対象にする。

---

### Step 2: 違反チェック

以下のチェック A〜E と L を実行し、違反ごとに **チェック ID・行番号・現在値・理由** を記録する。

**チェック A — フォントファミリー**
- `font-family` に `BIZ UDPGothic` 以外（Arial 等）が含まれているか
- `font-family` に `sans-serif` フォールバックが欠落していないか
- `<head>` に Google Fonts import が存在するか（`--no-font-import` 時を除く）

**チェック B — フォントウェイト**
- `font-weight` が `400` / `700` 以外の値か
- `font-style: italic` が使われているか

**チェック C — フォントサイズ**
- 見出し相当要素（`h1`, `h2`, `h3`, `.title`, `.heading` 等）が `20px` 以上か
- 本文テキストが `16px` 以上か
- 注釈・キャプション（`.note`, `.caption`, `small` 等）が `8px` 以上か

**チェック D — テキストカラーロール**
- `color: #0974e8` の要素が `font-weight: 700` か（青 = 必ず太字）
- `color: #ff595e` の要素が `font-weight: 700` か（赤 = 必ず太字）
- `color: #ffca3a` が `color:` に使われていないか（黄 = 背景専用）
- パレット外の色が `color:` に使われていないか

**チェック E — 禁止色**
- パレット・グラデーション・グレー系（`#f3f3f3`, `#eeeeee` 等）以外の HEX 値が使われていないか

**チェック L — Artifact レイアウト制約**（G03 参照）
- **L-1 外部参照**: 外部 CDN の `<script>`/`<link>`、リモート画像 URL、`fetch`/`XHR`/WebSocket が使われていないか（フォント import は例外）
- **L-2 横スクロール源**: 幅の広い要素（表・コードブロック・図）が `overflow-x: auto` でラップされていないか、`width` が 100% を超える指定がないか
- **L-3 レスポンシブ欠落**: `<img>`/メディアに `max-width: 100%` がないか、固定 px 幅に `max-width: 100%` 保険がないか
- **L-4 nowrap 長文**: `white-space: nowrap` の長いテキストが横あふれを起こしうるか

L-2 のラップ追加・L-3 の `max-width: 100%` 付与は自動修正可能。L-1 と L-4 は意図に関わるため記録のみ（要手動確認）。

---

### Step 3: 違反レポートを表示

違反がなければ「違反なし — ガイドラインに準拠しています」と表示して Step 4 へ。

違反がある場合は以下の形式で表示する:

```
## デザイン違反レポート（{N} 件）

**[A-1] フォントファミリー違反** (行 42)
  現在: font-family: Arial, sans-serif
  修正: font-family: 'BIZ UDPGothic', sans-serif

**[A-2] フォールバック欠落** (行 50)
  現在: font-family: 'BIZ UDPGothic'
  修正: font-family: 'BIZ UDPGothic', sans-serif

**[D-1] テキストカラーロール違反** (行 105)
  現在: color: #0974e8; font-weight: 400
  理由: 青テキストは必ず font-weight: 700（強強調ロール）
  修正: font-weight: 700 を追加

**[L-1] 外部参照違反（要手動確認）** (行 8)
  対象: <script src="https://cdn.example.com/chart.js">
  理由: Artifact の CSP は外部スクリプトをブロックする
  対処: インライン化するか、機能を削る（手動確認が必要）

**[L-2] 横スクロール源** (行 120)
  対象: 幅の広い <table> がラップされていない
  修正: <div style="overflow-x:auto"> でラップする
```

違反が 50 件超の場合は上位 20 件のみ表示し、カテゴリ別件数を報告してユーザーに全修正か優先修正かを確認する。

違反修正の許可を確認する: **「{N} 件の違反を修正します。続けますか？（yes / no / 個別に確認）」**

- `no` → Step 4 へ（コンポーネント変換提案へ進む）
- `yes` → Step 3.5 で全件修正
- `個別に確認` → 各違反ごとに Step 3.5 を繰り返す

### Step 3.5: 違反を修正する

Edit ツールで直接編集する（**1 違反 = 1 Edit 操作**）。

修正順序:
1. `<head>` への Google Fonts import 追加（未存在かつ `--no-font-import` でない場合）
2. フォントファミリー・フォールバック（A）
3. フォントウェイト・italic（B）
4. フォントサイズ（C）
5. テキストカラーロール（D）
6. 禁止色（E）
7. Artifact レイアウト自動修正（L-2 のラップ・L-3 の `max-width: 100%`）

L-1（外部参照）・L-4（nowrap）は意図が不明なため自動修正せず、レポートに「要手動確認」として残す。

---

### Step 4: コンポーネントパターン分析

コンテンツの意味・構造を読んで、ガイドラインサンプルへ変換できる箇所を特定する。

| 判断基準 | 提案するパターン |
|---|---|
| 3〜7個の順序付きプロセス・ステップが並んでいる | **矢羽（横 or 縦）** |
| 日付・月・年ラベルが付いた出来事のリスト | **タイムライン** |
| 見出し付きの情報ブロックが2〜4個並んでいる | **タイトル付きボックス** |
| スタイルのない `<ul>/<ol>` リスト | **箇条書き（ガイドライン準拠スタイル）** |
| スタイルのない `<table>` | **表（ガイドライン準拠スタイル）** |
| 役職・部署・担当者の階層・並列関係 | **体制図** |
| 上位概念と構成要素の関係性（土台＋要素） | **概念図** |
| 人物名・役職・写真エリアの繰り返し | **メンバー紹介** |
| 2要素間に「→」「⇒」「から」「によって」「を経て」「Before/After」等の変換・因果関係がある | **接続矢印（横 or 縦）** |
| リスト項目に完了・チェック・警告・種別の区別が混在している | **アイコン付きリスト（Unicode インジケーター + CSS）** |
| 図解・フロー内に動詞アクション（確認・承認・送信等）を示すノードがある | **SVG アイコン提案（カタログ参照）** |

変換候補が見つかった場合は以下の形式で提案する:

```
## コンポーネント変換提案（{N} 件）

**[C-1] 矢羽（横）への変換候補** (行 88-102)
  現在: 番号付き <ol> で「手順1」「手順2」「手順3」が並んでいる
  理由: 3ステップの順序付きプロセスは矢羽パターンが推奨
  変換後イメージ:
    [手順1] → [手順2] → [手順3]

変換を適用しますか？（yes / no / 番号を指定: 例 C-1 C-3）
```

変換候補がなければ「コンポーネント変換の候補は見つかりませんでした」と表示して終了する。

---

### Step 5: コンポーネント変換を適用する

指定された変換を Edit ツールで適用する。

変換の原則:
- 既存のテキスト内容（項目名・説明文）は保持する
- 構造（HTML の入れ子）と CSS を置き換える
- テキスト量に応じて適切なバリアント（横3・横4・縦3 等）を選ぶ
- 変換後は G01・G02・G03 のルール（フォールバック・色ロール・レスポンシブ）を満たしていることを確認する

---

### Step 6: 完了サマリーを表示する

```
## 完了サマリー

修正した違反: {N} 件
変換したコンポーネント: {N} 件
スキップ・スコープ外: {N} 件

ファイル: {パス}
```

---

## スコープ外の判断基準

| 要素 | 理由 |
|---|---|
| `<img>` タグ・リモート画像 | 画像・写真はデザイナー判断。差し込みは `data:` URI 化をデザイナーに依頼 |
| ロゴ要素（`.logo`, `#logo` 等） | ブランドロゴはデザイナー管理 |
| SVG アイコン本体 | カタログから選択して提案のみ。挿入・編集はデザイナー確認（G05 参照） |
| テキスト内容・コピーライティング | 内容変更はスコープ外 |
| ページ全体の情報設計・構造 | 作り替えはデザイナー確認 |

---

## エラー対処

| エラー | 原因 | 対処 |
|---|---|---|
| ファイルが見つからない | パスが間違い | パスを確認してユーザーに通知し終了 |
| `<head>` が存在しない | インライン HTML の断片 | `<style>` とインラインスタイルのみチェック・修正。フォント import 追加は注記の上スキップ |
| 違反が 50 件超 | 大規模リファクタリング必要 | 上位 20 件＋カテゴリ別件数を表示し、全修正か優先修正かを確認 |
| 変換後に他の違反が発生 | カスケード CSS の副作用 | Step 2 チェックを再実行し追加報告 |
| コンテンツの意味が不明瞭 | 抽象的なプレースホルダー多数 | 変換候補から除外し「判断できませんでした」と注記 |
| 外部 CDN への依存が機能の中核 | 図表ライブラリ等を CDN 読み込みしている | CSP でブロックされる旨を伝え、インライン化か機能削減を手動確認として提示 |
| フォント import を入れるか不明 | 公開先が Artifact か単体 HTML か不明 | 既定（import あり + sans-serif フォールバック）で進め、Artifact 専用なら `--no-font-import` を案内 |
