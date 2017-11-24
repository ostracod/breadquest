
var Pos = require("models/pos").Pos;

var entityList = [];
var nextEntityId = 0;

var entityWalkOffsetList = [
    new Pos(0, -1),
    new Pos(1, 0),
    new Pos(0, 1),
    new Pos(-1, 0),
];

function Entity(pos) {
    this.id = nextEntityId;
    nextEntityId += 1;
    this.pos = pos;
    entityList.push(this);
}

module.exports = {
    Entity: Entity,
    entityList: entityList,
    entityWalkOffsetList: entityWalkOffsetList
}

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

Entity.prototype.tick = function() {
    // Do nothing.
}

Entity.prototype.remove = function() {
    var index = 0;
    while (index < entityList.length) {
        var tempEntity = entityList[index];
        if (this == tempEntity) {
            entityList.splice(index, 1);
            break;
        }
        index += 1;
    }
}

Entity.prototype.getClientInfo = function() {
    return {
        className: "Entity"
    }
}

Entity.prototype.canWalkThroughTile = function(tile) {
    return ((tile < BLOCK_START_TILE || tile >= BLOCK_START_TILE + BLOCK_TILE_AMOUNT)
            && tile != 0
            && tile != OVEN_TILE
            && tile != HOSPITAL_TILE);
}

Entity.prototype.getPosInWalkDirection = function(direction) {
    var tempOffset = entityWalkOffsetList[direction];
    var output = this.pos.copy();
    output.add(tempOffset);
    return output;
}
