
var fs = require("fs");

var tempResource = require("models/chunk");
var BREAD_TILE = tempResource.BREAD_TILE;

var accountsFilePath = "accounts.txt"
var accountsFile;
var accountsFileLock = false;
var accountEntryLength = 1000;

if (!fs.existsSync(accountsFilePath)) {
    var tempFile = fs.openSync(accountsFilePath, "w");
    fs.closeSync(tempFile);
}

function AccountUtils() {

}

AccountUtils.prototype.acquireLock = function(done) {
    if (accountsFileLock) {
        setTimeout(function() {
            accountUtils.acquireLock(done);
        }, 2);
    } else {
        accountsFileLock = true;
        accountsFile = fs.openSync(accountsFilePath, "r+");
        done();
    }
}

AccountUtils.prototype.releaseLock = function() {
    fs.closeSync(accountsFile);
    accountsFileLock = false;
}

AccountUtils.prototype.createEntryBuffer = function(account) {
    var tempText = JSON.stringify(account);
    var tempBuffer = Buffer.from(tempText, "utf8");
    var output = Buffer.alloc(accountEntryLength, 32);
    tempBuffer.copy(output);
    return output;
}

AccountUtils.prototype.getAccountCount = function() {
    if (!accountsFileLock) {
        console.log("Missing lock!");
        return -1;
    }
    var tempStats = fs.statSync(accountsFilePath);
    return tempStats.size / accountEntryLength;
}

AccountUtils.prototype.getAccount = function(index, done) {
    if (!accountsFileLock) {
        console.log("Missing lock!");
        return;
    }
    var tempBuffer = Buffer.alloc(accountEntryLength);
    fs.read(accountsFile, tempBuffer, 0, accountEntryLength, index * accountEntryLength, function(error, count, buffer) {
        if (error) {
            done(error, null);
            return;
        }
        done(null, JSON.parse(buffer.toString("utf8")));
    });
}

AccountUtils.prototype.setAccount = function(index, account, done) {
    if (!accountsFileLock) {
        console.log("Missing lock!");
        return;
    }
    var tempBuffer = this.createEntryBuffer(account);
    fs.write(accountsFile, tempBuffer, 0, accountEntryLength, index * accountEntryLength, function(error, count, buffer) {
        if (error) {
            done(error);
            return;
        }
        done(null);
    });
}

AccountUtils.prototype.findAccountByUsername = function(username, done) {
    if (!accountsFileLock) {
        console.log("Missing lock!");
        return;
    }
    var tempCount = this.getAccountCount();
    var index = 0;
    function processNextAccount() {
        if (index >= tempCount) {
            done(null, -1, null);
            return;
        }
        accountUtils.getAccount(index, function(error, account) {
            if (error) {
                done(error, -1, null);
                return;
            }
            if ("username" in account) {
                if (account.username == username) {
                    done(null, index, account);
                    return;
                }
            }
            index += 1;
            processNextAccount();
        });
    }
    processNextAccount();
}

AccountUtils.prototype.addAccount = function(account, done) {
    if (!accountsFileLock) {
        console.log("Missing lock!");
        return;
    }
    var tempCount = this.getAccountCount();
    var index = 0;
    function processNextAccount() {
        if (index >= tempCount) {
            accountUtils.setAccount(tempCount, account, function(error) {
                done(error);
            });
            return;
        }
        accountUtils.getAccount(index, function(error, account) {
            if (error) {
                done(error);
                return;
            }
            if (!("username" in account)) {
                accountUtils.setAccount(index, account, function(error) {
                    done(error);
                });
                return;
            }
            index += 1;
            processNextAccount();
        });
    }
    processNextAccount();
}

AccountUtils.prototype.removeAccount = function(index, done) {
    if (!accountsFileLock) {
        console.log("Missing lock!");
        return -1;
    }
    accountUtils.setAccount(index, {}, function(error) {
        done(error);
    });
}

AccountUtils.prototype.getLeaderboardAccounts = function(amount, done) {
    var tempAccountList = [];
    var tempCount = this.getAccountCount();
    if (!accountsFileLock) {
        console.log("Missing lock!");
        return;
    }
    function filterLeaderboardAccounts() {
        function compareAccounts(account1, account2) {
            var tempBreadCount1 = accountUtils.getAccountBreadCount(account1);
            var tempBreadCount2 = accountUtils.getAccountBreadCount(account2);
            if (tempBreadCount1 > tempBreadCount2) {
                return -1;
            }
            if (tempBreadCount1 < tempBreadCount2) {
                return 1;
            }
            return 0;
        }
        tempAccountList.sort(compareAccounts);
        if (tempAccountList.length > amount) {
            tempAccountList.length = amount;
        }
        done(null, tempAccountList);
    }
    var tempCount = this.getAccountCount();
    var index = 0;
    function processNextAccount() {
        if (index >= tempCount) {
            filterLeaderboardAccounts();
            return;
        }
        accountUtils.getAccount(index, function(error, account) {
            if (error) {
                done(error, null);
                return;
            }
            if ("username" in account) {
                tempAccountList.push(account);
            }
            index += 1;
            processNextAccount();
        });
    }
    processNextAccount();
}

AccountUtils.prototype.getAccountBreadCount = function(account) {
    if (!("inventory" in account)) {
        return 0;
    }
    if (!(BREAD_TILE in account.inventory)) {
        return 0;
    }
    return account.inventory[BREAD_TILE];
}

var accountUtils = new AccountUtils();

module.exports = accountUtils;

