/**
 * Event handler for the 'click' event on the connectButton element.
 * It joins the specified room and triggers the showVideo function.
 */
connectButton.addEventListener('click', () => {
  joinRoom(roomInput.value)
})

/**
 * Event handler for the 'room_created' event.
 * It is triggered when a room is created on the server.
 * Sets the local stream and sets isRoomCreator to true.
 */
socket.on('room_created', async () => {
  console.log('Socket event callback: room_created')

  await setLocalStream(mediaConstraints)
  isRoomCreator = true
})

/**
 * Event handler for the 'room_joined' event.
 * It is triggered when a client joins a room on the server.
 * Sets the local stream and emits the 'start_call' event with the roomId.
 */
socket.on('room_joined', async () => {
  console.log('Socket event callback: room_joined')

  await setLocalStream(mediaConstraints)
  socket.emit('start_call', roomId)
})

/**
 * Event handler for the 'full_room' event.
 * It is triggered when a room is full and cannot accept more clients.
 * Displays an alert message to the user.
 */
socket.on('full_room', () => {
  console.log('Socket event callback: full_room')

  alert('The room is full, please try another one')
})

/**
 * Event handler for the 'start_call' event.
 * It is triggered when the call is started by the room creator.
 * Creates a new RTCPeerConnection, adds local tracks, sets the ontrack and onicecandidate handlers,
 * and creates an offer to send to the other client.
 */
socket.on('start_call', async () => {
  console.log('Socket event callback: start_call')

  if (isRoomCreator) {
    rtcPeerConnection = new RTCPeerConnection(iceServers)
    addLocalTracks(rtcPeerConnection)
    rtcPeerConnection.ontrack = setRemoteStream
    rtcPeerConnection.onicecandidate = sendIceCandidate
    await createOffer(rtcPeerConnection)
  }
})

/**
 * Event handler for the 'webrtc_offer' event.
 * It is triggered when an offer is received from the room creator.
 * Creates a new RTCPeerConnection, adds local tracks, sets the ontrack and onicecandidate handlers,
 * sets the remote description, and creates an answer to send back.
 * @param {object} event - The event object containing the offer.
 */
socket.on('webrtc_offer', async (event) => {
  console.log('Socket event callback: webrtc_offer ', event)

  if (!isRoomCreator) {
    rtcPeerConnection = new RTCPeerConnection(iceServers)
    addLocalTracks(rtcPeerConnection)
    rtcPeerConnection.ontrack = setRemoteStream
    rtcPeerConnection.onicecandidate = sendIceCandidate
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event))
    await createAnswer(rtcPeerConnection)
  }
})

/**
 * Event handler for the 'webrtc_answer' event.
 * It is triggered when an answer is received from the client joining the room.
 * Sets the remote description.
 * @param {object} event - The event object containing the answer.
 */
socket.on('webrtc_answer', (event) => {
  console.log('Socket event callback: webrtc_answer ', event)

  rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event))
})

/**
 * Event handler for the 'webrtc_ice_candidate' event.
 * It is triggered when an ICE candidate is received from the other client.
 * Adds the ICE candidate to the RTCPeerConnection.
 * @param {object} event - The event object containing the ICE candidate.
 */
socket.on('webrtc_ice_candidate', (event) => {
  console.log('Socket event callback: webrtc_ice_candidate ', event)

  const candidate = new RTCIceCandidate({
    sdpMLineIndex: event.label,
    candidate: event.candidate,
  })
  rtcPeerConnection.addIceCandidate(candidate)
})

/**
 * Event handler for the 'disconnect' event.
 * It is triggered when the socket connection is disconnected.
 * Stops the local or remote video tracks and disconnects the socket.
 */
socket.on('disconnect', () => {
  console.log('socket disconnected')
  if (isRoomCreator) {
    localVideoComponent.srcObject.getTracks().forEach((track) => {
      track.stop()
    })
  } else {
    remoteVideoComponent.srcObject.getTracks().forEach((track) => {
      track.stop()
    })
  }
  socket.disconnect()
})

/**
 * Joins the specified room and triggers the showVideo function.
 * Displays an alert if the room ID is empty.
 * @param {string} room - The room ID to join.
 */
function joinRoom(room) {
  if (room === '') {
    alert('Please type a room ID')
  } else {
    roomId = room
    socket.emit('join', room)
    showVideo()
  }
}

/**
 * Shows the video chat container and hides the room selection container.
 */
function showVideo() {
  roomSelectionContainer.style.display = 'none'
  videoChatContainer.style.display = 'block'
}

/**
 * Creates an offer and sets it as the local description of the RTCPeerConnection.
 * Emits the 'webrtc_offer' event with the offer and the roomId.
 * @param {RTCPeerConnection} rtcPeerConnection - The RTCPeerConnection object.
 */
async function createOffer(rtcPeerConnection) {
  try {
    const sessionDescription = await rtcPeerConnection.createOffer()
    rtcPeerConnection.setLocalDescription(sessionDescription)

    socket.emit('webrtc_offer', {
      type: 'webrtc_offer',
      sdp: sessionDescription,
      roomId,
    })
  } catch (error) {
    console.error(error)
  }
}

/**
 * Creates an answer and sets it as the local description of the RTCPeerConnection.
 * Emits the 'webrtc_answer' event with the answer and the roomId.
 * @param {RTCPeerConnection} rtcPeerConnection - The RTCPeerConnection object.
 */
async function createAnswer(rtcPeerConnection) {
  try {
    const sessionDescription = await rtcPeerConnection.createAnswer()
    rtcPeerConnection.setLocalDescription(sessionDescription)

    socket.emit('webrtc_answer', {
      type: 'webrtc_answer',
      sdp: sessionDescription,
      roomId,
    })
  } catch (error) {
    console.error(error)
  }
}

/**
 * Sets the local media stream to the localVideoComponent.
 * @param {MediaStreamConstraints} mediaConstraints - The media constraints for the getUserMedia API.
 */
async function setLocalStream(mediaConstraints) {
  try {
    localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints)
    localVideoComponent.srcObject = localStream
  } catch (error) {
    console.error('Could not get user media', error)
  }
}

/**
 * Adds the local tracks from the localStream to the RTCPeerConnection.
 * @param {RTCPeerConnection} rtcPeerConnection - The RTCPeerConnection object.
 */
function addLocalTracks(rtcPeerConnection) {
  localStream.getTracks().forEach((track) => {
    rtcPeerConnection.addTrack(track, localStream)
  })
}

/**
 * Sets the remote media stream to the remoteVideoComponent.
 * @param {RTCTrackEvent} event - The RTCTrackEvent object containing the remote stream.
 */
function setRemoteStream(event) {
  remoteVideoComponent.srcObject = event.streams[0]
  remoteStream = event.stream
}

/**
 * Sends the ICE candidate to the other client.
 * @param {RTCPeerConnectionIceEvent} event - The RTCPeerConnectionIceEvent object containing the ICE candidate.
 */
function sendIceCandidate(event) {
  if (event.candidate) {
    console.log('ICE candidate is ', event.candidate, event.candidate.sdpMLineIndex)
    socket.emit('webrtc_ice_candidate', {
      roomId,
      label: event.candidate.sdpMLineIndex,
      candidate: event.candidate.candidate,
    })
  }
}
