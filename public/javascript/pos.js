
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

Pos.prototype.getDistance = function(pos) {
    return Math.sqrt(Math.pow(this.x - pos.x, 2) + Math.pow(this.y - pos.y, 2));
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

Pos.prototype.toString = function() {
    return "(" + this.x + ", " + this.y + ")";
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
