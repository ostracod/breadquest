
var Pos = require("models/Pos").Pos;

var entityList = [];
var nextEntityId = 0;

function Entity(pos) {
    this.id = nextEntityId;
    nextEntityId += 1;
    this.pos = pos;
    entityList.push(this);
}

Entity.prototype.tick = function() {
    // Do nothing.
}

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

Entity.prototype.getClientInfo = function() {
    return {
        className: "Entity"
    }
}

module.exports = {
    Entity: Entity,
    entityList: entityList
}
