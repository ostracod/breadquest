var express = require("express");
var router = express.Router();
var pageUtils = require("utils/page.js");
var accountUtils = require("utils/account.js");
var app = require("app");

var checkAuthentication = pageUtils.checkAuthentication;
var serveMessagePage = pageUtils.serveMessagePage;
var JSON_ERROR_OUTPUT = pageUtils.errorOutput.JSON_ERROR_OUTPUT;
var PAGE_ERROR_OUTPUT = pageUtils.errorOutput.PAGE_ERROR_OUTPUT;
var mode = app.get("env");

router.get("/index", function(req, res, next) {
    res.render("index.html", {message: "It works!"});
});

module.exports = router;
