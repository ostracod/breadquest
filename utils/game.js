
var app = require("breadQuest");

function GameUtils() {
    this.framesPerSecond = 16;
    this.hasStopped = false;
    this.maximumPlayerCount = 15;
    this.persistDelay = 60 * this.framesPerSecond;
    this.removeFarChunksDelay = 0;
    this.enemySpawnDelay = 0;
    this.enemyToChunkRatio = 10;
    this.isPersistingEverything = false;
    this.avatarChangeCost = 30;
    var mode = app.get("env");
    this.isInDevelopmentMode = (mode == "development");
}

var gameUtils = new GameUtils();

module.exports = gameUtils;

var tempResource = require("models/pos");
var Pos = tempResource.Pos;
var createPosFromJson = tempResource.createPosFromJson;

var tempResource = require("models/chatMessage");
var ChatMessage = tempResource.ChatMessage;
var chatMessageList = tempResource.chatMessageList;

var entityList = require("models/entity").entityList;
var Player = require("models/player").Player;
var Crack = require("models/crack").Crack;
var Enemy = require("models/enemy").Enemy;

var classUtils = require("utils/class.js");
var accountUtils = require("utils/account.js");
var chunkUtils = require("utils/chunk.js");

GameUtils.prototype.getPlayerByUsername = function(username) {
    var index = 0;
    while (index < entityList.length) {
        var tempEntity = entityList[index];
        if (classUtils.isInstanceOf(tempEntity, Player)) {
            if (tempEntity.username == username) {
                return tempEntity;
            }
        }
        index += 1;
    }
    return null;
}

GameUtils.prototype.getCrackByUsername = function(username) {
    var index = 0;
    while (index < entityList.length) {
        var tempEntity = entityList[index];
        if (classUtils.isInstanceOf(tempEntity, Crack)) {
            if (tempEntity.username == username) {
                return tempEntity;
            }
        }
        index += 1;
    }
    return null;
}

GameUtils.prototype.getEntityCountByClass = function(entityClass) {
    var output = 0;
    var index = 0;
    while (index < entityList.length) {
        var tempEntity = entityList[index];
        if (classUtils.isInstanceOf(tempEntity, entityClass)) {
            output += 1;
        }
        index += 1;
    }
    return output;
}

GameUtils.prototype.getEntityCountByClassNearPos = function(entityClass, pos, radius) {
    var output = 0;
    var index = 0;
    while (index < entityList.length) {
        var tempEntity = entityList[index];
        if (classUtils.isInstanceOf(tempEntity, entityClass)) {
            if (tempEntity.pos.getOrthogonalDistance(pos) <= radius) {
                output += 1;
            }
        }
        index += 1;
    }
    return output;
}

GameUtils.prototype.getEntitiesByClassNearPos = function(entityClass, pos, radius) {
    var output = [];
    var index = 0;
    while (index < entityList.length) {
        var tempEntity = entityList[index];
        if (classUtils.isInstanceOf(tempEntity, entityClass)) {
            if (tempEntity.pos.getOrthogonalDistance(pos) <= radius) {
                output.push(tempEntity);
            }
        }
        index += 1;
    }
    return output;
}

GameUtils.prototype.getNewPlayerRespawnPos = function() {
    var tempChunk = chunkUtils.getChunk(new Pos(0, 0));
    return tempChunk.getRestZonePos();
}

GameUtils.prototype.spawnEnemies = function() {
    var tempChunkList = chunkUtils.getGeneratedChunkList();
    if (tempChunkList.length <= 0) {
        return;
    }
    if (this.isInDevelopmentMode) {
        console.log("Spawning enemies.");
    }
    var tempEnemyCount = this.getEntityCountByClass(Enemy);
    var tempMaximumEnemyCount = tempChunkList.length * this.enemyToChunkRatio;
    var tempIterationCount = 0;
    while (tempEnemyCount < tempMaximumEnemyCount && tempIterationCount < 150) {
        var index = Math.floor(Math.random() * tempChunkList.length);
        var tempChunk = tempChunkList[index];
        var tempResult = tempChunk.tryToSpawnEnemy();
        if (tempResult) {
            tempEnemyCount += 1;
        }
        tempIterationCount += 1;
    }
}

GameUtils.prototype.performUpdate = function(username, commandList, done) {
    function errorHandler(message) {
        done({
            success: false,
            message: message
        });
    }
    if (this.hasStopped) {
        errorHandler("The server is scheduled to shut down. Please come back later.");
        return;
    }
    var tempPlayer;
    var tempCommandList;
    var index = 0;
    function startProcessingCommands() {
        var tempDate = new Date();
        tempPlayer.lastActivityTime = tempDate.getTime();
        tempCommandList = [];
        index = 0;
        processNextCommand();
    }
    var self = this;
    function processNextCommand() {
        if (self.isPersistingEverything) {
            setTimeout(processNextCommand, 100);
            return;
        }
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
            if (tempCommand.commandName == "startPlaying") {
                performStartPlayingCommand(tempCommand, tempPlayer, tempCommandList, processNextCommand, errorHandler);
                return;
            }
            if (tempCommand.commandName == "getTiles") {
                performGetTilesCommand(tempCommand, tempPlayer, tempCommandList);
            }
            if (tempCommand.commandName == "walk") {
                performWalkCommand(tempCommand, tempPlayer, tempCommandList);
            }
            if (tempCommand.commandName == "assertPos") {
                performAssertPosCommand(tempCommand, tempPlayer, tempCommandList);
            }
            if (tempCommand.commandName == "getEntities") {
                performGetEntitiesCommand(tempCommand, tempPlayer, tempCommandList);
            }
            if (tempCommand.commandName == "addChatMessage") {
                performAddChatMessageCommand(tempCommand, tempPlayer, tempCommandList);
            }
            if (tempCommand.commandName == "getChatMessages") {
                performGetChatMessagesCommand(tempCommand, tempPlayer, tempCommandList);
            }
            if (tempCommand.commandName == "getOnlinePlayers") {
                performGetOnlinePlayersCommand(tempCommand, tempPlayer, tempCommandList);
            }
            if (tempCommand.commandName == "removeTile") {
                performRemoveTileCommand(tempCommand, tempPlayer, tempCommandList);
            }
            if (tempCommand.commandName == "getInventoryChanges") {
                performGetInventoryChangesCommand(tempCommand, tempPlayer, tempCommandList);
            }
            if (tempCommand.commandName == "placeTile") {
                performPlaceTileCommand(tempCommand, tempPlayer, tempCommandList);
            }
            if (tempCommand.commandName == "collectTile") {
                performCollectTileCommand(tempCommand, tempPlayer, tempCommandList);
            }
            if (tempCommand.commandName == "getRespawnPosChanges") {
                performGetRespawnPosChangesCommand(tempCommand, tempPlayer, tempCommandList);
            }
            if (tempCommand.commandName == "getStats") {
                performGetStatsCommand(tempCommand, tempPlayer, tempCommandList);
            }
            if (tempCommand.commandName == "eatBread") {
                performEatBreadCommand(tempCommand, tempPlayer, tempCommandList);
            }
            if (tempCommand.commandName == "getAvatarChanges") {
                performGetAvatarChangesCommand(tempCommand, tempPlayer, tempCommandList);
            }
            if (tempCommand.commandName == "placeSymbolTile") {
                performPlaceSymbolTileCommand(tempCommand, tempPlayer, tempCommandList);
            }
        }
    }
    tempPlayer = gameUtils.getPlayerByUsername(username);
    if (tempPlayer === null) {
        var tempCount = this.getEntityCountByClass(Player);
        if (tempCount >= this.maximumPlayerCount) {
            errorHandler("The server has reached maximum player capacity. Please come back later.");
            return;
        }
        accountUtils.acquireLock(function() {
            accountUtils.findAccountByUsername(username, function(error, index, result) {
                accountUtils.releaseLock();
                if (error) {
                    errorHandler("There was a database error. Please try again later.");
                    return;
                }
                tempPlayer = new Player(result);
                startProcessingCommands();
            });
        });
    } else {
        startProcessingCommands();
    }
}

function addSetLocalPlayerInfoCommand(account, player, commandList) {
    commandList.push({
        commandName: "setLocalPlayerInfo",
        username: account.username,
        avatar: account.avatar,
        // TODO: Populate this value.
        breadCount: 0
    });
}

function addSetTilesCommand(pos, size, tileList, commandList) {
    commandList.push({
        commandName: "setTiles",
        pos: pos.toJson(),
        tileList: tileList,
        size: size
    });
}

function addSetLocalPlayerPosCommand(player, commandList) {
    commandList.push({
        commandName: "setLocalPlayerPos",
        pos: player.pos.toJson(),
    });
}

function addRemoveAllEntitiesCommand(commandList) {
    commandList.push({
        commandName: "removeAllEntities"
    });
}

function addAddEntityCommand(entity, commandList) {
    commandList.push({
        commandName: "addEntity",
        entityInfo: entity.getClientInfo()
    });
}

function addAddChatMessageCommand(chatMessage, commandList) {
    commandList.push({
        commandName: "addChatMessage",
        username: chatMessage.username,
        text: chatMessage.text
    });
}

function addRemoveAllOnlinePlayersCommand(commandList) {
    commandList.push({
        commandName: "removeAllOnlinePlayers"
    });
}

function addAddOnlinePlayerCommand(username, commandList) {
    commandList.push({
        commandName: "addOnlinePlayer",
        username: username
    });
}

function addSetInventoryCommand(inventory, commandList) {
    commandList.push({
        commandName: "setInventory",
        inventory: inventory.toJson()
    });
    inventory.hasChanged = false;
}

function addSetRespawnPosCommand(player, commandList) {
    commandList.push({
        commandName: "setRespawnPos",
        respawnPos: player.respawnPos
    });
}

function addSetStatsCommand(player, commandList) {
    commandList.push({
        commandName: "setStats",
        health: player.health,
        isInvincible: player.isInvincible()
    });
}

function addSetAvatarCommand(player, commandList) {
    commandList.push({
        commandName: "setAvatar",
        avatar: player.avatar,
    });
}

function performStartPlayingCommand(command, player, commandList, done, errorHandler) {
    accountUtils.acquireLock(function() {
        accountUtils.findAccountByUsername(player.username, function(error, index, result) {
            accountUtils.releaseLock();
            if (error) {
                errorHandler(error);
                return;
            }
            addSetLocalPlayerInfoCommand(result, player, commandList);
            addSetInventoryCommand(player.inventory, commandList);
            addSetRespawnPosCommand(player, commandList);
            done();
        });
    });
}

function performGetTilesCommand(command, player, commandList) {
    var tempSize = command.size;
    if (tempSize > 50) {
        return;
    }
    var tempPos = player.pos.copy();
    tempPos.x -= Math.floor(tempSize / 2);
    tempPos.y -= Math.floor(tempSize / 2);
    var tempTileList = chunkUtils.getTiles(tempPos, tempSize);
    addSetTilesCommand(tempPos, tempSize, tempTileList, commandList);
}

function performWalkCommand(command, player, commandList) {
    player.walk(command.direction);
}

function performAssertPosCommand(command, player, commandList) {
    var tempPos = createPosFromJson(command.pos);
    if (!player.pos.equals(tempPos)) {
        addSetLocalPlayerPosCommand(player, commandList);
    }
}

function performGetEntitiesCommand(command, player, commandList) {
    addRemoveAllEntitiesCommand(commandList);
    var index = 0;
    while (index < entityList.length) {
        var tempEntity = entityList[index];
        while (true) {
            var tempRadius = 40;
            if (tempEntity.pos.x < player.pos.x - tempRadius || tempEntity.pos.x > player.pos.x + tempRadius
                    || tempEntity.pos.y < player.pos.y - tempRadius && tempEntity.pos.y > player.pos.y + tempRadius) {
                break;
            }
            if (tempEntity == player) {
                break;
            }
            if (classUtils.isInstanceOf(tempEntity, Crack)) {
                if (tempEntity.username == player.username) {
                    break;
                }
            }
            addAddEntityCommand(tempEntity, commandList);
            break;
        }
        index += 1;
    }
}

function performAddChatMessageCommand(command, player, commandList) {
    new ChatMessage(player.username, command.text);
}

function performGetChatMessagesCommand(command, player, commandList) {
    var tempHighestId = -1;
    var index = 0;
    while (index < chatMessageList.length) {
        var tempChatMessage = chatMessageList[index];
        if (tempChatMessage.id > player.lastChatMessageId) {
            addAddChatMessageCommand(tempChatMessage, commandList);
        }
        if (tempChatMessage.id > tempHighestId) {
            tempHighestId = tempChatMessage.id;
        }
        index += 1;
    }
    player.lastChatMessageId = tempHighestId;
}

function performGetOnlinePlayersCommand(command, player, commandList) {
    addRemoveAllOnlinePlayersCommand(commandList);
    var index = 0;
    while (index < entityList.length) {
        var tempEntity = entityList[index];
        if (classUtils.isInstanceOf(tempEntity, Player)) {
            addAddOnlinePlayerCommand(tempEntity.username, commandList);
        }
        index += 1;
    }
}

function performRemoveTileCommand(command, player, commandList) {
    player.removeTile(command.direction);
}

function performGetInventoryChangesCommand(command, player, commandList) {
    var tempInventory = player.inventory;
    if (tempInventory.hasChanged) {
        addSetInventoryCommand(player.inventory, commandList);
    }
}

function performPlaceTileCommand(command, player, commandList) {
    var tempResult = player.placeTile(command.direction, command.tile);
    if (!tempResult) {
        addSetInventoryCommand(player.inventory, commandList);
    }
}

function performCollectTileCommand(command, player, commandList) {
    player.collectTile(command.direction);
}

function performGetRespawnPosChangesCommand(command, player, commandList) {
    if (player.respawnPosHasChanged) {
        addSetRespawnPosCommand(player, commandList);
        player.respawnPosHasChanged = false;
    }
}

function performGetStatsCommand(command, player, commandList) {
    addSetStatsCommand(player, commandList);
}

function performEatBreadCommand(command, player, commandList) {
    player.eatBread();
}

function performGetAvatarChangesCommand(command, player, commandList) {
    if (player.avatarHasChanged) {
        addSetAvatarCommand(player, commandList);
        player.avatarHasChanged = false;
    }
}

function performPlaceSymbolTileCommand(command, player, commandList) {
    player.placeSymbolTile(command.tile);
}

GameUtils.prototype.persistEverything = function(done) {
    if (this.isPersistingEverything) {
        done();
        return;
    }
    if (this.isInDevelopmentMode) {
        console.log("Saving world state...");
    }
    this.isPersistingEverything = true;
    chunkUtils.persistAllChunks();
    var self = this;
    var index = 0;
    function persistNextEntity() {
        while (true) {
            if (index >= entityList.length) {
                self.isPersistingEverything = false;
                if (self.isInDevelopmentMode) {
                    console.log("Saved world state.");
                }
                done();
                return;
            }
            var tempEntity = entityList[index];
            index += 1;
            if (classUtils.isInstanceOf(tempEntity, Player)) {
                tempEntity.persist(persistNextEntity);
                return;
            }
        }
    }
    persistNextEntity();
}

function exitEvent() {
    gameUtils.persistEverything(function() {
        process.exit();
    })
}

process.on("SIGINT", exitEvent);
process.on("SIGUSR1", exitEvent);
process.on("SIGUSR2", exitEvent);

GameUtils.prototype.stopGame = function(done) {
    this.hasStopped = true;
    this.persistEverything(done);
}

GameUtils.prototype.gameTimerEvent = function() {
    if (this.hasStopped || this.isPersistingEverything) {
        return;
    }
    
    var index = entityList.length - 1;
    while (index >= 0) {
        var tempEntity = entityList[index];
        tempEntity.tick();
        index -= 1;
    }
    this.persistDelay -= 1;
    if (this.persistDelay <= 0) {
        this.persistDelay = 60 * this.framesPerSecond;
        gameUtils.persistEverything(function() {
            // Do nothing.
        });
    }
    this.removeFarChunksDelay -= 1;
    if (this.removeFarChunksDelay <= 0) {
        this.removeFarChunksDelay = 20 * this.framesPerSecond;
        var tempPosList = [];
        var index = 0;
        while (index < entityList.length) {
            var tempEntity = entityList[index];
            if (classUtils.isInstanceOf(tempEntity, Player)) {
                tempPosList.push(tempEntity.pos);
            }
            index += 1;
        }
        chunkUtils.removeFarChunks(tempPosList, 60);
    }
    this.enemySpawnDelay -= 1;
    if (this.enemySpawnDelay <= 0) {
        this.enemySpawnDelay = 10 * this.framesPerSecond;
        this.spawnEnemies();
    }
}

setInterval(function() {
    gameUtils.gameTimerEvent();
}, 1000 / gameUtils.framesPerSecond);
