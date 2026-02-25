import type {
	Channel,
	ChannelType,
	Client,
	Guild,
	GuildTextBasedChannel,
} from "discord.js";

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
	author: string;
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

		for (const [_, channel] of channels) {
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

		for (const [_, m] of messages) {
			list.push({
				id: m.id,
				content: m.content,
				author: m.author.username,
			});
		}

		const id = list[list.length - 1]?.id;
		const cursor = list.length > 0 && id ? id : null;
		return { messages: list, cursor };
	}
}
