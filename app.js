const express = require("express");
const cors = require("cors");
const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode");
const http = require("http");
const socketIO = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const corsOptions = {
  origin: "https://apiwanaka.vercel.app/",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // Allow credentials (e.g., cookies, authorization headers)
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(
  "/socket.io",
  express.static(
    path.join(__dirname, "node_modules", "socket.io", "client-dist")
  )
);

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
  },
});

let isClientReady = false;
let clientSocket;
let today = new Date();
let now = today.toLocaleString();

client.initialize();
io.on("connection", (socket) => {
  console.log("A user connected");
  socket.emit("message", `${now} a user connected`);
  clientSocket = socket;
  // Handle events
  client.on("qr", (qr) => {
    qrcode.toDataURL(qr, (err, url) => {
      socket.emit("qr", url);
      socket.emit("message", `${now} QR Code received`);
    });
    // qrcode.generate(qr, { small: true });
  });

  client.on("ready", () => {
    console.log("READY");
    isClientReady = true;
    socket.emit("message", `${now} Whatsapp is Ready!`);
  });

  client.on("authenticated", () => {
    console.log("AUTHENTICATED");
    socket.emit("message", `${now} Whatsapp is authenticated!`);
  });

  client.on("auth_failure", (msg) => {
    console.error("AUTHENTICATION FAILURE", msg);
    isClientReady = false;
    socket.emit("message", `${now} Authenticated was failure!`);
  });

  client.on("disconnected", (reason) => {
    console.log("Client was logged out", reason);
    isClientReady = false;
    socket.emit("message", `${now} Whatsapp disconnected! reason: ${reason}`);
  });
  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

app.get("/", (req, res) => {
  if (clientSocket) {
    clientSocket.emit("message", `Status client : ${isClientReady}`);
  }
  res.sendFile(__dirname + "/index.html");
});

app.get("/api/send", (req, res) => {
  let phone = req.query.phone;
  phone = phone.includes("@c.us") ? phone : `${phone}@c.us`;
  let message = req.query.message;
  const send = client.sendMessage(phone, message);
  if (send) {
    clientSocket.emit("message", `${phone} send ${message}`);
    res.json({ msg: "Pesan Terkirim" }).status(200);
  } else {
    res.json({ msg: "Pesan Gagal Terkirim" }).status(404);
  }
});

server.listen(5000, () => {
  console.log("Example app listening on port 5000!");
});
