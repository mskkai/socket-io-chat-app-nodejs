const path = require('path');
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const Filter = require('bad-words');
const { generateMsg, generateLocationMsg } = require('./utils/messages');
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, '../public');

app.use(express.static(publicDirectoryPath));

//runs for each different connections

//socket.emit - emit messages to particular client
//io.emit - emit message to all client
//socket.broadcast.emit - emit messages to all expect sender client
//io.to.emit - emit messages to all client in a room
//socket.broadcase.to.emit - emit messages to all client in a room expect sender client


io.on('connection', (socket) => {
    console.log('New Web socket Connection');

    socket.on('join', ({ username, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room });

        if (error) {
            return callback(error);
        }
        socket.join(user.room);
        socket.emit('message', generateMsg('Admin', `Welcome to the chat in room ${user.room}!!`));
        socket.broadcast.to(user.room).emit('message', generateMsg('Admin', `${user.username} has joined!`));
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        });
        callback();
    });

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id);
        const filter = new Filter();

        if (filter.isProfane(message)) {
            return callback('Profanity not allowed!!');
        }

        io.to(user.room).emit('message', generateMsg(user.username, message));
        callback();
    });

    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id);
        io.to(user.room).emit('locationMessage', generateLocationMsg(user.username, `https://google.com/maps/?q=${coords.latitude},${coords.longitude}`));
        callback();
    });

    socket.on('disconnect', () => {
        const user = removeUser(socket.id);
        if (user) {
            io.to(user.room).emit('message', generateMsg('Admin', `${user.username} has left`));
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            });
        }
    });

});

server.listen(port, () => {
    console.log(`Server is up on Port ${port}`);
});