#!/usr/bin/env python3
"""Headless smoke launch: server.py binds, falls forward if busy, and serves index.html."""

from __future__ import annotations

import os
import socket
import subprocess
import sys
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from server import choose_port, port_from_manifest  # noqa: E402


def check_port_fallback() -> None:
    assert port_from_manifest(ROOT) == 8808
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as busy:
        busy.bind(("127.0.0.1", 0))
        taken = busy.getsockname()[1]
        chosen = choose_port(taken)
    assert chosen != taken
    assert chosen > taken


def check_http() -> None:
    proc = subprocess.Popen(
        [sys.executable, os.path.join(ROOT, "server.py"), "--no-browser", "--port", "8911"],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    try:
        line = ""
        deadline = time.time() + 8
        while time.time() < deadline:
            if proc.poll() is not None:
                rest = proc.stdout.read() if proc.stdout else ""
                raise SystemExit(f"server exited early: {line} {rest}")
            line = proc.stdout.readline() if proc.stdout else ""
            if "Graveyard Grab running at" in line:
                break
        else:
            raise SystemExit("server did not print a URL")

        url = line.strip().split()[-1]
        if not url.endswith("/"):
            url += "/"
        with urllib.request.urlopen(url + "index.html", timeout=3) as response:
            body = response.read().decode("utf-8")
            if response.status != 200:
                raise SystemExit(f"status {response.status}")
            if "Graveyard Grab" not in body or "<canvas" not in body:
                raise SystemExit("index.html missing game markup")
            if "src/main.js" not in body:
                raise SystemExit("index.html missing module")
        with urllib.request.urlopen(url + "arcade.json", timeout=3) as response:
            payload = response.read().decode("utf-8")
            if '"graveyardgrab"' not in payload:
                raise SystemExit("arcade.json was not served")
        print(f"smoke ok {url}")
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


def main() -> int:
    check_port_fallback()
    check_http()
    return 0


if __name__ == "__main__":
    sys.exit(main())
