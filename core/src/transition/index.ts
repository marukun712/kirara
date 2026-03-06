import { Environment } from "@marcbachmann/cel-js";
import { assign, cancel, createMachine, raise } from "xstate";
import type { Character } from "../schema/index.ts";

export function createTransitionMachine(
	character: Character,
	trigger: (ctx: string[]) => void,
) {
	const env = new Environment();
	env.registerVariable("event", "map");
	env.registerVariable("params", "map");

	const checkParams = (expr: string, params: Record<string, number>) => {
		const raw = env.evaluate(expr, { params });
		return typeof raw === "bigint" ? Number(raw) : raw;
	};

	return createMachine(
		{
			context: {
				params: Object.fromEntries(
					Object.entries(character.params).map(([name, def]) => [
						name,
						def.initial,
					]),
				),
				transitions: character.transitions,
				conditions: character.conditions,
				CURRENT_CONTEXT: [] as string[],
			},
			initial: "idle",
			states: {
				idle: {
					on: {
						PROCESS_EVENT: {
							guard: "checkActive",
							target: "active",
						},
					},
				},
				active: {
					on: {
						PROCESS_EVENT: {
							guard: "checkIdle",
							target: "idle",
						},
						ON_MESSAGE: {
							actions: [
								"pushContext",
								cancel("triggerTimer"),
								raise(
									{ type: "TRIGGER" },
									{ delay: "TRIGGER_DELAY", id: "triggerTimer" },
								),
							],
						},
						TRIGGER: {
							actions: "callTrigger",
						},
					},
				},
			},
			on: {
				PROCESS_EVENT: {
					actions: "updateParams",
				},
				UPDATE_RULES: {
					actions: assign({
						transitions: ({ event }) => event.transitions,
						conditions: ({ event }) => event.conditions,
					}),
				},
			},
		},
		{
			delays: {
				TRIGGER_DELAY: 5000,
			},
			guards: {
				checkActive: ({ context }) =>
					context.conditions.some((c: string) => {
						try {
							return !!checkParams(c, context.params);
						} catch {
							return false;
						}
					}),
				checkIdle: ({ context }) =>
					!context.conditions.some((c: string) => {
						try {
							return !!checkParams(c, context.params);
						} catch {
							return false;
						}
					}),
			},
			actions: {
				updateParams: assign({
					params: ({ context, event }) => {
						const matched = context.transitions.filter(
							(t) => t.event === event.eventType,
						);
						if (matched.length === 0) return context.params;
						const next = { ...context.params };
						for (const t of matched) {
							try {
								const raw = env.evaluate(t.expression, {
									event: event.eventData,
									params: next,
								});
								const value = typeof raw === "bigint" ? Number(raw) : raw;
								next[t.parameter] = Math.min(1, Math.max(0, value));
							} catch (e) {
								console.error(e);
							}
						}
						return next;
					},
				}),
				pushContext: assign({
					CURRENT_CONTEXT: ({ context, event }) => {
						return context.CURRENT_CONTEXT.concat(event.eventData.content);
					},
				}),
				callTrigger: ({ context }) => {
					trigger(context.CURRENT_CONTEXT);
				},
			},
		},
	);
}
