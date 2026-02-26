import agent/loop
import anthropic/message
import anthropic/request
import gleam/erlang/process.{type Subject}
import gleam/list
import gleam/otp/actor

pub type Message {
  Call(String, Subject(String))
}

pub fn handle_message(
  state: List(message.Message),
  msg: Message,
) -> actor.Next(List(message.Message), Message) {
  case msg {
    Call(text, reply_to) -> {
      let messages = list.append(state, [message.user_message(text)])
      case loop.loop("claude-haiku-4-5", messages, []) {
        Ok(response) -> {
          let text = request.response_text(response)
          let next_state =
            list.append(messages, [message.assistant_message(text)])
          process.send(reply_to, text)
          actor.continue(next_state)
        }
        Error(_) -> {
          process.send(reply_to, "error")
          actor.continue(state)
        }
      }
    }
  }
}
