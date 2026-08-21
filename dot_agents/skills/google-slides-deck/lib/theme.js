/**
 * theme.js — デザイントークンの単一の正
 *
 * 正本は Techtouch 社内デザインガイドライン:
 *   https://docs.google.com/presentation/d/1Zl3JeTevIMaI1VQjNjvYrky_oJ5Eo4zh8CUJI0Bsizc/edit
 *   （「テンプレートガイドライン」2025.05.22 更新。デザインの内容は 5〜64 ページ）
 *
 * フレーム系レイアウト（cover / toc-1col / section / closing）は実物テンプレート
 *   https://docs.google.com/presentation/d/1unclsUhqrGK3gPmlvFP_AEFjVkUsd4z3Wozb5R4ccb4/edit
 *   （tt-template-202608）からも実測できる。2026-08-21 の照合で **両ファイルのマスターと
 *   レイアウトは同一** であることを確認した（唯一の差異は 02_目次 BODY の行送り
 *   1.5 / 2.0。目次はテンプレート側を正として 2.0 を採る）。
 *   したがって以下の値は「どちらのファイルからも同じ値が得られる実測値」である。
 *
 *   デザイン方針の変更は原則このファイルだけを書き換えれば足りる。
 *   lib/layouts.js・lib/render.js に色・フォント名・寸法を直書きしないこと。
 *
 * 座標系について:
 *   本スキルは内部座標を 960×540 px（16:9）で扱う。
 *   PPTX は inch 座標なので px/96 で変換する（960px = 10in、540px = 5.625in）。
 *   フォントは pt なので px*0.75 で変換する（960px = 720pt）。
 *   96 DPI で 1:1 に対応するため、ガイドラインの実測 px 値がそのまま使える。
 */

'use strict';

const path = require('path');

// ---------------------------------------------------------------------------
// ブランドアセット（tt-template-202608 から抽出）
// ---------------------------------------------------------------------------

const assets = {
  // 表紙・最終ページの全面グラデーション背景。目次の下端バンドにも同じ画像を使う
  gradientBlue: path.join(__dirname, '..', 'assets', 'gradient-blue.jpg'),
  // 表紙フッター上の横型ロゴ（白抜き・透過）
  logoHorizontal: path.join(__dirname, '..', 'assets', 'logo-horizontal-white.png'),
  // 最終ページ中央の縦積みロゴ（白抜き・透過）
  logoStacked: path.join(__dirname, '..', 'assets', 'logo-stacked-white.png'),
};

// ---------------------------------------------------------------------------
// キャンバス
// ---------------------------------------------------------------------------

const canvas = {
  width: 960,
  height: 540,
  // 標準本文領域。レイアウト「05_空白ページ」の BODY プレースホルダ実測
  // （x=15.1, y=45.4, w=929.8, h=440.6 → 右端 944.9・下端 486）
  margin: { left: 15, right: 15, top: 45.4, bottom: 54 },
};

// ---------------------------------------------------------------------------
// 色（design-guidelines.md §3）
// PptxGenJS は "RRGGBB" 形式（# なし）を使う
// ---------------------------------------------------------------------------

const color = {
  blue: '0974E8',      // 強強調・見出し帯・線・アクセント
  yellow: 'FFCA3A',    // ハイライトツールチップの説明を囲む枠線。面塗りには使わない
  red: 'FF595E',       // 警告・アラート

  // ブルースケール（濃 → 淡）
  blueScale: ['2D8EF7', '469BF8', '5EA8F9', '8FC3FB', 'C0DDFD', 'D9EAFE', 'F1F8FE'],

  black: '000000',
  nearBlack: '191919',  // タイトル・フッター・ページ番号。テンプレートの実測値
  white: 'FFFFFF',
  grayHeader: 'F3F3F3', // 表の列見出し背景・非強調ブロック
  grayElement: 'EFEFEF',// 概念図の要素背景
  grayRule: 'D9D9D9',   // 罫線・枠線・グレーのコネクタ
  grayArrow: 'CCCCCC',  // 矢印図形のグレー
  grayMuted: '666666',  // 明示的に弱めたいテキスト
};

/** テキストカラーロール（design-guidelines.md §3 Text roles）。意味から引く */
const textRole = {
  normal: { color: color.black, bold: false },
  emphasis: { color: color.black, bold: true },
  strong: { color: color.blue, bold: true },
  alert: { color: color.red, bold: true },
  onBlue: { color: color.white, bold: true },
  muted: { color: color.grayMuted, bold: false },
};

// ---------------------------------------------------------------------------
// タイポグラフィ（design-guidelines.md §2）
// px で宣言する。render 側で pt に変換する
// ---------------------------------------------------------------------------

const font = {
  family: 'BIZ UDPGothic',
  // 使用可能ウェイトは 400 / 700 のみ。italic 禁止
  weights: [400, 700],

  sizePx: {
    coverTitle: 40,     // 実測 30pt
    coverSubtitle: 13,  // 実測 10pt
    coverKicker: 16,    // 表紙上部の小ラベル。実測 12pt
    tocTitle: 32,       // 目次タイトル（青・アクセントバーなし）。実測 24pt
    tocItem: 19,        // 目次の項目。実測 14pt
    sectionTitle: 37,   // 中表紙タイトル。実測 28pt（master TITLE 既定値の継承）
    slideTitle: 20,     // ページタイトル。実測 15pt
    lead: 16,           // タイトル下のリード文。実測 12pt（06_空白ページ（見出し））
    heading: 20,        // 見出し・矢羽ラベル・表の行見出し。実測 15pt
    claim: 28,          // statement の主張。ガイドラインに対応する見本が無いスキル固有の値
    body: 16,           // 本文。実測 12pt
    colHeading: 13,     // 矢羽の列見出しなど。実測 10pt
    small: 13,          // 密度の高い表の本文
    note: 13,           // 注釈バンドの文字。実測 10pt
    source: 8,          // 出典。実測 6pt
    footer: 8,          // フッターの copyright / confidential。実測 6pt
    pageNumber: 13,     // ページ番号。実測 10pt
    minimum: 8,         // これを下回ってはならない（絶対下限 = 6pt）
  },

  lineSpacing: {
    // 実測: 本文 1.5（p.9 の本文サンプル）／master BODY 1.3／
    // 見出し・ラベルは 1.0、中表紙タイトルのみ 1.15、目次の項目は 2.0
    body: 1.5,
    dense: 1.3,
    heading: 1.0,
    sectionTitle: 1.15,
    tocItem: 2.0,
  },
};

// ---------------------------------------------------------------------------
// フレーム要素（タイトル・リード文・フッター）
// ---------------------------------------------------------------------------

const frame = {
  /** タイトル左の青いアクセントバー。実測: x=0 に接する 9.5×22.6 */
  accentBar: { width: 9.5, height: 22.6, color: color.blue },
  titleTop: 15.2,
  titleColor: color.nearBlack,

  /** リード文。あると本文の開始位置が 78.2 へ下がる（06_空白ページ（見出し）実測） */
  lead: { top: 45.5, height: 22.6, bodyTop: 78.2, color: color.nearBlack },

  // 目次・中表紙の下端バンドで共有する高さ（実測 48.7px）
  bandHeight: 48.7,

  footer: {
    left: '© Techtouch, Inc.',
    right: 'confidential',
    // 実測: copyright は x=15.1 y=519.7 w=96.6 h=9.7 の 6pt
    textTop: 519.7,
    textHeight: 10,
    color: color.nearBlack,
    // ページ番号は中央（実測 x=451.2 w=57.6、10pt）
    pageNumber: { x: 451.2, y: 515.9, width: 57.6, height: 18 },
    // confidential は塗りなし・枠線のみのバッジ（実測 x=876.5 y=515.9 68.3×17.3、枠 0.8pt）
    badge: { x: 876.5, y: 515.9, width: 68.3, height: 17.3, radius: 0, borderPt: 0.8 },
  },

  /** 表紙（01_タイトル スライド 実測） */
  cover: {
    kicker: { x: 13.6, y: 17.9, width: 931.2, height: 36 },
    title: { x: 14.4, y: 205.4, width: 931.2, height: 129.3 },
    subtitle: { x: 13.6, y: 419.3, width: 382, height: 92.3 },
    logo: { x: 395.6, y: 493, width: 168.8, height: 25.6 },
  },

  /** 目次（02_目次 実測）。アクセントバーなし、下端に装飾バンド、フッターを持たない */
  toc: {
    marginLeft: 37.8,
    titleTop: 15.2,
    titleHeight: 58.2,
    body: { x: 37.8, y: 99.4, width: 884.4, height: 332.6 },
  },

  /** 中表紙（04B_セクションタイトル（番号なし）反転 実測） */
  section: { title: { x: 49.9, y: 184.1, width: 860.2, height: 141.1 } },

  /** 最終ページ（99_最終ページ_ロゴのみ 実測） */
  closing: { logo: { x: 387.9, y: 184.7, width: 184.3, height: 170.5 } },
};

// ---------------------------------------------------------------------------
// コンポーネント寸法
// ---------------------------------------------------------------------------

const component = {
  gap: 12,              // 反復要素の間隔
  radius: 4,            // 角丸。ガイドラインの見本は直角なので既定では使わない
  padding: 10,

  table: {
    headerFill: color.grayHeader,
    // 行見出しは塗らず、青の太字で見せる（p.25–28 実測）
    rowHeaderFill: null,
    rowHeaderColor: color.blue,
    rowHeaderSizePx: 20,      // 15pt（4〜5 列の通常の表。p.25 実測）
    rowHeaderSizePxDense: 12, // 9pt（6 列以上の密な表。p.27・28 実測）
    bodyFill: color.white,
    border: { type: 'solid', color: color.grayRule, pt: 0.75 },
    headerRowHeight: 30,
    bodyRowHeight: 28,
  },

  chevron: {
    fill: color.blue,
    labelColor: color.white,
    labelSizePx: 20,    // 15pt。横3 の見本のみ 17pt だが既定は 15pt
    heightH: 60.4,      // 横型矢羽の高さ。段数によらず一定（p.35–38 実測）
    gapH: 20,           // 横型は矢羽を連結せず独立して並べる（実測 17〜29px）
    labelWidthV: 236.7, // 縦型のラベル列幅。段数によらず一定（p.30–34 実測）
    shapeV: 'flowChartOffpageConnector', // 縦型は下向きの矢羽
    gapV: 8,

    /**
     * 段数に応じた文字サイズの階梯。
     * 正本は説明の文字数（1 列 60 字）を変えずに、段数が増えるほど文字を
     * 一段ずつ小さくしている（縦: 12/12/10/9/8pt、横: 12/12/11pt）。
     * autofit のような自動縮小ではなく、あらかじめ決められた段階である。
     */
    labelSizePxByStepsV: { 7: 19 },                       // 7段のみ 14pt
    detailSizePxByStepsV: { 3: 16, 4: 16, 5: 13, 6: 12, 7: 11 },
    leadSizePxByStepsH: { 3: 20, 4: 20, 5: 19 },
    detailSizePxByStepsH: { 3: 16, 4: 16, 5: 15 },
    // 縦型の説明欄は塗らず、列の境界にグレーの縦罫を引く
    detailDivider: { color: color.grayRule, pt: 0.75 },
    // 横型の説明は「太字のリード＋グレー枠の白い箱」の 2 段構成
    detailBox: { line: { color: color.grayRule, pt: 0.75 } },
  },

  titledBox: {
    headerFill: color.blue,
    headerColor: color.white,
    headerBold: false,   // 見本は標準ウェイト
    headerAlign: 'center',
    headerHeight: 30,
    bodyFill: color.blueScale[6], // F1F8FE
    radius: 0,           // 直角
    innerGap: 0,         // 帯と本文面は隙間なく接する
    // 縦バリアント（rows-*）は左のラベル列 + 右の本文面（p.48・49 実測）
    labelWidthRows: 226.3,
  },

  timeline: {
    axisColor: color.blue,
    axisThicknessPt: 1.5,
    markerSize: 8,
    // 説明は軸の下に引き出し線つきで 2 段の千鳥に置く（p.40 実測）
    leaderShort: 50,
    leaderLong: 114,
  },

  concept: {
    elementFill: color.grayElement,
    elementBold: false,
    foundationFill: color.blue,
    foundationHeight: 52,
    radius: 0,
  },

  /** 矢印・コネクタ（p.62 実測）。青は薄青、グレーは #CCCCCC */
  arrow: {
    blue: color.blueScale[3],   // 8FC3FB
    gray: color.grayArrow,      // CCCCCC
    connectorBlue: color.blue,
    connectorGray: color.grayRule,
    connectorWeightPt: 1.5,
  },

  /**
   * 注釈の枠線コンベンション（正本で頻用）。塗りは持たず枠線だけで囲む。
   * 現時点では deck JSON からは指定できず、トークンとしてのみ定義している。
   */
  annotation: {
    pointer: { color: color.blue, pt: 1.5 },    // UI や図の一部を指す
    warn: { color: color.red, pt: 1.5 },        // 警告
    highlight: { color: color.yellow, pt: 2.25 }, // ハイライトツールチップの説明
  },

  /** 注釈バンド。本文領域の幅いっぱいの薄青の帯に中央揃えで置く（p.9・13・21 実測） */
  noteBand: { fill: color.blueScale[6], height: 36 },
};

// ---------------------------------------------------------------------------
// 単位変換ヘルパ
// ---------------------------------------------------------------------------

const DPI = 96;
const PT_PER_PX = 0.75;

/** px → inch（PptxGenJS の x/y/w/h 用） */
const inch = (px) => px / DPI;

/** px → pt（PptxGenJS の fontSize 用） */
const pt = (px) => px * PT_PER_PX;

module.exports = {
  canvas,
  color,
  textRole,
  font,
  frame,
  component,
  assets,
  inch,
  pt,
  DPI,
};
