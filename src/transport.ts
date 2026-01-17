export interface Transport {
	send(data: string): Promise<void>;
	onMessage(callback: (data: string) => void): void;
}
