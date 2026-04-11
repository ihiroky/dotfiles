#!/usr/bin/env python3
"""Fetch Slack messages and threads by URL using the Slack Web API.

Token is obtained from Bitwarden via rbw (must be pre-unlocked).
"""
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
    """Parse https://workspace.slack.com/archives/CHANNEL/pTIMESTAMP"""
    m = re.match(r"https://[^/]+\.slack\.com/archives/([A-Z0-9]+)/p(\d+)", url)
    if not m:
        raise ValueError(f"Invalid Slack URL: {url}")
    channel_id = m.group(1)
    ts_raw = m.group(2)
    # e.g. p1775729801660339 → "1775729801.660339"
    ts = ts_raw[:-6] + "." + ts_raw[-6:]
    return channel_id, ts


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


def format_message(msg, token):
    if msg.get("user"):
        info = get_user_info(token, msg["user"])
        author = (
            f"{info['display_name']} "
            f"(display_name: {info['display_name']}; "
            f"real_name: {info['real_name']}; "
            f"username: {info['username']}; "
            f"email: {info['email']})"
        )
    else:
        author = msg.get("username", msg.get("bot_id", "unknown"))

    ts_fmt = format_ts(msg.get("ts", ""))
    text = resolve_text(msg.get("text", ""), token)
    return f"{author} [{ts_fmt}]: {text}"


def main():
    if len(sys.argv) < 2:
        print("Usage: slack_fetch.py <slack-url>", file=sys.stderr)
        sys.exit(1)

    url = sys.argv[1]
    token = get_token()
    channel_id, ts = parse_slack_url(url)

    result = slack_api(
        "conversations.history", token,
        channel=channel_id,
        latest=ts,
        oldest=ts,
        inclusive="true",
        limit=1,
    )

    messages = result.get("messages", [])
    if not messages:
        print("Message not found", file=sys.stderr)
        sys.exit(1)

    root_msg = messages[0]
    reply_count = root_msg.get("reply_count", 0)

    print(f"channel: {channel_id}")
    print(f"url: {url}")
    print(f"ts: {ts}")
    print()
    print("## Root message")
    print(format_message(root_msg, token))

    if reply_count > 0:
        print(f"\n## Thread ({reply_count} replies)")
        thread = slack_api(
            "conversations.replies", token,
            channel=channel_id,
            ts=ts,
        )
        for msg in thread.get("messages", [])[1:]:
            print()
            print(format_message(msg, token))


if __name__ == "__main__":
    main()
