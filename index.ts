import readline from "node:readline";
import WebSocket from "ws";
import type { MessageType } from "./src/schema";

const WS_URL = "ws://localhost:8080";
const FROM_NAME = "user";

const ws = new WebSocket(WS_URL);

ws.on("message", (data) => {
	try {
		const msg = JSON.parse(data.toString());
		if (msg.type === "newMessage") {
			console.log(`[${msg.message.from}] ${msg.message.message}`);
		}
	} catch (err) {
		console.error("Failed to parse WS message:", err);
	}
});

ws.on("close", () => {
	console.log("WS connection closed");
});

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
	terminal: true,
	prompt: "> ",
});

async function sendMessage(message: string) {
	try {
		const msg: MessageType = {
			from: FROM_NAME,
			role: "user",
			content: message,
			consume: 0,
		};
		ws.send(JSON.stringify(msg));
	} catch (err) {
		console.error("Failed to send message:", err);
	}
}

rl.on("line", async (line) => {
	const trimmed = line.trim();
	if (trimmed) await sendMessage(trimmed);
});
