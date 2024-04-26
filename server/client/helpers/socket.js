import { io } from 'socket.io-client';

const isDev = process.env.NODE_ENV === 'development';

const socket = io(
  isDev
  ? 'http://localhost:8080'
  : 'https://kotha-app.onrender.com'
);
export default socket;
