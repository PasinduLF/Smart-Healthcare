import React, { useEffect, useRef, useState } from 'react';
import { Video, VideoOff, Mic, MicOff, PhoneOff } from 'lucide-react';
import { io } from 'socket.io-client';

export default function VideoCall({ channelName, onEndCall }) {
    const localVideoRef = useRef(null);
    const socketRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [hasVideo, setHasVideo] = useState(true);
    const [hasAudio, setHasAudio] = useState(true);
    const [error, setError] = useState('');
    
    // Chat states
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');

    useEffect(() => {
        let isMounted = true;
        const initLocalVideo = async () => {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                if (isMounted) {
                    setStream(mediaStream);
                    if (localVideoRef.current) {
                        localVideoRef.current.srcObject = mediaStream;
                    }
                }
            } catch (err) {
                console.error("Error accessing media devices.", err);
                if (isMounted) setError('Camera/Microphone access denied or unavailable.');
            }
        };

        initLocalVideo();

        // Socket.IO Init
        socketRef.current = io('http://localhost:3004');
        socketRef.current.emit('join-room', channelName);

        socketRef.current.on('receive-message', (data) => {
            setMessages((prev) => [...prev, data]);
        });

        return () => {
            isMounted = false;
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [channelName]);

    const toggleVideo = () => {
        if (stream) {
            stream.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setHasVideo(!hasVideo);
        }
    };

    const toggleAudio = () => {
        if (stream) {
            stream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setHasAudio(!hasAudio);
        }
    };

    const handleEndCall = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        if (onEndCall) onEndCall();
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        const msgData = {
            roomId: channelName,
            text: newMessage,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            socketId: socketRef.current.id
        };
        socketRef.current.emit('send-message', msgData);
        setNewMessage('');
    };

    return (
        <div className="flex w-full h-[500px] bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
            {/* Left side: Video Call Area */}
            <div className="relative flex-1 flex items-center justify-center bg-gray-900">
                {error ? (
                    <div className="text-white text-center">
                        <p className="text-xl mb-2">Could not start video call.</p>
                        <p className="text-gray-400">{error}</p>
                    </div>
                ) : (
                    <>
                        {/* Remote Video Mock */}
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                            <div className="text-center text-gray-400">
                                <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <p>Waiting for other participant to join channel: <span className="text-white font-bold">{channelName}</span></p>
                            </div>
                        </div>

                        {/* Local Video Stream */}
                        <div className="absolute bottom-6 right-6 w-48 h-36 bg-gray-950 rounded-xl overflow-hidden border-2 border-gray-700 shadow-2xl z-10">
                            <video 
                                ref={localVideoRef} 
                                autoPlay 
                                playsInline 
                                muted 
                                className={`w-full h-full object-cover ${hasVideo ? '' : 'hidden'}`} 
                            />
                            {!hasVideo && (
                                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                    <VideoOff className="w-8 h-8 text-gray-500" />
                                </div>
                            )}
                        </div>

                        {/* Controls */}
                        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-4 bg-gray-900/80 backdrop-blur-md px-6 py-3 rounded-full border border-gray-700 z-10">
                            <button onClick={toggleAudio} className={`p-4 rounded-full transition outline-none ${hasAudio ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-coral-400 hover:bg-coral-500 text-white'}`}>
                                {hasAudio ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                            </button>
                            <button onClick={toggleVideo} className={`p-4 rounded-full transition outline-none ${hasVideo ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-coral-400 hover:bg-coral-500 text-white'}`}>
                                {hasVideo ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                            </button>
                            <button onClick={handleEndCall} className="p-4 rounded-full bg-coral-500 hover:bg-coral-600 text-white transition outline-none">
                                <PhoneOff className="w-6 h-6" />
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Right side: Chat Overlay */}
            <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
                <div className="p-4 border-b border-gray-700 bg-gray-900 font-medium text-white shadow z-10">
                    Live Chat
                </div>
                <div className="flex-1 p-4 overflow-y-auto space-y-3 flex flex-col">
                    {messages.map((msg, idx) => {
                        const isMe = msg.socketId === socketRef.current?.id;
                        return (
                            <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                <span className="text-[10px] text-gray-400 mb-1">{msg.time} {isMe ? '(You)' : ''}</span>
                                <div className={`px-4 py-2 rounded-xl text-sm max-w-[90%] break-words ${isMe ? 'bg-brand-500 text-white rounded-br-none' : 'bg-gray-700 text-gray-100 rounded-bl-none'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <form onSubmit={sendMessage} className="p-4 border-t border-gray-700 bg-gray-900 flex gap-2">
                    <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type message..." className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:ring-2 focus:ring-brand-500 outline-none text-sm placeholder-gray-500" />
                    <button type="submit" className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm font-medium hover:bg-brand-600 transition outline-none">Send</button>
                </form>
            </div>
        </div>
    );
}
