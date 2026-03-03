import type { ServerWebSocket } from "bun";
import { config } from "../../data/config/config.ts";
import type { StateMachineEngine } from "../engine/index.ts";
import { InputMessageSchema, type OutputMessage } from "./messages.ts";

const clients = new Set<ServerWebSocket>();

export function createWebSocketServer(
	engine: StateMachineEngine,
	port: number = 8080,
) {
	return Bun.serve({
		port,

		fetch(req, server) {
			if (server.upgrade(req)) {
				return;
			}
			return new Response("WebSocket server", { status: 200 });
		},

		websocket: {
			open(ws) {
				clients.add(ws);
				console.log(`Client connected: ${ws.remoteAddress}`);

				const params = engine.getParams();
				for (const [name, value] of Object.entries(params)) {
					const msg: OutputMessage = {
						type: "output",
						parameter: name,
						value: value as number,
					};
					ws.send(JSON.stringify(msg));
				}
			},

			message(ws, rawMessage) {
				try {
					const message = JSON.parse(rawMessage as string);
					const input = InputMessageSchema.parse(message);

					const eventSchema =
						config.events[input.kind as keyof typeof config.events];
					if (!eventSchema) {
						ws.send(
							JSON.stringify({
								type: "error",
								message: `Unknown event type: ${input.kind}`,
							}),
						);
						return;
					}

					const validatedData = eventSchema.parse(input.data);

					const oldParams = engine.getParams();
					const newParams = engine.processEvent(input.kind, validatedData);

					for (const [name, newValue] of Object.entries(newParams)) {
						const oldValue = oldParams[name as keyof typeof oldParams];
						if (newValue !== oldValue) {
							const msg: OutputMessage = {
								type: "output",
								parameter: name,
								value: newValue as number,
							};

							const msgStr = JSON.stringify(msg);
							for (const client of clients) {
								client.send(msgStr);
							}
						}
					}
				} catch (error) {
					console.error("Message processing error:", error);
					ws.send(
						JSON.stringify({
							type: "error",
							message: error instanceof Error ? error.message : "Unknown error",
						}),
					);
				}
			},

			close(ws) {
				clients.delete(ws);
				console.log(`Client disconnected: ${ws.remoteAddress}`);
			},
		},
	});
}
