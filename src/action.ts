import type { Output } from "./schema";
import { type Handshake, SYNSchema } from "./transport";

export interface Action {
	id: string;
	observeTarget: string[];
	minImportance: number;
	onEvent(event: Output, memory: string): Promise<void> | void;
}

export class HandshakeAction implements Action {
	id = "handshake";
	observeTarget = ["handshake.hello", "handshake.syn"];
	minImportance = 1;

	private handshake: Handshake;
	private generateFn: (text: string) => Promise<string>;

	constructor(
		handshake: Handshake,
		generateFn: (text: string) => Promise<string>,
	) {
		this.handshake = handshake;
		this.generateFn = generateFn;
	}

	async onEvent(event: Output): Promise<void> {
		try {
			if (event.type === "handshake.syn") {
				const packet = SYNSchema.safeParse(JSON.parse(event.content));
				if (!packet.success) {
					return;
				}
				await this.handshake.respond(this.generateFn, packet.data);
			}
			if (event.type === "handshake.hello") {
				await this.handshake.hello(event.content, this.generateFn);
			}
		} catch (e) {
			console.error(e);
		}
	}
}

export class SpeakAction implements Action {
	id = "speak";
	observeTarget = ["*"];
	minImportance = 70;

	private generateFn: (text: string) => Promise<string>;

	constructor(generateFn: (text: string) => Promise<string>) {
		this.generateFn = generateFn;
	}

	async onEvent(event: Output, memory: string): Promise<void> {
		await this.generateFn(
			`与えられた入力: ${event.content}\n今までの記憶: ${memory}`,
		);
	}
}
