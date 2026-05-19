import { Server } from "socket.io"


let connections = {}
let messages = {}
let timeOnline = {}
const users = {}  // Global registry mapping socket.id -> username

export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true
        }
    });

    io.on("connection", (socket) => {

        console.log("SOMETHING CONNECTED")

        const handleJoinCall = (arg1, arg2) => {
            let path, username;
            if (arg1 && typeof arg1 === 'object') {
                path = arg1.roomId || arg1.path || arg1.meetingCode;
                username = arg1.userName || arg1.username || arg1.displayName;
            } else {
                path = arg1;
                username = arg2;
            }

            if (connections[path] === undefined) {
                connections[path] = []
            }
            connections[path].push(socket.id)

            // Save user display name metadata in global users registry
            users[socket.id] = username || `User_${socket.id.substring(0, 4)}`;
            timeOnline[socket.id] = new Date();

            // Map all socket IDs in the room to their respective active metadata packets
            const clientsWithMetadata = connections[path].map(id => ({
                socketId: id,
                username: users[id] || `User_${id.substring(0, 4)}`
            }));

            console.log(`[SOCKET BACKEND] User ${users[socket.id]} (${socket.id}) joined room: ${path}`);

            for (let a = 0; a < connections[path].length; a++) {
                io.to(connections[path][a]).emit("user-joined", socket.id, clientsWithMetadata)
            }

            if (messages[path] !== undefined) {
                for (let a = 0; a < messages[path].length; ++a) {
                    io.to(socket.id).emit("chat-message", messages[path][a]['data'],
                        messages[path][a]['sender'], messages[path][a]['socket-id-sender'])
                }
            }
        };

        socket.on("join-call", handleJoinCall);
        socket.on("join-room", handleJoinCall);

        socket.on("signal", (toId, message) => {
            const senderUsername = users[socket.id] || `User_${socket.id.substring(0, 4)}`;
            try {
                let parsed = JSON.parse(message);
                parsed.senderUsername = senderUsername;
                io.to(toId).emit("signal", socket.id, JSON.stringify(parsed));
                console.log(`[SOCKET BACKEND] Forwarded signal with username ${senderUsername} (${socket.id}) to ${toId}`);
            } catch (e) {
                io.to(toId).emit("signal", socket.id, message);
            }
        });

        socket.on("chat-message", (data, sender) => {

            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {


                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }

                    return [room, isFound];

                }, ['', false]);

            if (found === true) {
                if (messages[matchingRoom] === undefined) {
                    messages[matchingRoom] = []
                }

                messages[matchingRoom].push({ 'sender': sender, "data": data, "socket-id-sender": socket.id })
                console.log("message", matchingRoom, ":", sender, data)

                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("chat-message", data, sender, socket.id)
                })
            }

        })

        socket.on("disconnect", () => {

            var diffTime = Math.abs(timeOnline[socket.id] - new Date())

            var key

            for (const [k, v] of JSON.parse(JSON.stringify(Object.entries(connections)))) {

                for (let a = 0; a < v.length; ++a) {
                    if (v[a] === socket.id) {
                        key = k

                        for (let a = 0; a < connections[key].length; ++a) {
                            io.to(connections[key][a]).emit('user-left', socket.id)
                        }

                        var index = connections[key].indexOf(socket.id)

                        connections[key].splice(index, 1)


                        if (connections[key].length === 0) {
                            delete connections[key]
                        }
                    }
                }

            }

            // Clean up username mapping in global registry to prevent memory leaks
            delete users[socket.id];
            delete timeOnline[socket.id];

        })


    })


    return io;
}
