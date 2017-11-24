
var classUtils = require("utils/class");

var tempResource = require("models/entity");
var Entity = tempResource.Entity;
var entityList = tempResource.entityList;
var entityWalkOffsetList = tempResource.entityWalkOffsetList;

function Enemy(pos) {
    Entity.call(this, pos);
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

Enemy.prototype.getClientInfo = function() {
    return {
        className: "Enemy",
        id: this.id,
        pos: this.pos.toJson()
    }
}

