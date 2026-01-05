import type { MessageType } from "./schema/index";
export interface Transport {
	name: string;
	send(data: string): Promise<void>;
	observe(onMessage: (data: MessageType) => void): () => void;
}
