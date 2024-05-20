import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import socket from '../../helpers/socket';

const IncomingCall = ({ callId, caller, receiver, callType, isCaller }) => {
  const [callStatus, setCallStatus] = useState('ringing');
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const iceCandidatesRef = useRef([]); // Queue to store ICE candidates

  useEffect(() => {
    const handleCallEnd = ({ callId: endedCallId }) => {
      if (callId === endedCallId) {
        setCallStatus('ended');
        endCall();
      }
    };

    const handleConnectionLost = () => {
      setCallStatus('connectionLost');
      endCall();
    };

    const handleOffer = async ({ callId: offerCallId, offer }) => {
      if (callId === offerCallId) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        socket.emit('webrtc/answer', { callId, answer });
      }
    };

    const handleICECandidate = ({ callId: candidateCallId, candidate }) => {
      if (callId === candidateCallId && candidate) {
        if (peerConnectionRef.current.remoteDescription) {
          peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } else {
          // Queue ICE candidates if the remote description is not yet set
          iceCandidatesRef.current.push(new RTCIceCandidate(candidate));
        }
      }
    };

    socket.on('call/end', handleCallEnd);
    socket.on('disconnect', handleConnectionLost);
    socket.on('webrtc/offer', handleOffer);
    socket.on('webrtc/ice-candidate', handleICECandidate);

    return () => {
      socket.off('call/end', handleCallEnd);
      socket.off('disconnect', handleConnectionLost);
      socket.off('webrtc/offer', handleOffer);
      socket.off('webrtc/ice-candidate', handleICECandidate);
    };
  }, [callId]);

  const startWebRTC = async () => {
    const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    peerConnectionRef.current = new RTCPeerConnection(configuration);

    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc/ice-candidate', { callId, candidate: event.candidate });
      }
    };

    peerConnectionRef.current.ontrack = (event) => {
      if (remoteStreamRef.current) {
        if (remoteStreamRef.current.srcObject) {
          remoteStreamRef.current.srcObject.addTrack(event.track);
        } else {
          remoteStreamRef.current.srcObject = new MediaStream([event.track]);
        }
      }
    };

    const localStream = await navigator.mediaDevices.getUserMedia({
      video: callType === 'video',
      audio: true
    });

    localStream.getTracks().forEach(track => {
      peerConnectionRef.current.addTrack(track, localStream);
    });

    if (localStreamRef.current) {
      localStreamRef.current.srcObject = localStream;
    }
  };

  const handleAnswerCall = async () => {
    setCallStatus('connected');
    startWebRTC();
    socket.emit('call/answer', { callId, answer: true });
  };

  const handleRejectCall = () => {
    setCallStatus('rejected');
    socket.emit('call/answer', { callId, answer: false });
  };

  const handleEndCall = () => {
    setCallStatus('ended');
    socket.emit('call/end', { callId });
    endCall();
  };

  const endCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current && localStreamRef.current.srcObject) {
      localStreamRef.current.srcObject.getTracks().forEach(track => track.stop());
      localStreamRef.current.srcObject = null;
    }
    if (remoteStreamRef.current && remoteStreamRef.current.srcObject) {
      remoteStreamRef.current.srcObject.getTracks().forEach(track => track.stop());
      remoteStreamRef.current.srcObject = null;
    }
  };

  return (
    <div>
      {callStatus === 'ringing' && (
        <div>
          <p>Incoming call from {caller}</p>
          <button onClick={handleAnswerCall}>Answer</button>
          <button onClick={handleRejectCall}>Reject</button>
        </div>
      )}
      {callStatus === 'connected' && (
        <div>
          <p>Call connected with {caller}</p>
          <video ref={localStreamRef} autoPlay muted />
          <video ref={remoteStreamRef} autoPlay />
          <button onClick={handleEndCall}>End Call</button>
        </div>
      )}
      {callStatus === 'ended' && <p>Call ended</p>}
      {callStatus === 'rejected' && <p>Call was rejected</p>}
      {callStatus === 'connectionLost' && <p>Connection lost</p>}
    </div>
  );
};

IncomingCall.propTypes = {
  callId: PropTypes.string.isRequired,
  caller: PropTypes.string.isRequired,
  receiver: PropTypes.string.isRequired,
  callType: PropTypes.oneOf(['audio', 'video']).isRequired,
  isCaller: PropTypes.bool.isRequired,
};

export default IncomingCall;
