
var Pos = require("models/pos").Pos;
var Entity = require("models/entity").Entity;
var classUtils = require("utils/class");

function Crack(pos, username) {
    Entity.call(this, pos);
    this.username = username;
    var tempDate = new Date();
    this.expirationTime = tempDate.getTime() + 500;
}
classUtils.setParentClass(Crack, Entity);

module.exports = {
    Crack: Crack
}

var accountUtils = require("utils/account");
var gameUtils = require("utils/game");
var chunkUtils = require("utils/chunk");

var tempResource = require("models/chunk");
var BLOCK_START_TILE = tempResource.BLOCK_START_TILE;
var BLOCK_TILE_AMOUNT = tempResource.BLOCK_TILE_AMOUNT;
var EMPTY_TILE = tempResource.EMPTY_TILE;

Crack.prototype.tick = function() {
    Entity.prototype.tick.call(this);
    var tempDate = new Date();
    if (tempDate.getTime() >= this.expirationTime) {
        this.giveTileToPlayer();
        this.remove();
    }
}

Crack.prototype.giveTileToPlayer = function() {
    var tempTile = chunkUtils.getTile(this.pos);
    if (tempTile < BLOCK_START_TILE && tempTile >= BLOCK_START_TILE + BLOCK_TILE_AMOUNT) {
        return;
    }
    var tempPlayer = gameUtils.getPlayerByUsername(this.username);
    if (tempPlayer === null) {
        return;
    }
    chunkUtils.setTile(this.pos, EMPTY_TILE);
    tempPlayer.inventory.incrementTileCount(tempTile);
}

Crack.prototype.getClientInfo = function() {
    return {
        className: "Crack",
        id: this.id,
        pos: this.pos.toJson()
    }
}
