import assert from "node:assert/strict";
import test from "node:test";
import {
  acknowledgeAlert,
  answerFleetQuestion,
  applyModuleControl,
  calculateLicensingQuote,
  computeFleetSummary,
  computeModuleIaqs,
  createInitialFleetState,
  get24hSeries,
  resolveAlert,
} from "../src/lib/sensor-platform.js";

test("ATOM Plataforma de Sensores", async (t) => {
  await t.test("createInitialFleetState carga 8 módulos desplegados con índice IAQS", () => {
    const state = createInitialFleetState();
    assert.equal(state.modules.length, 8);
    const online = state.modules.filter((m) => m.status === "online");
    const offline = state.modules.filter((m) => m.status === "offline");
    assert.equal(online.length, 7);
    assert.equal(offline.length, 1);
    for (const m of online) {
      assert.ok(m.iaqs.score >= 1 && m.iaqs.score <= 10);
      assert.ok(m.sensors.co2Ppm > 0);
      assert.ok(typeof m.sensors.outdoorTempC === "number");
    }
  });

  await t.test("computeModuleIaqs clasifica bueno, moderado, deficiente y sin conexión", () => {
    const offline = computeModuleIaqs({ status: "offline", sensors: {} });
    assert.equal(offline.band, "offline");
    assert.equal(offline.score, 0);

    const good = computeModuleIaqs({
      status: "online",
      sensors: {
        co2Ppm: 550,
        pm25Ug: 7,
        indoorTempC: 24,
        humidityPct: 50,
        tvocPpb: 120,
      },
    });
    assert.equal(good.band, "good");
    assert.ok(good.score >= 8.0);
  });

  await t.test("computeFleetSummary calcula conteos, alertas y resumen semanal", () => {
    const state = createInitialFleetState();
    const summary = computeFleetSummary(state);
    assert.equal(summary.counts.total, 8);
    assert.equal(summary.counts.online, 7);
    assert.equal(summary.counts.offline, 1);
    assert.ok(summary.alerts.length >= 3);
    assert.ok(summary.weeklyInsight.includes("La calidad del aire de la flota es"));
  });

  await t.test("applyModuleControl reduce CO2 y mejora IAQS al activar Ventilación Intensiva", () => {
    const initial = createInitialFleetState();
    const before = initial.modules.find((m) => m.id === "MOD-VLD-02");
    assert.ok(before.sensors.co2Ppm > 1000);

    const updated = applyModuleControl(initial, "MOD-VLD-02", {
      hvacMode: "ventilation_boost",
      blindMode: "closed",
    });
    const after = updated.modules.find((m) => m.id === "MOD-VLD-02");
    assert.ok(after.sensors.co2Ppm < before.sensors.co2Ppm);
    assert.ok(after.sensors.indoorTempC < before.sensors.indoorTempC);
    assert.ok(after.iaqs.score > before.iaqs.score);
    assert.equal(updated.actionLog[0].moduleId, "MOD-VLD-02");
  });

  await t.test("acknowledgeAlert y resolveAlert actualizan el estado de las alertas", () => {
    const state = createInitialFleetState();
    const firstAlert = computeFleetSummary(state).alerts[0];
    assert.ok(firstAlert);

    const acked = acknowledgeAlert(state, firstAlert.id);
    const ackedMatch = computeFleetSummary(acked).alerts.find(
      (a) => a.id === firstAlert.id,
    );
    assert.equal(ackedMatch.acknowledged, true);

    const resolved = resolveAlert(acked, firstAlert.id);
    const resolvedMatch = computeFleetSummary(resolved).alerts.find(
      (a) => a.id === firstAlert.id,
    );
    assert.equal(resolvedMatch, undefined);
  });

  await t.test("get24hSeries devuelve 24 puntos horarios con temperatura exterior", () => {
    const state = createInitialFleetState();
    const tempSeries = get24hSeries(state, { metric: "temp" });
    assert.equal(tempSeries.length, 24);
    assert.equal(tempSeries[0].hour, "00:00");
    assert.ok(typeof tempSeries[0].value === "number");
    assert.ok(typeof tempSeries[0].outdoorValue === "number");
  });

  await t.test("answerFleetQuestion responde consultas sobre CO2, batería y confort", () => {
    const state = createInitialFleetState();
    const co2Ans = answerFleetQuestion(
      state,
      "¿Qué módulos superaron los 1.000 ppm de CO2 durante más tiempo?",
    );
    assert.ok(co2Ans.answer.includes("MOD-VLD-02"));

    const batAns = answerFleetQuestion(state, "¿Cómo está la batería en módulos aislados?");
    assert.ok(batAns.answer.includes("MOD-GAV-04"));

    const tempAns = answerFleetQuestion(state, "Compara confort interior frente a exterior");
    assert.ok(tempAns.answer.includes("°C interior"));
  });

  await t.test("calculateLicensingQuote compara Cuota Anual vs Licencia de Plataforma", () => {
    const saas = calculateLicensingQuote(10, "annual_service_fee");
    assert.equal(saas.upfrontEur, 0);
    assert.equal(saas.annualEur, 4800);
    assert.equal(saas.threeYearTotalEur, 14400);

    const lic = calculateLicensingQuote(10, "platform_license");
    assert.equal(lic.upfrontEur, 14500);
    assert.equal(lic.annualEur, 1400);
    assert.equal(lic.threeYearTotalEur, 18700);
  });
});
