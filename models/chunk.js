
var Pos = require("models/Pos").Pos;

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

