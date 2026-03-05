import { YAML } from "bun";
import { createEventEmitter } from "core/emitter";
import { TransitionEngine } from "core/engine";
import { ActionListener } from "core/listener";
import {
	CharacterSchema,
	type InputMessage,
	type OutputMessage,
} from "core/types";
import { Client } from "discord.js";
import { generate, id, refresh } from "./agent/writer.ts";
import { config } from "./data/config/config.ts";

const createClient = (token?: string) => {
	const client = new Client({
		intents: ["Guilds", "GuildMessages", "MessageContent"],
	});
	client.login(token);
	return client;
};

const client = createClient(process.env.DISCORD_TOKEN);

async function setup() {
	let char = Bun.file(`./data/${id}.yml`);
	const exists = await char.exists();
	if (!exists) {
		await generate();
		char = Bun.file(`./data/${id}.yml`);
	}

	const text = await char.text();
	const parsed = CharacterSchema.parse(YAML.parse(text));

	const transitionEngine = new TransitionEngine(
		parsed.transitions,
		parsed.params,
	);
	const listener = new ActionListener(parsed.actions);
	const transitionsEmitter = createEventEmitter(transitionEngine, config);

	return { transitionsEmitter, listener };
}

const { transitionsEmitter, listener } = await setup();

const events: InputMessage[] = [];

transitionsEmitter.on("output", (output: OutputMessage) => {
	console.log(output);
	const res = listener.check(output.parameter);
	console.log(res);
});

setInterval(async () => {
	await refresh(events);
}, 50000);

setInterval(() => {
	const event: InputMessage = {
		type: "input",
		event: "tick",
		data: { timestamp: Date.now() },
	};
	transitionsEmitter.emit("input", JSON.stringify(event));
}, 1000);

client.on("messageCreate", (message) => {
	if (message.author.bot) return;

	const isMentioned = message.mentions.users.has(client.user?.id ?? "");

	if (isMentioned) {
		const event: InputMessage = {
			type: "input",
			event: "mention",
			data: { from: message.author.displayName, content: message.content },
		};
		transitionsEmitter.emit("input", JSON.stringify(event));
		return;
	} else {
		const event: InputMessage = {
			type: "input",
			event: "msg",
			data: { from: message.author.displayName, content: message.content },
		};
		transitionsEmitter.emit("input", JSON.stringify(event));
	}
});
