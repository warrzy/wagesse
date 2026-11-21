"""Read a phone-verification response and accept only the simple-auth shape.

The body is never printed. Exit 2 when it contains a secret-like pattern,
exit 3 when the JSON shape is not the expected public policy.
"""
import json
import sys

path = sys.argv[1]
required_only = "--required-only" in sys.argv[2:]
raw = open(path, encoding="utf-8").read()
if "SMS_HTTP" in raw or "mysql://" in raw or "password" in raw.lower():
    sys.stderr.write("secret-pattern\n")
    sys.exit(2)
try:
    body = json.loads(raw)
except json.JSONDecodeError:
    sys.stderr.write("invalid-json\n")
    sys.exit(3)
data = body.get("data") if isinstance(body, dict) else None
if not isinstance(data, dict) or data.get("required") is not False:
    sys.stderr.write("policy-shape\n")
    sys.exit(3)
if not required_only and data.get("misconfigured") is not False:
    sys.stderr.write("policy-shape\n")
    sys.exit(3)
