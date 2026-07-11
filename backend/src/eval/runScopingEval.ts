import "dotenv/config";

import { Client } from "langsmith";
import { evaluate } from "langsmith/evaluation";

import { ensureScopingDataset } from "./dataset.js";
import { evaluateNoAssumptions, evaluateSuccessCriteria } from "./evaluators.js";
import { DATASET_NAME } from "./fixtures.js";
import { scopingTarget } from "./target.js";

async function main() {
  if (!process.env.LANGSMITH_API_KEY) {
    throw new Error("LANGSMITH_API_KEY is required to run the scoping evaluation");
  }
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required (target + LLM-as-judge evaluators)");
  }

  const client = new Client();
  await ensureScopingDataset(client);

  console.log(`Running experiment on dataset "${DATASET_NAME}"...`);

  const results = await evaluate(scopingTarget, {
    data: DATASET_NAME,
    evaluators: [evaluateSuccessCriteria, evaluateNoAssumptions],
    experimentPrefix: "Deep Research Scoping",
    maxConcurrency: 2,
    client,
  });

  console.log("Evaluation complete.");
  console.log(results);
}

main().catch((error) => {
  console.error("Scoping evaluation failed:", error);
  process.exit(1);
});
