import type { Message } from "./schema";

export interface Action {
	id: string;
	observeTarget: string;
	minImportance: number;
	onEvent(event: Message): Promise<void> | void;
}
