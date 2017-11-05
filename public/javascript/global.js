
var classParentMap = {};

var ajaxRequestList = [];
var currentAjaxRequest = null;

function findListElement(list, element) {
    index = 0;
    while (index < list.length) {
        if (list[index] == element) {
            return index;
        }
        index += 1;
    }
    return -1;
}

function setParentClass(child, parent) {
    for (key in parent.prototype) {
        child.prototype[key] = parent.prototype[key];
    }
    classParentMap[child] = parent;
}

function isInstanceOf(object, inputClass) {
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

function AjaxRequest(address, queryStringData, postData) {
    this.address = address;
    this.queryStringData = queryStringData;
    this.postData = postData;
    this.add();
}

AjaxRequest.prototype.add = function() {
    ajaxRequestList.push(this);
}

function convertToQueryString(data) {
    var tempList = [];
    for (key in data) {
        var tempValue = data[key];
        tempList.push(encodeURIComponent(key) + "=" + encodeURIComponent(tempValue));
    }
    return tempList.join("&");
}

AjaxRequest.prototype.send = function() {
    var tempAddress = this.address + "?" + convertToQueryString(this.queryStringData);
    var index = findListElement(ajaxRequestList, this);
    ajaxRequestList.splice(index, 1);
    currentAjaxRequest = this;
    var tempAjax = new XMLHttpRequest();
    tempAjax.onreadystatechange = function() {
        if (tempAjax.readyState == 4 && tempAjax.status == 200) {
            currentAjaxRequest.respond(JSON.parse(tempAjax.responseText));
        }
    }
    if (this.postData) {
        tempAjax.open("POST", tempAddress, true);
        tempAjax.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        tempAjax.send(convertToQueryString(this.postData));
    } else {
        tempAjax.open("GET", tempAddress, true);
        tempAjax.send();
    }
}

// data will be JSON.
AjaxRequest.prototype.respond = function(data) {
    currentAjaxRequest = null;
}

function getAjaxRequestByClass(inputClass) {
    if (isInstanceOf(currentAjaxRequest, inputClass)) {
        return currentAjaxRequest;
    }
    var index = 0;
    while (index < ajaxRequestList.length) {
        var tempAjaxRequest = ajaxRequestList[index];
        if (isInstanceOf(tempAjaxRequest, inputClass)) {
            return tempAjaxRequest;
        }
        index += 1;
    }
}

function ajaxTimerEvent() {
    if (ajaxRequestList.length > 0) {
        if (currentAjaxRequest == null) {
            ajaxRequestList[0].send();
        }
    }
}

setInterval(ajaxTimerEvent, 100);
