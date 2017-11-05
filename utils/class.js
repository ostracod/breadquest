
var classParentMap = {};

function ClassUtils() {

}

ClassUtils.prototype.setParentClass = function(child, parent) {
    for (key in parent.prototype) {
        child.prototype[key] = parent.prototype[key];
    }
    classParentMap[child] = parent;
}

ClassUtils.prototype.isInstanceOf = function(object, inputClass) {
    if (object == null) {
        return false;
    }
    var tempClass = object.constructor;
    while (tempClass != inputClass) {
        tempClass = classParentMap[tempClass];
        if (tempClass == undefined) {
            return false;
        }
    }
    return true;
}

// To call parent constructor:
// ParentClass.call(this, arg, arg, arg...);

var classUtils = new ClassUtils();

module.exports = classUtils;
