"""Asset versions (13 Nov 2026). Every picture used to be fetched as file.png?v=BUILD, so each new build made phones
download EVERYTHING again. Now each file has its own short fingerprint (from its contents): a picture is only fetched
again when that picture really changed. This writes the table into index.html (the line  const AV={...};) and bumps BUILD.
RUN THIS BEFORE EVERY PUSH (it is safe to run any time):  python -I tools/asset_versions.py   (from the game folder)"""
import os, re, json, time, hashlib
SKIP_DIRS = {'poses-src', 'gen', 'chars'}
av = {}
for root, dirs, files in os.walk('assets'):
    dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
    r = root.replace('\\', '/')
    if re.search(r'assets/final/[^/]+/poses$', r): continue      # the loose poses: the game reads the atlases instead
    for f in files:
        if not f.lower().endswith(('.png', '.json', '.svg')): continue
        p = f'{r}/{f}'
        av[p] = hashlib.md5(open(p, 'rb').read()).hexdigest()[:5]
p = 'index.html'; t = open(p, encoding='utf-8').read()
line = 'const AV=' + json.dumps(av, separators=(',', ':'), sort_keys=True) + ';'
t, n = re.subn(r'const AV=\{[^\n]*\};', lambda m: line, t); assert n == 1, n
t, n = re.subn(r"const BUILD='\d+';", "const BUILD='%s';" % time.strftime('%m%d%H%M'), t); assert n == 1
open(p, 'w', encoding='utf-8', newline='').write(t)
open('version.txt', 'w').write(time.strftime('%m%d%H%M'))   # what phones check to see if there is a newer build
print(len(av), 'files,', len(line) // 1024, 'KB of versions')
