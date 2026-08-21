#!/usr/bin/env python3
"""Read Slack: fetch a message/thread by URL, search across channels, or dump channel history.

Token is obtained from Bitwarden via rbw (must be pre-unlocked).

Usage:
    slack_fetch.py <slack-url>                  # message + its thread
    slack_fetch.py search <query> [options]     # cross-channel search
    slack_fetch.py history <channel|url> [opts] # channel history
"""
import argparse
import json
import re
import subprocess
import sys
import urllib.request
import urllib.parse
from datetime import datetime, timezone


def get_token():
    """Get SLACK_TOKEN from Bitwarden item 'tt-slack-token' via rbw.

    rbw must already be unlocked. If locked or item not found, exits with error.
    """
    result = subprocess.run(
        ["rbw", "get", "tt-slack-token"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        err = result.stderr.strip() or "unknown error"
        print(f"Error: failed to get token from rbw: {err}", file=sys.stderr)
        print("Hint: run `rbw unlock` before using this skill", file=sys.stderr)
        sys.exit(1)
    token = result.stdout.strip()
    if not token:
        print("Error: rbw returned an empty value for 'tt-slack-token'", file=sys.stderr)
        sys.exit(1)
    return token


def slack_api(method, token, **params):
    url = f"https://slack.com/api/{method}"
    data = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(url, data=data, headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/x-www-form-urlencoded",
    })
    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read())
    if not result.get("ok"):
        raise RuntimeError(f"Slack API error: {result.get('error')}")
    return result


def parse_slack_url(url):
    """Parse a Slack archive URL.

    Returns (channel_id, ts_or_None, thread_ts_or_None).

    Accepted forms:
        .../archives/C0123456                            → (C0123456, None, None)
        .../archives/C0123456/p1775729801660339          → (C0123456, "1775729801.660339", None)
        .../archives/C0123456/p1775729801660339?thread_ts=1775700000.111111
                                                         → (..., ts, "1775700000.111111")

    The `thread_ts` query parameter matters: without it, a URL pointing at a
    threaded *reply* cannot be expanded into its thread (see fetch_thread).
    """
    m = re.match(r"https://[^/]+\.slack\.com/archives/([A-Z0-9]+)(?:/p(\d+))?", url)
    if not m:
        raise ValueError(f"Invalid Slack URL: {url}")
    channel_id = m.group(1)

    ts = None
    if m.group(2):
        ts_raw = m.group(2)
        # e.g. p1775729801660339 → "1775729801.660339"
        ts = ts_raw[:-6] + "." + ts_raw[-6:]

    qs = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
    thread_ts = (qs.get("thread_ts") or [None])[0]
    # Some permalinks carry &cid=; the path channel wins when both are present.
    channel_id = channel_id or (qs.get("cid") or [None])[0]
    return channel_id, ts, thread_ts


def thread_ts_from_permalink(permalink, fallback_ts):
    """Extract the thread parent ts from a search-result permalink.

    search.messages returns permalinks of the form
        .../archives/C.../p<ts>?thread_ts=<parent_ts>
    so a matched reply can be expanded without extra API calls. Falls back to
    the message's own ts when the parameter is absent.
    """
    if not permalink:
        return fallback_ts
    qs = urllib.parse.parse_qs(urllib.parse.urlparse(permalink).query)
    return (qs.get("thread_ts") or [fallback_ts])[0] or fallback_ts


_user_cache = {}


def get_user_info(token, user_id):
    if user_id in _user_cache:
        return _user_cache[user_id]
    try:
        result = slack_api("users.info", token, user=user_id)
        user = result["user"]
        profile = user.get("profile", {})
        info = {
            "username": user.get("name", user_id),
            "display_name": profile.get("display_name") or user.get("real_name", user_id),
            "real_name": profile.get("real_name_normalized") or user.get("real_name", ""),
            "email": profile.get("email", ""),
        }
    except Exception:
        info = {"username": user_id, "display_name": user_id, "real_name": "", "email": ""}
    _user_cache[user_id] = info
    return info


def format_ts(ts):
    try:
        dt = datetime.fromtimestamp(float(ts), tz=timezone.utc).astimezone()
        return dt.strftime("%Y-%m-%d %H:%M:%S %Z")
    except Exception:
        return ts


def resolve_text(text, token):
    def resolve_mention(m):
        info = get_user_info(token, m.group(1))
        return f"@{info['display_name']}"

    text = re.sub(r"<@([A-Z0-9]+)>", resolve_mention, text)
    text = re.sub(r"<(https?://[^|>]+)\|([^>]+)>", r"\2 (\1)", text)
    text = re.sub(r"<(https?://[^>]+)>", r"\1", text)
    return text


def truncate_text(text, limit):
    """Cap message length. limit=0 means no cap."""
    if not limit or len(text) <= limit:
        return text
    return text[:limit] + f"… [+{len(text) - limit} chars]"


def format_message(msg, token, truncate=0, verbose_author=True):
    if msg.get("user"):
        info = get_user_info(token, msg["user"])
        if verbose_author:
            author = (
                f"{info['display_name']} "
                f"(display_name: {info['display_name']}; "
                f"real_name: {info['real_name']}; "
                f"username: {info['username']}; "
                f"email: {info['email']})"
            )
        else:
            author = info["display_name"]
    else:
        author = msg.get("username", msg.get("bot_id", "unknown"))

    ts_fmt = format_ts(msg.get("ts", ""))
    text = truncate_text(resolve_text(msg.get("text", ""), token), truncate)
    return f"{author} [{ts_fmt}]: {text}"


def fetch_thread(token, channel, thread_ts, limit=200):
    """Return all messages of the thread rooted at thread_ts.

    IMPORTANT: `thread_ts` must be the thread's *parent* ts. Passing a reply's
    ts makes conversations.replies return ok=True with only that single
    message — a silent truncation, not an error. Get the parent from a
    permalink (thread_ts_from_permalink) or from a history message's
    `thread_ts` field. conversations.history cannot be used to look this up,
    because threaded replies are not part of the history stream.
    """
    try:
        result = slack_api(
            "conversations.replies", token,
            channel=channel, ts=thread_ts, limit=limit,
        )
        return result.get("messages", [])
    except RuntimeError as exc:
        print(f"  (thread fetch failed: {exc})", file=sys.stderr)
        return []


def print_thread(messages, token, truncate, indent="  "):
    for msg in messages:
        line = format_message(msg, token, truncate=truncate, verbose_author=False)
        print(indent + line.replace("\n", "\n" + indent))


# --------------------------------------------------------------------------
# mode: url (default, backward compatible)
# --------------------------------------------------------------------------

def cmd_url(url, token, truncate=0):
    channel_id, ts, thread_ts = parse_slack_url(url)

    if ts is None:
        print(
            f"Note: {url} has no message id — falling back to channel history.\n"
            f"      For more control use: slack_fetch.py history {channel_id}",
            file=sys.stderr,
        )
        # Cap messages here regardless of the URL-mode default: a 30-message
        # channel dump at full length is the context overflow this skill exists
        # to avoid. Single messages and threads keep the uncapped default.
        return cmd_history(channel_id, token, limit=30, truncate=truncate or 600)

    root_ts = thread_ts or ts
    target = None
    thread = []

    if thread_ts and thread_ts != ts:
        # URL points at a reply: fetch the thread and locate the message in it.
        thread = fetch_thread(token, channel_id, root_ts)
        target = next((m for m in thread if m.get("ts") == ts), None)
    else:
        result = slack_api(
            "conversations.history", token,
            channel=channel_id, latest=ts, oldest=ts, inclusive="true", limit=1,
        )
        # Only accept an exact ts match. For a threaded reply this lookup returns
        # nothing (replies are not in the history stream); guard anyway so a
        # neighbouring top-level message can never be printed as the target.
        messages = [m for m in result.get("messages", []) if m.get("ts") == ts]
        target = messages[0] if messages else None
        if target is None:
            # Not a top-level message; it may be a reply whose parent we do not know.
            thread = fetch_thread(token, channel_id, ts)
            target = next((m for m in thread if m.get("ts") == ts), None)

    if target is None:
        print("Message not found", file=sys.stderr)
        sys.exit(1)

    print(f"channel: {channel_id}")
    print(f"url: {url}")
    print(f"ts: {ts}")
    if thread_ts and thread_ts != ts:
        print(f"thread_ts: {thread_ts} (this message is a reply)")
    print()
    print("## Root message")
    print(format_message(target, token, truncate=truncate))

    reply_count = target.get("reply_count", 0)
    if not thread and reply_count > 0:
        thread = fetch_thread(token, channel_id, target.get("thread_ts") or ts)

    others = [m for m in thread if m.get("ts") != target.get("ts")]
    if others:
        print(f"\n## Thread ({len(others)} other messages)")
        for msg in others:
            print()
            print(format_message(msg, token, truncate=truncate))


# --------------------------------------------------------------------------
# mode: search
# --------------------------------------------------------------------------

def build_query(query, in_channel=None, from_user=None, after=None, before=None):
    parts = [query] if query else []
    if in_channel:
        parts.append(f"in:{in_channel if in_channel.startswith(('#', '@')) else '#' + in_channel}")
    if from_user:
        parts.append(f"from:{from_user if from_user.startswith('@') else '@' + from_user}")
    if after:
        parts.append(f"after:{after}")
    if before:
        parts.append(f"before:{before}")
    return " ".join(parts)


def cmd_search(args, token):
    query = build_query(args.query, args.in_channel, args.from_user, args.after, args.before)
    result = slack_api(
        "search.messages", token,
        query=query, count=args.count, sort=args.sort, sort_dir="desc",
    )
    msgs = result.get("messages", {})
    matches = msgs.get("matches", [])

    if args.json:
        print(json.dumps({"query": query, "total": msgs.get("total"), "matches": matches},
                         ensure_ascii=False, indent=2))
        return

    print(f'# search: "{query}"')
    print(f"# sort={args.sort}  total={msgs.get('total', '?')}  shown={len(matches)}")
    print("# scope: every channel/MPDM/DM you belong to, including private ones."
          " Treat results as more sensitive than the channel you started from.")
    if not matches:
        print("\n(no matches)")
        return

    expanded = 0
    seen_threads = {}
    for i, m in enumerate(matches, 1):
        ch = m.get("channel", {}) or {}
        ch_name = ch.get("name") or ch.get("id", "?")
        ts = m.get("ts", "")
        parent_ts = thread_ts_from_permalink(m.get("permalink"), ts)
        is_reply = parent_ts != ts

        print()
        print(f"## [{i}] #{ch_name}  {format_ts(ts)}" + ("  (thread reply)" if is_reply else ""))
        print(f"url: {m.get('permalink', '')}")
        author = m.get("username") or m.get("user", "?")
        print(f"{author}: {truncate_text(resolve_text(m.get('text', ''), token), args.truncate)}")

        if args.expand:
            key = (ch.get("id"), parent_ts)
            if key in seen_threads:
                # Several hits often land in one thread; print it once.
                print(f"\n### thread: already shown at [{seen_threads[key]}]")
            elif expanded < args.expand_limit:
                thread = fetch_thread(token, ch.get("id"), parent_ts)
                if len(thread) > 1:
                    seen_threads[key] = i
                    print(f"\n### thread ({len(thread)} messages)")
                    print_thread(thread, token, args.truncate)
                    expanded += 1

    if args.expand and len(matches) > args.expand_limit:
        print(f"\n# note: expanded {expanded} of {len(matches)} hits"
              f" (--expand-limit {args.expand_limit}). Raise it or narrow the query.")


# --------------------------------------------------------------------------
# mode: history
# --------------------------------------------------------------------------

def cmd_history(channel, token, limit=50, oldest=None, latest=None, grep=None,
                expand=False, expand_limit=5, truncate=0, as_json=False):
    if channel.startswith("http"):
        channel, _, _ = parse_slack_url(channel)

    params = {"channel": channel, "limit": limit}
    if oldest:
        params["oldest"] = oldest
    if latest:
        params["latest"] = latest
    result = slack_api("conversations.history", token, **params)
    messages = list(reversed(result.get("messages", [])))  # oldest first

    pattern = re.compile(grep) if grep else None
    if pattern:
        messages = [m for m in messages if pattern.search(m.get("text", ""))]

    if as_json:
        print(json.dumps({"channel": channel, "messages": messages},
                         ensure_ascii=False, indent=2))
        return

    print(f"# history: {channel}")
    print(f"# limit={limit} returned={len(messages)} (oldest first)"
          + (f"  grep={grep!r}" if grep else ""))
    if not messages:
        print("\n(no messages)")
        return

    expanded = 0
    for m in messages:
        reply_count = m.get("reply_count", 0)
        print()
        header = f"## {format_ts(m.get('ts', ''))}"
        if reply_count:
            header += f"  (replies: {reply_count})"
        print(header)
        print(format_message(m, token, truncate=truncate, verbose_author=False))

        if expand and reply_count and expanded < expand_limit:
            thread = fetch_thread(token, channel, m.get("thread_ts") or m.get("ts"))
            if len(thread) > 1:
                print(f"\n### thread ({len(thread)} messages)")
                print_thread(thread, token, truncate)
                expanded += 1


# --------------------------------------------------------------------------

def build_parser():
    p = argparse.ArgumentParser(
        prog="slack_fetch.py",
        description="Read Slack: message/thread by URL, cross-channel search, channel history.",
        epilog='A bare URL keeps the original behaviour: slack_fetch.py "<slack-url>"',
    )
    # Shared options live on the subparsers so they can follow the subcommand.
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--truncate", type=int, default=600,
                        help="cap each message at N chars (0 = no cap; default 600)")
    sub = p.add_subparsers(dest="mode")

    s = sub.add_parser("search", parents=[common],
                       help="search across channels you belong to")
    s.add_argument("query")
    s.add_argument("--count", type=int, default=20)
    s.add_argument("--sort", choices=["score", "timestamp"], default="score",
                   help="score = relevance (default); timestamp = newest first, for tracing history")
    s.add_argument("--expand", action="store_true", help="also fetch each hit's thread")
    s.add_argument("--expand-limit", type=int, default=5, help="max threads to expand (default 5)")
    s.add_argument("--in", dest="in_channel", help="restrict to a channel (in:#name)")
    s.add_argument("--from", dest="from_user", help="restrict to an author (from:@name)")
    s.add_argument("--after", help="YYYY-MM-DD")
    s.add_argument("--before", help="YYYY-MM-DD")
    s.add_argument("--json", action="store_true")

    h = sub.add_parser("history", parents=[common],
                       help="dump a channel's recent messages")
    h.add_argument("channel", help="channel id or archive URL")
    h.add_argument("--limit", type=int, default=50)
    h.add_argument("--oldest")
    h.add_argument("--latest")
    h.add_argument("--grep", help="keep only messages whose text matches this regex")
    h.add_argument("--expand", action="store_true", help="also fetch threads (reply_count > 0)")
    h.add_argument("--expand-limit", type=int, default=5)
    h.add_argument("--json", action="store_true")

    return p


def main():
    argv = sys.argv[1:]
    if not argv:
        build_parser().print_help(sys.stderr)
        sys.exit(1)

    # Backward compatible: a bare URL keeps the original behaviour.
    if argv[0].startswith("http"):
        token = get_token()
        trunc = 0
        for i, a in enumerate(argv):
            if a == "--truncate" and i + 1 < len(argv):
                trunc = int(argv[i + 1])
            elif a.startswith("--truncate="):
                trunc = int(a.split("=", 1)[1])
        cmd_url(argv[0], token, truncate=trunc)
        return

    args = build_parser().parse_args(argv)
    if args.mode is None:
        build_parser().print_help(sys.stderr)
        sys.exit(1)

    token = get_token()
    if args.mode == "search":
        cmd_search(args, token)
    elif args.mode == "history":
        cmd_history(
            args.channel, token, limit=args.limit, oldest=args.oldest, latest=args.latest,
            grep=args.grep, expand=args.expand, expand_limit=args.expand_limit,
            truncate=args.truncate, as_json=args.json,
        )


if __name__ == "__main__":
    main()
