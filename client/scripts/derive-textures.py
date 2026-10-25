"""
Prop Hunt — textures dérivées (à lancer après polyhaven-assets.mjs) :
  - versions « neutres » (désaturées, luminosité normalisée) de quelques surfaces Poly Haven,
    pour être teintées par la couleur de l'objet (crépi de façade, métal peint…) ;
  - une texture de haie taillée, composée de feuillages (EZ-Tree, MIT).
Usage : python3 client/scripts/derive-textures.py <dossier des feuilles EZ-Tree>
"""
import os, sys, random
import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
TEX = os.path.join(ROOT, 'public/ph-assets/tex')
LEAVES = sys.argv[1] if len(sys.argv) > 1 else None


def save_webp(arr, path, q=84):
    Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8)).save(path, 'WEBP', quality=q)


def neutral(src, dst, mean=0.82):
    """Copie désaturée d'une surface, moyenne ramenée à `mean` (en sRGB)."""
    im = np.asarray(Image.open(os.path.join(TEX, f'{src}_c.webp')).convert('RGB')).astype(np.float32) / 255
    g = im @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    g = g * (mean / max(1e-3, g.mean()))
    save_webp(np.repeat(g[..., None], 3, axis=2) * 255, os.path.join(TEX, f'{dst}_c.webp'))
    for k in ('n', 'arm'):
        Image.open(os.path.join(TEX, f'{src}_{k}.webp')).save(os.path.join(TEX, f'{dst}_{k}.webp'), 'WEBP', quality=88)
    print('neutre', dst)


def normal_from_height(h, strength=3.0):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * strength
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * strength
    n = np.stack([-dx, dy, np.ones_like(h)], axis=-1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return (n * 0.5 + 0.5) * 255


def hedge():
    """Haie taillée : des centaines de feuillages posés sur un fond sombre, sans couture."""
    N = 512
    rnd = random.Random(7)
    base = np.zeros((N, N, 3), np.float32); base[:] = (22, 38, 18)
    height = np.zeros((N, N), np.float32)
    sprites = []
    for name in ('oak', 'ash', 'ash', 'oak'):
        im = Image.open(os.path.join(LEAVES, f'{name}_color.png')).convert('RGBA')
        im = im.crop(im.getbbox())
        sprites.append(im)
    canvas = Image.new('RGBA', (N * 3, N * 3), (0, 0, 0, 0))
    hcanvas = Image.new('L', (N * 3, N * 3), 0)
    for i in range(900):
        sp = rnd.choice(sprites)
        sz = rnd.randint(70, 150)
        s = sp.resize((max(8, int(sz * sp.width / sp.height)), sz)).rotate(rnd.uniform(0, 360), expand=True)
        tint = rnd.uniform(0.6, 1.0)
        arr = np.asarray(s).astype(np.float32); arr[..., :3] *= tint
        s = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
        shade = int(120 + 135 * (i / 900))
        x = rnd.randint(0, N); y = rnd.randint(0, N)
        for ox in (0, N, 2 * N):
            for oy in (0, N, 2 * N):
                canvas.alpha_composite(s, (x + ox - s.width // 2, y + oy - s.height // 2))
                hcanvas.paste(shade, (x + ox - s.width // 2, y + oy - s.height // 2), s.split()[3])
    c = np.asarray(canvas.crop((N, N, 2 * N, 2 * N))).astype(np.float32)
    a = c[..., 3:4] / 255
    col = base * (1 - a) + c[..., :3] * a
    h = np.asarray(hcanvas.crop((N, N, 2 * N, 2 * N))).astype(np.float32) / 255
    save_webp(col, os.path.join(TEX, 'hedge_c.webp'))
    save_webp(normal_from_height(h, 4.0), os.path.join(TEX, 'hedge_n.webp'), 90)
    ao = 0.35 + 0.65 * h; rough = np.full_like(h, 0.85)
    save_webp(np.stack([ao * 255, rough * 255, np.zeros_like(h)], -1), os.path.join(TEX, 'hedge_arm.webp'))
    print('haie')


neutral('painted_plaster_wall', 'render_g')
neutral('blue_metal_plate', 'paintmetal_g', 0.78)
neutral('beige_wall_002', 'plaster_g', 0.86)
if LEAVES:
    hedge()
