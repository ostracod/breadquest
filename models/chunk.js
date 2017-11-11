
var Pos = require("models/Pos").Pos;

var chunkSize = 100;
var chunkTileLength = 3;

function Chunk(pos, data) {
    this.pos = pos;
    this.data = data;
}

Chunk.prototype.convertPosToIndex = function(pos) {
    var tempOffsetX = pos.x - this.pos.x;
    var tempOffsetY = pos.y - this.pos.y;
    return (tempOffsetX + tempOffsetY * chunkSize) * chunkTileLength;
}

Chunk.prototype.getTile = function(pos) {
    var index = this.convertPosToIndex(pos);
    return this.data[index];
}

module.exports = {
    Chunk: Chunk,
    chunkSize: chunkSize,
    chunkTileLength: chunkTileLength
}

