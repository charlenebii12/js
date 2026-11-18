const GameState = {
  visitedHouse: false,
  completedLevels: new Set(),
  collected: {},
  inventory: {},
  flowerImages: {},
  score: 0,
  lives: 3,
  reset() {
    this.visitedHouse = false;
    this.completedLevels.clear();
    this.collected = {};
    this.inventory = {};
    this.flowerImages = {};
    this.score = 0;
    this.lives = 3;
  },
};

// These labels describe the flower artwork in the two Tiled atlases. Atlas
// tile positions identify an artwork piece; the player sees the flower name.
const FLOWER_TYPE_NAMES = {
  "Flowers_alternative_fit:2": "Pink Bellflower",
  "Flowers_alternative_fit:6": "Golden Starflower",
  "Flowers_alternative_fit:61": "Blue Iris",
  "Flowers_alternative_fit:62": "White Daisy",
  "Flowers_alternative_fit:81": "Orange Lily",
  "Flowers_alternative_fit:103": "Pink Lily",
  "Flowers_alternative_fit:104": "Bluebell",
  "Flowers_alternative_fit:137": "Golden Daisy",
  "Flowers_alternative_fit:138": "Purple Aster",
  "Flowers_alternative_fit:159": "Violet Aster",
  "Flowers_alternative_fit:161": "Bluebell",
  "Flowers_alternative_fit:163": "Pink Wildflower",
  "Flowers_alternative_fit:175": "Orange Marigold",
  "Flowers_alternative_fit:247": "Purple Clover",
  "Flowers:8": "Pink Bellflower",
  "Flowers:36": "Orange Wildflower",
  "Flowers:44": "Blue Daisy",
  "Flowers:72": "Golden Wildflower",
  "Flowers:78": "Orange Tulip",
  "Flowers:84": "Yellow Daisy",
  "Flowers:102": "Purple Iris",
  "Flowers:108": "Violet Aster",
  "Flowers:113": "Bluebell",
  "Flowers:51": "Pink Wildflower",
  "Flowers:110": "Blue Iris",
  "Flowers:116": "Orange Tulip",
  "Flowers:117": "Golden Daisy",
  "Flowers:120": "Purple Clover",
};

// Small synthesized score keeps the game self-contained and works without
// loading external music files. Audio begins after the player's first input.
const GameAudio = {
  context: null,
  track: "",
  step: 0,
  timer: null,
  unlocked: false,
  ensure() {
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      this.context = new AudioContext();
    }
    if (this.context.state === "suspended") this.context.resume();
    this.unlocked = true;
    return this.context;
  },
  tone(frequency, duration = 0.22, wave = "sine", volume = 0.035, delay = 0) {
    const context = this.ensure();
    if (!context) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.03);
  },
  music(track) {
    this.ensure();
    if (!this.context || this.track === track) return;
    this.track = track;
    this.step = 0;
    if (this.timer) clearInterval(this.timer);
    const patterns = {
      garden: [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 988, 880, 784, 659, 587],
      chat: [392, 494, 587, 494, 440, 523, 659, 523],
      ending: [523, 659, 784, 1047, 988, 784, 880, 1047],
    };
    const melody = patterns[track] || patterns.garden;
    const tick = () => {
      if (!this.unlocked || this.track !== track) return;
      const index = this.step++ % melody.length;
      this.tone(melody[index], track === "ending" ? 0.42 : 0.3, "triangle", 0.025);
      if (index % 4 === 0) this.tone(melody[index] / 2, 0.55, "sine", 0.012);
    };
    tick();
    this.timer = setInterval(tick, track === "ending" ? 420 : 560);
  },
  cue(kind) {
    const cues = {
      collect: [[784, 0], [988, 0.08], [1175, 0.16]],
      hit: [[196, 0], [147, 0.12]],
      next: [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.38]],
    };
    (cues[kind] || []).forEach(([frequency, delay]) =>
      this.tone(frequency, kind === "hit" ? 0.25 : 0.18, kind === "hit" ? "sawtooth" : "triangle", 0.045, delay)
    );
  },
};

function collectedFlowers(mapKey) {
  if (!GameState.collected[mapKey]) GameState.collected[mapKey] = new Set();
  return GameState.collected[mapKey];
}

const GAMEPLAY_RULES = {
  floristL1: { enemies: 1 },
  floristL2: { enemies: 1 },
  floristL2a: { enemies: 2 },
  floristL3: { enemies: 1 },
  floristL3a: { enemies: 0 },
};

// Friendly animals wander the outdoor garden paths in Levels 2 and 3.
const ANIMAL_SPAWNS = {
  floristL2: ["horse", "goose", "goose"],
  floristL2a: ["goose", "horse", "goose"],
  floristL3: ["horse", "horse", "goose"],
  floristL3a: ["goose", "horse", "goose"],
};

const ANIMAL_STATS = {
  horse: { scale: 0.85, bodyWidth: 40, bodyHeight: 16, bodyOffsetX: 12, bodyOffsetY: 40, speed: 45 },
  goose: { scale: 1, bodyWidth: 18, bodyHeight: 10, bodyOffsetX: 7, bodyOffsetY: 18, speed: 55 },
};

// One slow rabbit hops after Lily in Level 3 once she gets close.
const RABBIT_CHASE_MAPS = new Set(["floristL3", "floristL3a"]);
const RABBIT_CHASE = { radius: 210, speed: 40 };

const FLOWER_RANGES = {
  floristL1: [[7931, 8253]],
  // Exterior atlas: flower heads, plus the lower half of the tall pink flower.
  floristL2: [[922, 931], [939, 939]],
  floristL2a: [[970, 1113]],
  floristL3: [[922, 931], [939, 939]],
  floristL3a: [[970, 1113]],
  finalshop: [[1940, 2083]],
};

const DIALOGUE = [
  ["NPC", "Welcome, young florist! I need your help."],
  ["Florist", "Hello! What can I do for you?"],
  ["NPC", "Please collect the flowers in each garden."],
  ["Florist", "Of course! I'll gather them for you."],
  ["NPC", "Watch out for the rabbits along the way."],
  ["Florist", "I'll be careful. See you at the shop."],
];

const FINAL_DIALOGUE = [
  ["NPC", "Congratulations, Lily! You've gathered flowers from every garden."],
  ["Florist", "I did it! My dream flower shop is finally ready."],
  ["NPC", "Welcome to Lily's Bouquet. Your Level 4 adventure is complete!"],
];

// Tiled maps mix walkable decoration (grass, shadows, flower patches) and
// solid furniture in the same visual layers. Only these verified object layers
// receive collision; treating every non-floor tile as solid traps the player.
const COLLISION_LAYERS = {
  floristL1: ["house"],
  houseL1: ["furniture", "dining table"],
  floristL2: ["gate"],
  floristL2a: ["tree2"],
  floristL3: ["gate"],
  floristL3a: ["muhroom"],
  finalshop: ["tableflower"],
};

// These exterior atlas tiles are cobblestone road pieces. Some maps place them
// on a mixed collision layer, so keep the road walkable while retaining its
// other obstacle collisions.
const NON_BLOCKING_TILE_RANGES = {
  floristL2: [[81, 81], [172, 210]],
  floristL3: [[81, 81], [172, 210]],
};

const MAP_CONFIG = {
  floristL1: {
    title: "Level 1 — Florist Street",
    objective: "Collect all flowers, visit the house, then go to Level 2.",
    tilesets: [
      ["Exterior_house", "Exterior_house"],
      ["Trees_animation", "Trees_animation"],
      ["Ground_grass", "Ground_grass"],
      ["Road3_ground", "Road3_ground"],
      ["Water_coasts", "Water_coasts"],
      ["water", "water"],
      ["Flowers_alternative_fit", "Flowers_alternative_fit"],
    ],
  },
  houseL1: {
    title: "Level 1 — Florist House",
    objective: "Talk to the NPC, then return outside.",
    tilesets: [["Interior_objects", "Interior_objects"], ["Interior", "Interior"]],
  },
  floristL2: {
    title: "Level 2 — Garden Path",
    objective: "Cross the garden obstacles and enter the flower field.",
    tilesets: [["exterior", "exterior"]],
  },
  floristL2a: {
    title: "Level 2 — Flower Garden",
    objective: "Collect all flowers, then continue to Level 3.",
    tilesets: [["exterior", "exterior"], ["Flowers", "Flowers"]],
  },
  floristL3: {
    title: "Level 3 — Shop Preparation",
    objective: "Cross the obstacles and enter the final garden.",
    tilesets: [["exterior", "exterior"], ["Exterior_house", "Exterior_house"]],
  },
  floristL3a: {
    title: "Level 3 — Final Garden",
    objective: "Collect all flowers, then open the final shop.",
    tilesets: [["exterior", "exterior"], ["Flowers", "Flowers"]],
  },
  finalshop: {
    title: "Final Shop",
    objective: "Talk to the florist, then use the shop counter.",
    tilesets: [
      ["Exterior_house", "Exterior_house"],
      ["exterior", "exterior"],
      ["Interior", "Interior"],
      ["Flowers", "Flowers"],
      ["Interior_objects", "Interior_objects"],
    ],
  },
};

function propertyValue(object, propertyName) {
  const property = (object.properties || []).find((item) => item.name === propertyName);
  return property ? property.value : undefined;
}

class FloristMapScene extends Phaser.Scene {
  constructor(sceneKey, mapKey) {
    super(sceneKey);
    this.mapKey = mapKey;
    this.activeExit = null;
  }

  init(data) {
    this.entryFrom = data && data.from;
  }

  create() {
    const config = MAP_CONFIG[this.mapKey];
    const map = this.make.tilemap({ key: this.mapKey });
    const tilesets = config.tilesets.map(([mapName, assetKey]) =>
      map.addTilesetImage(mapName, assetKey)
    );

    this.renderedLayers = [];
    map.layers.forEach((layer) => {
      const renderedLayer = map.createLayer(layer.name, tilesets, 0, 0);
      if (renderedLayer) {
        renderedLayer.setDepth(layer.index);
        this.renderedLayers.push(renderedLayer);
      }
    });

    const objects = map.getObjectLayer("objects").objects;
    const returningExit = objects.find((object) =>
      object.name === "exit" && propertyValue(object, "destination") === this.entryFrom
    );
    const spawn = returningExit || objects.find((object) => object.name === "playerSpawn");
    this.player = this.physics.add.sprite(
      spawn.x + (returningExit ? spawn.width / 2 : 16),
      spawn.y + (returningExit ? spawn.height / 2 : 16),
      "florist"
    );
    this.player.setDepth(100);
    this.player.setScale(1.3);
    this.player.body.setSize(18, 16);
    this.player.body.setOffset(7, 16);

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.player.setCollideWorldBounds(true);
    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1.2);

    this.flowersLeft = 0;
    this.enemies = [];
    this.animals = [];
    this.locked = false;
    this.talking = false;
    this.shopOpen = false;
    this.talkLatch = false;
    this.lineIndex = 0;
    this.invulnerableUntil = 0;
    this.knockUntil = 0;
    this.createAnimations();
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys("W,A,S,D");
    this.interactKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    this.inventoryKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.buyKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    this.finishKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    this.isGameOver = false;
    this.addSolidLayerCollisions();
    this.createExitZones(objects.filter((object) => object.name === "exit"));
    this.createFlowers();
    this.createEnemies(map);
    this.createAnimals(map);
    if (this.mapKey === "houseL1" || this.mapKey === "finalshop") this.createNpc(map);
    this.createHud(config);
    this.createInventory();
    this.pickupSound = this.cache.audio.exists("flower-pickup")
      ? this.sound.add("flower-pickup", { volume: 0.65 })
      : null;
    this.input.keyboard.once("keydown", () => GameAudio.music("garden"));
  }

  addSolidLayerCollisions() {
    const names = new Set(COLLISION_LAYERS[this.mapKey] || []);
    this.solidLayers = this.renderedLayers.filter((layer) => names.has(layer.layer.name));
    const excludedTiles = [-1];
    (NON_BLOCKING_TILE_RANGES[this.mapKey] || []).forEach(([start, end]) => {
      for (let gid = start; gid <= end; gid += 1) excludedTiles.push(gid);
    });
    this.solidLayers.forEach((layer) => {
      layer.setCollisionByExclusion(excludedTiles, true);
      layer.forEachTile((tile) => {
        if (this.isFlowerGid(tile.index)) tile.setCollision(false);
      });
      this.physics.add.collider(this.player, layer);
    });
  }

  isFlowerGid(gid) {
    return (FLOWER_RANGES[this.mapKey] || []).some(([start, end]) => gid >= start && gid <= end);
  }

  createAnimations() {
    if (!this.anims.exists("rabbit-walk")) {
      this.anims.create({
        key: "rabbit-walk",
        frames: this.anims.generateFrameNumbers("rabbit", { start: 0, end: 5 }),
        frameRate: 8,
        repeat: -1,
      });
    }
    // The side-view walk cycles live on the third and fourth rows of every
    // animal sheet (right-facing first, then left-facing).
    [["horse", "walk"], ["goose", "walk"], ["rabbit", "hop"]].forEach(([key, action]) => {
      if (!this.textures.exists(key)) return;
      ["right", "left"].forEach((direction, row) => {
        const animationKey = `${key}-${action}-${direction}`;
        if (this.anims.exists(animationKey)) return;
        this.anims.create({
          key: animationKey,
          frames: this.anims.generateFrameNumbers(key, { start: 12 + row * 6, end: 17 + row * 6 }),
          frameRate: 8,
          repeat: -1,
        });
      });
    });
    if (this.anims.exists("florist-down")) return;
    const directions = { down: 0, left: 1, right: 2, up: 3 };
    Object.entries(directions).forEach(([direction, row]) => {
      this.anims.create({
        key: `florist-${direction}`,
        frames: this.anims.generateFrameNumbers("florist", {
          start: row * 6,
          end: row * 6 + 5,
        }),
        frameRate: 8,
        repeat: -1,
      });
    });
  }

  createExitZones(exits) {
    exits.forEach((exit) => {
      const zone = this.add.zone(
        exit.x + exit.width / 2,
        exit.y + exit.height / 2,
        exit.width,
        exit.height
      );
      zone.setData("exit", exit);
      this.physics.add.existing(zone, true);
      this.physics.add.overlap(this.player, zone, () => {
        this.activeExit = exit;
      });

      const marker = this.add.rectangle(
        zone.x,
        zone.y,
        exit.width,
        exit.height,
        0xf8d865,
        0.22
      ).setStrokeStyle(2, 0xffe99b, 0.8);
      marker.setDepth(90);
      this.add.text(zone.x, zone.y - 16, `${this.exitTitle(exit)}\n[E]`, {
        fontFamily: "Arial",
        fontSize: "12px",
        color: "#ffffff",
        backgroundColor: "#263238",
        padding: { x: 4, y: 2 },
        align: "center",
      }).setOrigin(0.5).setDepth(91);
    });
  }

  exitTitle(exit) {
    const destination = propertyValue(exit, "destination");
    const names = {
      houseL1: "HOUSE",
      floristL1: "OUTSIDE",
      floristL2: "LEVEL 2",
      floristL2a: "L2 GARDEN",
      floristL3: "LEVEL 3",
      floristL3a: "L3 GARDEN",
      finalshop: "LEVEL 4",
      ending: "FLORIST",
    };
    return names[destination] || "EXIT";
  }

  createHud(config) {
    const style = {
      fontFamily: "Arial, sans-serif",
      color: "#f4f5eb",
    };
    const width = this.scale.width;
    const height = this.scale.height;
    const worldObjects = this.children.list.filter((child) => (child.depth || 0) < 200);
    const interfaceObjects = this.children.list.filter((child) => (child.depth || 0) >= 200);
    this.hudCamera = this.cameras.add(0, 0, width, height).setScroll(0, 0).setZoom(1);
    this.hudCamera.ignore(worldObjects);
    this.cameras.main.ignore(interfaceObjects);

    const title = this.add.text(18, 14, config.title, {
      ...style, fontSize: "17px", fontStyle: "bold",
    }).setDepth(200);
    const objective = this.add.text(18, 39, config.objective, {
      ...style, fontSize: "12px", color: "#dce6d7", wordWrap: { width: width - 36 },
    }).setDepth(200);
    this.prompt = this.add.text(240, height - 19, "", {
      ...style, fontSize: "12px", color: "#e2eadf", wordWrap: { width: width - 258 },
    }).setOrigin(0, 1).setDepth(200);

    const panelWidth = 208;
    const panelHeight = 112;
    this.statsPanel = this.add.container(16, height - 16).setDepth(220);
    const background = this.add.graphics();
    background.fillStyle(0x142a24, 0.9);
    background.fillRoundedRect(0, -panelHeight, panelWidth, panelHeight, 10);
    background.lineStyle(1, 0xd7e8cf, 0.16);
    background.strokeRoundedRect(0, -panelHeight, panelWidth, panelHeight, 10);
    background.lineStyle(1, 0xd7e8cf, 0.12);
    background.lineBetween(14, -55, panelWidth - 14, -55);
    this.statsPanel.add(background);
    const labelStyle = { fontFamily: "Arial, sans-serif", fontSize: "10px", color: "#a8bbb0" };
    const valueStyle = { fontFamily: "Arial, sans-serif", fontSize: "23px", color: "#f4f5eb" };
    const text = (x, y, value, style) => {
      const item = this.add.text(x, y, value, style);
      this.statsPanel.add(item);
      return item;
    };
    text(14, -98, "SCORE", labelStyle);
    text(112, -98, "LIVES", labelStyle);
    this.scoreValue = text(14, -83, "0", { ...valueStyle, fontSize: "21px" });
    this.livesValue = text(112, -83, "3", { ...valueStyle, fontSize: "21px" });
    text(14, -44, "FLOWERS", labelStyle);
    this.stats = text(panelWidth - 14, -46, "0 / 0", {
      ...valueStyle, fontSize: "14px",
    }).setOrigin(1, 0);
    this.flowerProgress = this.add.graphics();
    this.statsPanel.add(this.flowerProgress);
    this.flowersRemaining = text(14, -13, "", { ...labelStyle, fontSize: "10px" });
    const positionHud = (gameSize) => {
      const gameWidth = gameSize ? gameSize.width : this.scale.width;
      const gameHeight = gameSize ? gameSize.height : this.scale.height;
      this.hudCamera.setViewport(0, 0, gameWidth, gameHeight);
      this.statsPanel.setPosition(16, gameHeight - 16);
      this.prompt.setPosition(240, gameHeight - 19);
    };
    positionHud();
    this.scale.on("resize", positionHud);
    this.events.once("shutdown", () => this.scale.off("resize", positionHud));
    this.cameras.main.ignore([title, objective, this.prompt, this.statsPanel]);
    this.hudCamera.ignore(this.children.list.filter((child) =>
      child !== title && child !== objective && child !== this.prompt && child !== this.statsPanel &&
      !interfaceObjects.includes(child)
    ));
    this.refreshStats();
  }

  // Read each flower tile's pixels so neighbouring plants stay separate even
  // when their map cells touch. A flower may span more than two tile rows.
  flowerTilePixels(tile, cache) {
    if (cache.has(tile.index)) return cache.get(tile.index);
    const tileset = tile.tileset;
    const source = tileset.getTileTextureCoordinates(tile.index);
    const image = tileset.image.getSourceImage();
    const canvas = document.createElement("canvas");
    canvas.width = tile.width;
    canvas.height = tile.height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, source.x, source.y, tile.width, tile.height,
      0, 0, tile.width, tile.height);
    const pixels = context.getImageData(0, 0, tile.width, tile.height).data;
    const result = { canvas, pixels, width: tile.width, height: tile.height };
    cache.set(tile.index, result);
    return result;
  }

  flowerTilesTouch(first, second, dx, dy) {
    // Only join matching neighbouring pieces of the source artwork.
    const a = first.tile;
    const b = second.tile;
    if (a.tileset !== b.tileset || b.index - a.index !== dx + dy * a.tileset.columns) return false;
    const edgeLength = dx ? first.height : first.width;
    for (let offset = 0; offset < edgeLength; offset += 1) {
      for (let shift = -1; shift <= 1; shift += 1) {
        const other = offset + shift;
        if (other < 0 || other >= edgeLength) continue;
        const ax = dx ? (dx > 0 ? first.width - 1 : 0) : offset;
        const ay = dy ? (dy > 0 ? first.height - 1 : 0) : offset;
        const bx = dx ? (dx > 0 ? 0 : second.width - 1) : other;
        const by = dy ? (dy > 0 ? 0 : second.height - 1) : other;
        if (first.pixels[(ay * first.width + ax) * 4 + 3] > 0 &&
            second.pixels[(by * second.width + bx) * 4 + 3] > 0) return true;
      }
    }
    return false;
  }

  createFlowers() {
    this.flowersTotal = 0;
    this.flowersLeft = 0;
    this.flowerPickups = [];
    const pixels = new Map();
    const plants = [];
    this.renderedLayers.forEach((layer, layerIndex) => {
      const cells = new Map();
      layer.forEachTile((tile) => {
        if (!this.isFlowerGid(tile.index)) return;
        const artwork = this.flowerTilePixels(tile, pixels);
        // Empty atlas tiles are not collectible flowers.
        const visible = artwork.pixels.some((value, index) => index % 4 === 3 && value > 0);
        if (visible) cells.set(`${tile.x},${tile.y}`, { ...artwork, tile, layer, layerIndex });
        else layer.removeTileAt(tile.x, tile.y);
      });
      const visited = new Set();
      cells.forEach((cell, key) => {
        if (visited.has(key)) return;
        const plant = [cell];
        visited.add(key);
        for (let index = 0; index < plant.length; index += 1) {
          const current = plant[index];
          [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
            const nextKey = `${current.tile.x + dx},${current.tile.y + dy}`;
            const next = cells.get(nextKey);
            if (!next || visited.has(nextKey) || !this.flowerTilesTouch(current, next, dx, dy)) return;
            visited.add(nextKey);
            plant.push(next);
          });
        }
        plants.push(plant);
      });
    });
    const saved = collectedFlowers(this.mapKey);
    plants.forEach((plant) => {
      const left = Math.min(...plant.map((cell) => cell.tile.pixelX));
      const top = Math.min(...plant.map((cell) => cell.tile.pixelY));
      const right = Math.max(...plant.map((cell) => cell.tile.pixelX + cell.width));
      const bottom = Math.max(...plant.map((cell) => cell.tile.pixelY + cell.height));
      const id = `${plant[0].layerIndex}:${left},${top}`;
      const representative = plant.reduce((lowest, cell) =>
        cell.tile.index < lowest.tile.index ? cell : lowest
      , plant[0]);
      const flowerType = `${representative.tile.tileset.name}:${representative.tile.index - representative.tile.tileset.firstgid}`;
      const textureKey = `flower:${this.mapKey}:${id}`;
      if (!saved.has(id) && !this.textures.exists(textureKey)) {
        const texture = this.textures.createCanvas(textureKey, right - left, bottom - top);
        plant.forEach((cell) => {
          texture.context.drawImage(cell.canvas, cell.tile.pixelX - left, cell.tile.pixelY - top);
        });
        texture.refresh();
      }
      // Replace the original map art with one independent physical flower.
      plant.forEach((cell) => cell.layer.removeTileAt(cell.tile.x, cell.tile.y));
      if (saved.has(id)) return;
      const flower = this.physics.add.staticImage(left, top, textureKey)
        .setOrigin(0).setScale(0.72);
      flower.setDepth(plant[0].layer.depth).refreshBody();
      flower.setData("id", id);
      flower.setData("flowerType", flowerType);
      this.flowerPickups.push(flower);
    });
    this.flowersTotal = plants.length;
    this.flowersLeft = this.flowerPickups.length;
    if (this.flowersLeft) {
      this.physics.add.overlap(this.player, this.flowerPickups, this.collectFlower, null, this);
    }
    this.refreshStats();
  }

  openWalkableSpots(map) {
    const spots = [];
    for (let y = 2; y < map.height - 2; y += 2) {
      for (let x = 2; x < map.width - 2; x += 2) {
        const blocked = this.solidLayers.some((layer) => {
          const tile = layer.getTileAt(x, y);
          return tile && tile.collides;
        });
        const flower = this.flowerPickups.some((pickup) =>
          pickup.body.hitTest(x * map.tileWidth + 16, y * map.tileHeight + 16)
        );
        if (!blocked && !flower) spots.push({ x: x * 32 + 16, y: y * 32 + 16 });
      }
    }
    return spots;
  }

  createEnemies(map) {
    const count = (GAMEPLAY_RULES[this.mapKey] || {}).enemies || 0;
    const chases = RABBIT_CHASE_MAPS.has(this.mapKey);
    this.enemies = [];
    if (!count) return;
    const spots = this.openWalkableSpots(map);
    for (let index = 0; index < count; index += 1) {
      const spot = spots[Math.floor(((index + 1) * spots.length) / (count + 1))] || { x: 180, y: 180 };
      const rabbit = this.physics.add.sprite(spot.x, spot.y, "rabbit");
      rabbit.setDepth(120);
      rabbit.body.setSize(18, 14);
      rabbit.body.setOffset(7, 12);
      rabbit.setCollideWorldBounds(true);
      rabbit.setData("homeX", spot.x);
      rabbit.setData("range", 70 + index * 24);
      rabbit.setData("speed", 60 + index * 18);
      rabbit.setData("direction", index % 2 ? -1 : 1);
      if (chases) {
        rabbit.setData("chaser", true);
        rabbit.setData("chaseSpeed", RABBIT_CHASE.speed + index * 12);
        rabbit.play(`rabbit-hop-${index % 2 ? "left" : "right"}`);
      } else {
        rabbit.play("rabbit-walk");
      }
      this.solidLayers.forEach((layer) => this.physics.add.collider(rabbit, layer));
      this.enemies.push(rabbit);
    }
    this.physics.add.overlap(this.player, this.enemies, this.hitEnemy, null, this);
  }

  createAnimals(map) {
    const animals = ANIMAL_SPAWNS[this.mapKey] || [];
    this.animals = [];
    if (!animals.length) return;
    const spots = this.openWalkableSpots(map).filter((spot) =>
      Phaser.Math.Distance.Between(spot.x, spot.y, this.player.x, this.player.y) > 160
    );
    animals.forEach((key, index) => {
      if (!this.textures.exists(key)) return;
      const stats = ANIMAL_STATS[key];
      const spot = spots[Math.floor(((index + 1) * spots.length) / (animals.length + 1))] || { x: 180, y: 180 };
      const animal = this.physics.add.sprite(spot.x, spot.y, key);
      animal.setDepth(95);
      animal.setScale(stats.scale);
      animal.body.setSize(stats.bodyWidth, stats.bodyHeight);
      animal.body.setOffset(stats.bodyOffsetX, stats.bodyOffsetY);
      animal.setCollideWorldBounds(true);
      animal.setData("homeX", spot.x);
      animal.setData("range", 80 + index * 18);
      animal.setData("speed", stats.speed + index * 6);
      animal.setData("direction", index % 2 ? -1 : 1);
      animal.play(`${key}-walk-${index % 2 ? "left" : "right"}`);
      this.solidLayers.forEach((layer) => this.physics.add.collider(animal, layer));
      this.animals.push(animal);
    });
  }

  collectFlower(player, flower) {
    if (!flower.active) return;
    collectedFlowers(this.mapKey).add(flower.getData("id"));
    const type = flower.getData("flowerType");
    GameState.inventory[type] = (GameState.inventory[type] || 0) + 1;
    if (!GameState.flowerImages[type]) GameState.flowerImages[type] = flower.texture.key;
    flower.destroy();
    this.flowersLeft -= 1;
    GameState.score += 10;
    if (this.pickupSound) {
      if (this.pickupSound.isPlaying) this.pickupSound.stop();
      this.pickupSound.play();
    } else {
      GameAudio.cue("collect");
    }
    this.refreshInventory();
    this.refreshStats();
    if (this.flowersLeft === 0) this.prompt.setText("All flowers collected. The next exit is unlocked.");
  }

  hitEnemy(player, enemy) {
    if (this.locked || this.time.now < this.invulnerableUntil) return;
    this.invulnerableUntil = this.time.now + 1000;
    this.knockUntil = this.time.now + 200;
    GameState.lives -= 1;
    GameAudio.cue("hit");
    const dx = Math.sign(player.x - enemy.x) || 1;
    const dy = Math.sign(player.y - enemy.y) || 0;
    player.setVelocity(dx * 220, dy * 220);
    player.setTint(0xff7777);
    this.time.delayedCall(180, () => player.active && player.clearTint());
    this.refreshStats();
    if (enemy.getData("chaser")) this.dismissRabbit(enemy);
    if (GameState.lives > 0) return;
    this.locked = true;
    this.isGameOver = true;
    player.setVelocity(0, 0);
    this.prompt.setText("GAME OVER — You ran out of lives.");
    const panel = this.add.container(320, 320).setDepth(500).setScrollFactor(0);
    panel.add(this.add.rectangle(0, 0, 470, 220, 0x10231b, 0.96)
      .setStrokeStyle(3, 0xc6dfa0));
    panel.add(this.add.text(0, -54, "GAME OVER", {
      fontFamily: "Arial", fontSize: "40px", fontStyle: "bold", color: "#ffcf87",
    }).setOrigin(0.5));
    panel.add(this.add.text(0, 2, "You ran out of lives.", {
      fontFamily: "Arial", fontSize: "20px", color: "#ffffff",
    }).setOrigin(0.5));
    panel.add(this.add.text(0, 70, "Returning to the main menu...", {
      fontFamily: "Arial", fontSize: "16px", color: "#c6dfa0",
    }).setOrigin(0.5));
    this.hudCamera.ignore(panel);
    this.time.delayedCall(1800, () => window.location.reload());
  }

  dismissRabbit(rabbit) {
    const index = this.enemies.indexOf(rabbit);
    if (index !== -1) this.enemies.splice(index, 1);
    rabbit.setVelocity(0, 0);
    rabbit.anims.stop();
    rabbit.body.enable = false;
    this.tweens.add({
      targets: rabbit,
      alpha: 0,
      scale: rabbit.scale * 0.4,
      duration: 320,
      ease: "Quad.easeIn",
      onComplete: () => rabbit.destroy(),
    });
  }

  createInventory() {
    const width = this.scale.width;
    this.inventoryPanel = this.add.container(width - 18, 74).setDepth(260).setVisible(false);
    const bg = this.add.graphics();
    bg.fillStyle(0x172b24, 0.97);
    bg.fillRoundedRect(-294, 0, 294, 450, 12);
    bg.lineStyle(2, 0xc6dfa0, 0.8);
    bg.strokeRoundedRect(-294, 0, 294, 450, 12);
    this.inventoryPanel.add(bg);
    const heading = this.add.text(-274, 16, "FLOWER BAG", {
      fontFamily: "Arial", fontSize: "20px", fontStyle: "bold", color: "#f4f5eb",
    });
    const subheading = this.add.text(-274, 45, "Collected flowers", {
      fontFamily: "Arial", fontSize: "12px", color: "#b8cfb9",
    });
    this.inventoryRowsContainer = this.add.container(0, 0);
    const hint = this.add.text(-274, 418, "Press R to close", {
      fontFamily: "Arial", fontSize: "12px", color: "#c6dfa0",
    });
    this.inventoryPanel.add([heading, subheading, this.inventoryRowsContainer, hint]);
    this.cameras.main.ignore(this.inventoryPanel);
    this.refreshInventory();
  }

  refreshInventory() {
    if (!this.inventoryRowsContainer) return;
    this.inventoryRowsContainer.removeAll(true);
    const countsByName = {};
    Object.entries(GameState.inventory).forEach(([type, count]) => {
      const name = FLOWER_TYPE_NAMES[type] || "Garden Flower";
      if (!countsByName[name]) countsByName[name] = { count: 0, texture: GameState.flowerImages[type] };
      countsByName[name].count += count;
      if (!countsByName[name].texture) countsByName[name].texture = GameState.flowerImages[type];
    });
    const types = Object.keys(countsByName).sort();
    if (!types.length) {
      this.inventoryRowsContainer.add(this.add.text(-274, 80, "Your bag is empty.\nCollect flowers to add them here.", {
        fontFamily: "Arial", fontSize: "14px", color: "#ffffff", lineSpacing: 8,
      }));
      return;
    }
    types.forEach((name, index) => {
      const y = 78 + index * 34;
      const item = countsByName[name];
      if (item.texture && this.textures.exists(item.texture)) {
        const source = this.textures.get(item.texture).getSourceImage();
        const icon = this.add.image(-260, y + 12, item.texture);
        const scale = Math.min(32 / source.width, 32 / source.height);
        icon.setScale(scale);
        this.inventoryRowsContainer.add(icon);
      }
      this.inventoryRowsContainer.add(this.add.text(-238, y, `${name}   × ${item.count}`, {
        fontFamily: "Arial", fontSize: "14px", color: "#ffffff",
      }));
    });
  }

  refreshStats() {
    // Flowers initialize before the HUD so the fixed-screen camera can be
    // created after world objects. Defer the first refresh until the HUD exists.
    if (!this.scoreValue) return;
    const total = this.flowersTotal || 0;
    const remaining = this.flowersLeft || 0;
    const collected = total - remaining;
    this.scoreValue.setText(String(GameState.score));
    this.livesValue.setText(String(GameState.lives));
    this.stats.setText(`${collected} / ${total}`);
    this.flowersRemaining.setText(total ? `${remaining} left to collect` : "No flowers in this area");
    this.flowerProgress.clear();
    this.flowerProgress.fillStyle(0xffffff, 0.12);
    this.flowerProgress.fillRoundedRect(14, -27, 180, 4, 2);
    if (collected > 0 && total > 0) {
      this.flowerProgress.fillStyle(0xc6dfa0, 1);
      this.flowerProgress.fillRoundedRect(14, -27, 180 * collected / total, 4, 2);
    }
  }

  createNpc(map) {
    const start = {
      x: Math.floor(this.player.x / map.tileWidth),
      y: Math.floor(this.player.y / map.tileHeight),
    };
    const target = {
      x: Math.floor(map.width / 2),
      y: Math.floor(map.height / 2),
    };
    const queue = [start];
    const visited = new Set([`${start.x},${start.y}`]);
    const candidates = [];
    while (queue.length) {
      const current = queue.shift();
      candidates.push(current);
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => {
        const x = current.x + dx;
        const y = current.y + dy;
        const key = `${x},${y}`;
        const blocked = this.solidLayers.some((layer) => layer.getTileAt(x, y));
        if (x < 1 || y < 1 || x >= map.width - 1 || y >= map.height - 1 || blocked || visited.has(key)) return;
        visited.add(key);
        queue.push({ x, y });
      });
    }
    candidates.sort((a, b) =>
      Phaser.Math.Distance.Between(a.x, a.y, target.x, target.y) -
      Phaser.Math.Distance.Between(b.x, b.y, target.x, target.y)
    );
    const tile = candidates[0] || start;
    const spot = { x: tile.x * map.tileWidth + 16, y: tile.y * map.tileHeight + 16 };
    if (!this.anims.exists("npc-idle-down")) {
      this.anims.create({
        key: "npc-idle-down",
        frames: this.anims.generateFrameNumbers("npc-idle", { start: 0, end: 11 }),
        frameRate: 6,
        repeat: -1,
      });
    }
    this.npc = this.physics.add.sprite(spot.x, spot.y, "npc-idle", 0).setDepth(120);
    this.npc.setOrigin(0.5, 0.72);
    this.npc.setScale(0.72);
    this.npc.play("npc-idle-down");
    this.npc.setImmovable(true);
    this.npc.body.setSize(28, 16);
    this.npc.body.setOffset(18, 40);
    this.physics.add.collider(this.player, this.npc);
    this.add.text(spot.x, spot.y - 30, "NPC", {
      fontFamily: "Arial", fontSize: "13px", color: "#ffe27a",
      backgroundColor: "#263238", padding: { x: 4, y: 2 },
    }).setOrigin(0.5).setDepth(121);
    this.dialoguePanel = this.add.rectangle(320, 500, 580, 110, 0x1b2430, 0.96)
      .setStrokeStyle(3, 0xffe27a).setScrollFactor(0).setDepth(300).setVisible(false);
    this.dialogueName = this.add.text(50, 458, "", {
      fontFamily: "Arial", fontSize: "16px", color: "#ffe27a",
    }).setScrollFactor(0).setDepth(301).setVisible(false);
    this.dialogueBody = this.add.text(50, 486, "", {
      fontFamily: "Arial", fontSize: "18px", color: "#ffffff", wordWrap: { width: 540 },
    }).setScrollFactor(0).setDepth(301).setVisible(false);
    this.shopPanel = this.add.rectangle(320, 320, 500, 240, 0x1b2430, 0.97)
      .setStrokeStyle(3, 0xffe27a).setScrollFactor(0).setDepth(300).setVisible(false);
    this.shopText = this.add.text(320, 320, "", {
      fontFamily: "Arial", fontSize: "17px", color: "#ffffff", align: "center", lineSpacing: 7,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(301).setVisible(false);
  }

  startTalk() {
    GameAudio.music("chat");
    this.currentDialogue = this.mapKey === "finalshop" ? FINAL_DIALOGUE : DIALOGUE;
    this.talking = true;
    this.lineIndex = 0;
    this.player.setVelocity(0, 0);
    this.showLine();
  }

  showLine() {
    const [name, text] = this.currentDialogue[this.lineIndex];
    this.dialogueName.setText(name).setVisible(true);
    this.dialogueBody.setText(text).setVisible(true);
    this.dialoguePanel.setVisible(true);
  }

  advanceTalk() {
    if (this.lineIndex < this.currentDialogue.length - 1) {
      this.lineIndex += 1;
      this.showLine();
      return;
    }
    this.talking = false;
    this.talkLatch = true;
    this.dialoguePanel.setVisible(false);
    this.dialogueName.setVisible(false);
    this.dialogueBody.setVisible(false);
    if (this.mapKey === "finalshop") {
      GameAudio.music("ending");
      this.scene.start("ending");
      return;
    }
    GameAudio.music("garden");
  }

  openShop() {
    this.talking = false;
    this.shopOpen = true;
    this.refreshShop();
    this.shopPanel.setVisible(true);
    this.shopText.setVisible(true);
  }

  refreshShop(status = "") {
    this.shopText.setText(
      `Flower Shop\n\nScore ${GameState.score}    Lives ${GameState.lives}\n\n` +
      "1 — Spend 20 score for +1 life (max 5)\n" +
      "Enter — Finish the game\nE — Close shop" +
      (status ? `\n\n${status}` : "")
    );
  }

  movingLeft() { return this.cursors.left.isDown || this.keys.A.isDown; }
  movingRight() { return this.cursors.right.isDown || this.keys.D.isDown; }
  movingUp() { return this.cursors.up.isDown || this.keys.W.isDown; }
  movingDown() { return this.cursors.down.isDown || this.keys.S.isDown; }

  update() {
    if (this.locked) {
      this.player.setVelocity(0, 0);
      return;
    }
    if (this.talking) {
      this.player.body.setVelocity(0);
      this.prompt.setText("Press E to continue");
      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) this.advanceTalk();
      return;
    }
    if (this.shopOpen) {
      this.player.body.setVelocity(0);
      this.prompt.setText("1: buy life   Enter: finish   E: close");
      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        this.shopOpen = false;
        this.shopPanel.setVisible(false);
        this.shopText.setVisible(false);
      } else if (Phaser.Input.Keyboard.JustDown(this.buyKey)) {
        if (GameState.lives >= 5) this.refreshShop("Lives are already full.");
        else if (GameState.score < 20) this.refreshShop("Not enough score.");
        else {
          GameState.score -= 20;
          GameState.lives += 1;
          this.refreshStats();
          this.refreshShop("Bought 1 life.");
        }
      } else if (Phaser.Input.Keyboard.JustDown(this.finishKey)) {
        GameAudio.music("ending");
        this.scene.start("ending");
      }
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.inventoryKey)) {
      this.inventoryPanel.setVisible(!this.inventoryPanel.visible);
    }
    const npcDistance = this.npc
      ? Phaser.Math.Distance.Between(this.player.x, this.player.y, this.npc.x, this.npc.y)
      : 999;
    if (npcDistance > 90) this.talkLatch = false;
    if (this.npc && !this.talkLatch && npcDistance < 48) {
      this.startTalk();
      return;
    }
    if (this.mapKey === "finalshop" && this.talkLatch && npcDistance < 48 && Phaser.Input.Keyboard.JustDown(this.interactKey)) {
      this.openShop();
      return;
    }

    this.activeExit = null;
    const body = this.player.body;
    if (this.time.now >= this.knockUntil) {
      body.setVelocity(0);
      let animation = null;
      const speed = 175;
      if (this.movingLeft()) {
        body.setVelocityX(-speed);
        animation = "florist-left";
      } else if (this.movingRight()) {
        body.setVelocityX(speed);
        animation = "florist-right";
      }
      if (this.movingUp()) {
        body.setVelocityY(-speed);
        animation = "florist-up";
      } else if (this.movingDown()) {
        body.setVelocityY(speed);
        animation = "florist-down";
      }
      if (body.velocity.length() > speed) body.velocity.normalize().scale(speed);
      if (animation) this.player.anims.play(animation, true);
      else this.player.anims.stop();
    }

    this.enemies.forEach((enemy) => {
      if (enemy.getData("chaser")) {
        const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y);
        if (distance < RABBIT_CHASE.radius) {
          const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
          const speed = enemy.getData("chaseSpeed");
          enemy.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
          enemy.anims.timeScale = 0.45;
          enemy.anims.play(`rabbit-hop-${Math.cos(angle) >= 0 ? "right" : "left"}`, true);
          return;
        }
      }
      enemy.anims.timeScale = 1;
      const direction = enemy.getData("direction");
      const homeX = enemy.getData("homeX");
      const range = enemy.getData("range");
      if (enemy.x >= homeX + range) enemy.setData("direction", -1);
      if (enemy.x <= homeX - range) enemy.setData("direction", 1);
      enemy.setVelocityX(enemy.getData("direction") * enemy.getData("speed"));
      if (enemy.getData("chaser")) {
        enemy.anims.play(`rabbit-hop-${enemy.getData("direction") > 0 ? "right" : "left"}`, true);
      } else {
        enemy.setFlipX(enemy.getData("direction") < 0);
      }
    });

    this.animals.forEach((animal) => {
      const homeX = animal.getData("homeX");
      const range = animal.getData("range");
      if (animal.x >= homeX + range) animal.setData("direction", -1);
      if (animal.x <= homeX - range) animal.setData("direction", 1);
      const direction = animal.getData("direction");
      animal.setVelocityX(direction * animal.getData("speed"));
      animal.anims.play(`${animal.texture.key}-walk-${direction > 0 ? "right" : "left"}`, true);
    });

    // Overlap callbacks run during the physics step; query zones as a reliable
    // fallback after movement to keep the prompt responsive.
    const exits = this.children.list
      .filter((child) => child.getData && child.getData("exit"))
      .map((child) => child.getData("exit"));
    this.activeExit = exits.find((exit) =>
      Phaser.Geom.Rectangle.Contains(
        new Phaser.Geom.Rectangle(exit.x, exit.y, exit.width, exit.height),
        this.player.x,
        this.player.y
      )
    ) || null;

    if (this.activeExit) {
      this.prompt.setText(`[E] ${propertyValue(this.activeExit, "label")}     R: Flower Bag`);
      if (Phaser.Input.Keyboard.JustDown(this.interactKey)) {
        this.leaveMap(propertyValue(this.activeExit, "destination"));
      }
    } else {
      this.prompt.setText("Move: Arrow keys / WASD     R: Flower Bag");
    }
  }

  leaveMap(destination) {
    if (this.mapKey === "houseL1") GameState.visitedHouse = true;
    if (destination === "floristL2") {
      if (this.flowersLeft > 0) {
        this.prompt.setText(`Collect all flowers first (${this.flowersLeft} left).`);
        return;
      }
      if (!GameState.visitedHouse) {
        this.prompt.setText("Visit the house before continuing to Level 2.");
        return;
      }
    }
    if (this.mapKey === "floristL2a" && this.flowersLeft > 0) {
      this.prompt.setText(`Collect all flowers first (${this.flowersLeft} left).`);
      return;
    }
    if (this.mapKey === "floristL3a" && this.flowersLeft > 0) {
      this.prompt.setText(`Collect all flowers first (${this.flowersLeft} left).`);
      return;
    }
    if (destination === "ending") {
      if (!this.talkLatch) this.startTalk();
      else this.openShop();
      return;
    }
    GameAudio.cue("next");
    const nextLevel = { floristL2: 2, floristL3: 3, finalshop: 4 }[destination];
    if (nextLevel) {
      this.scene.start("levelIntro", { level: nextLevel, destination, from: this.mapKey });
      return;
    }
    this.scene.start(destination, { from: this.mapKey });
  }
}
