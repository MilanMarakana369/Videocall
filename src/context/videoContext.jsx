import React, { createContext, useRef, useState } from 'react';
import { io } from "socket.io-client"
import RNSimplePeer from "react-native-simple-peer";
import { mediaDevices, RTCPeerConnection, RTCView, RTCIceCandidate, RTCSessionDescription } from "react-native-webrtc";


const initialValues = {
    peers: [],
    localStream: null,
    socket: null,
    initialize: () => { },
    call: () => { },
    switchCamera: () => { },
    toggleMute: () => { },
    isMuted: false,
    closeCall: () => { },
    reset: () => { },
    activeCall: null,
    peerRef: []
};

export const VideoContext = createContext(initialValues);

const MainContextProvider = ({ children, route }) => {
    const [peers, setPeers] = useState(initialValues.peers);
    const [localStream, setLocalStream] = useState(initialValues.localStream);
    // const [remoteStream, setRemoteStream] = useState({ toURL: () => null });
    const [mediaStreams, setMediaStreams] = useState(null)
    // const [videooff, setvideoOff] = useState(true)
    const [socket, setSocket] = useState(initialValues.socket)
    // const socketRef = useRef();
    const userVideo = useRef();
    const peersRef = useRef(initialValues.peerRef);
    // const [videoToggle, setVideoToggle] = useState(true);

    const { roomId, userName } = route.params;

    const initialize = async () => {
        // const isFrontCamera = true;
        // const devices = await mediaDevices.enumerateDevices();

        // const facing = isFrontCamera ? 'front' : 'environment';
        // const videoSourceId = devices.find(
        //     (device) => device.kind === 'videoinput' && device.facing === facing,
        // );
        // const facingMode = isFrontCamera ? 'user' : 'environment';
        // const constraints = {
        //     audio: true,
        //     video: {
        //         mandatory: {
        //             minWidth: 1280,
        //             minHeight: 720,
        //             minFrameRate: 30,
        //         },
        //         facingMode,
        //         optional: videoSourceId ? [{ sourceId: videoSourceId }] : [],
        //     },
        // };

        // const newStream = await mediaDevices.getUserMedia(constraints);


        setLocalStream(newStream);
        console.log(localStream);

        const socketRef = io("https://8c38-2405-201-200c-de2a-9573-4ca4-86a0-5f71.ngrok.io"
            , {
                // forceNew: true
                // reconnection: true,
                // autoConnect: true,
            });

        socketRef.on('connect', () => {
            setSocket(socketRef);
            socketRef.emit("join room", { userName: userName, roomID: roomId });
        })

        const peers = [];
        socketRef.on("all users", users => {

            users.forEach(user => {
                const peer = createPeer(user.socket, socketRef.id, localStream)

                peersRef.current.push({
                    peerID: user.socket,
                    peer,
                })

                peers.push(peer)
            })
            setPeers(peers)
        })

        socketRef.on("user joined", payload => {
            const peer = addPeer(payload.signal, payload.callerID, localStream);
            peersRef.current.push({
                peerID: payload.callerID,
                peer,
            })

            setPeers(users => [...users, peer]);
        });

        socketRef.on("receiving returned signal", payload => {
            const item = peersRef.current.find(p => p.peerID === payload.id);
            item.peer.signal(payload.signal);
        });
    }


    function createPeer(userToSignal, callerID, stream, socket) {
        const peer = new RNSimplePeer({
            initiator: true,
            // trickle: false,
            config: {
                iceServers: [
                    {
                        urls: [
                            'stun:stun1.l.google.com:19302',
                            'stun:stun2.l.google.com:19302',
                        ],
                    },
                ],
            },
            webRTC: {
                RTCPeerConnection, mediaDevices, RTCIceCandidate, RTCSessionDescription, RTCView
            },
            stream
        })

        peer.on("signal", signal => {
            socket.emit("sending signal", { userToSignal, callerID, signal })
            // console.log('peer signalling...', { userToSignal, callerID, signal });
        })

        // peer.on("stream", stream => {
        //     setRemoteStream(stream)
        // });

        // peer.on("stream", stream => {
        //     console.log('remote stream...', stream);
        //     if (remoteStream) {
        //         setRemoteStream(stream)
        //     }
        // });

        return peer

    }

    function addPeer(incomingSignal, callerID, stream, socket) {
        const peer = new RNSimplePeer({
            initiator: false,
            // trickle: false,
            config: {
                iceServers: [
                    {
                        urls: [
                            'stun:stun1.l.google.com:19302',
                            'stun:stun2.l.google.com:19302',
                        ],
                    },
                ],
            },
            webRTC: {
                mediaDevices, RTCView, RTCPeerConnection, RTCIceCandidate, RTCSessionDescription
            },
            stream
        })


        peer.on("signal", signal => {
            socket.emit("returning signal", { signal, callerID })
        })

        // peer.on("stream", stream => {
        //     setRemoteStream(stream)
        // });

        peer.signal(incomingSignal);

        return peer;
    }
    return (
        <MainContextProvider.Provider
            value={{
                peers,
                peersRef,
                socket,
                setSocket,
                setPeers,
                users,
                setUsers,
                localStream,
                setLocalStream,
                remoteStream,
                setRemoteStream,
                initialize,

            }}>
            {children}
        </MainContextProvider.Provider>
    );
}

// const init = (socket) => {
//     let isFront = true;
//     mediaDevices.enumerateDevices().then((sourceInfos) => {
//         let videoSourceId;
//         for (let i = 0; i < sourceInfos.length; i++) {
//             const sourceInfo = sourceInfos[i];
//             if (
//                 sourceInfo.kind == "videoinput" &&
//                 sourceInfo.facing == (isFront ? "front" : "environment")
//             ) {
//                 videoSourceId = sourceInfo.deviceId;
//             }
//         }
//         mediaDevices
//             .getUserMedia({
//                 audio: true,
//                 video: {
//                     mandatory: {
//                         minWidth: 500,
//                         minHeight: 300,
//                         minFrameRate: 30,
//                     },
//                     facingMode: isFront ? "user" : "environment",
//                     optional: videoSourceId ? [{ sourceId: videoSourceId }] : [],
//                 },
//             })
//             .then(stream => {
//                 // let enabled = stream.getVideoTracks()[0].enabled;
//                 setLocalStream(stream)
//                 // console.log('video toggle', videoToggle);
//                 socket.emit("join room", { userName: userName, roomID: roomId });
//                 // console.log("local stream", stream.getVideoTracks())
//                 socket.on("all users", users => {
//                     // console.log('user list', users);
//                     const peers = [];
//                     users.forEach(userID => {
//                         // console.log('userID', userID.socket);
//                         const peer = createPeer(userID.socket, socket, stream);
//                         // console.log('create peer', peer);
//                         peersRef.current.push({
//                             peerID: userID.socket,
//                             peer,
//                         })
//                         console.log("peer...", peer)
//                         peers.push(peer);
//                         // console.log('peers got the data', peer);
//                     })
//                     console.log('got peer from ');
//                     setPeers(peers);
//                 })
//                 socketRef.current.on("user joined", payload => {
//                     // console.log("user Joined...", payload)
//                     const peer = addPeer(payload.signal, payload.callerID, stream);
//                     peersRef.current.push({
//                         peerID: payload.callerID,
//                         peer,
//                     })

//                     setPeers(users => [...users, peer]);
//                     // console.log('remote peer is...', peers.length)
//                 });

//                 socketRef.current.on("receiving returned signal", payload => {
//                     // console.log("receiving returned signal...", payload)

//                     const item = peersRef.current.find(p => p.peerID === payload.id);
//                     item.peer.signal(payload.signal);
//                     // console.log('peer items...', item);
//                 });
//             })
//         // return () => {

//         //     socketRef.current.off("all users", peer)
//         // }
//     })
// }



