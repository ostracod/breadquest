
var fs = require("fs");
var pathUtils = require("path");

var chunkSize = 128;
var chunkTileLength = 3;
var chunksDirectoryPath = "./chunks";
var chunkTileCount = chunkSize * chunkSize
var chunkDataLength = chunkTileCount * chunkTileLength;
var chunkMetadataLength = 1000;
var chunkEntryLength = chunkMetadataLength + chunkDataLength;

var OVEN_TILE = 149;

function getChunkCountInFile(file) {
    var tempStats = fs.fstatSync(file);
    return tempStats.size / chunkEntryLength;
}

console.log("Analyzing...");

var tempNameList = fs.readdirSync(chunksDirectoryPath);
var tempPathList = [];
var index = 0;
while (index < tempNameList.length) {
    var tempName = tempNameList[index];
    tempPathList.push(pathUtils.join(chunksDirectoryPath, tempName));
    index += 1;
}

var generatedChunkCount = 0;
var ovenCount = 0;

function analyzeChunkBuffer(buffer) {
    var index = 0;
    while (index < buffer.length) {
        var tempTile = buffer[index];
        if (tempTile == 0) {
            return;
        }
        if (tempTile == OVEN_TILE) {
            ovenCount += 1;
        }
        index += chunkTileLength;
    }
    generatedChunkCount += 1;
}

function analyzeChunkFile(path) {
    var tempFile = fs.openSync(path, "r+");
    var tempCount = getChunkCountInFile(tempFile);
    var index = 0;
    while (index < tempCount) {
        var tempBuffer = Buffer.alloc(chunkDataLength);
        fs.readSync(tempFile, tempBuffer, 0, chunkDataLength, index * chunkEntryLength + chunkMetadataLength);
        analyzeChunkBuffer(tempBuffer);
        index += 1;
    }
    fs.closeSync(tempFile);
}

var index = 0;
while (index < tempPathList.length) {
    var tempPath = tempPathList[index];
    analyzeChunkFile(tempPath);
    index += 1;
}

console.log("Generated chunk count: " + generatedChunkCount);
console.log("Oven count: " + ovenCount);


