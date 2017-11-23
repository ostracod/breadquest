
var app = require("breadQuest");

var mode = app.get("env");

function PageUtils() {

}

PageUtils.prototype.reportDatabaseErrorWithJson = function(error, req, res) {
    res.json({success: false, message: "An error occurred. Please contact an administrator."});
    console.log(error);
}

PageUtils.prototype.reportDatabaseErrorWithPage = function(error, req, res) {
    var tempUrl = this.generateReturnUrl(req);
    pageUtils.serveMessagePage(res, "An error occurred. Please contact an administrator.", tempUrl.url, tempUrl.urlLabel);
    console.log(error);
}

PageUtils.prototype.reportDatabaseError = function(error, errorOutput, req, res) {
    console.log(error);
    if (errorOutput == pageUtils.errorOutput.JSON_ERROR_OUTPUT) {
        pageUtils.reportDatabaseErrorWithJson(error, req, res);
    }
    if (errorOutput == pageUtils.errorOutput.PAGE_ERROR_OUTPUT) {
        pageUtils.reportDatabaseErrorWithPage(error, req, res);
    }
}

PageUtils.prototype.checkAuthentication = function(errorOutput) {
    return function(req, res, next) {
        if (mode == "development") {
            if (!req.session.username) {
                var tempUsername = req.query.username;
                if (tempUsername) {
                    req.session.username = tempUsername;
                }
            }
        }
        if (req.session.username) {
            next();
        } else {
            if (errorOutput == pageUtils.errorOutput.JSON_ERROR_OUTPUT) {
                res.json({success: false, message: "You are not currently logged in."});
            }
            if (errorOutput == pageUtils.errorOutput.PAGE_ERROR_OUTPUT) {
                pageUtils.serveMessagePage(res, "You must be logged in to view that page.", "login", "Log In");
            }
        }
    }
}

PageUtils.prototype.serveMessagePage = function(res, message, url, urlLabel) {
    res.render("message.html", {
        message: message,
        url: url,
        urlLabel: urlLabel
    });
}

PageUtils.prototype.errorOutput = {
    JSON_ERROR_OUTPUT: 0,
    PAGE_ERROR_OUTPUT: 1
}

PageUtils.prototype.generateReturnUrl = function(req) {
    if (req.session.username) {
        return {
            url: "/menu",
            urlLabel: "Return to Main Menu"
        };
    } else {
        return {
            url: "/login",
            urlLabel: "Return to Login Page"
        };
    }
}

var pageUtils = new PageUtils();

module.exports = pageUtils;
