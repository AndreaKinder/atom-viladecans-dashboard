import { loadDataset } from "../../lib/decision-engine.js";

export const GET = async () => {
  const { cases } = loadDataset();
  return new Response(JSON.stringify(cases), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
