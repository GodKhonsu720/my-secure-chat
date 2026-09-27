const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Static files ko directly serve karne ke liye configuration
app.use(express.static(__dirname));

// Default route par index.html bhejenge
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Real-time Chat logic using WebSockets (Socket.io)
io.on('connection', (socket) => {
    console.log('Ek naya user connect hua hai:', socket.id);

    // Jab koi user private room join karta hai
    socket.on('joinRoom', ({ username, roomCode }) => {
        socket.join(roomCode);
        socket.username = username;
        socket.roomCode = roomCode;

        // Room ke baaki logo ko update bhejna
        socket.to(roomCode).emit('message', {
            username: 'System',
            text: `${username} ne room join kar liya hai!`
        });
    });

    // Jab koi message bhejta hai (sirf usi private room ke logo tak jayega)
    socket.on('chatMessage', (msg) => {
        io.to(socket.roomCode).emit('message', {
            username: socket.username,
            text: msg
        });
    });

    // User ke leave ya disconnect hone par
    socket.on('disconnect', () => {
        if (socket.roomCode) {
            io.to(socket.roomCode).emit('message', {
                username: 'System',
                text: `${socket.username} ne room chhod diya hai.`
            });
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`Aapka Secure Chat Server chal raha hai: http://localhost:${PORT}`);
});