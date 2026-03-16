import { Actor, AgentLoop, Planner } from "core";
import { Client } from "discord.js";

const client = new Client({
	intents: ["Guilds", "GuildMessages", "MessageContent"],
});
client.login(process.env.DISCORD_TOKEN);
if (!process.env.OBSIDIAN_API_KEY || !process.env.DISCORD_TOKEN) {
	throw new Error("Invalid API Key");
}

const planner = new Planner({
	discord: {
		command: "podman",
		args: [
			"run",
			"--rm",
			"-i",
			"-e",
			`DISCORD_TOKEN=${process.env.DISCORD_TOKEN}`,
			"saseq/discord-mcp:latest",
		],
	},
	"obsidian-mcp-server": {
		command: "bunx",
		args: ["obsidian-mcp-server"],
		env: {
			OBSIDIAN_API_KEY: process.env.OBSIDIAN_API_KEY,
			OBSIDIAN_BASE_URL: "http://127.0.0.1:27123",
			OBSIDIAN_VERIFY_SSL: "false",
			OBSIDIAN_ENABLE_CACHE: "true",
		},
	},
});

const actor = new Actor({
	discord: {
		command: "podman",
		args: [
			"run",
			"--rm",
			"-i",
			"-e",
			`DISCORD_TOKEN=${process.env.DISCORD_TOKEN}`,
			"saseq/discord-mcp:latest",
		],
	},
	"obsidian-mcp-server": {
		command: "bunx",
		args: ["obsidian-mcp-server"],
		env: {
			OBSIDIAN_API_KEY: process.env.OBSIDIAN_API_KEY,
			OBSIDIAN_BASE_URL: "http://127.0.0.1:27123",
			OBSIDIAN_VERIFY_SSL: "false",
			OBSIDIAN_ENABLE_CACHE: "true",
		},
	},
});

const loop = new AgentLoop(planner, actor);
loop.start();

client.on("messageCreate", async (message) => {
	if (!client.user) return;
	// 健康的
	const hour = new Date().getHours();
	if (hour < 9 || hour > 24) return;
	// メンション時かつbusyでないときは応答する
	if (message.mentions.users.has(client.user.id)) {
		loop.ctx += `${message.author.id}:${message.author.displayName}があなたにメンションをしました\n`;
		await actor.act("メンションの通知音が聞こえたので、確認する。", loop.ctx);
		loop.ctx = "";
	}
});
