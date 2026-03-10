const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const passport = require("passport");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./config/db");
const registerChatHandlers = require("./socket/chatHandler");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

connectDB();

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(passport.initialize());

require("./passport")(passport);

app.use("/api/auth", require("./routes/auth"));
app.use("/api/rooms", require("./routes/rooms"));

app.get("/", (req, res) => {
  res.send("Server Running");
});

// Register Socket.IO chat handlers
registerChatHandlers(io);

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`\n❌  Port ${PORT} is already in use.`);
    console.error(`   Run this to free it:\n   Get-NetTCPConnection -LocalPort ${PORT} | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }\n`);
    process.exit(1);
  } else {
    throw err;
  }
});

server.listen(PORT, () => {
  console.log(`✅  Server running on port ${PORT}`);
});