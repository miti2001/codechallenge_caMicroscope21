const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const moment = require('moment');


const {
  formatMessage, 
  prevMessage } = require('./utils/messages');


const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers
} = require('./utils/users');


const app = express();
const server = http.createServer(app);
const io = socketio(server);

// objects for history
// const data = {
//   username : 'username',
//   text : 'text',
//   time : 'time',
// };

var history = [];

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

const botName = 'Bot ';

// Run when client connects
io.on('connection', socket => {
  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    // Welcome current user
    // display the previous messages for him. 

    history.forEach(x=> socket.emit('message', prevMessage(x.username, x.text, x.time)));
    
    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage(botName, `${user.username} has joined the chat`)
      );

    // Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    });
  });

  // Listen for chatMessage
  socket.on('chatMessage', msg => {
    const user = getCurrentUser(socket.id);

    var d = new Object();
    d.username ="user";
    d.text ="msg";
    d.time = moment().format('h:mm a');
    history.push(d);
    history = history.slice(-25);

    io.to(user.room).emit('message', formatMessage(user.username, msg));
  });

  // Runs when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage(botName, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    }
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));