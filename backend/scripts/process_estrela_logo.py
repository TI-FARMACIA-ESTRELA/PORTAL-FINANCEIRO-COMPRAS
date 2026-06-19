from pathlib import Path
from PIL import Image

LOGO_SOURCE = Path(
    r"C:\Users\Alex Vauna\AppData\Roaming\Cursor\User\workspaceStorage"
    r"\959cbaa229a8ae7f3c3b151bb442a30f\images"
    r"\WhatsApp Image 2026-06-19 at 13.22.31-0375ec28-db91-4c97-b35b-7b92103f8867.png"
)
OUT_DIR = Path(__file__).resolve().parents[2] / "frontend" / "public" / "images"
OUT = OUT_DIR / "estrela-logo.png"
FAVICON = Path(__file__).resolve().parents[2] / "frontend" / "public" / "favicon.png"


def remove_black_border(img: Image.Image) -> Image.Image:
    rgba = img.convert("RGBA")
    pixels = rgba.load()
    w, h = rgba.size

    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if r < 40 and g < 40 and b < 40:
                pixels[x, y] = (0, 0, 0, 0)

    bbox = rgba.getbbox()
    return rgba.crop(bbox) if bbox else rgba


def build_favicon(logo: Image.Image) -> Image.Image:
    side = 64
    fav = Image.new("RGBA", (side, side), (255, 255, 255, 255))
    scale = min((side - 10) / logo.width, (side - 10) / logo.height)
    new_size = (max(1, int(logo.width * scale)), max(1, int(logo.height * scale)))
    resized = logo.resize(new_size, Image.Resampling.LANCZOS)
    offset = ((side - resized.width) // 2, (side - resized.height) // 2)
    fav.paste(resized, offset, resized)
    return fav


def main() -> None:
    if not LOGO_SOURCE.exists():
        raise SystemExit(f"Logo source not found: {LOGO_SOURCE}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    with Image.open(LOGO_SOURCE) as img:
        cleaned = remove_black_border(img)
        cleaned.save(OUT, format="PNG", optimize=True)
        favicon = build_favicon(cleaned)
        favicon.save(FAVICON, format="PNG", optimize=True)

    print(f"Source: {LOGO_SOURCE}")
    print(f"Logo: {OUT} ({cleaned.size[0]}x{cleaned.size[1]})")
    print(f"Favicon: {FAVICON}")


if __name__ == "__main__":
    main()
