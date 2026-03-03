import type { ServerWebSocket } from "bun";
import { config } from "../../data/config/config.ts";
import type { StateMachineEngine } from "../engine/index.ts";
import { InputMessageSchema } from "./messages.ts";

const clients = new Set<ServerWebSocket>();

export function createWebSocketServer(
	engine: StateMachineEngine,
	port: number = 8080,
) {
	setInterval(() => {
		const params = engine.getParams();
		for (const [name, value] of Object.entries(params)) {
			const msg = JSON.stringify({
				type: "output",
				parameter: name,
				value: value as number,
			});
			for (const client of clients) {
				client.send(msg);
			}
		}
	}, 500);

	return Bun.serve({
		port,

		fetch(req, server) {
			if (server.upgrade(req)) return;
			return new Response("WebSocket server", { status: 200 });
		},

		websocket: {
			open(ws) {
				clients.add(ws);
			},

			message(_, rawMessage) {
				try {
					const message = JSON.parse(rawMessage as string);
					const input = InputMessageSchema.parse(message);
					const eventSchema =
						config.events[input.event as keyof typeof config.events];
					if (!eventSchema) return;
					const validatedData = eventSchema.parse(input.data);
					engine.processEvent(input.event, validatedData);
				} catch (e) {
					console.error(e);
				}
			},

			close(ws) {
				clients.delete(ws);
			},
		},
	});
}
