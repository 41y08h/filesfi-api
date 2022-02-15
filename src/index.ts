import "dotenv/config";
import createDebug from "debug";
import { Server } from "socket.io";
import { ICallInitData, ICallData } from "./interfaces/call";
import ConnectedClients from "./ConnectedClients";

const connectedClients = new ConnectedClients();

async function main() {
  const debug = createDebug("app");

  const PORT = process.env.PORT || 5000;

  const io: Server = require("socket.io")(PORT, {
    cors: true,
    clientURL: process.env.CLIENT_HOSTNAME,
    allowEIO3: true,
  });

  io.use(async (socket, next) => {
    const existingClient = connectedClients.getBySocketId(socket.id);
    if (existingClient) return next();

    connectedClients.add(socket);
    next();
  });

  io.on("connection", (socket) => {
    const debug = createDebug("app:signaling");

    socket.on("join", () => {
      const client = connectedClients.getBySocketId(socket.id);
      if (client) socket.emit("join/callback", client.id);
    });

    socket.on("callPeer", async (call: ICallInitData) => {
      const caller = connectedClients.getBySocketId(socket.id);

      if (!caller) return socket.disconnect();

      // Stop connection to self
      if (caller.id === call.peerId)
        return socket.emit("exception/callPeer", { type: "callingSelf" });

      const callee = connectedClients.getById(call.peerId);

      // Device not found
      if (!callee)
        return socket.emit("exception/callPeer", { type: "deviceNotFound" });

      const callPayload: ICallData = {
        callerId: caller.id,
        signal: call.signal,
      };

      callee.socket.emit("peerIsCalling", callPayload);

      debug(`c${caller.id}/${caller.socket.id} called c${call.peerId}`);
    });

    socket.on("exception/peerIsCalling", (error) => {
      if (error.type === "busy") {
        const { callerId } = error.payload;
        const caller = connectedClients.getById(callerId);

        caller?.socket.emit("exception/callPeer", { type: "deviceBusy" });
      }
    });

    socket.on("answerCall", async (call: ICallData) => {
      const callee = connectedClients.getBySocketId(socket.id);
      const caller = connectedClients.getById(call.callerId);

      if (!caller || !callee) return;

      caller.socket.emit("callAnswered", call.signal);

      debug(`c${callee?.id}/${callee?.socket.id} answered c${call.callerId}`);
    });

    socket.once("disconnect", () => {
      connectedClients.remove(socket.id);
    });
  });

  debug(`Service started on PORT ${PORT}`);
}

main();
