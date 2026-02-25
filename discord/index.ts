import { Client } from "discord.js";
import { Hono } from "hono";
import { DiscordAPI } from "./lib/discord";

const app = new Hono();

const createClient = (token?: string) => {
	const client = new Client({
		intents: ["Guilds", "GuildMessages", "MessageContent"],
	});
	client.login(token);
	return client;
};

const client = createClient(process.env.POLKA_TOKEN);
const api = new DiscordAPI(client);

app.get("/guilds", async (c) => {
	const guilds = await api.getGuildList();
	return c.json(guilds);
});

app.get("/guilds/:guildId/channels", async (c) => {
	const guildId = c.req.param("guildId");
	const channels = await api.getChannelList(guildId);
	return c.json(channels);
});

app.get("/channels/:channelId/messages", async (c) => {
	const channelId = c.req.param("channelId");
	const limit = Number(c.req.query("limit") || 50);
	const before = c.req.query("before") || undefined;
	const history = await api.getChannelHistory(channelId, limit, before);
	return c.json(history);
});

export default app;
