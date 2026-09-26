#!/usr/bin/env python3
"""Serve the Bean to Cup sandbox (admin HUD) plus dist assets. Not for Vercel."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PORT = int(os.environ.get("SANDBOX_PORT", "43191"))


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        if self.path in ("/", "/sandbox", "/sandbox/", "/sandbox/bean-to-cup"):
            self.send_response(302)
            self.send_header("Location", "/sandbox/bean-to-cup/")
            self.end_headers()
            return
        return super().do_GET()

    def log_message(self, fmt, *args):
        print("[%s] %s" % (self.log_date_time_string(), fmt % args))


if __name__ == "__main__":
    os.chdir(ROOT)
    httpd = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print("Bean to Cup sandbox  http://127.0.0.1:%s/sandbox/bean-to-cup/" % PORT)
    httpd.serve_forever()
