#!/usr/bin/env python3
"""tsKaizen site QA. Usage: python3 site_qa.py <site_dir> [--json out.json]
Stdlib only. Errors block delivery; warnings get fixed or explained.
Local tweak: scans subfolders (services/) and resolves links relative to each page."""
import sys, os, re, json
from html.parser import HTMLParser

AI_TELLS = [
    "elevate", "unlock", "seamless", "seamlessly", "delve", "tapestry", "testament to", "in today's",
    "look no further", "whether you're", "we've got you covered", "game-changer", "game changer",
    "cutting-edge", "state-of-the-art", "next level", "next-level", "unparalleled", "unmatched",
    "embark", "journey", "realm", "elevated", "curated", "bespoke", "synergy", "leverage",
    "your one-stop", "one-stop shop", "top-notch", "second to none", "dive in", "dive into",
    "transform your", "revolutionize", "empower", "experience the difference", "rest assured",
    "nestled", "boasts", "a symphony of", "meticulous attention to detail", "passion for excellence",
    "we pride ourselves", "commitment to excellence", "lorem ipsum", "your trusted partner",
]
DASHES = "—–"

class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.text, self.headings, self.links, self.imgs = [], [], [], []
        self.ids, self.titles, self.metas, self.inputs, self.labels_for = set(), [], {}, [], set()
        self.nav_links, self.in_nav, self.nav_depth = [], False, 0
        self.html_lang, self.has_doctype, self.inline_styles = None, False, 0
        self.cur_heading, self.cur_title, self.skip = None, None, 0
        self.label_depth = 0
        self.main_paras, self.in_main, self.cur_p = [], False, None
    def handle_decl(self, d):
        if d.lower().startswith("doctype"): self.has_doctype = True
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get("id"): self.ids.add(a["id"])
        if a.get("style"): self.inline_styles += 1
        if tag == "html": self.html_lang = a.get("lang")
        if tag in ("script", "style", "svg", "noscript"): self.skip += 1
        if tag == "title": self.cur_title = ""
        if tag == "meta":
            k = a.get("name") or a.get("property")
            if k: self.metas[k] = a.get("content", "")
        if re.fullmatch(r"h[1-6]", tag): self.cur_heading = [int(tag[1]), "", self.in_main]
        if tag == "a":
            href = a.get("href", "")
            self.links.append(href)
            if self.in_nav: self.nav_links.append((href, a.get("aria-current")))
        if tag == "img": self.imgs.append(a)
        if tag == "ul" and "nav-links" in (a.get("class") or ""): self.in_nav, self.nav_depth = True, 1
        elif self.in_nav and tag == "ul": self.nav_depth += 1
        if tag == "label":
            self.label_depth += 1
            if a.get("for"): self.labels_for.add(a["for"])
        if tag in ("input", "select", "textarea") and a.get("type") not in ("hidden", "submit", "button"):
            a["_wrapped"] = self.label_depth > 0
            self.inputs.append(a)
        if tag == "main": self.in_main = True
        if tag == "p" and self.in_main: self.cur_p = ""
    def handle_endtag(self, tag):
        if tag in ("script", "style", "svg", "noscript"): self.skip = max(0, self.skip - 1)
        if tag == "title" and self.cur_title is not None: self.titles.append(self.cur_title.strip()); self.cur_title = None
        if self.cur_heading and tag == f"h{self.cur_heading[0]}":
            self.headings.append((self.cur_heading[0], " ".join(self.cur_heading[1].split()), self.cur_heading[2])); self.cur_heading = None
        if self.in_nav and tag == "ul":
            self.nav_depth -= 1
            if self.nav_depth == 0: self.in_nav = False
        if tag == "label": self.label_depth = max(0, self.label_depth - 1)
        if tag == "main": self.in_main = False
        if tag == "p" and self.cur_p is not None:
            t = " ".join(self.cur_p.split())
            if t: self.main_paras.append(t)
            self.cur_p = None
        if tag in ("p", "li", "h1", "h2", "h3", "h4", "div", "span", "a", "button", "td", "th", "label", "small", "strong", "b", "dd", "dt", "figcaption"):
            self.text.append("\n")
    def handle_data(self, d):
        if self.cur_title is not None: self.cur_title += d
        if self.skip: return
        if self.cur_heading: self.cur_heading[1] += d
        if self.cur_p is not None: self.cur_p += d
        self.text.append(d)

def visible_text(p):
    return re.sub(r"[ \t]*\n[ \t\n]*", "\n", "".join(p.text)).strip()

def norm(f, h):
    path = h.split("#")[0].split("?")[0]
    return os.path.normpath(os.path.join(os.path.dirname(f), path)) if path else f

def check(site):
    errors, warnings, info = [], [], {}
    pages = []
    for root, _, files in os.walk(site):
        for fn in files:
            if fn.endswith(".html"): pages.append(os.path.relpath(os.path.join(root, fn), site))
    pages.sort()
    if not pages: return {"errors": ["no .html pages found"], "warnings": [], "score": 0}
    if "index.html" not in pages: errors.append("index.html missing")
    titles, descs, navsets, phones, prices, paras = {}, {}, {}, set(), set(), {}
    for f in pages:
        p = Page(); p.feed(open(os.path.join(site, f), encoding="utf-8").read())
        tag = f"[{f}]"
        if not p.has_doctype: errors.append(f"{tag} missing <!doctype html>")
        if not p.html_lang: errors.append(f"{tag} <html> has no lang")
        if "viewport" not in p.metas: errors.append(f"{tag} missing viewport meta")
        if len(p.titles) != 1 or not p.titles[0]: errors.append(f"{tag} needs exactly one non-empty <title>")
        else: titles.setdefault(p.titles[0], []).append(f)
        d = p.metas.get("description", "")
        if not d: errors.append(f"{tag} missing meta description")
        elif not 110 <= len(d) <= 170: warnings.append(f"{tag} meta description is {len(d)} chars (aim 120 to 160)")
        descs.setdefault(d, []).append(f)
        h1 = [h for h in p.headings if h[0] == 1]
        mainh = [(l, t) for l, t, m in p.headings if m]
        if len(h1) != 1: errors.append(f"{tag} has {len(h1)} <h1> (needs exactly 1)")
        prev = 0
        for lvl, txt in mainh:
            if prev and lvl > prev + 1: errors.append(f"{tag} heading jumps h{prev} to h{lvl}: '{txt[:50]}'")
            if not txt: errors.append(f"{tag} empty h{lvl}")
            prev = lvl
        if p.nav_links:
            hrefs = tuple(norm(f, h) for h, _ in p.nav_links)
            navsets.setdefault(hrefs, []).append(f)
            cur = [norm(f, h) for h, c in p.nav_links if c == "page"]
            if f != "index.html" and not cur and f in hrefs:
                warnings.append(f"{tag} nav link to this page lacks aria-current=\"page\"")
            for h in cur:
                if h != f: errors.append(f"{tag} aria-current points at {h}, not this page")
        else: warnings.append(f"{tag} no primary nav (.nav-links) found")
        for h in p.links:
            if not h or h.startswith(("http://", "https://", "mailto:", "tel:", "sms:")): continue
            path, _, frag = h.partition("#")
            path = path.split("?")[0]
            if path and not os.path.exists(os.path.join(site, os.path.dirname(f), path)): errors.append(f"{tag} broken link {h}")
            if frag and not path and frag not in p.ids: errors.append(f"{tag} anchor #{frag} not found")
        for im in p.imgs:
            if "alt" not in im: errors.append(f"{tag} <img> without alt: {im.get('src','')[:60]}")
        for inp in p.inputs:
            if not inp.get("_wrapped") and inp.get("id") not in p.labels_for and not inp.get("aria-label"):
                errors.append(f"{tag} form field without label: {inp.get('name') or inp.get('id')}")
        if p.inline_styles > 6: warnings.append(f"{tag} {p.inline_styles} inline style attributes (move to stylesheet)")
        txt = visible_text(p)
        for ch in DASHES:
            for m in re.finditer(re.escape(ch), txt):
                errors.append(f"{tag} em/en dash in copy: '...{txt[max(0,m.start()-25):m.end()+25].strip()}...'")
        low = txt.lower()
        for w in AI_TELLS:
            if re.search(r"(?<![a-z])" + re.escape(w) + r"(?![a-z])", low): warnings.append(f"{tag} generic phrase '{w}'")
        for m in re.finditer(r"\b(\w+)[ \t]+\1\b", txt, re.I):
            if m.group(1).lower() not in ("that", "had", "is"): errors.append(f"{tag} repeated word: '{m.group(0)}'")
        for m in re.finditer(r" [,.;:!?](?!\d)", txt): errors.append(f"{tag} space before punctuation: '{txt[max(0,m.start()-20):m.end()+5]}'")
        for m in re.finditer(r"[!?.]{2,}", txt):
            if m.group(0) != "...": errors.append(f"{tag} doubled punctuation '{m.group(0)}'")
        for m in re.finditer(r"[a-z]{2,}[.!?] +[a-z]", txt): warnings.append(f"{tag} sentence may start lowercase: '{m.group(0)}'")
        if re.search(r"\[placeholder\]|TODO|TBD|xxx", txt, re.I): warnings.append(f"{tag} contains placeholder text")
        if txt.count("!") > 2: warnings.append(f"{tag} {txt.count('!')} exclamation marks (keep it calm)")
        for m in re.finditer(r"\(?\b\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b", txt): phones.add(re.sub(r"\d", "0", m.group(0)))
        for m in re.finditer(r"\$\d[\d,]*(\.\d\d)?", txt): prices.add("comma" if "," in m.group(0) else ("plain" if len(re.sub(r"\D", "", m.group(0))) >= 4 else "short"))
        for para in p.main_paras:
            if len(para.split()) >= 14: paras.setdefault(para, []).append(f)
        small = ("a","an","the","and","or","of","to","in","on","for","at","by","with")
        tc = [h for l, h in mainh if l <= 2 and len(h.split()) >= 4 and all(w[0].isupper() for w in h.split() if w[0].isalpha() and w.lower() not in small)]
        if tc and len(tc) < len([h for l, h in mainh if l <= 2 and len(h.split()) >= 4]):
            warnings.append(f"{tag} mixes Title Case and sentence case headings: {tc[:2]}")
    for t, fs in titles.items():
        if len(fs) > 1: errors.append(f"duplicate <title> on {fs}")
    for d, fs in descs.items():
        if d and len(fs) > 1: warnings.append(f"duplicate meta description on {fs}")
    if len(navsets) > 1: errors.append(f"primary nav differs between pages: {list(navsets.values())}")
    if len(phones) > 1: errors.append(f"phone numbers written {len(phones)} different ways: {sorted(phones)}")
    if "plain" in prices and "comma" in prices: errors.append("prices mix $1200 and $1,200 formats")
    for para, fs in paras.items():
        if len(fs) > 1: warnings.append(f"same paragraph repeated on {fs}: '{para[:60]}...'")
    css = ""
    for root, _, files in os.walk(site):
        for fn in files:
            if fn.endswith(".css"): css += open(os.path.join(root, fn), encoding="utf-8").read()
    if css:
        body = re.sub(r":root\s*{[^}]*}", "", css)
        hexes = set(h.lower() for h in re.findall(r"#[0-9a-fA-F]{3,8}\b", body))
        info["hardcoded_colors_outside_tokens"] = len(hexes)
        if len(hexes) > 16: warnings.append(f"{len(hexes)} hard-coded colors outside :root tokens (use variables)")
        sp = re.findall(r"(?:margin|padding|gap)[a-z-]*\s*:\s*([^;}]+)", body)
        vals = set()
        for v in sp:
            for n in re.findall(r"(-?\d*\.?\d+)(rem|px|em)", v): vals.add(n[0] + n[1])
        info["distinct_spacing_values"] = len(vals)
        if len(vals) > 40: warnings.append(f"{len(vals)} distinct spacing values; snap to a spacing scale")
        if "prefers-reduced-motion" not in css: warnings.append("no prefers-reduced-motion rule")
        if ":focus-visible" not in css: errors.append("no :focus-visible styles")
    else: warnings.append("no stylesheet found")
    score = max(0, 100 - 8 * len(errors) - 2 * len(warnings))
    return {"pages": pages, "errors": errors, "warnings": warnings, "info": info, "score": score}

if __name__ == "__main__":
    site = sys.argv[1]
    r = check(site)
    if "--json" in sys.argv: json.dump(r, open(sys.argv[sys.argv.index("--json") + 1], "w"), indent=2)
    print(f"pages: {len(r.get('pages', []))} | errors: {len(r['errors'])} | warnings: {len(r['warnings'])} | score: {r['score']}")
    for e in r["errors"]: print("ERROR  ", e)
    for w in r["warnings"]: print("WARN   ", w)
    if r.get("info"): print("INFO   ", r["info"])
    sys.exit(1 if r["errors"] else 0)
