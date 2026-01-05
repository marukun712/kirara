import type WebSocket from "ws";
import { Scan, type ScanType } from "../schema";

export class WebSocketTransport {
	name: "websocket" = "websocket";
	private ws: WebSocket;
	private id: string;
	private connection: string | null;

	constructor(ws: WebSocket, id: string) {
		this.ws = ws;
		this.id = id;
		this.connection = null;
	}

	async scan(): Promise<ScanType[]> {
		const req: ScanType = {
			type: "req",
			id: crypto.randomUUID(),
			from: this.id,
		};
		this.ws.send(JSON.stringify(req));
		return new Promise((resolve) => {
			setTimeout(() => {
				const result: ScanType[] = [];
				this.ws.on("message", (data: WebSocket.RawData) => {
					const str = data.toString();
					const parsed = Scan.safeParse(JSON.parse(str));
					if (!parsed.success) {
						console.error("Invalid response");
						return;
					}
					if (parsed.data.id !== req.id) return;
					result.push(parsed.data);
				});
				resolve(result);
			}, 10000);
		});
	}

	async respond(req: ScanType): Promise<void> {
		if (req.type !== "req") return;
		const res: ScanType = {
			type: "res",
			id: req.id,
			from: this.id,
		};
		this.ws.send(JSON.stringify(res));
	}

	async connect(id: string): Promise<void> {
		if (this.connection) return;
		this.connection = id;
	}

	async send(message: string): Promise<void> {
		this.ws.send(message);
	}

	receive(onMessage: (data: string) => void): () => void {
		const handler = (data: WebSocket.RawData) => {
			onMessage(data.toString());
		};
		this.ws.on("message", handler);
		return () => {
			this.ws.off("message", handler);
		};
	}
}
