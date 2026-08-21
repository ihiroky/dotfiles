<!--
  複製元: ~/.config/memo/skills/slide-design/references/layout-catalog.md
  デザインの正本: https://docs.google.com/presentation/d/1Zl3JeTevIMaI1VQjNjvYrky_oJ5Eo4zh8CUJI0Bsizc/edit
  （「テンプレートガイドライン」のスライド 5〜64。ローカルの写しは
   ~/.config/memo/skills/slide-design/guideline.pdf）

  ここに載る容量・上限は 2026-08-21 に正本の見本を実測して校正した値である。
  ガイドライン改訂時は正本を確認し、本ファイルと lib/theme.js の両方を更新する。
  最終照合: 2026-08-21
-->

# Layout selection catalog

## Decision table

| Content relationship | Choose | Capacity | Avoid when |
|---|---|---:|---|
| 1つの結論を強く提示 | statement / key message | 1 claim + short support | 複数の独立論点がある |
| 同列項目 | bullets | 3–7 items, 4 levels まで | 順序や比較が重要 |
| 行列で比較 | table | 2–11 columns | セル内に長文が多い |
| 段階と各段の説明 | chevrons-v | 3–7 stages | 時刻・日付が主役 |
| 左から右への短い手順 | chevrons-h | 3–5 stages | 各段の説明が長い |
| 確定した時系列 | timeline | 3–14 points | 時間が抽象的 |
| 現在から未来への成長 | roadmap | 3–5 milestones | 正確な間隔が必要 |
| 見出し付き並列情報 | titled boxes | 2–4 groups | 階層関係が主役 |
| 組織・責任分担 | org chart | 2 orgs, 2–4 levels | 単なるカテゴリ比較 |
| 土台と要素 | concept-base | 3–5 elements | 要素間の重なりが重要 |
| 2要素の組合せ | concept-2 | 2 concepts | 順序が重要 |
| 3要素の組合せ | concept-3 | 3 concepts | 独立比較が重要 |
| 複数人物 | member grid | 4–8 people | 紹介文が長い |
| 少人数人物 | member rows | 1–3 people | 人数が多い |

## Structural slide selection

- `cover`: deck の最初。タイトル、短いラベル、日付・所属・発表者だけ。
- `toc-1col`: 目次が1〜7項目。
- `toc-2col`: 目次が8〜16項目、または章群が二系統。
- `section`: 章名だけを強く提示する中表紙（本スキルは番号なし・反転を使う）。
- `content`: 単一タイトルと本文。
- `content-heading`: タイトルの下に、このページだけの短い要旨・小見出しが必要。
  本スキルでは専用レイアウトではなく、本文レイアウト共通の任意項目 `lead` として実装している。
  正本の 1〜64 ページはこの構成（タイトル＋1 行のリード文＋本文）が標準である。
- `closing`: deck の最後。提供済みロゴ以外の情報を原則置かない。

## Variant rules

### Tables

- `table-standard`: 上見出し＋左見出し。2〜5列の通常比較。行見出しは 15pt の青太字。
- `table-rowhead`: 左見出し中心。行ごとの説明が主役。
- `table-wide`: 6〜11列の密な比較。本文は短語・数値に限定し、列見出し 8pt・本文 10pt・
  行見出し 9pt へ落とす。
- 強調セルは1行または1列に絞る。全面を青くしない。

### Vertical chevrons

- 段数が増えても説明の文字数（1列 60 字）は変えず、文字サイズを一段落とす
  （3〜4段 12pt → 5段 10pt → 6段 9pt → 7段 8pt）。段の高さは本文帯を段数で割って埋める。
- 説明は 1 列 60 字までを目安にする。それを超えるなら段を分ける。
- 比較する2主体があるときは `label | subject A | subject B` の3列骨格にする。
  列見出しは黒の太字 10pt。

### Horizontal chevrons

- 3段: 説明箱は 108 字まで、リードは 48 字まで。
- 4段: 説明箱は 84 字まで、リードは 24 字まで。
- 5段: 説明箱は 84 字まで、リードは 24 字まで。文字は一段小さくなる。
- 矢羽は連結せず独立して並べ、高さと先端角度を全段で揃える。

### Timeline and roadmap

- timeline の日付ラベルは全点を軸の上に一列に置く。説明が付く点にだけマーカーを打ち、
  軸の下へ引き出し線を伸ばして 2 段の千鳥に配置する。
- 説明は 6 件までを目安にする。目盛は 14 点まで見本がある。
- roadmap は右上がりの直線上に `現在地` と将来マイルストーンを置く。
- ロードマップで精密な日付を装わない。

### Titled boxes

- `box-cols-2`: 2カテゴリ、説明長め。帯は上。
- `box-cols-3`: 3カテゴリ、説明中程度。帯は上。
- `box-cols-4`: 4カテゴリ、短文。帯は上。
- `box-rows-2`: 2カテゴリ、各カテゴリの箇条書きが長い。**帯は左のラベル列**。
- `box-rows-3`: 3カテゴリ、各カテゴリの説明が中程度。**帯は左のラベル列**。
- `box-grid-4`: 4カテゴリを2×2にし、横4より可読性を優先。帯は上。
- 縦型の見出しは幅 226px のラベル列に入るので、横型より短く保つ。

### Organization charts

- 左右の組織枠を同じ高さにする必要はない。階層の深さを優先する。
- 人名より役割を先に見せる。人名は役割の下へ置く。
- 接続線の交差を避けるため、共通責任者は中央上部へ寄せる。
- 箱の数で分割を決めない（正本の見本は 1 ページに 17 箱を収めている）。
  分割の判断は文字が読める大きさを保てるかで行う。

### Concept diagrams

- `concept-base`: 上段の要素は `#efefef` の円、下段の土台は直角の青い横長バー。
- `concept-2`: 青と黄のリングを連結させる（重ねない）。噛み合わせを中央に置く。
- `concept-3`: 3つの円を三つ編み状に絡ませる。青系の濃淡とグレーだけで組み、
  有彩色を3色へ増やさない。

### Members

- `member-grid`: 部署見出しを列上部の青い帯に置き、各人物を正方形写真（94px 目安）＋
  テキストの横並びにする。氏名 12pt 青太字 / 役職 8pt 青太字 / 紹介文 9pt。
- `member-rows`: 130px 角前後の正方形写真と長めの紹介文を横並びにし、カードを縦に反復する。
  部署 11pt 太字 / 氏名 17pt 太字 / 紹介文 12pt。
- 写真は円形にトリミングしない（正本に用例がない）。
- 写真未提供時は同寸法の枠を置き、生成画像で補完しない。

## Density budget

目安として次を超えたら別バリアントを検討する。

| Layout | Comfortable maximum |
|---|---:|
| statement | 60 Japanese characters + 2 short supports |
| bullets | 7 first-level items, 60 characters each |
| titled box | 100 characters per box（見出しは 20 字、縦型は 14 字） |
| horizontal chevrons | 5 stages / 108 characters per box at 3 stages, 84 at 4–5 |
| vertical chevrons | 7 stages, 60 characters **per column** |
| timeline | 14 labels, 6 descriptions |
| lead（全レイアウト共通） | 55 characters（1 行に収める） |
| member grid | 6 people with short bios |
| member rows | 3 people with medium bios |

これは内容削減の許可ではない。超過時はレイアウト変更、内容過多の報告、分割提案の順で扱う。

## Markup contracts

複製元（`slide-design`）のこの節は HTML deck の DOM 契約を定めていた。
**google-slides-deck では HTML を経由しない**ため、その内容は削除した。

本スキルにおける入力契約は deck JSON である。各レイアウトの JSON 記法は
`../SKILL.md` の「deck JSON の契約」を正とする。
上記の Decision table・Variant rules・Density budget は出力形式に依存しない
知見なので、そのまま適用する。
