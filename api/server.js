// Load .env file into Environment Variables
require('dotenv').config();

//All of the app code runs in a child process
var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var compression = require('compression');
var helmet = require('helmet');
var jwt = require('express-jwt');
var jwttoken = require('jsonwebtoken');
var cors = require('cors');
var schedule = require('node-schedule');

//Check for a JWT Key, if not set to 'local' for tests
if (!process.env.JWT_KEY) {
    process.env.JWT_KEY = 'local';
}
//Sets up jwt object to verify key in auth header
var jwtCheck = jwt({
    secret: process.env.JWT_KEY
});



var app = module.exports = express();
//Setup the swagger docs
const expressSwagger = require('express-swagger-generator')(app);
let options = {
    swaggerDefinition: {
        info: {
            description: 'A tool to aggergate devices',
            title: 'Scout',
            version: '0.2.0',
        },
        host: 'localhost:3000',
        basePath: '/',
        consumes: [
            "application/json"
        ],
        produces: [
            "application/json"
        ],
        schemes: ['http', 'https'],
        securityDefinitions: {
            JWT: {
                type: 'apiKey',
                in: 'header',
                name: 'Authorization',
                description: "",
            },
            Basic: {
                type: 'basic',
                in: 'header',
                name: 'Authorization',
                description: "Basic auth that must be setup in the Jamf Pro server. This covers all webhooks endpoints. The user name is webhookuser and the password is set on install."
            }
        }
    },
    basedir: __dirname, //app absolute path
    files: ['./controllers/*.js'] //Path to the API handle folder
};
expressSwagger(options);
//Serve up the reports
app.use('/reports', express.static('reports'));
//serve the app contents
app.use(express.static('../app'));
//Basic application hardening
app.use(helmet());
// parse application/json
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//Allow cross origin requests
app.use(cors());
app.use(compression()); //Compress all routes

// basic auth function for the hooks
hookAuth = (req, res, next) => {
    const b64auth = (req.headers.authorization || '').split(' ')[1] || ''
    const strauth = new Buffer.from(b64auth, 'base64').toString()
    const splitIndex = strauth.indexOf(':')
    const user = strauth.substring(0, splitIndex)
    const password = strauth.substring(splitIndex + 1)
    // check the password if the env isn't set, auth isn't enabled so pass through
    if ((user && password && user === "webhookuser" && password === process.env.WEBHOOK_PASS) || process.env.WEBHOOK_PASS === "" || process.env.WEBHOOK_PASS === null) {
        // grant access
        return next()
    }
    // access denied
    res.set('WWW-Authenticate', 'Basic realm="401"')
    return res.status(401).send("Authentication required")
}

//require auth to use endpoints
app.use('/servers', jwtCheck);
app.use('/devices', jwtCheck);
app.use('/webhooks', hookAuth)
app.use('/reports', jwtCheck);
app.use('/users/all', jwtCheck);
app.use('/users/verify', jwtCheck);
app.use('/settings', jwtCheck);
app.use('/commands', jwtCheck);
//Provide custom response middleware
app.use(function (err, req, res, next) {
    if (err.name === 'UnauthorizedError') {
        res.status(401).send(' ');
    }
});
//Setup routes
app.use('/servers', require('./controllers/servers'));
app.use('/devices', require('./controllers/devices'));
app.use('/webhooks', require('./controllers/webhooks'));
app.use('/patches', require('./controllers/patches'));
app.use('/users', require('./controllers/users'));
app.use('/reports', require('./controllers/reports'));
app.use('/settings', require('./controllers/admin'));
app.use('/commands', require('./controllers/commands'));

//Serve the web app
app.get('/', function (req, res) {
    res.sendFile('../app/index.html');
});

var db = require('./common/db.js');
db.connect(function (err) {
    if (err) {
        console.log('Unable to connect to database.');
        process.exit(1);
    } else {
        //Connect to the mongo database
        db.connectNoSQL(function (err) {
            if (err) {
                console.log('Unable to connect to mongo database.');
                process.exit(1);
            }
        });
    }
});

module.exports = app