import { YAML } from "bun";
import { createTransitionMachine } from "core/engine";
import { CharacterSchema, type InputMessage } from "core/types";
import { Client } from "discord.js";
import { Hono } from "hono";
import { createActor } from "xstate";
import { generate, refresh } from "./agent";

const TICK = 10;
const TOPIC = "logs";
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
	createTransitionMachine(parsed, () => {
		console.log("呼び出し");
	}),
);
actor.start();

const events: InputMessage[] = [];

actor.subscribe((snapshot) => {
	server.publish(
		TOPIC,
		JSON.stringify({
			type: "snapshot",
			params: snapshot.context.params,
			value: snapshot.value,
		}),
	);
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
setInterval(() => refresh(id, name, events), 5 * 60 * 1000);

client.on("messageCreate", (message) => {
	if (!client.user) return;
	const isMentioned = message.mentions.users.has(client.user.id);
	const event = isMentioned ? "mention" : "msg";
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

const app = new Hono();
const html = await Bun.file("./views/index.html").text();
app.get("/", (c) => c.html(html));

const server = Bun.serve({
	port: 3000,
	fetch(req, server) {
		if (req.headers.get("upgrade") === "websocket") {
			if (server.upgrade(req)) return;
		}
		return app.fetch(req);
	},
	websocket: {
		open(ws) {
			ws.subscribe(TOPIC);
		},
		close(ws) {
			ws.unsubscribe(TOPIC);
		},
		message() {},
	},
});
