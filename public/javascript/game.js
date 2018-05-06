
var spriteRenderSize;
var canvas;
var context;
var canvasSpriteSize;
var canvasSize;
var compassCanvas;
var compassContext;
var framesPerSecond = 16;
var canvasIsFocused = true;
var shiftKeyIsHeld = false;
var chatInputIsFocused = false;
var chatInput;
var chatOutput;
var chatMessageTagList = [];
var maximumChatMessageCount = 100;
var overlayChatInputIsFocused = false;
var overlayChatInput;
var overlayChatOutput;
var overlayChatMessageList = [];
var overlayChatInputIsVisible = false;
var barList = [];
var statusBarMaximumWidth = 300;
var cameraPos = new Pos(0, 0);
var gameUpdateCommandList = []
var gameUpdateRequestDelay = 0;
var lastGameUpdateFrameNumber = null;
var isRequestingGameUpdate = false;
var hasStopped = false;
var lastActivityTime = 0;
var colorSet;
var tileBuffer = [];
var tileBufferSize = 100;
var emptyTile = 128;
var blockStartTile = 129;
var blockTileAmount = 8;
var trailStartTile = 137;
var trailTileAmount = 8;
var flourTile = 145;
var waterTile = 146;
var powderTile = 147;
var breadTile = 148;
var ovenTile = 149;
var hospitalTile = 150;
var symbolStartTile = 33;
var symbolTileAmount = 94;
var entityList = [];
var localPlayer;
var entityWalkOffsetList = [
    new Pos(0, -1),
    new Pos(1, 0),
    new Pos(0, 1),
    new Pos(-1, 0),
];
var shouldDrawNameTags = true;
var inventoryItemList = [];
var localCrack = null;
var localCrackTile;
var localCrackExpirationTime;
var selectedInventoryItemIndex = 0;
var respawnPos = new Pos(0, 0);
var localPlayerMaximumHealth = 5;
var localPlayerHealth = localPlayerMaximumHealth;
var invincibilityBlinkDelay = 0;
var textToPlaceInputIsFocused = false;
var textToPlaceInput;
var textToPlace = null;
var textToPlaceIndex;
var textToPlaceIsWaitingToWalk;
var localPlayerWalkRepeatDirection = null;
var localPlayerWalkRepeatDelay = 0;
var localPlayerShouldStopWalkRepeat = true;
var lKeyIsHeld = false;
var guidelinePos = null;
var guidelinePosInput;
var guidelinePosInputIsFocused = false;
var gameUpdateSocket;
var gameUpdateStartTimestamp;
var moduleList = [];

// Thanks to CatTail for this snippet of code.
var encodeHtmlEntity = function(str) {
    var buf = [];
    for (var i=str.length-1;i>=0;i--) {
        buf.unshift(['&#', str[i].charCodeAt(), ';'].join(''));
    }
    return buf.join('');
};

function betterModulus(number1, number2) {
    if (number1 >= 0) {
        return number1 % number2;
    } else {
        return (number1 + Math.floor((-number1) / number2 + 1) * number2) % number2; 
    }
}

function performGameUpdateRequest() {
    isRequestingGameUpdate = true;
    gameUpdateStartTimestamp = Date.now() / 1000;
    gameUpdateSocket.send(JSON.stringify(gameUpdateCommandList));
    gameUpdateCommandList = [];
}

function handleGameUpdateRequest(data) {
    var tempTimestamp = Date.now() / 1000;
    document.getElementById("pingTime").innerHTML = Math.floor((tempTimestamp - gameUpdateStartTimestamp) * 1000);
    if (data.success) {
        var tempCommandList = data.commandList;
        var index = 0;
        while (index < tempCommandList.length) {
            var tempCommand = tempCommandList[index];
            if (tempCommand.commandName == "setLocalPlayerInfo") {
                performSetLocalPlayerInfoCommand(tempCommand);
            }
            if (tempCommand.commandName == "setTiles") {
                performSetTilesCommand(tempCommand);
            }
            if (tempCommand.commandName == "setLocalPlayerPos") {
                performSetLocalPlayerPosCommand(tempCommand);
            }
            if (tempCommand.commandName == "removeAllEntities") {
                performRemoveAllEntitiesCommand(tempCommand);
            }
            if (tempCommand.commandName == "addEntity") {
                performAddEntityCommand(tempCommand);
            }
            if (tempCommand.commandName == "addChatMessage") {
                performAddChatMessageCommand(tempCommand);
            }
            if (tempCommand.commandName == "removeAllOnlinePlayers") {
                performRemoveAllOnlinePlayersCommand(tempCommand);
            }
            if (tempCommand.commandName == "addOnlinePlayer") {
                performAddOnlinePlayerCommand(tempCommand);
            }
            if (tempCommand.commandName == "setInventory") {
                performSetInventoryCommand(tempCommand);
            }
            if (tempCommand.commandName == "setRespawnPos") {
                performSetRespawnPosCommand(tempCommand);
            }
            if (tempCommand.commandName == "setStats") {
                performSetStatsCommand(tempCommand);
            }
            if (tempCommand.commandName == "setAvatar") {
                performSetAvatarCommand(tempCommand);
            }
            if (tempCommand.commandName == "setGuidelinePos") {
                performSetGuidelinePosCommand(tempCommand);
            }
            index += 1;
        }
        // Repeat unprocessed client-side commands.
        var index = 0;
        while (index < gameUpdateCommandList.length) {
            var tempCommand = gameUpdateCommandList[index];
            if (tempCommand.commandName == "placeTile") {
                performPlaceTileCommand(tempCommand);
            }
            if (tempCommand.commandName == "collectTile") {
                performCollectTileCommand(tempCommand);
            }
            if (tempCommand.commandName == "walk") {
                performWalkCommand(tempCommand);
            }
            index += 1;
        }
    } else {
        alert(data.message);
        hasStopped = true;
        window.location = "menu";
    }
    //gameUpdateRequestDelay = 0.25 * framesPerSecond;
    gameUpdateRequestDelay = 0;
    isRequestingGameUpdate = false;
}

function addStartPlayingCommand() {
    gameUpdateCommandList.push({
        commandName: "startPlaying"
    });
}

function addGetTilesCommand() {
    gameUpdateCommandList.push({
        commandName: "getTiles",
        size: canvasSpriteSize + 15
    });
}

function addWalkCommand(direction) {
    gameUpdateCommandList.push({
        commandName: "walk",
        direction: direction,
        // Note: pos is ignored by the server. It is for client-use only.
        pos: localPlayer.getPosInWalkDirection(direction).toJson()
    });
}

function addAssertPosCommand() {
    gameUpdateCommandList.push({
        commandName: "assertPos",
        pos: localPlayer.pos.toJson()
    });
}

function addGetEntitiesCommand() {
    gameUpdateCommandList.push({
        commandName: "getEntities"
    });
}

function addAddChatMessageCommand(text) {
    gameUpdateCommandList.push({
        commandName: "addChatMessage",
        text: text
    });
}

function addGetChatMessagesCommand() {
    gameUpdateCommandList.push({
        commandName: "getChatMessages"
    });
}

function addGetOnlinePlayersCommand() {
    gameUpdateCommandList.push({
        commandName: "getOnlinePlayers"
    });
}

function addRemoveTileCommand(direction) {
    gameUpdateCommandList.push({
        commandName: "removeTile",
        direction: direction
    });
}

function addGetInventoryChangesCommand() {
    gameUpdateCommandList.push({
        commandName: "getInventoryChanges"
    });
}

function addPlaceTileCommand(direction, tile) {
    gameUpdateCommandList.push({
        commandName: "placeTile",
        direction: direction,
        tile: tile,
        // Note: pos is ignored by the server. It is for client-use only.
        pos: localPlayer.getPosInWalkDirection(direction).toJson()
    });
}

function addCollectTileCommand(direction) {
    gameUpdateCommandList.push({
        commandName: "collectTile",
        direction: direction,
        // Note: pos is ignored by the server. It is for client-use only.
        pos: localPlayer.getPosInWalkDirection(direction).toJson()
    });
}

function addGetRespawnPosChangesCommand() {
    gameUpdateCommandList.push({
        commandName: "getRespawnPosChanges"
    });
}

function addGetStatsCommand() {
    gameUpdateCommandList.push({
        commandName: "getStats"
    });
}

function addEatBreadCommand() {
    gameUpdateCommandList.push({
        commandName: "eatBread"
    });
}

function addGetAvatarChangesCommand() {
    gameUpdateCommandList.push({
        commandName: "getAvatarChanges"
    });
}

function addPlaceSymbolTileCommand(tile) {
    gameUpdateCommandList.push({
        commandName: "placeSymbolTile",
        tile: tile,
    });
}

function addSetGuidelinePosCommand() {
    var tempValue;
    if (guidelinePos === null) {
        tempValue = guidelinePos;
    } else {
        tempValue = guidelinePos.toJson();
    }
    gameUpdateCommandList.push({
        commandName: "setGuidelinePos",
        pos: tempValue,
    });
}

function addGetGuidelinePosCommand() {
    gameUpdateCommandList.push({
        commandName: "getGuidelinePos"
    });
}

function performSetLocalPlayerInfoCommand(command) {
    localPlayer.username = command.username;
    localPlayer.avatar = command.avatar;
    localPlayer.breadCount = command.breadCount;
}

function performSetTilesCommand(command) {
    var tempPos = createPosFromJson(command.pos);
    var tempSize = command.size;
    var tempTileList = command.tileList;
    resetTileBuffer();
    var index = 0;
    var tempPos2 = new Pos(0, 0);
    var tempOffset = new Pos(0, 0);
    while (tempOffset.y < tempSize) {
        var tempTile = tempTileList[index];
        tempPos2.set(tempPos);
        tempPos2.add(tempOffset);
        setTileBufferValue(tempPos2, tempTile);
        index += 1;
        tempOffset.x += 1;
        if (tempOffset.x >= tempSize) {
            tempOffset.x = 0;
            tempOffset.y += 1;
        }
    }
    if (localCrack !== null) {
        setTileBufferValue(localCrack.pos, localCrackTile);
    }
}

function performSetLocalPlayerPosCommand(command) {
    localPlayer.pos = createPosFromJson(command.pos);
}

function performRemoveAllEntitiesCommand(command) {
    entityList = [localPlayer];
    if (localCrack !== null) {
        entityList.push(localCrack);
    }
}

function performAddEntityCommand(command) {
    var tempEntityInfo = command.entityInfo;
    var tempClassName = tempEntityInfo.className;
    var tempPos = createPosFromJson(tempEntityInfo.pos);
    if (tempClassName == "Player") {
        var tempPlayer = new Player(
            tempEntityInfo.id,
            tempPos,
            tempEntityInfo.username,
            tempEntityInfo.avatar,
            tempEntityInfo.breadCount
        );
        tempPlayer.isInvincible = tempEntityInfo.isInvincible;
    }
    if (tempClassName == "Crack") {
        new Crack(
            tempEntityInfo.id,
            tempPos,
        );
    }
    if (tempClassName == "Enemy") {
        new Enemy(
            tempEntityInfo.id,
            tempPos,
        );
    }
}

function performAddChatMessageCommand(command) {
    var tempPlayerName;
    if (command.username === null) {
        tempPlayerName = null;
    } else {
        tempPlayerName = encodeHtmlEntity(command.username);
    }
    var tempText = encodeHtmlEntity(command.text);
    var tempIsAtBottom = (chatOutput.scrollTop + 150 > chatOutput.scrollHeight - 30);
    var tempTag = document.createElement("div");
    if (tempPlayerName === null) {
        tempTag.innerHTML = tempText;
    } else {
        tempTag.innerHTML = "<strong>" + tempPlayerName + ":</strong> " + tempText;
    }
    chatOutput.appendChild(tempTag);
    chatMessageTagList.push(tempTag);
    while (chatMessageTagList.length > maximumChatMessageCount) {
        var tempTag = chatMessageTagList[0];
        chatOutput.removeChild(tempTag);
        chatMessageTagList.splice(0, 1);
    }
    if (tempIsAtBottom) {
        chatOutput.scrollTop = chatOutput.scrollHeight;
    }
    new OverlayChatMessage(tempPlayerName, tempText);
}

function performRemoveAllOnlinePlayersCommand(command) {
    var tempTag = document.getElementById("onlinePlayersDiv");
    tempTag.innerHTML = "";
}

function performAddOnlinePlayerCommand(command) {
    var tempTag = document.getElementById("onlinePlayersDiv");
    tempTag.innerHTML += "<strong>" + encodeHtmlEntity(command.username) + "</strong><br />";
}

function performSetInventoryCommand(command) {
    var tempInventory = command.inventory;
    var index = 0;
    while (index < inventoryItemList.length) {
        var tempInventoryItem = inventoryItemList[index];
        var tempTile = tempInventoryItem.tile;
        if (tempTile in tempInventory) {
            var tempCount = tempInventory[tempTile];
            tempInventoryItem.setCount(tempCount);
        }
        index += 1;
    }
    localPlayer.breadCount = getInventoryItemByTile(breadTile).count;
    var tempFlourCount = getInventoryItemByTile(flourTile).count;
    var tempWaterCount = getInventoryItemByTile(waterTile).count;
    var tempPowderCount = getInventoryItemByTile(powderTile).count;
    var tempUnbakedBreadCount = Math.min(tempFlourCount, tempWaterCount, tempPowderCount);
    var tempEffectiveBreadCount = localPlayer.breadCount + tempUnbakedBreadCount;
    document.getElementById("breadCount").innerHTML = localPlayer.breadCount;
    document.getElementById("flourCount").innerHTML = tempFlourCount;
    document.getElementById("waterCount").innerHTML = tempWaterCount;
    document.getElementById("powderCount").innerHTML = tempPowderCount;
    document.getElementById("unbakedBreadCount").innerHTML = tempUnbakedBreadCount;
    document.getElementById("effectiveBreadCount").innerHTML = tempEffectiveBreadCount;
}

function performPlaceTileCommand(command) {
    setTileBufferValue(createPosFromJson(command.pos), command.tile);
}

function performCollectTileCommand(command) {
    setTileBufferValue(createPosFromJson(command.pos), emptyTile);
}

function performSetRespawnPosCommand(command) {
    respawnPos = createPosFromJson(command.respawnPos);
    document.getElementById("respawnPos").innerHTML = createPosFromJson(respawnPos);
}

function performSetStatsCommand(command) {
    localPlayerHealth = command.health;
    document.getElementById("hp").innerHTML = localPlayerHealth;
    localPlayer.isInvincible = command.isInvincible;
}

function performSetAvatarCommand(command) {
    localPlayer.avatar = command.avatar;
}

function performWalkCommand(command) {
    var tempPos = createPosFromJson(command.pos);
    placeLocalPlayerTrail(tempPos);
}

function performSetGuidelinePosCommand(command) {
    if (command.pos === null) {
        guidelinePos = command.pos;
    } else {
        guidelinePos = createPosFromJson(command.pos);
    }
    displayGuidelinePos();
}

function placeLocalPlayerTrail(pos) {
    var tempTile = getTileBufferValue(pos);
    if ((tempTile >= trailStartTile && tempTile < trailStartTile + trailTileAmount)
            || (tempTile >= flourTile && tempTile <= breadTile)
            || tempTile == emptyTile) {
        setTileBufferValue(pos, trailStartTile + localPlayer.avatar);
    }
}

function Entity(id, pos) {
    this.id = id;
    this.pos = pos;
    entityList.push(this);
}

Entity.prototype.canWalkThroughTile = function(tile) {
    return ((tile < blockStartTile || tile >= blockStartTile + blockTileAmount)
            && tile != 0
            && tile != ovenTile
            && tile != hospitalTile);
}

function InventoryItem(tile, name) {
    this.tile = tile;
    this.name = name;
    this.count = 0;
    this.tag = null;
    this.countLabel = null;
    inventoryItemList.push(this);
}

InventoryItem.prototype.addToModule = function() {
    var tempContainer = document.getElementById("inventoryDiv");
    this.tag = document.createElement("div");
    this.tag.className = "inventoryItem"
    var tempCanvas = document.createElement("canvas");
    var tempSize = 32;
    tempCanvas.width = tempSize;
    tempCanvas.height = tempSize;
    tempCanvas.style.width = tempSize / 2;
    tempCanvas.style.height = tempSize / 2;
    this.tag.appendChild(tempCanvas);
    var tempNameLabel = document.createElement("strong");
    tempNameLabel.innerHTML = this.name;
    this.tag.appendChild(tempNameLabel);
    this.countLabel = document.createElement("span");
    this.tag.appendChild(this.countLabel);
    this.displayCount();
    tempContainer.appendChild(this.tag);
    var tempContext = tempCanvas.getContext("2d");
    drawTileOnContext(tempContext, new Pos(0, 0), tempSize, this.tile);
    this.updateBorder();
    var index = this.getIndex();
    this.tag.onclick = function() {
        selectInventoryItem(index);
    }
}

InventoryItem.prototype.displayCount = function() {
    this.countLabel.innerHTML = "(x" + this.count + ")";
}

InventoryItem.prototype.setCount = function(count) {
    this.count = count;
    this.displayCount();
}

InventoryItem.prototype.getIndex = function() {
    return inventoryItemList.indexOf(this);
}

InventoryItem.prototype.updateBorder = function() {
    var index = this.getIndex();
    if (index == selectedInventoryItemIndex) {
        this.tag.style.border = "3px #000000 solid";
    } else {
        this.tag.style.border = "3px #FFFFFF solid";
    }
}

function selectInventoryItem(index) {
    selectedInventoryItemIndex = index;
    var index = 0;
    while (index < inventoryItemList.length) {
        var tempInventoryItem = inventoryItemList[index];
        tempInventoryItem.updateBorder();
        index += 1;
    }
}

function getInventoryItemByTile(tile) {
    var index = 0;
    while (index < inventoryItemList.length) {
        var tempInventoryItem = inventoryItemList[index];
        if (tempInventoryItem.tile == tile) {
            return tempInventoryItem;
        }
        index += 1;
    }
    return null;
}

new InventoryItem(flourTile, "Flour");
new InventoryItem(waterTile, "Water");
new InventoryItem(powderTile, "Baking Powder");
new InventoryItem(breadTile, "Bread");
new InventoryItem(blockStartTile + 0, "Red Block");
new InventoryItem(blockStartTile + 1, "Orange Block");
new InventoryItem(blockStartTile + 2, "Yellow Block");
new InventoryItem(blockStartTile + 3, "Green Block");
new InventoryItem(blockStartTile + 4, "Teal Block");
new InventoryItem(blockStartTile + 5, "Blue Block");
new InventoryItem(blockStartTile + 6, "Purple Block");
new InventoryItem(blockStartTile + 7, "Gray Block");

Entity.prototype.remove = function() {
    var index = 0;
    while (index < entityList.length) {
        var tempEntity = entityList[index];
        if (this == tempEntity) {
            entityList.splice(index, 1);
            break;
        }
        index += 1;
    }
}

Entity.prototype.tick = function() {
    // Do nothing.
}

Entity.prototype.draw = function() {
    // Do nothing.
}

Entity.prototype.getDisplayPos = function() {
    var output = this.pos.copy();
    output.subtract(cameraPos);
    return output;
}

Entity.prototype.getPosInWalkDirection = function(direction) {
    var tempOffset = entityWalkOffsetList[direction];
    var output = this.pos.copy();
    output.add(tempOffset);
    return output;
}

function Enemy(id, pos) {
    Entity.call(this, id, pos);
}
setParentClass(Enemy, Entity);

Enemy.prototype.draw = function() {
    Entity.prototype.draw.call(this);
    var tempPos = this.getDisplayPos().copy();
    drawSprite(tempPos, 48);
}

function Player(id, pos, username, avatar, breadCount) {
    Entity.call(this, id, pos);
    this.username = username;
    this.avatar = avatar;
    this.breadCount = breadCount;
    this.walkDelay = 0;
    this.isInvincible = false;
}
setParentClass(Player, Entity);

Player.prototype.tick = function() {
    Entity.prototype.tick.call(this);
    this.walkDelay -= 1;
}

Player.prototype.draw = function() {
    if (this.username === null) {
        return;
    }
    Entity.prototype.draw.call(this);
    var tempPos = this.getDisplayPos().copy();
    if (!(this.isInvincible && invincibilityBlinkDelay < 2)) {
        drawSprite(tempPos, 0 + this.avatar);
    }
    if (shouldDrawNameTags) {
        tempPos.scale(spriteRenderSize);
        tempPos.x += spriteRenderSize / 2;
        tempPos.y -= spriteRenderSize / 2;
        drawCenteredText(tempPos, this.username + " (" + this.breadCount + ")");
    }
}

Player.prototype.walk = function(direction) {
    if (this.walkDelay > 0) {
        return false;
    }
    if (this == localPlayer) {
        if (localCrack !== null) {
            return false;
        }
    }
    var tempPos = this.getPosInWalkDirection(direction);
    var tempTile = getTileBufferValue(tempPos);
    if (!this.canWalkThroughTile(tempTile)) {
        return false;
    }
    addWalkCommand(direction);
    this.pos.set(tempPos);
    placeLocalPlayerTrail(this.pos);
    this.walkDelay = (1 / 8) * framesPerSecond;
    return true;
}

Player.prototype.placeTile = function(direction) {
    var tempPos = this.getPosInWalkDirection(direction);
    var tempInventoryItem = inventoryItemList[selectedInventoryItemIndex];
    if (tempInventoryItem.count <= 0) {
        return;
    }
    tempInventoryItem.count -= 1;
    tempInventoryItem.displayCount();
    var tempTile = tempInventoryItem.tile;
    setTileBufferValue(tempPos, tempTile);
    addPlaceTileCommand(direction, tempTile);
}

Player.prototype.removeTile = function(direction) {
    if (localCrack !== null) {
        return;
    }
    var tempPos = this.getPosInWalkDirection(direction);
    localCrack = new Crack(-1, tempPos, localPlayer.username);
    localCrackTile = getTileBufferValue(tempPos);
    var tempDate = new Date();
    localCrackExpirationTime = tempDate.getTime() + 1000;
    addRemoveTileCommand(direction);
}

Player.prototype.collectTile = function(direction) {
    var tempPos = this.getPosInWalkDirection(direction);
    setTileBufferValue(tempPos, emptyTile);
    addCollectTileCommand(direction);
}

Player.prototype.placeOrRemoveTile = function(direction) {
    var tempPos = this.getPosInWalkDirection(direction);
    var tempTile = getTileBufferValue(tempPos);
    if (tempTile >= blockStartTile && tempTile < blockStartTile + blockTileAmount) {
        this.removeTile(direction);
    }
    if ((tempTile >= flourTile && tempTile <= breadTile)
            || (tempTile >= symbolStartTile && tempTile <= symbolStartTile + symbolTileAmount)) {
        this.collectTile(direction);
    }
    if (tempTile == emptyTile
            || (tempTile >= trailStartTile && tempTile < trailStartTile + trailTileAmount)) {
        this.placeTile(direction);
    }
}

Player.prototype.performActionInDirection = function(direction) {
    if (shiftKeyIsHeld) {
        this.placeOrRemoveTile(direction);
        if (this == localPlayer) {
            localPlayerWalkRepeatDirection = null;
        }
    } else {
        if (this == localPlayer) {
            localPlayerStartWalking(direction);
        } else {
            this.walk(direction);
        }
    }
}

Player.prototype.stopActionInDirection = function(direction) {
    if (shiftKeyIsHeld) {
        // Do nothing.
    } else {
        if (this == localPlayer) {
            localPlayerStopWalking(direction);
        } else {
            // Do nothing.
        }
    }
}

function Crack(id, pos) {
    Entity.call(this, id, pos);
}
setParentClass(Crack, Entity);


Crack.prototype.tick = function() {
    Entity.prototype.tick.call(this);
    if (this == localCrack) {
        var tempDate = new Date();
        if (tempDate.getTime() >= localCrackExpirationTime) {
            this.remove();
            setTileBufferValue(this.pos, emptyTile);
            localCrack = null;
        }
    }
}

Crack.prototype.draw = function() {
    Entity.prototype.draw.call(this);
    drawSprite(this.getDisplayPos(), 64);
}

function resetTileBuffer() {
    var index = 0;
    while (index < tileBuffer.length) {
        tileBuffer[index] = 0;
        index += 1;
    }
    var tempLength = tileBufferSize * tileBufferSize;
    while (tileBuffer.length < tempLength) {
        tileBuffer.push(0);
    }
}

function convertPosToTileBufferIndex(pos) {
    var tempOffsetX = betterModulus(pos.x, tileBufferSize);
    var tempOffsetY = betterModulus(pos.y, tileBufferSize);
    return tempOffsetX + tempOffsetY * tileBufferSize;
}

function getTileBufferValue(pos) {
    var index = convertPosToTileBufferIndex(pos);
    return tileBuffer[index];
}

function setTileBufferValue(pos, value) {
    var index = convertPosToTileBufferIndex(pos);
    tileBuffer[index] = value;
}

function Color(r, g, b) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.string = null;
}

Color.prototype.copy = function() {
    return new Color(this.r, this.g, this.b);
}

Color.prototype.scale = function(number) {
    this.r = Math.floor(this.r * number);
    this.g = Math.floor(this.g * number);
    this.b = Math.floor(this.b * number);
    if (this.r > 255) {
        this.r = 255;
    }
    if (this.g > 255) {
        this.g = 255;
    }
    if (this.b > 255) {
        this.b = 255;
    }
}

Color.prototype.addScalarIfZero = function(number) {
    if (this.r == 0) {
        this.r += number;
    }
    if (this.g == 0) {
        this.g += number;
    }
    if (this.b == 0) {
        this.b += number;
    }
    if (this.r > 255) {
        this.r = 255;
    }
    if (this.g > 255) {
        this.g = 255;
    }
    if (this.b > 255) {
        this.b = 255;
    }
}

Color.prototype.equals = function(color) {
    return (this.r == color.r && this.g == color.g && this.b == color.b);
}

Color.prototype.toString = function() {
    if (this.string === null) {
        this.string = "rgb(" + this.r + ", " + this.g + ", " + this.b + ")";
    }
    return this.string;
}

colorSet = [
    // Block colors.
    new Color(255, 64, 64),
    new Color(255, 128, 0),
    new Color(192, 192, 64),
    new Color(0, 192, 0),
    new Color(0, 192, 192),
    new Color(64, 64, 255),
    new Color(192, 0, 192),
    new Color(128, 128, 128),
    
    // Misc colors.
    new Color(0, 0, 0),
    new Color(64, 64, 64),
    
    // Trail colors.
    new Color(255, 128, 128),
    new Color(255, 192, 64),
    new Color(224, 224, 64),
    new Color(64, 255, 64),
    new Color(64, 224, 224),
    new Color(128, 128, 255),
    new Color(255, 64, 255),
    new Color(192, 192, 192)
];

function OverlayChatMessage(playerName, text) {
    this.tag = document.createElement("div");
    if (playerName === null) {
        this.tag.innerHTML = text;
    } else {
        this.tag.innerHTML = "<strong>" + playerName + ":</strong> " + text;
    }
    overlayChatOutput.appendChild(this.tag);
    this.delay = 8 * framesPerSecond;
    overlayChatMessageList.push(this);
    while (overlayChatMessageList.length > 3) {
        var tempMessage = overlayChatMessageList[0];
        tempMessage.removeTag();
        overlayChatMessageList.splice(0, 1);
    }
}

OverlayChatMessage.prototype.removeTag = function() {
    overlayChatOutput.removeChild(this.tag);
}

OverlayChatMessage.prototype.getIsVisible = function() {
    var tempValue = document.getElementById("showOverlay").checked
    return ((this.delay > 0 && tempValue) || overlayChatInputIsFocused);
}

OverlayChatMessage.prototype.tick = function() {
    if (overlayChatInputIsFocused) {
        this.tag.style.color = "#FFFFFF";
        this.tag.style.display = "block";
    } else {
        var tempFadeDelay = 2 * framesPerSecond;
        if (this.delay < tempFadeDelay) {
            var tempColorValue = Math.floor(255 * this.delay / tempFadeDelay);
            this.tag.style.color = "rgb(" + tempColorValue + ", " + tempColorValue + ", " + tempColorValue + ")";
        } else {
            this.tag.style.color = "#FFFFFF";
        }
        if (this.delay <= 0) {
            this.tag.style.display = "none";
        } else {
            this.tag.style.display = "block";
            this.delay -= 1;
        }
    }
}

function Module(name) {
    this.name = name;
    this.tag = document.getElementById(name + "Module");
    this.buttonTag = document.getElementById(name + "Button");
    this.isVisible = false;
    this.hide();
    moduleList.push(this);
}

Module.prototype.showOrHide = function() {
    if (this.isVisible) {
        this.hide();
    } else {
        this.show();
    }
}

Module.prototype.updateButtonClass = function() {
    if (this.isVisible) {
        this.buttonTag.className = "moduleButtonOpen";
    } else {
        this.buttonTag.className = "moduleButton";
    }
}

Module.prototype.show = function() {
    this.isVisible = true;
    this.tag.style.display = "block";
    this.updateButtonClass();
}

Module.prototype.hide = function() {
    this.isVisible = false;
    this.tag.style.display = "none";
    this.updateButtonClass();
}

function getModuleByName(name) {
    var index = 0;
    while (index < moduleList.length) {
        var tempModule = moduleList[index];
        if (tempModule.name == name) {
            return tempModule;
        }
        index += 1;
    }
    return null;
}

// valueFunction should return a number between 0 and 1.
function Bar(tag, valueFunction) {
    this.tag = tag;
    this.valueFunction = valueFunction;
    this.width = 0;
    barList.push(this);
}

Bar.prototype.tick = function() {
    var tempTargetWidth = this.valueFunction() * statusBarMaximumWidth;
    if (tempTargetWidth > statusBarMaximumWidth) {
        tempTargetWidth = statusBarMaximumWidth
    }
    this.width += (tempTargetWidth - this.width) / 15;
    this.tag.style.width = Math.round(this.width);
}

function drawCenteredText(pos, text) {
    context.font = "bold 30px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillStyle = "#000000";
    context.fillText(text, Math.floor(pos.x), Math.floor(pos.y));
}

function showOrHideModuleByName(name) {
    var tempModule = getModuleByName(name);
    tempModule.showOrHide();
}

function showModuleByName(name) {
    var tempModule = getModuleByName(name);
    tempModule.show();
}

function hideModuleByName(name) {
    var tempModule = getModuleByName(name);
    tempModule.hide();
}

function setAllInputIsFocusedAsFalse() {
    canvasIsFocused = false;
    chatInputIsFocused = false;
    overlayChatInputIsFocused = false;
    textToPlaceInputIsFocused = false;
    guidelinePosInputIsFocused = false;
}

function computeCanvasSize() {
    return canvasSpriteSize * spriteRenderSize;
}

function clearCanvas() {
    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvasSize, canvasSize);
}

function drawSprite(pos, which) {
    var tempPos = pos.copy();
    tempPos.scale(spriteRenderSize);
    drawSpriteOnContext(
        context,
        tempPos,
        spriteRenderSize,
        which
    );
}

function drawSquareOnContext(context, pos, size, colorIndex, isSmall) {
    var tempColor = colorSet[colorIndex];
    var tempPosX = pos.x;
    var tempPosY = pos.y;
    var tempSize;
    if (isSmall) {
        tempPosX += size * 3 / 8;
        tempPosY += size * 3 / 8;
        tempSize = size / 4;
    } else {
        tempSize = size;
    }
    context.fillStyle = tempColor.toString();
    context.fillRect(tempPosX, tempPosY, tempSize, tempSize);
}

function drawTileOnContext(context, pos, size, which) {
    if (which == 0) {
        drawSquareOnContext(context, pos, size, 9, false);
    }
    if (which >= blockStartTile && which < blockStartTile + blockTileAmount) {
        drawSquareOnContext(context, pos, size, which - blockStartTile, false);
    }
    if (which >= trailStartTile && which < trailStartTile + trailTileAmount) {
        drawSquareOnContext(context, pos, size, which - trailStartTile + 10, true);
    }
    if (which >= flourTile && which <= breadTile) {
        drawSpriteOnContext(context, pos, size, which - flourTile + 32);
    }
    if (which == ovenTile) {
        drawSpriteOnContext(context, pos, size, 16);
    }
    if (which == hospitalTile) {
        drawSpriteOnContext(context, pos, size, 17);
    }
    if (which >= symbolStartTile && which < symbolStartTile + symbolTileAmount) {
        drawSpriteOnContext(context, pos, size, which - (symbolStartTile - 1) + 80);
    }
}

function drawTile(pos, which) {
    var tempPos = pos.copy();
    tempPos.scale(spriteRenderSize);
    drawTileOnContext(
        context,
        tempPos,
        spriteRenderSize,
        which
    );
}

function setZoom(which) {
    if (which == 0) {
        spriteRenderSize = 32;
        canvasSpriteSize = 30;
        shouldDrawNameTags = false;
    }
    if (which == 1) {
        spriteRenderSize = 64;
        canvasSpriteSize = 15;
        shouldDrawNameTags = true;
    }
}

function centerSelectedInventoryItem() {
    var tempInventoryItem = inventoryItemList[selectedInventoryItemIndex];
    var tempOffset = selectedInventoryItemIndex * tempInventoryItem.tag.offsetHeight - 85;
    document.getElementById("inventoryDiv").scrollTop = tempOffset;
}

function drawCompass() {
    var tempDistance = localPlayer.pos.getDistance(respawnPos);
    var tempOffset;
    var tempAngle;
    if (tempDistance > 0) {
        tempOffset = respawnPos.copy();
        tempOffset.subtract(localPlayer.pos);
        tempAngle = Math.atan2(tempOffset.x, -tempOffset.y);
        if (tempAngle < 0) {
            tempAngle += 2 * Math.PI;
        }
        tempOffset.scale(1 / tempDistance);
    } else {
        tempOffset = null;
        tempAngle = 0;
    }
    document.getElementById("respawnAngle").innerHTML = Math.round(tempAngle / (Math.PI * 2) * 360);
    compassContext.fillStyle = "#FFFFFF";
    compassContext.fillRect(0, 0, 200, 200);
    compassContext.fillStyle = "#888888";
    compassContext.beginPath();
    compassContext.arc(100, 100, 90, 0, 2 * Math.PI);
    compassContext.fill();
    if (tempOffset === null) {
        compassContext.fillStyle = "#FFFFFF";
        compassContext.beginPath();
        compassContext.arc(100, 100, 35, 0, 2 * Math.PI);
        compassContext.fill();
    } else {
        compassContext.strokeStyle = "#FFFFFF";
        compassContext.lineWidth = 15;
        compassContext.lineCap = "round";
        compassContext.beginPath();
        compassContext.moveTo(100, 100);
        var tempRadius = 70;
        compassContext.lineTo(100 + tempRadius * tempOffset.x, 100 + tempRadius * tempOffset.y);
        compassContext.stroke();
    }
    compassContext.fillStyle = "#444444";
    compassContext.beginPath();
    compassContext.arc(100, 100, 20, 0, 2 * Math.PI);
    compassContext.fill();
}

function startPlacingText(text) {
    textToPlace = text;
    textToPlaceIndex = 0;
    textToPlaceIsWaitingToWalk = false;
}

function localPlayerStartWalking(direction) {
    if (localPlayerWalkRepeatDirection !== direction) {
        localPlayer.walk(direction);
        localPlayerWalkRepeatDirection = direction;
        localPlayerWalkRepeatDelay = 0.35 * framesPerSecond;
        localPlayerShouldStopWalkRepeat = !lKeyIsHeld;
    }
}

function localPlayerStopWalking(direction) {
    if (direction == localPlayerWalkRepeatDirection) {
        if (localPlayerShouldStopWalkRepeat) {
            localPlayerWalkRepeatDirection = null;
        } else {
            localPlayerShouldStopWalkRepeat = true;
        }
    }
}

function displayGuidelinePos() {
    if (guidelinePos === null) {
        guidelinePosInput.value = "None";
    } else {
        guidelinePosInput.value = guidelinePos.x + ", " + guidelinePos.y;
    }
}

function clearGuidelinePos() {
    guidelinePos = null;
    displayGuidelinePos();
    addSetGuidelinePosCommand();
}

function setGuidelinePosFromInput() {
    var tempText = guidelinePosInput.value;
    var tempList = tempText.split(",");
    if (tempList.length != 2) {
        alert("Malformed guideline location.");
        return;
    }
    var tempPosX = parseInt(tempList[0].trim());
    var tempPosY = parseInt(tempList[1].trim());
    if (isNaN(tempPosX) || isNaN(tempPosY)) {
        alert("Malformed guideline location.");
        return;
    }
    guidelinePos = new Pos(tempPosX, tempPosY);
    displayGuidelinePos();
    guidelinePosInput.blur();
    setAllInputIsFocusedAsFalse();
    canvasIsFocused = true;
    addSetGuidelinePosCommand();
}

function displayGuideline() {
    if (guidelinePos === null) {
        return;
    }
    var tempPos = guidelinePos.copy();
    tempPos.subtract(cameraPos);
    if (tempPos.x < 0) {
        tempPos.x = 0;
    }
    if (tempPos.x >= canvasSpriteSize) {
        tempPos.x = canvasSpriteSize - 1;
    }
    if (tempPos.y < 0) {
        tempPos.y = 0;
    }
    if (tempPos.y >= canvasSpriteSize) {
        tempPos.y = canvasSpriteSize - 1;
    }
    tempPos.scale(spriteRenderSize);
    var tempPixelSize = spriteRenderSize / 8;
    tempPos.x += tempPixelSize * 4;
    tempPos.y += tempPixelSize * 4;
    context.fillStyle = "rgba(0, 0, 0, 0.4)";
    context.fillRect(tempPos.x - tempPixelSize, 0, tempPixelSize * 2, canvasSize);
    context.fillRect(0, tempPos.y - tempPixelSize, canvasSize, tempPixelSize * 2);
    context.font = "bold 30px Arial";
    context.textBaseline = "middle";
    var tempTextPosX;
    var tempTextPosY;
    var tempAlignment;
    if (tempPos.x > canvasSize / 2) {
        tempTextPosX = tempPos.x - 20;
        context.textAlign = "right";
        tempAlignment = 1;
    } else {
        tempTextPosX = tempPos.x + 20;
        context.textAlign = "left";
        tempAlignment = -1;
    }
    if (tempPos.y > canvasSize / 2) {
        tempTextPosY = 30;
    } else {
        tempTextPosY = canvasSize - 30;
    }
    var tempText = Math.abs(localPlayer.pos.x - guidelinePos.x);
    var tempWidth = context.measureText(tempText).width;
    var tempBackgroundPosX;
    if (tempAlignment > 0) {
        tempBackgroundPosX = tempTextPosX - tempWidth;
    } else {
        tempBackgroundPosX = tempTextPosX;
    }
    context.fillStyle = "rgba(255, 255, 255, 0.6)";
    context.fillRect(tempBackgroundPosX - 4, tempTextPosY - 19, tempWidth + 8, 38);
    context.fillStyle = "#000000";
    context.fillText(tempText, tempTextPosX, tempTextPosY);
    var tempTextPosX;
    var tempTextPosY;
    var tempAlignment;
    if (tempPos.x > canvasSize / 2) {
        tempTextPosX = 15;
        context.textAlign = "left";
        tempAlignment = -1;
    } else {
        tempTextPosX = canvasSize - 15;
        context.textAlign = "right";
        tempAlignment = 1;
    }
    if (tempPos.y > canvasSize / 2) {
        tempTextPosY = tempPos.y - 35;
    } else {
        tempTextPosY = tempPos.y + 35;
    }
    var tempText = Math.abs(localPlayer.pos.y - guidelinePos.y);
    var tempWidth = context.measureText(tempText).width;
    var tempBackgroundPosX;
    if (tempAlignment > 0) {
        tempBackgroundPosX = tempTextPosX - tempWidth;
    } else {
        tempBackgroundPosX = tempTextPosX;
    }
    context.fillStyle = "rgba(255, 255, 255, 0.6)";
    context.fillRect(tempBackgroundPosX - 4, tempTextPosY - 19, tempWidth + 8, 38);
    context.fillStyle = "#000000";
    context.fillText(tempText, tempTextPosX, tempTextPosY);
}

function keyDownEvent(event) {
    lastActivityTime = 0;
    var keyCode = event.which;
    if (keyCode == 16) {
        shiftKeyIsHeld = true;
    }
    if (keyCode == 76) {
        lKeyIsHeld = true;
    }
    if (chatInputIsFocused) {
        if (keyCode == 13) {
            var tempText = chatInput.value;
            if (tempText.length > 0) {
                addAddChatMessageCommand(tempText);
                chatInput.value = "";
            }
        }
    } else if (overlayChatInputIsFocused) {
        if (keyCode == 13) {
            var tempText = overlayChatInput.value;
            if (tempText.length > 0) {
                addAddChatMessageCommand(tempText);
                overlayChatInput.value = "";
            }
            overlayChatInput.style.display = "none";
            overlayChatInputIsVisible = false;
            overlayChatInput.blur();
            setAllInputIsFocusedAsFalse();
            canvasIsFocused = true;
        }
    } else if (textToPlaceInputIsFocused) {
        if (keyCode == 13) {
            var tempText = textToPlaceInput.value;
            startPlacingText(tempText);
            textToPlaceInput.value = "";
            textToPlaceInput.blur();
            setAllInputIsFocusedAsFalse();
            canvasIsFocused = true;
        }
    } else if (guidelinePosInputIsFocused) {
        if (keyCode == 13) {
            setGuidelinePosFromInput();
        }
    } else if (canvasIsFocused) {
        textToPlace = null;
        if (keyCode == 13) {
            document.getElementById("overlayChat").style.display = "block";
            overlayChatInput.style.display = "block";
            overlayChatInputIsVisible = true;
            setAllInputIsFocusedAsFalse();
            overlayChatInput.focus();
            overlayChatInputIsFocused = true;
        }
        if (keyCode == 37 || keyCode == 65) {
            localPlayer.performActionInDirection(3);
        }
        if (keyCode == 39 || keyCode == 68) {
            localPlayer.performActionInDirection(1);
        }
        if (keyCode == 38 || keyCode == 87) {
            localPlayer.performActionInDirection(0);
        }
        if (keyCode == 40 || keyCode == 83) {
            localPlayer.performActionInDirection(2);
        }
        if (keyCode == 189 || keyCode == 173) {
            setZoom(0);
        }
        if ((keyCode == 187 || keyCode == 61) && shiftKeyIsHeld) {
            setZoom(1);
        }
        if (keyCode == 82) {
            var index = selectedInventoryItemIndex - 1;
            if (index < 0) {
                index = inventoryItemList.length - 1;
            }
            selectInventoryItem(index);
            centerSelectedInventoryItem();
        }
        if (keyCode == 70) {
            var index = selectedInventoryItemIndex + 1;
            if (index >= inventoryItemList.length) {
                index = 0;
            }
            selectInventoryItem(index);
            centerSelectedInventoryItem();
        }
        if (keyCode == 66) {
            addEatBreadCommand();
        }
        if (keyCode == 84) {
            showModuleByName("textTool");
            textToPlaceInput.focus();
            return false;
        }
        if (keyCode >= 37 && keyCode <= 40) {
            return false;
        }
    }
}

function keyUpEvent(event) {
    lastActivityTime = 0;
    var keyCode = event.which;
    if (keyCode == 16) {
        shiftKeyIsHeld = false;
    }
    if (keyCode == 76) {
        lKeyIsHeld = false;
    }
    if (keyCode == 37 || keyCode == 65) {
        localPlayer.stopActionInDirection(3);
    }
    if (keyCode == 39 || keyCode == 68) {
        localPlayer.stopActionInDirection(1);
    }
    if (keyCode == 38 || keyCode == 87) {
        localPlayer.stopActionInDirection(0);
    }
    if (keyCode == 40 || keyCode == 83) {
        localPlayer.stopActionInDirection(2);
    }
}

function timerEvent() {
    
    if (hasStopped) {
        return;
    }
    
    var tempTag = document.getElementById("overlayChat");
    var tempHasFoundVisibleMessage = false;
    var index = 0;
    while (index < overlayChatMessageList.length) {
        var tempMessage = overlayChatMessageList[index];
        if (tempMessage.getIsVisible()) {
            tempHasFoundVisibleMessage = true;
            break;
        }
        index += 1;
    }
    if (tempHasFoundVisibleMessage || overlayChatInputIsVisible) {
        tempTag.style.display = "block";
    } else {
        tempTag.style.display = "none";
    }
    
    var index = overlayChatMessageList.length - 1;
    while (index >= 0) {
        var tempMessage = overlayChatMessageList[index];
        tempMessage.tick();
        index -= 1;
    }
    
    if (!spritesImageHasLoaded) {
        return;
    }
    
    lastActivityTime += 1;
    if (lastActivityTime > 10 * 60 * framesPerSecond) {
        alert("You have been kicked due to inactivity.");
        hasStopped = true;
        window.location = "menu";
    }
    
    invincibilityBlinkDelay += 1;
    if (invincibilityBlinkDelay >= 4) {
         invincibilityBlinkDelay = 0;
    }
    
    if (!isRequestingGameUpdate) {
        gameUpdateRequestDelay -= 1;
        if (gameUpdateRequestDelay <= 0) {
            addAssertPosCommand();
            addGetEntitiesCommand();
            addGetTilesCommand();
            addGetChatMessagesCommand();
            addGetOnlinePlayersCommand();
            addGetInventoryChangesCommand();
            addGetRespawnPosChangesCommand();
            addGetStatsCommand();
            addGetAvatarChangesCommand();
            performGameUpdateRequest();
        }
    }
    
    var index = entityList.length - 1;
    while (index >= 0) {
        var tempEntity = entityList[index];
        tempEntity.tick();
        index -= 1;
    }
    if (textToPlace !== null) {
        if (textToPlaceIndex >= textToPlace.length) {
            textToPlace = null;
        } else {
            if (!textToPlaceIsWaitingToWalk) {
                var tempCharacter = textToPlace.charCodeAt(textToPlaceIndex);
                if (tempCharacter >= 33 && tempCharacter <= 126) {
                    addPlaceSymbolTileCommand(tempCharacter - 33 + symbolStartTile);
                }
                textToPlaceIsWaitingToWalk = true;
            }
            var tempResult = localPlayer.walk(1);
            if (tempResult) {
                textToPlaceIndex += 1;
                textToPlaceIsWaitingToWalk = false;
            }
        }
    }
    if (localPlayerWalkRepeatDirection !== null) {
        if (localPlayerWalkRepeatDelay > 0) {
            localPlayerWalkRepeatDelay -= 1;
        } else {
            localPlayer.walk(localPlayerWalkRepeatDirection);
        }
    }
    cameraPos.set(localPlayer.pos);
    var tempOffset = Math.floor(canvasSpriteSize / 2);
    cameraPos.x -= tempOffset;
    cameraPos.y -= tempOffset;
    
    clearCanvas();
    var tempPos = new Pos(0, 0);
    var tempOffset = new Pos(0, 0);
    while (tempOffset.y < canvasSpriteSize) {
        tempPos.set(cameraPos);
        tempPos.add(tempOffset);
        var tempTile = getTileBufferValue(tempPos);
        drawTile(tempOffset, tempTile);
        tempOffset.x += 1;
        if (tempOffset.x >= canvasSpriteSize) {
            tempOffset.x = 0;
            tempOffset.y += 1;
        }
    }
    var index = 0;
    while (index < entityList.length) {
        var tempEntity = entityList[index];
        tempEntity.draw();
        index += 1;
    }
    displayGuideline();
    
    document.getElementById("coordinates").innerHTML = localPlayer.pos.toString();
    var tempOffset = localPlayer.pos.copy();
    tempOffset.subtract(respawnPos);
    document.getElementById("respawnOffset").innerHTML = tempOffset.toString();
    var tempDistance = Math.round(localPlayer.pos.getDistance(respawnPos));
    document.getElementById("respawnPosDistance").innerHTML = tempDistance;
    
    drawCompass();
}

function barTimerEvent() {
    var index = 0;
    while (index < barList.length) {
        var tempBar = barList[index];
        tempBar.tick();
        index += 1;
    }
}

function addAllInventoryItemsToMode() {
    var index = 0;
    while (index < inventoryItemList.length) {
        var tempInventoryItem = inventoryItemList[index];
        tempInventoryItem.addToModule();
        index += 1;
    }
}

function initializeGame() {
    
    setZoom(1);
    
    canvas = document.getElementById("canvas");
    context = canvas.getContext("2d");
    compassCanvas = document.getElementById("compassCanvas");
    compassContext = compassCanvas.getContext("2d");
    
    canvasSize = computeCanvasSize();
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    canvas.style.width = canvasSize / 2;
    canvas.style.height = canvasSize / 2;
    canvas.style.border = "3px #000000 solid";
    
    canvas.onclick = function(event) {
        overlayChatInput.style.display = "none";
        overlayChatInputIsVisible = false;
        setAllInputIsFocusedAsFalse();
        canvasIsFocused = true;
    }
    
    document.getElementById("maximumHp").innerHTML = localPlayerMaximumHealth;
    
    chatInput = document.getElementById("chatInput");
    chatOutput = document.getElementById("chatOutput");
    overlayChatInput = document.getElementById("overlayChatInput");
    overlayChatOutput = document.getElementById("overlayChatOutput");
    textToPlaceInput = document.getElementById("textToPlaceInput");
    guidelinePosInput = document.getElementById("guidelinePosInput");
    
    initializeSpriteSheet(function() {
        addAllInventoryItemsToMode();
    });
    
    var tempModule = new Module("stats");
    tempModule.show();
    var tempModule = new Module("location");
    var tempModule = new Module("textTool");
    var tempModule = new Module("inventory");
    tempModule.show();
    var tempModule = new Module("chat");
    var tempModule = new Module("onlinePlayers");
    
    new Bar(document.getElementById("hpBar"), function() {return localPlayerHealth / localPlayerMaximumHealth;});
    
    window.onkeydown = keyDownEvent;
    window.onkeyup = keyUpEvent;
    
    localPlayer = new Player(-1, new Pos(0, 0), null, null, null);
    addStartPlayingCommand();
    addGetGuidelinePosCommand();
    
    var tempProtocol;
    if (window.location.protocol == "http:") {
        tempProtocol = "ws:";
    } else {
        tempProtocol = "wss:";
    }
    var tempAddress = tempProtocol + "//" + window.location.hostname + ":" + window.location.port + "/gameUpdate";
    gameUpdateSocket = new WebSocket(tempAddress);
    gameUpdateSocket.onopen = function(event) {
        setInterval(timerEvent, Math.floor(1000 / framesPerSecond));
        setInterval(barTimerEvent, Math.floor(1000 / 30));
    };
    gameUpdateSocket.onmessage = function(event) {
        handleGameUpdateRequest(JSON.parse(event.data));
    };
}


