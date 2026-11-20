import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calculateCO2,
  calculateCost,
  calculateModules,
  evaluateScenario,
  evaluateViability,
  getCases,
  getKit,
  inputLabels,
  K_PRESSUPOST,
  K_TEMPS,
  KIT_FACTORS,
  KITS,
  loadDataset,
  outputLabels,
  recommendKit,
  snarioLabels,
} from "../src/lib/desition-engine.js";

const approx = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≈ ${expected}`);

describe("ATOM Modular desition-engine (JS + JSON)", () => {
  it("carrega el dataset complet des dels fitxers JSON", () => {
    const ds = loadDataset();
    assert.equal(ds.cases.length, 60);
    assert.equal(ds.materials.length, 24);
    assert.equal(ds.configs.length, 144);
    assert.equal(ds.results.length, 576);
  });

  it("exposa les etiquetes d'entrada, sortida i escenaris", () => {
    assert.equal(inputLabels.Clima, "Tipus de clima");
    assert.equal(outputLabels.KitRecomendado, "Kit recomanat");
    assert.equal(outputLabels.Veredicto.viable, "Viable");
    assert.equal(snarioLabels.C03, "Fred continental");
  });

  it("escenaris carregats del dataset (C01–C04, noms en català)", () => {
    assert.deepEqual(snarioLabels, {
      C01: "Onada de calor costanera",
      C02: "Onada de calor interior",
      C03: "Fred continental",
      C04: "Post-tempesta humida",
    });
  });

  it("getCases() retorna els 60 casos amb l'input preparat", () => {
    const cases = getCases();
    assert.equal(cases.length, 60);
    const em059 = cases.find((c) => c.id === "EM059");
    assert.deepEqual(em059.input, {
      escenarioId: "C03",
      personasAfectadas: 160,
      plazoMaximoDias: 2,
      presupuestoTotalEur: 1729475,
      pctConexionRed: 50,
    });
    assert.match(em059.label, /^EM059 · 160 persones$/);
  });

  it("vidre baix emissiu als materials comuns, sense duplicar", () => {
    for (const id of ["C01", "C03"]) {
      const mats = getKit(id).materiales.filter((m) =>
        m.toLowerCase().includes("vidre baix emissiu"),
      );
      assert.equal(mats.length, 1);
    }
  });

  it("textos i KPI dels kits generats des de KIT_FACTORS", () => {
    assert.equal(KIT_FACTORS.calor.absortancia, 0.2);
    assert.equal(KIT_FACTORS.fred.climatizacionKw, 1.8);
    assert.equal(KITS.calor.kpis[0].valor, "−20 %");
    assert.equal(KITS.calor.kpis[1].valor, "25,6 °C · 55 %");
    assert.equal(KITS.fred.kpis[0].valor, "0 kWh");
    assert.match(KITS.fred.kpis[0].texto, /22,6 °C/);
    assert.equal(KITS.calor.elementos[0], "Coberta i façana de color clar (absortància 0,2)");
    assert.equal(KITS.calor.elementos[3], "Recuperador entàlpic (75 % calor, 65 % humitat)");
    assert.equal(KITS.fred.climatizacionKw, 1.8);
  });

  it("kit recomanat: C03 -> fred, la resta -> calor", () => {
    assert.equal(recommendKit("C03"), "fred");
    assert.equal(recommendKit("C01"), "calor");
    assert.equal(recommendKit("C02"), "calor");
    assert.equal(recommendKit("C04"), "calor");
  });

  it("mòduls A/B = x · 1/4 · %/100 (arrodonit cap amunt)", () => {
    assert.deepEqual(calculateModules(160, 50), { modulsA: 20, modulsB: 20 });
    assert.deepEqual(calculateModules(40, 0), { modulsA: 10, modulsB: 0 });
    assert.deepEqual(calculateModules(40, 100), { modulsA: 0, modulsB: 10 });
    assert.deepEqual(calculateModules(10, 50), { modulsA: 2, modulsB: 2 });
  });

  it("cost = A€ + B€ i CO2 = tA + tB", () => {
    assert.deepEqual(calculateCost(20, 20), {
      eurA: 670600,
      eurB: 548000,
      total: 1218600,
    });
    const co2 = calculateCO2(20, 20);
    approx(co2.tA, 266);
    approx(co2.tB, 230);
    approx(co2.total, 496);
  });

  it("factors K: 0,75 dies/persona i 7.500 €/persona", () => {
    assert.equal(K_TEMPS, 0.75);
    assert.equal(K_PRESSUPOST, 7500);
  });

  it("viabilitat amb <= (límit exacte és viable)", () => {
    const v = evaluateViability({
      persones: 40,
      modulsA: 10,
      modulsB: 0,
      terminiDies: 30,
      pressupostEur: 300000,
    });
    assert.equal(v.capacitat.viable, true);
    assert.equal(v.temps.viable, true);
    assert.equal(v.temps.limitDies, 30);
    assert.equal(v.pressupost.viable, true);
    assert.equal(v.pressupost.limitEur, 300000);
    assert.equal(v.veredicto, "viable");
  });

  it("cas EM059 (160 persones, 50% xarxa): no arriba per pressupost", () => {
    const res = evaluateScenario({
      escenarioId: "C03",
      personasAfectadas: 160,
      plazoMaximoDias: 2,
      presupuestoTotalEur: 1729475,
      pctConexionRed: 50,
    });
    assert.equal(res.kit.id, "fred");
    assert.equal(res.totalModulos, 40);
    assert.equal(res.configA.count, 20);
    assert.equal(res.configB.count, 20);
    assert.equal(res.costeTotalEur, 1218600);
    approx(res.co2TotalT, 496);
    assert.equal(res.viabilitat.temps.viable, true); // 2 <= 120
    assert.equal(res.viabilitat.pressupost.viable, false); // 1.729.475 > 1.200.000
    assert.equal(res.veredicto, "no_arriba");
    assert.equal(res.configA.pvM2, 14);
    assert.equal(res.configA.bateriaKwh, 10);
    assert.equal(res.configB.pvM2, 0);
    assert.equal(res.configB.bateriaKwh, 0);
  });

  it("0% i 100% de xarxa: viable dins dels límits", () => {
    const base = {
      escenarioId: "C01",
      personasAfectadas: 40,
      plazoMaximoDias: 5,
      presupuestoTotalEur: 200000,
    };
    const res0 = evaluateScenario({ ...base, pctConexionRed: 0 });
    assert.equal(res0.kit.id, "calor");
    assert.equal(res0.configA.count, 10);
    assert.equal(res0.configB, null);
    assert.equal(res0.costeTotalEur, 335300);
    approx(res0.co2TotalT, 133);
    assert.equal(res0.veredicto, "viable");

    const res100 = evaluateScenario({ ...base, pctConexionRed: 100 });
    assert.equal(res100.configA, null);
    assert.equal(res100.configB.count, 10);
    assert.equal(res100.costeTotalEur, 274000);
    approx(res100.co2TotalT, 115);
    assert.equal(res100.veredicto, "viable");
  });

  it("no arriba si el pressupost o el termini superen el límit", () => {
    const base = {
      escenarioId: "C01",
      personasAfectadas: 40,
      pctConexionRed: 0,
    };
    const perPressupost = evaluateScenario({
      ...base,
      plazoMaximoDias: 5,
      presupuestoTotalEur: 1000000,
    });
    assert.equal(perPressupost.viabilitat.pressupost.viable, false);
    assert.equal(perPressupost.veredicto, "no_arriba");
    assert.doesNotMatch(perPressupost.veredictoDetalle, /persones ·/);

    const perTemps = evaluateScenario({
      ...base,
      plazoMaximoDias: 50,
      presupuestoTotalEur: 200000,
    });
    assert.equal(perTemps.viabilitat.temps.viable, false);
    assert.equal(perTemps.veredicto, "no_arriba");
    assert.doesNotMatch(perTemps.veredictoDetalle, /persones ·/);

    const limit = evaluateScenario({
      ...base,
      plazoMaximoDias: 30,
      presupuestoTotalEur: 300000,
    });
    assert.equal(limit.veredicto, "viable");
  });
});
