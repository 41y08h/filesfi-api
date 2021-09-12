import { Socket } from "socket.io";

export interface Client {
  id: number;
  socket: Socket;
}

export default class ConnectedClients {
  clients: Client[];
  private lastId: number;

  constructor() {
    this.clients = [];
    this.lastId = 0;
  }

  add(socket: Socket) {
    const client: Client = { id: ++this.lastId, socket };
    this.clients.push(client);
    return client;
  }

  getBySocketId(socketId: string) {
    const client = this.clients.find((client) => client.socket.id === socketId);
    return client;
  }

  getById(id: number) {
    const client = this.clients.find((client) => client.id === id);
    return client;
  }

  remove(socketId: string) {
    this.clients = this.clients.filter(
      (client) => client.socket.id !== socketId
    );
  }
}
