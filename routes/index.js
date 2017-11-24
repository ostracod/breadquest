
var express = require("express");
var router = express.Router();
var bcrypt = require("bcrypt");
var pageUtils = require("utils/page.js");
var accountUtils = require("utils/account.js");
var gameUtils = require("utils/game.js");
var app = require("breadQuest");

var tempResource = require("models/chunk");
var BREAD_TILE = tempResource.BREAD_TILE;

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
                reportDatabaseErrorWithJson(error, req, res);
                return;
            }
            if (!result) {
                res.json({success: false, message: "Bad account credentials."});
                return;
            }
            comparePasswordWithHash(tempPassword, result.passwordHash, function(result) {
                if (!result.success) {
                    reportDatabaseErrorWithJson(result.error, req, res);
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
    var tempAvatar = parseInt(req.body.avatar);
    if (tempUsername.length > 30) {
        res.json({success: false, message: "Your username may not be longer than 30 characters."});
        return;
    }
    if (tempAvatar < 0 || tempAvatar > 7 || isNaN(tempAvatar)) {
        res.json({success: false, message: "Invalid avatar."});
        return;
    }
    accountUtils.acquireLock(function() {
        accountUtils.findAccountByUsername(tempUsername, function(error, index, result) {
            if (error) {
                accountUtils.releaseLock();
                reportDatabaseErrorWithJson(error, req, res);
                return;
            }
            if (result) {
                accountUtils.releaseLock();
                res.json({success: false, message: "An account with that name already exists."});
                return;
            }
            generatePasswordHash(tempPassword, function(result) {
                if (!result.success) {
                    accountUtils.releaseLock();
                    reportDatabaseErrorWithJson(result.error, req, res);
                    return;
                }
                var tempPasswordHash = result.hash;
                accountUtils.addAccount({
                    username: tempUsername,
                    passwordHash: tempPasswordHash,
                    email: tempEmail,
                    avatar: tempAvatar
                }, function(error) {
                    accountUtils.releaseLock();
                    if (error) {
                        reportDatabaseErrorWithJson(error, req, res);
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
                reportDatabaseErrorWithJson(error, req, res);
                return;
            }
            var tempAccount = result;
            comparePasswordWithHash(tempOldPassword, tempAccount.passwordHash, function(result) {
                if (!result.success) {
                    accountUtils.releaseLock();
                    reportDatabaseErrorWithJson(result.error, req, res);
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
                        reportDatabaseErrorWithJson(result.error, req, res);
                        return;
                    }
                    var tempPasswordHash = result.hash;
                    tempAccount.passwordHash = tempPasswordHash;
                    accountUtils.setAccount(index, tempAccount, function(error) {
                        accountUtils.releaseLock();
                        if (error) {
                            reportDatabaseErrorWithJson(error, req, res);
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
    tempUsername = req.session.username;
    accountUtils.acquireLock(function() {
        accountUtils.findAccountByUsername(tempUsername, function(error, index, result) {
            accountUtils.releaseLock();
            if (error) {
                reportDatabaseErrorWithPage(error, req, res);
                return;
            }
            res.render("menu.html", {
                username: tempUsername,
                isAdmin: isAdmin(tempUsername),
                avatar: result.avatar,
                breadCount: accountUtils.getAccountBreadCount(result),
                avatarChangeCost: gameUtils.avatarChangeCost
            });
        });
    });
});

router.get("/changeAvatar", checkAuthentication(PAGE_ERROR_OUTPUT), function(req, res, next) {
    function reportInsufficientBread() {
        pageUtils.serveMessagePage(res, "You don't have enough bread to afford that.", "menu", "Return to Main Menu");
    }
    var tempUsername = req.session.username;
    var tempBreadCount = null;
    var tempPlayer = gameUtils.getPlayerByUsername(tempUsername);
    if (tempPlayer !== null) {
        tempBreadCount = tempPlayer.inventory.getTileCount(BREAD_TILE);
        if (tempBreadCount < gameUtils.avatarChangeCost) {
            reportInsufficientBread();
            return;
        }
    }
    accountUtils.acquireLock(function() {
        accountUtils.findAccountByUsername(tempUsername, function(error, index, result) {
            accountUtils.releaseLock();
            if (error) {
                reportDatabaseErrorWithPage(error, req, res);
                return;
            }
            if (tempBreadCount === null) {
                tempBreadCount = accountUtils.getAccountBreadCount(result);
            }
            if (tempBreadCount < gameUtils.avatarChangeCost) {
                reportInsufficientBread();
                return;
            }
            res.render("changeAvatar.html", {
                avatar: result.avatar,
                avatarChangeCost: gameUtils.avatarChangeCost,
                breadCount: tempBreadCount
            });
        });
    });
});

router.post("/changeAvatarAction", checkAuthentication(JSON_ERROR_OUTPUT), function(req, res, next) {
    var tempAvatar = parseInt(req.body.avatar);
    if (tempAvatar < 0 || tempAvatar > 7 || isNaN(tempAvatar)) {
        res.json({success: false, message: "Invalid avatar."});
        return;
    }
    function reportInsufficientBread() {
        res.json({
            success: false,
            message: "You don't have enough bread to afford that."
        });
    }
    function reportSameAvatar() {
        res.json({
            success: false,
            message: "You are already using that avatar."
        });
    }
    var tempUsername = req.session.username;
    var tempBreadCount = null;
    var tempPlayer = gameUtils.getPlayerByUsername(tempUsername);
    if (tempPlayer !== null) {
        tempBreadCount = tempPlayer.inventory.getTileCount(BREAD_TILE);
        if (tempBreadCount < gameUtils.avatarChangeCost) {
            reportInsufficientBread();
            return;
        }
        if (tempAvatar == tempPlayer.avatar) {
            reportSameAvatar();
            return;
        }
        tempBreadCount -= gameUtils.avatarChangeCost;
        tempPlayer.inventory.setTileCount(BREAD_TILE, tempBreadCount);
        tempPlayer.setAvatar(tempAvatar);
    }
    accountUtils.acquireLock(function() {
        accountUtils.findAccountByUsername(tempUsername, function(error, index, result) {
            if (error) {
                accountUtils.releaseLock();
                reportDatabaseErrorWithJson(error, req, res);
                return;
            }
            var tempAccount = result;
            if (tempBreadCount === null) {
                tempBreadCount = accountUtils.getAccountBreadCount(tempAccount);
                if (tempBreadCount < gameUtils.avatarChangeCost) {
                    accountUtils.releaseLock();
                    reportInsufficientBread();
                    return;
                }
                if (tempAvatar == tempAccount.avatar) {
                    accountUtils.releaseLock();
                    reportSameAvatar();
                    return;
                }
                tempBreadCount -= gameUtils.avatarChangeCost;
            }
            accountUtils.setAccountBreadCount(tempAccount, tempBreadCount);
            tempAccount.avatar = tempAvatar;
            accountUtils.setAccount(index, tempAccount, function(error) {
                accountUtils.releaseLock();
                if (error) {
                    reportDatabaseErrorWithJson(error, req, res);
                    return;
                }
                res.json({success: true});
            });
        });
    });
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
    function performUpdate() {
        gameUtils.performUpdate(req.session.username, JSON.parse(req.body.commandList), function(result) {
            res.json(result);
        });
    }
    if (mode == "development") {
        setTimeout(performUpdate, 50 + Math.floor(Math.random() * 150));
    } else {
        performUpdate();
    }
});

router.get("/leaderboard", function(req, res, next) {
    accountUtils.acquireLock(function() {
        accountUtils.getLeaderboardAccounts(20, function(error, accountList) {
            accountUtils.releaseLock();
            if (error) {
                reportDatabaseErrorWithPage(error, req, res);
                return;
            }
            var tempAvatarList = [];
            var index = 0;
            while (index < accountList.length) {
                var tempAccount = accountList[index];
                var tempPlayer = gameUtils.getPlayerByUsername(tempAccount.username);
                if (tempPlayer === null) {
                    tempAccount.breadCount = accountUtils.getAccountBreadCount(tempAccount);
                } else {
                    tempAccount.breadCount = tempPlayer.inventory.getTileCount(BREAD_TILE);
                }
                tempAccount.index = index;
                tempAccount.ordinalNumber = index + 1;
                tempAvatarList.push(tempAccount.avatar);
                index += 1;
            }
            var tempUrl = pageUtils.generateReturnUrl(req);
            res.render("leaderboard.html", {
                accountList: accountList,
                avatarList: JSON.stringify(tempAvatarList),
                url: tempUrl.url,
                urlLabel: tempUrl.urlLabel
            });
        });
    });
});

module.exports = router;
