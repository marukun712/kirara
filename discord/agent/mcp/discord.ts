import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import type {
	Channel,
	ChannelType,
	Client,
	Guild,
	GuildTextBasedChannel,
	Message,
} from "discord.js";
import { z } from "zod";

export interface GuildInfo {
	id: string;
	name: string;
}

export interface ChannelInfo {
	id: string;
	name: string;
	type: ChannelType;
}

export interface MessageInfo {
	id: string;
	content: string;
	authorId: string;
}

export interface ChannelHistory {
	messages: MessageInfo[];
	cursor: string | null;
}

export interface IDiscordAPI {
	getGuildList(): Promise<GuildInfo[]>;
	getChannelList(guildId: string): Promise<ChannelInfo[]>;
	getChannelHistory(
		channelId: string,
		limit?: number,
		before?: string,
	): Promise<ChannelHistory>;
	postMessage(channelId: string, content: string): Promise<Message<true>>;
}

function isGuildTextChannel(
	channel: Channel | null,
): channel is GuildTextBasedChannel {
	return channel
		? channel.isTextBased() && channel.isDMBased() === false
		: false;
}

export class DiscordAPI implements IDiscordAPI {
	constructor(private readonly client: Client) {}

	async getGuildList(): Promise<GuildInfo[]> {
		const guilds = await this.client.guilds.fetch();
		const result: GuildInfo[] = [];

		for (const [, guildPreview] of guilds) {
			const guild: Guild = await guildPreview.fetch();
			result.push({
				id: guild.id,
				name: guild.name,
			});
		}

		return result;
	}

	async getChannelList(guildId: string): Promise<ChannelInfo[]> {
		const guild = await this.client.guilds.fetch(guildId);
		const channels = await guild.channels.fetch();
		const result: ChannelInfo[] = [];

		for (const [, channel] of channels) {
			if (!isGuildTextChannel(channel)) continue;

			result.push({
				id: channel.id,
				name: channel.name,
				type: channel.type,
			});
		}

		return result;
	}

	async getChannelHistory(
		channelId: string,
		limit = 50,
		before?: string,
	): Promise<ChannelHistory> {
		const channel = await this.client.channels.fetch(channelId);

		if (!isGuildTextChannel(channel)) {
			throw new Error("Channel is not a guild text channel");
		}

		const messages = await channel.messages.fetch({
			limit,
			before,
		});

		const list: MessageInfo[] = [];

		for (const [, m] of messages) {
			list.push({
				id: m.id,
				content: m.content,
				authorId: m.author.id,
			});
		}

		const id = list[list.length - 1]?.id;
		const cursor = list.length > 0 && id ? id : null;

		return {
			messages: list,
			cursor,
		};
	}

	async postMessage(
		channelId: string,
		content: string,
	): Promise<Message<true>> {
		const channel = await this.client.channels.fetch(channelId);

		if (!isGuildTextChannel(channel)) {
			throw new Error("Channel is not a guild text channel");
		}

		return channel.send({ content });
	}
}

export function createDiscordMcpServer(client: Client) {
	const api = new DiscordAPI(client);

	return createSdkMcpServer({
		name: "discord",
		version: "1.0.0",
		tools: [
			tool("get_guild_list", "Get guilds the bot belongs to", {}, async () => {
				const data = await api.getGuildList();
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(data),
						},
					],
				};
			}),

			tool(
				"get_channel_list",
				"Get channels in a guild",
				{
					guildId: z.string(),
				},
				async ({ guildId }) => {
					const data = await api.getChannelList(guildId);
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(data),
							},
						],
					};
				},
			),

			tool(
				"get_channel_history",
				"Get message history from a channel",
				{
					channelId: z.string(),
					limit: z.number().int().min(1).max(100).optional(),
					before: z.string().optional(),
				},
				async ({ channelId, limit, before }) => {
					const data = await api.getChannelHistory(channelId, limit, before);

					return {
						content: [
							{
								type: "text",
								text: JSON.stringify(data),
							},
						],
					};
				},
			),

			tool(
				"post_message",
				"Send a message to a channel",
				{
					channelId: z.string(),
					content: z.string(),
				},
				async ({ channelId, content }) => {
					const msg = await api.postMessage(channelId, content);

					return {
						content: [
							{
								type: "text",
								text: JSON.stringify({
									id: msg.id,
									content: msg.content,
									authorId: msg.author.id,
								}),
							},
						],
					};
				},
			),
		],
	});
}
