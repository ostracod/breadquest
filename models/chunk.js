
var chunkSize = 100;
var chunkTileLength = 3;

var INCLUSION_HEIGHT_MAP_OFFSET = 0;
var COLOR_HEIGHT_MAP_OFFSET = 1;
var BLOCK_START_TILE = 129;
var BLOCK_TILE_AMOUNT = 9;

function Chunk(pos, data) {
    this.pos = pos;
    this.data = data;
}

module.exports = {
    Chunk: Chunk,
    chunkSize: chunkSize,
    chunkTileLength: chunkTileLength,
    COLOR_HEIGHT_MAP_OFFSET: COLOR_HEIGHT_MAP_OFFSET,
    INCLUSION_HEIGHT_MAP_OFFSET: INCLUSION_HEIGHT_MAP_OFFSET
}

var Pos = require("models/Pos").Pos;

Chunk.prototype.hasGeneratedTiles = function() {
    return (this.data[0] != 0);
}

Chunk.prototype.generateTile = function(pos) {
    var tempInclusionHeightMapValue = this.getHeightMapValue(pos, INCLUSION_HEIGHT_MAP_OFFSET);
    var tempColorHeightMapValue = this.getHeightMapValue(pos, COLOR_HEIGHT_MAP_OFFSET);
    var tempTile = BLOCK_START_TILE + Math.floor(((tempColorHeightMapValue - 1) / 255) * BLOCK_TILE_AMOUNT);
    this.setTile(pos, tempTile);
    return tempTile;
}

Chunk.prototype.generateHeightMapValue = function(pos, offset) {
    var tempValue = 1 + Math.floor(Math.random() * 255);
    this.setHeightMapValue(pos, offset, tempValue);
    return tempValue;
}

Chunk.prototype.generateAllTiles = function() {
    var tempPos = new Pos(0, 0);
    var tempOffset = new Pos(0, 0);
    while (tempOffset.y < chunkSize) {
        tempPos.set(this.pos);
        tempPos.add(tempOffset);
        this.generateTile(tempPos);
        tempOffset.x += 1;
        if (tempOffset.x >= chunkSize) {
            tempOffset.x = 0;
            tempOffset.y += 1;
        }
    }
}

Chunk.prototype.convertPosToIndex = function(pos) {
    var tempOffsetX = pos.x - this.pos.x;
    var tempOffsetY = pos.y - this.pos.y;
    return (tempOffsetX + tempOffsetY * chunkSize) * chunkTileLength;
}

Chunk.prototype.getTile = function(pos) {
    if (!this.hasGeneratedTiles()) {
        this.generateAllTiles();
    }
    var index = this.convertPosToIndex(pos);
    return this.data[index];
}

Chunk.prototype.setTile = function(pos, value) {
    var index = this.convertPosToIndex(pos);
    this.data[index] = value;
}

Chunk.prototype.getHeightMapValue = function(pos, offset) {
    var index = this.convertPosToIndex(pos);
    var output = this.data[index + offset];
    if (output == 0) {
        output = this.generateHeightMapValue(pos, offset);
    }
    return output;
}

Chunk.prototype.setHeightMapValue = function(pos, offset, value) {
    var index = this.convertPosToIndex(pos);
    this.data[index + offset] = value;
}

