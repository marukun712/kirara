import { Environment } from "@marcbachmann/cel-js";
import { createActor, setup } from "xstate";
import type { ParameterValues } from "../../transition/types.ts";
import type { Action, StatesConfig } from "../schema/index.ts";

export class StateEngine {
	private config: StatesConfig;
	private env: Environment;
	private actor: ReturnType<typeof createActor>;
	private latestParams: ParameterValues | null = null;

	constructor(config: StatesConfig) {
		this.config = config;
		this.env = new Environment();
		this.env.registerVariable("params", "map");

		const machine = setup({
			types: {} as {
				context: { pendingAction: Action | null };
				events:
					| { type: "PARAMS_UPDATE"; params: ParameterValues }
					| { type: "ACTION_COMPLETE" };
			},
			delays: {
				debounce: 100,
			},
		}).createMachine({
			id: "state",
			initial: "idle",
			context: {
				pendingAction: null,
			},
			states: {
				idle: {
					on: {
						PARAMS_UPDATE: {
							target: "evaluating",
							actions: ({ event }) => {
								this.latestParams = event.params;
							},
						},
					},
				},
				evaluating: {
					after: {
						debounce: {
							target: "deciding",
						},
					},
					on: {
						PARAMS_UPDATE: {
							target: "evaluating",
							reenter: true,
							actions: ({ event }) => {
								this.latestParams = event.params;
							},
						},
					},
				},
				deciding: {
					always: [
						{
							guard: () => {
								const action = this.evaluateAction();
								if (action) {
									this.actor.getSnapshot().context.pendingAction = action;
									return true;
								}
								return false;
							},
							target: "action",
						},
						{
							target: "idle",
						},
					],
				},
				action: {
					on: {
						ACTION_COMPLETE: "idle",
					},
				},
			},
		});

		this.actor = createActor(machine);
		this.actor.start();
	}

	processParameters(params: ParameterValues): Action | null {
		this.actor.send({ type: "PARAMS_UPDATE", params });

		const snapshot = this.actor.getSnapshot();
		if (snapshot.value === "action" && snapshot.context.pendingAction) {
			const action = snapshot.context.pendingAction;
			snapshot.context.pendingAction = null;
			return action;
		}

		return null;
	}

	private evaluateAction(): Action | null {
		if (!this.latestParams) return null;

		for (const transition of this.config.transitions) {
			try {
				const result = this.env.evaluate(transition.condition, {
					params: this.latestParams,
				});

				if (result) {
					return transition.action;
				}
			} catch (error) {
				console.error(
					`Condition evaluation failed: ${transition.condition}`,
					error,
				);
			}
		}

		return null;
	}

	completeAction(): void {
		this.actor.send({ type: "ACTION_COMPLETE" });
	}

	getCurrentState(): string {
		return String(this.actor.getSnapshot().value);
	}

	updateRules(newConfig: StatesConfig): void {
		this.config = newConfig;
	}
}
