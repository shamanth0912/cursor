#!/usr/bin/env python3
"""Serve Bean to Cup classic/current A/B preview + sandbox HUD. Not for Vercel."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os

ROOT = os.path.abspath(os.path.dirname(__file__))
PORT = int(os.environ.get("SANDBOX_PORT", os.environ.get("AB_PORT", "43191")))


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        # Legacy sandbox paths expect /dist/*
        if path == "/dist" or path.startswith("/dist/"):
            self.path = "/classic" + self.path[len("/dist") :]
            return super().do_GET()
        if path in ("/sandbox", "/sandbox/", "/sandbox/bean-to-cup"):
            self.send_response(302)
            self.send_header("Location", "/sandbox/bean-to-cup/")
            self.end_headers()
            return
        if path in ("/classic", "/classic/"):
            self.send_response(302)
            self.send_header("Location", "/classic/bean-to-cup.html?layout=classic")
            self.end_headers()
            return
        if path in ("/current", "/current/"):
            self.send_response(302)
            self.send_header("Location", "/current/bean-to-cup.html")
            self.end_headers()
            return
        return super().do_GET()

    def log_message(self, fmt, *args):
        print("[%s] %s" % (self.log_date_time_string(), fmt % args))


if __name__ == "__main__":
    os.chdir(ROOT)
    httpd = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print("Bean to Cup A/B preview")
    print("  chooser   http://127.0.0.1:%s/" % PORT)
    print("  classic   http://127.0.0.1:%s/classic/bean-to-cup.html?layout=classic" % PORT)
    print("  current   http://127.0.0.1:%s/current/bean-to-cup.html" % PORT)
    print("  sandbox   http://127.0.0.1:%s/sandbox/bean-to-cup/  (press H)" % PORT)
    httpd.serve_forever()
