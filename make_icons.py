from PIL import Image, ImageDraw
import os

OUT = "assistant/static/assistant/icons"
os.makedirs(OUT, exist_ok=True)

def make(size):
    img = Image.new("RGB", (size, size), (11, 11, 30))
    d = ImageDraw.Draw(img)

    planet = Image.new("RGB", (size, size))
    px = planet.load()
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size)
            px[x, y] = (int(34 + 158 * t), int(229 - 97 * t), int(229 + 23 * t))
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse(
        [size * 0.28, size * 0.28, size * 0.72, size * 0.72], fill=255)
    img.paste(planet, (0, 0), mask)

    d.ellipse([size * 0.17, size * 0.40, size * 0.83, size * 0.60],
              outline=(255, 224, 138), width=max(2, size // 64))
    img.save(f"{OUT}/icon-{size}.png")

for s in (192, 512):
    make(s)
print("icons created")