import type WebSocket from "ws";
import { Message, type MessageType } from "../schema";
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

	observe(onMessage: (data: MessageType) => void): () => void {
		const handler = (data: WebSocket.RawData) => {
			try {
				const json = JSON.parse(data.toString());
				const parsed = Message.safeParse(json);
				if (!parsed.success) {
					console.error("Invalid message");
					return;
				}
				onMessage(parsed.data);
			} catch {}
		};
		this.ws.on("message", handler);
		return () => {
			this.ws.off("message", handler);
		};
	}
}
