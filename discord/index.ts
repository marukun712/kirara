import { YAML } from "bun";
import { createTransitionMachine } from "core/engine";
import { CharacterSchema, type InputMessage } from "core/types";
import { Client } from "discord.js";
import { createActor } from "xstate";
import { generate, refresh } from "./agent";

const TICK = 2500;

const id = "polka";
const name = "高橋ポルカ";

const client = new Client({
	intents: ["Guilds", "GuildMessages", "MessageContent"],
});
client.login(process.env.DISCORD_TOKEN);

let char = Bun.file(`./data/${id}.yml`);
if (!(await char.exists())) {
	await generate(id, name);
	char = Bun.file(`./data/${id}.yml`);
}
const parsed = CharacterSchema.parse(YAML.parse(await char.text()));
const actor = createActor(
	createTransitionMachine(parsed, (ctx) => {
		console.log(ctx);
	}),
);
actor.start();

const events: InputMessage[] = [];

actor.subscribe(async (snapshot) => {
	console.log(snapshot.context.params, snapshot.value);
});

setInterval(
	() =>
		actor.send({
			type: "PROCESS_EVENT",
			eventType: "tick",
			eventData: { timestamp: new Date().toISOString() },
		}),
	TICK,
);
setInterval(() => refresh(id, name, events), 30 * 60 * 1000);

client.on("messageCreate", (message) => {
	if (!client.user) return;
	const isMentioned = message.mentions.users.has(client.user.id);
	const event = isMentioned ? "mention" : "msg";
	console.log(event, isMentioned);
	actor.send({
		type: "PROCESS_EVENT",
		eventType: event,
		eventData: { from: message.author.displayName, content: message.content },
	});
	actor.send({
		type: "ON_MESSAGE",
		eventType: event,
		eventData: { content: message.content },
	});
});
