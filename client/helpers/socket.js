import { io } from 'socket.io-client';

const isDev = process.env.NODE_ENV === 'development';

const socket = io(
  isDev
    ? 'https://kotha-app.onrender.com'
    : 'https://kotha-app.onrender.com'
    // ? 'http://localhost:8080'
    // : 'http://localhost:8080'
);
export default socket;
