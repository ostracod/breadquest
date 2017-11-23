
var classUtils = require("utils/class");

var tempResource = require("models/pos");
var Pos = tempResource.Pos;
var createPosFromJson = tempResource.createPosFromJson;

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
var OVEN_TILE = tempResource.OVEN_TILE;
var HOSPITAL_TILE = tempResource.HOSPITAL_TILE;

var breadIngredientSet = [FLOUR_TILE, WATER_TILE, POWDER_TILE];

var playerWalkOffsetList = [
    new Pos(0, -1),
    new Pos(1, 0),
    new Pos(0, 1),
    new Pos(-1, 0),
];
var maximumWalkBudget = 2 * gameUtils.framesPerSecond;

function Player(account) {
    if ("respawnPos" in account) {
        this.respawnPos = createPosFromJson(account.respawnPos);
    } else {
        this.respawnPos = gameUtils.getNewPlayerRespawnPos();
    }
    var tempPos;
    if ("pos" in account) {
        tempPos = createPosFromJson(account.pos);
    } else {
        tempPos = this.respawnPos.copy();
    }
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
        accountUtils.findAccountByUsername(self.username, function(error, index, account) {
            if (error) {
                accountUtils.releaseLock();
                console.log(error);
                return;
            }
            account.inventory = self.inventory.toJson();
            account.respawnPos = self.respawnPos.toJson();
            account.pos = self.pos.toJson();
            accountUtils.setAccount(index, account, function(error) {
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
        breadCount: this.inventory.getTileCount(BREAD_TILE)
    }
}

Player.prototype.getPosInWalkDirection = function(direction) {
    var tempOffset = playerWalkOffsetList[direction];
    var output = this.pos.copy();
    output.add(tempOffset);
    return output;
}

Player.prototype.bakeBread = function() {
    while (true) {
        var tempCanBakeBread = true;
        var index = 0;
        while (index < breadIngredientSet.length) {
            var tempTile = breadIngredientSet[index];
            if (this.inventory.getTileCount(tempTile) <= 0) {
                tempCanBakeBread = false;
                break;
            }
            index += 1;
        }
        if (!tempCanBakeBread) {
            break;
        }
        var index = 0;
        while (index < breadIngredientSet.length) {
            var tempTile = breadIngredientSet[index];
            this.inventory.decrementTileCount(tempTile);
            index += 1;
        }
        this.inventory.incrementTileCount(BREAD_TILE);
    }
}

Player.prototype.interactWithAdjacentTile = function(direction) {
    var tempPos = this.getPosInWalkDirection(direction);
    var tempTile = chunkUtils.getTile(tempPos);
    if (tempTile == OVEN_TILE) {
        this.bakeBread();
    }
    if (tempTile == HOSPITAL_TILE) {
        // TODO: Heal.
    }
}

Player.prototype.interactWithAdjacentTiles = function() {
    var tempDirection = 0;
    while (tempDirection < playerWalkOffsetList.length) {
        this.interactWithAdjacentTile(tempDirection);
        tempDirection += 1;
    }
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
    if (!this.canWalkThroughTile(tempTile)) {
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
    this.interactWithAdjacentTiles();
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
