#!/usr/bin/env python3

from __future__ import annotations

import argparse
import sys
from pathlib import Path

PANEL_WIDTHS_PX = (960, 1600, 2400)
DEFAULT_QUALITY = 80
JPEG_BACKGROUND = (255, 255, 255)


def parse_widths(raw: str) -> tuple[int, ...]:
    widths: list[int] = []
    for part in raw.split(","):
        piece = part.strip()
        if not piece:
            continue
        width = int(piece)
        if width < 1:
            raise argparse.ArgumentTypeError(f"width must be positive, got {width}")
        widths.append(width)
    if not widths:
        raise argparse.ArgumentTypeError("give at least one width")
    return tuple(dict.fromkeys(widths))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Write panel photos at fixed pixel widths from one master. "
            "The number in each filename is that file's real width. "
            "A target wider than the master is skipped, never upscaled. "
            "Needs Pillow: pip install pillow"
        )
    )
    parser.add_argument(
        "photos",
        nargs="+",
        type=Path,
        help="Master photo, any size",
    )
    parser.add_argument(
        "--out",
        type=Path,
        help="Directory for the written files. Default: beside each master",
    )
    parser.add_argument(
        "--widths",
        type=parse_widths,
        default=PANEL_WIDTHS_PX,
        help="Comma-separated pixel widths (default: 960,1600,2400)",
    )
    parser.add_argument(
        "--format",
        choices=("webp", "jpeg"),
        default="webp",
        help="Output format (default: webp)",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=DEFAULT_QUALITY,
        help=f"Encoder quality 1–100 (default: {DEFAULT_QUALITY})",
    )
    return parser


def flatten_to_rgb(image):
    from PIL import Image

    if image.mode == "RGB":
        return image
    if image.mode == "RGBA":
        background = Image.new("RGB", image.size, JPEG_BACKGROUND)
        background.paste(image, mask=image.getchannel("A"))
        return background
    return image.convert("RGB")


def resize_to_width(image, width: int):
    from PIL import Image

    if image.width == width:
        return image.copy()
    height = max(1, round(image.height * (width / image.width)))
    return image.resize((width, height), Image.Resampling.LANCZOS)


def save_image(image, path: Path, image_format: str, quality: int) -> None:
    if image_format == "webp":
        image.save(path, format="WEBP", quality=quality, method=6)
        return
    image.save(
        path,
        format="JPEG",
        quality=quality,
        optimize=True,
        progressive=True,
    )


def widths_that_fit(source_width: int, targets: tuple[int, ...]) -> list[int]:
    return [width for width in targets if width <= source_width]


def export_photo(
    source: Path,
    out_dir: Path | None,
    targets: tuple[int, ...],
    image_format: str,
    quality: int,
) -> int:
    from PIL import Image, ImageOps, UnidentifiedImageError

    destination_dir = out_dir if out_dir is not None else source.parent
    destination_dir.mkdir(parents=True, exist_ok=True)

    try:
        opened = Image.open(source)
    except (UnidentifiedImageError, OSError) as error:
        print(f"{source}: {error}", file=sys.stderr)
        return 1

    with opened:
        image = flatten_to_rgb(ImageOps.exif_transpose(opened))

    fitted = widths_that_fit(image.width, targets)
    if not fitted:
        print(
            f"{source}: {image.width}px wide is narrower than every target "
            f"({', '.join(str(width) for width in targets)}). Nothing written.",
            file=sys.stderr,
        )
        return 1

    skipped = [width for width in targets if width > image.width]
    if skipped:
        print(
            f"{source}: skipped {', '.join(str(width) for width in skipped)}px "
            f"(master is {image.width}px, no upscale)",
            file=sys.stderr,
        )

    for width in fitted:
        resized = resize_to_width(image, width)
        path = destination_dir / f"{source.stem}-{width}.{image_format}"
        save_image(resized, path, image_format, quality)
        print(f"{path}  {resized.width}x{resized.height}")

    return 0


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    if not 1 <= args.quality <= 100:
        parser.error("--quality must be from 1 to 100")

    try:
        import PIL  # noqa: F401
    except ImportError:
        print("Pillow is missing. Install it with: pip install pillow", file=sys.stderr)
        return 1

    failures = 0
    for photo in args.photos:
        if not photo.is_file():
            print(f"{photo}: not a file", file=sys.stderr)
            failures += 1
            continue
        failures += export_photo(
            photo,
            args.out,
            args.widths,
            args.format,
            args.quality,
        )
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
