var game,
    gameOptions = {
        tileWidth: 75,
        tileSize: 43,
        tilesTint: {
            normal: 0xc0c0c0,
            discovered: 0xffffff,
            oops: 0xdb0a5b,
            maybe: 0x19b5fe,
            flagged: 0x00b16a,
        },
        minRadius: 3,
        maxRadius: 10,
        radius: 6,
        minesCount: 10
    },
    gameSize,
    gui;

window.onload = function() {
    gameSize = gameOptions.tileWidth * (gameOptions.radius * 2 + 1);
    console.log("gameSize: ",gameSize);
    game = new Phaser.Game(
        gameSize,
        gameSize,
        Phaser.AUTO,
        '',
        GameObj
    );
    gui = new dat.GUI();
}

function axial_to_position(q, r, size) {
    return {
        x: size * Math.sqrt(3) * (q + r / 2),
        y: size * 3/2 * r
    };
}

var Tile = function(game, q, r, key, callback, callbackContext, hasMine) {
    var pos = axial_to_position(q, r, gameOptions.tileSize),
        x = pos.x + gameSize / 2,
        y = pos.y + gameSize / 2;
    Phaser.Button.call(this, game, x, y, key, callback, callbackContext, undefined, undefined, undefined, undefined, undefined);
    game.add.existing(this);

    this.coords = { q: q, r: r };
    this.state = 'normal';
    this.text = undefined;
    this.hasMine = hasMine;
    this.neighboringMines = 0;
    this.tint = gameOptions.tilesTint[this.state];
    /* XXX DEBUG */
    if(this.hasMine)
        this.setText("x");
    this.animations.add('flip_start', [0, 1, 2], true);
    this.animations.add('flip_finish', [2, 1, 0], true);
    this.anchor.setTo(0.5, 0.5);
}
Tile.prototype = Object.create(Phaser.Button.prototype);
Tile.prototype.constructor = Tile;

Tile.prototype.setState = function(newState) {
    this.animations.play('flip_start', 15);
    this.tint = gameOptions.tilesTint[newState];
    this.animations.play('flip_finish', 15);
    this.state = newState;

    if(newState == 'normal')
        this.clearText();
    else if(newState == 'flagged')
        this.setText("o");
    else if(newState == 'maybe')
        this.setText("?");
    else if(newState == 'discovered') {
        this.clearText();
        if(this.neighboringMines > 0) {
            this.setText(this.neighboringMines);
        }
    }
}
Tile.prototype.setText = function(text) {
    if(this.text != undefined)
        this.clearText();

    this.text = game.add.text(
        this.x,
        this.y,
        text,
        {
            font: "bold 32px Arial",
            fill: "#000",
            boundsAlignH: "center",
            boundsAlignV: "middle"
        }
    );
    this.text.anchor.x = 0.5;
    this.text.anchor.y = 0.5;
}
Tile.prototype.clearText = function(text) {
    if(this.text != undefined) {
        this.text.destroy(true);
        this.text = undefined;
    }
}

var GameObj = function() {
    this.minesCount = gameOptions.minesCount;
    this.gameIsOver = false;
    this.radius = gameOptions.radius;
    this.tiles = [];

    this.tilesGroup = undefined;
    this.textGroup = undefined;
};
GameObj.prototype = {
    preload: function() {
        game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
        game.scale.pageAlignHorizontally = true;
        game.scale.pageAlignVertically = true;
        game.stage.disableVisibilityChange = true;
        //game.load.image('tile', 'tile.png');
        game.load.spritesheet('tile', 'tile_anim.png', 100, 100);
        game.canvas.oncontextmenu = function (e) { e.preventDefault(); }
    },
    create: function() {
        this.createGUI();
        this.initGame();
    },
    createGUI: function() {
        var guiGame = gui.addFolder('Game');
        guiGame.add(this, 'radius', gameOptions.minRadius, gameOptions.maxRadius)
            .step(1)
            .name('Radius');
        guiGame.add(this, 'newGame')
            .name('New game');
        guiGame.open();
    },
    initGame: function() {
        this.gameIsOver = false;
        this.tilesGroup = game.add.group();
        this.createTiles();

        this.textGroup = game.add.group();
    },
    createTiles: function() {
        // Find mine placement by randomizing the index of the tile
        // excluding the center one
        var remainingMines = this.minesCount,
            mineIndices = {}, // Hash for faster lookup
            tilesCount = 3 * this.radius * (this.radius + 1) + 1;
        while(remainingMines > 0) {
            var index = Math.floor(Math.random() * tilesCount);
            if(mineIndices[index] == undefined) {
                mineIndices[index] = true;
                remainingMines --;
            }
        }

        // Create the tiles with or without a mine
        var index = 0;
        for(var r = -this.radius; r <= this.radius; r ++) {
            for(var q = -this.radius; q <= this.radius; q ++) {
                if(Math.abs(q + r) > this.radius)
                    continue;

                this.storeTile(
                    new Tile(this.game, q, r, 'tile', this.clickTile, this, (mineIndices[index] != undefined)),
                    q, r
                );
                index ++;
            }
        }

        // Go through the mines and count the number of neighboring mines
        for(var i = 0; i < this.tiles.length; i ++) {
            for(var j = 0; j < this.tiles[i].length; j ++) {
                if(this.tiles[i][j].hasMine)
                    continue;

                var neighbors = this.getTileNeighbors(this.tiles[i][j]),
                    count = 0;
                for(var k = 0; k < neighbors.length; k ++) {
                    if(neighbors[k].hasMine)
                        count ++;
                }
                this.tiles[i][j].neighboringMines = count;
                //this.tiles[i][j].setText(count); // XXX DEBUG
            }
        }
    },
    axialToStoragePosition: function(q, r) {
        return {
            i: r + this.radius,
            j: q + this.radius + Math.min(0, r)
        };
    },
    storeTile: function(tile, q, r) {
        var pos = this.axialToStoragePosition(q, r);
        if(this.tiles.length == 0) {
            this.tiles = new Array(this.radius + 1);
        }
        if(! this.tiles[pos.i] || this.tiles[pos.i].length == 0) {
            this.tiles[pos.i] = new Array(this.radius * 2 - Math.abs(r) + 1);
        }
        this.tiles[pos.i][pos.j] = tile;

        this.tilesGroup.add(tile);
    },
    getTile: function(q, r) {
        var pos = this.axialToStoragePosition(q, r);
        if(! this.tiles[pos.i] || ! this.tiles[pos.i][pos.j]) {
            return undefined;
        }
        return this.tiles[pos.i][pos.j];
    },
    deleteTiles: function() {
        for(var i = this.tiles.length - 1; i >= 0; i--) {
            for(var j = this.tiles[i].length - 1; j >= 0; j--) {
                this.tiles[i][j].destroy(true);
                delete this.tiles[i][j];
            }
            delete this.tiles[j];
        }
        this.tiles = [];
    },
    newGame: function() {
        this.deleteTiles();
        this.tilesGroup.delete(true);
        this.textGroup.delete(true);

        gameSize = gameOptions.tileWidth * (this.radius * 2 + 1);
        game.scale.setGameSize(gameSize, gameSize);
        this.initGame();
    },
    getTileNeighbors: function(tile) {
        var neighbors = [],
            q = tile.coords.q,
            r = tile.coords.r;
        for(var dr = -1; dr <= 1; dr ++) {
            for(var dq = -1; dq <= 1; dq ++) {
                var neighbor = this.getTile(dq + q, dr + r);
                if((dq == 0 && dr == 0) ||
                        Math.abs(dq + dr) > 1 ||
                        ! neighbor)
                    continue;
                neighbors.push(neighbor);
            }
        }
        return neighbors;
    },
    clickTile: function(tile, evt) {
        if(this.gameIsOver || tile.state == 'discovered')
            return;

        if(evt.button == 0) {
            // Left click: dig this tile
            if(tile.hasMine) {
                tile.setState('oops');
                this.gameOver(false);
                return;
            }
            if(tile.state != 'discovered')
                this.discoverTile(tile);
        } else if(evt.button == 2) {
            // Right click: cycle through selected states
            if(tile.state == 'normal')
                tile.setState('flagged');
            else if(tile.state == 'flagged')
                tile.setState('maybe');
            else if(tile.state == 'maybe')
                tile.setState('normal');
        }

        this.checkEndOfGame();
    },
    discoverTile: function(tile) {
        tile.setState('discovered');
        if(tile.neighboringMines == 0) {
            var neighbors = this.getTileNeighbors(tile);
            for(var i = 0; i < neighbors.length; i ++) {
                if(neighbors[i].hasMine) {
                    console.log("Hmmm neighbor of a zero count tile and a mine? Impossible!");
                    continue;
                }
                if(neighbors[i].state == 'discovered')
                    continue;
                this.discoverTile(neighbors[i]);
            }
        }
    },
    checkEndOfGame: function() {
        var endGame = true;
        for(var i = 0; i < this.tiles.length && endGame; i ++) {
            for(var j = 0; j < this.tiles[i].length; j ++) {
                var tile = this.tiles[i][j];
                if(tile.hasMine && tile.state != 'flagged' ||
                        ! tile.hasMine && tile.state != 'discovered') {
                    endGame = false;
                    break;
                }
            }
        }

        if(endGame)
            this.gameOver(endGame);
    },
    revealMines: function() {
    },
    gameOver: function(won) {
        this.gameIsOver = true;

        var text = 'You won!',
            fill = '#fff';

        if(! won) {
            console.log("lost");
            text = 'You lost! :(';
            fill = '#ff0000';
            this.revealMines();
        } else {
            console.log("won");
        }

        var bar = game.add.graphics();
        bar.beginFill(0x000000, 0.2);
        bar.drawRect(
            0, gameSize / 4,
            gameSize, gameSize / 2
        );
        this.textGroup.add(bar);

        var text = game.add.text(
            gameSize / 2,
            gameSize / 2,
            text,
            {
                font: "bold 32px Arial",
                fill: fill,
                boundsAlignH: "center",
                boundsAlignV: "middle"
            }
        );
        text.setShadow(3, 3, 'rgba(0, 0, 0, 0.5)', 2);
        text.anchor.x = 0.5;
        text.anchor.y = 0.5;
        this.textGroup.add(text);
    }
};
