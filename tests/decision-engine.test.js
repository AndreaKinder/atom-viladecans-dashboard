import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getCases,
  getKitForScenario,
  getModuleMixForGrid,
  getModuleMixFromRedPct,
  getStockCoverage,
  getTotalCost,
  inputLabels,
  KITS,
  loadDataset,
  MODULE_MIX_BY_RED,
  PROPORTIONS_FACTORS,
  snarioLabels,
} from "../src/lib/desition-engine.js";

describe("ATOM Modular desition-engine (base casos i clima)", () => {
  it("carrega el dataset complet des dels fitxers JSON", () => {
    const ds = loadDataset();
    assert.equal(ds.cases.length, 60);
    assert.equal(ds.materials.length, 24);
    assert.equal(ds.configs.length, 144);
    assert.equal(ds.results.length, 576);
  });

  it("exposa l'etiqueta d'entrada de clima", () => {
    assert.equal(inputLabels.Clima, "Tipus de clima");
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
      duracionEstanciaDias: 30,
      plazoMaximoDias: 2,
      presupuestoTotalEur: 1729475,
      pctConexionRed: 50,
    });
    assert.match(em059.label, /^EM059 · 160 persones$/);
  });

  it("assigna Kit Calor (C01, C02, C04) i Kit Fred (C03) segons l'escenari", () => {
    assert.equal(KITS.calor.badge, "C");
    assert.equal(KITS.fred.badge, "F");
    assert.equal(KITS.calor.components.length, 4);
    assert.equal(KITS.fred.components.length, 4);

    assert.equal(getKitForScenario("C01").id, "calor");
    assert.equal(getKitForScenario("C02").id, "calor");
    assert.equal(getKitForScenario("C03").id, "fred");
    assert.equal(getKitForScenario("C04").id, "calor");
  });

  it("PROPORTIONS_FACTORS inclou els valors comuns i dels mòduls A i B", () => {
    assert.equal(PROPORTIONS_FACTORS.common.areaM2, 22);
    assert.equal(PROPORTIONS_FACTORS.common.capacity, 4);
    assert.equal(PROPORTIONS_FACTORS.moduleA.costEur, 33530);
    assert.equal(PROPORTIONS_FACTORS.moduleA.assemblyDays, 3.6);
    assert.equal(PROPORTIONS_FACTORS.moduleA.co2T, 13.3);
    assert.equal(PROPORTIONS_FACTORS.moduleB.costEur, 27400);
    assert.equal(PROPORTIONS_FACTORS.moduleB.assemblyDays, 3.1);
    assert.equal(PROPORTIONS_FACTORS.moduleB.co2T, 11.5);
  });

  it("getTotalCost calcula el cost total segons persones i % de mòduls A", () => {
    assert.equal(getTotalCost(160, 100), 40 * 33530);
    assert.equal(getTotalCost(160, 0), 40 * 27400);
    assert.equal(getTotalCost(160, 50), 20 * 33530 + 20 * 27400);
  });

  it("defineix la mescla per defecte de mòduls A i B segons disponibilitat de xarxa", () => {
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

  it("getStockCoverage calcula persones allotjades amb mòduls-refugi a la zona", () => {
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
});
