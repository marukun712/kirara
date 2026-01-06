import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type { Action } from "../action";
import type { Output } from "../schema";
import type { Transport } from "../transport";

export class kiraraAgent {
	id: string;
	memory: string;
	private read: string[];
	private actions: Action[];

	constructor(prompt: string, actions: Action[]) {
		this.id = bytesToHex(sha256(new TextEncoder().encode(prompt)));
		this.memory = "記憶はありません。新たに会話を始めましょう。\n";

		this.read = [];
		this.actions = actions;
	}

	static start(prompt: string, actions: Action[]) {
		return new kiraraAgent(prompt, actions);
	}

	async input(type: string, message: string, importance: number) {
		try {
			const raw = {
				type: type,
				content: message,
				importance,
			};
			const hash = sha256(new TextEncoder().encode(JSON.stringify(raw)));
			const msg: Output = {
				id: bytesToHex(hash),
				...raw,
			};
			this.memory += `${msg.content}\n`;
			this.actions.forEach((action) => {
				if (!action.observeTarget.includes(msg.type)) {
					return;
				}

				if (msg.importance < action.minImportance) {
					return;
				}

				if (this.read.includes(msg.id)) {
					return;
				}
				this.read.push(msg.id);
				this.output(action, msg);
			});
		} catch (err) {
			console.error("Failed to send message:", err);
		}
	}

	private async output(action: Action, msg: Output) {
		await action.onEvent(msg);
	}

	attachTransport(transport: Transport) {
		transport.onMessage((data) => {
			try {
				const msg = JSON.parse(data);
				if (msg.type === "SYN") {
					this.input("handshake.syn", JSON.stringify(msg), 100);
				} else if (msg.type === "SYN-ACK") {
					this.input("handshake.syn_ack", JSON.stringify(msg), 100);
				} else if (msg.type === "ACK") {
					this.input("handshake.ack", JSON.stringify(msg), 100);
				}
			} catch (err) {
				console.error(err);
			}
		});
	}
}
