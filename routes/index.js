var express = require("express");
var router = express.Router();
var bcrypt = require("bcrypt");
var pageUtils = require("utils/page.js");
var accountUtils = require("utils/account.js");
var app = require("breadQuest");

var checkAuthentication = pageUtils.checkAuthentication;
var serveMessagePage = pageUtils.serveMessagePage;
var JSON_ERROR_OUTPUT = pageUtils.errorOutput.JSON_ERROR_OUTPUT;
var PAGE_ERROR_OUTPUT = pageUtils.errorOutput.PAGE_ERROR_OUTPUT;
var mode = app.get("env");

router.get("/index", function(req, res, next) {
    res.render("index.html", {message: "It works!"});
});

function generatePasswordHash(password, done) {
    bcrypt.hash(password, 10, function(error, result) {
        if (error) {
            done({
                success: false,
                error: error
            });
            return;
        }
        done({
            success: true,
            hash: result
        });
    });
}

function comparePasswordWithHash(password, hash, done) {
    bcrypt.compare(password, hash, function(error, result) {
        if (error) {
            done({
                success: false,
                error: error
            });
            return;
        }
        done({
            success: true,
            isMatch: result
        });
    });
}

function isAdmin(username) {
    return (username == "ostracod");
}

router.get("/", function(req, res, next) {
    if (req.session.username) {
        res.redirect("menu");
    } else {
        res.redirect("login");
    }
});

router.get("/login", function(req, res, next) {
    res.render("login.html", {});
});

router.post("/loginAction", function(req, res, next) {
    var tempUsername = req.body.username;
    var tempPassword = req.body.password;
    accountUtils.acquireLock(function() {
        accountUtils.findAccountByUsername(tempUsername, function(error, index, result) {
            accountUtils.releaseLock();
            if (error) {
                reportDatabaseErrorWithJson(error, res);
                return;
            }
            if (!result) {
                res.json({success: false, message: "Bad account credentials."});
                return;
            }
            comparePasswordWithHash(tempPassword, result.passwordHash, function(result) {
                if (!result.success) {
                    reportDatabaseErrorWithJson(result.error, res);
                    return;
                }
                if (!result.isMatch) {
                    res.json({success: false, message: "Bad account credentials."});
                    return;
                }
                req.session.username = tempUsername;
                res.json({success: true});
            });
        });
    });
});

router.get("/logoutAction", function(req, res, next) {
    if (req.session.username) {
        delete req.session["username"];
    }
    res.redirect("login");
});

router.get("/createAccount", function(req, res, next) {
    res.render("createAccount.html", {});
});

router.post("/createAccountAction", function(req, res, next) {
    var tempUsername = req.body.username;
    var tempPassword = req.body.password;
    var tempEmail = req.body.email;
    if (tempUsername.length > 30) {
        res.json({success: false, message: "Your username must be at most 30 characters long."});
    }
    accountUtils.acquireLock(function() {
        accountUtils.findAccountByUsername(tempUsername, function(error, index, result) {
            if (error) {
                accountUtils.releaseLock();
                reportDatabaseErrorWithJson(error, res);
                return;
            }
            if (result) {
                res.json({success: false, message: "An account with that name already exists."});
                return;
            }
            generatePasswordHash(tempPassword, function(result) {
                if (!result.success) {
                    accountUtils.releaseLock();
                    reportDatabaseErrorWithJson(result.error, res);
                    return;
                }
                var tempPasswordHash = result.hash;
                accountUtils.addAccount({
                    username: tempUsername,
                    passwordHash: tempPasswordHash,
                    email: tempEmail,
                }, function(error) {
                    accountUtils.releaseLock();
                    if (error) {
                        reportDatabaseErrorWithJson(error, res);
                        return;
                    }
                    res.json({success: true});
                });
            });
        });
    });
});

router.get("/changePassword", checkAuthentication(PAGE_ERROR_OUTPUT), function(req, res, next) {
    res.render("changePassword.html", {});
});

router.post("/changePasswordAction", checkAuthentication(JSON_ERROR_OUTPUT), function(req, res, next) {
    var tempUsername = req.session.username;
    var tempOldPassword = req.body.oldPassword;
    var tempNewPassword = req.body.newPassword;
    accountUtils.acquireLock(function() {
        accountUtils.findAccountByUsername(tempUsername, function(error, index, result) {
            if (error) {
                accountUtils.releaseLock();
                reportDatabaseErrorWithJson(error, res);
                return;
            }
            var tempAccount = result;
            comparePasswordWithHash(tempOldPassword, tempAccount.passwordHash, function(result) {
                if (!result.success) {
                    accountUtils.releaseLock();
                    reportDatabaseErrorWithJson(result.error, res);
                    return;
                }
                if (!result.isMatch) {
                    accountUtils.releaseLock();
                    res.json({success: false, message: "Incorrect old password."});
                    return;
                }
                generatePasswordHash(tempNewPassword, function(result) {
                    if (!result.success) {
                        accountUtils.releaseLock();
                        reportDatabaseErrorWithJson(result.error, res);
                        return;
                    }
                    var tempPasswordHash = result.hash;
                    tempAccount.passwordHash = tempPasswordHash;
                    accountUtils.setAccount(index, tempAccount, function(error) {
                        accountUtils.releaseLock();
                        if (error) {
                            reportDatabaseErrorWithJson(error, res);
                            return;
                        }
                        res.json({success: true});
                    });
                });
            });
        });
    });
});

router.get("/menu", checkAuthentication(PAGE_ERROR_OUTPUT), function(req, res, next) {
    res.render("menu.html", {username: req.session.username, isAdmin: isAdmin(req.session.username)});
});

router.get("/stopServer", checkAuthentication(PAGE_ERROR_OUTPUT), function(req, res, next) {
    if (isAdmin(req.session.username)) {
        console.log("Admin scheduled shut-down.");
        gameUtils.stopGame(function() {
            setTimeout(function() {
                // Make sure there are no file transactions when stopping.
                accountUtils.acquireLock(function() {
                    console.log("Shutting down safely.");
                    process.exit(0);
                });
            }, 5000);
        });
        pageUtils.serveMessagePage(res, "The server is stopping now.", "menu", "Return to Main Menu");
    } else {
        pageUtils.serveMessagePage(res, "Nice try, Conor McClintock.", "menu", "Return to Main Menu");
    }
});

router.get("/game", checkAuthentication(PAGE_ERROR_OUTPUT), function(req, res, next) {
    res.render("game.html", {});
});

router.post("/gameUpdate", checkAuthentication(JSON_ERROR_OUTPUT), function(req, res, next) {
    res.json({
        success: true,
        commandList: []
    });
});

module.exports = router;
