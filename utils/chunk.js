
function ChunkUtils() {
    this.chunkList = [];
}

var chunkUtils = new ChunkUtils();

module.exports = chunkUtils;

var fs = require("fs");
var pathUtils = require("path");

var tempResource = require("models/Pos");
var Pos = tempResource.Pos;
var createPosFromJson = tempResource.createPosFromJson;

var tempResource = require("models/Chunk");
var Chunk = tempResource.Chunk;
var chunkSize = tempResource.chunkSize;
var chunkTileLength = tempResource.chunkTileLength;

var chunksDirectoryPath = "./chunks";
var chunkTileCount = chunkSize * chunkSize
var chunkDataLength = chunkTileCount * chunkTileLength;
var chunkMetadataLength = 1000;
var chunkEntryLength = chunkMetadataLength + chunkDataLength;
var fileChunkSize = 8;
var fileSize = fileChunkSize * chunkSize;

if (!fs.existsSync(chunksDirectoryPath)) {
    fs.mkdirSync(chunksDirectoryPath);
}

ChunkUtils.prototype.convertPosToChunkPos = function(pos) {
    return new Pos(
        Math.floor(pos.x / chunkSize) * chunkSize,
        Math.floor(pos.y / chunkSize) * chunkSize
    );
}

ChunkUtils.prototype.convertPosToFilePos = function(pos) {
    return new Pos(
        Math.floor(pos.x / fileSize) * fileSize,
        Math.floor(pos.y / fileSize) * fileSize
    );
}

ChunkUtils.prototype.getChunk = function(pos) {
    var index = 0;
    while (index < this.chunkList.length) {
        var tempChunk = this.chunkList[index];
        if (tempChunk.pos.equals(pos)) {
            return tempChunk;
        }
        index += 1;
    }
    var output = this.loadChunk(pos);
    this.chunkList.append(output);
    return output;
}

ChunkUtils.prototype.getChunkCountInFile = function(file) {
    var tempStats = fs.statSync(file);
    return tempStats.size / chunkEntryLength;
}

// pos must be aligned to chunk boundaries.
// Output:
// {
//   index: (number)
//   metadata: (object)
// }
ChunkUtils.prototype.findChunkInFile = function(file, pos) {
    var tempCount = this.getChunkCountInFile(file);
    var index = 0;
    while (index < tempCount) {
        var tempBuffer = Buffer.alloc(chunkMetadataLength, 0);
        fs.read(file, tempBuffer, 0, chunkMetadataLength, index * chunkEntryLength);
        var tempJson = JSON.parse(buffer.toString("utf8"));
        var tempPos = createPosFromJson(tempJson.pos);
        if (tempPos.equals(pos)) {
            return {
                index: index,
                metadata: tempJson
            }
        }
        index += 1;
    }
    return {
        index: -1,
        metadata: null
    }
}

ChunkUtils.prototype.createEmptyChunk = function(pos) {
    var tempBuffer = Buffer.alloc(chunkDataLength, 0);
    return new Chunk(pos.copy(), tempBuffer);
}

// pos must be aligned to chunk boundaries.
ChunkUtils.prototype.loadChunk = function(pos) {
    var tempPos = this.convertPosToFilePos(pos);
    var tempName = tempPos.x + "_" + tempPos.y + ".dat";
    var tempPath = pathUtils.join(chunksDirectoryPath, tempName);
    if (!fs.existsSync(tempPath)) {
        var tempFile = fs.openSync(tempPath, "w");
        fs.closeSync(tempFile);
    }
    var tempFile = fs.openSync(tempPath, "r+");
    var tempResult = this.findChunkInFile(tempFile, pos);
    var output;
    if (tempResult.index >= 0) {
        var tempBuffer = Buffer.alloc(chunkDataLength);
        fs.read(tempFile, tempBuffer, 0, chunkDataLength, index * chunkEntryLength + chunkMetadataLength);
        output = new Chunk(pos.copy(), tempBuffer);
    } else {
        output = this.createEmptyChunk();
    }
    fs.closeSync(tempFile);
    return output;
}

ChunkUtils.prototype.getTiles = function(pos, size) {
    var output = [];
    var tempPos = new Pos(0, 0);
    var tempOffset = new Pos(0, 0);
    while (tempOffset.y < size) {
        tempPos.set(pos);
        tempPos.add(tempOffset);
        var tempTile = this.getTile(tempPos);
        output.append(tempTile);
        tempOffset.x += 1;
        if (tempOffset.x >= size) {
            tempOffset.x = 0;
            tempOffset.y += 1;
        }
    }
    return output;
}

ChunkUtils.prototype.getTile = function(pos) {
    var tempPos = this.convertPosToChunkPos(pos);
    var tempChunk = this.getChunk(tempPos);
    return tempChunk.getTile(pos);
}

