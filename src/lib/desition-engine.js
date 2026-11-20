import rawCasesData from "../data/atom_casos_emergencia.json" with { type: "json" };
import rawMaterialsData from "../data/atom_catalogo_materiales.json" with { type: "json" };
import rawConfigsData from "../data/atom_configuraciones.json" with { type: "json" };
import rawResultsData from "../data/atom_resultados_modelo.json" with { type: "json" };
import rawClimateData from "../data/atom_clima_horario.json" with { type: "json" };

// Traducció al català dels noms d'escenari del dataset
const SCENARIO_NAME_CA = {
  ola_calor_costera: "Onada de calor costanera",
  ola_calor_interior: "Onada de calor interior",
  frio_continental: "Fred continental",
  post_tormenta_humeda: "Post-tempesta humida",
};

// "post_tormenta_humeda" -> "Post tormenta humeda" (si no hi ha traducció)
function formatName(name) {
  const text = String(name).replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Escenaris únics carregats del dataset: { C01: "Onada de calor costanera", ... }
export const snarioLabels = Object.fromEntries(
  [...new Map(rawClimateData.map((r) => [r.escenario_id, r.escenario]))]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, nom]) => [id, SCENARIO_NAME_CA[nom] ?? formatName(nom)]),
);

// Disponibilitat de xarxa del dataset -> % de mòduls connectables
export const RED_PCT = {
  sin_red: 0,
  red_limitada: 50,
  red_disponible: 100,
};

// Disponibilitat de xarxa del dataset -> % per defecte de Mòdul A (autosuficient) i Mòdul B (amb xarxa)
export const MODULE_MIX_BY_RED = {
  sin_red: { percentModulesA: 100, percentModulesB: 0 },
  red_limitada: { percentModulesA: 50, percentModulesB: 50 },
  red_disponible: { percentModulesA: 0, percentModulesB: 100 },
};

export function getModuleMixForGrid(disponibilidadRed) {
  return MODULE_MIX_BY_RED[disponibilidadRed] ?? MODULE_MIX_BY_RED.red_limitada;
}

export function getModuleMixFromRedPct(pctConexionRed) {
  const percentModulesB = Math.min(100, Math.max(0, Number(pctConexionRed) || 0));
  return {
    percentModulesA: 100 - percentModulesB,
    percentModulesB,
  };
}

export const inputLabels = {
  Clima: "Tipus de clima",
};

// Dos kits de fàbrica, un sol xassís
export const KITS = {
  calor: {
    id: "calor",
    badge: "C",
    nom: "Kit Calor",
    subtitol: "Costa càlida · interior sec · calor humida",
    escenaris: ["C01", "C02", "C04"],
    kpis: [
      {
        val: "−20 %",
        txt: "Estalvi de refrigeració",
      },
      {
        val: "25,6 °C · 55 %",
        txt: "Confort tèrmic i humitat interior",
      },
    ],
    components: [
      "Coberta i façana de color clar (absortància 0,2)",
      "Vidre de control solar",
      "Persiana exterior automàtica amb sol",
      "Recuperador entàlpic (75 % calor, 65 % humitat)",
    ],
  },
  fred: {
    id: "fred",
    badge: "F",
    nom: "Kit Fred",
    subtitol: "Onada de fred",
    escenaris: ["C03"],
    kpis: [
      {
        val: "0 kWh",
        txt: "Demanda de calefacció a 22,6 °C",
      },
    ],
    components: [
      "Vidre baix emissiu (g 0,50) per captar sol",
      "Persiana exterior: oberta de dia, tancada de nit",
      "Recuperador de calor en mode hivern",
      "Bomba de calor de suport, la mateixa als dos kits",
    ],
  },
};

export const SCENARIO_KIT = {
  C01: "calor",
  C02: "calor",
  C03: "fred",
  C04: "calor",
};

export function getKitForScenario(escenarioId) {
  const kitKey = SCENARIO_KIT[escenarioId] ?? "calor";
  return KITS[kitKey];
}

// Carrega les dades brutes del dataset des dels JSON importats
export function loadDataset() {
  return {
    cases: rawCasesData,
    materials: rawMaterialsData,
    configs: rawConfigsData,
    results: rawResultsData,
  };
}

// Els 60 casos d'emergència del dataset, preparats per al selector
export function getCases() {
  return rawCasesData.map((c) => ({
    id: c.caso_id,
    label: `${c.caso_id} · ${c.personas_afectadas} persones`,
    input: {
      escenarioId: c.escenario_id,
      personasAfectadas: Number(c.personas_afectadas),
      duracionEstanciaDias: Number(c.duracion_estancia_dias),
      plazoMaximoDias: Number(c.plazo_maximo_montaje_dias),
      presupuestoTotalEur: Number(c.presupuesto_total_eur),
      pctConexionRed: RED_PCT[c.disponibilidad_red] ?? 50,
    },
  }));
}

export const PROPORTIONS_FACTORS = {
  peopleForModule: {
    people: 4,
    modules: 1,
  },
  // Valors comuns dels dos mòduls bessons
  common: {
    areaM2: 22,
    capacity: 4,
    parallelTeams: 10,
    lowEmissivityGlassM2: 3,
    chassis: "fusta laminada · cel·lulosa 24 cm (U 0,162) · panell de fusta",
  },
  moduleA: {
    id: "A",
    name: "Autosuficient",
    description: "14 m² de solar + 10 kWh de bateria",
    solarM2: 14,
    batteryKwh: 10,
    costEur: 33530,
    assemblyDays: 3.6,
    co2T: 13.3,
  },
  moduleB: {
    id: "B",
    name: "Amb xarxa",
    description: "Sense solar ni bateria",
    solarM2: 0,
    batteryKwh: 0,
    costEur: 27400,
    assemblyDays: 3.1,
    co2T: 11.5,
  },
};

export const getPeopleForModule =
  PROPORTIONS_FACTORS.peopleForModule.modules /
  PROPORTIONS_FACTORS.peopleForModule.people;

export function getNumberModuleAByPercent(people, percentModulesA) {
  return (people * getPeopleForModule * percentModulesA) / 100;
}

export function getCostModulesA(people, percentModulesA) {
  return (
    getNumberModuleAByPercent(people, percentModulesA) *
    PROPORTIONS_FACTORS.moduleA.costEur
  );
}

export function getNumberModuleBByPercent(people, percentModulesA) {
  return (people * getPeopleForModule * (100 - percentModulesA)) / 100;
}

export function getCostModulesB(people, percentModulesA) {
  return (
    getNumberModuleBByPercent(people, percentModulesA) *
    PROPORTIONS_FACTORS.moduleB.costEur
  );
}

export function getTotalCost(people, percentModulesA) {
  return (
    getCostModulesA(people, percentModulesA) +
    getCostModulesB(people, percentModulesA)
  );
}

export function getKDaysModules(daysForModule) {
  return getPeopleForModule * daysForModule;
}

export function getDaysModulesA(people, percentModulesA) {
  return (
    (people *
      getKDaysModules(PROPORTIONS_FACTORS.moduleA.assemblyDays) *
      percentModulesA) /
    100 /
    PROPORTIONS_FACTORS.common.parallelTeams
  );
}

export function getDaysModulesB(people, percentModulesA) {
  return (
    (people *
      getKDaysModules(PROPORTIONS_FACTORS.moduleB.assemblyDays) *
      (100 - percentModulesA)) /
    100 /
    PROPORTIONS_FACTORS.common.parallelTeams
  );
}

export function getTotalDays(people, percentModulesA) {
  return (
    getDaysModulesA(people, percentModulesA) +
    getDaysModulesB(people, percentModulesA)
  );
}

export function getCostPerPerson(people, percentModulesA, stayDays) {
  const safePeople = Math.max(0, Number(people) || 0);
  const safeStayDays = Math.max(0, Number(stayDays) || 0);
  const totalCost = getTotalCost(safePeople, percentModulesA);
  const perPerson = safePeople > 0 ? totalCost / safePeople : 0;
  const perPersonNight = safeStayDays > 0 ? perPerson / safeStayDays : 0;
  return { perPerson, perPersonNight };
}

export function getStockCoverage(people, stockModules) {
  const safePeople = Math.max(0, Number(people) || 0);
  const safeStock = Math.max(0, Number(stockModules) || 0);
  const stockPeople = Math.min(
    safePeople,
    safeStock * PROPORTIONS_FACTORS.common.capacity,
  );
  return {
    stockModules: safeStock,
    stockPeople,
    remainingPeople: Math.max(0, safePeople - stockPeople),
  };
}

export function getCo2ModulesA(people, percentModulesA) {
  return (
    getNumberModuleAByPercent(people, percentModulesA) *
    PROPORTIONS_FACTORS.moduleA.co2T
  );
}

export function getCo2ModulesB(people, percentModulesA) {
  return (
    getNumberModuleBByPercent(people, percentModulesA) *
    PROPORTIONS_FACTORS.moduleB.co2T
  );
}

export function getTotalCo2(people, percentModulesA) {
  return (
    getCo2ModulesA(people, percentModulesA) +
    getCo2ModulesB(people, percentModulesA)
  );
}

export function getCo2PerPerson(people, percentModulesA) {
  const safePeople = Math.max(0, Number(people) || 0);
  const totalCo2T = getTotalCo2(safePeople, percentModulesA);
  const perPersonKg = safePeople > 0 ? (totalCo2T * 1000) / safePeople : 0;
  return { totalCo2T, perPersonKg };
}

export function getBudgetUsage(people, percentModulesA, budgetEur) {
  const safePeople = Math.max(0, Number(people) || 0);
  const safeBudget = Math.max(0, Number(budgetEur) || 0);
  const totalCost = getTotalCost(safePeople, percentModulesA);
  const usedPct = safeBudget > 0 ? (totalCost / safeBudget) * 100 : 0;
  const remainingEur = safeBudget - totalCost;
  return {
    totalCost,
    budgetEur: safeBudget,
    usedPct,
    remainingEur,
  };
}
