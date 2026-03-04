import { Environment } from "@marcbachmann/cel-js";
import z from "zod";

export const ActionSchema = z.object({
	expression: z.string(),
	on: z.string(),
	description: z.string().optional(),
});

export const ActionsSchema = z.object({
	version: z.string(),
	description: z.string().optional(),
	actions: z.array(ActionSchema),
});

type Actions = z.infer<typeof ActionsSchema>;

export class ActionListener {
	private env: Environment;
	private actions: Actions;

	constructor(actions: Actions) {
		this.actions = actions;
		this.env = new Environment();
		this.env.registerVariable("params", "map");
	}

	check(params: Record<string, number>): string[] {
		return this.actions.actions
			.filter((a) => {
				try {
					return this.env.evaluate(a.expression, { params });
				} catch {
					return false;
				}
			})
			.map((a) => a.on);
	}
}
