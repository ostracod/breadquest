
var spritesImage;
var spritesImageSize = 16;
var spriteSize = 8;
//var spriteRenderSize = 64;
var spriteRenderSize = 32;
var canvas;
var context;
//var canvasSpriteSize = 15;
var canvasSpriteSize = 30;
var canvasSize;
var spritesImageHasLoaded = false;
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
var cameraPos;
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
var blockStartTile = 129;
var blockTileAmount = 9;
var emptyTile = 128;

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
            if (tempCommand.commandName == "setTiles") {
                performSetTilesCommand(tempCommand);
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

function addGetEntitiesCommand() {
    gameUpdateCommandList.push({
        commandName: "getTiles",
        pos: cameraPos.toJson(),
        size: canvasSpriteSize
    });
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

function Pos(x, y) {
    this.x = x;
    this.y = y;
}

Pos.prototype.set = function(pos) {
    this.x = pos.x;
    this.y = pos.y;
}

Pos.prototype.add = function(pos) {
    this.x += pos.x;
    this.y += pos.y;
}

Pos.prototype.subtract = function(pos) {
    this.x -= pos.x;
    this.y -= pos.y;
}

Pos.prototype.scale = function(number) {
    this.x *= number;
    this.y *= number;
}

Pos.prototype.copy = function() {
    return new Pos(this.x, this.y);
}

Pos.prototype.equals = function(pos) {
    return (this.x == pos.x && this.y == pos.y);
}

Pos.prototype.getOrthogonalDistance = function(pos) {
    var tempDistanceX = Math.abs(this.x - pos.x);
    var tempDistanceY = Math.abs(this.y - pos.y);
    if (tempDistanceX > tempDistanceY) {
        return tempDistanceX;
    } else {
        return tempDistanceY;
    }
}

Pos.prototype.toJson = function() {
    return {
        x: this.x,
        y: this.y
    }
}

function createPosFromJson(data) {
    return new Pos(data.x, data.y);
}

cameraPos = new Pos(0, 0);

function Color(r, g, b) {
    this.r = r;
    this.g = g;
    this.b = b;
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
    return "rgb(" + this.r + ", " + this.g + ", " + this.b + ")";
}

colorSet = [
    new Color(255, 64, 64),
    new Color(255, 128, 0),
    new Color(192, 192, 64),
    new Color(0, 192, 0),
    new Color(0, 192, 192),
    new Color(64, 64, 255),
    new Color(192, 0, 192),
    new Color(128, 128, 128),
    new Color(0, 0, 0),
    new Color(64, 64, 64)
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
    context.fillText(text, Math.floor(pos.x) * pixelSize, Math.floor(pos.y) * pixelSize);
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
    var tempClipX = (which % spritesImageSize) * spriteSize;
    var tempClipY = Math.floor(which / spritesImageSize) * spriteSize;
    context.imageSmoothingEnabled = false;
    context.drawImage(
        spritesImage,
        tempClipX,
        tempClipY,
        spriteSize,
        spriteSize,
        pos.x * spriteRenderSize,
        pos.y * spriteRenderSize,
        spriteRenderSize,
        spriteRenderSize
    );
}

function drawSquare(pos, colorIndex, isSmall) {
    var tempColor = colorSet[colorIndex];
    var tempPosX = pos.x * spriteRenderSize;
    var tempPosY = pos.y * spriteRenderSize;
    var tempSize;
    if (isSmall) {
        tempPosX += spriteRenderSize * 3 / 8;
        tempPosY += spriteRenderSize * 3 / 8;
        tempSize = spriteRenderSize / 4;
    } else {
        tempSize = spriteRenderSize;
    }
    context.fillStyle = tempColor.toString();
    context.fillRect(tempPosX, tempPosY, tempSize, tempSize);
}

function drawTile(pos, which) {
    if (which == 0) {
        drawSquare(pos, 9, false);
    }
    if (which >= blockStartTile && which < blockStartTile + blockTileAmount) {
        drawSquare(pos, which - blockStartTile, false);
    }
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
            cameraPos.x -= 1;
        }
        if (keyCode == 39 || keyCode == 68) {
            cameraPos.x += 1;
        }
        if (keyCode == 38 || keyCode == 87) {
            cameraPos.y -= 1;
        }
        if (keyCode == 40 || keyCode == 83) {
            cameraPos.y += 1;
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
            addGetEntitiesCommand();
            new GameUpdateRequest();
        }
    }
    
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
    
}

function initializeGame() {
    
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
    
    spritesImage = new Image();
    spritesImage.onload = function() {
        spritesImageHasLoaded = true;
    }
    spritesImage.src = "/images/sprites.png";
    
    var tempModule = new Module("stats");
    tempModule.show();
    var tempModule = new Module("chat");
    var tempModule = new Module("onlinePlayers");
    tempModule.show();
    
    new Bar(document.getElementById("hpBar"), function() {return localPlayerHp / localPlayerMaximumHp;});
    
    window.onkeydown = keyDownEvent;
    window.onkeyup = keyUpEvent;
    
    setInterval(timerEvent, Math.floor(Math.floor(1000 / framesPerSecond)));
}
