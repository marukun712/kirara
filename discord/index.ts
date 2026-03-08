import { YAML } from "bun";
import { evalActions } from "core/actions";
import { createTransitionMachine } from "core/engine";
import { CharacterSchema } from "core/types";
import { Client } from "discord.js";
import { Hono } from "hono";
import { createActor } from "xstate";
import { generate } from "./agent";

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
	createTransitionMachine(parsed.transitions, parsed.params),
);
actor.start();

actor.subscribe((snapshot) => {
	const value = evalActions(snapshot.context.params, parsed.actions);
	server.publish(
		TOPIC,
		JSON.stringify({
			type: "snapshot",
			params: snapshot.context.params,
			value: value,
		}),
	);
});

setInterval(
	() =>
		actor.send({
			type: "PROCESS_EVENT",
			kind: "tick",
			data: { timestamp: new Date().toISOString() },
		}),
	parsed.tick,
);

client.on("messageCreate", (message) => {
	if (!client.user) return;
	const isMentioned = message.mentions.users.has(client.user.id);
	const event = isMentioned ? "mention" : "msg";
	actor.send({
		type: "PROCESS_EVENT",
		kind: event,
		data: { from: message.author.displayName, content: message.content },
	});
});

const app = new Hono();
const html = await Bun.file("./views/index.html").text();
app.get("/", (c) => c.html(html));

const server = Bun.serve({
	port: 3000,
	hostname: "0.0.0.0",
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
