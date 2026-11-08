const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(__dirname));

// Data files paths
const USERS_FILE = path.join(__dirname, 'users.json');
const MSGS_FILE = path.join(__dirname, 'messages.json');

// Files initialize karne ke liye helper function
function initFile(filePath) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify([]));
    }
}
initFile(USERS_FILE);
initFile(MSGS_FILE);

// Default Route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// SIGNUP API - Data Save karne ke liye
app.post('/api/signup', (req, res) => {
    try {
        const users = JSON.parse(fs.readFileSync(USERS_FILE));
        users.push(req.body);
        fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// OPERATOR PANEL DATA API
app.get('/api/operator-data', (req, res) => {
    try {
        const users = JSON.parse(fs.readFileSync(USERS_FILE));
        const messages = JSON.parse(fs.readFileSync(MSGS_FILE));
        res.json({ users, messages });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Real-time Chat logic using Socket.io
io.on('connection', (socket) => {
    socket.on('joinRoom', ({ username, roomCode }) => {
        socket.join(roomCode);
        socket.username = username;
        socket.roomCode = roomCode;

        io.to(roomCode).emit('message', {
            username: 'System',
            text: `${username} ne room join kar liya hai!`
        });
    });

    socket.on('chatMessage', (msg) => {
        const msgData = {
            roomCode: socket.roomCode,
            username: socket.username,
            text: msg,
            time: new Date().toLocaleTimeString('en-In', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit, hour12: true})
        };

        // Message ko hamesha ke liye messages.json file mein save karein
        try {
            const messages = JSON.parse(fs.readFileSync(MSGS_FILE));
            messages.push(msgData);
            fs.writeFileSync(MSGS_FILE, JSON.stringify(messages, null, 2));
        } catch (e) { console.log(e); }

        // Room ke logo ko message bhejein
        io.to(socket.roomCode).emit('message', msgData);
        
        // Operator Panel ko live update bhejein
        io.emit('operator-live-msg', msgData);
    });

    socket.on('disconnect', () => {
        if (socket.roomCode) {
            io.to(socket.roomCode).emit('message', {
                username: 'System',
                text: `${socket.username} ne room chhod diya hai.`
            });
        }
    });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
