import z from "zod";

export const ParameterRuleSchema = z.object({
	parameter: z.string(),
	expression: z.string(),
	description: z.string().optional(),
});

export const YAMLDSLSchema = z.object({
	version: z.string(),
	description: z.string().optional(),
	rules: z.record(z.string(), z.array(ParameterRuleSchema)),
});

export type ParameterRule = z.infer<typeof ParameterRuleSchema>;
export type YAMLDSL = z.infer<typeof YAMLDSLSchema>;
