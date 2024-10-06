let localStream;
let peerConnection;
const serverConfig = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" } // STUN server
    ]
};

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const roomInput = document.getElementById("roomInput");
const joinButton = document.getElementById("joinButton");
const leaveButton = document.getElementById("leaveButton");

// Update the WebSocket URL to your deployed server's URL
const ws = new WebSocket('wss://voice-call-for-all.netlify.app'); // Update this with your actual URL

ws.onmessage = async (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
        case 'signal':
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));
            break;
    }
};

joinButton.onclick = async () => {
    const room = roomInput.value;
    ws.send(JSON.stringify({ type: 'join', room }));

    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;

    peerConnection = new RTCPeerConnection(serverConfig);
    localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

    peerConnection.onicecandidate = event => {
        if (event.candidate) {
            ws.send(JSON.stringify({ type: 'signal', signal: { candidate: event.candidate }, room }));
        }
    };

    peerConnection.ontrack = event => {
        remoteVideo.srcObject = event.streams[0];
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    ws.send(JSON.stringify({ type: 'signal', signal: offer, room }));

    leaveButton.disabled = false;
    joinButton.disabled = true;
};

leaveButton.onclick = () => {
    ws.send(JSON.stringify({ type: 'leave', room: roomInput.value }));
    peerConnection.close();
    localStream.getTracks().forEach(track => track.stop());
    leaveButton.disabled = true;
    joinButton.disabled = false;
};
