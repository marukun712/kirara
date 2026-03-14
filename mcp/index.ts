import { StreamableHTTPTransport } from "@hono/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { evalActions } from "core/actions";
import { createTransitionMachine } from "core/engine";
import { type Character, CharacterSchema } from "core/types";
import { Hono } from "hono";
import { createActor } from "xstate";
import z from "zod";

const mcpServer = new McpServer({ name: "kirara-simulator", version: "1.0.0" });
const transport = new StreamableHTTPTransport();

const TestCaseSchema = z.array(
	z.object({
		tick: z.number().min(0).max(300),
		kind: z.string(),
		data: z.record(z.string(), z.unknown()),
	}),
);
type TestCase = z.infer<typeof TestCaseSchema>;

const timelineItemSchema = z.object({
	tick: z.number(),
	event: z.string(),
	params: z.record(z.string(), z.number()),
	action: z.string().nullable(),
});

const timelineSchema = z.array(timelineItemSchema);
type Timeline = z.infer<typeof timelineSchema>;

export function simulate(testcase: TestCase, char: Character) {
	const TICKS = 300;

	const timeline: Timeline = [];

	const params = Object.fromEntries(
		Object.entries(char.params).map(([k, v]) => [k, v.normal]),
	);

	const actor = createActor(
		createTransitionMachine(char.transitions, char.params),
	);
	actor.start();

	const events = new Map<number, TestCase[number][]>();
	for (const e of testcase) {
		if (!events.has(e.tick)) events.set(e.tick, []);
		events.get(e.tick)?.push(e);
	}

	for (let i = 0; i < TICKS; i++) {
		actor.send({
			type: "PROCESS_EVENT",
			kind: "tick",
			data: { timestamp: new Date().toISOString() },
		});

		const list = events.get(i) ?? [];

		for (const ev of list) {
			actor.send({
				type: "PROCESS_EVENT",
				kind: ev.kind,
				data: ev.data,
			});
		}

		const currentParams = actor.getSnapshot().context.params;
		Object.assign(params, currentParams);

		const action = evalActions(params, char.actions);

		if (action && action !== "do_nothing") {
			actor.send({
				type: "PROCESS_EVENT",
				kind: "effect",
				data: { timestamp: new Date().toISOString() },
			});
		}

		if (i % 10 === 0 || list.length > 0) {
			timeline.push({
				tick: i,
				event: list.map((e) => e.kind).join(",") || "tick",
				params: Object.fromEntries(Object.entries(params)),
				action,
			});
		}
	}

	return timeline;
}

mcpServer.registerTool(
	"simulate_character",
	{
		title:
			"Kirara SKILLに従って設計したキャラクターコンフィグをシミュレーションします。",
		inputSchema: {
			testcase: TestCaseSchema,
			character: CharacterSchema,
		},
	},
	async ({ testcase, character }) => {
		const timeline = simulate(testcase, character);
		return {
			content: [{ type: "text", text: JSON.stringify(timeline, null, 2) }],
		};
	},
);

const app = new Hono();

app.all("/mcp", async (c) => {
	if (!mcpServer.isConnected()) {
		await mcpServer.connect(transport);
	}
	return transport.handleRequest(c);
});

Bun.serve({ fetch: app.fetch, port: 8080 });
console.log("MCP server started at http://localhost:8080");
