import rawCasesData from "../data/atom_casos_emergencia.json" with { type: "json" };
import rawMaterialsData from "../data/atom_catalogo_materiales.json" with { type: "json" };
import rawConfigsData from "../data/atom_configuraciones.json" with { type: "json" };
import rawResultsData from "../data/atom_resultados_modelo.json" with { type: "json" };
import rawClimateData from "../data/atom_clima_horario.json" with { type: "json" };

// English translation of dataset scenario names
const SCENARIO_NAME_EN = {
  ola_calor_costera: "Coastal heatwave",
  ola_calor_interior: "Inland heatwave",
  frio_continental: "Continental cold",
  post_tormenta_humeda: "Humid post-storm",
};

// "post_tormenta_humeda" -> "Post tormenta humeda" (fallback if no translation)
function formatName(name) {
  const text = String(name).replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Unique scenarios loaded from dataset: { C01: "Coastal heatwave", ... }
export const snarioLabels = Object.fromEntries(
  [...new Map(rawClimateData.map((r) => [r.escenario_id, r.escenario]))]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, nom]) => [id, SCENARIO_NAME_EN[nom] ?? formatName(nom)]),
);
export const scenarioLabels = snarioLabels;

// Dataset grid availability -> % of grid-connectable modules
export const RED_PCT = {
  sin_red: 0,
  red_limitada: 50,
  red_disponible: 100,
};

// Dataset grid availability -> default % of Module A (self-sufficient) and Module B (grid-connected)
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
  Clima: "Climate type",
  AccesoCamion: "Truck access",
  Prioridad: "Priority requirement",
};

export const TRUCK_ACCESS_LABELS = {
  si: "Standard access (standard truck)",
  limitado: "Limited access (light vehicle / crane)",
};

export const PRIORITY_LABELS = {
  rapidez: "Deployment speed",
  confort: "Thermal comfort",
  coste: "Cost optimization",
  emisiones: "Lowest emissions (CO₂)",
  autosuficiencia: "Energy self-sufficiency",
};

const PRIORITY_GUIDANCE = {
  rapidez:
    "Speed priority: deploy on-site shelter modules first and prioritize Module B (3.1 days/module vs 3.6 days for Module A).",
  confort:
    "Thermal comfort priority: chassis with 24 cm cellulose insulation (U 0.162) combined with the active Climate Kit.",
  coste:
    "Cost priority: maximize the % of grid-connected Module B units (27,400 €/module vs 33,530 € for Module A).",
  emisiones:
    "Emissions priority: Module B reduces footprint to 11.5 t CO₂/module (compared to 13.3 t CO₂ for Module A with battery and solar).",
  autosuficiencia:
    "Self-sufficiency priority: prioritize Module A (14 m² solar panels + 10 kWh battery) for off-grid operation.",
};

export function getOperationalNotices({
  accesoCamion = "si",
  requisitoPrioritario = "confort",
} = {}) {
  const isLimited = accesoCamion === "limitado";
  const truckNotice = isLimited
    ? {
        type: "acceso",
        variant: "danger",
        title: "Limited logistics access",
        text: "Heavy trailer cannot access: requires palletized transport of disassembled panels using a light vehicle or local crane.",
      }
    : {
        type: "acceso",
        variant: "info",
        title: "Standard logistics access",
        text: "Direct access with a standard crane truck right to the assembly point.",
      };

  const priorityLabel =
    PRIORITY_LABELS[requisitoPrioritario] ?? PRIORITY_LABELS.confort;
  const priorityText =
    PRIORITY_GUIDANCE[requisitoPrioritario] ?? PRIORITY_GUIDANCE.confort;

  const priorityNotice = {
    type: "prioritat",
    variant: "info",
    title: `Priority criterion · ${priorityLabel}`,
    text: priorityText,
  };

  return [truckNotice, priorityNotice];
}

// Two factory kits, one single chassis
export const KITS = {
  calor: {
    id: "calor",
    badge: "H",
    nom: "Heat Kit",
    subtitol: "Warm coast · dry inland · humid heat",
    escenaris: ["C01", "C02", "C04"],
    kpis: [
      {
        val: "−20%",
        txt: "Cooling demand savings",
      },
      {
        val: "25.6 °C · 55%",
        txt: "Indoor thermal comfort and humidity",
      },
    ],
    components: [
      "Light-colored roof and facade (absorptance 0.2)",
      "Solar control glazing",
      "Automatic exterior blind triggered by sunlight",
      "Enthalpy recovery unit (75% heat, 65% humidity)",
    ],
  },
  fred: {
    id: "fred",
    badge: "C",
    nom: "Cold Kit",
    subtitol: "Cold wave",
    escenaris: ["C03"],
    kpis: [
      {
        val: "0 kWh",
        txt: "Heating demand at 22.6 °C",
      },
    ],
    components: [
      "Low-emissivity glazing (g 0.50) for solar gain",
      "Exterior blind: open during the day, closed at night",
      "Heat recovery unit in winter mode",
      "Backup heat pump, identical across both kits",
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

// Loads raw dataset from imported JSON files
export function loadDataset() {
  return {
    cases: rawCasesData,
    materials: rawMaterialsData,
    configs: rawConfigsData,
    results: rawResultsData,
  };
}

// The 60 emergency cases from the dataset
export function getCases() {
  return rawCasesData.map((c) => ({
    id: c.caso_id,
    label: `${c.caso_id} · ${c.personas_afectadas} people`,
    input: {
      escenarioId: c.escenario_id,
      personasAfectadas: Number(c.personas_afectadas),
      duracionEstanciaDias: Number(c.duracion_estancia_dias),
      plazoMaximoDias: Number(c.plazo_maximo_montaje_dias),
      presupuestoTotalEur: Number(c.presupuesto_total_eur),
      pctConexionRed: RED_PCT[c.disponibilidad_red] ?? 50,
      accesoCamion: c.acceso_camion ?? "si",
      requisitoPrioritario: c.requisito_prioritario ?? "confort",
    },
  }));
}

export const PROPORTIONS_FACTORS = {
  peopleForModule: {
    people: 4,
    modules: 1,
  },
  // Common values for both twin modules
  common: {
    areaM2: 22,
    capacity: 4,
    parallelTeams: 10,
    lowEmissivityGlassM2: 3,
    chassis: "glulam timber · 24 cm cellulose (U 0.162) · wood panel",
  },
  moduleA: {
    id: "A",
    name: "Self-sufficient",
    description: "14 m² solar + 10 kWh battery",
    solarM2: 14,
    batteryKwh: 10,
    costEur: 33530,
    assemblyDays: 3.6,
    co2T: 13.3,
  },
  moduleB: {
    id: "B",
    name: "Grid-connected",
    description: "No solar or battery",
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
  const isOverBudget = totalCost > safeBudget;
  const usedPct =
    safeBudget > 0 ? (totalCost / safeBudget) * 100 : totalCost > 0 ? null : 0;
  const remainingEur = safeBudget - totalCost;
  return {
    totalCost,
    budgetEur: safeBudget,
    usedPct,
    remainingEur,
    isOverBudget,
  };
}
