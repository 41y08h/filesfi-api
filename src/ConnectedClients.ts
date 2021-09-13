import { Socket } from "socket.io";
import shortId from "./utils/shortId";

export interface Client {
  id: number;
  socket: Socket;
}

export default class ConnectedClients {
  clients: Client[];
  private generatedIds: number[];

  constructor() {
    this.clients = [];
    this.generatedIds = [];
  }

  add(socket: Socket) {
    const client: Client = { id: shortId(this.generatedIds), socket };
    this.generatedIds.push(client.id);
    this.clients.push(client);
    return client;
  }

  getBySocketId(socketId: string) {
    const client = this.clients.find((client) => client.socket.id === socketId);
    return client;
  }

  getById(id: number | string) {
    const client = this.clients.find((client) => client.id == id);
    return client;
  }

  remove(socketId: string) {
    this.generatedIds = this.generatedIds.filter(
      (id) => this.getBySocketId(socketId)?.id !== id
    );
    this.clients = this.clients.filter(
      (client) => client.socket.id !== socketId
    );
  }
}
