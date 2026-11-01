#!/usr/bin/env python3
"""Serve Graveyard Grab on 127.0.0.1.

The default port comes from arcade.json (8808). If that port is taken, the
next free port is used. The page is opened in the default browser unless
--no-browser is passed (used by the headless smoke test).
"""

from __future__ import annotations

import argparse
import json
import os
import socket
import sys
import webbrowser
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HOST = "127.0.0.1"
FALLBACK_PORT = 8808


def project_root() -> str:
    return os.path.dirname(os.path.abspath(__file__))


def port_from_manifest(root: str) -> int:
    path = os.path.join(root, "arcade.json")
    try:
        with open(path, encoding="utf-8") as handle:
            data = json.load(handle)
        port = int(data.get("port", FALLBACK_PORT))
    except (OSError, ValueError, json.JSONDecodeError, TypeError):
        return FALLBACK_PORT
    if port < 1 or port > 65535:
        return FALLBACK_PORT
    return port


def choose_port(start: int, host: str = HOST, attempts: int = 50) -> int:
    """Return start, or the next free port if it is already taken."""
    last_error = None
    for port in range(int(start), int(start) + attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            try:
                sock.bind((host, port))
            except OSError as exc:
                last_error = exc
                continue
            return port
    raise RuntimeError(f"No free port in {start}..{start + attempts - 1} ({last_error})")


def serve(port: int, root: str, open_browser: bool) -> None:
    handler = partial(SimpleHTTPRequestHandler, directory=root)
    httpd = ThreadingHTTPServer((HOST, port), handler)
    url = f"http://{HOST}:{port}/"
    print(f"Graveyard Grab running at {url}", flush=True)
    if open_browser:
        try:
            webbrowser.open(url)
        except Exception:
            print(f"Open a browser to {url}", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.", flush=True)
    finally:
        httpd.server_close()


def main(argv: list[str] | None = None) -> int:
    root = project_root()
    parser = argparse.ArgumentParser(description="Serve Graveyard Grab locally")
    parser.add_argument("--port", type=int, default=None, help="preferred port (default: arcade.json)")
    parser.add_argument("--no-browser", action="store_true", help="do not open a browser window")
    parser.add_argument("--root", default=root, help="directory to serve")
    args = parser.parse_args(argv)
    preferred = args.port if args.port is not None else port_from_manifest(args.root)
    try:
        port = choose_port(preferred)
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    if port != preferred:
        print(f"Port {preferred} is busy; using {port} instead.", flush=True)
    serve(port, args.root, open_browser=not args.no_browser)
    return 0


if __name__ == "__main__":
    sys.exit(main())
