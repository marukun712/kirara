import type { StatesConfig } from "../schema/index.ts";

interface ValidationIssue {
	type: "error" | "warning";
	message: string;
}

export interface ValidationResult {
	valid: boolean;
	issues: ValidationIssue[];
}

export function validate(cfg: StatesConfig): ValidationResult {
	const issues: ValidationIssue[] = [];

	for (const transition of cfg.transitions) {
		if (!transition.condition || transition.condition.trim() === "") {
			issues.push({
				type: "error",
				message: "Transition has empty condition",
			});
		}

		if (!transition.action.name || transition.action.name.trim() === "") {
			issues.push({
				type: "error",
				message: "Transition has empty action name",
			});
		}

		if (
			!transition.action.context ||
			Object.keys(transition.action.context).length === 0
		) {
			issues.push({
				type: "warning",
				message: `Action "${transition.action.name}" has no context`,
			});
		}
	}

	const actionNames = cfg.transitions.map((t) => t.action.name);
	const uniqueActions = new Set(actionNames);
	if (actionNames.length !== uniqueActions.size) {
		issues.push({
			type: "warning",
			message: "Duplicate action names found",
		});
	}

	return {
		valid: issues.every((i) => i.type !== "error"),
		issues,
	};
}
