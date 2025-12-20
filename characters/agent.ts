import { experimental_createMCPClient } from "@ai-sdk/mcp";
import { type LanguageModel, ToolLoopAgent } from "ai";
import type WebSocket from "ws";
import { kiraraServer } from "../src";
import { Message, type MessageType } from "./../src/schema/index";
import { WebSocketTransport } from "./../src/transports/websocket";

export class Agent {
	private agent: ToolLoopAgent;
	private isGenerating: boolean = false;

	constructor(agent: ToolLoopAgent, ws: WebSocket) {
		this.agent = agent;

		ws.on("message", (evt) => {
			const parsed = Message.safeParse(evt.toString());
			if (parsed.success) {
				this.generate(parsed.data);
			}
		});
	}

	static async initialize(
		name: string,
		prompt: string,
		model: LanguageModel,
		port: number,
		ws: WebSocket,
	) {
		const mcp = new kiraraServer({
			name,
			transport: new WebSocketTransport(ws),
		});
		mcp.serve(port);

		const client = await experimental_createMCPClient({
			transport: {
				type: "http",
				url: `http://localhost:${port}/mcp`,
			},
		});

		const tools = await client.tools();

		const agent = new ToolLoopAgent({
			model,
			instructions: prompt,
			tools,
		});
		return new Agent(agent, ws);
	}

	async generate(message: MessageType) {
		if (this.isGenerating) {
			return;
		}
		this.isGenerating = true;
		try {
			const { text } = await this.agent.generate({
				prompt: `${message.from}が${message.content}と発言しました。`,
			});
			console.log(text);
		} finally {
			this.isGenerating = false;
		}
	}
}
