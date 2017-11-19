
function Inventory(account) {
    if ("inventory" in account) {
        this.tileCountMap = account.inventory;
    } else {
        this.tileCountMap = {};
    }
    this.hasChanged = false;
}

Inventory.prototype.getTileCount = function(tile) {
    if (tile in this.tileCountMap) {
        return this.tileCountMap[tile];
    } else {
        return 0;
    }
}

Inventory.prototype.setTileCount = function(tile, count) {
    this.tileCountMap[tile] = count;
    this.hasChanged = true;
}

Inventory.prototype.incrementTileCount = function(tile) {
    var tempCount = this.getTileCount(tile);
    tempCount += 1;
    this.setTileCount(tile, tempCount);
}

Inventory.prototype.decrementTileCount = function(tile) {
    var tempCount = this.getTileCount(tile);
    if (tempCount <= 0) {
        return false;
    }
    tempCount -= 1;
    this.setTileCount(tile, tempCount);
    return true;
}

Inventory.prototype.toJson = function() {
    return this.tileCountMap;
}

module.exports = {
    Inventory: Inventory
};

