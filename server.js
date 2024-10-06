const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const rooms = {};

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        const data = JSON.parse(message);
        
        switch (data.type) {
            case 'join':
                if (!rooms[data.room]) {
                    rooms[data.room] = [];
                }
                rooms[data.room].push(ws);
                ws.room = data.room;
                break;

            case 'signal':
                rooms[data.room].forEach(client => {
                    if (client !== ws) {
                        client.send(JSON.stringify({ type: 'signal', signal: data.signal }));
                    }
                });
                break;

            case 'leave':
                rooms[data.room] = rooms[data.room].filter(client => client !== ws);
                if (rooms[data.room].length === 0) {
                    delete rooms[data.room];
                }
                break;
        }
    });

    ws.on('close', () => {
        if (ws.room) {
            rooms[ws.room] = rooms[ws.room].filter(client => client !== ws);
            if (rooms[ws.room].length === 0) {
                delete rooms[ws.room];
            }
        }
    });
});

console.log('Signaling server running on ws://localhost:8080');
