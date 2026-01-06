import WebSocket, { WebSocketServer } from "ws";

const clients = new Map<string, WebSocket>();

const wss = new WebSocketServer({
	port: 8080,
});

wss.on("connection", (ws) => {
	ws.on("message", (data) => {
		const msg = JSON.parse(data.toString());
		if (msg.type === "event.register") {
			clients.set(msg.id, ws);
			console.log(`Client ${msg.id} registered`);
		} else if (msg.to) {
			const target = clients.get(msg.to);
			if (target && target.readyState === WebSocket.OPEN) {
				target.send(JSON.stringify(msg));
			}
		}
	});

	ws.on("close", () => {
		for (const [id, client] of clients.entries()) {
			if (client === ws) clients.delete(id);
		}
	});
});

console.log("WebSocket server started on port ws://localhost:8080");
