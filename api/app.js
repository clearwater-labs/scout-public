// Load .env file into Environment Variables
require('dotenv').config();
//Require the cluster module to handle spinning new threads up
var cluster = require('cluster');
var exec = require('child_process').exec;
var servers = require('./models/server.js');
var devices = require('./models/device.js');
var cron = require('./common/cron-handler.js');

//If we are the master process, spin up new threads
if (cluster.isMaster) {
  //Copy a recent copy of the .env file to the home directory to be used by the worker
  exec('cp .env ~', (err, stdout, stderr) => {
    if (err) {
      console.log('Unable to update copy of .env file for the worker, exiting.');
      process.exit(1);
    }
  })
  //Connect to both databases and make sure the connection is auth'd
  if (!module.parent) {
    var db = require('./common/db.js');
    //connect to the mysql database
    db.connect(function (err) {
      //exit if we can't connect
      if (err) {
        console.log('Unable to connect to mysql database.');
        process.exit(1);
      }
      //Make sure we can connect to the mongo database
      db.connectNoSQL(function (err) {
        if (err) {
          console.log('Unable to connect to mongo database.');
          process.exit(1);
        }
      });
    });
  }
  console.log("  ___              _   ");
  console.log(" / __| __ ___ _  _| |_ ");
  console.log(" \\__ \\/ _/ _ \\ || |  _|");
  console.log(" |___/\\__\\___/\\_,_|\\__|");
  console.log("                       ");
  console.log("Originally created by Jacob Schultz");
  console.log("                       ");
  //For revery server in the database, make sure our cron jobs are up to date
  servers.getAllServers()
    .then(function (serverList) {
      //Take the server list and pass it to the handler
      cron.handleServerRecords(serverList)
        .then(function (cronResult) {
          console.log('Cron jobs have been verified and are operational');
        })
        .catch(function (error) {
          console.log('Unable to verify cron jobs');
          console.log(error);
        });
    })
    .catch(function (error) {
      console.log('Unable to verify cron jobs');
      console.log(error);
    });
  //Get a count of the machines cores and spin up that many threads
  var coreCount = require('os').cpus().length;
  //see if their is a core count provided that could be less than whats on the system
  if (process.env.THREAD_COUNT) {
    var threadCountSetByUser = parseInt(process.env.THREAD_COUNT);
    if (threadCountSetByUser < coreCount) {
      coreCount = threadCountSetByUser;
    }
  }
  for (var i = 0; i < coreCount; i++) {
    cluster.fork();
  }
  console.log('Spun up ' + coreCount + ' threads.');
  //If a worker dies, restart a new one
  cluster.on('exit', function (w) {
    console.log('Worker %d died, spinning up a new one.', w.id);
    cluster.fork();
  });
  // This is a worker process
} else {
  const app = require('./server.js')
  if (!module.parent) {
    app.listen(process.env.PORT || 3000)
  }
}
