
var spriteRenderSize;
var canvas;
var context;
var canvasSpriteSize;
var canvasSize;
var framesPerSecond = 20;
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
var localPlayerHp = 0;
var localPlayerMaximumHp = 5;
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
var entityList = [];
var localPlayer;
var playerWalkOffsetList = [
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

function GameUpdateRequest() {
    isRequestingGameUpdate = true;
    AjaxRequest.call(this, "gameUpdate", {}, {commandList: JSON.stringify(gameUpdateCommandList)});
    gameUpdateCommandList = [];
}
setParentClass(GameUpdateRequest, AjaxRequest);

GameUpdateRequest.prototype.respond = function(data) {
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
            index += 1;
        }
    } else {
        alert(data.message);
        hasStopped = true;
        window.location = "menu";
    }
    gameUpdateRequestDelay = 0.25 * framesPerSecond;
    isRequestingGameUpdate = false;
    AjaxRequest.prototype.respond.call(this, data);
}

function addStartPlayingCommand() {
    gameUpdateCommandList.push({
        commandName: "startPlaying"
    });
}

function addGetTilesCommand() {
    gameUpdateCommandList.push({
        commandName: "getTiles",
        pos: cameraPos.toJson(),
        size: canvasSpriteSize
    });
}

function addWalkCommand(direction) {
    gameUpdateCommandList.push({
        commandName: "walk",
        direction: direction
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

function addGetInventoryChanges() {
    gameUpdateCommandList.push({
        commandName: "getInventoryChanges",
    });
}

function addPlaceTileCommand(direction, tile) {
    gameUpdateCommandList.push({
        commandName: "placeTile",
        direction: direction,
        tile: tile
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
        new Player(
            tempEntityInfo.id,
            tempPos,
            tempEntityInfo.username,
            tempEntityInfo.avatar,
            tempEntityInfo.breadCount
        );
    }
    if (tempClassName == "Crack") {
        new Crack(
            tempEntityInfo.id,
            tempPos,
        );
    }
}

function performAddChatMessageCommand(command) {
    var tempPlayerName = encodeHtmlEntity(command.username);
    var tempText = encodeHtmlEntity(command.text);
    var tempIsAtBottom = (chatOutput.scrollTop + 150 > chatOutput.scrollHeight - 30);
    var tempTag = document.createElement("div");
    tempTag.innerHTML = "<strong>" + tempPlayerName + ":</strong> " + tempText;
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
}

function Entity(id, pos) {
    this.id = id;
    this.pos = pos;
    entityList.push(this);
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
    tempCanvas.width = tempSize / 2;
    tempCanvas.height = tempSize / 2;
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

function Player(id, pos, username, avatar, breadCount) {
    Entity.call(this, id, pos);
    this.username = username;
    this.avatar = avatar;
    this.breadCount = breadCount;
}
setParentClass(Player, Entity);

Player.prototype.tick = function() {
    Entity.prototype.tick.call(this);
    // Do nothing.
}

Player.prototype.draw = function() {
    if (this.username === null) {
        return;
    }
    Entity.prototype.draw.call(this);
    var tempPos = this.getDisplayPos().copy();
    drawSprite(tempPos, 0 + this.avatar)
    if (shouldDrawNameTags) {
        tempPos.scale(spriteRenderSize);
        tempPos.x += spriteRenderSize / 2;
        tempPos.y -= spriteRenderSize / 2;
        drawCenteredText(tempPos, this.username + " (" + this.breadCount + ")");
    }
}

Player.prototype.getPosInWalkDirection = function(direction) {
    var tempOffset = playerWalkOffsetList[direction];
    var output = this.pos.copy();
    output.add(tempOffset);
    return output;
}

Player.prototype.walk = function(direction) {
    var tempPos = this.getPosInWalkDirection(direction);
    var tempTile = getTileBufferValue(tempPos);
    if ((tempTile >= blockStartTile && tempTile < blockStartTile + blockTileAmount)
            || tempTile == 0) {
        return;
    }
    this.pos.set(tempPos);
    addWalkCommand(direction);
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

Player.prototype.placeOrRemoveTile = function(direction) {
    var tempPos = this.getPosInWalkDirection(direction);
    var tempTile = getTileBufferValue(tempPos);
    if (tempTile >= blockStartTile && tempTile < blockStartTile + blockTileAmount) {
        this.removeTile(direction);
    }
    if (tempTile == emptyTile
            || (tempTile >= trailStartTile && tempTile < trailStartTile + trailTileAmount)) {
        this.placeTile(direction);
    }
}

Player.prototype.performActionInDirection = function(direction) {
    if (shiftKeyIsHeld) {
        this.placeOrRemoveTile(direction);
    } else {
        this.walk(direction);
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
    new Color(255, 255, 128),
    new Color(64, 255, 64),
    new Color(64, 255, 255),
    new Color(128, 128, 255),
    new Color(255, 64, 255),
    new Color(192, 192, 192)
];

function OverlayChatMessage(playerName, text) {
    this.tag = document.createElement("div");
    this.tag.innerHTML = "<strong>" + playerName + ":</strong> " + text;
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

function keyDownEvent(event) {
    lastActivityTime = 0;
    var keyCode = event.which;
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
    } else if (canvasIsFocused) {
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
        if (keyCode >= 37 && keyCode <= 40) {
            return false;
        }
    }
    if (keyCode == 16) {
        shiftKeyIsHeld = true;
    }
}

function keyUpEvent(event) {
    lastActivityTime = 0;
    var keyCode = event.which;
    if (keyCode == 16) {
        shiftKeyIsHeld = false;
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
    
    var index = 0;
    while (index < barList.length) {
        var tempBar = barList[index];
        tempBar.tick();
        index += 1;
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
    
    if (!isRequestingGameUpdate) {
        gameUpdateRequestDelay -= 1;
        if (gameUpdateRequestDelay <= 0) {
            addAssertPosCommand();
            addGetEntitiesCommand();
            addGetTilesCommand();
            addGetChatMessagesCommand();
            addGetOnlinePlayersCommand();
            addGetInventoryChanges();
            new GameUpdateRequest();
        }
    }
    
    var index = entityList.length - 1;
    while (index >= 0) {
        var tempEntity = entityList[index];
        tempEntity.tick();
        index -= 1;
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
    
    document.getElementById("coordinates").innerHTML = localPlayer.pos.toString();
    
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
    
    chatInput = document.getElementById("chatInput");
    chatOutput = document.getElementById("chatOutput");
    overlayChatInput = document.getElementById("overlayChatInput");
    overlayChatOutput = document.getElementById("overlayChatOutput");
    
    initializeSpriteSheet(function() {
        addAllInventoryItemsToMode();
    });
    
    var tempModule = new Module("stats");
    tempModule.show();
    var tempModule = new Module("inventory");
    tempModule.show();
    var tempModule = new Module("chat");
    var tempModule = new Module("onlinePlayers");
    
    new Bar(document.getElementById("hpBar"), function() {return localPlayerHp / localPlayerMaximumHp;});
    
    window.onkeydown = keyDownEvent;
    window.onkeyup = keyUpEvent;
    
    localPlayer = new Player(-1, new Pos(0, 0), null, null, null);
    addStartPlayingCommand();
    
    setInterval(timerEvent, Math.floor(Math.floor(1000 / framesPerSecond)));
}
