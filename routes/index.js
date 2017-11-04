var express = require("express");
var router = express.Router();
var app = require("app");

var mode = app.get("env");

router.get("/index", function(req, res, next) {
    res.render("index.html", {message: "It works!"});
});

module.exports = router;
