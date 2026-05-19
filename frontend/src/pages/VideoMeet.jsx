import React, { useEffect, useRef, useState } from 'react';
import io from "socket.io-client";
import { Badge, IconButton, TextField, Button } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import CallEndIcon from '@mui/icons-material/CallEnd';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import server from '../environment';
import styles from "../styles/videoComponent.module.css";

const server_url = server;
let connections = {};

const peerConfigConnections = {
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" }
    ]
};

// Sub-component for individual participant videos to prevent React 19 flickering
function ParticipantVideo({ video, isLocal }) {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && video.stream) {
            console.log(`[VIDEO DEBUG] Attaching stream to video element for participant: ${video.socketId}`);
            videoRef.current.srcObject = video.stream;
            
            // Explicitly trigger play to bypass strict browser autoplay policies
            videoRef.current.play().catch(error => {
                console.warn(`[VIDEO WARNING] Browser blocked autoplay for participant ${video.socketId}:`, error);
            });
        }
    }, [video.stream, video.socketId]);

    return (
        <div className={`${styles.videoCard} ${isLocal ? styles.meetUserVideo : ""}`}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isLocal}
                data-socket={video.socketId}
            />
            <div className={styles.participantName}>
                {isLocal ? `${video.username || "You"} (You)` : (video.username || `Participant (${video.socketId.substring(0, 6)})`)}
            </div>
        </div>
    );
}

export default function VideoMeetComponent() {
    const socketRef = useRef(null);
    const socketIdRef = useRef(null);
    const localVideoref = useRef(null);
    const videoRef = useRef([]);
    const usernameMapRef = useRef({});

    // Media and permission states
    const [videoAvailable, setVideoAvailable] = useState(false);
    const [audioAvailable, setAudioAvailable] = useState(false);
    const [screenAvailable, setScreenAvailable] = useState(false);
    
    const [video, setVideo] = useState(true);
    const [audio, setAudio] = useState(true);
    const [screen, setScreen] = useState(false);
    const [localStream, setLocalStream] = useState(null);

    // Call and modal states
    const [showModal, setModal] = useState(false);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState("");
    const [newMessages, setNewMessages] = useState(0);
    const [askForUsername, setAskForUsername] = useState(true);
    const [username, setUsername] = useState("");
    const [videos, setVideos] = useState([]);

    // Run permission request ONCE on mount to avoid infinite loop
    useEffect(() => {
        getPermissions();

        // Comprehensive teardown on unmount
        return () => {
            handleCleanup();
        };
    }, []);

    // Dedicated hook to attach local stream to lobby video element, eliminating React DOM mounting race conditions
    useEffect(() => {
        if (askForUsername && videoAvailable && localVideoref.current && localStream) {
            console.log("[MEDIA DEBUG] Attaching local stream to lobby video element...");
            localVideoref.current.srcObject = localStream;
        }
    }, [videoAvailable, askForUsername, localStream]);

    // Full media track and socket cleanup
    const handleCleanup = () => {
        console.log("Cleaning up all tracks and connections...");
        
        // Stop all local media tracks
        if (window.localStream) {
            window.localStream.getTracks().forEach(track => {
                track.stop();
                console.log(`Track stopped: ${track.kind}`);
            });
            window.localStream = null;
        }
        setLocalStream(null);

        // Close peer connections
        Object.keys(connections).forEach(id => {
            if (connections[id]) {
                connections[id].close();
                delete connections[id];
            }
        });

        // Disconnect socket cleanly
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
    };

    // Consolidated single request for camera & mic permissions
    const getPermissions = async () => {
        try {
            console.log("Requesting combined audio/video permissions...");
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            
            setVideoAvailable(true);
            setAudioAvailable(true);
            window.localStream = stream;
            setLocalStream(stream);
            
            if (localVideoref.current) {
                localVideoref.current.srcObject = stream;
            }
        } catch (error) {
            console.warn("Could not request combined stream. Falling back to individual prompts...", error);
            
            // Fallback 1: Try audio only
            try {
                const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                setAudioAvailable(true);
                setVideoAvailable(false);
                window.localStream = audioStream;
                setLocalStream(audioStream);
                if (localVideoref.current) {
                    localVideoref.current.srcObject = audioStream;
                }
            } catch (audioError) {
                console.warn("Audio permission also failed. Trying video only...", audioError);
                
                // Fallback 2: Try video only
                try {
                    const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                    setVideoAvailable(true);
                    setAudioAvailable(false);
                    window.localStream = videoStream;
                    setLocalStream(videoStream);
                    if (localVideoref.current) {
                        localVideoref.current.srcObject = videoStream;
                    }
                } catch (videoError) {
                    console.error("All media device permissions denied or no hardware available.", videoError);
                    setVideoAvailable(false);
                    setAudioAvailable(false);
                }
            }
        }

        // Check screen sharing support
        if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
            setScreenAvailable(true);
        } else {
            setScreenAvailable(false);
        }
    };

    // Keep state and hardware tracks in sync when toggled
    useEffect(() => {
        if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = video;
            }
        }
    }, [video, localStream]);

    useEffect(() => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = audio;
            }
        }
    }, [audio, localStream]);

    // Handle screen share toggles
    useEffect(() => {
        if (screen !== undefined && screen !== false) {
            getDisplayMedia();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [screen]);

    const getDisplayMedia = () => {
        if (navigator.mediaDevices.getDisplayMedia) {
            navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                .then(getDisplayMediaSuccess)
                .catch((e) => {
                    console.error("Display media acquisition failed", e);
                    setScreen(false);
                });
        }
    };

    const getDisplayMediaSuccess = (stream) => {
        console.log("Screen sharing started successfully");
        
        // Stop current camera tracks
        if (window.localStream) {
            window.localStream.getTracks().forEach(track => track.stop());
        }

        window.localStream = stream;
        setLocalStream(stream);
        if (localVideoref.current) {
            localVideoref.current.srcObject = stream;
        }

        // Update tracks for all peer connections
        Object.keys(connections).forEach(id => {
            if (id === socketIdRef.current) return;
            
            const senders = connections[id].getSenders();
            const videoTrack = stream.getVideoTracks()[0];
            const audioTrack = stream.getAudioTracks()[0];

            if (videoTrack) {
                const videoSender = senders.find(sender => sender.track && sender.track.kind === "video");
                if (videoSender) {
                    videoSender.replaceTrack(videoTrack);
                } else {
                    connections[id].addTrack(videoTrack, stream);
                }
            }
            if (audioTrack) {
                const audioSender = senders.find(sender => sender.track && sender.track.kind === "audio");
                if (audioSender) {
                    audioSender.replaceTrack(audioTrack);
                } else {
                    connections[id].addTrack(audioTrack, stream);
                }
            }
        });

        // Trigger rollback when user clicks native browser "Stop Sharing" button
        stream.getVideoTracks()[0].onended = () => {
            setScreen(false);
            console.log("Screen share stopped via browser control");
            revertToCameraStream();
        };
    };

    const revertToCameraStream = async () => {
        try {
            if (window.localStream) {
                window.localStream.getTracks().forEach(track => track.stop());
            }

            const cameraStream = await navigator.mediaDevices.getUserMedia({ video: video, audio: audio });
            window.localStream = cameraStream;
            setLocalStream(cameraStream);
            if (localVideoref.current) {
                localVideoref.current.srcObject = cameraStream;
            }

            Object.keys(connections).forEach(id => {
                if (id === socketIdRef.current) return;
                const senders = connections[id].getSenders();
                const videoTrack = cameraStream.getVideoTracks()[0];
                const audioTrack = cameraStream.getAudioTracks()[0];

                if (videoTrack) {
                    const videoSender = senders.find(sender => sender.track && sender.track.kind === "video");
                    if (videoSender) videoSender.replaceTrack(videoTrack);
                }
                if (audioTrack) {
                    const audioSender = senders.find(sender => sender.track && sender.track.kind === "audio");
                    if (audioSender) audioSender.replaceTrack(audioTrack);
                }
            });
        } catch (e) {
            console.error("Failed to revert to camera stream", e);
        }
    };

    const gotMessageFromServer = (fromId, message) => {
        var signal = JSON.parse(message);
        console.log("OFFER RECEIVED:", { fromId, signal });

        if (fromId !== socketIdRef.current) {
            // Dynamically register the signaling peer's display name if provided
            if (signal.senderUsername) {
                usernameMapRef.current[fromId] = signal.senderUsername;
                console.log(`[WEBRTC DEBUG] Dynamically mapped signaling username for ${fromId}: ${signal.senderUsername}`);
                
                // Keep react state array updated
                setVideos((prevVideos) => 
                    prevVideos.map(video => 
                        video.socketId === fromId ? { ...video, username: signal.senderUsername } : video
                    )
                );
            }

            // Defensive Peer Connection initialization to prevent race conditions from out-of-order signaling packets
            if (!connections[fromId]) {
                console.warn(`[WEBRTC WARNING] RTCPeerConnection not initialized for ${fromId} yet. Creating dynamically on-the-fly...`);
                connections[fromId] = new RTCPeerConnection(peerConfigConnections);

                connections[fromId].onicecandidate = function (event) {
                    if (event.candidate != null && socketRef.current) {
                        socketRef.current.emit('signal', fromId, JSON.stringify({ 'ice': event.candidate }));
                    }
                };

                if (localStream) {
                    localStream.getTracks().forEach(track => {
                        connections[fromId].addTrack(track, localStream);
                        console.log(`[WEBRTC DEBUG] Local track added on-the-fly to peer ${fromId}: ${track.kind}`);
                    });
                }

                connections[fromId].ontrack = (event) => {
                    const remoteStream = event.streams[0];
                    console.log(`[WEBRTC DEBUG] Remote track successfully received on-the-fly from: ${fromId}`);
                    updateParticipantVideoList(fromId, remoteStream);
                };

                connections[fromId].onaddstream = (event) => {
                    updateParticipantVideoList(fromId, event.stream);
                };
            }

            if (signal.sdp) {
                console.log(`[WEBRTC DEBUG] Processing SDP ${signal.sdp.type} signal from ${fromId}`);
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (signal.sdp.type === 'offer') {
                        connections[fromId].createAnswer().then((description) => {
                            connections[fromId].setLocalDescription(description).then(() => {
                                socketRef.current.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }));
                            }).catch(e => console.error(e));
                        }).catch(e => console.error(e));
                    }
                }).catch(e => console.error(e));
            }

            if (signal.ice) {
                console.log(`[WEBRTC DEBUG] Processing ICE candidate from ${fromId}`);
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => {
                    console.warn(`[WEBRTC WARNING] Failed to add ICE candidate from ${fromId}. Description might not be set yet:`, e);
                });
            }
        }
    };

    const connectToSocketServer = () => {
        // Automatically check if server runs over secure SSL (https/wss) to support local http connections
        const isSecure = server_url.startsWith("https");
        console.log(`[SOCKET DEBUG] Connecting to server: ${server_url} (Secure: ${isSecure})`);
        
        socketRef.current = io.connect(server_url, { 
            secure: isSecure, 
            rejectUnauthorized: !isSecure 
        });

        socketRef.current.on('signal', gotMessageFromServer);

        socketRef.current.on('connect', () => {
            console.log("Socket connected, joining call room...");
            
            // Resolve the actual meeting room code from the URL path instead of passing the entire domain
            const meetingCode = window.location.pathname.split("/").filter(Boolean).pop() || "default-room";
            console.log(`[SOCKET DEBUG] Joining call room with clean meeting code: ${meetingCode}`);
            
            console.log("JOIN ROOM EMIT:", { roomId: meetingCode, userName: username });
            socketRef.current.emit('join-room', {
                roomId: meetingCode,
                userName: username
            });
            socketIdRef.current = socketRef.current.id;

            socketRef.current.on('chat-message', addMessage);

            socketRef.current.on('user-left', (id) => {
                console.log(`User left call: ${id}`);
                setVideos((videos) => videos.filter((video) => video.socketId !== id));
                if (connections[id]) {
                    connections[id].close();
                    delete connections[id];
                }
            });

            socketRef.current.on('user-joined', (id, clients) => {
                console.log("USER JOINED EVENT:", { socketId: id, clients });
                console.log("EXISTING USERS:", clients);
                console.log(`User joined: ${id}, active clients count: ${clients.length}`);
                
                // Track username metadata using the ref dictionary
                clients.forEach((client) => {
                    const socketId = typeof client === 'string' ? client : client.socketId;
                    const name = typeof client === 'string' ? `Participant (${socketId.substring(0, 6)})` : client.username;
                    
                    usernameMapRef.current[socketId] = name;
                });

                // Dynamically sync all active video tiles with their new resolved usernames to trigger a React re-render
                setVideos((prevVideos) => 
                    prevVideos.map(video => ({
                        ...video,
                        username: usernameMapRef.current[video.socketId] || video.username
                    }))
                );

                clients.forEach((client) => {
                    const socketListId = typeof client === 'string' ? client : client.socketId;
                    
                    if (connections[socketListId] || socketListId === socketIdRef.current) return; // Avoid self and duplicate connections

                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections);

                    // Candidate gathering
                    connections[socketListId].onicecandidate = function (event) {
                        if (event.candidate != null && socketRef.current) {
                            socketRef.current.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }));
                        }
                    };

                    // Robust track addition using standard addTrack API
                    if (localStream) {
                        localStream.getTracks().forEach(track => {
                            connections[socketListId].addTrack(track, localStream);
                        });
                    }

                    // Listen to incoming track additions (Both stream and modern track bindings supported)
                    connections[socketListId].ontrack = (event) => {
                        const remoteStream = event.streams[0];
                        updateParticipantVideoList(socketListId, remoteStream);
                    };

                    connections[socketListId].onaddstream = (event) => {
                        updateParticipantVideoList(socketListId, event.stream);
                    };
                });

                // Generate signaling offer if we are the new participant joining
                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue;

                        connections[id2].createOffer().then((description) => {
                            connections[id2].setLocalDescription(description)
                                .then(() => {
                                    if (socketRef.current) {
                                        socketRef.current.emit('signal', id2, JSON.stringify({ 'sdp': connections[id2].localDescription }));
                                    }
                                })
                                .catch(e => console.error(e));
                        });
                    }
                }
            });
        });
    };

    const updateParticipantVideoList = (socketListId, stream) => {
        const participantName = usernameMapRef.current[socketListId] || `Participant (${socketListId.substring(0, 6)})`;
        console.log("ADDING PARTICIPANT:", { socketId: socketListId, username: participantName });

        setVideos((prevVideos) => {
            const videoExists = prevVideos.some(video => video.socketId === socketListId);

            let updatedVideos;
            if (videoExists) {
                console.log(`[UI DEBUG] Updating existing remote stream for participant: ${socketListId}`);
                updatedVideos = prevVideos.map(video =>
                    video.socketId === socketListId ? { ...video, stream, username: participantName } : video
                );
            } else {
                console.log(`[UI DEBUG] Creating unique remote stream tile for participant: ${socketListId}`);
                const newVideo = {
                    socketId: socketListId,
                    stream: stream,
                    autoplay: true,
                    playsinline: true,
                    username: participantName
                };
                updatedVideos = [...prevVideos, newVideo];
            }

            // Sync the ref with the latest state representation
            videoRef.current = updatedVideos;
            return updatedVideos;
        });
    };

    const handleVideo = () => {
        setVideo(!video);
    };

    const handleAudio = () => {
        setAudio(!audio);
    };

    const handleScreen = () => {
        setScreen(!screen);
    };

    const handleEndCall = () => {
        handleCleanup();
        window.location.href = "/home";
    };

    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender: sender, data: data, socketId: socketIdSender }
        ]);
        
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prevNewMessages) => prevNewMessages + 1);
        }
    };

    const sendMessage = () => {
        if (message.trim() === "" || !socketRef.current) return;
        socketRef.current.emit('chat-message', message, username);
        setMessage("");
    };

    const connect = () => {
        if (username.trim() === "") return;
        console.log("INPUT USERNAME:", username);
        setAskForUsername(false);
        setVideo(videoAvailable);
        setAudio(audioAvailable);
        connectToSocketServer();
    };

    return (
        <div className={styles.meetVideoContainer}>
            {askForUsername === true ? (
                <div className={styles.lobbyContainer}>
                    <div className={styles.lobbyCard}>
                        <h2 className={styles.lobbyTitle}>Join Lobby</h2>
                        
                        <div className={styles.lobbyVideoContainer}>
                            {videoAvailable ? (
                                <video className={styles.lobbyVideo} ref={localVideoref} autoPlay muted></video>
                            ) : (
                                <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', background: '#111', color: '#666' }}>
                                    No Camera Feed Available
                                </div>
                            )}
                        </div>

                        <div className={styles.lobbyInputGroup}>
                            <TextField 
                                fullWidth
                                label="Enter Display Name" 
                                value={username} 
                                onChange={e => setUsername(e.target.value)} 
                                variant="outlined" 
                                slotProps={{
                                    input: { style: { color: 'white' } }
                                }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                                        '&:hover fieldset': { borderColor: '#ff9839' },
                                        '&.Mui-focused fieldset': { borderColor: '#ff9839' },
                                    },
                                    '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.5)' },
                                    '& .MuiInputLabel-root.Mui-focused': { color: '#ff9839' },
                                }}
                            />
                            <Button 
                                fullWidth
                                size="large"
                                variant="contained" 
                                onClick={connect}
                                sx={{
                                    background: '#ff9839',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    borderRadius: '12px',
                                    padding: '12px',
                                    '&:hover': { background: '#e0822b' }
                                }}
                            >
                                Connect & Start Call
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className={styles.mainCallArea}>
                    {/* Participant Grid */}
                    <div className={styles.conferenceView}>
                        {/* Render Local Self Preview Video */}
                        {localStream && (
                            <ParticipantVideo 
                                isLocal={true}
                                video={{ socketId: "local", stream: localStream, username: username }} 
                            />
                        )}

                        {/* Render Remote Participants */}
                        {videos.map((videoData) => (
                            <ParticipantVideo 
                                key={videoData.socketId}
                                isLocal={false}
                                video={videoData} 
                            />
                        ))}
                    </div>

                    {/* Chat Modal Drawer */}
                    {showModal && (
                        <div className={styles.chatRoom}>
                            <div className={styles.chatHeader}>
                                <h3>Meeting Chat</h3>
                                <IconButton onClick={() => { setModal(false); setNewMessages(0); }} style={{ color: 'white' }}>
                                    <CloseIcon />
                                </IconButton>
                            </div>

                            <div className={styles.chattingDisplay}>
                                {messages.length !== 0 ? messages.map((item, index) => (
                                    <div 
                                        key={index} 
                                        className={`${styles.chatMessage} ${item.socketId === socketIdRef.current ? styles.messageSelf : styles.messageOther}`}
                                    >
                                        <span className={styles.messageSender}>
                                            {item.socketId === socketIdRef.current ? "You" : item.sender}
                                        </span>
                                        <div className={styles.messageBubble}>
                                            <p style={{ margin: 0 }}>{item.data}</p>
                                        </div>
                                    </div>
                                )) : (
                                    <p className={styles.noMessages}>No messages in this chat yet.</p>
                                )}
                            </div>

                            <div className={styles.chattingArea}>
                                <TextField 
                                    fullWidth
                                    size="small"
                                    value={message} 
                                    onChange={(e) => setMessage(e.target.value)} 
                                    placeholder="Type a message..." 
                                    variant="outlined" 
                                    onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
                                    slotProps={{
                                        input: { style: { color: 'white' } }
                                    }}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                                            '&:hover fieldset': { borderColor: '#ff9839' },
                                            '&.Mui-focused fieldset': { borderColor: '#ff9839' },
                                        }
                                    }}
                                />
                                <IconButton onClick={sendMessage} sx={{ color: '#ff9839', background: 'rgba(255,152,57,0.1)' }}>
                                    <SendIcon />
                                </IconButton>
                            </div>
                        </div>
                    )}

                    {/* Sleek Floating Control Panel */}
                    <div className={styles.buttonContainers}>
                        <IconButton 
                            onClick={handleVideo} 
                            className={styles.controlButton} 
                            style={{ color: video ? '#ffffff' : '#f44336', background: video ? 'transparent' : 'rgba(244,67,54,0.15)' }}
                        >
                            {video ? <VideocamIcon /> : <VideocamOffIcon />}
                        </IconButton>
                        
                        <IconButton 
                            onClick={handleAudio} 
                            className={styles.controlButton}
                            style={{ color: audio ? '#ffffff' : '#f44336', background: audio ? 'transparent' : 'rgba(244,67,54,0.15)' }}
                        >
                            {audio ? <MicIcon /> : <MicOffIcon />}
                        </IconButton>

                        {screenAvailable && (
                            <IconButton 
                                onClick={handleScreen} 
                                className={styles.controlButton}
                                style={{ color: screen ? '#ff9839' : '#ffffff', background: screen ? 'rgba(255,152,57,0.15)' : 'transparent' }}
                            >
                                {screen ? <StopScreenShareIcon /> : <ScreenShareIcon />}
                            </IconButton>
                        )}

                        <Badge badgeContent={newMessages} color="warning">
                            <IconButton 
                                onClick={() => { setModal(!showModal); if (!showModal) setNewMessages(0); }} 
                                className={styles.controlButton}
                                style={{ color: showModal ? '#ff9839' : '#ffffff', background: showModal ? 'rgba(255,152,57,0.15)' : 'transparent' }}
                            >
                                <ChatIcon />
                            </IconButton>
                        </Badge>

                        <IconButton onClick={handleEndCall} className={`${styles.controlButton} ${styles.endCallButton}`}>
                            <CallEndIcon />
                        </IconButton>
                    </div>
                </div>
            )}
        </div>
    );
}