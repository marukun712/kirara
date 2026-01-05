import z from "zod";

export const Message = z.object({
	id: z.hex(),
	type: z.string(),
	content: z.string(),
	importance: z.number().min(0).max(100),
});

export type MessageType = z.infer<typeof Message>;

export const Scan = z.object({
	type: z.enum(["req", "res"]),
	id: z.uuid(),
	from: z.hex(),
});

export type ScanType = z.infer<typeof Scan>;

export const HandShake = z.object({
	id: z.uuid(),
	from: z.hex(),
	content: z.string(),
	chain: z.hex().array(),
});

export type HandShakeType = z.infer<typeof HandShake>;
