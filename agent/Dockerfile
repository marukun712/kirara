FROM elixir:latest

WORKDIR /app

COPY data/ ./
COPY mix.exs mix.lock ./

RUN mix deps.get

COPY . .

RUN mix compile

CMD ["mix", "run", "-e", "Main.start()"]
