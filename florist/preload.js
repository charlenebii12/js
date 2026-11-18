class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");

    // Put global variable here
  }

  preload() {
    Object.keys(MAP_CONFIG).forEach((mapKey) => {
      this.load.tilemapTiledJSON(mapKey, `assets/maps/${mapKey}.json?v=${Date.now()}`);
    });
    this.load.spritesheet("florist", "assets/floristwalking.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("rabbit", "assets/Rabbit.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("horse", "assets/Horse.png", {
      frameWidth: 64,
      frameHeight: 64,
    });
    this.load.spritesheet("goose", "assets/Goose%20.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.spritesheet("npc-idle", "assets/npc-idle.png", {
      frameWidth: 64,
      frameHeight: 64,
    });
    [
      "Exterior_house", "Trees_animation", "Ground_grass", "Road3_ground",
      "Water_coasts", "water", "Flowers_alternative_fit", "exterior",
      "Flowers", "Interior", "Interior_objects",
    ].forEach((asset) => this.load.image(asset, `assets/${asset}.png`));
    this.load.audio("flower-pickup", "assets/flower-pickup.mp3");
  }

  create() {
    const optionalUi = [
      ["ui-story", "story.png"],
      ["ui-title", "title.png"],
      ["ui-rules", "rules.png"],
      ["ui-level-1", "level-1.png"],
      ["ui-level-2", "level-2.png"],
      ["ui-level-3", "level-3.png"],
      ["ui-level-4-complete", "level-4-complete.png"],
      ["ui-voucher", "voucher.jpg"],
    ];
    Promise.all(optionalUi.map(async ([key, file]) => {
      const path = `assets/ui/${file}`;
      try {
        const response = await fetch(path, { method: "HEAD", cache: "no-store" });
        return response.ok ? [key, path] : null;
      } catch (error) {
        return null;
      }
    })).then((available) => {
      const files = available.filter(Boolean);
      if (!files.length) {
        this.scene.start("intro");
        return;
      }
      files.forEach(([key, path]) => this.load.image(key, path));
      this.load.once("complete", () => this.scene.start("intro"));
      this.load.start();
    });
    return;

    console.log("*** preload scene");


    // Check for spacebar or any key here
    var spaceDown = this.input.keyboard.addKey("SPACE");

    // On spacebar event, call the world scene
    spaceDown.on(
      "down",
      function () {
        console.log("Jump to world scene");

        this.scene.start(
          "world",
          // Optional parameters
          {}
        );
      },
      this
    );

    // Add any text in the main page
    this.add.text(90, 600, "Press spacebar to continue", {
      font: "30px Courier",
      fill: "#FFFFFF",
    });

    // Create all the game animations here
  }
}
