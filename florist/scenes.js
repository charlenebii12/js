class IntroScene extends Phaser.Scene {
  constructor() {
    super("intro");
    this.page = 0;
  }

  create() {
    GameState.reset();
    this.page = 0;
    this.pages = [
      ["story", "A LITTLE DREAM BEGINS...", "Once upon a time, Lily dreamed of becoming a florist.\n\nLily arrived at a small garden, hoping to create a beautiful flower collection.\nDetermined to make this dream come true,\nshe discovered special flower seeds hidden in different places.\n\nExplore different environments, collect flowers,\navoid obstacles, and bring the garden to life."],
      ["title", "SEED OF BLOOM", "by Charlene Ho Jia Ying"],
      ["rules", "IMPORTANT RULES", "•  Do not touch enemies.\n\n•  Collect the required flowers before leaving each level.\n\n•  Avoid obstacles and dangerous areas.\n\n•  Reach the exit to unlock the next level.\n\n•  Complete all four levels to finish your flower adventure.\n\nPress R anytime to open your Flower Bag and check the flower types and quantities you've collected."],
    ];
    this.input.keyboard.off("keydown-SPACE", this.nextPage, this);
    this.input.off("pointerdown", this.nextPage, this);
    this.input.keyboard.on("keydown-SPACE", this.nextPage, this);
    this.input.on("pointerdown", this.nextPage, this);
    this.showPage();
  }

  drawBackdrop() {
    const colors = [0xffc9c7, 0xcaf5f5, 0xffed8a];
    const bg = this.add.graphics();
    bg.fillGradientStyle(colors[this.page], 0xffffff, 0xfff4e7, 0xb6e6e3, 1);
    bg.fillRect(0, 0, 640, 640);
    bg.fillStyle(0xffffff, 0.22);
    for (let x = 60; x < 620; x += 46) for (let y = 70; y < 590; y += 46) bg.fillRect(x, y, 3, 3);
    bg.fillStyle(0x4b8e55, 1);
    bg.fillRect(0, 600, 640, 40);
    bg.fillStyle(0x285d3b, 1);
    bg.fillRect(0, 620, 640, 20);
    // Pixel clouds and corner shrubs echo the supplied pixel-art references.
    bg.fillStyle(0xffffff, 0.88);
    [[50, 44], [520, 82], [120, 110], [540, 520]].forEach(([x, y]) => {
      bg.fillRect(x, y, 54, 12); bg.fillRect(x + 12, y - 12, 32, 12); bg.fillRect(x + 22, y - 22, 18, 10);
    });
    bg.fillStyle(0x3d8d4e, 1);
    [[30, 588], [70, 580], [565, 584], [600, 590]].forEach(([x, y]) => {
      bg.fillRect(x, y, 38, 18); bg.fillRect(x + 8, y - 12, 23, 15);
    });
    this.backdrop = bg;
  }

  showPage() {
    if (this.backdrop) this.backdrop.destroy();
    this.children.list.filter((item) => item.getData && item.getData("intro-ui")).forEach((item) => item.destroy());
    const [kind] = this.pages[this.page];
    const screenshotKey = { story: "ui-story", title: "ui-title", rules: "ui-rules" }[kind];
    if (this.textures.exists(screenshotKey)) {
      this.add.image(320, 320, screenshotKey).setDisplaySize(640, 640).setData("intro-ui", true);
      return;
    }
    this.drawBackdrop();
    const [, title, message] = this.pages[this.page];
    const add = (x, y, text, style, origin = 0.5) =>
      this.add.text(x, y, text, style).setOrigin(origin).setData("intro-ui", true);
    const titleSize = kind === "story" ? 45 : kind === "title" ? 50 : 48;
    add(320, 75, title, { fontFamily: "Arial Black, Arial", fontSize: `${titleSize}px`, fontStyle: "bold", color: "#29384d", align: "center", wordWrap: { width: 590 } });
    const panel = this.add.graphics().setData("intro-ui", true);
    panel.fillStyle(kind === "rules" ? 0xfff4df : 0xffffff, 0.84);
    panel.fillRoundedRect(55, kind === "story" ? 150 : 180, 530, kind === "story" ? 250 : kind === "rules" ? 285 : 280, 8);
    if (kind === "title") {
      panel.fillStyle(0x86b55c, 1); panel.fillRoundedRect(190, 150, 260, 58, 8);
      add(320, 180, "LILY'S FLOWER ADVENTURE", { fontFamily: "Arial", fontSize: "20px", fontStyle: "bold", color: "#ffffff" });
      this.add.sprite(320, 300, "florist", 0).setScale(2.4).setData("intro-ui", true);
      this.drawFlowerIcons();
    }
    add(320, kind === "story" ? 274 : kind === "rules" ? 322 : 180, message, {
      fontFamily: "Arial", fontSize: kind === "rules" ? "16px" : "16px", color: "#17231c", align: "center", lineSpacing: 3,
      wordWrap: { width: 485 },
    });
    if (kind === "title") {
      const button = this.add.graphics().setData("intro-ui", true);
      button.fillStyle(0xffffff, 1); button.fillRoundedRect(230, 466, 180, 58, 8);
      button.lineStyle(5, 0x29384d, 1); button.strokeRoundedRect(230, 466, 180, 58, 8);
      add(320, 495, "START", { fontFamily: "Arial Black, Arial", fontSize: "27px", fontStyle: "bold", color: "#ef5350" });
    }
    add(320, 570, this.page === 2 ? "Press SPACE or click to continue" : "Press SPACE or click to continue", {
      fontFamily: "Arial", fontSize: "15px", fontStyle: "bold", color: "#263b30",
    });
  }

  drawFlowerIcons() {
    const g = this.add.graphics().setData("intro-ui", true);
    [[218, 388, 0xffc04d], [285, 388, 0x60b6ff], [352, 388, 0xe071c7], [419, 388, 0xffe06a]].forEach(([x, y, color]) => {
      g.fillStyle(0xffffff, 1); g.fillRoundedRect(x - 23, y - 24, 46, 54, 6);
      g.lineStyle(3, 0x4b8e55, 1); g.strokeRoundedRect(x - 23, y - 24, 46, 54, 6);
      g.fillStyle(color, 1); g.fillRect(x - 5, y - 15, 10, 10); g.fillRect(x - 13, y - 7, 10, 10); g.fillRect(x + 3, y - 7, 10, 10); g.fillRect(x - 5, y + 1, 10, 9);
      g.fillStyle(0x4b8e55, 1); g.fillRect(x - 2, y + 10, 4, 16); g.fillRect(x + 1, y + 16, 11, 4);
    });
  }

  nextPage() {
    this.page += 1;
    if (this.page >= this.pages.length) {
      this.scene.start("levelIntro", { level: 1, destination: "floristL1" });
      return;
    }
    this.showPage();
  }
}

class LevelIntroScene extends Phaser.Scene {
  constructor() { super("levelIntro"); }

  init(data) { this.levelData = data || {}; }

  create() {
    const level = this.levelData.level || 1;
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.didContinue = false;
    const screenshotKey = `ui-level-${level}`;
    if (this.textures.exists(screenshotKey)) {
      this.add.image(320, 320, screenshotKey).setDisplaySize(640, 640);
      this.add.text(320, 612, "Press SPACE to continue", {
        fontFamily: "Arial", fontSize: "16px", fontStyle: "bold", color: "#ffffff",
        backgroundColor: "#263b30", padding: { x: 8, y: 5 },
      }).setOrigin(0.5);
      this.input.once("pointerdown", () => this.continueToMap());
      return;
    }
    const hues = [0xcaf5f5, 0xffc9c7, 0xffed8a, 0xb9dcff];
    const bg = this.add.graphics();
    bg.fillGradientStyle(hues[(level - 1) % hues.length], 0xffffff, 0xfff4df, 0xb5e7df, 1);
    bg.fillRect(0, 0, 640, 640);
    bg.fillStyle(0x4e9650, 1); bg.fillRect(0, 564, 640, 76);
    bg.fillStyle(0x316d43, 1); bg.fillRect(0, 610, 640, 30);
    bg.fillStyle(0x86b55c, 1); bg.fillRoundedRect(180, 50, 280, 76, 6);
    this.add.text(320, 88, `LEVEL ${level}`, { fontFamily: "Arial Black, Arial", fontSize: "52px", fontStyle: "bold", color: "#29384d" }).setOrigin(0.5);
    const card = this.add.graphics();
    card.fillStyle(0xffffff, 0.96); card.fillRoundedRect(64, 180, 512, 285, 12);
    card.lineStyle(5, 0x4b8e55, 1); card.strokeRoundedRect(64, 180, 512, 285, 12);
    this.add.text(320, 230, level === 4 ? "THE FINAL FLOWER SHOP" : "YOUR MISSION", {
      fontFamily: "Arial", fontSize: "23px", fontStyle: "bold", color: "#29384d",
    }).setOrigin(0.5);
    const objective = level === 4
      ? "Meet the florist and open Lily's bouquet shop.\n\nMake your final preparations and enjoy\nthe garden you helped bring to life."
      : "Collect all flowers in the garden.\n\nAvoid the rabbits and garden obstacles.\nUse R to check your flower bag.\nReach the exit when your collection is complete.";
    this.add.text(320, 326, objective, { fontFamily: "Arial", fontSize: "19px", color: "#24372b", align: "center", lineSpacing: 8 }).setOrigin(0.5);
    this.add.text(320, 520, "✿     ✿     ✿     ✿", { fontFamily: "Arial", fontSize: "30px", color: "#ed9e4c" }).setOrigin(0.5);
    this.add.text(320, 590, "Press SPACE or click to continue", { fontFamily: "Arial", fontSize: "17px", fontStyle: "bold", color: "#ffffff" }).setOrigin(0.5);
    this.input.once("pointerdown", () => this.continueToMap());
  }

  update() {
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) this.continueToMap();
  }

  continueToMap() {
    if (this.didContinue) return;
    this.didContinue = true;
    this.scene.start(this.levelData.destination, { from: this.levelData.from });
  }
}

class FloristL1Scene extends FloristMapScene {
  constructor() { super("floristL1", "floristL1"); }
}
class HouseL1Scene extends FloristMapScene {
  constructor() { super("houseL1", "houseL1"); }
}
class FloristL2Scene extends FloristMapScene {
  constructor() { super("floristL2", "floristL2"); }
}
class FloristL2aScene extends FloristMapScene {
  constructor() { super("floristL2a", "floristL2a"); }
}
class FloristL3Scene extends FloristMapScene {
  constructor() { super("floristL3", "floristL3"); }
}
class FloristL3aScene extends FloristMapScene {
  constructor() { super("floristL3a", "floristL3a"); }
}
class FinalShopScene extends FloristMapScene {
  constructor() { super("finalshop", "finalshop"); }
}

class EndingScene extends Phaser.Scene {
  constructor() {
    super("ending");
  }

  create() {
    this.voucherShown = false;
    this.finished = false;
    if (this.textures.exists("ui-level-4-complete")) {
      this.add.image(320, 320, "ui-level-4-complete").setDisplaySize(640, 640);
      this.completionPrompt = this.add.text(320, 610, "Press SPACE or click to continue", {
        fontFamily: "Arial", fontSize: "15px", fontStyle: "bold", color: "#ffffff",
        backgroundColor: "#263b30", padding: { x: 8, y: 5 },
      }).setOrigin(0.5);
    } else {
      const bg = this.add.graphics();
      bg.fillGradientStyle(0xb9dcff, 0xd5efff, 0xb7dcff, 0x9dcaed, 1); bg.fillRect(0, 0, 640, 640);
      bg.fillStyle(0x77b643, 1); bg.fillRect(0, 550, 640, 90);
      bg.fillStyle(0x9e4932, 1); bg.fillRect(0, 596, 640, 44);
      bg.fillStyle(0x358b48, 1);
      for (let x = 22; x < 620; x += 43) { bg.fillRect(x, 40, 8, 60); bg.fillRect(x + 8, 54, 20, 8); bg.fillRect(x - 12, 75, 20, 8); bg.fillRect(x + 8, 54, 8, 8); }
      this.add.text(320, 118, "CONGRATULATIONS\nTO LEVEL 4", { fontFamily: "monospace", fontSize: "28px", fontStyle: "bold", color: "#29384d", align: "center", lineSpacing: 7 }).setOrigin(0.5);
      this.add.text(320, 250, "WELCOME TO\nLILY'S BOUQUET", { fontFamily: "monospace", fontSize: "36px", fontStyle: "bold", color: "#9b3d20", align: "center", lineSpacing: 8 }).setOrigin(0.5);
      const banner = this.add.graphics(); banner.fillStyle(0xffffff, 1); banner.fillRect(92, 365, 456, 78); banner.lineStyle(8, 0x3b914a, 1); banner.strokeRect(92, 365, 456, 78); banner.lineStyle(4, 0xb0d72d, 1); banner.strokeRect(103, 376, 434, 56);
      this.add.text(320, 405, "YOU ARE COMPLETED!", { fontFamily: "monospace", fontSize: "29px", fontStyle: "bold", color: "#378b4a" }).setOrigin(0.5);
      this.add.text(320, 492, `Final score: ${GameState.score}`, { fontFamily: "Arial", fontSize: "17px", color: "#27364a" }).setOrigin(0.5);
      this.completionPrompt = this.add.text(320, 610, "Press SPACE or click to continue", { fontFamily: "Arial", fontSize: "16px", fontStyle: "bold", color: "#ffffff" }).setOrigin(0.5);
    }
    this.input.keyboard.on("keydown-SPACE", this.continueEnding, this);
    this.input.on("pointerdown", this.continueEnding, this);
    if (this.textures.exists("ui-voucher")) {
      this.time.delayedCall(1200, () => this.showVoucher());
    }
  }

  continueEnding() {
    if (!this.voucherShown && this.textures.exists("ui-voucher")) {
      this.showVoucher();
      return;
    }
    if (this.finished) return;
    this.finished = true;
    this.scene.start("intro");
  }

  showVoucher() {
    if (this.voucherShown) return;
    this.voucherShown = true;
    if (this.completionPrompt) this.completionPrompt.setVisible(false);
    GameAudio.cue("next");
    const dim = this.add.rectangle(320, 320, 640, 640, 0x0b1a14).setAlpha(0).setDepth(500);
    this.tweens.add({ targets: dim, alpha: 0.45, duration: 260 });
    const voucher = this.add.image(320, 312, "ui-voucher")
      .setDepth(501)
      .setAlpha(0)
      .setAngle(-12);
    const finalScale = 560 / voucher.width;
    voucher.setScale(finalScale * 0.1);
    this.tweens.add({
      targets: voucher,
      scale: finalScale,
      angle: -2,
      alpha: 1,
      duration: 620,
      ease: "Back.easeOut",
      easeParams: [2.2],
    });
    this.tweens.add({
      targets: voucher,
      y: 304,
      angle: 2,
      duration: 2200,
      delay: 650,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    const prompt = this.add.text(320, 612, "Press SPACE or click to play again", {
      fontFamily: "Arial", fontSize: "15px", fontStyle: "bold", color: "#ffffff",
      backgroundColor: "#263b30", padding: { x: 8, y: 5 },
    }).setOrigin(0.5).setDepth(502).setAlpha(0);
    this.tweens.add({ targets: prompt, alpha: 1, duration: 300, delay: 380 });
  }
}
