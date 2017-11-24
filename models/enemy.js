
var classUtils = require("utils/class");

var tempResource = require("models/entity");
var Entity = tempResource.Entity;
var entityList = tempResource.entityList;
var entityWalkOffsetList = tempResource.entityWalkOffsetList;

// Use for debugging.
var enemiesShouldWalk = true;

function Enemy(pos) {
    Entity.call(this, pos);
    this.walkDelay = 0;
    this.targetUsername = null;
    this.targetDelay = 0;
}
classUtils.setParentClass(Enemy, Entity);

module.exports = {
    Enemy: Enemy
}

var tempResource = require("models/pos");
var Pos = tempResource.Pos;
var createPosFromJson = tempResource.createPosFromJson;

var Player = require("models/player").Player;
var gameUtils = require("utils/game");
var chunkUtils = require("utils/chunk");

Enemy.prototype.tick = function() {
    Entity.prototype.tick.call(this);
    this.walkDelay -= 1;
    if (this.walkDelay <= 0) {
        this.walkDelay = 0.75 * gameUtils.framesPerSecond;
        var tempResult = this.walk();
        if (!tempResult && this.targetUsername !== null) {
            this.targetUsername = null;
            this.targetDelay = 10;
        }
    }
}

Enemy.prototype.walk = function() {
    if (!enemiesShouldWalk) {
        return;
    }
    if (this.targetDelay > 0) {
        this.targetDelay -= 1;
    }
    var tempOffset = null;
    if (this.targetUsername === null && this.targetDelay <= 0) {
        var tempPlayerList = gameUtils.getEntitiesByClassNearPos(Player, this.pos, 14);
        var tempClosestDistance = 999;
        var index = 0;
        while (index < tempPlayerList.length) {
            var tempPlayer = tempPlayerList[index];
            var tempDistance = this.pos.getOrthogonalDistance(tempPlayer.pos);
            if (tempDistance < tempClosestDistance) {
                this.targetUsername = tempPlayer.username;
                tempClosestDistance = tempDistance;
            }
            index += 1;
        }
    }
    if (this.targetUsername !== null) {
        while (true) {
            var tempPlayer = gameUtils.getPlayerByUsername(this.targetUsername);
            if (tempPlayer == null) {
                this.targetUsername = null;
                break;
            }
            var tempDistance = tempPlayer.pos.getOrthogonalDistance(this.pos);
            if (tempDistance > 15) {
                this.targetUsername = null;
                break;
            }
            var tempOffsetX = tempPlayer.pos.x - this.pos.x;
            var tempOffsetY = tempPlayer.pos.y - this.pos.y;
            tempOffset = new Pos(0, 0);
            if (tempOffsetX > 0) {
                tempOffset.x = 1;
            }
            if (tempOffsetX < 0) {
                tempOffset.x = -1;
            }
            if (tempOffsetY > 0) {
                tempOffset.y = 1;
            }
            if (tempOffsetY < 0) {
                tempOffset.y = -1;
            }
            break;
        }
    }
    if (tempOffset === null) {
        tempOffset = new Pos(1 - Math.floor(Math.random() * 3), 1 - Math.floor(Math.random() * 3));
    }
    var tempPos = this.pos.copy();
    tempPos.add(tempOffset);
    var tempTile = chunkUtils.getTileWithoutGenerating(tempPos);
    if (!this.canWalkThroughTile(tempTile)) {
        return false;
    }
    if (chunkUtils.posIsInRestZone(tempPos)) {
        return false;
    }
    this.pos.set(tempPos);
    return true;
}

Enemy.prototype.getClientInfo = function() {
    return {
        className: "Enemy",
        id: this.id,
        pos: this.pos.toJson()
    }
}

