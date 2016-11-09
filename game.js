var game,
    gameOptions = {
        gameWidth: 1000,
        gameHeight: 1000,
        tileSize: 43,
        tilesTint: [
            0xffffff,
            0xdb0a5b,
            0x19b5fe,
            0x00b16a,
            0xf7ca18
        ]
    };

window.onload = function() {
    game = new Phaser.Game(
        gameOptions.gameWidth,
        gameOptions.gameHeight,
        Phaser.AUTO,
        '',
        GameObj
    );
}

function axial_to_position(q, r, size) {
    return {
        x: size * Math.sqrt(3) * (q + r / 2),
        y: size * 3/2 * r
    };
}


var GameObj = function() {};
GameObj.prototype = {
    tiles: {},
    preload: function() {
        game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
        game.scale.pageAlignHorizontally = true;
        game.scale.pageAlignVertically = true;
        game.stage.disableVisibilityChange = true;
        game.load.image("hex", "tile.png");
    },
    create: function() {
        var radius = 6,
            xCenter = gameOptions.gameWidth / 2,
            yCenter = gameOptions.gameHeight / 2;
        this.tiles = {};
        for(var q = -radius; q <= radius; q++) {
            this.tiles[q] = {};
            for(var r = -radius; r <= radius; r++) {
                if(Math.abs(q + r) > radius)
                    continue;
                
                var position = axial_to_position(q, r, gameOptions.tileSize),
                    x = position.x + xCenter,
                    y = position.y + yCenter,
                    tile = game.add.button(x, y, 'hex', this.clickTile, this);
                tile.anchor.setTo(0.5, 0.5);
                tile.state = 0;
                if(q == 0 && r == 0) {
                    tile.state = 1;
                    tile.tint = gameOptions.tilesTint[tile.state];
                }
                
                tile.coords = { q: q, r: r };
                console.log({q: q, r: r, tile: tile});
                this.tiles[q][r] = tile;
            }
        }
    },
    update: function() {
    },

    incrementTileState: function(tile) {
        tile.state = (tile.state + 1) % gameOptions.tilesTint.length;
        tile.tint = gameOptions.tilesTint[tile.state];
    },
    getTileNeighbors: function(tile) {
        var neighbors = [],
            q = tile.coords.q,
            r = tile.coords.r;
        for(var dq = -1; dq <= 1; dq ++) {
            for(var dr = -1; dr <= 1; dr ++) {
                if(Math.abs(dq + dr) > 1 ||
                        dq + q < 0 ||
                        dq + q > this.tiles.length ||
                        dr + r < 0 ||
                        dr + r > this.tiles[q].length)
                    continue;
                neighbors.push(this.tiles[q][r]);
            }
        } 
    },
    clickTile: function(tile) {
        console.log(this);
        this.incrementTileState(tile);
        this.getTileNeighbors(tile).each(this.incrementTileState);
    }
};