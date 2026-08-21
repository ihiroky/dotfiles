/**
 * render.js — deck JSON から PPTX ファイルを組み立てる
 *
 * PPTX を経由するのは、Drive が PPTX をネイティブの Google スライドへ変換して
 * くれるからである。Slides API の batchUpdate を直接叩くより要求数が桁違いに
 * 少なく、ローカルで中身を確認できる。
 */

'use strict';

const PptxGenJS = require('pptxgenjs');
const T = require('./theme');
const { layouts } = require('./layouts');

/** ページ番号を振らないレイアウト */
const NO_PAGE_NUMBER = new Set(['cover', 'closing']);

/**
 * deck を PPTX として書き出す。
 * @param {object} deck   deck JSON
 * @param {string} outPath 出力先 .pptx
 * @returns {Promise<{path:string, slides:number}>}
 */
async function renderDeck(deck, outPath) {
  const pptx = new PptxGenJS();

  // 16:9。960px = 10in（96 DPI）で theme.js の px 座標系と一致する
  pptx.defineLayout({
    name: 'TT16x9',
    width: T.inch(T.canvas.width),
    height: T.inch(T.canvas.height),
  });
  pptx.layout = 'TT16x9';

  pptx.author = deck.author || '';
  pptx.company = deck.company || 'Techtouch, Inc.';
  pptx.title = deck.title || '';
  pptx.subject = deck.subtitle || '';

  const ctx = {
    deckTitle: deck.title || '',
    footerLeft: (deck.footer && deck.footer.left) || T.frame.footer.left,
    // 既定で confidential 表示を出す。社外配布時のみ deck 側で false にする
    confidential: deck.footer && deck.footer.confidential === false ? false : true,
  };

  let page = 0;
  for (const [i, spec] of (deck.slides || []).entries()) {
    const fn = layouts[spec.layout];
    if (!fn) {
      throw new Error(`slide ${i + 1}: 未対応の layout "${spec.layout}"`);
    }
    const slide = pptx.addSlide();
    slide.background = { color: T.color.white };

    if (!NO_PAGE_NUMBER.has(spec.layout)) page += 1;
    const withPage = { ...spec, _page: NO_PAGE_NUMBER.has(spec.layout) ? null : page };

    try {
      fn(slide, withPage, ctx);
    } catch (e) {
      throw new Error(`slide ${i + 1} (${spec.layout}) の描画に失敗: ${e.message}`);
    }
  }

  await pptx.writeFile({ fileName: outPath });
  return { path: outPath, slides: (deck.slides || []).length };
}

module.exports = { renderDeck };
