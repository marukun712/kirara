import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { z } from "zod";

export interface Transport {
	send(data: string): Promise<void>;
	onMessage(callback: (data: string) => void): void;
}

export const BaseMessageSchema = z.object({
	from: z.string(),
	to: z.string(),
	payload: z.string(),
	hash: z.string(),
});

export const SYNSchema = BaseMessageSchema.extend({
	type: z.literal("SYN"),
});

export const SYNACKSchema = BaseMessageSchema.extend({
	type: z.literal("SYN-ACK"),
});

export const ACKSchema = BaseMessageSchema.extend({
	type: z.literal("ACK"),
});

export const MessageSchema = z.discriminatedUnion("type", [
	SYNSchema,
	SYNACKSchema,
	ACKSchema,
]);

export type SYN = z.infer<typeof SYNSchema>;
export type SYNACK = z.infer<typeof SYNACKSchema>;
export type ACK = z.infer<typeof ACKSchema>;
export type Message = z.infer<typeof MessageSchema>;

export interface Transport {
	send(data: string): Promise<void>;
	onMessage(callback: (data: string) => void): void;
}

export class Handshake {
	transport: Transport;
	id: string;

	constructor(transport: Transport, prompt: string) {
		this.transport = transport;
		const encoder = new TextEncoder();
		const bytes = encoder.encode(prompt);
		this.id = bytesToHex(sha256(bytes));
	}

	private async computeHash(data: string): Promise<string> {
		const encoder = new TextEncoder();
		const bytes = encoder.encode(data);
		const hash = sha256(bytes);
		return bytesToHex(hash);
	}

	private async concatHash(
		prev: string | null,
		current: string,
	): Promise<string> {
		const data = prev ? prev + current : current;
		return this.computeHash(data);
	}

	async hello(
		targetPeerId: string,
		generate: (text: string) => Promise<string>,
	): Promise<boolean> {
		const greet = await generate(
			`人を見つけました。あなたとして挨拶してみましょう。`,
		);
		const hash = await this.concatHash(null, greet);

		const synMessage: SYN = {
			type: "SYN",
			from: this.id,
			to: targetPeerId,
			payload: greet,
			hash,
		};

		await this.transport.send(JSON.stringify(synMessage));

		return new Promise((resolve, reject) => {
			// 10秒でタイムアウト
			const timeout = setTimeout(async () => {
				await generate("相手から返答が返ってきませんでした。");
				reject(false);
			}, 15000);

			const handler = async (msg: string) => {
				try {
					const parsed = JSON.parse(msg);
					const validated = MessageSchema.parse(parsed);

					// SYN-ACK を待つ
					if (
						validated.type === "SYN-ACK" &&
						validated.from === targetPeerId &&
						validated.to === this.id
					) {
						// ハッシュ検証
						const expectedHash = await this.concatHash(hash, validated.payload);

						if (expectedHash !== validated.hash) {
							clearTimeout(timeout);
							await generate("相手から返答が返ってきませんでした。");
							reject(false);
							return;
						}

						const response = await generate(
							`相手が${validated.payload}と返してきました。あなたとして別れの挨拶をし、会話を終了しましょう。`,
						);

						const ackHash = await this.concatHash(hash, response);

						const ackMessage: ACK = {
							type: "ACK",
							from: this.id,
							to: targetPeerId,
							payload: response,
							hash: ackHash,
						};

						await this.transport.send(JSON.stringify(ackMessage));
						clearTimeout(timeout);
						resolve(true);
					}
				} catch (error) {
					clearTimeout(timeout);
					reject(error);
				}
			};

			this.transport.onMessage(handler);
		});
	}

	async respond(generate: (text: string) => Promise<string>): Promise<boolean> {
		return new Promise((resolve, reject) => {
			const handler = async (msg: string) => {
				try {
					const parsed = JSON.parse(msg);
					const validated = MessageSchema.parse(parsed);

					// SYN を受信
					if (validated.type === "SYN" && validated.to === this.id) {
						// ハッシュ検証
						const expectedHash = await this.concatHash(null, validated.payload);

						if (expectedHash !== validated.hash) {
							await generate("相手から不正な返答が返ってきました。");
							reject(false);
							return;
						}

						const response = await generate(
							`人から${validated.payload}と話しかけられました。あなたとして返答しましょう。`,
						);

						// SYN-ACK を送信
						const synAckHash = await this.concatHash(validated.hash, response);

						const synAckMessage: SYNACK = {
							type: "SYN-ACK",
							from: this.id,
							to: validated.from,
							payload: response,
							hash: synAckHash,
						};

						await this.transport.send(JSON.stringify(synAckMessage));

						resolve(true);
					}
				} catch (error) {
					reject(error);
				}
			};

			this.transport.onMessage(handler);
		});
	}
}
