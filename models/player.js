
var classUtils = require("utils/class");
var Pos = require("models/pos").Pos;

var tempResource = require("models/entity");
var Entity = tempResource.Entity;
var entityList = tempResource.entityList;

var Crack = require("models/crack").Crack;
var Inventory = require("models/inventory").Inventory;
var getNextChatMessageId = require("models/chatMessage").getNextChatMessageId;
var accountUtils = require("utils/account");
var gameUtils = require("utils/game");
var chunkUtils = require("utils/chunk");

var tempResource = require("models/chunk");
var EMPTY_TILE = tempResource.EMPTY_TILE;
var BLOCK_START_TILE = tempResource.BLOCK_START_TILE;
var BLOCK_TILE_AMOUNT = tempResource.BLOCK_TILE_AMOUNT;
var TRAIL_START_TILE = tempResource.TRAIL_START_TILE;
var TRAIL_TILE_AMOUNT = tempResource.TRAIL_TILE_AMOUNT;
var FLOUR_TILE = tempResource.FLOUR_TILE;
var WATER_TILE = tempResource.WATER_TILE;
var POWDER_TILE = tempResource.POWDER_TILE;
var BREAD_TILE = tempResource.BREAD_TILE;

var playerWalkOffsetList = [
    new Pos(0, -1),
    new Pos(1, 0),
    new Pos(0, 1),
    new Pos(-1, 0),
];
var maximumWalkBudget = 2 * gameUtils.framesPerSecond;

function Player(account) {
    this.respawnPos = gameUtils.getNewPlayerRespawnPos();
    var tempPos = this.respawnPos.copy();
    Entity.call(this, tempPos);
    this.username = account.username;
    this.avatar = account.avatar;
    var tempDate = new Date();
    this.lastActivityTime = tempDate.getTime();
    this.lastChatMessageId = getNextChatMessageId() - 10;
    this.inventory = new Inventory(account);
    this.walkBudget = maximumWalkBudget;
}
classUtils.setParentClass(Player, Entity);

Player.prototype.tick = function() {
    Entity.prototype.tick.call(this);
    if (this.walkBudget < maximumWalkBudget) {
        this.walkBudget += 1;
    }
    var tempDate = new Date();
    var tempTime = tempDate.getTime();
    if (tempTime > this.lastActivityTime + 10 * 1000) {
        this.remove();
        return;
    }
}

Player.prototype.remove = function() {
    Entity.prototype.remove.call(this);
    this.persist(function() {});
}

Player.prototype.persist = function(done) {
    var self = this;
    accountUtils.acquireLock(function() {
        accountUtils.findAccountByUsername(self.username, function(error, index, result) {
            if (error) {
                accountUtils.releaseLock();
                console.log(error);
                return;
            }
            result.inventory = self.inventory.toJson();
            accountUtils.setAccount(index, result, function(error) {
                accountUtils.releaseLock();
                if (error) {
                    console.log(error);
                    return;
                }
                done();
            });
        });
    });
}

Player.prototype.getClientInfo = function() {
    return {
        className: "Player",
        id: this.id,
        pos: this.pos.toJson(),
        username: this.username,
        avatar: this.avatar,
        // TODO: Populate this.
        breadCount: 0
    }
}

Player.prototype.getPosInWalkDirection = function(direction) {
    var tempOffset = playerWalkOffsetList[direction];
    var output = this.pos.copy();
    output.add(tempOffset);
    return output;
}

Player.prototype.walk = function(direction) {
    var tempCost = (1 / 16) * gameUtils.framesPerSecond;
    if (this.walkBudget < tempCost) {
        return;
    }
    this.walkBudget -= tempCost;
    var tempCrack = gameUtils.getCrackByUsername(this.username);
    if (tempCrack !== null) {
        return;
    }
    var tempPos = this.getPosInWalkDirection(direction);
    var tempTile = chunkUtils.getTile(tempPos);
    if ((tempTile >= BLOCK_START_TILE && tempTile < BLOCK_START_TILE + BLOCK_TILE_AMOUNT)
            || tempTile == 0) {
        return;
    }
    this.pos.set(tempPos);
    if ((tempTile >= TRAIL_START_TILE && tempTile < TRAIL_START_TILE + TRAIL_TILE_AMOUNT)
            || tempTile == EMPTY_TILE) {
        chunkUtils.setTile(tempPos, TRAIL_START_TILE + this.avatar);
    }
    if (tempTile >= FLOUR_TILE && tempTile <= BREAD_TILE) {
        chunkUtils.setTile(tempPos, TRAIL_START_TILE + this.avatar);
        this.inventory.incrementTileCount(tempTile);
    }
}

Player.prototype.removeTile = function(direction) {
    if (gameUtils.getCrackByUsername(this.username) !== null) {
        return;
    }
    var tempPos = this.getPosInWalkDirection(direction);
    new Crack(tempPos, this.username);
}

Player.prototype.placeTile = function(direction, tile) {
    var tempPos = this.getPosInWalkDirection(direction);
    var tempTile = chunkUtils.getTile(tempPos);
    if ((tempTile < TRAIL_START_TILE || tempTile >= TRAIL_START_TILE + TRAIL_TILE_AMOUNT)
            && tempTile != EMPTY_TILE) {
        return false;
    }
    var tempResult = this.inventory.decrementTileCount(tile);
    if (!tempResult) {
        return false;
    }
    chunkUtils.setTile(tempPos, tile);
    return true;
}

Player.prototype.collectTile = function(direction) {
    var tempPos = this.getPosInWalkDirection(direction);
    var tempTile = chunkUtils.getTile(tempPos);
    if (tempTile < FLOUR_TILE || tempTile > BREAD_TILE) {
        return;
    }
    this.inventory.incrementTileCount(tempTile);
    chunkUtils.setTile(tempPos, EMPTY_TILE);
}

module.exports = {
    Player: Player
}
