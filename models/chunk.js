
var chunkSize = 128;
var chunkTileLength = 3;
var restZoneTileOffset = 2;

var REST_ZONE_RADIUS = 8;

var INCLUSION_HEIGHT_MAP_OFFSET = 0;
var COLOR_HEIGHT_MAP_OFFSET = 1;
var EMPTY_TILE = 128;
var BLOCK_START_TILE = 129;
var BLOCK_TILE_AMOUNT = 8;
var TRAIL_START_TILE = 137;
var TRAIL_TILE_AMOUNT = 8;
var FLOUR_TILE = 145;
var WATER_TILE = 146;
var POWDER_TILE = 147;
var BREAD_TILE = 148;
var OVEN_TILE = 149;
var HOSPITAL_TILE = 150;
var SYMBOL_START_TILE = 33;
var SYMBOL_TILE_AMOUNT = 94;

var TERRAIN_INCLUSION_RESOLUTION = 8;
var TERRAIN_COLOR_RESOLUTION = 16;
var TERRAIN_INCLUSION_THRESHOLD = 128;
var TERRAIN_INCLUSION_NOISE = 0.5;
var TERRAIN_COLOR_NOISE = 0.2;

function Chunk(pos, data) {
    this.pos = pos;
    this.data = data;
    this.isDirty = false;
    this.populateRestZonePos();
}

module.exports = {
    Chunk: Chunk,
    chunkSize: chunkSize,
    chunkTileLength: chunkTileLength,
    REST_ZONE_RADIUS: REST_ZONE_RADIUS,
    COLOR_HEIGHT_MAP_OFFSET: COLOR_HEIGHT_MAP_OFFSET,
    INCLUSION_HEIGHT_MAP_OFFSET: INCLUSION_HEIGHT_MAP_OFFSET,
    EMPTY_TILE: EMPTY_TILE,
    BLOCK_START_TILE: BLOCK_START_TILE,
    BLOCK_TILE_AMOUNT: BLOCK_TILE_AMOUNT,
    TRAIL_START_TILE: TRAIL_START_TILE,
    TRAIL_TILE_AMOUNT: TRAIL_TILE_AMOUNT,
    FLOUR_TILE: FLOUR_TILE,
    WATER_TILE: WATER_TILE,
    POWDER_TILE: POWDER_TILE,
    BREAD_TILE: BREAD_TILE,
    OVEN_TILE: OVEN_TILE,
    HOSPITAL_TILE: HOSPITAL_TILE,
    SYMBOL_START_TILE: SYMBOL_START_TILE,
    SYMBOL_TILE_AMOUNT: SYMBOL_TILE_AMOUNT
}

var Pos = require("models/pos").Pos;
var Player = require("models/enemy").Player;
var Enemy = require("models/enemy").Enemy;
var entityList = require("models/entity").entityList;
var classUtils = require("utils/class");
var chunkUtils = require("utils/chunk");
var gameUtils = require("utils/game");

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

Chunk.prototype.populateRestZonePos = function() {
    this.restZonePos = null;
    if (!this.hasGeneratedTiles()) {
        return;
    }
    var tempPos = new Pos(0, 0);
    var tempOffset = new Pos(0, 0);
    while (tempOffset.y < chunkSize) {
        tempPos.set(this.pos);
        tempPos.add(tempOffset);
        var tempTile = this.getTile(tempPos);
        if (tempTile == OVEN_TILE) {
            this.restZonePos = tempPos.copy();
            this.restZonePos.x += restZoneTileOffset;
            break;
        }
        tempOffset.x += 1;
        if (tempOffset.x >= chunkSize) {
            tempOffset.x = 0;
            tempOffset.y += 1;
        }
    }
}

Chunk.prototype.addRestZone = function() {
    if (this.restZonePos !== null) {
        return;
    }
    var tempMargin = REST_ZONE_RADIUS + 5;
    this.restZonePos = new Pos(
        tempMargin + Math.floor(Math.random() * (chunkSize - tempMargin * 2)),
        tempMargin + Math.floor(Math.random() * (chunkSize - tempMargin * 2))
    );
    this.restZonePos.add(this.pos);
    var tempPos = this.restZonePos.copy();
    tempPos.x -= restZoneTileOffset;
    this.setTile(tempPos, OVEN_TILE);
    tempPos.x += restZoneTileOffset * 2;
    this.setTile(tempPos, HOSPITAL_TILE);
}

Chunk.prototype.getRestZonePos = function(pos) {
    if (!this.hasGeneratedTiles()) {
        this.generateAllTiles();
    }
    if (this.restZonePos === null) {
        return this.restZonePos;
    } else {
        return this.restZonePos.copy();
    }
}

Chunk.prototype.hasGeneratedTiles = function() {
    return (this.data[0] != 0);
}

Chunk.prototype.generateTile = function(pos) {
    var tempTile;
    var tempInclusionHeightMapValue = this.getHeightMapValue(pos, INCLUSION_HEIGHT_MAP_OFFSET);
    if (tempInclusionHeightMapValue < TERRAIN_INCLUSION_THRESHOLD) {
        var tempColorHeightMapValue = this.getHeightMapValue(pos, COLOR_HEIGHT_MAP_OFFSET);
        tempTile = BLOCK_START_TILE + Math.floor(((tempColorHeightMapValue - 1) / 255) * BLOCK_TILE_AMOUNT);
        if (tempTile >= BLOCK_START_TILE + BLOCK_TILE_AMOUNT) {
            tempTile = BLOCK_START_TILE + BLOCK_TILE_AMOUNT - 1;
        }
        if (tempTile < BLOCK_START_TILE) {
            tempTile = BLOCK_START_TILE;
        }
    } else {
        if (Math.random() < 0.01) {
            tempTile = FLOUR_TILE + Math.floor(Math.random() * 3);
        } else {
            tempTile = EMPTY_TILE;
        }
    }
    this.setTile(pos, tempTile);
    return tempTile;
}

Chunk.prototype.getTerrainOffsetBoundary = function(offset, resolution) {
    var output = resolution;
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
    var tempResolution;
    if (offset == INCLUSION_HEIGHT_MAP_OFFSET) {
        tempResolution = TERRAIN_INCLUSION_RESOLUTION;
    }
    if (offset == COLOR_HEIGHT_MAP_OFFSET) {
        tempResolution = TERRAIN_COLOR_RESOLUTION;
    }
    var tempBoundaryX = this.getTerrainOffsetBoundary(tempOffsetX, tempResolution);
    var tempBoundaryY = this.getTerrainOffsetBoundary(tempOffsetY, tempResolution);
    if (tempBoundaryX == tempResolution && tempBoundaryY == tempResolution) {
        tempValue = 1 + Math.random() * 255;
    } else {
        var tempNoise;
        if (offset == INCLUSION_HEIGHT_MAP_OFFSET) {
            tempNoise = TERRAIN_INCLUSION_NOISE;
        }
        if (offset == COLOR_HEIGHT_MAP_OFFSET) {
            tempNoise = TERRAIN_COLOR_NOISE;
        }
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
        var tempNoiseRange = (tempScale / tempResolution) * 128 * tempNoise;
        tempValue += tempNoiseRange - Math.random() * tempNoiseRange * 2;
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
    if ((this.pos.x == 0 && this.pos.y == 0) || Math.random() < 1 / (15 * 15)) {
        this.addRestZone();
    }
    chunkUtils.persistAllChunks();
}

Chunk.prototype.convertPosToIndex = function(pos) {
    var tempOffsetX = pos.x - this.pos.x;
    var tempOffsetY = pos.y - this.pos.y;
    return (tempOffsetX + tempOffsetY * chunkSize) * chunkTileLength;
}

Chunk.prototype.getTileWithoutGenerating = function(pos) {
    if (!this.hasGeneratedTiles()) {
        return 0;
    }
    var index = this.convertPosToIndex(pos);
    return this.data[index];
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
    this.isDirty = true;
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
    this.isDirty = true;
}

Chunk.prototype.getOrthogonalDistance = function(pos) {
    var tempPos = this.pos.copy();
    var tempHalfChunkSize = Math.round(chunkSize / 2);
    tempPos.x += tempHalfChunkSize;
    tempPos.y += tempHalfChunkSize;
    var output = pos.getOrthogonalDistance(tempPos) - tempHalfChunkSize;
    if (output < 0) {
        output = 0;
    }
    return output;
}

Chunk.prototype.posIsInRestZone = function(pos) {
    if (this.restZonePos === null) {
        return false;
    }
    return (pos.getOrthogonalDistance(this.restZonePos) <= REST_ZONE_RADIUS);
}

Chunk.prototype.tryToSpawnEnemy = function() {
    var tempOffset = new Pos(Math.floor(Math.random() * chunkSize), Math.floor(Math.random() * chunkSize));
    var tempPos = this.pos.copy();
    tempPos.add(tempOffset);
    var tempTile = this.getTile(tempPos);
    if (tempTile != EMPTY_TILE) {
        return false;
    }
    if (this.posIsInRestZone(tempPos)) {
        return false;
    }
    var tempCount = gameUtils.getEntityCountByClassNearPos(Enemy, tempPos, 50);
    if (tempCount >= 10) {
        return false;
    }
    var tempCount = gameUtils.getEntityCountByClassNearPos(Player, tempPos, 20);
    if (tempCount >= 1) {
        return false;
    }
    console.log("Spawning enemy at " + tempPos.toString() + ".");
    new Enemy(tempPos);
    return true;
}

Chunk.prototype.containsPos = function(pos) {
    return (pos.x >= this.pos.x && pos.x < this.pos.x + chunkSize
        && pos.y >= this.pos.y && pos.y < this.pos.y + chunkSize);
}

// Called before the chunk is removed and persisted.
Chunk.prototype.removeEvent = function() {
    console.log("Removing chunk at " + this.pos.toString() + ".");
    var index = entityList.length - 1;
    while (index >= 0) {
        var tempEntity = entityList[index];
        if (classUtils.isInstanceOf(tempEntity, Enemy)) {
            if (this.containsPos(tempEntity.pos)) {
                console.log("Despawning enemy at " + tempEntity.pos.toString() + ".");
                tempEntity.remove();
            }
        }
        index -= 1;
    }
}
