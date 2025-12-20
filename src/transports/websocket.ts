import type WebSocket from "ws";
import type { Transport } from "../transport";

export class WebSocketTransport implements Transport {
	name: "websocket" = "websocket";
	ws: WebSocket;

	constructor(ws: WebSocket) {
		this.ws = ws;
	}

	async send(data: string): Promise<void> {
		this.ws.send(data);
	}

	listen(onMessage: (data: string) => void): () => void {
		const handler = (data: WebSocket.RawData) => {
			if (typeof data === "string") {
				onMessage(data);
			} else {
				onMessage(data.toString());
			}
		};
		this.ws.on("message", handler);
		return () => {
			this.ws.off("message", handler);
		};
	}
}
