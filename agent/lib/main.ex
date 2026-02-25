defmodule Main do
  Observer.start_link()
  Observer.ping()
end
