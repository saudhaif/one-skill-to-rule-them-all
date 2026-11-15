#!/usr/bin/env python3
"""Build public/index.html from the Claude-hosted page (../yalla-crew/laces-it.html).

The page code stays shared; this only swaps what differs off Claude:
the page skeleton, photo URLs, the ride link, a few messages that mention
Claude, and the Firebase bootstrap that answers claude.use(...).
"""
import pathlib
import sys

here = pathlib.Path(__file__).resolve().parent
src = (here.parent / "yalla-crew" / "laces-it.html").read_text(encoding="utf-8")


def swap(text, old, new):
    if text.count(old) != 1:
        sys.exit(f"build.py: expected exactly one match for {old[:60]!r}, found {text.count(old)}")
    return text.replace(old, new)


page = src
page = swap(page, '<link rel="preconnect" href="https://fonts.googleapis.com">',
            '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
            '<link rel="preconnect" href="https://fonts.googleapis.com">')
page = swap(page, 'const ARTIFACT = "https://claude.ai/artifact/4HJev2ajB5nrLajaq4Lru8";',
            'const ARTIFACT = location.origin + location.pathname;')
page = swap(page, "  for (const k in EXTRA) Object.assign(I18N[k], EXTRA[k]);",
            """  for (const k in EXTRA) Object.assign(I18N[k], EXTRA[k]);
  const WEB = {
    ar: { exampleNote: "<strong>هذي أمثلة توضيحية.</strong> التطبيق ما انربط بقاعدة البيانات للحين.", photoOff: "سجّل دخولك عشان تضيف صور." },
    en: { exampleNote: "<strong>These are examples.</strong> The app isn't connected to its database yet.", photoOff: "Sign in to add photos." },
    fil: { exampleNote: "<strong>Mga halimbawa lang ito.</strong> Hindi pa nakakonekta ang app sa database.", photoOff: "Mag-sign in para magdagdag ng larawan." },
    hi: { exampleNote: "<strong>ये उदाहरण हैं।</strong> ऐप अभी डेटाबेस से जुड़ा नहीं है।", photoOff: "फ़ोटो जोड़ने के लिए साइन इन करें।" }
  };
  for (const k in WEB) Object.assign(I18N[k], WEB[k]);""")
page = swap(page, "<script>\n(() => {",
            "<script>\n"
            "  // claude.use(name) resolves once the Firebase sign-in finishes (firebase-shim.js).\n"
            "  window.__lacesReady = new Promise((r) => { window.__lacesResolve = r; });\n"
            "  window.claude = { use: (n) => window.__lacesReady.then((api) => api[n] ?? null) };\n"
            "</script>\n"
            '<script type="module" src="firebase-shim.js"></script>\n'
            "<script>\n(() => {")

out = "<!doctype html>\n<html>\n<head>\n<meta charset=\"utf-8\">\n" \
      "<style>:root{box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}" \
      "body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n</head>\n<body>\n" + page + "</body>\n</html>\n"
(here / "public" / "index.html").write_text(out, encoding="utf-8")
print("wrote", here / "public" / "index.html")
