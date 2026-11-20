import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getBudgetUsage,
  getCases,
  getCo2ModulesA,
  getCo2ModulesB,
  getCo2PerPerson,
  getCostPerPerson,
  getDaysModulesA,
  getDaysModulesB,
  getKitForScenario,
  getModuleMixForGrid,
  getModuleMixFromRedPct,
  getOperationalNotices,
  getStockCoverage,
  getTotalCo2,
  getTotalCost,
  getTotalDays,
  inputLabels,
  KITS,
  loadDataset,
  MODULE_MIX_BY_RED,
  PRIORITY_LABELS,
  PROPORTIONS_FACTORS,
  snarioLabels,
  TRUCK_ACCESS_LABELS,
} from "../src/lib/desition-engine.js";

describe("ATOM Modular desition-engine (cases and climate base)", () => {
  it("loads the full dataset from JSON files", () => {
    const ds = loadDataset();
    assert.equal(ds.cases.length, 60);
    assert.equal(ds.materials.length, 24);
    assert.equal(ds.configs.length, 144);
    assert.equal(ds.results.length, 576);
  });

  it("exposes the climate input label", () => {
    assert.equal(inputLabels.Clima, "Climate type");
    assert.equal(snarioLabels.C03, "Continental cold");
  });

  it("scenarios loaded from dataset (C01–C04, English names)", () => {
    assert.deepEqual(snarioLabels, {
      C01: "Coastal heatwave",
      C02: "Inland heatwave",
      C03: "Continental cold",
      C04: "Humid post-storm",
    });
  });

  it("getCases() returns all 60 cases with prepared input", () => {
    const cases = getCases();
    assert.equal(cases.length, 60);
    const em059 = cases.find((c) => c.id === "EM059");
    assert.deepEqual(em059.input, {
      escenarioId: "C03",
      personasAfectadas: 160,
      duracionEstanciaDias: 30,
      plazoMaximoDias: 2,
      presupuestoTotalEur: 1729475,
      pctConexionRed: 50,
      accesoCamion: "si",
      requisitoPrioritario: "confort",
    });
    assert.match(em059.label, /^EM059 · 160 people$/);
  });

  it("assigns Heat Kit (C01, C02, C04) and Cold Kit (C03) by scenario", () => {
    assert.equal(KITS.calor.badge, "H");
    assert.equal(KITS.fred.badge, "C");
    assert.equal(KITS.calor.components.length, 4);
    assert.equal(KITS.fred.components.length, 4);
    assert.deepEqual(KITS.calor.kpis, [
      { val: "−20%", txt: "Cooling demand savings" },
      { val: "25.6 °C · 55%", txt: "Indoor thermal comfort and humidity" },
    ]);
    assert.deepEqual(KITS.fred.kpis, [
      { val: "0 kWh", txt: "Heating demand at 22.6 °C" },
    ]);

    assert.equal(getKitForScenario("C01").id, "calor");
    assert.equal(getKitForScenario("C02").id, "calor");
    assert.equal(getKitForScenario("C03").id, "fred");
    assert.equal(getKitForScenario("C04").id, "calor");
  });

  it("PROPORTIONS_FACTORS includes common and Module A & B values", () => {
    assert.equal(PROPORTIONS_FACTORS.common.areaM2, 22);
    assert.equal(PROPORTIONS_FACTORS.common.capacity, 4);
    assert.equal(PROPORTIONS_FACTORS.moduleA.costEur, 33530);
    assert.equal(PROPORTIONS_FACTORS.moduleA.assemblyDays, 3.6);
    assert.equal(PROPORTIONS_FACTORS.moduleA.co2T, 13.3);
    assert.equal(PROPORTIONS_FACTORS.moduleB.costEur, 27400);
    assert.equal(PROPORTIONS_FACTORS.moduleB.assemblyDays, 3.1);
    assert.equal(PROPORTIONS_FACTORS.moduleB.co2T, 11.5);
  });

  it("getTotalCost calculates total cost from people and % of Module A", () => {
    assert.equal(getTotalCost(160, 100), 40 * 33530);
    assert.equal(getTotalCost(160, 0), 40 * 27400);
    assert.equal(getTotalCost(160, 50), 20 * 33530 + 20 * 27400);
  });

  it("defines default Module A and B mix by grid availability", () => {
    assert.deepEqual(MODULE_MIX_BY_RED.sin_red, {
      percentModulesA: 100,
      percentModulesB: 0,
    });
    assert.deepEqual(getModuleMixForGrid("red_limitada"), {
      percentModulesA: 50,
      percentModulesB: 50,
    });
    assert.deepEqual(getModuleMixForGrid("red_disponible"), {
      percentModulesA: 0,
      percentModulesB: 100,
    });
    assert.deepEqual(getModuleMixFromRedPct(50), {
      percentModulesA: 50,
      percentModulesB: 50,
    });
  });

  it("getStockCoverage calculates people housed with on-site shelter modules", () => {
    assert.deepEqual(getStockCoverage(160, 4), {
      stockModules: 4,
      stockPeople: 16,
      remainingPeople: 144,
    });
    assert.deepEqual(getStockCoverage(12, 4), {
      stockModules: 4,
      stockPeople: 12,
      remainingPeople: 0,
    });
  });

  it("getDaysModulesA, getDaysModulesB and getTotalDays calculate parallel team days", () => {
    assert.equal(getDaysModulesA(160, 50), (20 * 3.6) / 10);
    assert.equal(getDaysModulesB(160, 50), (20 * 3.1) / 10);
    assert.equal(getTotalDays(160, 50), (20 * 3.6 + 20 * 3.1) / 10);
  });

  it("getCostPerPerson calculates cost per person and per night of stay", () => {
    const { perPerson, perPersonNight } = getCostPerPerson(160, 0, 30);
    assert.equal(perPerson, (40 * 27400) / 160);
    assert.equal(perPersonNight, perPerson / 30);
  });

  it("getCo2ModulesA, getCo2ModulesB, getTotalCo2 and getCo2PerPerson calculate embodied CO2", () => {
    assert.equal(getCo2ModulesA(160, 50), 20 * 13.3);
    assert.equal(getCo2ModulesB(160, 50), 20 * 11.5);
    assert.equal(getTotalCo2(160, 50), 20 * 13.3 + 20 * 11.5);
    assert.equal(getTotalCo2(160, 100), 40 * 13.3);
    assert.equal(getTotalCo2(160, 0), 40 * 11.5);

    const { totalCo2T, perPersonKg } = getCo2PerPerson(160, 50);
    assert.equal(totalCo2T, 496);
    assert.equal(perPersonKg, (496 * 1000) / 160);

    const empty = getCo2PerPerson(0, 50);
    assert.equal(empty.totalCo2T, 0);
    assert.equal(empty.perPersonKg, 0);
  });

  it("getBudgetUsage calculates % of budget used and free remaining budget", () => {
    const usage = getBudgetUsage(160, 50, 1729475);
    assert.equal(usage.totalCost, 1218600);
    assert.equal(usage.budgetEur, 1729475);
    assert.equal(usage.remainingEur, 1729475 - 1218600);
    assert.equal(usage.usedPct, (1218600 / 1729475) * 100);

    const overBudget = getBudgetUsage(160, 100, 1000000);
    assert.equal(overBudget.totalCost, 40 * 33530);
    assert.equal(overBudget.remainingEur, 1000000 - 40 * 33530);
    assert.ok(overBudget.usedPct > 100);

    const zeroBudget = getBudgetUsage(160, 50, 0);
    assert.equal(zeroBudget.usedPct, 0);
    assert.equal(zeroBudget.remainingEur, -1218600);
  });

  it("getOperationalNotices generates notices for truck access and priority requirement", () => {
    assert.ok(TRUCK_ACCESS_LABELS.si);
    assert.ok(TRUCK_ACCESS_LABELS.limitado);
    assert.equal(Object.keys(PRIORITY_LABELS).length, 5);

    const normalNotices = getOperationalNotices({
      accesoCamion: "si",
      requisitoPrioritario: "confort",
    });
    assert.equal(normalNotices.length, 2);
    assert.equal(normalNotices[0].variant, "info");
    assert.equal(normalNotices[1].variant, "info");
    assert.match(normalNotices[1].title, /Thermal comfort/);

    const limitedNotices = getOperationalNotices({
      accesoCamion: "limitado",
      requisitoPrioritario: "rapidez",
    });
    assert.equal(limitedNotices[0].variant, "danger");
    assert.match(limitedNotices[0].title, /Limited/);
    assert.match(limitedNotices[1].title, /Deployment speed/);
  });
});
