
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
}
classUtils.setParentClass(Enemy, Entity);

module.exports = {
    Enemy: Enemy
}

var tempResource = require("models/pos");
var Pos = tempResource.Pos;
var createPosFromJson = tempResource.createPosFromJson;

var gameUtils = require("utils/game");
var chunkUtils = require("utils/chunk");

Enemy.prototype.tick = function() {
    Entity.prototype.tick.call(this);
    this.walkDelay -= 1;
    if (this.walkDelay <= 0) {
        this.walkDelay = 0.75 * gameUtils.framesPerSecond;
        this.walk();
    }
}

Enemy.prototype.walk = function() {
    if (!enemiesShouldWalk) {
        return;
    }
    var tempOffset = new Pos(1 - Math.floor(Math.random() * 3), 1 - Math.floor(Math.random() * 3));
    var tempPos = this.pos.copy();
    tempPos.add(tempOffset);
    var tempTile = chunkUtils.getTileWithoutGenerating(tempPos);
    if (!this.canWalkThroughTile(tempTile)) {
        return;
    }
    if (chunkUtils.posIsInRestZone(tempPos)) {
        return;
    }
    this.pos.set(tempPos);
}

Enemy.prototype.getClientInfo = function() {
    return {
        className: "Enemy",
        id: this.id,
        pos: this.pos.toJson()
    }
}

