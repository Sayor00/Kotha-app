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
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnectionRef.current.createAnswer();
        await peerConnectionRef.current.setLocalDescription(answer);
        socket.emit('webrtc/answer', { callId, answer });
      }
    };

    const handleAnswer = async ({ callId: answerCallId, answer }) => {
      if (callId === answerCallId) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        // Process any queued ICE candidates
        iceCandidatesRef.current.forEach(candidate => {
          peerConnectionRef.current.addIceCandidate(candidate);
        });
        iceCandidatesRef.current = [];
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      {callStatus === 'ringing' && (
        <div className="text-center">
          <p className="text-lg font-semibold mb-4">Incoming call from {caller}</p>
          <button
            onClick={() => { setCallStatus('connected'); startWebRTC(false); socket.emit('call/answer', { callId, answer: true }); }}
            className="px-4 py-2 bg-green-500 text-white rounded shadow"
          >
            Answer
          </button>
          <button
            onClick={() => socket.emit('call/answer', { callId, answer: false })}
            className="px-4 py-2 bg-red-500 text-white rounded shadow ml-2"
          >
            Reject
          </button>
        </div>
      )}
      {callStatus === 'calling' && (
        <div className="text-center">
          <p className="text-lg font-semibold mb-4">Calling: {receiver}</p>
          <button
            onClick={handleEndCall}
            className="px-4 py-2 bg-red-500 text-white rounded shadow"
          >
            End Call
          </button>
        </div>
      )}
      {callStatus === 'connected' && (
        <div className="text-center">
          <p className="text-lg font-semibold mb-4">Call connected with {isCaller ? receiver : caller}</p>
          <div className="flex justify-center items-center space-x-4">
            <video ref={localStreamRef} autoPlay muted className="w-[300px] rounded shadow" />
            <video ref={remoteStreamRef} autoPlay className="w-[300px] rounded shadow" />
          </div>
          <button
            onClick={handleEndCall}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded shadow"
          >
            End Call
          </button>
        </div>
      )}
      {callStatus === 'ended' && <p className="text-lg text-center">Call ended</p>}
      {callStatus === 'noAnswer' && <p className="text-lg text-center">Call was not answered</p>}
      {callStatus === 'rejected' && <p className="text-lg text-center">Call was rejected</p>}
      {callStatus === 'connectionLost' && <p className="text-lg text-center">Connection lost</p>}
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
