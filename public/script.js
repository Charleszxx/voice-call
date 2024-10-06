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

// Change localhost to your server's IP if testing on different devices
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
    console.log("Connected to the signaling server");
};

ws.onmessage = async (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
        case 'signal':
            // Handling received signals from other peers
            if (data.signal.candidate) {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
            } else if (data.signal.sdp) {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.signal));
                
                // If the received description is an offer, create an answer
                if (data.signal.type === 'offer') {
                    const answer = await peerConnection.createAnswer();
                    await peerConnection.setLocalDescription(answer);
                    ws.send(JSON.stringify({ type: 'signal', signal: answer, room: data.room }));
                }
            }
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

    // Create offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    ws.send(JSON.stringify({ type: 'signal', signal: offer, room }));

    leaveButton.disabled = false;
    joinButton.disabled = true;
};

leaveButton.onclick = () => {
    ws.send(JSON.stringify({ type: 'leave', room: roomInput.value }));
    if (peerConnection) {
        peerConnection.close();
    }
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
    }
    leaveButton.disabled = true;
    joinButton.disabled = false;
};
