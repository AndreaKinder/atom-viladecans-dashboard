import { evaluateScenario } from "../../lib/desition-engine.js";

export const POST = async ({ request }) => {
  try {
    const body = await request.json();
    const input = {
      escenarioId: String(body.escenarioId ?? "C03"),
      personasAfectadas: Number(body.personasAfectadas ?? 160),
      plazoMaximoDias: Number(body.plazoMaximoDias ?? 2),
      presupuestoTotalEur: Number(body.presupuestoTotalEur ?? 1729475),
      pctConexionRed: Number(body.pctConexionRed ?? 50),
    };
    const result = evaluateScenario(input);
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconegut";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};
