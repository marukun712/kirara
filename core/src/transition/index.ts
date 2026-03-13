import { evaluate } from "mathjs";
import { assign, createMachine } from "xstate";
import type { Params, Transition } from "../schema/index.ts";

export function createTransitionMachine(
	transitions: Transition[],
	params: Params,
) {
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
							(t) => t.on === event.kind,
						);
						if (matched.length === 0) return context.params;
						const next = { ...context.params };
						for (const t of matched) {
							try {
								const value = evaluate(t.expression, {
									event: event.data,
									params: next,
								});
								next[t.param] = value;
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
