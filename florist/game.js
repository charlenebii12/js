var config = {
    type: Phaser.AUTO,
    // pixel size * tile map size * zoom 
    width: 32 * 20,
    height: 32 * 20,
    resolution: window.devicePixelRatio || 1,
    render: {
        antialias: false,
        roundPixels: true
    },
    physics: {
        default: 'arcade',
        arcade: {
            gravity: false,
            debug: false
        }
    },
    // scale: {
    //     mode: Phaser.Scale.FIT,
    //     autoCenter: Phaser.Scale.CENTER_BOTH
    // },
    backgroundColor: '#000000',
    pixelArt: true,
    scene: [
        BootScene,
        IntroScene,
        LevelIntroScene,
        FloristL1Scene,
        HouseL1Scene,
        FloristL2Scene,
        FloristL2aScene,
        FloristL3Scene,
        FloristL3aScene,
        FinalShopScene,
        EndingScene
    ]
};

var game = new Phaser.Game(config);
