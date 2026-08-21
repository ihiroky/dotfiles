/**
 * validate.js — deck JSON のレンダリング前検査
 *
 * PptxGenJS にレイアウトエンジンはないので、生成後に実測でのはみ出し判定はできない。
 * 代わりに references/layout-catalog.md の「Density budget」と各バリアント規則を
 * deck JSON 上の件数・文字数として検査する。
 *
 * 方針（design-guidelines.md §2 / SKILL.md の密度判定に対応）:
 *   - 文字を縮めて詰め込むことは許さない。8px 未満は禁止、autofit も使わない。
 *   - 超過時の扱いは「レイアウト変更 → 内容過多の報告 → 分割提案」の順。
 *   - このファイルは内容を削らない。報告するだけである。
 */

'use strict';

/** 全角を 1、半角を 0.5 として数える。日本語の密度バジェットは全角基準 */
function visualLength(text) {
  if (!text) return 0;
  let n = 0;
  for (const ch of String(text)) {
    // ASCII と半角カナは 0.5 幅として数える
    n += /[\x20-\x7E｡-ﾟ]/.test(ch) ? 0.5 : 1;
  }
  return n;
}

/**
 * レイアウトごとの許容量。
 * count: 反復要素の件数レンジ [min, max]
 * chars: 1 要素あたりの快適上限（全角換算）
 */
const BUDGET = {
  cover: { chars: { title: 40, subtitle: 60 } },
  'toc-1col': { count: [1, 7], chars: { item: 40 } },
  section: { chars: { title: 30 } },
  statement: { chars: { claim: 60, support: 40 }, count: [0, 2], countKey: 'supports' },
  // グリフは ● ○ ■ を 3 階層で循環するが、正本の見本は 4 階層まで使っている
  bullets: { count: [1, 7], chars: { item: 60 }, maxLevel: 4 },
  // 正本の密な表の見本は 11 列（見出し 8pt・本文 10pt）
  table: { cols: [2, 11], rows: [1, 12], chars: { cell: 24 } },
  // detail / lead の上限は段数で変わるので horizontalChevronCharBudget() 側で決める
  'chevrons-h': { count: [3, 5], chars: { label: 12 } },
  'chevrons-v': { count: [3, 7], chars: { label: 14, detail: 80 } },
  // 正本の見本は目盛 14 点・説明 6 件
  timeline: { count: [3, 14], chars: { date: 10, detail: 30 } },
  'titled-boxes': { count: [2, 4], chars: { heading: 20, body: 100 } },
  'concept-base': { count: [3, 5], chars: { element: 16, foundation: 40 } },
  closing: { chars: { message: 40 } },
};

/** そのレイアウトで反復される配列を取り出す */
function itemsOf(slide) {
  return (
    slide.items || slide.steps || slide.points || slide.boxes ||
    slide.elements || slide.supports || slide.rows || []
  );
}

/**
 * 縦型矢羽の密度規則。正本（p.30–34）は 3〜7 段すべてで 1 列 60 字を保ち、
 * 段数が増えるぶんは文字サイズを一段ずつ落として収めている。
 * したがって上限は段数に依らず「1 列あたり 60 字」で、合計ではなく列単位で見る。
 */
function verticalChevronCharBudget() {
  return 60;
}

/**
 * 横型矢羽の密度規則。正本の見本は 3 段で 108 字、4〜5 段で 84 字（p.35–37）。
 */
function horizontalChevronCharBudget(steps) {
  if (steps <= 3) return 108;
  return 84;
}

/** 横型矢羽のリード（矢羽と説明箱の間の太字）。正本は 3 段 48 字、4〜5 段 24 字 */
function horizontalChevronLeadBudget(steps) {
  if (steps <= 3) return 48;
  return 24;
}

/**
 * deck を検査して findings を返す。
 * severity: 'error'   — レンダリングを止める（レイアウト不整合・必須欠落）
 *           'warning' — 収まらない可能性が高い（内容過多）。報告して判断を仰ぐ
 */
function validateDeck(deck) {
  const findings = [];
  const add = (severity, slideIndex, code, message, hint) =>
    findings.push({ severity, slide: slideIndex, code, message, hint });

  if (!deck || typeof deck !== 'object') {
    add('error', -1, 'DECK_SHAPE', 'deck は JSON オブジェクトである必要がある');
    return findings;
  }
  if (!Array.isArray(deck.slides) || deck.slides.length === 0) {
    add('error', -1, 'DECK_EMPTY', 'deck.slides が空である');
    return findings;
  }

  deck.slides.forEach((slide, i) => {
    const n = i + 1;
    const layout = slide.layout;

    if (!layout) {
      add('error', n, 'LAYOUT_MISSING', `slide ${n}: layout が指定されていない`);
      return;
    }
    const budget = BUDGET[layout];
    if (!budget) {
      add(
        'error', n, 'LAYOUT_UNKNOWN',
        `slide ${n}: 未対応の layout "${layout}"`,
        `対応レイアウト: ${Object.keys(BUDGET).join(', ')}`
      );
      return;
    }

    // --- 反復要素の件数 ---
    const items = itemsOf(slide);
    if (budget.count) {
      const [min, max] = budget.count;
      const len = items.length;
      if (len < min) {
        add(
          'error', n, 'COUNT_UNDER',
          `slide ${n} (${layout}): 要素が ${len} 件で下限 ${min} 件を満たさない`,
          `別のレイアウトを選ぶ（例: 少数なら statement / titled-boxes）`
        );
      } else if (len > max) {
        add(
          'warning', n, 'COUNT_OVER',
          `slide ${n} (${layout}): 要素が ${len} 件で上限 ${max} 件を超える`,
          `レイアウト変更かページ分割を検討する`
        );
      }
    }

    // --- 表の形 ---
    if (layout === 'table') {
      const cols = (slide.columns || []).length;
      const rows = (slide.rows || []).length;
      const [cmin, cmax] = budget.cols;
      if (cols < cmin || cols > cmax) {
        add(
          cols > cmax ? 'warning' : 'error', n, 'TABLE_COLS',
          `slide ${n} (table): 列数 ${cols} が推奨 ${cmin}–${cmax} 列の外`,
          cols > cmax ? '列名の短縮許可を求めるか、ページ分割を提案する' : null
        );
      }
      if (rows > budget.rows[1]) {
        add(
          'warning', n, 'TABLE_ROWS',
          `slide ${n} (table): 行数 ${rows} が推奨上限 ${budget.rows[1]} を超える`,
          'ページ分割を提案する'
        );
      }
      (slide.rows || []).forEach((row, ri) => {
        if (!Array.isArray(row)) {
          add('error', n, 'TABLE_ROW_SHAPE', `slide ${n} (table): rows[${ri}] が配列でない`);
          return;
        }
        if (row.length !== cols) {
          add(
            'error', n, 'TABLE_ROW_WIDTH',
            `slide ${n} (table): rows[${ri}] の列数 ${row.length} が columns の ${cols} と一致しない`
          );
        }
        row.forEach((cell, ci) => {
          if (visualLength(cell) > budget.chars.cell) {
            add(
              'warning', n, 'TABLE_CELL_LONG',
              `slide ${n} (table): rows[${ri}][${ci}] が ${Math.round(visualLength(cell))} 字で、` +
              `セル快適上限 ${budget.chars.cell} 字を超える`,
              'セル内が長文なら table 以外（titled-boxes / chevrons-v）を選ぶ'
            );
          }
        });
      });
    }

    // --- 箇条書きの階層 ---
    if (layout === 'bullets') {
      items.forEach((it, k) => {
        const level = (typeof it === 'object' && it.level) || 1;
        if (level > budget.maxLevel) {
          add(
            'warning', n, 'BULLET_DEPTH',
            `slide ${n} (bullets): items[${k}] の階層 ${level} が快適上限 ${budget.maxLevel} を超える`,
            `グリフは ${budget.maxLevel} 階層目以降も ● ○ ■ の循環で続くが、` +
            'この深さで読めない構造は図解へ変換する'
          );
        }
      });
      const level1 = items.filter((it) => ((typeof it === 'object' && it.level) || 1) === 1).length;
      if (level1 > budget.count[1]) {
        add(
          'warning', n, 'BULLET_L1_OVER',
          `slide ${n} (bullets): 第1階層が ${level1} 項目で上限 ${budget.count[1]} を超える`,
          'グループ化して titled-boxes へ変換するか、ページ分割する'
        );
      }
    }

    // --- 矢羽の段数連動バジェット ---
    if (layout === 'chevrons-h' || layout === 'chevrons-v') {
      const steps = items.length;
      const isV = layout === 'chevrons-v';
      // 縦型は 1 列ずつ、横型は説明箱の合計で見る
      const perUnit = isV
        ? verticalChevronCharBudget()
        : horizontalChevronCharBudget(steps);
      const leadMax = horizontalChevronLeadBudget(steps);
      items.forEach((st, k) => {
        const details = st.details || (st.detail ? [st.detail] : []);
        const measured = isV
          ? Math.max(0, ...details.map((d) => visualLength(d)))
          : details.reduce((s, d) => s + visualLength(d), 0);
        if (measured > perUnit) {
          add(
            'warning', n, 'CHEVRON_DETAIL_LONG',
            `slide ${n} (${layout}): steps[${k}] の説明が ${Math.round(measured)} 字で、` +
            `上限 ${perUnit} 字（${isV ? '1 列あたり' : `${steps} 段構成の 1 段あたり`}）を超える`,
            isV
              ? '列を増やさず 1 列 60 字に収める。収まらないなら段を分ける'
              : '説明が長いなら chevrons-v へ変える'
          );
        }
        if (layout === 'chevrons-h' && st.lead && visualLength(st.lead) > leadMax) {
          add(
            'warning', n, 'CHEVRON_LEAD_LONG',
            `slide ${n} (chevrons-h): steps[${k}] の lead が ${Math.round(visualLength(st.lead))} 字で、` +
            `${steps} 段構成の上限 ${leadMax} 字を超える`,
            'lead は 1〜2 行の要約に絞り、詳細は detail へ移す'
          );
        }
        if (visualLength(st.label) > budget.chars.label) {
          add(
            'warning', n, 'CHEVRON_LABEL_LONG',
            `slide ${n} (${layout}): steps[${k}] のラベルが ${Math.round(visualLength(st.label))} 字で、` +
            `上限 ${budget.chars.label} 字を超える`,
            '矢羽ラベルは短く保つ'
          );
        }
      });
      if (layout === 'chevrons-v') {
        const cols = new Set(items.map((st) => (st.details || [st.detail]).length));
        if (cols.size > 1) {
          add(
            'error', n, 'CHEVRON_V_RAGGED',
            `slide ${n} (chevrons-v): 段ごとの説明列数が揃っていない（${[...cols].join(', ')}）`,
            '全段で details の要素数を揃える'
          );
        }
      }
    }

    // --- statement / その他の文字数 ---
    if (layout === 'statement') {
      if (visualLength(slide.claim) > budget.chars.claim) {
        add(
          'warning', n, 'STATEMENT_LONG',
          `slide ${n} (statement): claim が ${Math.round(visualLength(slide.claim))} 字で、` +
          `上限 ${budget.chars.claim} 字を超える`,
          '主張を 1 文に絞るか、根拠を supports へ移す'
        );
      }
      if (!slide.claim) {
        add('error', n, 'STATEMENT_EMPTY', `slide ${n} (statement): claim が空である`);
      }
    }

    if (layout === 'titled-boxes') {
      const isRows = (slide.variant || '').startsWith('rows-');
      items.forEach((b, k) => {
        // 縦型（rows-*）の見出しは幅 226px の左ラベル列に入るので短くする
        const headingMax = isRows ? Math.floor(budget.chars.heading * 0.7) : budget.chars.heading;
        if (visualLength(b.heading) > headingMax) {
          add(
            'warning', n, 'BOX_HEADING_LONG',
            `slide ${n} (titled-boxes): boxes[${k}] の見出しが ${Math.round(visualLength(b.heading))} 字で、` +
            `上限 ${headingMax} 字を超える`,
            isRows ? '縦型の見出しは左のラベル列に入るため短くする' : '見出しは短い語に絞る'
          );
        }
        if (visualLength(b.body) > budget.chars.body) {
          add(
            'warning', n, 'BOX_BODY_LONG',
            `slide ${n} (titled-boxes): boxes[${k}] の本文が ${Math.round(visualLength(b.body))} 字で、` +
            `上限 ${budget.chars.body} 字を超える`,
            '横型から縦型（rows-2 / rows-3）へ変えると本文を長く取れる'
          );
        }
      });
    }

    if (layout === 'timeline') {
      const withDetail = items.filter((p) => p.detail).length;
      if (withDetail > 6) {
        add(
          'warning', n, 'TIMELINE_DETAIL_OVER',
          `slide ${n} (timeline): 説明付きの点が ${withDetail} 件で上限 6 件を超える`,
          '説明はラベルの一部に寄せるか、点を減らす'
        );
      }
    }

    if (layout === 'concept-base' && !slide.foundation) {
      add(
        'error', n, 'CONCEPT_NO_BASE',
        `slide ${n} (concept-base): foundation（土台）が空である`,
        '土台がないなら titled-boxes を選ぶ'
      );
    }

    // --- タイトル必須のレイアウト ---
    const needsTitle = ['toc-1col', 'bullets', 'table', 'chevrons-h', 'chevrons-v',
                        'timeline', 'titled-boxes', 'concept-base', 'statement'];
    if (needsTitle.includes(layout) && !slide.title) {
      add('error', n, 'TITLE_MISSING', `slide ${n} (${layout}): title が空である`);
    }

    // --- リード文（全レイアウト共通の任意項目）---
    // 「06_空白ページ（見出し）」実測の 1 行（高さ 22.6px・12pt）に収まる長さに限る
    if (slide.lead) {
      const FRAME_ONLY = ['cover', 'toc-1col', 'section', 'closing'];
      if (FRAME_ONLY.includes(layout)) {
        add(
          'error', n, 'LEAD_UNSUPPORTED',
          `slide ${n} (${layout}): このレイアウトは lead を持たない`,
          'lead は本文レイアウト専用（表紙・目次・中表紙・最終ページには置けない）'
        );
      } else if (visualLength(slide.lead) > 55) {
        add(
          'warning', n, 'LEAD_LONG',
          `slide ${n} (${layout}): lead が ${Math.round(visualLength(slide.lead))} 字で、` +
          '1 行に収まる上限 55 字を超える',
          'リード文は 1 行に収める。長い説明は本文か note へ移す'
        );
      }
    }
  });

  return findings;
}

/** findings を人間が読める形に整形する */
function formatFindings(findings) {
  if (findings.length === 0) return '検査 OK — 密度・構造の違反なし';
  const errors = findings.filter((f) => f.severity === 'error');
  const warnings = findings.filter((f) => f.severity === 'warning');
  const lines = [`検査結果: error ${errors.length} 件 / warning ${warnings.length} 件`, ''];
  for (const f of [...errors, ...warnings]) {
    lines.push(`[${f.severity.toUpperCase()}] ${f.code} — ${f.message}`);
    if (f.hint) lines.push(`         → ${f.hint}`);
  }
  return lines.join('\n');
}

module.exports = { validateDeck, formatFindings, visualLength, BUDGET };
