import React, { useContext, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import RNSimplePeer from "react-native-simple-peer";
// import styled from "styled-components/native";
import { Button, Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { mediaDevices , RTCPeerConnection, RTCView, RTCIceCandidate, RTCSessionDescription } from "react-native-webrtc";
import { ScrollView } from "react-native-gesture-handler";
import { VideoContext } from "../context/videoContext";
import { Feather, Ionicons, MaterialIcons } from "@expo/vector-icons"
const { width, height } = Dimensions.get("window");


const Video = (props) => {
    const [remoteStream, setRemoteStream] = useState({ toURL: () => null });

    useEffect(() => {
        props.peer.peer.on("stream", stream => {
            setRemoteStream(stream);
        })
    }, []);

    return (
        <RTCView objectFit="cover" style={{ width: 150, height: 150 }} streamURL={remoteStream ? remoteStream.toURL() : ''} />
    );
}

const Room = ({ route }) => {
    // const { initialize, peers, localStream } = useContext(VideoContext)


    const [peers, setPeers] = useState([]);
    const [localStream, setLocalStream] = useState(null);
    const [mediaStreams, setMediaStreams] = useState(null)
    const [isMuted, setIsMuted] = useState(false);
    const [screenShare, setScreenShare] = useState(false);
    const [videoToggle, setVideoToggle] = useState(false);
    const [camera, setCameraToggle] = useState(true);
    const socketRef = useRef();
    const peersRef = useRef([]);
    const screenTrackRef = useRef();
    const userStream = useRef();
    const videoRef = useRef(null)
    const webcamStream = useRef(); //own webcam stream
    const screenCaptureStream = useRef(); //screen capture stream
    const [recordingStarted, setRecordingStarted] = useState(false);
    const [mediaR, setMediaR] = useState(null);
    const [isVideoMuted, setIsVideoMuted] = useState(false);
    const [isAudioMuted, setIsAudioMuted] = useState(false);

    const { roomId, userName } = route.params;
    // const { roomId } = route.params;
    console.log('stream we have from web', webcamStream.current);

    useEffect(() => {
        // socketRef.current = io("https://2a11-2405-201-200c-de2a-a445-437e-ec7f-f17b.ngrok.io");

        // let isFront = true;
        // mediaDevices.enumerateDevices().then((sourceInfos) => {
        //     let videoSourceId;
        //     for (let i = 0; i < sourceInfos.length; i++) {
        //         const sourceInfo = sourceInfos[i];
        //         if (
        //             sourceInfo.kind == "videoinput" &&
        //             sourceInfo.facing == (isFront ? "front" : "environment")
        //         ) {
        //             videoSourceId = sourceInfo.deviceId;
        //         }
        //     }
        //     mediaDevices
        //         .getUserMedia({
        //             audio: true,
        //             video: {
        //                 mandatory: {
        //                     minWidth: 500,
        //                     minHeight: 300,
        //                     minFrameRate: 30,
        //                 },
        //                 facingMode: isFront ? "user" : "environment",
        //                 optional: videoSourceId ? [{ sourceId: videoSourceId }] : [],
        //             },
        //         })
        connectToSocketAndWebcamStream()
                .then(() => {
                    // setMediaStreams(stream);
                    // console.log('stream local', stream);
                    // setLocalStream(stream)
                    socketRef.current.emit("join room", { userName: userName, roomID: roomId} );
                    socketRef.current.on("all users", users => {
                        // console.log('user list', users);
                        const peers = [];
                        users.forEach(userID => {
                            // console.log('userID', userID);
                            if(userID.userName !== userName){
                                const peer = createPeer(userID.socket, socketRef.current.id, webcamStream.current);
                                peer.userName = userName;
                                // console.log('create peer', peer);
                                // peer.userName = userID.userName
                                peersRef.current.push({
                                    peerID: userID.socket,
                                    peer,
                                    userName:userID.userName,   
                                })
                                peers.push({
                                    peerID: userID.socket,
                                    // userName: userID.userName,
                                    userName: userID.userName,
                                    peer
                                });
                            }
                            // console.log("peer...", peersRef)
                            // peers.push(peer);
                            // console.log('peers got the data', peer);
                        })
                        setPeers(peers);
                    })
                    socketRef.current.on("user joined", payload => {
                        const item = peersRef.current.find(p => p.peerID === payload.callerID);
                        // // console.log("user Joined...", payload)
                            let peer;
                            if(!item){
                            // peer.userName = userName;
                            // if(screenCaptureStream.current){
                            //     peer = addPeer(payload.signal, payload.callerID, screenCaptureStream.current);
                            //     peer.userName = userName;
                            // } else 
                            peer = addPeer(payload.signal, payload.callerID, webcamStream.current);
                                peer.userName = userName;
                                 peersRef.current.push({
                                    peerID: payload.callerID,
                                    peer,
                                    userName
                                })
                                const peerObj = {
                                    peer,
                                    peerID: payload.callerID,
                                    userName
                                };
    
    
                            setPeers(users => [...users, peerObj]);
                            }
                        // console.log('remote peer is...', peers.length)
                    });

                    socketRef.current.on("receiving returned signal", payload => {
                        // console.log("receiving returned signal...", payload)

                        const item = peersRef.current.find(p => p.peerID === payload.id);
                        item.peer.signal(payload.signal);
                        // console.log('peer items...', item.id);
                    });

                })

            //user left and server send its peerId to disconnect from that peer
            socketRef.current.on('userLeft', id => {
                const peerObj = peersRef.current.find(p => p.peerId === id);
                if (peerObj) peerObj.peer.destroy(); //cancel connection with disconnected peer
                const peers = peersRef.current.filter(p => p.peerId !== id);
                peersRef.current = peers;
                setPeers(peers);
            });

            

            // if (screenShare) {
            //     shareScreen()
            // }
            // return () => {
            //     socketRef.current.disconnect();
            // };

        return () => stopAllVideoAudioMedia()
        // })
    }, []);

    const connectToSocketAndWebcamStream = async () => {
        //connecting to server using socket
        socketRef.current = io.connect('https://bc7b-2405-201-200c-de2a-b5ce-f788-c230-2f31.ngrok.io');
        webcamStream.current = await getWebcamStream();
        setLocalStream(webcamStream.current);
        userStream.current = webcamStream.current;
        console.log('userstream', userStream.current);
        if (!webcamStream.current.getAudioTracks()[0].enabled) webcamStream.current.getAudioTracks()[0].enabled = true;
    }

    //taking video(webcam) and audio of device
    const getWebcamStream = async () => {
        const isFrontCamera = true;
        const devices = await mediaDevices.enumerateDevices();

        const facing = isFrontCamera ? 'front' : 'environment';
        const videoSourceId = devices.find(
            (device) => device.kind === 'videoinput' && device.facing === facing,
        );
        const facingMode = isFrontCamera ? 'user' : 'environment';
        const constraints = {
            audio: true,
            video: {
                mandatory: {
                    minWidth: 1280,
                    minHeight: 720,
                    minFrameRate: 30,
                },
                facingMode,
                optional: videoSourceId ? [{ sourceId: videoSourceId }] : [],
            },
        };
        
        const newStream = await mediaDevices.getUserMedia(constraints);
        // webcamStream.current = newStream;
        return newStream;    
    }
    
    function hideCam() {


        const videoTrack = localStream.getTracks().find(track => track.kind === 'video');
        if (videoTrack.enabled) {
            videoTrack.enabled = false;
            setVideoToggle(true)
        } else {
            setVideoToggle(false)
            videoTrack.enabled = true;
        }
        // const videoTrack = localStream.getTracks().filter(track => track.kind === 'video')
        // videoTrack[0].enabled = !videoTrack[0].enabled
        // setCameraToggle(videoTrack[0].enabled)
    }

    function createPeer(userToSignal, callerID, stream) {
        const peer = new RNSimplePeer({
            initiator: true,
            trickle: false,
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
            socketRef.current.emit("sending signal", { userToSignal, callerID, signal })
            // console.log('peer signalling...', { userToSignal, callerID, signal });
        })


        return peer;

    }

    function addPeer(incomingSignal, callerID, stream) {
        const peer = new RNSimplePeer({
            initiator: false,
            trickle: false,
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
            socketRef.current.emit("returning signal", { signal, callerID })
        })

        // peer.on("stream", stream => {
        //     setRemoteStream(stream)
        // });

        peer.signal(incomingSignal);

        return peer;
    }

    //Stopping webcam and screen media and audio also
    const stopAllVideoAudioMedia = async () => {
        //destroying previous stream(webcam stream)
        console.log('stream got', webcamStream.current);
        const previousWebcamStream = webcamStream.current;
        const previousWebcamStreamTracks = previousWebcamStream.getTracks();
        previousWebcamStreamTracks.forEach(track => {
            track.stop();
        });

        //destroying previous stream(screen capture stream)
        const previousScreenCaptureStream = screenCaptureStream.current;
        if (previousScreenCaptureStream) {
            const previousScreenCaptureStreamTracks = previousScreenCaptureStream.getTracks();
            previousScreenCaptureStreamTracks.forEach(track => {
                track.stop();
            });
        }
    }

    const clickScreenSharing = async () => {
        if (!screenShare) {
            const isFrontCamera = true;
            const devices = await mediaDevices.enumerateDevices();

            const facing = isFrontCamera ? 'front' : 'environment';
            const videoSourceId = devices.find(
                (device) => device.kind === 'videoinput' && device.facing === facing,
            );
            const facingMode = isFrontCamera ? 'user' : 'environment';
            const constraints = {
                cursor: true,
                // audio: true,
                video: {
                    mandatory: {
                        minWidth: 1280,
                        minHeight: 720,
                        minFrameRate: 30,
                    },
                    facingMode,
                    optional: videoSourceId ? [{ sourceId: videoSourceId }] : [],
                },
            };
            await mediaDevices
                .getDisplayMedia(constraints)
                .then((stream) => {
                    const screenTrack = stream.getTracks()[0];
                    peers.map(peer => {
                        // replaceTrack (oldTrack, newTrack, oldStream);
                        peer.peer.replaceTrack(
                            peer.peer.streams[0]
                                .getTracks()
                                .find((track) => track.kind === 'video'),
                            screenTrack,
                            userStream.current
                            // peer.streams[0].getVideoTracks()[0],
                            // stream,
                            // peer.streams[0]
                        );
                    });

                    // Listen click end
                    screenTrack.onended = () => {
                        peers.map( peer => {
                            peer.peer.replaceTrack(
                                screenTrack,
                                peer.peer.streams[0]
                                    .getTracks()
                                    .find((track) => track.kind === 'video'),
                                userStream.current
                            );
                        });
                        setLocalStream(userStream.current);
                        webcamStream.current = userStream.current
                        setScreenShare(false);
                    };

                    setLocalStream(stream)
                    webcamStream.current = stream
                    screenTrackRef.current = screenTrack;
                    setScreenShare(true);
                });
        } else {
            screenTrackRef.current.onended();
        }
    };

    const handleRecording = async () => {
        try {
                setRecordingStarted(true)
                let mediaRecorder = new MediaRecorder(localStream);

                let chunks = [];

                mediaRecorder.ondataavailable = function (ev) {
                    console.log({ ev })
                    chunks.push(ev.data)
                }
                mediaRecorder.onstop = (ev) => {
                    // window.clearTimeout(timoutStop);
                    var blob = new Blob(recordedBlobs, { type: 'video/webm' });
                    var url = window.URL.createObjectURL(blob);
                    console.log('');
                    // var a = document.createElement('a');
                    // a.style.display = 'none';
                    // a.href = url;
                    // a.download = 'test.webm';
                    // document.body.appendChild(a);
                    // a.click();
                    setTimeout(function () {
                        window.URL.revokeObjectURL(url);
                    }, 100);

                }

                mediaRecorder.start();
                setMediaR(mediaRecorder)

        } catch (err) {
            console.error("Error: " + err);
        }
    }


    const stopRecording = async () => {
        let currentRecorder = mediaR;
        if (currentRecorder.state != "inactive") {
            await currentRecorder.stop();
        }
    }

    function switchCamera() {
        if (localStream) {
            // @ts-ignore
            localStream.getVideoTracks().forEach((track) => track._switchCamera());
        }
    }

    const toggleMute = () => {
        if (localStream)
            localStream.getAudioTracks().forEach((track) => {
                track.enabled = !track.enabled;
                setIsMuted(!track.enabled);
            });
    };

    const goToBack = (e) => {
        e.preventDefault();
        socket.emit('BE-leave-room', { roomId, leaver: currentUser });
        sessionStorage.removeItem('user');
        window.location.href = '/';
    };


    async function shareScreen() {
    
        if (!screenShare) {
            const isFrontCamera = true;
            const devices = await mediaDevices.enumerateDevices();

            const facing = isFrontCamera ? 'front' : 'environment';
            const videoSourceId = devices.find(
                (device) => device.kind === 'videoinput' && device.facing === facing,
            );
            const facingMode = isFrontCamera ? 'user' : 'environment';
            const constraints = {
                cursor: true,
                // audio: true,
                video: {
                    mandatory: {
                        minWidth: 1280,
                        minHeight: 720,
                        minFrameRate: 30,
                    },
                    facingMode,
                    optional: videoSourceId ? [{ sourceId: videoSourceId }] : [],
                },
            };
            mediaDevices
                .getDisplayMedia(constraints).then(stream => {
                    screenCaptureStream.current = stream;
                    const screenTrack = stream.getTracks()[0];
                    peers.map(peer  => {
                        // replaceTrack (oldTrack, newTrack, oldStream);
                        peer.peer.replaceTrack(
                            peer.peer.streams[0].getTracks().find((track) => track.kind === 'video'),
                            screenTrack,
                            peer.peer.streams[0]
                        )

                    })
                    // console.log('after sharing', peersRef.current);

                    screenTrack.onended = async () => {
                        peers.map( peer  => {
                             // replaceTrack (oldTrack, newTrack, oldStream);
                            // peer.peer.replaceTrack(
                            //     screenTrack,
                            //     peer.peer.streams[0].getTracks().find((track) => track.kind === 'video'),
                            //     peer.peer.streams[0]
                            // );

                            peer.peer.replaceTrack(
                                screenTrack,
                                peer.peer.streams[0].getTracks().find((track) => track.kind === 'video'),
                                peer.peer.streams[0]
                            );
                        });
                        screenCaptureStream.current = null
                        const newWebcamStream = await getWebcamStream();
                        webcamStream.current = newWebcamStream;
                        setLocalStream(newWebcamStream);
                        setScreenShare(false);
                    }

                    setLocalStream(stream);
                    webcamStream.current = stream;

                    screenTrackRef.current = screenTrack;
                    setScreenShare(true)
                }).catch(error => {
                    'unable to get media', error
                })
            // })
        } else {
            screenTrackRef.current.onended();
        }
        // if (!screenShare) {
        //     const isFrontCamera = true;
        //     const devices = await mediaDevices.enumerateDevices();

        //     const facing = isFrontCamera ? 'front' : 'environment';
        //     const videoSourceId = devices.find(
        //         (device) => device.kind === 'videoinput' && device.facing === facing,
        //     );
        //     const facingMode = isFrontCamera ? 'user' : 'environment';
        //     const constraints = {
        //         audio: true,
        //         video: {
        //             mandatory: {
        //                 minWidth: 1280,
        //                 minHeight: 720,
        //                 minFrameRate: 30,
        //             },
        //             facingMode,
        //             optional: videoSourceId ? [{ sourceId: videoSourceId }] : [],
        //         },
        //     };
        //     mediaDevices
        //         .getDisplayMedia(constraints).then(stream => {
        //             screenCaptureStream.current = stream;
        //             const screenCaptureVideoStreamTrack = screenCaptureStream.current.getVideoTracks()[0];

        //             peers.map(peer => (
        //                 peer.peer.replaceTrack(
        //                     peer.peer.streams[0].getVideoTracks()[0],
        //                     screenCaptureVideoStreamTrack,
        //                     peer.peer.streams[0]
        //                 )
        //             ))
        //             // console.log('after sharing', peersRef.current);

        //             screenCaptureVideoStreamTrack.onended = () => {
        //                 startWebCamVideo();
        //                 setLocalStream(localStream);
        //                 setScreenShare(false);
        //             }

        //             setLocalStream(screenCaptureStream.current);
        //             // screenTrackRef.current = screenTrack;
        //             setScreenShare(true)
        //         }).catch(error => {
        //             'unable to get media', error
        //         })
        //     // })
        // } else {
        //     screenCaptureStream.current.onended();
        // }


        // if(!screenShare){

        //     mediaDevices.getDisplayMedia().then(stream => {
        //         const track = stream.getTracks()[0];
        //         peersRef.current.removeStream(videoRef.current);
        //         peersRef.current.addStream(stream);
        //         setLocalStream(stream);
        //         setScreenShare(true)
        //         track.onended = function () {
        //             setLocalStream(videoRef.current);
        //             peersRef.current.removeTrack(track, stream);
        //             setScreenShare(false)
        //         };
        //     });
        // }



    }

    const startWebCamVideo = async () => {
        // await stopAllVideoAudioMedia();

        const newWebcamStream = await getWebcamStream(); //getting webcam video and audio
        const videoStreamTrack = newWebcamStream.getVideoTracks()[0]; //taking video track of stream
        const audioStreamTrack = newWebcamStream.getAudioTracks()[0]; //taking audio track of stream
        //replacing all video track of all peer connected to this peer
        peers.map(peer => {
            //replacing video track
            peer.peer.replaceTrack(
                peer.peer.streams[0].getVideoTracks()[0],
                videoStreamTrack,
                peer.peer.streams[0]
            );
            //replacing audio track
            peer.peer.replaceTrack(
                peer.peer.streams[0].getAudioTracks()[0],
                audioStreamTrack,
                peer.peer.streams[0]
            );
        });
        setLocalStream(newWebcamStream);
        webcamStream.current = newWebcamStream;
        screenCaptureStream.current = null;
    }

    peers.map(peer => console.log('peerid', peer.userName))
    return (
        <>
            <View style={{ flex: 1, justifyContent: "flex-start", padding: 10 }}>
                <View
                    style={{
                        flex: 1,
                        justifyContent: "center",
                        alignItems: "center",
                        height: height * 0.5,
                        borderColor: "white",
                        borderWidth: 4,
                        marginBottom: 20
                    }}
                >
                    <RTCView
                        // objectFit="cover"           
                        // ref={videoRef}
                        mirror={true}
                        streamURL={localStream ? localStream.toURL() : 'sharing started'}
                        // streamURL={videoRef.current.toURL()}
                        style={{ width, height: height * 0.4 }}
                    />
                    {/* {!videoToggle ?
                        <RTCView
                            // objectFit="cover"           
                            // ref={videoRef}
                            mirror={true}
                            streamURL={localStream ? localStream.toURL() : ''}
                            // streamURL={videoRef.current.toURL()}
                            style={{ width, height: height * 0.4 }}
                        />
                        :
                        <RTCView
                            mirror={true}
                            streamURL={null}
                            style={{ width, height: height * 0.4 }}
                        />
                    } */}
                    <Text>{userName}</Text>
                    {/* {mediaStreams &&
                        <RTCView
                            mirror={true}
                            // objectFit="cover"           
                            // ref={videoRef}
                            streamURL={mediaStreams ? mediaStreams.toURL() : ''}
                            // streamURL={videoRef.current.toURL()}
                            style={{ width, height: height * 0.4 }}
                        />
                    } */}

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                        <TouchableOpacity
                            onPress={() => {
                                hideCam()
                            }}
                            style={{
                                borderRadius: 50, backgroundColor: `${videoToggle ? 'red' : 'black'}`, margin: 10, padding: 10, alignItems: 'center'
                            }}
                        >
                            <Text style={{ color: "white", fontSize: 22, textAlign: "center" }}>
                                {videoToggle ?
                                    <Feather name="video-off" size={24} color="white" />
                                    :
                                    <Feather name="video" size={24} color="white" />
                                }
                            </Text>

                        </TouchableOpacity>
                        {/* <Button
                            onPress={() => {
                                const videoTrack = localStream.getTracks().filter(track => track.kind === 'video')
                                videoTrack[0].enabled = !videoTrack[0].enabled
                                setCameraToggle(videoTrack[0].enabled)
                            }}
                            title={`camera ${camera && '(on)' || '(off)'}`}
                            color={`${camera && 'black' || 'red'}`}
                        /> */}
                        <TouchableOpacity
                            onPress={() => {
                                switchCamera()
                            }}
                            style={{
                                borderRadius: 50, backgroundColor: 'black', margin: 10, padding: 10, alignItems: 'center'
                            }}
                        >
                            <Text style={{ fontSize: 22, textAlign: "center" }}>

                                <Ionicons name="md-camera-reverse-outline" size={24} color="white" />
                            </Text>

                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                toggleMute()
                            }}
                            style={{
                                borderRadius: 50, backgroundColor: `${isMuted ? 'red' : 'black'}`, margin: 10, padding: 10, alignItems: 'center'
                            }}
                        >
                            <Text style={{ fontSize: 22, textAlign: "center" }} >
                                {isMuted ?
                                    <Ionicons name="ios-mic-off-outline" size={24} color="white" />
                                    : <Ionicons name="ios-mic-outline" size={24} color="white" />}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                clickScreenSharing()
                            }}
                            style={{
                                borderRadius: 50, backgroundColor: `${screenShare ? 'red' : 'black'}`, margin: 10, padding: 10, alignItems: 'center'
                            }}
                        >
                            {/* {screenShare ? <Text style={{ color: "white", fontSize: 22, textAlign: "center" }}>
                                ss
                            </Text>
                                : <Text style={{ color: "white", fontSize: 22, textAlign: "center" }}>
                                    ns
                                </Text>
                            } */}
                            <Text style={{ color: "white", fontSize: 22, textAlign: "center" }}>
                            {screenShare ? 
                                    <MaterialIcons name="screen-share" size={24} color="white" />
                                    :
                                    <MaterialIcons name="stop-screen-share" size={24} color="white" />
                            }
                            </Text>
                            

                        </TouchableOpacity>
                        {recordingStarted ? 
                            <TouchableOpacity
                                onPress={() => {
                                    stopRecording()
                                }}
                                style={{
                                    borderRadius: 50, backgroundColor:  'black', margin: 10, padding: 10, alignItems: 'center'
                                }}
                            >
                                <Text style={{ color: "white", fontSize: 22, textAlign: "center" }}>
                                    {/* {screenShare ?
                                        <MaterialIcons name="screen-share" size={24} color="white" />
                                        :
                                        <MaterialIcons name="stop-screen-share" size={24} color="white" />
                                    } */}
                                    dwn
                                </Text>


                            </TouchableOpacity> : 
                            <TouchableOpacity
                                onPress={() => {
                                    handleRecording()
                                }}
                                style={{
                                    borderRadius: 50, backgroundColor:  'black', margin: 10, padding: 10, alignItems: 'center'
                                }}
                            >
                                <Text style={{ color: "white", fontSize: 22, textAlign: "center" }}>
                                    {/* {screenShare ?
                                        <MaterialIcons name="screen-share" size={24} color="white" />
                                        :
                                        <MaterialIcons name="stop-screen-share" size={24} color="white" />
                                    } */}
                                    start
                                </Text>


                            </TouchableOpacity>

                        }
                    </View>
                </View>
                <View style={{ flex: 1, backgroundColor: "black" }}>
                    <ScrollView horizontal style={{ padding: 10 }}>
                        <>

                            <>
                                {/* <Text>{peersRef.current.peerID}</Text> */}
                                {peers.map((peer, index) => (
                                    <View
                                        key={index}
                                        style={{
                                            width: 280,
                                            backgroundColor: "#fff",
                                            borderWidth: 1,
                                            borderColor: "#fff",
                                            marginRight: 10,
                                            padding: 5,
                                        }}
                                    >
                                        <Text style={{ fontSize: 16 }}>{peer.userName}</Text>
                                        {/* <Text>{peer.id ? peer.id : '123'}</Text> */}
                                        <Video key={peer.peerID} peer={peer} style={{ width: 180, height: height * 0.4 }} />
                                        {/* <RTCView
                                                streamURL={stream.toURL()}
                                                style={{ width: 180, height: height * 0.4 }}
                                            /> */}
                                    </View>
                                ))}
                            </>
                        </>
                    </ScrollView>
                </View>
            </View>
        </>

    );
};

export default Room;

const styles = StyleSheet.create({
    videoContainer: {
        flex: 1,
        minHeight: 450,
        justifyContent: "space-between"
    },
    videos: {
        width: '100%',
        flex: 1,
        marginLeft: 10
        // position: 'relative',
        // overflow: 'hidden',

        // borderRadius: 6,
    },
    remotevideo: {
        width: '40%',
        // flex: 1,
        marginLeft: 10
        // position: 'relative',
        // overflow: 'hidden',

        // borderRadius: 6,
    },
    remoteVideos: {
        height: 100,
        marginTop: 20,
    },
    localVideo: {
        backgroundColor: '#f2f2f2',
        height: '40%',
        width: '40%',
    },
})

//extra

// function toggleVideoHandler() {
//     // if (videoToggle) {
//     //     startVideo()
//     // }
//     // else {
//     //     stopVideo()
//     // }
//     setVideoToggle(!videoToggle)
//     // if (videoToggle) {
//     //     setVideoToggle(true)
//     // }
//     // else {
//     //     localStream.getTracks().forEach((track) => {
//     //         track.stop();
//     //     });
//     //     setVideoToggle(false)
//     // }
// }

// function toggleVideo() {
//     // let enabled = localStream.getVideoTracks()[0].enabled;
//     // if (!videoToggle) {
//     //     // const stream = localStream.getVideoTracks()[0].enabled = false
//     //     // setLocalStream(stream)
//     //     // setVideoToggle(false)
//     //     const s = localStream.getTracks().forEach((track) => {
//     //         track.stop();
//     //     });
//     //     setLocalStream(s)

//     // }
//     // else {
//     //     // const stream = localStream.getVideoTracks()[0].enabled = true
//     //     // setLocalStream(stream)
//     //     // setVideoToggle(true)


//     // }
//     // setVideoToggle(!videoToggle)

//     if (videoToggle) {
//         return
//     }
//     else {

//     }
// }

// useEffect(() => {
//     initialize();
// }, [])


// peer.on("stream", stream => {
//     setRemoteStream(stream)
// });

// peer.on("stream", stream => {
//     console.log('remote stream...', stream);
//     if (remoteStream) {
//         setRemoteStream(stream)
//     }
// });

{/* <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: 150, marginTop: 10 }}>
                        <TouchableOpacity
                            onPress={() => {
                                videoToggle ? startVideo() : stopVideo()
                            }}
                            style={{
                                backgroundColor: 'black', margin: 10, padding: 10, alignItems: 'center'
                            }}
                        >
                            <Text style={{ color: "white", fontSize: 22, textAlign: "center" }}>
                                {videoToggle === true ?
                                    <Feather name="video" size={24} color="white" />
                                    :
                                    <Feather name="video-off" size={24} color="white" />
                                }

                            </Text>

                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                console.log("Called")
                            }}
                            style={{
                                backgroundColor: 'black', alignItems: 'center'
                            }}
                        >
                            <Text style={{ color: "white", padding: 10 }} >
                                Mute
                            </Text>
                        </TouchableOpacity>

                    </View> */}


    // console.log('user name is....', userName);

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

    // const newStream = mediaDevices.getUserMedia(constraints)

    // setLocalStream(newStream)

    // const startVideo = () => {
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
    //             }).then(stream => {
    //                 setLocalStream(stream)
    //                 setVideoToggle(true)
    //             })
    //     })
    // }

    // const stopVideo = () => {
    //     localStream.getTracks().forEach((track) => {
    //         track.stop();
    //     });
    //     setVideoToggle(false)
    // }

    
        // if (videoToggle) {
        //     setVideoToggle(false)
        //     // const stream = localStream.getTracks().forEach((track) => {
        //     //     track.stop();
        //     // });
        //     const stream = mediaStreams.getTracks().forEach(function (track) {
        //         if (track.readyState === "live" &&
        //             track.kind === "video") {
        //             track.enabled = false;
        //         }
        //     });
        //     console.log('video off', stream);

        //     setLocalStream(stream);
        // } else {
        //     setVideoToggle(true)
        //     const stream = mediaStreams.getTracks().forEach(function (track) {
        //         if (track.readyState === "live" &&
        //             track.kind === "video") {
        //             track.enabled = true;
        //         }
        //     });
        //     console.log('video on', stream);
        //     setLocalStream(stream)
        // }
        // let enabled = localStream.getVideoTracks()[0].enabled;
        // if (enabled) {
        //     localStream.getVideoTracks()[0].enabled = false;
        //     setVideoToggle(true)
        // } else {
        //     setVideoToggle(false)
        //     localStream.getVideoTracks()[0].enabled = true;
        // }

         // function handleCamToggle() {
    //     const videoTrack = localStream.getTracks().find(track => track.kind === 'video');
    //     if (videoTrack.enabled) {
    //         videoTrack.enabled = false;
    //         setVideoToggle('on')
    //     } else {
    //         videoTrack.enabled = true;
    //         setVideoToggle('off')

    //     }
    // }

    // function handleHideVideo() {
    //     if (e.target.innerHTML.includes('Hide')) {
    //         e.target.innerHTML = 'show remote cam';
    //         socket.emit('hide remote cam', e.target.getAttribute('user-id'));
    //     } else {
    //         e.target.innerHTML = `Hide user's cam`;
    //         socket.emit('show remote cam', e.target.getAttribute('user-id'));
    //     }
    // }

    // function hideCam() {
    //     const videoTrack = localStream.getTracks().find(track => track.kind === 'video');
    //     videoTrack.enabled = false;
    // }

    // function showCam() {
    //     const videoTrack = localStream.getTracks().find(track => track.kind === 'video');
    //     videoTrack.enabled = true;
    // }

    // const logs = peers.map(i => console.log(i));
    // console.log("final peer", peers.map(i => i));
    
    // console.l