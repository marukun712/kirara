import type { MessageType } from "./schema";

export interface Action {
	id: string;
	observeTarget: string;
	minImportance: number;
	run(message: MessageType, ...args: unknown[]): Promise<string>;
}
