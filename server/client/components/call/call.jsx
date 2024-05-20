import React, { useEffect, useState, useRef } from 'react';
import PropTypes from 'prop-types';
import socket from '../../helpers/socket';

const Call = ({ callId, caller, receiver, callType, isCaller }) => {
  const [callStatus, setCallStatus] = useState(isCaller ? 'calling' : 'ringing');
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const iceCandidatesRef = useRef([]); // Queue to store ICE candidates

  useEffect(() => {
    if (isCaller) {
      const timeoutId = setTimeout(() => {
        setCallStatus('noAnswer');
        socket.emit('call/end', { callId });
      }, 60000); // 1 minute timeout for unanswered calls

      return () => clearTimeout(timeoutId);
    }
  }, [isCaller, callId]);

  useEffect(() => {
    const handleCallAnswer = ({ answer }) => {
      if (answer) {
        setCallStatus('connected');
        startWebRTC(true);
      } else {
        setCallStatus('rejected');
      }
    };

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
        console.log(`Received offer for callId ${callId}:`, offer);
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        socket.emit('webrtc/answer', { callId, answer });
      }
    };

    const handleAnswer = async ({ callId: answerCallId, answer }) => {
      if (callId === answerCallId) {
        console.log(`Received answer for callId ${callId}:`, answer);
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        iceCandidatesRef.current.forEach(candidate => {
          console.log(`Adding queued ICE candidate for callId ${callId}:`, candidate);
          peerConnectionRef.current.addIceCandidate(candidate);
        });
        iceCandidatesRef.current = [];
      }
    };

    const handleICECandidate = ({ callId: candidateCallId, candidate }) => {
      if (callId === candidateCallId && candidate) {
        const iceCandidate = new RTCIceCandidate(candidate);
        console.log(`Received ICE candidate for callId ${callId}:`, candidate);
        if (peerConnectionRef.current.remoteDescription) {
          peerConnectionRef.current.addIceCandidate(iceCandidate)
            .then(() => {
              console.log(`Successfully added ICE candidate for callId ${callId}:`, candidate);
            })
            .catch(error => {
              console.error(`Failed to add ICE candidate for callId ${callId}:`, error);
            });
        } else {
          iceCandidatesRef.current.push(iceCandidate);
          console.log(`Queued ICE candidate for callId ${callId} as remoteDescription is not set yet:`, candidate);
        }
      }
    };

    socket.on('call/answer', handleCallAnswer);
    socket.on('call/end', handleCallEnd);
    socket.on('disconnect', handleConnectionLost);
    socket.on('webrtc/offer', handleOffer);
    socket.on('webrtc/answer', handleAnswer);
    socket.on('webrtc/ice-candidate', handleICECandidate);

    return () => {
      socket.off('call/answer', handleCallAnswer);
      socket.off('call/end', handleCallEnd);
      socket.off('disconnect', handleConnectionLost);
      socket.off('webrtc/offer', handleOffer);
      socket.off('webrtc/answer', handleAnswer);
      socket.off('webrtc/ice-candidate', handleICECandidate);
    };
  }, [callId]);

  const startWebRTC = async (isCaller) => {
    const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
    peerConnectionRef.current = new RTCPeerConnection(configuration);

    peerConnectionRef.current.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`Sending ICE candidate for callId ${callId}:`, event.candidate);
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

    if (isCaller) {
      const offer = await peerConnectionRef.current.createOffer();
      await peerConnectionRef.current.setLocalDescription(offer);
      socket.emit('webrtc/offer', { callId, offer });
    }
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
          <button onClick={() => { setCallStatus('connected'); startWebRTC(false); socket.emit('call/answer', { callId, answer: true }); }}>Answer</button>
          <button onClick={() => socket.emit('call/answer', { callId, answer: false })}>Reject</button>
        </div>
      )}
      {callStatus === 'calling' && (
        <div>
          <p>Calling: {receiver}</p>
          <button onClick={handleEndCall}>End Call</button>
        </div>
      )}
      {callStatus === 'connected' && (
        <div>
          <p>Call connected with {isCaller ? receiver : caller}</p>
          <video ref={localStreamRef} autoPlay muted />
          <video ref={remoteStreamRef} autoPlay />
          <button onClick={handleEndCall}>End Call</button>
        </div>
      )}
      {callStatus === 'ended' && <p>Call ended</p>}
      {callStatus === 'noAnswer' && <p>Call was not answered</p>}
      {callStatus === 'rejected' && <p>Call was rejected</p>}
      {callStatus === 'connectionLost' && <p>Connection lost</p>}
    </div>
  );
};

Call.propTypes = {
  callId: PropTypes.string.isRequired,
  caller: PropTypes.string.isRequired,
  receiver: PropTypes.string.isRequired,
  callType: PropTypes.oneOf(['audio', 'video']).isRequired,
  isCaller: PropTypes.bool.isRequired,
};

export default Call;
