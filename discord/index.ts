import { YAML } from "bun";
import { createTransitionMachine } from "core/engine";
import { CharacterSchema, type InputMessage } from "core/types";
import { Client } from "discord.js";
import { createActor } from "xstate";
import { Agent } from "./agent";
import { createDiscordMcpServer } from "./agent/mcp/discord";

const TICK = 2500;

const id = "polka";
const name = "高橋ポルカ";

const client = new Client({
	intents: ["Guilds", "GuildMessages", "MessageContent"],
});
client.login(process.env.DISCORD_TOKEN);

const mcp = createDiscordMcpServer(client);

async function setup(agent: Agent) {
	let char = Bun.file(`./data/${id}.yml`);
	if (!(await char.exists())) {
		await agent.generate();
		char = Bun.file(`./data/${id}.yml`);
	}
	const parsed = CharacterSchema.parse(YAML.parse(await char.text()));
	const actor = createActor(
		createTransitionMachine(parsed.transitions, parsed.params),
	);
	actor.start();
	return { actor };
}

const agent = new Agent(id, name, { discord: mcp });

const { actor } = await setup(agent);
const events: InputMessage[] = [];

const send = (event: string, data: unknown) => {
	actor.send({ type: "PROCESS_EVENT", eventType: event, eventData: data });
};

actor.subscribe(async (snapshot) => {
	console.log(snapshot.context.params);
});

setInterval(() => send("tick", { timestamp: Date.now() }), TICK);
setInterval(() => agent.refresh(events), 30 * 60 * 1000);

client.on("messageCreate", (message) => {
	if (!client.user) return;
	const isMentioned = message.mentions.users.has(client.user.id);
	const event = isMentioned ? "mention" : "msg";
	console.log(event, isMentioned);
	send(event, { from: message.author.displayName, content: message.content });
});
