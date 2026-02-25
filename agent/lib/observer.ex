defmodule Observer do
  use GenServer

  def start_link() do
    GenServer.start_link(
      __MODULE__,
      ReqLLM.Context.new([
        ReqLLM.Context.system("あなたは、周囲を観察するエージェントです。ケーパビリティを確認し、コマンドを実行して周囲を観察、その結果を返却します。")
      ]),
      name: __MODULE__
    )
  end

  def init(state), do: {:ok, state}

  def handle_call(:ping, _from, state) do
    state = ReqLLM.Context.append(state, ReqLLM.Context.user("あなたに通知がありました"))
    state = Module.Agent.run(state, Module.Agent.bash_tools())
    last_message = state.messages |> List.last()
    {:reply, last_message, state}
  end

  def ping, do: GenServer.call(__MODULE__, :ping)
end
