#!/usr/bin/env python3
"""Fast syntax check: bundle the game and run `node --check` on the ES module."""
import os, re, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
tmp = tempfile.gettempdir()
html_path = os.path.join(tmp, 'raffica_check.html')
mjs_path = os.path.join(tmp, 'raffica_check.mjs')
subprocess.run([sys.executable, os.path.join(ROOT, 'build.py'), html_path], check=True)
html = open(html_path, encoding='utf-8').read()
mods = re.findall(r'<script type="module">(.*?)</script>', html, re.S)
if not mods:
    print('module script not found')
    sys.exit(2)
with open(mjs_path, 'w', encoding='utf-8') as fh:
    fh.write(mods[-1])
r = subprocess.run(['node', '--check', mjs_path])
print('SYNTAX OK' if r.returncode == 0 else 'SYNTAX ERROR (line numbers refer to ' + mjs_path + ')')
sys.exit(r.returncode)
