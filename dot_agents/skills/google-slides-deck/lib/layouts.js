/**
 * layouts.js — deck JSON の 1 スライドを PPTX の図形へ落とす
 *
 * 座標は全て px（960×540 のキャンバス）で書く。inch 変換は rect() ヘルパが行う。
 * 色・フォント・寸法は必ず theme.js から引く。ここに直書きしないこと。
 *
 * 実装レイアウト:
 *   フレーム: cover / section / closing / toc-1col
 *   本文:     statement / bullets / table / chevrons-h / chevrons-v /
 *             timeline / titled-boxes / concept-base
 *   本文レイアウトは共通で任意の lead（タイトル下のリード文 = ガイドラインの
 *   「06_空白ページ（見出し）」に相当）・note（注釈バンド）・source（出典）を持つ。
 *
 * 未実装（references/layout-catalog.md にはあるが対象外）:
 *   org-chart / member-grid / member-rows / concept-2 / concept-3 / roadmap / toc-2col
 */

'use strict';

const T = require('./theme');

const { canvas, color, font, frame, component } = T;

// 標準本文領域（design-guidelines.md §1）
const CONTENT = {
  x: canvas.margin.left,
  y: canvas.margin.top,
  w: canvas.width - canvas.margin.left - canvas.margin.right,   // 930
  h: canvas.height - canvas.margin.top - canvas.margin.bottom,  // 440.6
};

// ---------------------------------------------------------------------------
// 低レベルヘルパ
// ---------------------------------------------------------------------------

/** px の矩形を PptxGenJS の inch 座標へ変換する */
function rect(x, y, w, h) {
  return { x: T.inch(x), y: T.inch(y), w: T.inch(w), h: T.inch(h) };
}

/**
 * テキストを置く。sizePx は px 指定（内部で pt へ変換）。
 * role は theme.textRole のキー。color/bold を個別指定すると role を上書きする。
 */
function text(slide, content, o) {
  const role = T.textRole[o.role || 'normal'];
  const sizePx = o.sizePx || font.sizePx.body;
  if (sizePx < font.sizePx.minimum) {
    throw new Error(`font size ${sizePx}px は下限 ${font.sizePx.minimum}px を下回る`);
  }
  slide.addText(content, {
    ...rect(o.x, o.y, o.w, o.h),
    fontFace: font.family,
    fontSize: T.pt(sizePx),
    color: o.color || role.color,
    bold: o.bold !== undefined ? o.bold : role.bold,
    align: o.align || 'left',
    valign: o.valign || 'top',
    lineSpacingMultiple: o.lineSpacing || font.lineSpacing.body,
    margin: o.margin !== undefined ? o.margin : 0,
    wrap: true,
    fit: 'none', // 文字を縮めて詰め込まない（design-guidelines.md §2）
    ...(o.fill ? { fill: { color: o.fill } } : {}),
    ...(o.shape ? { shape: o.shape } : {}),
    ...(o.line ? { line: o.line } : {}),
    ...(o.rectRadius !== undefined ? { rectRadius: o.rectRadius } : {}),
  });
}

/** 塗りの図形を置く */
function shape(slide, shapeType, o) {
  slide.addShape(shapeType, {
    ...rect(o.x, o.y, o.w, o.h),
    ...(o.fill ? { fill: { color: o.fill } } : {}),
    ...(o.line ? { line: o.line } : {}),
    ...(o.rectRadius !== undefined ? { rectRadius: o.rectRadius } : {}),
    ...(o.rotate ? { rotate: o.rotate } : {}),
  });
}

/** 均等配置の i 番目の位置と幅を返す */
function track(startX, totalW, count, gap) {
  const w = (totalW - gap * (count - 1)) / count;
  return (i) => ({ x: startX + i * (w + gap), w });
}

/** 細い罫線を矩形で引く */
function rule(slide, x, y, w, h, c) {
  shape(slide, 'rect', { x, y, w, h, fill: c });
}

/**
 * 段数に応じた値の階梯を引く（theme.component.chevron の *BySteps* 用）。
 * 定義の外側は端の値へ丸める。
 */
function ladder(map, n, fallback) {
  if (map[n] !== undefined) return map[n];
  const keys = Object.keys(map).map(Number).sort((a, b) => a - b);
  if (!keys.length) return fallback;
  return n < keys[0] ? map[keys[0]] : map[keys[keys.length - 1]];
}

// ---------------------------------------------------------------------------
// 共通フレーム — タイトル・リード文・フッター・注釈
// ---------------------------------------------------------------------------

/**
 * ページタイトル（左の青いアクセントバー + タイトル文字）。
 * 実測（05_空白ページ）: バーは x=0 に接する 9.5×22.6、タイトルは本文と同じ
 * margin.left から始まり、同じ y・同じ高さに置かれる。
 */
function drawTitle(slide, title) {
  if (!title) return;
  const bar = frame.accentBar;
  shape(slide, 'rect', {
    x: 0, y: frame.titleTop, w: bar.width, h: bar.height, fill: bar.color,
  });
  text(slide, title, {
    x: canvas.margin.left, y: frame.titleTop, w: CONTENT.w, h: bar.height,
    sizePx: font.sizePx.slideTitle, color: frame.titleColor, bold: true,
    valign: 'middle', lineSpacing: font.lineSpacing.heading,
  });
}

/** タイトル直下のリード文（06_空白ページ（見出し）実測: y=45.5 の 12pt 1 行） */
function drawLead(slide, lead) {
  if (!lead) return;
  text(slide, lead, {
    x: canvas.margin.left, y: frame.lead.top, w: CONTENT.w, h: frame.lead.height,
    sizePx: font.sizePx.lead, color: frame.lead.color, bold: false,
    valign: 'middle', lineSpacing: font.lineSpacing.heading,
  });
}

/**
 * confidential バッジ。実測では塗りなし・枠線のみで、枠と文字が同色。
 * onDark: true = 白（暗い背景用）、false = 青（白背景用）
 */
function drawConfidentialBadge(slide, onDark) {
  const b = frame.footer.badge;
  const c = onDark ? color.white : color.blue;
  text(slide, frame.footer.right, {
    x: b.x, y: b.y, w: b.width, h: b.height,
    shape: 'rect', rectRadius: b.radius,
    color: c, bold: false, sizePx: font.sizePx.footer,
    align: 'center', valign: 'middle', lineSpacing: font.lineSpacing.heading,
    line: { color: c, width: b.borderPt },
  });
}

/**
 * フッター。左に copyright、中央にページ番号、右に confidential バッジ。
 * toc-1col / section / closing はフッターを持たない（レイアウト実測）。
 * onDark = true で文字を白にする（表紙用）。
 */
function drawFooter(slide, ctx, pageNumber, onDark) {
  const f = frame.footer;
  const c = onDark ? color.white : f.color;
  text(slide, ctx.footerLeft, {
    x: canvas.margin.left, y: f.textTop, w: 300, h: f.textHeight,
    sizePx: font.sizePx.footer, color: c, bold: false,
    valign: 'middle', lineSpacing: font.lineSpacing.heading,
  });
  if (pageNumber != null) {
    const p = f.pageNumber;
    text(slide, String(pageNumber), {
      x: p.x, y: p.y, w: p.width, h: p.height,
      sizePx: font.sizePx.pageNumber, color: c, bold: false,
      align: 'center', valign: 'middle', lineSpacing: font.lineSpacing.heading,
    });
  }
  if (ctx.confidential) drawConfidentialBadge(slide, !!onDark);
}

/**
 * 注釈バンドと出典。
 * note は本文領域の幅いっぱいの薄青の帯に中央揃え 10pt（p.9・13・21 実測）。
 * source は本文の外、フッターの少し上に 6pt で右寄せ（p.9 実測）。
 */
function drawNote(slide, spec) {
  if (spec.note) {
    const nb = component.noteBand;
    text(slide, spec.note, {
      x: CONTENT.x, y: canvas.height - canvas.margin.bottom - nb.height,
      w: CONTENT.w, h: nb.height,
      fill: nb.fill, sizePx: font.sizePx.note, role: 'normal',
      align: 'center', valign: 'middle', margin: T.pt(6),
      lineSpacing: font.lineSpacing.dense,
    });
  }
  if (spec.source) {
    text(slide, `出典: ${spec.source}`, {
      x: CONTENT.x, y: 498, w: CONTENT.w, h: 12,
      sizePx: font.sizePx.source, color: color.nearBlack, bold: false,
      align: 'right', valign: 'bottom', lineSpacing: font.lineSpacing.heading,
    });
  }
}

/** タイトルとリード文を描き、そのスライドで本文に使える領域を返す */
function openBody(slide, spec) {
  drawTitle(slide, spec.title);
  drawLead(slide, spec.lead);
  const y = spec.lead ? frame.lead.bodyTop : CONTENT.y;
  let h = canvas.height - canvas.margin.bottom - y;
  if (spec.note) h -= component.noteBand.height + component.gap;
  return { x: CONTENT.x, y, w: CONTENT.w, h };
}

/** 注釈とフッターを描いて締める */
function closeBody(slide, spec, ctx) {
  drawNote(slide, spec);
  drawFooter(slide, ctx, spec._page, false);
}

// ---------------------------------------------------------------------------
// レイアウト実装
// ---------------------------------------------------------------------------

const layouts = {
  // ---- 表紙 ---------------------------------------------------------------
  // 「01_タイトル スライド」実測: 全面グラデーション背景。タイトルは中央、
  // 副題は左下、上部に小ラベル、フッター直上の中央に横型ロゴ
  cover(slide, spec, ctx) {
    slide.addImage({
      path: T.assets.gradientBlue,
      x: 0, y: 0, w: T.inch(canvas.width), h: T.inch(canvas.height),
    });

    const c = frame.cover;
    const meta = spec.meta || [];
    if (meta.length) {
      text(slide, meta.join('　／　'), {
        x: c.kicker.x, y: c.kicker.y, w: c.kicker.width, h: c.kicker.height,
        sizePx: font.sizePx.coverKicker, color: color.white, bold: true,
        align: 'left', valign: 'middle', lineSpacing: font.lineSpacing.heading,
      });
    }
    text(slide, spec.title || ctx.deckTitle || '', {
      x: c.title.x, y: c.title.y, w: c.title.width, h: c.title.height,
      sizePx: font.sizePx.coverTitle, color: color.white, bold: true,
      align: 'center', valign: 'middle', lineSpacing: font.lineSpacing.heading,
    });
    if (spec.subtitle) {
      text(slide, spec.subtitle, {
        x: c.subtitle.x, y: c.subtitle.y, w: c.subtitle.width, h: c.subtitle.height,
        sizePx: font.sizePx.coverSubtitle, color: color.white, bold: false,
        align: 'left', valign: 'top', lineSpacing: font.lineSpacing.heading,
      });
    }

    slide.addImage({
      path: T.assets.logoHorizontal,
      ...rect(c.logo.x, c.logo.y, c.logo.width, c.logo.height),
    });

    drawFooter(slide, ctx, null, true);
  },

  // ---- 目次（1 列） -------------------------------------------------------
  // 「02_目次」実測: アクセントバーなし・青太字 24pt のタイトル・左右マージン 37.8px・
  // 本文は BODY プレースホルダの ● 箇条書き 14pt / 行送り 2.0・下端に装飾バンド。
  // 罫線と自動採番は正本に無い（番号を出したいときは項目文字列に含める）
  'toc-1col'(slide, spec, ctx) {
    const tc = frame.toc;

    text(slide, spec.title || '目次', {
      x: tc.marginLeft, y: tc.titleTop,
      w: canvas.width - tc.marginLeft * 2, h: tc.titleHeight,
      sizePx: font.sizePx.tocTitle, color: color.blue, bold: true, valign: 'top',
      lineSpacing: font.lineSpacing.heading,
    });

    const items = spec.items || [];
    if (items.length) {
      slide.addText(
        items.map((item) => ({
          text: typeof item === 'string' ? item : item.text,
          options: {
            bullet: { characterCode: '25CF', indent: 14 },
            breakLine: true,
          },
        })),
        {
          ...rect(tc.body.x, tc.body.y, tc.body.width, tc.body.height),
          fontFace: font.family,
          fontSize: T.pt(font.sizePx.tocItem),
          color: color.black,
          valign: 'top',
          lineSpacingMultiple: font.lineSpacing.tocItem,
          margin: 0,
          wrap: true,
          fit: 'none',
        }
      );
    }

    slide.addImage({
      path: T.assets.gradientBlue,
      ...rect(0, canvas.height - frame.bandHeight, canvas.width, frame.bandHeight),
    });
  },

  // ---- 中表紙 ---------------------------------------------------------------
  // 「04B_セクションタイトル（番号なし）反転」実測: 全面ブランドブルー背景 +
  // 中央揃え白太字 28pt（行送り1.15） + 下端の白バンド。
  // 番号なしレイアウトのため spec.number は受け取っても描画しない。フッターは持たない
  section(slide, spec, ctx) {
    shape(slide, 'rect', { x: 0, y: 0, w: canvas.width, h: canvas.height, fill: color.blue });

    const t = frame.section.title;
    text(slide, spec.title || '', {
      x: t.x, y: t.y, w: t.width, h: t.height,
      sizePx: font.sizePx.sectionTitle, color: color.white, bold: true,
      align: 'center', valign: 'middle', lineSpacing: font.lineSpacing.sectionTitle,
    });

    shape(slide, 'rect', {
      x: 0, y: canvas.height - frame.bandHeight,
      w: canvas.width, h: frame.bandHeight, fill: color.white,
    });
  },

  // ---- 単一の主張 -------------------------------------------------------
  statement(slide, spec, ctx) {
    const b = openBody(slide, spec);
    const supports = spec.supports || [];
    const claimH = supports.length ? b.h * 0.5 : b.h * 0.72;
    text(slide, spec.claim || '', {
      x: b.x + 40, y: b.y + 20, w: b.w - 80, h: claimH,
      sizePx: font.sizePx.claim, role: 'strong',
      align: 'center', valign: 'middle', lineSpacing: font.lineSpacing.dense,
    });
    if (supports.length) {
      const t = track(b.x + 40, b.w - 80, supports.length, component.gap * 2);
      supports.forEach((s, i) => {
        const { x, w } = t(i);
        const y = b.y + claimH + 40;
        shape(slide, 'rect', { x, y, w: 34, h: 3, fill: color.blue });
        text(slide, typeof s === 'string' ? s : s.text, {
          x, y: y + 14, w, h: b.h - claimH - 60,
          sizePx: font.sizePx.body, role: 'normal', valign: 'top',
        });
      });
    }
    closeBody(slide, spec, ctx);
  },

  // ---- 箇条書き ---------------------------------------------------------
  // グリフは ● ○ ■ を 3 階層で循環する（4 階層以上も同じ循環で続く）。
  // master BODY の既定は第1階層 15pt・第2階層以下 12pt だが、正本の見本（p.43）は
  // 全階層を一律 14pt で組んでいる。第1階層を 15pt にすると密度バジェット上限
  // （7 項目 × 60 字）でフッターへ溢れることを目視で確認したため、全階層 12pt に揃える
  bullets(slide, spec, ctx) {
    const b = openBody(slide, spec);
    const bulletCode = ['25CF', '25CB', '25A0']; // ● ○ ■
    const runs = (spec.items || []).map((item) => {
      const o = typeof item === 'string' ? { text: item } : item;
      const level = Math.min(Math.max(o.level || 1, 1), 9) - 1;
      const role = T.textRole[o.role || 'normal'];
      return {
        text: o.text,
        options: {
          bullet: { characterCode: bulletCode[level % 3], indent: 14 },
          indentLevel: level,
          fontSize: T.pt(font.sizePx.body),
          color: o.color || role.color,
          bold: o.bold !== undefined ? o.bold : role.bold,
          breakLine: true,
        },
      };
    });
    if (runs.length) {
      slide.addText(runs, {
        ...rect(b.x + 14, b.y, b.w - 28, b.h),
        fontFace: font.family,
        fontSize: T.pt(font.sizePx.body),
        color: color.black,
        valign: 'top',
        lineSpacingMultiple: font.lineSpacing.body,
        paraSpaceAfter: T.pt(4),
        margin: 0,
        wrap: true,
        fit: 'none',
      });
    }
    closeBody(slide, spec, ctx);
  },

  // ---- 表 ---------------------------------------------------------------
  // p.25–28 実測: 列見出しは #F3F3F3 に黒太字、行見出しは塗らずに青の太字 15pt、
  // 本文セルは白、罫線は #D9D9D9 0.75pt
  table(slide, spec, ctx) {
    const b = openBody(slide, spec);
    const cols = spec.columns || [];
    const rows = spec.rows || [];
    const useRowHeader = spec.rowHeader === true;
    const dense = cols.length >= 6;
    const cellSizePx = dense ? font.sizePx.small : font.sizePx.body;
    const tc = component.table;

    const base = {
      fontFace: font.family,
      fontSize: T.pt(cellSizePx),
      color: color.black,
      border: [tc.border, tc.border, tc.border, tc.border],
      margin: T.pt(6),
      valign: 'middle',
    };

    const head = cols.map((c) => ({
      text: typeof c === 'string' ? c : c.text,
      options: { ...base, fill: { color: tc.headerFill }, bold: true, align: 'center' },
    }));

    const bodyRows = rows.map((r) =>
      r.map((cell, ci) => {
        const isRowHead = useRowHeader && ci === 0;
        const v = typeof cell === 'object' && cell !== null ? cell : { text: cell };
        if (isRowHead && !v.role) {
          // 行見出しは塗りなし・青の太字・15pt（本文より一段大きい）
          return {
            text: String(v.text ?? ''),
            options: {
              ...base,
              fontSize: T.pt(dense ? tc.rowHeaderSizePxDense : tc.rowHeaderSizePx),
              fill: { color: v.fill || tc.rowHeaderFill || tc.bodyFill },
              color: tc.rowHeaderColor,
              bold: true,
              align: v.align || 'center',
            },
          };
        }
        const role = T.textRole[v.role || 'normal'];
        return {
          text: String(v.text ?? ''),
          options: {
            ...base,
            fill: { color: v.fill || tc.bodyFill },
            color: role.color,
            bold: role.bold,
            // 数値列は右寄せ（design-guidelines.md §7）
            align: v.align || (/^[\d,.\s%▲△+-]+$/.test(String(v.text ?? '')) ? 'right' : 'left'),
          },
        };
      })
    );

    // 列幅: 明示指定（px）があれば使い、なければ均等
    const widths = spec.columnWidths
      ? spec.columnWidths.map((px) => T.inch(px))
      : Array(cols.length).fill(T.inch(b.w / cols.length));

    const rowH = Math.min(
      tc.bodyRowHeight,
      (b.h - tc.headerRowHeight) / Math.max(rows.length, 1)
    );

    slide.addTable([head, ...bodyRows], {
      ...rect(b.x, b.y, b.w, b.h),
      colW: widths,
      rowH: [T.inch(tc.headerRowHeight), ...Array(rows.length).fill(T.inch(rowH))],
      autoPage: false,
    });
    closeBody(slide, spec, ctx);
  },

  // ---- 横型矢羽 ---------------------------------------------------------
  // p.35–38 実測: 矢羽は連結せず独立して並ぶ。高さは段数によらず 60.4px。
  // 説明は「太字・中央揃えのリード」+「グレー枠の白い箱」の 2 段構成（どちらも任意）。
  // 段数が増えるとリードと本文の文字サイズを一段落とす
  'chevrons-h'(slide, spec, ctx) {
    const b = openBody(slide, spec);
    const steps = spec.steps || [];
    const ch = component.chevron;
    const n = steps.length;
    const t = track(b.x, b.w, n, ch.gapH);
    const leadSize = ladder(ch.leadSizePxByStepsH, n, font.sizePx.heading);
    const detailSize = ladder(ch.detailSizePxByStepsH, n, font.sizePx.body);

    steps.forEach((st, i) => {
      const { x, w } = t(i);
      text(slide, st.label || '', {
        x, y: b.y, w, h: ch.heightH,
        shape: 'homePlate',
        fill: ch.fill, color: ch.labelColor, bold: true,
        sizePx: ch.labelSizePx, align: 'center', valign: 'middle',
        lineSpacing: font.lineSpacing.dense, margin: T.pt(4),
      });
    });

    // リードの高さは最長のリードから行数を見積もる
    const leads = steps.map((st) => st.lead || '');
    const longestLead = Math.max(...leads.map((s) => s.length), 0);
    const hasLead = longestLead > 0;
    const colW = t(0).w;
    const leadLines = hasLead
      ? Math.ceil(longestLead / Math.max(6, Math.floor((colW - 8) / leadSize)))
      : 0;
    const leadY = b.y + ch.heightH + 20;
    const leadH = hasLead
      ? Math.min(140, Math.max(40, leadLines * leadSize * font.lineSpacing.dense + 12))
      : 0;
    const boxY = leadY + leadH + (hasLead ? 16 : 0);
    const boxH = b.h - (boxY - b.y);

    steps.forEach((st, i) => {
      const { x, w } = t(i);
      if (st.lead) {
        text(slide, st.lead, {
          x, y: leadY, w, h: leadH,
          sizePx: leadSize, role: 'emphasis',
          align: 'center', valign: 'top', lineSpacing: font.lineSpacing.dense,
        });
      }
      const details = st.details || (st.detail ? [st.detail] : []);
      if (!details.length) return;
      text(slide, details.join('\n'), {
        x, y: boxY, w, h: boxH,
        shape: 'rect', line: { color: ch.detailBox.line.color, width: ch.detailBox.line.pt },
        sizePx: detailSize, role: 'normal', valign: 'top',
        lineSpacing: font.lineSpacing.dense, margin: T.pt(6),
      });
    });
    closeBody(slide, spec, ctx);
  },

  // ---- 縦型矢羽 ---------------------------------------------------------
  // p.30–34 実測: ラベルは下向きの矢羽で幅 236.7px 固定、段の高さは本文帯を
  // 段数で割って埋める。説明欄は塗らず、列の境界にグレーの縦罫を引く。
  // 列見出しは黒の太字 10pt。段数が増えると説明の文字サイズを一段落とす
  'chevrons-v'(slide, spec, ctx) {
    const b = openBody(slide, spec);
    const steps = spec.steps || [];
    const ch = component.chevron;
    const n = steps.length;
    const labelSize = ladder(ch.labelSizePxByStepsV, n, ch.labelSizePx);
    const detailSize = ladder(ch.detailSizePxByStepsV, n, font.sizePx.body);
    const labelW = ch.labelWidthV;
    const detailX = b.x + labelW + 14;
    const detailW = b.w - labelW - 14;

    const detailCols = Math.max(
      1, ...steps.map((s) => (s.details || (s.detail ? [s.detail] : [])).length)
    );
    const dt = track(detailX, detailW, detailCols, component.gap);

    let topOffset = 0;
    if (spec.detailHeadings && spec.detailHeadings.length) {
      spec.detailHeadings.slice(0, detailCols).forEach((h, i) => {
        const { x, w } = dt(i);
        text(slide, h, {
          x, y: b.y, w, h: 22,
          sizePx: font.sizePx.colHeading, role: 'emphasis',
          align: 'center', valign: 'middle', lineSpacing: font.lineSpacing.heading,
        });
      });
      topOffset = 26;
    }

    const avail = b.h - topOffset;
    const rowH = (avail - ch.gapV * (steps.length - 1)) / Math.max(steps.length, 1);

    // 説明欄の列境界に縦罫を引く（全段を貫く 1 本）
    for (let j = 1; j < detailCols; j += 1) {
      const { x } = dt(j);
      rule(slide, x - component.gap / 2, b.y + topOffset, 0.75, avail, ch.detailDivider.color);
    }

    steps.forEach((st, i) => {
      const y = b.y + topOffset + i * (rowH + ch.gapV);
      text(slide, st.label || '', {
        x: b.x, y, w: labelW, h: rowH,
        shape: ch.shapeV, fill: ch.fill, color: ch.labelColor, bold: true,
        sizePx: labelSize, align: 'center', valign: 'middle',
        lineSpacing: font.lineSpacing.dense, margin: T.pt(4),
      });
      const details = st.details || (st.detail ? [st.detail] : []);
      details.forEach((d, j) => {
        const { x, w } = dt(j);
        text(slide, d, {
          x, y, w, h: rowH,
          sizePx: detailSize, role: 'normal', valign: 'top',
          lineSpacing: font.lineSpacing.dense, margin: T.pt(6),
        });
      });
    });
    closeBody(slide, spec, ctx);
  },

  // ---- タイムライン -----------------------------------------------------
  // p.40 実測: 青い水平軸（1.5pt）。日付は全点が軸の上に一列。説明が付く点にだけ
  // 丸マーカーを置き、軸の下へ引き出し線を伸ばして 2 段の千鳥に配置する
  timeline(slide, spec, ctx) {
    const b = openBody(slide, spec);
    const points = spec.points || [];
    const tl = component.timeline;
    const axisY = b.y + b.h * 0.35;
    const axisThickness = tl.axisThicknessPt / 0.75; // pt → px

    rule(slide, b.x + 20, axisY - axisThickness / 2, b.w - 40, axisThickness, tl.axisColor);

    const t = track(b.x + 20, b.w - 40, points.length, 0);
    let detailSeq = 0;
    points.forEach((p, i) => {
      const { x, w } = t(i);
      const cx = x + w / 2;
      text(slide, p.date || '', {
        x: cx - w / 2, y: axisY - 34, w, h: 22,
        sizePx: font.sizePx.colHeading, role: 'normal',
        align: 'center', valign: 'bottom', lineSpacing: font.lineSpacing.heading,
      });
      if (!p.detail) return;

      shape(slide, 'ellipse', {
        x: cx - tl.markerSize / 2, y: axisY - tl.markerSize / 2,
        w: tl.markerSize, h: tl.markerSize, fill: tl.axisColor,
      });
      const leader = detailSeq % 2 === 0 ? tl.leaderShort : tl.leaderLong;
      detailSeq += 1;
      rule(slide, cx - axisThickness / 2, axisY, axisThickness, leader, tl.axisColor);
      text(slide, p.detail, {
        x: cx - 8, y: axisY + leader, w: Math.max(w * 2, 140), h: 40,
        sizePx: font.sizePx.body, role: 'emphasis',
        align: 'left', valign: 'top', lineSpacing: font.lineSpacing.heading,
      });
    });
    closeBody(slide, spec, ctx);
  },

  // ---- タイトル付きボックス ---------------------------------------------
  // p.45–50 実測: 帯は直角・白の標準ウェイト・中央揃えで、本文面（#F1F8FE）と
  // 隙間なく接する。横型は帯を上に、縦型は帯を左のラベル列にする
  'titled-boxes'(slide, spec, ctx) {
    const b = openBody(slide, spec);
    const boxes = spec.boxes || [];
    const tb = component.titledBox;
    const variant = spec.variant || (boxes.length <= 2 ? 'cols-2' : `cols-${Math.min(boxes.length, 4)}`);

    const heading = (x, y, w, h, box) =>
      text(slide, box.heading || '', {
        x, y, w, h,
        shape: 'rect', rectRadius: tb.radius,
        fill: tb.headerFill, color: tb.headerColor, bold: tb.headerBold,
        sizePx: font.sizePx.heading, align: tb.headerAlign, valign: 'middle',
        lineSpacing: font.lineSpacing.dense, margin: T.pt(8),
      });

    const bodyPanel = (x, y, w, h, box) =>
      text(slide, box.body || '', {
        x, y, w, h,
        fill: tb.bodyFill, sizePx: font.sizePx.small, role: 'normal',
        valign: 'top', margin: T.pt(8), lineSpacing: font.lineSpacing.dense,
      });

    /** 帯を上に置く縦積みのボックス */
    const drawStacked = (bx, by, bw, bh, box) => {
      heading(bx, by, bw, tb.headerHeight, box);
      bodyPanel(bx, by + tb.headerHeight + tb.innerGap, bw,
        bh - tb.headerHeight - tb.innerGap, box);
    };

    if (variant.startsWith('cols-')) {
      // 横並びは本文帯いっぱいに伸ばす（p.45–47・50 は 6 枚すべて帯を埋めている）
      const t = track(b.x, b.w, boxes.length, component.gap);
      boxes.forEach((box, i) => {
        const { x, w } = t(i);
        drawStacked(x, b.y, w, b.h, box);
      });
    } else if (variant.startsWith('rows-')) {
      // 縦型は左が青いラベル列、右が本文面
      const gap = component.gap;
      const h = (b.h - gap * (boxes.length - 1)) / boxes.length;
      const labelW = Math.min(tb.labelWidthRows, b.w * 0.3);
      boxes.forEach((box, i) => {
        const y = b.y + i * (h + gap);
        heading(b.x, y, labelW, h, box);
        bodyPanel(b.x + labelW + tb.innerGap, y, b.w - labelW - tb.innerGap, h, box);
      });
    } else if (variant === 'grid-4') {
      const gap = component.gap;
      const w = (b.w - gap) / 2;
      const h = (b.h - gap) / 2;
      boxes.slice(0, 4).forEach((box, i) => {
        drawStacked(b.x + (i % 2) * (w + gap), b.y + Math.floor(i / 2) * (h + gap), w, h, box);
      });
    }
    closeBody(slide, spec, ctx);
  },

  // ---- 概念図（土台 + 要素） --------------------------------------------
  // p.55 実測: 要素は #EFEFEF の円に標準ウェイトの文字、土台は直角の青いバー
  'concept-base'(slide, spec, ctx) {
    const b = openBody(slide, spec);
    const elements = spec.elements || [];
    const cc = component.concept;
    const baseH = cc.foundationHeight;
    const elemH = Math.min(150, b.h - baseH - 40);
    const elemY = b.y + (b.h - baseH - 30 - elemH) / 2;

    const t = track(b.x + 40, b.w - 80, elements.length, component.gap * 2);
    elements.forEach((el, i) => {
      const { x, w } = t(i);
      const label = typeof el === 'string' ? el : el.text;
      const d = Math.min(w, elemH);
      text(slide, label, {
        x: x + (w - d) / 2, y: elemY, w: d, h: d,
        shape: 'ellipse', fill: cc.elementFill,
        sizePx: font.sizePx.body, role: 'normal', bold: cc.elementBold,
        align: 'center', valign: 'middle', margin: T.pt(10),
        lineSpacing: font.lineSpacing.dense,
      });
    });

    text(slide, spec.foundation || '', {
      x: b.x, y: b.y + b.h - baseH, w: b.w, h: baseH,
      shape: 'rect', rectRadius: cc.radius,
      fill: cc.foundationFill, color: color.white, bold: true,
      sizePx: font.sizePx.body, align: 'center', valign: 'middle',
      lineSpacing: font.lineSpacing.dense,
    });
    closeBody(slide, spec, ctx);
  },

  // ---- 最終ページ -------------------------------------------------------
  // 「99_最終ページ_ロゴのみ」実測: 全面グラデーション背景 + 中央の縦積みロゴのみ
  // （x=387.9 y=184.7 184.3×170.5）。message 指定時はロゴを上げて下に添える
  closing(slide, spec, ctx) {
    slide.addImage({
      path: T.assets.gradientBlue,
      x: 0, y: 0, w: T.inch(canvas.width), h: T.inch(canvas.height),
    });

    const lg = frame.closing.logo;
    const logoY = spec.message ? 150 : lg.y;
    slide.addImage({
      path: T.assets.logoStacked,
      ...rect(lg.x, logoY, lg.width, lg.height),
    });

    if (spec.message) {
      text(slide, spec.message, {
        x: 120, y: logoY + lg.height + 24, w: canvas.width - 240, h: 60,
        sizePx: font.sizePx.heading, color: color.white, bold: true,
        align: 'center', valign: 'top', lineSpacing: font.lineSpacing.dense,
      });
    }
  },
};

module.exports = {
  layouts, CONTENT, drawTitle, drawLead, drawFooter, drawNote,
  openBody, closeBody, text, shape, rect, track,
};
