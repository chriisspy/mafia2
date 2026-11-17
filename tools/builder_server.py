"""THE MAP BUILDER'S LITTLE SERVER (18 Nov 2026, his ask: a pixel art builder that saves straight into the game).
Serves the game folder (so the builder at /tools/builder/ and the game at / both work) and lets the builder write files:
  POST /api/save      {files:[{path, b64 | text, mode?}]}  -> writes under assets/ only (png, webp, json). A .webp is stored
                      LOSSLESS (the browser cannot do that itself), mode 'L' stores a grey picture (walk masks). Every file it
                      replaces is first copied to ../mafia2-art/builder-backups/<time>/. Then tools/asset_versions.py runs.
  POST /api/patch     {map:{ox,w,h}?, buildings:[{k,name,x,y,w,h}]?, hall:{k,name,door,spawn}?}  -> edits those lines of index.html
  POST /api/pixellab  {description,width,height,...}  header X-PL-Key  -> PixelLab's image maker (the key is never stored)
  GET  /api/ls?dir=assets/...  -> file names
Run from the game folder:  python -I tools/builder_server.py [port]      (launch config: mafia2-builder, port 8952)"""
import base64, io, json, os, re, shutil, subprocess, sys, time, urllib.request, urllib.error
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACK = os.path.join(os.path.dirname(ROOT), 'mafia2-art', 'builder-backups')
os.chdir(ROOT)

def safe(path):
    p = path.replace('\\', '/')
    if not re.fullmatch(r'assets/[A-Za-z0-9_\-./]+\.(png|webp|json)', p) or '..' in p: raise ValueError('bad path ' + path)
    return p

PL_IDS = os.path.join(ROOT, 'tools', 'pl_ids.json')
NO_REBUILD = {'beanie', 'sheik'}        # his hand-made Beanie and the Sheik's poses are never rebuilt by a script (his rule)
def run(*args):
    r = subprocess.run([sys.executable, '-I', *args], capture_output=True, text=True)
    return (r.stdout + r.stderr).strip()[-1500:], r.returncode
def cast():
    ids = {}
    try:
        sys.path.insert(0, os.path.join(ROOT, 'tools')); import importlib, pl_fetch_ids; importlib.reload(pl_fetch_ids); ids = pl_fetch_ids.IDS
    except Exception: pass
    out = []
    for n in sorted(os.listdir('assets/final')):
        d = 'assets/final/' + n
        if not os.path.exists(d + '/front.png'): continue
        pj = d + '/poses/poses.json'
        out.append({'id': n, 'views': [v for v in ('front', 'right', 'back', 'left') if os.path.exists('%s/%s.png' % (d, v))], 'poses': json.load(open(pj)) if os.path.exists(pj) else None, 'pl': ids.get(n), 'locked': n in NO_REBUILD})
    return out

def patch_index(body):
    t = open('index.html', encoding='utf-8', newline='').read(); done = []
    if body.get('map'):
        m = body['map']
        t, n = re.subn(r'const MAPX=XMAS\?\d+:0,MAPW=XMAS\?\d+:560,MAPH=XMAS\?\d+:750', 'const MAPX=XMAS?%d:0,MAPW=XMAS?%d:560,MAPH=XMAS?%d:750' % (int(m['ox']), int(m['w']), int(m['h'])), t)
        assert n == 1, 'map size line not found'; done.append('map size')
    if body.get('buildings') is not None:
        js = ','.join("{k:%s,name:%s,x:%d,y:%d,w:%d,h:%d%s}" % (json.dumps(b['k']).replace('"', "'"), json.dumps(b['name']).replace('"', "'"), b['x'], b['y'], b['w'], b['h'], ',fade:0' if b.get('fade') == 0 else '') for b in body['buildings'])
        t, n = re.subn(r'const BUILDINGS=XMAS\?\[.*?\]:\[\];', lambda _: 'const BUILDINGS=XMAS?[' + js + ']:[];', t)
        assert n == 1, 'BUILDINGS line not found'; done.append('buildings')
    if body.get('cabins'):
        js = '[' + ','.join('[%d,%d]' % (int(c[0]), int(c[1])) for c in body['cabins']) + ']'
        t, n = re.subn(r'const DOORS=\[\[.*?\]\];', lambda _: 'const DOORS=' + js + ';', t)
        assert n == 1, 'DOORS line not found'; done.append('cabins')
    for key in ('lamps', 'bulbs'):                                    # the town's lamp and bulb glows: lists of [x, y]
        if body.get(key) is not None:
            js = '[' + ','.join('[%d,%d]' % (int(c[0]), int(c[1])) for c in body[key]) + ']'
            t, n = re.subn(r'(\n  %s:)\[\[[^\n]*?\]\],' % key, lambda m: m.group(1) + js + ',', t)
            assert n == 1, key + ' line not found'; done.append(key)
    if body.get('hall'):
        h = body['hall']
        assert re.fullmatch(r'[a-z][a-z0-9]{1,15}', h['k']), 'bad key'
        if ("{k:'%s'," % h['k']) not in t.split('const HALLS=[')[1].split('const hallOf=')[0]:
            new = "  {k:'%s',name:%s,step:'stone',door:[%d,%d],spawn:[%d,%d],spots:[]}" % (h['k'], json.dumps(h['name']).replace('"', "'"), *h['door'], *h['spawn'])
            t, n = re.subn(r'\}\];(\r?\n)const hallOf=', lambda m: '},' + m.group(1) + new + '];' + m.group(1) + 'const hallOf=', t)
            assert n == 1, 'HALLS list not found'; done.append('interior ' + h['k'])
    open('index.html', 'w', encoding='utf-8', newline='').write(t)
    return done

class H(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store'); super().end_headers()
    def log_message(self, *a): pass
    def out(self, code, obj):
        b = json.dumps(obj).encode(); self.send_response(code); self.send_header('Content-Type', 'application/json'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        u = urlparse(self.path)
        if u.path == '/api/ls':
            d = parse_qs(u.query).get('dir', [''])[0].replace('\\', '/')
            if not d.startswith('assets') or '..' in d or not os.path.isdir(d): return self.out(200, [])
            return self.out(200, sorted(f for f in os.listdir(d) if f.lower().endswith(('.png', '.webp', '.json'))))
        if u.path == '/api/cast': return self.out(200, cast())
        if u.path == '/api/tree':                                       # every picture in assets (for "open any picture")
            res = []
            for r, ds, fs in os.walk('assets'):
                ds[:] = [x for x in ds if x not in ('poses-src', 'gen', 'chars', 'poses')]
                res += [os.path.join(r, f).replace('\\', '/') for f in fs if f.lower().endswith(('.png', '.webp'))]
            return self.out(200, sorted(res))
        return super().do_GET()
    def do_POST(self):
        try:
            body = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))) or b'{}')
            if self.path == '/api/save':
                stamp = time.strftime('%Y%m%d-%H%M%S'); wrote = []
                for f in body['files']:
                    p = safe(f['path'])
                    if os.path.exists(p):
                        b = os.path.join(BACK, stamp, p); os.makedirs(os.path.dirname(b), exist_ok=True); shutil.copy2(p, b)
                    os.makedirs(os.path.dirname(p), exist_ok=True)
                    if 'text' in f: open(p, 'w', encoding='utf-8', newline='').write(f['text'])
                    else:
                        raw = base64.b64decode(f['b64'].split(',')[-1]); im = Image.open(io.BytesIO(raw))
                        if f.get('mode') == 'L': im = im.convert('L').point(lambda v: 255 if v > 127 else 0)
                        elif f.get('mode') == 'RGB': im = im.convert('RGB')
                        if p.endswith('.webp'): im.save(p, lossless=True, quality=100, method=6)
                        else: im.save(p, optimize=True)
                    wrote.append(p)
                r = subprocess.run([sys.executable, '-I', 'tools/asset_versions.py'], capture_output=True, text=True)
                return self.out(200, {'ok': True, 'wrote': wrote, 'backup': stamp, 'versions': r.stdout.strip() or r.stderr.strip()})
            if self.path == '/api/patch':
                shutil.copy2('index.html', os.path.join(BACK, 'index-%s.html' % time.strftime('%Y%m%d-%H%M%S'))) if os.path.isdir(BACK) or not os.makedirs(BACK, exist_ok=True) else None
                return self.out(200, {'ok': True, 'done': patch_index(body)})
            if self.path == '/api/cast/new':                            # a new character from his sheet: 4 pictures + the SKINS line + the eyes
                k = body['id']; assert re.fullmatch(r'[a-z][a-z0-9]{1,15}', k), 'short name: letters only'
                assert not os.path.exists('assets/final/' + k), 'that name is taken'
                os.makedirs('assets/final/' + k)
                for v in ('front', 'right', 'back', 'left'): Image.open(io.BytesIO(base64.b64decode(body['views'][v].split(',')[-1]))).convert('RGBA').save('assets/final/%s/%s.png' % (k, v))
                t = open('index.html', encoding='utf-8', newline='').read()
                line = "  {id:'%s',name:%s,rar:'%s'}," % (k, json.dumps(body.get('name') or k).replace('"', "'"), body.get('rar', 'common'))
                t, n = re.subn(r'(const SKINS=\[\r?\n)', lambda m: m.group(1) + line + '\n', t); assert n == 1, 'SKINS list not found'
                t, n = re.subn(r"(const FINAL=Object\.fromEntries\(\[)", lambda m: m.group(1) + "'%s'," % k, t); assert n == 1, 'FINAL list not found'   # the game reads its pictures from assets/final
                open('index.html', 'w', encoding='utf-8', newline='').write(t)
                log = [run('tools/make_eyes.py')[0], run('tools/asset_versions.py')[0]]
                return self.out(200, {'ok': True, 'log': log})
            if self.path == '/api/cast/plid':
                k = body['id']; assert re.fullmatch(r'[a-z][a-z0-9]{1,15}', k)
                ids = json.load(open(PL_IDS)) if os.path.exists(PL_IDS) else {}
                ids[k] = body['pl'].strip(); json.dump(ids, open(PL_IDS, 'w'), indent=1); return self.out(200, {'ok': True})
            if self.path == '/api/cast/run':                            # the same scripts Claude runs by hand: fetch the animations, make the poses, pack them
                k = body.get('id', ''); step = body['step']; log = []
                if step == 'build':
                    assert re.fullmatch(r'[a-z][a-z0-9]{1,15}', k) and k not in NO_REBUILD, 'this character is never rebuilt by a script'
                    for s in ('tools/pl_fetch.py', 'tools/pl_poses.py', 'tools/pl_actions.py'):
                        o, rc = run(s, k); log.append(s + ': ' + o)
                        if rc: return self.out(200, {'ok': False, 'log': log})
                for s in ('tools/pack_poses.py', 'tools/asset_versions.py'):
                    o, rc = run(s); log.append(s + ': ' + o[-300:])
                return self.out(200, {'ok': True, 'log': log})
            if self.path == '/api/pl':                                  # any PixelLab v2 call the builder needs (characters, animations, jobs)
                key = self.headers.get('X-PL-Key') or os.environ.get('PIXELLAB_API_KEY') or os.environ.get('PIXELLAB_SECRET')
                if not key: return self.out(400, {'error': 'No PixelLab key. Paste it in the builder (it stays in your browser).'})
                path = body['path']; assert re.fullmatch(r'/[a-z0-9\-/]+', path), 'path'
                data = json.dumps(body['body']).encode() if body.get('body') is not None else None
                rq = urllib.request.Request('https://api.pixellab.ai/v2' + path, data=data, method=body.get('method', 'POST' if data else 'GET'), headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'User-Agent': 'map-builder'})
                try:
                    with urllib.request.urlopen(rq, timeout=240) as r: return self.out(200, json.loads(r.read()))
                except urllib.error.HTTPError as e:
                    return self.out(e.code, {'error': 'PixelLab said %d: %s' % (e.code, e.read().decode('utf-8', 'replace')[:500])})
            if self.path == '/api/pixellab':
                key = self.headers.get('X-PL-Key') or os.environ.get('PIXELLAB_API_KEY') or os.environ.get('PIXELLAB_SECRET')
                if not key: return self.out(400, {'error': 'No PixelLab key. Paste it in the builder (it stays in your browser).'})
                ep = body.pop('endpoint', 'generate-image-pixflux')
                assert ep in ('generate-image-pixflux', 'generate-image-bitforge'), 'endpoint'
                rq = urllib.request.Request('https://api.pixellab.ai/v1/' + ep, data=json.dumps(body).encode(), headers={'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json', 'User-Agent': 'map-builder'})
                try:
                    with urllib.request.urlopen(rq, timeout=180) as r: return self.out(200, json.loads(r.read()))
                except urllib.error.HTTPError as e:
                    return self.out(e.code, {'error': 'PixelLab said %d: %s' % (e.code, e.read().decode('utf-8', 'replace')[:400])})
            return self.out(404, {'error': 'no such thing'})
        except Exception as e:
            return self.out(500, {'error': '%s: %s' % (type(e).__name__, e)})

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8952
    print('map builder: http://127.0.0.1:%d/tools/builder/' % port)
    ThreadingHTTPServer(('127.0.0.1', port), H).serve_forever()
