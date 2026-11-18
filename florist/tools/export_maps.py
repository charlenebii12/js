"""Export the florist TMX source maps to self-contained Tiled JSON for Phaser.

Run from the florist directory:
    python3 tools/export_maps.py
"""

from __future__ import annotations

import base64
import json
import struct
import xml.etree.ElementTree as ET
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets"
DESTINATION = SOURCE / "maps"

EXITS = {
    "floristL1": [
        ("houseL1", "Enter the house", 448, 448, 128, 128),
        ("floristL2", "Continue to Level 2", 864, 864, 96, 96),
    ],
    "houseL1": [("floristL1", "Return outside", 288, 544, 96, 64)],
    "floristL2": [("floristL2a", "Explore the Level 2 garden", 832, 832, 96, 96)],
    "floristL2a": [("floristL3", "Continue to Level 3", 832, 832, 96, 96)],
    "floristL3": [
        ("finalshop", "Enter the shop", 320, 288, 64, 48),
        ("floristL3a", "Enter the Level 3 garden", 832, 832, 96, 96),
    ],
    "floristL3a": [("finalshop", "Open the finished flower shop", 832, 832, 96, 96)],
    "finalshop": [("ending", "Talk to the florist", 288, 288, 96, 96)],
}


def attribute(element: ET.Element, name: str, default=0):
    return element.get(name, default)


def integer(element: ET.Element, name: str, default=0) -> int:
    return int(attribute(element, name, default))


def parse_tileset(map_path: Path, element: ET.Element) -> dict:
    firstgid = integer(element, "firstgid")
    if element.get("source"):
        root = ET.parse(map_path.parent / element.get("source")).getroot()
    else:
        root = element
    image = root.find("image")
    return {
        "columns": integer(root, "columns"),
        "firstgid": firstgid,
        "image": image.get("source"),
        "imageheight": integer(image, "height"),
        "imagewidth": integer(image, "width"),
        "margin": integer(root, "margin"),
        "name": root.get("name"),
        "spacing": integer(root, "spacing"),
        "tilecount": integer(root, "tilecount"),
        "tileheight": integer(root, "tileheight"),
        "tilewidth": integer(root, "tilewidth"),
    }


def parse_layer(element: ET.Element, width: int, height: int) -> dict:
    data = element.find("data")
    encoding = data.get("encoding")
    raw = "".join(data.text.split())
    if encoding == "csv":
        values = [int(value) for value in raw.split(",") if value]
    elif encoding == "base64":
        binary = base64.b64decode(raw)
        values = list(struct.unpack(f"<{width * height}I", binary))
    else:
        raise ValueError(f"Unsupported map encoding: {encoding}")

    return {
        "data": values,
        "height": height,
        "id": integer(element, "id"),
        "name": element.get("name", ""),
        "opacity": 1,
        "type": "tilelayer",
        "visible": element.get("visible", "1") != "0",
        "width": width,
        "x": 0,
        "y": 0,
    }


def export_map(source: Path) -> None:
    root = ET.parse(source).getroot()
    width = integer(root, "width")
    height = integer(root, "height")
    layers = [parse_layer(layer, width, height) for layer in root.findall("layer")]

    objects = [{
        "height": 32,
        "id": 1,
        "name": "playerSpawn",
        "rotation": 0,
        "type": "",
        "visible": True,
        "width": 32,
        "x": 96,
        "y": 96,
    }]
    for index, (destination, label, x, y, object_width, object_height) in enumerate(
        EXITS[source.stem], start=2
    ):
        objects.append({
            "height": object_height,
            "id": index,
            "name": "exit",
            "properties": [
                {"name": "destination", "type": "string", "value": destination},
                {"name": "label", "type": "string", "value": label},
            ],
            "rotation": 0,
            "type": "",
            "visible": True,
            "width": object_width,
            "x": x,
            "y": y,
        })

    layers.append({
        "draworder": "topdown",
        "id": max((layer["id"] for layer in layers), default=0) + 1,
        "name": "objects",
        "objects": objects,
        "opacity": 1,
        "type": "objectgroup",
        "visible": True,
        "x": 0,
        "y": 0,
    })

    output = {
        "height": height,
        "infinite": False,
        "layers": layers,
        "nextlayerid": len(layers) + 1,
        "nextobjectid": len(objects) + 1,
        "orientation": root.get("orientation"),
        "renderorder": root.get("renderorder"),
        "tileheight": integer(root, "tileheight"),
        "tilesets": [parse_tileset(source, tileset) for tileset in root.findall("tileset")],
        "tilewidth": integer(root, "tilewidth"),
        "type": "map",
        "version": "1.10",
        "width": width,
    }

    DESTINATION.mkdir(exist_ok=True)
    (DESTINATION / f"{source.stem}.json").write_text(json.dumps(output, indent=2))


for map_file in EXITS:
    export_map(SOURCE / f"{map_file}.tmx")
