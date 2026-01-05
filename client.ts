import readline from "node:readline";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import WebSocket from "ws";
import type { MessageType } from "./src/schema";

const WS_URL = "ws://localhost:8080";

const ws = new WebSocket(WS_URL);
ws.on("message", (data) => {
	try {
		console.log(data.toString());
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
		const msg = {
			type: "event.message",
			content: message,
			importance: 100,
		};
		const hash = sha256(new TextEncoder().encode(JSON.stringify(msg)));
		const result: MessageType = {
			id: bytesToHex(hash),
			...msg,
		};
		ws.send(JSON.stringify(result));
	} catch (err) {
		console.error("Failed to send message:", err);
	}
}

rl.on("line", async (line) => {
	const trimmed = line.trim();
	if (trimmed) await sendMessage(trimmed);
});
