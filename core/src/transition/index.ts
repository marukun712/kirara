import { Environment } from "@marcbachmann/cel-js";
import { assign, createMachine } from "xstate";
import type { Params, Transition } from "../schema/index.ts";

export function createTransitionMachine(
	transitions: Transition[],
	params: Params,
) {
	const env = new Environment();
	env.registerVariable("event", "map");
	env.registerVariable("params", "map");

	return createMachine({
		context: {
			params: Object.fromEntries(
				Object.entries(params).map(([name, def]) => [name, def.initial]),
			),
			transitions,
		},
		on: {
			PROCESS_EVENT: {
				actions: assign({
					params: ({ context, event }) => {
						const matched = context.transitions.filter(
							(t) => t.event === event.eventType,
						);
						if (matched.length === 0) return context.params;
						const next = context.params;
						for (const t of matched) {
							try {
								const raw = env.evaluate(t.expression, {
									event: event.eventData,
									params: next,
								});
								const value = typeof raw === "bigint" ? Number(raw) : raw;
								next[t.parameter] = Math.min(1.0, Math.max(0.0, value));
							} catch (e) {
								console.error(e);
							}
						}
						return next;
					},
				}),
			},
			UPDATE_RULES: {
				actions: assign({
					transitions: ({ event }) => event.transitions,
				}),
			},
		},
	});
}
