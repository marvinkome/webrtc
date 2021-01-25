import path from "path";
import fs from "fs";
import express, { Application } from "express";
import { Server as SocketIOServer } from "socket.io";
import { createServer, Server as HTTPServer } from "https";

const options = {
  key: fs.readFileSync(path.join(__dirname, "../key.pem")),
  cert: fs.readFileSync(path.join(__dirname, "../cert.pem")),
};

export class Server {
  private httpServer: HTTPServer;
  private app: Application;
  private io: SocketIOServer;
  private activeSockets: string[] = [];

  private readonly PORT = 5000;

  constructor() {
    this.app = express();
    this.httpServer = createServer(options, this.app);
    this.io = new SocketIOServer(this.httpServer);

    this.configureApp();
    this.handleRoutes();
    this.handleSocketConnection();
  }

  private handleRoutes() {
    this.app.get("/", (req, res) => {
      res.send(`<h1>Hello world</h1>`);
    });
  }

  private handleSocketConnection() {
    this.io.on("connection", (socket) => {
      console.log("Socket connected");

      const existingSocket = this.activeSockets.find(
        (existingSocket) => existingSocket === socket.id
      );

      if (!existingSocket) {
        this.activeSockets.push(socket.id);

        socket.emit("update-user-list", {
          users: this.activeSockets.filter((existingSocket) => existingSocket !== socket.id),
        });

        socket.broadcast.emit("update-user-list", {
          users: [socket.id],
        });
      }

      socket.on("call-user", (data: any) => {
        socket.to(data.to).emit("call-made", {
          offer: data.offer,
          socket: socket.id,
        });
      });

      socket.on("make-answer", (data: any) => {
        socket.to(data.to).emit("answer-made", {
          socket: socket.id,
          answer: data.answer,
        });
      });

      socket.on("disconnect", () => {
        this.activeSockets = this.activeSockets.filter(
          (existingSocket) => existingSocket !== socket.id
        );

        socket.broadcast.emit("remove-user", {
          socketId: socket.id,
        });
      });
    });
  }

  private configureApp() {
    this.app.use(express.static(path.join(__dirname, "../public")));
  }

  listen(callback: (port: number) => void) {
    this.httpServer.listen(this.PORT, () => callback(this.PORT));
  }
}
