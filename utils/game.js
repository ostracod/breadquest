
function GameUtils() {

}

var gameUtils = new GameUtils();

module.exports = gameUtils;

var tempResource = require("models/Pos");
var Pos = tempResource.Pos;
var createPosFromJson = tempResource.createPosFromJson;

var classUtils = require("utils/class.js");
var accountUtils = require("utils/account.js");
var chunkUtils = require("utils/chunk.js");

var hasStopped = false;
var maximumPlayerCount = 15;

GameUtils.prototype.performUpdate = function(username, commandList, done) {
    if (hasStopped) {
        done({
            success: false,
            message: "The server is scheduled to shut down. Please come back later."
        });
        return;
    }
    var tempPlayer;
    var tempCommandList;
    var index = 0;
    function startProcessingCommands() {
        //var tempDate = new Date();
        //tempPlayer.lastActivityTime = tempDate.getTime();
        tempCommandList = [];
        index = 0;
        processNextCommand();
    }
    function processNextCommand() {
        while (true) {
            if (index >= commandList.length) {
                done({
                    success: true,
                    commandList: tempCommandList
                });
                return;
            }
            var tempCommand = commandList[index];
            index += 1;
            if (tempCommand.commandName == "getTiles") {
                performGetTilesCommand(tempCommand, tempPlayer, tempCommandList);
            }
        }
    }
    tempPlayer = null;
    //tempPlayer = gameUtils.getPlayerByUsername(username);
    //if (tempPlayer === null) {
    if (false) {
        var tempCount = 0;
        var index = 0;
        while (index < entityList.length) {
            var tempEntity = entityList[index];
            if (classUtils.isInstanceOf(tempEntity, Player)) {
                tempCount += 1;
            }
            index += 1;
        }
        if (tempCount >= maximumPlayerCount) {
            done({
                success: false,
                message: "The server has reached maximum player capacity. Please come back later."
            });
            return;
        }
        accountUtils.acquireLock(function() {
            accountUtils.findAccountByUsername(username, function(error, index, result) {
                accountUtils.releaseLock();
                if (error) {
                    reportDatabaseErrorWithJson(error, res);
                    return;
                }
                tempPlayer = new Player(new Pos(0, 0), username);
                startProcessingCommands();
            });
        });
    } else {
        startProcessingCommands();
    }
}

function addSetTilesCommand(pos, size, tileList, commandList) {
    commandList.push({
        commandName: "setTiles",
        pos: createPosFromJson(pos),
        tileList: tileList,
        size: size,
        tileList: tileList
    });
}

function performGetTilesCommand(command, player, commandList) {
    var tempPos = createPosFromJson(command.pos);
    var tempSize = command.size;
    if (tempSize > 50) {
        return;
    }
    var tempTileList = chunkUtils.getTiles(tempPos, tempSize);
    addSetTilesCommand(tempPos, tempSize, tempTileList, commandList);
}

GameUtils.prototype.persistEverything = function(done) {
    chunkUtils.persistAllChunks();
    done();
}

GameUtils.prototype.stopGame = function(done) {
    hasStopped = true;
    this.persistEverything(done);
}

setInterval(function() {
    if (!hasStopped) {
        gameUtils.persistEverything(function() {});
    }
}, 60 * 1000);
