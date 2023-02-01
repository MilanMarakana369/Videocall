import React, { useEffect, useState, useRef } from 'react';
// import './App.css';
import { io } from "socket.io-client";
import RNSimplePeer from "react-native-simple-peer";
import { mediaDevices, RTCView, RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } from 'react-native-webrtc';
import { Button, Text, View } from 'react-native';
// import styled from "styled-components";

// const Container = styled.div`
//   height: 100vh;
//   width: 100%;
//   display: flex;
//   flex-direction: column;
// `;

// const Row = styled.div`
//   display: flex;
//   width: 100%;
// `;

// const Video = styled.video`
//   border: 1px solid blue;
//   width: 50%;
//   height: 50%;
// `;

function SingleRoom() {
    const [yourID, setYourID] = useState("");
    const [users, setUsers] = useState({});
    const [localStream, setLocalStream] = useState({ toURL: () => null });
    const [remoteStream, setRemoteStream] = useState({ toURL: () => null });
    const [stream, setStream] = useState();
    const [receivingCall, setReceivingCall] = useState(false);
    const [caller, setCaller] = useState("");
    const [callerSignal, setCallerSignal] = useState();
    const [callAccepted, setCallAccepted] = useState(false);

    const userVideo = useRef();
    const partnerVideo = useRef();
    const socket = useRef();

    useEffect(() => {
        socket.current = io("https://fec2-2405-201-200c-de2a-68d8-3680-667f-5d6e.in.ngrok.io");
        socket.current.on("connect", () => {
            console.log('socket connected with backend...', socket.current.id);
        });
        let isFront = true;
        mediaDevices.enumerateDevices().then((sourceInfos) => {
            let videoSourceId;
            for (let i = 0; i < sourceInfos.length; i++) {
                const sourceInfo = sourceInfos[i];
                if (
                    sourceInfo.kind == "videoinput" &&
                    sourceInfo.facing == (isFront ? "front" : "environment")
                ) {
                    videoSourceId = sourceInfo.deviceId;
                }
            }
            mediaDevices
                .getUserMedia({
                    audio: false,
                    video: {
                        mandatory: {
                            minWidth: 500,
                            minHeight: 300,
                            minFrameRate: 30,
                        },
                        facingMode: isFront ? "user" : "environment",
                        optional: videoSourceId ? [{ sourceId: videoSourceId }] : [],
                    },
                })
                .then(stream => {
                    setStream(stream);
                    console.log('media stream...', stream);
                    setLocalStream(stream);
                })
        })
        // mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
        //     if (userVideo.current) {
        //         userVideo.current.srcObject = stream;
        //     }
        // })

        socket.current.on("yourID", (id) => {
            setYourID(id);
        })
        socket.current.on("allUsers", (users) => {
            setUsers(users);
        })

        socket.current.on("hey", (data) => {
            setReceivingCall(true);
            setCaller(data.from);
            setCallerSignal(data.signal);
        })
    }, [socket]);

    function callPeer(id) {
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
                RTCPeerConnection, RTCIceCandidate, RTCSessionDescription
            },
            stream: stream,
        });

        peer.on("signal", data => {
            socket.current.emit("callUser", { userToCall: id, signalData: data, from: yourID })
        })

        peer.on("stream", stream => {
            console.log("remote stream...", stream);
            setRemoteStream(stream)
        });

        socket.current.on("callAccepted", signal => {
            setCallAccepted(true);
            peer.signal(signal);
        })

    }

    function acceptCall() {
        setCallAccepted(true);
        const peer = new RNSimplePeer({
            initiator: false,
            // trickle: false,
            webRTC: {
                RTCPeerConnection, RTCIceCandidate, RTCSessionDescription
            },
            stream: stream,
        });
        peer.on("signal", data => {
            socket.current.emit("acceptCall", { signal: data, to: caller })
        })

        peer.on("stream", stream => {
            console.log("remote stream...", stream);

            setRemoteStream(stream)
        });

        peer.signal(callerSignal);
    }

    let UserVideo;
    if (stream) {
        UserVideo = (
            <RTCView style={{ height: 100, width: 100, marginTop: 10, marginLeft: 10 }} objectFit='cover' streamURL={localStream ? localStream.toURL() : ''} />
        );
    }

    let PartnerVideo;
    if (callAccepted) {
        PartnerVideo = (
            <RTCView style={{ height: 100, width: 100, marginLeft: 150 }} objectFit='cover' streamURL={remoteStream ? remoteStream.toURL() : ''} />
        );
    }

    let incomingCall;
    if (receivingCall) {
        incomingCall = (
            <View>
                <Text>{caller} is calling you</Text>
                <Button title='Accept' onPress={acceptCall} />
            </View>
        )
    }
    return (
        <View style={{}}>
            <View style={{}}>
                {UserVideo}
                {PartnerVideo}
            </View>
            <View style={{ marginTop: 150 }}>
                {Object.keys(users).map(key => {
                    if (key === yourID) {
                        return null;
                    }
                    return (
                        <Button key={key} title={`call ${key}`} onPress={() => callPeer(key)} />
                    );
                })}
            </View>
            <View>
                {incomingCall}
            </View>
        </View>
    );
}

export default SingleRoom;