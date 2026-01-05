import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type { Action } from "../action";
import type { MessageType } from "../schema";
import type { Transport } from "../transport";

export class kiraraAgent {
	private memory: string;
	private transports: Transport[];
	private read: string[];

	constructor(transports: Transport[], actions: Action[]) {
		this.memory = "記憶はありません。新たに会話を始めましょう。\n";
		this.transports = transports;
		this.read = [];
		transports.forEach((transport) => {
			this.setupObserve(transport, actions);
		});
	}

	static start(transports: Transport[], actions: Action[]) {
		return new kiraraAgent(transports, actions);
	}

	async broadcast(type: string, message: string, importance: number) {
		try {
			const msg = {
				type: type,
				content: message,
				importance: importance,
			};
			const hash = sha256(new TextEncoder().encode(JSON.stringify(msg)));
			const result: MessageType = {
				id: bytesToHex(hash),
				...msg,
			};
			this.transports.forEach((transport) => {
				transport.send(JSON.stringify(result));
			});
		} catch (err) {
			console.error("Failed to send message:", err);
		}
	}

	private setupObserve(transport: Transport, actions: Action[]) {
		transport.observe((msg) => {
			this.memory += `${msg.content}\n`;
			actions.forEach((action) => {
				if (
					msg.type !== action.observeTarget &&
					action.observeTarget !== "any"
				) {
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
		});
	}

	private async output(action: Action, msg: MessageType) {
		const res = await action.run(msg, this.memory);
		if (typeof res !== "string") return;
		const raw = {
			type: "output",
			content: res,
			importance: 100,
		};
		const hash = sha256(new TextEncoder().encode(JSON.stringify(raw)));
		const result: MessageType = {
			id: bytesToHex(hash),
			...raw,
		};
		this.transports.forEach((transport) => {
			transport.send(JSON.stringify(result));
		});
	}
}
