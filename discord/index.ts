import { YAML } from "bun";
import { createEventEmitter } from "core/emitter";
import { TransitionEngine } from "core/engine";
import type { InputMessage, OutputMessage } from "core/types";
import { TransitionsSchema } from "core/types";
import { Client } from "discord.js";
import { ActionListener, ActionsSchema } from "../core/src/actions/index.ts";
import { generate, refresh } from "./agent/writer.ts";
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
	let transitionsFile = Bun.file("./data/transitions.yml");
	let actionsFile = Bun.file("./data/actions.yml");

	const exists =
		(await transitionsFile.exists()) && (await actionsFile.exists());

	if (!exists) {
		await generate();
		transitionsFile = Bun.file("./data/transitions.yml");
		actionsFile = Bun.file("./data/actions.yml");
	}

	const transitionsText = await transitionsFile.text();
	const transitionsConfig = TransitionsSchema.parse(
		YAML.parse(transitionsText),
	);
	const actionsText = await actionsFile.text();
	const actionsConfig = ActionsSchema.parse(YAML.parse(actionsText));

	const transitionEngine = new TransitionEngine(transitionsConfig, config);
	const listener = new ActionListener(actionsConfig);
	const transitionsEmitter = createEventEmitter(transitionEngine, config);

	return { transitionsEmitter, listener };
}

const { transitionsEmitter, listener } = await setup();

const events: InputMessage[] = [];

transitionsEmitter.on("output", (output: OutputMessage) => {
	const res = listener.check(output.parameter);
	console.log(res);
});

setInterval(async () => {
	await refresh(events);
}, 5000);

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
