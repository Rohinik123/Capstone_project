const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const extraDns = process.env.MONGODB_DNS_SERVERS;
if (extraDns && String(extraDns).trim()) {
  dns.setServers(
    String(extraDns)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

// Fail fast if a query runs while disconnected (avoids 10s "buffering timed out").
mongoose.set("bufferCommands", false);

const userRoutes = require("./routes/userRoutes");
const chatRoutes = require("./routes/chatRoutes");
const messageRoutes = require("./routes/messageRoutes");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const { requireDb } = require("./middleware/dbMiddleware");

const app = express();

app.use(cors());

app.use(express.json()); //To Accept Json data
app.use(cors());
app.get("/", (req, res) => {
  res.send("Api is running on server");
});

app.get("/api/health", (req, res) => {
  const ok = mongoose.connection.readyState === 1;
  res.status(ok ? 200 : 503).json({
    ok,
    db: ok ? "connected" : "disconnected",
  });
});

app.use("/api", requireDb);
app.use("/api/user", userRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/message", messageRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 8001;

const mongoUri = (process.env.MONGO_URI || "").trim();
if (!mongoUri) {
  console.error(
    "FATAL: MONGO_URI is not set. Add it to .env (local) or your host's environment (e.g. Render)."
  );
  process.exit(1);
}

if (!process.env.JWT_SECRET || !String(process.env.JWT_SECRET).trim()) {
  console.error(
    "FATAL: JWT_SECRET is not set. Add it to .env or your host environment."
  );
  process.exit(1);
}

mongoose
  .connect(mongoUri, {
    serverSelectionTimeoutMS: 20000,
    maxPoolSize: 10,
    family: 4,
  })
  .then(() => {
    console.log("mongodb connected to atlas successfully");

    const server = app.listen(PORT, () => {
      console.log(`Server started running on ${PORT}`);
    });

    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(
          `Port ${PORT} is already in use. Close the other terminal running the API, or run: netstat -ano | findstr :${PORT}  then taskkill /PID <pid> /F`
        );
      } else {
        console.error(err);
      }
      process.exit(1);
    });

    const io = require("socket.io")(server, {
      pingTimeout: 60000,
      cors: {
        origin: "*" || "http://localhost:3000",
      },
    });

    io.on("connection", (Socket) => {
      console.log("connected to socket.io");

      Socket.on("setup", (userData) => {
        const uid = String(userData._id);
        Socket.join(uid);
        console.log(uid);
        Socket.emit("connected");
      });

      Socket.on("join chat", (room) => {
        Socket.join(String(room));
        console.log("User Joined Room: " + room);
      });

      Socket.on("typing", (room) => Socket.to(String(room)).emit("typing"));
      Socket.on("stop typing", (room) =>
        Socket.to(String(room)).emit("stop typing")
      );

      Socket.on("new message", (newMessageRecieved) => {
        const chat = newMessageRecieved.chat;
        if (!chat?.users) return console.log("chat.users not defined");

        const senderId = String(newMessageRecieved.sender._id);
        chat.users.forEach((u) => {
          if (String(u._id) === senderId) return;
          io.to(String(u._id)).emit("message recieved", newMessageRecieved);
        });
      });
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
    console.error(
      "Check: Atlas cluster is running, password in URI is URL-encoded, Network Access allows connections (e.g. 0.0.0.0/0)."
    );
    if (String(error.message).includes("querySrv")) {
      console.error(
        [
          "SRV/DNS hint: querySrv ECONNREFUSED is a DNS resolution failure (before TLS/TCP to MongoDB).",
          "Try: (1) MONGODB_DNS_SERVERS=8.8.8.8,1.1.1.1 in .env",
          "     (2) NODE_OPTIONS=--dns-result-order=ipv4first when starting node",
          "     (3) Use a standard mongodb:// URI (no +srv) from Atlas: Connect → Drivers → copy seed list; add ssl=true&replicaSet=<name>&authSource=admin",
          "     (4) Test DNS: nslookup -type=SRV _mongodb._tcp.<your-cluster-host>",
          "     (5) Firewall/VPN: allow Node; try another network or mobile hotspot",
        ].join("\n")
      );
    }
    process.exit(1);
  });
