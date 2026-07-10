import { Client } from "langsmith";

import {
  DATASET_DESCRIPTION,
  DATASET_NAME,
  conversation1,
  conversation2,
  criteria1,
  criteria2,
} from "./fixtures.js";

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
      inputs: [{ messages: conversation1 }, { messages: conversation2 }],
      outputs: [{ criteria: criteria1 }, { criteria: criteria2 }],
    });

    console.log(`Created dataset "${DATASET_NAME}" with 2 examples`);
  } else {
    console.log(`Dataset "${DATASET_NAME}" already exists`);
  }

  return DATASET_NAME;
}
