
var classUtils = require("utils/class");

var tempResource = require("models/pos");
var Pos = tempResource.Pos;
var createPosFromJson = tempResource.createPosFromJson;

var tempResource = require("models/entity");
var Entity = tempResource.Entity;
var entityList = tempResource.entityList;
var entityWalkOffsetList = tempResource.entityWalkOffsetList;

function Player(account) {
    if ("respawnPos" in account) {
        this.respawnPos = createPosFromJson(account.respawnPos);
    } else {
        this.respawnPos = gameUtils.getNewPlayerRespawnPos();
    }
    this.respawnPosHasChanged = false;
    var tempPos;
    if ("pos" in account) {
        tempPos = createPosFromJson(account.pos);
    } else {
        tempPos = this.respawnPos.copy();
    }
    Entity.call(this, tempPos);
    this.username = account.username;
    this.avatar = account.avatar;
    this.avatarHasChanged = false;
    var tempDate = new Date();
    this.lastActivityTime = tempDate.getTime();
    this.lastChatMessageId = getNextChatMessageId() - 10;
    this.inventory = new Inventory(account);
    this.walkBudget = maximumWalkBudget;
    if ("health" in account) {
        this.health = account.health;
    } else {
        this.health = maximumPlayerHealth;
    }
    this.invincibilityDelay = 0;
    var tempEnemyList = gameUtils.getEntitiesByClassNearPos(Enemy, this.pos, 10);
    var index = 0;
    while (index < tempEnemyList.length) {
        var tempEnemy = tempEnemyList[index];
        if (gameUtils.isInDevelopmentMode) {
            console.log("Removing enemy at " + tempEnemy.pos.toString() + " near spawning player.");
        }
        tempEnemy.remove();
        index += 1;
    }
}
classUtils.setParentClass(Player, Entity);

module.exports = {
    Player: Player
}

var Enemy = require("models/enemy").Enemy;
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
var SYMBOL_START_TILE = tempResource.SYMBOL_START_TILE;
var SYMBOL_TILE_AMOUNT = tempResource.SYMBOL_TILE_AMOUNT;

var breadIngredientSet = [FLOUR_TILE, WATER_TILE, POWDER_TILE];

var maximumWalkBudget = 2 * gameUtils.framesPerSecond;
var maximumPlayerHealth = 5;

Player.prototype.setRespawnPos = function(pos) {
    this.respawnPos = pos.copy();
    this.respawnPosHasChanged = true;
}

Player.prototype.setAvatar = function(avatar) {
    this.avatar = avatar;
    this.avatarHasChanged = true;
}

Player.prototype.decrementNextItemCount = function(tileList) {
    var index = 0;
    while (index < tileList.length) {
        var tempTile = tileList[index];
        var tempResult = this.inventory.decrementTileCount(tempTile);
        if (tempResult) {
            return tempTile;
        }
        index += 1;
    }
    return null;
}

Player.prototype.dropItems = function(tileList) {
    var tempPos = new Pos(0, 0);
    var tempRadius = 0;
    while (true) {
        var tempHasExhaustedItems = false;
        var tempOffset = new Pos(-tempRadius, -tempRadius);
        while (tempOffset.y <= tempRadius) {
            var tempPos = this.pos.copy();
            tempPos.add(tempOffset);
            var tempTile = chunkUtils.getTile(tempPos);
            if (this.canPlaceOnTile(tempTile)) {
                var tempTile = this.decrementNextItemCount(tileList);
                if (tempTile === null) {
                    tempHasExhaustedItems = true;
                    break;
                }
                chunkUtils.setTile(tempPos, tempTile);
            }
            tempOffset.x += 1;
            if (tempOffset.x > tempRadius) {
                tempOffset.x = -tempRadius;
                tempOffset.y += 1;
            }
        }
        tempRadius += 1;
        if (tempHasExhaustedItems) {
            break;
        }
    }
}

Player.prototype.die = function() {
    this.dropItems([FLOUR_TILE, WATER_TILE, POWDER_TILE]);
    this.pos = this.respawnPos.copy();
    this.health = maximumPlayerHealth;
}

Player.prototype.isInvincible = function() {
    return (this.invincibilityDelay > 0);
}

Player.prototype.receiveDamage = function(amount) {
    if (this.isInvincible()) {
        return;
    }
    this.health -= amount;
    if (this.health <= 0) {
        this.die();
    }
    this.invincibilityDelay = 6 * gameUtils.framesPerSecond;
}

Player.prototype.tick = function() {
    Entity.prototype.tick.call(this);
    if (this.walkBudget < maximumWalkBudget) {
        this.walkBudget += 1;
    }
    if (this.invincibilityDelay > 0) {
        this.invincibilityDelay -= 1;
    }
    var tempCount = gameUtils.getEntityCountByClassNearPos(Enemy, this.pos, 0);
    if (tempCount >= 1) {
        this.receiveDamage(1);
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
            account.health = self.health;
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
        breadCount: this.inventory.getTileCount(BREAD_TILE),
        isInvincible: this.isInvincible()
    }
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
        this.setRespawnPos(this.pos.copy());
    }
    if (tempTile == HOSPITAL_TILE) {
        this.health = maximumPlayerHealth;
        this.setRespawnPos(this.pos.copy());
    }
}

Player.prototype.interactWithAdjacentTiles = function() {
    var tempDirection = 0;
    while (tempDirection < entityWalkOffsetList.length) {
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

Player.prototype.canPlaceOnTile = function(tile) {
    return ((tile >= TRAIL_START_TILE && tile < TRAIL_START_TILE + TRAIL_TILE_AMOUNT)
       || tile == EMPTY_TILE);
}

Player.prototype.placeTile = function(direction, tile) {
    var tempPos = this.getPosInWalkDirection(direction);
    var tempTile = chunkUtils.getTile(tempPos);
    if (!this.canPlaceOnTile(tempTile)) {
        return false;
    }
    var tempResult = this.inventory.decrementTileCount(tile);
    if (!tempResult) {
        return false;
    }
    chunkUtils.setTile(tempPos, tile);
    return true;
}

Player.prototype.placeSymbolTile = function(tile) {
    if (tile < SYMBOL_START_TILE || tile >= SYMBOL_START_TILE + SYMBOL_TILE_AMOUNT) {
        return false;
    }
    var tempTile = chunkUtils.getTile(this.pos);
    if (!this.canPlaceOnTile(tempTile)) {
        return false;
    }
    chunkUtils.setTile(this.pos, tile);
    return true;
}

Player.prototype.collectTile = function(direction) {
    var tempPos = this.getPosInWalkDirection(direction);
    var tempTile = chunkUtils.getTile(tempPos);
    var tempShouldAddToInventory = false;
    var tempShouldRemove = false;
    if (tempTile >= SYMBOL_START_TILE && tempTile < SYMBOL_START_TILE + SYMBOL_TILE_AMOUNT) {
        tempShouldRemove = true;
    }
    if (tempTile >= FLOUR_TILE && tempTile <= BREAD_TILE) {
        tempShouldAddToInventory = true;
        tempShouldRemove = true;
    }
    if (tempShouldAddToInventory) {
        this.inventory.incrementTileCount(tempTile);
    }
    if (tempShouldRemove) {
        chunkUtils.setTile(tempPos, EMPTY_TILE);
    }
}

Player.prototype.eatBread = function() {
    if (this.health >= maximumPlayerHealth) {
        return;
    }
    var tempResult = this.inventory.decrementTileCount(BREAD_TILE);
    if (!tempResult) {
        return;
    }
    this.health += 1;
}
