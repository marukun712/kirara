import type WebSocket from "ws";
import { WebSocketServer } from "ws";

const clients = new Set<WebSocket>();

const wss = new WebSocketServer({
	port: 8080,
});

wss.on("connection", (ws) => {
	clients.add(ws);
	ws.on("message", (message) => {
		clients.forEach((client) => {
			client.send(message);
		});
	});
	ws.on("close", () => {
		clients.delete(ws);
	});
});

console.log("WebSocket server started on port ws://localhost:8080");
