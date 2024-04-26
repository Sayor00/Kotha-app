require('dotenv').config({ path: './.env' });

const express = require('express');
const { Server: SocketServer } = require('socket.io');
const http = require('http');
const path = require('path');
const cors = require('cors');
const routes = require('./routes');
const config = require('./config');
const db = require('./db/connect');
const cloudinary = require('./middleware/cloudinary');

const app = express();
const server = http.createServer(app);

// middleware
app.use(cors(config.cors));
app.use(express.json({ limit: '10mb' }));
app.use(
  express.urlencoded({
    limit: '10mb',
    parameterLimit: 100000,
    extended: false,
  })
);

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS");
  next();
});

cloudinary();
db();

app.use('/api', routes);

if (!config.isDev) {
  app.use(express.static('../client/public'));
  const client = path.join(__dirname, '..', 'client', 'public', 'index.html');

  app.get('*', (req, res) => res.sendFile(client));
}

// store socket on global object
global.io = new SocketServer(server, {
  cors: {
    origin: "*",
  },
});
require('./socket');

module.exports = server;