
var fs = require("fs");

var accountsFilePath = "accounts.txt"
var accountsFile;
var accountsFileLock = false;
var accountEntryLength = 1000;

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

AccountUtils.prototype.padWithSpaces = function(text) {
    while (text.length < accountEntryLength) {
        text += " ";
    }
    return text;
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
    var tempBuffer = Buffer.alloc(accountEntryLength, 0, "utf8");
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
    var tempText = this.padWithSpaces(JSON.stringify(account));
    var tempBuffer = Buffer.from(tempText, "utf8");
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

var accountUtils = new AccountUtils();

module.exports = accountUtils;

