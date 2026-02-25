import anthropic/api
import anthropic/client
import anthropic/config
import anthropic/message
import anthropic/request.{with_tools}
import anthropic/tools.{
  build_tool_result_messages, extract_tool_calls, needs_tool_execution,
}
import anthropic/tools/builder.{
  add_string_param, build, tool_builder, with_description,
}
import gleam/list
import gleam/result

pub fn loop(text: String) {
  let cfg_result =
    config.config_options()
    |> config.with_base_url("http://litellm:4000")
    |> config.load_config()

  use cfg <- result.try(cfg_result)
  let bash_tool =
    tool_builder("bash")
    |> with_description("Bashでコマンドを実行")
    |> add_string_param("command", "実行するコマンド", True)
    |> build()

  let client = client.new(cfg)
  let request =
    request.new("claude-haiku-4-5", [message.user_message(text)], 2048)
    |> with_tools([bash_tool])

  let response = api.chat(client, request)
  use res <- result.try(response)

  case needs_tool_execution(res) {
    True -> {
      let tool_calls = extract_tool_calls(res)
      let results = list.map(tool_calls, fn(call) { call.input })
      let messages = build_tool_result_messages(response, results)
      let next_request = request.new("claude-haiku-4-5", messages, 2048)
      api.chat(client, next_request)
    }
    False -> response
  }
}
