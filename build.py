#!/usr/bin/env python3
"""Bundle src/*.js into one HTML page (the claude.ai artifact).

usage: build.py <out.html> [--standalone] [--local] [--three PREFIX]
                           [--inject a.js,b.js] [--files a.js,b.js] [--main extra.js] [--template t.html]

  (default)      artifact build: no <!doctype>/<head>/<body> (the artifact runtime adds them),
                 three.js r170 from cdn.jsdelivr.net (allowed by the artifact CSP)
  --standalone   wrap the page in a full HTML document, to open it from a local web server
  --local        load three.js from a local checkout instead of the CDN (implies --standalone)
  --three PREFIX URL path of that checkout (default /mrdoob/three.js)
  --inject       inline extra classic scripts before the module (test mocks / autostart)
  --files        bundle only these src files, in this order (test harnesses)
  --main         append an extra script after the sources (test harnesses)
  --template     use another HTML template (default src/index.html)
  --assets BASE  URL prefix of the 3D models (assets/*.glb). Default: artifact builds copy the
                 models next to the page (<outdir>/assets/) and use 'assets/'; standalone builds
                 point to the project's assets/ folder relative to the page (e.g. '../assets/')
  --no-assets    don't load external models (procedural guns and soldiers only)
"""
import sys, os, glob, base64, json, shutil

ROOT = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[1:]
if not args or args[0].startswith('--'):
    print(__doc__)
    sys.exit(1)
out = args[0]


def opt(name, default=None):
    return args[args.index(name) + 1] if name in args else default


local = '--local' in args
standalone = local or '--standalone' in args
three_prefix = opt('--three', '/mrdoob/three.js').rstrip('/')
files = opt('--files')
main = opt('--main')
template = opt('--template', os.path.join(ROOT, 'src', 'index.html'))
injects = [f for f in (opt('--inject', '') or '').split(',') if f]

srcs = sorted(glob.glob(os.path.join(ROOT, 'src', '*.js')))
if files:
    srcs = [os.path.join(ROOT, 'src', f) for f in files.split(',')]
code = []
for f in srcs:
    with open(f, encoding='utf-8') as fh:
        code.append('// ---- ' + os.path.basename(f) + ' ----\n' + fh.read())
if main:
    with open(main, encoding='utf-8') as fh:
        code.append(fh.read())
js = '\n'.join(code)

THREE_VER = '0.170.0'
if local:
    imap = '{"imports":{"three":"%s/build/three.module.js","three/addons/":"%s/examples/jsm/"}}' % (three_prefix, three_prefix)
else:
    imap = '{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@%s/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@%s/examples/jsm/"}}' % (THREE_VER, THREE_VER)

with open(template, encoding='utf-8') as fh:
    html = fh.read()
inj = ''.join('<script>' + open(f, encoding='utf-8').read() + '</script>' for f in injects)
html = html.replace('<!--IMPORTMAP-->', inj + '<script type="importmap">' + imap + '</script>')
html = html.replace('<!--SCRIPT-->', '<script type="module">\n' + js + '\n</script>')
# external models: base URL, credits and (artifact builds) a copy of the files next to the page
ASSETS = os.path.join(ROOT, 'assets')
outdir = os.path.dirname(os.path.abspath(out))
enc = ''
if '--no-assets' in args:
    base = ''
elif opt('--assets') is not None:
    base = opt('--assets')
elif standalone:
    base = os.path.relpath(ASSETS, outdir).replace(os.sep, '/') + '/'
else:
    # artifacts don't serve .glb: each model ships as base64 text (<name>.glb.txt), decoded by Assets.get
    base = 'assets/'
    enc = 'b64'
    dst = os.path.join(outdir, 'assets')
    if os.path.isdir(dst):
        shutil.rmtree(dst)
    os.makedirs(dst, exist_ok=True)
    for f in sorted(glob.glob(os.path.join(ASSETS, '*.glb'))):
        with open(f, 'rb') as fh, open(os.path.join(dst, os.path.basename(f) + '.txt'), 'w', encoding='ascii') as oh:
            oh.write(base64.b64encode(fh.read()).decode('ascii'))
    if os.path.exists(os.path.join(ASSETS, 'CREDITS.json')):
        shutil.copy2(os.path.join(ASSETS, 'CREDITS.json'), dst)
credits = []
if os.path.exists(os.path.join(ASSETS, 'CREDITS.json')):
    with open(os.path.join(ASSETS, 'CREDITS.json'), encoding='utf-8') as fh:
        credits = json.load(fh)
html = html.replace("'__RAFFICA_ASSET_BASE__'", json.dumps(base))
html = html.replace("'__RAFFICA_ASSET_ENC__'", json.dumps(enc))
html = html.replace('/*__RAFFICA_CREDITS__*/[]', json.dumps(credits, ensure_ascii=True, separators=(',', ':')).replace('<', '\\u003c'))
if standalone:
    html = '<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + html + '</body></html>'
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
with open(out, 'w', encoding='utf-8') as fh:
    fh.write(html)
print('wrote', out, len(html), 'bytes')
