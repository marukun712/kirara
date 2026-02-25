import anthropic/message
import gleam/otp/actor

pub fn start() {
  actor.new([
    message.user_message(
      "あなたは、周囲を観察するエージェントです。あなたはOSコマンドを呼び出すことができます。/app/dataにスキルの一覧があるので、そこから必要だと感じたツールを使用して、情報を観察してください。",
    ),
  ])
  |> actor.on_message(handle_message)
  |> actor.start
}

pub fn handle_message(
  state: List(message.Message),
  message: Message,
) -> actor.Next(List(message.Message), Message) {
  case message {
    Ping -> {
      let req = state
      actor.continue(state)
    }
  }
}

pub type Message {
  Ping
}
