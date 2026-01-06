const io = require('socket.io-client');

const SERVER_URL = 'http://192.168.1.121:3001/pcs';
const LAN_ID = '724f11c3-b44c-46a1-80fb-8ba0ce6ceeec'; // Found in config.json

console.log(`🔌 Connecting to ${SERVER_URL}...`);

const socket = io(SERVER_URL, {
    transports: ['websocket'],
    reconnection: true
});

socket.on('connect', () => {
    console.log('✅ Connected to Socket.IO Server!');
    console.log(`outbox > join_lan: ${LAN_ID}`);
    socket.emit('join_lan', LAN_ID);
});

socket.on('disconnect', (reason) => {
    console.log(`⚠️ Disconnected: ${reason}`);
});

socket.on('connect_error', (error) => {
    console.log(`🔥 Connection Error: ${error.message}`);
});

socket.on('pc_status_update', (data) => {
    console.log('📩 RECEIVED EVENT: pc_status_update');
    console.log(JSON.stringify(data, null, 2));
});

// Keep alive
setInterval(() => {
    // console.log('Ping...');
}, 5000);
