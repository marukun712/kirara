import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import type { Action } from "../action";
import type { MessageType } from "../schema";

export class kiraraAgent {
	private memory: string;
	private read: string[];
	private actions: Action[];
	private onMessage: (msg: string) => void;

	constructor(actions: Action[], onMessage: (msg: string) => void) {
		this.memory = "記憶はありません。新たに会話を始めましょう。\n";
		this.read = [];
		this.actions = actions;
		this.onMessage = onMessage;
	}

	static start(actions: Action[], onMessage: (msg: string) => void) {
		return new kiraraAgent(actions, onMessage);
	}

	async input(type: string, message: string, importance: number) {
		try {
			const raw = {
				type: type,
				content: message,
				importance: importance,
			};
			const hash = sha256(new TextEncoder().encode(JSON.stringify(raw)));
			const msg: MessageType = {
				id: bytesToHex(hash),
				...raw,
			};
			this.memory += `${msg.content}\n`;
			this.actions.forEach((action) => {
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
		} catch (err) {
			console.error("Failed to send message:", err);
		}
	}

	private async output(action: Action, msg: MessageType) {
		const res = await action.run(msg, this.memory);
		if (typeof res !== "string") return;
		this.onMessage(res);
	}
}
