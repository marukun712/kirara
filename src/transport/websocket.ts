import type { Transport } from "../transport";

export class WebSocketTransport implements Transport {
	private ws: WebSocket;
	private messageCallback?: (data: string) => void;

	constructor(url: string) {
		this.ws = new WebSocket(url);
		this.ws.onmessage = (event) => {
			if (this.messageCallback) {
				this.messageCallback(event.data);
			}
		};
	}

	async send(data: string): Promise<void> {
		if (this.ws.readyState === WebSocket.CONNECTING) {
			await new Promise((resolve) => {
				this.ws.onopen = resolve;
			});
		}
		this.ws.send(data);
	}

	onMessage(callback: (data: string) => void): void {
		this.messageCallback = callback;
	}
}
