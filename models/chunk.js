
var chunkSize = 128;
var chunkTileLength = 3;

var INCLUSION_HEIGHT_MAP_OFFSET = 0;
var COLOR_HEIGHT_MAP_OFFSET = 1;
var BLOCK_START_TILE = 129;
var BLOCK_TILE_AMOUNT = 9;

var TERRAIN_RESOLUTION = 16;

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
var chunkUtils = require("utils/chunk");

var tempTerrainOffsetSet1 = [
    new Pos(0, -1),
    new Pos(1, 0),
    new Pos(0, 1),
    new Pos(-1, 0)
];

var tempTerrainOffsetSet2 = [
    new Pos(-1, -1),
    new Pos(1, -1),
    new Pos(1, 1),
    new Pos(-1, 1)
];

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

Chunk.prototype.getTerrainOffsetBoundary = function(offset) {
    var output = TERRAIN_RESOLUTION;
    while (output > 1) {
        if (offset % output == 0) {
            break;
        }
        output /= 2;
    }
    return output;
}

Chunk.prototype.generateHeightMapValue = function(pos, offset) {
    var tempOffsetX = pos.x - this.pos.x;
    var tempOffsetY = pos.y - this.pos.y;
    var tempValue;
    var tempBoundaryX = this.getTerrainOffsetBoundary(tempOffsetX);
    var tempBoundaryY = this.getTerrainOffsetBoundary(tempOffsetY);
    if (tempBoundaryX == TERRAIN_RESOLUTION && tempBoundaryY == TERRAIN_RESOLUTION) {
        tempValue = 1 + Math.random() * 255;
    } else {
        var tempOffsetSet;
        if (tempBoundaryX == tempBoundaryY) {
            tempOffsetSet = tempTerrainOffsetSet2;
        } else {
            tempOffsetSet = tempTerrainOffsetSet1;
        }
        var tempScale;
        if (tempBoundaryX < tempBoundaryY) {
            tempScale = tempBoundaryX;
        } else {
            tempScale = tempBoundaryY;
        }
        var tempOffset = new Pos(0, 0);
        var tempPos = new Pos(0, 0);
        var tempTotal = 0;
        var tempCount = 0;
        var index = 0;
        while (index < tempOffsetSet.length) {
            tempOffset.set(tempOffsetSet[index].copy());
            tempOffset.scale(tempScale);
            tempPos.set(pos);
            tempPos.add(tempOffset);
            var tempValue2 = chunkUtils.getHeightMapValue(tempPos, offset);
            tempTotal += tempValue2;
            tempCount += 1;
            index += 1;
        }
        tempValue = tempTotal / tempCount;
    }
    tempValue = Math.round(tempValue);
    if (tempValue < 1) {
        tempValue = 1;
    }
    if (tempValue > 255) {
        tempValue = 255;
    }
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
    var output = this.data[index + 1 + offset];
    if (output == 0) {
        output = this.generateHeightMapValue(pos, offset);
    }
    return output;
}

Chunk.prototype.setHeightMapValue = function(pos, offset, value) {
    var index = this.convertPosToIndex(pos);
    this.data[index + 1 + offset] = value;
}

