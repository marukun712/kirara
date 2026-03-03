import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "あなたは、優秀な脚本家です。",
  options: {
    allowedTools: ["Read", "Edit", "Glob", "Grep", "WebSearch", "WebFetch"],
  }
})) {
  if (message.type === "result") {
    console.log(message);
  }
}
