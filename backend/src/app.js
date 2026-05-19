import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import mongoose from "mongoose";
import { connectToSocket } from "./controllers/socketManager.js";
import cors from "cors";
import userRoutes from "./routes/users.routes.js";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

app.set("port", (process.env.PORT || 8000));

// Production-ready dynamic CORS configurations
const allowedOrigins = [
    process.env.FRONTEND_URL, 
    "http://localhost:3000",
    "http://127.0.0.1:3000"
].filter(Boolean);

app.use(cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : "*",
    credentials: true,
    methods: ["GET", "POST"]
}));

app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));

app.use("/api/v1/users", userRoutes);

const start = async () => {
    // Dynamically connect using MONGO_URI, falling back if unconfigured placeholders are present
    let mongoUri = process.env.MONGO_URI;
    console.log("[BACKEND BOOT] Original process.env.MONGO_URI:", mongoUri);
    
    if (!mongoUri || mongoUri.includes("YOUR_PASSWORD") || mongoUri.includes("xxxxx")) {
        console.log("[BACKEND BOOT] Unconfigured .env database placeholder detected. Falling back to default cluster...");
        mongoUri = "mongodb+srv://vidya_apnavideocall:vidyaapna2002@apnavideocall-cluster.htjct97.mongodb.net/";
    }
    
    console.log("[BACKEND BOOT] Selected Connection URI:", mongoUri);
    
    try {
        const connectionDb = await mongoose.connect(mongoUri);
        console.log(`MONGO Connected DB Host: ${connectionDb.connection.host}`);
        
        const activePort = app.get("port");
        server.listen(activePort, () => {
            console.log(`SERVER RUNNING AND LISTENING ON PORT ${activePort}`);
        });
    } catch (err) {
        console.error("Database connection failed on startup:", err);
        process.exit(1);
    }
}

start();