import { YAML } from "bun";
import { evalActions } from "core/actions";
import { createTransitionMachine } from "core/engine";
import { CharacterSchema } from "core/types";
import { Client } from "discord.js";
import { Hono } from "hono";
import { createActor } from "xstate";
import { Actor } from "./agent/actor";
import { createDiscordMcpServer } from "./agent/mcp/discord";

const TOPIC = "logs";
const id = "polka";
const name = "高橋ポルカ";

const client = new Client({
	intents: ["Guilds", "GuildMessages", "MessageContent"],
});
client.login(process.env.DISCORD_TOKEN);

const char = Bun.file(`./data/${id}.yml`);
if (!(await char.exists())) {
	throw new Error("Config not found");
}
const parsed = CharacterSchema.parse(YAML.parse(await char.text()));
const actor = createActor(
	createTransitionMachine(parsed.transitions, parsed.params),
);
actor.start();
const actorAgent = new Actor(id, name, {
	discord: createDiscordMcpServer(client),
});

let isActing = false;

actor.subscribe(async (snapshot) => {
	if (isActing) return;

	const value = evalActions(snapshot.context.params, parsed.actions);

	if (value && value !== "do_nothing") {
		server.publish(
			TOPIC,
			JSON.stringify({
				type: "action",
				value,
				time: new Date().toISOString(),
			}),
		);
		isActing = true;
		try {
			switch (value) {
				case "watch_discord":
					await actorAgent.act("暇になってきたので、Discordをじっと見ます。");
					break;
				case "post_to_discord":
					await actorAgent.act(
						"暇になってきたので、Discordをみてしゃべります。",
					);
					break;
				case "browse_web":
					await actorAgent.act(
						"暇になってきたので、Web検索をして時間つぶしをします。",
					);
					break;
			}
		} finally {
			actor.send({
				type: "PROCESS_EVENT",
				kind: "effect",
				data: { timestamp: new Date().toISOString() },
			});
			isActing = false;
		}
	}
});

actor.subscribe(async (snapshot) => {
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
console.log("Status viewer started at http://localhost:3000");
