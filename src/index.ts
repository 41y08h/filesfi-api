import "dotenv/config";
import createDebug from "debug";
import { Server } from "socket.io";
import { ICallInitData, ICallData } from "./interfaces/call";
import ConnectedClients, { Client } from "./ConnectedClients";
import { v4 as uuid } from "uuid";

interface SignaledPair {
  caller: Client;
  callee: Client;
}

const connectedClients = new ConnectedClients();
const signaledPairs: SignaledPair[] = [];

async function main() {
  const debug = createDebug("app");

  const PORT = process.env.PORT || 5000;

  const io: Server = require("socket.io")(PORT, {
    cors: true,
    clientURL: process.env.CLIENT_HOSTNAME,
  });

  io.on("connection", (socket) => {
    const debug = createDebug("app:signaling");

    io.use(async (socket, next) => {
      const existingClient = connectedClients.getBySocketId(socket.id);
      if (existingClient) return next();

      connectedClients.add(socket);
      next();
    });

    socket.on("join", () => {
      const client = connectedClients.getBySocketId(socket.id);
      if (!client) return;

      socket.emit("join/callback", client.id);
    });

    socket.on("callPeer", async (call: ICallInitData) => {
      const caller = connectedClients.getBySocketId(socket.id);

      if (!caller) return;

      debug(`c${caller.id}/${caller.socket.id} called c${call.peerId}`);

      const callee = connectedClients.getById(call.peerId);

      if (!callee) return;

      const callPayload: ICallData = {
        callerId: caller.id,
        signal: call.signal,
      };

      callee.socket.emit("peerIsCalling", callPayload);
    });

    socket.on("answerCall", async (call: ICallData) => {
      const callee = connectedClients.getBySocketId(socket.id);
      debug(`c${callee?.id}/${callee?.socket.id} answered c${call.callerId}`);

      const caller = connectedClients.getById(call.callerId);
      if (!caller || !callee) return;

      caller.socket.emit("callAnswered", call.signal);
    });

    socket.on("exception/peerIsCalling/alreadyConnected", (payload) => {
      const { callerId } = payload;
      const caller = connectedClients.getById(callerId);

      caller?.socket.emit("exception/callPeer/alreadyConnected", {
        message: "Requested device is busy",
      });
    });

    socket.once("disconnect", () => {
      connectedClients.remove(socket.id);
    });
  });

  debug(`Service started on PORT ${PORT}`);
}

main();
