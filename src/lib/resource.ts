import type { MessageType } from "../schema";

export function calculateResource(messages: MessageType[]) {
	const message = messages[messages.length - 1];
	if (!message?.content) return 0;
	const length = message.content.length;
	const resource = Math.floor(
		(Math.log10(length + 1) / Math.log10(1000)) * 100,
	);
	return Math.min(Math.max(resource, 0), 100);
}
