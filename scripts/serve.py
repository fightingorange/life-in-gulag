#!/usr/bin/env python3
"""Serve the game locally, telling the browser not to cache, so an updated file is always picked up.

    python3 scripts/serve.py          # http://localhost:8077
    python3 scripts/serve.py 9000
"""
import functools
import http.server
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8077
    handler = functools.partial(NoCache, directory=str(ROOT))
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), handler) as httpd:
        print(f"Ten Years: http://localhost:{port}")
        httpd.serve_forever()
