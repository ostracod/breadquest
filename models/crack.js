
var classUtils = require("utils/class");
var Pos = require("models/pos").Pos;
var Entity = require("models/entity").Entity;
var accountUtils = require("utils/account");
var gameUtils = require("utils/game");
var chunkUtils = require("utils/chunk");

function Crack(pos, username) {
    Entity.call(this, pos);
    this.username = username;
    var tempDate = new Date();
    this.expirationTime = tempDate.getTime() + 500;
}
classUtils.setParentClass(Crack, Entity);

Crack.prototype.tick = function() {
    Entity.prototype.tick.call(this);
    var tempDate = new Date();
    if (tempDate.getTime() >= this.expirationTime) {
        this.remove();
    }
}

Crack.prototype.getClientInfo = function() {
    return {
        className: "Crack",
        id: this.id,
        pos: this.pos.toJson()
    }
}

module.exports = {
    Crack: Crack
}
