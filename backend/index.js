const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const socket = require("socket.io");
const io = socket(server);

const users = {};

const socketToRoom = {};

io.on('connection', socket => {
    console.log('socket connected....', socket.id);
    socket.on("join room 369", (roomID) => {
        console.log('getting room id from clientside...', roomID)
        // console.log('getting user from clientside...', roomID.userName)

        if (users[roomID]) {
            const length = users[roomID].length;
            console.log("room length", length);
            console.log('user is...', users);
            if (length === 4) {
                socket.emit("room full");
                return;
            }
            users[roomID].push(socket.id);
        } else {
            users[roomID] = [socket.id];
        }
        socketToRoom[socket.id] = roomID;
        const usersInThisRoom = users[roomID].filter(id => id.socket !== socket.id);

        socket.emit("all users", usersInThisRoom);
        console.log('user in current room:', usersInThisRoom);
    });

    socket.on("joinRoom", roomId => {
        console.log('Joined roomId: ' + roomId + " socketId: " + socket.id + ' userId: ' + socket.userId);
        if (users[roomId]) {
            users[roomId].push(socket.id);
        } else {
            users[roomId] = [socket.id];
        }
        socketToRoom[socket.id] = roomId;
        const usersInThisRoom = users[roomId].filter(id => id !== socket.id);
        socket.join(roomId); //for message
        socket.emit("usersInRoom", usersInThisRoom); //sending all socket id already joined user in this room
    });

    socket.on("join room", function (data) {
        const userName = data.userName;
        console.log('getting room id from clientside...', data)
        // console.log('getting user from clientside...', data.roomID.userName)
        if (users[data.roomID]) {
            const length = users[data.roomID].length;
            console.log("room length", length);
            console.log('user is...', users);
            var arr = users[data.roomID];
            function userExists(username) {
                return arr.some(function (el) {
                    return el.userName === username;
                });
            }
            console.log(userExists(userName)); // true
            if (userExists(userName) == false) {
                users[data.roomID].push({ socket: socket.id, userName: userName });
            }
        } else {
            users[data.roomID] = [{ socket: socket.id, userName: userName }];
        }
        socketToRoom[socket.id] = data.roomID;
        const usersInThisRoom = users[data.roomID].filter(id => id.socket !== socket.id);
        socket.emit("all users", usersInThisRoom);
        console.log('user in current room:', usersInThisRoom);
        console.log('user in current socket', socketToRoom[socket.id]);
    });



    socket.on("sending signal", payload => {
        io.to(payload.userToSignal).emit('user joined', { signal: payload.signal, callerID: payload.callerID });
    });

    socket.on("returning signal", payload => {
        io.to(payload.callerID).emit('receiving returned signal', { signal: payload.signal, id: socket.id });
    });

    // socket.on("left room", function (data) {
    //     const data2 = users[data.roomID];
    //     if (data2.length != 0) {
    //         const index = data2.findIndex(item => item.socket === socket.id);
    //         data2.splice(index, 1);
    //         socket.emit("all users", users[data.roomID]);
    //     }
    // });

    // socket.on('disconnect', () => {
    //     const roomID = socketToRoom[socket.id];
    //     let room = users[roomID];
    //     if (room) {
    //         room = room.filter(id => id !== socket.id);
    //         users[roomID] = room;
    //     }
    // });

    socket.on('disconnect', () => {
        const roomId = socketToRoom[socket.id];
        let socketsIdConnectedToRoom = users[roomId];
        console.log('users in rooms', socketsIdConnectedToRoom);
        if (socketsIdConnectedToRoom) {
            socketsIdConnectedToRoom = socketsIdConnectedToRoom.filter(id => id.socket !== socket.id);
            users[roomId] = socketsIdConnectedToRoom;
        }
        socket.leave(roomId); //for message group(socket)
        socket.broadcast.emit("userLeft", socket.id); //sending socket id to all other connected user of same room without its own
        console.log("users left", users[roomId])
    });

    socket.on('BE-leave-room', ({ roomId, leaver }) => {
        delete socketList[socket.id];
        socket.broadcast
            .to(roomId)
            .emit('FE-user-leave', { userId: socket.id, userName: [socket.id] });
        io.sockets.sockets[socket.id].leave(roomId);
    });

    // socket.on('hide remote cam', targetId => {
    //     io.to(targetId).emit('hide cam');
    // });

    // socket.on('show remote cam', targetId => {
    //     io.to(targetId).emit('show cam')
    // })

});

// const users = {};

// io.on('connection', socket => {
//     console.log('socket connected...', socket.id);
//     if (!users[socket.id]) {
//         users[socket.id] = socket.id;
//     }
//     socket.emit("yourID", socket.id);
//     io.sockets.emit("allUsers", users);
//     socket.on('disconnect', () => {
//         delete users[socket.id];
//     })

//     socket.on("callUser", (data) => {
//         io.to(data.userToCall).emit('hey', { signal: data.signalData, from: data.from });
//     })

//     socket.on("acceptCall", (data) => {
//         io.to(data.to).emit('callAccepted', data.signal);
//     })
// });

const port = 5000;
server.listen(port, () => console.log(`server is running on port ${port}`));

// const express = require('express');
// const app = express();
// const http = require('http')
// const server = http.createServer(app)
// const io = require('socket.io')(server)

// const port = 3001;


// app.get('/', (req, res) => {
//     res.send("hello world")
// })

// server.listen(port, () => console.log(`server is running on port ${port}`));

