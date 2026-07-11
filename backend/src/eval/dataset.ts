import { Client } from "langsmith";

import {
  DATASET_DESCRIPTION,
  DATASET_NAME,
  scopingExamples,
  type SerializedMessage,
} from "./fixtures.js";

function firstHumanContent(messages: SerializedMessage[]): string {
  return messages.find((message) => message.type === "human")?.content ?? "";
}

export async function ensureScopingDataset(
  client: Client = new Client(),
): Promise<string> {
  const exists = await client.hasDataset({ datasetName: DATASET_NAME });

  if (!exists) {
    const dataset = await client.createDataset(DATASET_NAME, {
      description: DATASET_DESCRIPTION,
    });

    await client.createExamples({
      datasetId: dataset.id,
      inputs: scopingExamples.map((example) => ({ messages: example.messages })),
      outputs: scopingExamples.map((example) => ({ criteria: example.criteria })),
      metadata: scopingExamples.map((example) => ({ example_id: example.id })),
    });

    console.log(
      `Created dataset "${DATASET_NAME}" with ${scopingExamples.length} examples`,
    );
    return DATASET_NAME;
  }

  const existingIds = new Set<string>();
  const existingFirstMessages = new Set<string>();

  for await (const example of client.listExamples({
    datasetName: DATASET_NAME,
  })) {
    const id = example.metadata?.example_id;
    if (typeof id === "string") {
      existingIds.add(id);
    }

    const messages = example.inputs?.messages;
    if (Array.isArray(messages)) {
      const firstHuman = messages.find(
        (message) =>
          message &&
          typeof message === "object" &&
          "type" in message &&
          (message as SerializedMessage).type === "human" &&
          typeof (message as SerializedMessage).content === "string",
      ) as SerializedMessage | undefined;

      if (firstHuman?.content) {
        existingFirstMessages.add(firstHuman.content);
      }
    }
  }

  const missing = scopingExamples.filter((example) => {
    if (existingIds.has(example.id)) {
      return false;
    }
    // Avoid duplicating legacy examples created before example_id metadata.
    return !existingFirstMessages.has(firstHumanContent(example.messages));
  });

  if (missing.length === 0) {
    console.log(
      `Dataset "${DATASET_NAME}" already exists with all ${scopingExamples.length} examples`,
    );
    return DATASET_NAME;
  }

  await client.createExamples({
    datasetName: DATASET_NAME,
    inputs: missing.map((example) => ({ messages: example.messages })),
    outputs: missing.map((example) => ({ criteria: example.criteria })),
    metadata: missing.map((example) => ({ example_id: example.id })),
  });

  console.log(
    `Dataset "${DATASET_NAME}" already exists; added ${missing.length} new example(s): ${missing
      .map((example) => example.id)
      .join(", ")}`,
  );

  return DATASET_NAME;
}
