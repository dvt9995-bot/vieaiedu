#!/usr/bin/env python3
"""Tách nền trắng của logo VIE AI EDU + sinh bộ asset (logo trong suốt, favicon, PWA icons)."""
import os
from PIL import Image
import numpy as np

SRC = os.path.expanduser("~/Downloads/ChatGPT Image 19_33_27 19 thg 6, 2026.png")
APP = "/Users/dollar/Desktop/99ai-app"
PUB = os.path.join(APP, "public")
APPDIR = os.path.join(APP, "src/app")

img = Image.open(SRC).convert("RGBA")
a = np.array(img).astype(np.int16)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
mn = np.minimum(np.minimum(r, g), b)
mx = np.maximum(np.maximum(r, g), b)
sat = mx - mn  # độ "xám"

# Nền trắng = rất sáng + ít bão hòa. Làm trong suốt; feather mềm ở rìa khử răng cưa.
alpha = a[..., 3].copy()
white = (mn >= 244) & (sat <= 12)
alpha[white] = 0
# vùng gần trắng (rìa): giảm alpha dần để mượt
edge = (mn >= 220) & (mn < 244) & (sat <= 30) & (~white)
frac = (mn[edge] - 220) / (244 - 220)  # 0..1 càng trắng càng mờ
alpha[edge] = (alpha[edge] * (1 - frac)).astype(np.int16)
a[..., 3] = alpha
out = Image.fromarray(a.astype(np.uint8), "RGBA")

# Trim về bounding box nội dung (alpha > 16)
arr = np.array(out)
ys, xs = np.where(arr[..., 3] > 16)
pad = 8
box = (max(xs.min() - pad, 0), max(ys.min() - pad, 0),
       min(xs.max() + pad, out.width), min(ys.max() + pad, out.height))
logo = out.crop(box)
logo.save(os.path.join(PUB, "logo.png"))
print("logo.png", logo.size)

def fit_center(canvas_size, scale, bg):
    """Đặt logo vào canvas vuông, nền bg (None = trong suốt)."""
    cv = Image.new("RGBA", (canvas_size, canvas_size), bg if bg else (0, 0, 0, 0))
    target = int(canvas_size * scale)
    w, h = logo.size
    ratio = min(target / w, target / h)
    nw, nh = int(w * ratio), int(h * ratio)
    rl = logo.resize((nw, nh), Image.LANCZOS)
    cv.alpha_composite(rl, ((canvas_size - nw) // 2, (canvas_size - nh) // 2))
    return cv

WHITE = (255, 255, 255, 255)
# PWA maskable: nền trắng đầy khung, logo trong vùng an toàn ~74%
fit_center(512, 0.74, WHITE).save(os.path.join(PUB, "icon-512.png"))
fit_center(192, 0.74, WHITE).save(os.path.join(PUB, "icon-192.png"))
# Favicon: nền trong suốt, logo to
fit_center(512, 0.92, None).save(os.path.join(APPDIR, "icon.png"))
# Apple touch: iOS không thích nền trong suốt -> nền trắng
fit_center(180, 0.80, WHITE).save(os.path.join(APPDIR, "apple-icon.png"))
print("icons done")
