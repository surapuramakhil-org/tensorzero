import type {
  ImageContent,
  ModelInferenceInput,
  ModelInferenceInputMessage,
  ModelInferenceInputMessageContent,
  ResolvedBase64Image,
  ResolvedInputMessageContent,
} from "./clickhouse/common";
import type { InputMessageContent } from "./clickhouse/common";
import type { ResolvedInputMessage } from "./clickhouse/common";
import type { InputMessage } from "./clickhouse/common";
import type { ResolvedInput } from "./clickhouse/common";
import type { Input } from "./clickhouse/common";
import { tensorZeroClient } from "./tensorzero.server";

export async function resolveInput(input: Input): Promise<ResolvedInput> {
  const resolvedMessages = await resolveMessages(input.messages);
  return {
    ...input,
    messages: resolvedMessages,
  };
}

export async function resolveModelInferenceInput(
  input: ModelInferenceInput,
): Promise<ResolvedInput> {
  const resolvedMessages = await resolveMessages(input.messages);
  return {
    ...input,
    messages: resolvedMessages,
  };
}

export async function resolveMessages(
  messages: InputMessage[],
): Promise<ResolvedInputMessage[]> {
  return Promise.all(
    messages.map(async (message) => {
      return resolveMessage(message);
    }),
  );
}

export async function resolveModelInferenceMessages(
  messages: ModelInferenceInputMessage[],
): Promise<ResolvedInputMessage[]> {
  return Promise.all(
    messages.map(async (message) => {
      return resolveModelInferenceMessage(message);
    }),
  );
}
async function resolveMessage(
  message: InputMessage,
): Promise<ResolvedInputMessage> {
  const resolvedContent = await Promise.all(
    message.content.map(async (content) => {
      return resolveContent(content);
    }),
  );
  return {
    ...message,
    content: resolvedContent,
  };
}

async function resolveModelInferenceMessage(
  message: ModelInferenceInputMessage,
): Promise<ResolvedInputMessage> {
  const resolvedContent = await Promise.all(
    message.content.map(async (content) => {
      return resolveModelInferenceContent(content);
    }),
  );
  return {
    ...message,
    content: resolvedContent,
  };
}

async function resolveContent(
  content: InputMessageContent,
): Promise<ResolvedInputMessageContent> {
  switch (content.type) {
    case "text":
    case "tool_call":
    case "tool_result":
    case "raw_text":
      return content;
    case "image":
      try {
        return {
          ...content,
          image: await resolveImage(content as ImageContent),
        };
      } catch (error) {
        return {
          type: "image_error",
          error: error instanceof Error ? error.message : String(error),
        };
      }
  }
}

async function resolveModelInferenceContent(
  content: ModelInferenceInputMessageContent,
): Promise<ResolvedInputMessageContent> {
  switch (content.type) {
    case "text":
      return {
        type: "text",
        value: content.text,
      };
    case "tool_call":
    case "tool_result":
    case "raw_text":
      return content;
    case "image":
      try {
        return {
          ...content,
          image: await resolveImage(content as ImageContent),
        };
      } catch (error) {
        return {
          type: "image_error",
          error: error instanceof Error ? error.message : String(error),
        };
      }
  }
}
async function resolveImage(
  content: ImageContent,
): Promise<ResolvedBase64Image> {
  const object = await tensorZeroClient.getObject(content.storage_path);
  const json = JSON.parse(object);
  const dataURL = `data:${content.image.mime_type};base64,${json.data}`;
  return {
    url: dataURL,
    mime_type: content.image.mime_type,
  };
}
