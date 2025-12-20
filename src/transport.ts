export interface Transport {
	name: string;
	send(data: string): Promise<void>;
	listen(onMessage: (data: string) => void): () => void;
}
