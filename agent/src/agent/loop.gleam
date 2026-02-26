import anthropic/api
import anthropic/client
import anthropic/config
import anthropic/message
import anthropic/request.{with_tools}
import anthropic/tool.{type Tool, tool_name_to_string}
import anthropic/tools.{
  build_tool_result_messages, dispatch_tool_calls, extract_tool_calls,
  needs_tool_execution,
}
import gleam/list
import gleam/result

pub type AgentTool {
  AgentTool(tool: Tool, handler: fn(String) -> Result(String, String))
}

pub fn loop(model, messages: List(message.Message), tools: List(AgentTool)) {
  use cfg <- result.try(
    config.config_options()
    |> config.with_base_url("http://litellm:4000")
    |> config.load_config(),
  )

  let client = client.new(cfg)

  let tool_list = list.map(tools, fn(t) { t.tool })
  let handlers =
    list.map(tools, fn(t) { #(tool_name_to_string(t.tool.name), t.handler) })

  do_loop(model, client, messages, tool_list, handlers)
}

fn do_loop(model, client, messages, tools, handlers) {
  let req =
    request.new(model, messages, 2048)
    |> with_tools(tools)

  use response <- result.try(api.chat(client, req))

  case needs_tool_execution(response) {
    False -> Ok(response)
    True -> {
      let calls = extract_tool_calls(response)
      let results = dispatch_tool_calls(calls, handlers)
      let next_messages =
        build_tool_result_messages(messages, response, results)
      do_loop(model, client, next_messages, tools, handlers)
    }
  }
}
