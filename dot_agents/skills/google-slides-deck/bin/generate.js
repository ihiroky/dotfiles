#!/usr/bin/env node
/**
 * generate.js — deck JSON から Google スライドを生成・更新する
 *
 *   node bin/generate.js <deck.json> [options]
 *
 * 流れ:
 *   1. 検査（lib/validate.js） — 密度バジェット・構造の事前チェック
 *   2. 描画（lib/render.js）   — PPTX を組み立てる
 *   3. 発行                    — gws drive files create/update で
 *                                Google スライドへ変換アップロード
 *   4. 検証（任意）            — PDF をエクスポートして目視確認に回す
 *
 * オプション:
 *   --out <path>      ローカル PPTX の出力先（既定: <deck.json と同名>.pptx）
 *   --no-upload       アップロードせずローカル PPTX まで
 *   --file-id <id>    既存の Google スライドを in-place 更新（URL を保つ）
 *   --folder-id <id>  新規作成先の Drive フォルダ
 *   --name <title>    Drive 上のファイル名（既定: deck.title）
 *   --pdf <path>      アップロード後に PDF をエクスポートする
 *   --force           warning があっても続行する（error では止まる）
 *   --json            結果を JSON で標準出力に出す
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const { renderDeck } = require('../lib/render');
const { validateDeck, formatFindings } = require('../lib/validate');

// ---------------------------------------------------------------------------
// 引数
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const o = { deck: null, out: null, upload: true, fileId: null, folderId: null,
              name: null, pdf: null, force: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--out': o.out = argv[++i]; break;
      case '--no-upload': o.upload = false; break;
      case '--file-id': o.fileId = argv[++i]; break;
      case '--folder-id': o.folderId = argv[++i]; break;
      case '--name': o.name = argv[++i]; break;
      case '--pdf': o.pdf = argv[++i]; break;
      case '--force': o.force = true; break;
      case '--json': o.json = true; break;
      case '-h': case '--help': o.help = true; break;
      default:
        if (a.startsWith('-')) throw new Error(`不明なオプション: ${a}`);
        o.deck = a;
    }
  }
  return o;
}

const USAGE = `使い方: node bin/generate.js <deck.json> [options]

  --out <path>      ローカル PPTX の出力先
  --no-upload       アップロードせずローカル PPTX まで
  --file-id <id>    既存の Google スライドを in-place 更新（URL を保つ）
  --folder-id <id>  新規作成先の Drive フォルダ
  --name <title>    Drive 上のファイル名
  --pdf <path>      アップロード後に PDF をエクスポート
  --force           warning を無視して続行
  --json            結果を JSON で出力`;

// ---------------------------------------------------------------------------
// gws 呼び出し
// ---------------------------------------------------------------------------

/**
 * gws を実行して JSON を返す。
 *
 * 注意 1: gws は "Using keyring backend: ..." を stdout に混ぜることがあるので、
 *         最初の '{' より前を落としてからパースする。
 * 注意 2: gws の --upload / -o はカレントディレクトリの外を指すパスを拒否する。
 *         したがってファイルを渡すときは、そのファイルのあるディレクトリを cwd に
 *         してベース名だけを渡す（呼び出し側の責務）。
 */
function gws(args, cwd) {
  let out;
  try {
    out = execFileSync('gws', args, {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      ...(cwd ? { cwd } : {}),
    });
  } catch (e) {
    const detail = [e.stdout, e.stderr].filter(Boolean).join('\n').trim();
    throw new Error(`gws ${args.slice(0, 3).join(' ')} が失敗しました\n${detail || e.message}`);
  }
  const start = out.indexOf('{');
  if (start < 0) throw new Error(`gws の応答が JSON ではありません:\n${out.slice(0, 400)}`);
  return JSON.parse(out.slice(start));
}

const SLIDES_MIME = 'application/vnd.google-apps.presentation';

/** 新規作成。PPTX を Google スライドへ変換してアップロードする */
function createSlides(pptxPath, name, folderId) {
  const meta = { name, mimeType: SLIDES_MIME };
  if (folderId) meta.parents = [folderId];
  return gws([
    'drive', 'files', 'create',
    '--upload', path.basename(pptxPath),
    '--json', JSON.stringify(meta),
    '--params', JSON.stringify({
      supportsAllDrives: true,
      fields: 'id,name,mimeType,webViewLink',
    }),
  ], path.dirname(pptxPath));
}

/** 既存の Google スライドを in-place 更新する。fileId と URL は変わらない */
function updateSlides(pptxPath, fileId, name) {
  const params = {
    fileId,
    supportsAllDrives: true,
    fields: 'id,name,mimeType,modifiedTime,webViewLink',
  };
  const args = ['drive', 'files', 'update', '--upload', path.basename(pptxPath),
                '--params', JSON.stringify(params)];
  if (name) args.push('--json', JSON.stringify({ name }));
  return gws(args, path.dirname(pptxPath));
}

/** PDF をエクスポートする（目視検査用） */
function exportPdf(fileId, outPath) {
  return gws([
    'drive', 'files', 'export',
    '--params', JSON.stringify({ fileId, mimeType: 'application/pdf' }),
    '-o', path.basename(outPath),
  ], path.dirname(outPath));
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help || !opts.deck) {
    console.log(USAGE);
    process.exit(opts.deck ? 0 : 1);
  }

  const deckPath = path.resolve(opts.deck);
  if (!fs.existsSync(deckPath)) throw new Error(`deck が見つかりません: ${deckPath}`);
  const deck = JSON.parse(fs.readFileSync(deckPath, 'utf8'));

  // --- 1. 検査 -----------------------------------------------------------
  const findings = validateDeck(deck);
  const errors = findings.filter((f) => f.severity === 'error');
  const warnings = findings.filter((f) => f.severity === 'warning');

  if (findings.length) console.error(formatFindings(findings) + '\n');

  if (errors.length) {
    console.error('error があるため中止しました。deck JSON を直してください。');
    process.exit(2);
  }
  if (warnings.length && !opts.force) {
    console.error(
      'warning があります。内容を削るのではなく、次の順で対処してください:\n' +
      '  1. レイアウトのバリアントを変える\n' +
      '  2. 内容過多として依頼者へ報告する\n' +
      '  3. ページ分割を提案する\n' +
      'この密度で意図どおりなら --force を付けて再実行してください。'
    );
    process.exit(3);
  }

  // --- 2. 描画 -----------------------------------------------------------
  const outPath = path.resolve(
    opts.out || deckPath.replace(/\.json$/, '') + '.pptx'
  );
  const rendered = await renderDeck(deck, outPath);
  console.error(`PPTX を書き出しました: ${rendered.path}（${rendered.slides} ページ）`);

  const result = { pptx: rendered.path, slides: rendered.slides, warnings: warnings.length };

  // --- 3. 発行 -----------------------------------------------------------
  if (opts.upload) {
    const driveCfg = deck.drive || {};
    const fileId = opts.fileId || driveCfg.fileId || null;
    const name = opts.name || driveCfg.name || deck.title || path.basename(outPath, '.pptx');
    const folderId = opts.folderId || driveCfg.folderId || null;

    const res = fileId
      ? updateSlides(rendered.path, fileId, opts.name || driveCfg.name || null)
      : createSlides(rendered.path, name, folderId);

    if (res.mimeType !== SLIDES_MIME) {
      throw new Error(
        `Google スライドへ変換されませんでした（mimeType: ${res.mimeType}）。` +
        'アップロード時の mimeType 指定を確認してください。'
      );
    }

    result.fileId = res.id;
    result.url = res.webViewLink || `https://docs.google.com/presentation/d/${res.id}/edit`;
    result.mode = fileId ? 'updated' : 'created';
    console.error(`${fileId ? '更新' : '作成'}: ${result.url}`);

    if (!fileId) {
      console.error(
        `次回この deck を更新するときは deck.json に ` +
        `"drive": { "fileId": "${res.id}" } を書いておくと URL が変わりません。`
      );
    }

    // --- 4. 検証 ---------------------------------------------------------
    if (opts.pdf) {
      const pdfPath = path.resolve(opts.pdf);
      exportPdf(res.id, pdfPath);
      result.pdf = pdfPath;
      console.error(`PDF を書き出しました: ${pdfPath}（Read ツールで目視検査する）`);
    }
  }

  if (opts.json) process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

main().catch((e) => {
  console.error(`エラー: ${e.message}`);
  process.exit(1);
});
