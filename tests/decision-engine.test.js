import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getCases,
  getKitForScenario,
  inputLabels,
  KITS,
  loadDataset,
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
});
