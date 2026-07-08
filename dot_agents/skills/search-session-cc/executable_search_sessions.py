#!/usr/bin/env python3
"""Claude Code のセッション記録 (~/.claude/projects/**/*.jsonl) を全文検索する。

各セッションは JSONL 形式で保存されており、1 行が 1 イベント。type が
user / assistant の行にメッセージ本文が入る。本スクリプトはその本文だけを
抽出してキーワード検索し、ヒットしたセッションと該当発言を整形表示する。
"""
import argparse
import datetime
import glob
import json
import os
import re
import sys

PROJECTS_DIR = os.path.expanduser("~/.claude/projects")


def decode_project_dir(name: str) -> str:
    """エンコード済みディレクトリ名を元のパスへ復元する（表示用の近似）。

    Claude Code は cwd の "/" を "-" に置換して保存する。完全な復元は
    できない（元のパスに "-" が含まれると区別不能）ため参考表示に留める。
    """
    return "/" + name.lstrip("-").replace("-", "/")


def extract_text(entry: dict) -> str:
    """user / assistant イベントからプレーンテキストを取り出す。"""
    msg = entry.get("message", {})
    content = msg.get("content")
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(block.get("text", ""))
        return " ".join(parts)
    return ""


def iter_session_files(project_filter: str | None):
    for path in sorted(
        glob.glob(f"{PROJECTS_DIR}/**/*.jsonl", recursive=True),
        key=os.path.getmtime,
        reverse=True,
    ):
        if project_filter and project_filter not in os.path.dirname(path):
            continue
        yield path


def search(args) -> int:
    if args.regex:
        pattern = re.compile(args.keyword, 0 if args.case_sensitive else re.IGNORECASE)

        def matches(text: str) -> bool:
            return bool(pattern.search(text))
    else:
        needle = args.keyword if args.case_sensitive else args.keyword.lower()

        def matches(text: str) -> bool:
            hay = text if args.case_sensitive else text.lower()
            return needle in hay

    roles = {"user", "assistant"} if args.role == "all" else {args.role}
    shown_sessions = 0
    total_hits = 0

    for path in iter_session_files(args.project):
        hits = []
        try:
            with open(path, encoding="utf-8") as fh:
                for line in fh:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        entry = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    if entry.get("type") not in roles:
                        continue
                    text = extract_text(entry).strip()
                    if text and matches(text):
                        hits.append((entry.get("type"), text))
        except OSError:
            continue

        if not hits:
            continue

        mtime = datetime.datetime.fromtimestamp(os.path.getmtime(path))
        proj = decode_project_dir(os.path.basename(os.path.dirname(path)))
        print(f"\n=== {os.path.basename(path)}  ({len(hits)} 件) ===")
        print(f"    project: {proj}")
        print(f"    updated: {mtime:%Y-%m-%d %H:%M}")
        print(f"    resume : claude --resume {os.path.basename(path)[:-6]}")
        for role, text in hits[: args.context]:
            if args.full:
                snippet = text
            else:
                snippet = text[:200].replace("\n", " ")
                if len(text) > 200:
                    snippet += " …"
            print(f"  [{role}] {snippet}")
        if len(hits) > args.context:
            print(f"  … 他 {len(hits) - args.context} 件")

        total_hits += len(hits)
        shown_sessions += 1
        if args.limit and shown_sessions >= args.limit:
            print(f"\n(上限 {args.limit} セッションで打ち切り。--limit で変更可)")
            break

    if shown_sessions == 0:
        print(f"'{args.keyword}' にヒットするセッションはありませんでした。", file=sys.stderr)
        return 1

    print(f"\n合計: {shown_sessions} セッション / {total_hits} 発言")
    return 0


def main() -> int:
    p = argparse.ArgumentParser(
        description="Claude Code のセッション記録を全文検索する",
    )
    p.add_argument("keyword", help="検索キーワード（--regex 指定時は正規表現）")
    p.add_argument("--project", metavar="SUBSTR",
                   help="プロジェクトディレクトリ名にこの部分文字列を含むものだけ対象")
    p.add_argument("--role", choices=["user", "assistant", "all"], default="all",
                   help="対象の発言者ロール（既定: all）")
    p.add_argument("--regex", action="store_true", help="キーワードを正規表現として扱う")
    p.add_argument("--case-sensitive", action="store_true", help="大文字小文字を区別する")
    p.add_argument("--full", action="store_true", help="発言全文を表示（既定は200字で省略）")
    p.add_argument("--context", type=int, default=4, metavar="N",
                   help="1セッションあたり表示する発言数（既定: 4）")
    p.add_argument("--limit", type=int, default=0, metavar="N",
                   help="表示するセッション数の上限（既定: 無制限）")
    args = p.parse_args()

    if not os.path.isdir(PROJECTS_DIR):
        print(f"セッションディレクトリが見つかりません: {PROJECTS_DIR}", file=sys.stderr)
        return 2
    return search(args)


if __name__ == "__main__":
    sys.exit(main())
