import {
  computeFleetSummary,
  createInitialFleetState,
  get24hSeries,
} from "../../lib/sensor-platform.js";

export const GET = async () => {
  const state = createInitialFleetState();
  const summary = computeFleetSummary(state);
  const series24h = get24hSeries(state, { metric: "iaqs" });

  return new Response(
    JSON.stringify({
      summary,
      modules: state.modules,
      series24h,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    },
  );
};
