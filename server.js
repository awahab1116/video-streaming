// Importing required libraries
const express = require('express') // Express.js library for creating web applications
const http = require('http') // HTTP module for creating server
const { Server } = require('socket.io') // Socket.io library for real-time communication

const app = express() // Creating an instance of Express.js
const server = http.createServer(app) // Creating an HTTP server using Express.js app
const io = new Server(server) // Creating a Socket.io server using the HTTP server

app.use('/', express.static('public')) // Serving static files from the 'public' directory

/**
 * Event handler for 'connection' event.
 * It is triggered when a client connects to the server.
 * @param {object} socket - The socket object representing the client connection.
 */
io.on('connection', (socket) => {
  /**
   * Event handler for 'join' event.
   * It is triggered when a client joins a room.
   * @param {string} roomId - The ID of the room to join.
   */
  socket.on('join', (roomId) => {
    const selectedRoom = io.sockets.adapter.rooms.get(roomId)

    /**
     * The number of clients connected to the selected room.
     * @type {number}
     */
    const numberOfClients = selectedRoom ? selectedRoom.size : 0

    if (numberOfClients === 0) {
      console.log(`Creating room ${roomId} and emitting room_created socket event`)
      socket.join(roomId)
      socket.emit('room_created', roomId)
    } else if (numberOfClients === 1) {
      console.log(`Joining room ${roomId} and emitting room_joined socket event`)
      socket.join(roomId)
      socket.emit('room_joined', roomId)
    } else {
      console.log(`Can't join room ${roomId}, emitting full_room socket event`)
      socket.emit('full_room', roomId)
    }
  })

  /**
   * Event handler for 'start_call' event.
   * It is triggered when a client initiates a call in a room.
   * @param {string} roomId - The ID of the room where the call is initiated.
   */
  socket.on('start_call', (roomId) => {
    console.log(`Broadcasting start_call event to peers in room ${roomId}`)
    socket.to(roomId).emit('start_call')
  })

  /**
   * Event handler for 'webrtc_offer' event.
   * It is triggered when a client sends a WebRTC offer in a room.
   * @param {object} event - The event object containing the room ID and offer SDP.
   */
  socket.on('webrtc_offer', (event) => {
    console.log(`Broadcasting webrtc_offer event to peers in room ${event.roomId}`)
    socket.to(event.roomId).emit('webrtc_offer', event.sdp)
  })

  /**
   * Event handler for 'webrtc_answer' event.
   * It is triggered when a client sends a WebRTC answer in a room.
   * @param {object} event - The event object containing the room ID and answer SDP.
   */
  socket.on('webrtc_answer', (event) => {
    console.log(`Broadcasting webrtc_answer event to peers in room ${event.roomId}`)
    socket.to(event.roomId).emit('webrtc_answer', event.sdp)
  })

  /**
   * Event handler for 'webrtc_ice_candidate' event.
   * It is triggered when a client sends a WebRTC ICE candidate in a room.
   * @param {object} event - The event object containing the room ID and ICE candidate details.
   */
  socket.on('webrtc_ice_candidate', (event) => {
    console.log(`Broadcasting webrtc_ice_candidate event to peers in room ${event.roomId}`)
    socket.to(event.roomId).emit('webrtc_ice_candidate', event)
  })

  /**
   * Event handler for 'disconnect' event.
   * It is triggered when a client disconnects from the server.
   */
  socket.on('disconnect', () => {
    console.log('socket disconnected')
  })
})

/**
 * The port number on which the server listens for incoming requests.
 * It uses the value of the environment variable 'PORT' if available, otherwise defaults to 3000.
 * @type {number}
 */
const port = process.env.PORT || 3000

// Start the server and listen on the specified port
server.listen(port, () => {
  console.log(`Express server listening on port ${port}`)
})
