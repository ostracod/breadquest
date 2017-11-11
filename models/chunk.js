
var chunkSize = 100;
var chunkTileLength = 3;

function Chunk(pos, data) {
    this.pos = pos;
    this.data = data;
}

module.exports = {
    Chunk: Chunk,
    chunkSize: chunkSize,
    chunkTileLength: chunkTileLength
}

var Pos = require("models/Pos").Pos;

Chunk.prototype.hasGeneratedTiles = function() {
    return (this.data[0] != 0);
}

Chunk.prototype.generateTile = function(pos) {
    var tempTile = 128 + Math.floor(Math.random() * 2);
    this.setTile(pos, tempTile);
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


