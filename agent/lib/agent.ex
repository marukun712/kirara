defmodule Module.Agent do
  @model "anthropic:claude-haiku-4-5"

  def run(context, tools) do
    context
    |> loop(tools)
  end

  defp loop(context, tools) do
    case ReqLLM.generate_text(@model, context, tools: tools) do
      {:ok, response} ->
        updated = ReqLLM.Context.merge_response(context, response)
        IO.inspect(updated, label: "Updated context")

        case ReqLLM.Response.tool_calls(updated) do
          [] ->
            updated

          tool_calls ->
            updated.context
            |> ReqLLM.Context.execute_and_append_tools(tool_calls, tools)
            |> loop(tools)
        end

      {:error, reason} ->
        {:error, reason}
    end
  end

  def bash_tools() do
    ReqLLM.tool(
      name: "bash_tool",
      description: "コマンドを実行する",
      parameter_schema: [
        command: [type: :string, required: true, doc: "Command"]
      ],
      callback: fn %{command: command} ->
        result = :os.cmd(to_charlist(command)) |> to_string()
        {:ok, result}
      end
    )
  end
end
