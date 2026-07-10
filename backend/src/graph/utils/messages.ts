import type { BaseMessage } from "@langchain/core/messages";

export function formatMessages(messages: BaseMessage[]): string {
  if (messages.length === 0) {
    return "(no messages yet)";
  }

  return messages
    .map((message) => {
      const content =
        typeof message.content === "string"
          ? message.content
          : JSON.stringify(message.content);

      return `${message.getType()}: ${content}`;
    })
    .join("\n\n");
}
