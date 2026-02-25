defmodule Main do
  def start() do
    Observer.start_link()
    Observer.ping()
  end
end
