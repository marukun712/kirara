import { StreamableHTTPTransport } from "@hono/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Hono } from "hono";
import { upgradeWebSocket, websocket } from "hono/bun";
import type { BlankEnv, BlankSchema } from "hono/types";
import type { WSContext } from "hono/ws";
import z from "zod";
import { calculateResource } from "./lib/resource";
import { Message, type MessageType } from "./schema/index";
import type { Transport } from "./transport";

export class kiraraServer {
	app: Hono<BlankEnv, BlankSchema, "/">;
	name: string;
	transport: Transport;
	resource: number;
	messages: MessageType[];
	clients: Set<WSContext>;

	constructor(
		config: { name: string; transport: Transport },
		onSend?: (message: MessageType) => void,
		onReceive?: (message: MessageType) => void,
	) {
		this.app = new Hono();

		this.name = config.name;
		this.transport = config.transport;
		this.resource = 100;
		this.messages = [];
		this.clients = new Set<WSContext>();

		this.transport.listen((data: string) => {
			const parsed = Message.safeParse(JSON.parse(data));
			if (parsed.success) {
				onReceive?.(parsed.data);
				this.messages.push(parsed.data);
				this.resource += parsed.data.consume;
				this.clients.forEach((client) => {
					client.send(data);
				});
				console.log("Received message:", parsed.data);
			} else {
				console.error("Invalid message format:", parsed.error);
			}
		});

		setInterval(() => {
			this.resource += 10;
		}, 10000);

		const mcp = new McpServer({
			name: "kirara-mcp",
			version: "1.0.0",
		});

		mcp.registerTool(
			"outbox",
			{
				title: "outbox",
				description: "outboxにメッセージを追加します。",
				inputSchema: z.string(),
				outputSchema: {
					success: z.boolean(),
					resource: z.number(),
				},
			},
			async (input) => {
				const resource = calculateResource(this.messages);
				this.resource -= resource;
				if (resource < 0) {
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify({
									success: false,
									message:
										"Not enough resource. Please write a shorter message.",
								}),
							},
						],
						structuredContent: {
							success: false,
							message: "Not enough resource. Please write a shorter message.",
						},
					};
				}

				this.transport.send(input);

				onSend?.({
					from: this.name,
					role: "assistant",
					content: input,
					consume: resource,
				});

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify({
								success: true,
								message: "Message sent.",
							}),
						},
					],
					structuredContent: {
						success: true,
						message: "Message sent.",
					},
				};
			},
		);

		this.app.get(
			"/ws",
			upgradeWebSocket((_c) => {
				return {
					onOpen: (_, ws) => {
						this.clients.add(ws);
						console.log("Connection opened");
					},
					onClose: (_, ws) => {
						this.clients.delete(ws);
						console.log("Connection closed");
					},
				};
			}),
		);

		const t = new StreamableHTTPTransport();
		this.app.all("/mcp", async (c) => {
			if (!mcp.isConnected()) {
				await mcp.connect(t);
			}
			return t.handleRequest(c);
		});
	}

	serve(port = 3000) {
		Bun.serve({
			port,
			fetch: this.app.fetch,
			websocket,
		});

		console.log(`kiraraMCP listening on port ${port}`);
	}
}
