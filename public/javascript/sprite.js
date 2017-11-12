
var spriteSize = 8;
var spritesImageHasLoaded = false;
var spritesImage;
var spritesImageSize = 16;

function drawSpriteOnContext(context, pos, size, which) {
    var tempClipX = (which % spritesImageSize) * spriteSize;
    var tempClipY = Math.floor(which / spritesImageSize) * spriteSize;
    context.imageSmoothingEnabled = false;
    context.drawImage(
        spritesImage,
        tempClipX,
        tempClipY,
        spriteSize,
        spriteSize,
        pos.x,
        pos.y,
        size,
        size
    );
}

function initializeSpriteSheet(done) {
    spritesImage = new Image();
    spritesImage.onload = function() {
        spritesImageHasLoaded = true;
        done();
    }
    spritesImage.src = "/images/sprites.png";
}

