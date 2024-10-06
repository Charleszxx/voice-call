const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const rooms = {};

wss.on('connection', function connection(ws) {
    console.log('A new client connected.');

    ws.on('message', function incoming(message) {
        let data;

        try {
            data = JSON.parse(message);
        } catch (error) {
            console.error('Error parsing message:', error);
            return;
        }

        switch (data.type) {
            case 'join':
                if (!rooms[data.room]) {
                    rooms[data.room] = [];
                    console.log(`Room ${data.room} created.`);
                }
                rooms[data.room].push(ws);
                ws.room = data.room;
                console.log(`Client joined room ${data.room}. Current clients: ${rooms[data.room].length}`);
                break;

            case 'signal':
                if (rooms[data.room]) {
                    rooms[data.room].forEach(client => {
                        if (client !== ws) {
                            client.send(JSON.stringify({ type: 'signal', signal: data.signal }));
                        }
                    });
                }
                break;

            case 'leave':
                if (rooms[data.room]) {
                    rooms[data.room] = rooms[data.room].filter(client => client !== ws);
                    console.log(`Client left room ${data.room}. Current clients: ${rooms[data.room].length}`);
                    if (rooms[data.room].length === 0) {
                        delete rooms[data.room];
                        console.log(`Room ${data.room} deleted as it is empty.`);
                    }
                }
                break;

            default:
                console.warn(`Unknown message type: ${data.type}`);
                break;
        }
    });

    ws.on('close', () => {
        if (ws.room) {
            if (rooms[ws.room]) {
                rooms[ws.room] = rooms[ws.room].filter(client => client !== ws);
                console.log(`Client disconnected from room ${ws.room}. Current clients: ${rooms[ws.room].length}`);
                if (rooms[ws.room].length === 0) {
                    delete rooms[ws.room];
                    console.log(`Room ${ws.room} deleted as it is empty.`);
                }
            }
        }
    });
});

console.log('Signaling server running on ws://localhost:8080');
