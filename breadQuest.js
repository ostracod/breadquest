require("rootpath")();
var express = require("express");
var path = require("path");
var favicon = require("serve-favicon");
var logger = require("morgan");
var cookieParser = require("cookie-parser");
var bodyParser = require("body-parser");
var mustacheExpress = require("mustache-express");
var session = require("express-session")
var http = require("http");
var https = require("https");
var fs = require("fs");

var app = express();
module.exports = app;

var index = require("./routes/index");

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

var mode = app.get("env");
if (mode == "development") {
    console.log("WARNING: APPLICATION RUNNING IN DEVELOPMENT MODE!");
    console.log("CACHING TURNED OFF");
    console.log("ERROR REPORTING TURNED ON");
    console.log("DEBUG SPAM TURNED ON");
    console.log("SIMULATED LAG TURNED ON");
    console.log("AUTHENTICATION TURNED OFF");
    console.log("HTTPS TURNED OFF");
    app.disable("view cache");
    app.use(logger("dev"));
} else if (mode == "production") {
    console.log("Application running in production mode.");
} else {
    console.log("WARNING: UNRECOGNIZED APPLICATION MODE! (" + mode + ")");
    console.log("PLEASE USE \"development\" OR \"production\"");
    process.exit(1);
}

app.engine("html", mustacheExpress());

var sessionSecret = fs.readFileSync("./sessionSecret.txt", "utf8")

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, "public", "favicon.ico")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.set("trust proxy", 1);
app.use(session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}))

app.use("/", index);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error("Not Found");
    err.status = 404;
    next(err);
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get("env") === "development" ? err : {};
    
    // render the error page
    res.status(err.status || 500);
    res.render("error");
});

var server;

if (mode == "development") {
    server = http.createServer(app);
} else {
    var privateKey  = fs.readFileSync("ssl.key", "utf8");
    var certificate = fs.readFileSync("ssl.crt", "utf8");
    var credentials = {key: privateKey, cert: certificate};
    server = https.createServer(credentials, app);
}

var portNumber = 2626;

server.listen(portNumber, function() {
    console.log("Listening on port " + portNumber + ".");
});



