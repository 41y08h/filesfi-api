import "dotenv/config";
import createDebug from "debug";
import { Server } from "socket.io";
import { ICallInitData, ICallData } from "./interfaces/call";
import ConnectedClients, { Client } from "./ConnectedClients";
import { v4 as uuid } from "uuid";

interface SignaledPair {
  connected: boolean;
  caller: Client;
  callee: Client;
  roomId: string;
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

      const roomId = uuid();
      caller.socket.join(roomId);
      callee.socket.join(roomId);
      signaledPairs.push({ connected: true, caller, callee, roomId });
    });

    socket.once("disconnect", () => {
      connectedClients.remove(socket.id);

      const signaledPair = signaledPairs.find((pair) =>
        [pair.caller.socket.id, pair.callee.id].includes(socket.id)
      );
      if (!signaledPair) return;

      signaledPair.connected = false;

      io.to(signaledPair?.roomId).emit("peerDisconnected");
    });
  });

  debug(`Service started on PORT ${PORT}`);
}

main();
