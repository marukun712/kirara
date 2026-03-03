import { config } from "../../data/config/config.ts";
import type { Transitions } from "../dsl/schema.ts";

interface ValidationIssue {
	type: "error" | "warning";
	message: string;
}

export interface ValidationResult {
	valid: boolean;
	issues: ValidationIssue[];
}

export function validate(cfg: Transitions): ValidationResult {
	const issues: ValidationIssue[] = [];

	const validEventTypes = new Set(Object.keys(config.events));
	const validParameters = new Set(Object.keys(config.parameters));

	const usedParameters = new Set<string>();

	for (const t of cfg.transitions) {
		if (!validEventTypes.has(t.event)) {
			issues.push({
				type: "error",
				message: `Unknown event type: "${t.event}". Valid types: ${Array.from(validEventTypes).join(", ")}`,
			});
		}

		if (!validParameters.has(t.parameter)) {
			issues.push({
				type: "error",
				message: `Unknown parameter: "${t.parameter}". Valid parameters: ${Array.from(validParameters).join(", ")}`,
			});
		} else {
			usedParameters.add(t.parameter);
		}
	}

	for (const param of validParameters) {
		if (!usedParameters.has(param)) {
			issues.push({
				type: "warning",
				message: `Parameter "${param}" defined in config but not used in transitions`,
			});
		}
	}

	return {
		valid: issues.every((i) => i.type !== "error"),
		issues,
	};
}
