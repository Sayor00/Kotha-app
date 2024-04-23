const isDev = process.env.NODE_ENV === "development";

module.exports = {
  isDev,
  cors: {
    origin: [
      "http://localhost:3000",
      "https://localhost",
      "capacitor://localhost",
      "ionic://localhost",
      "https://kotha-jet.vercel.app",
      // Add more origins if needed
    ],
    credentials: true,
    allowedHeaders: "*",
    optionsSuccessStatus: 200, // For legacy browser support
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  },
  db: {
    uri: process.env.MONGO_URI,
    name: "Kotha",
  },
};
