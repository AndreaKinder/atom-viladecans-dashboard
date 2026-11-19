import rawCasesData from "../data/atom_casos_emergencia.json" with { type: "json" };
import rawMaterialsData from "../data/atom_catalogo_materiales.json" with { type: "json" };
import rawConfigsData from "../data/atom_configuraciones.json" with { type: "json" };
import rawResultsData from "../data/atom_resultados_modelo.json" with { type: "json" };
import rawClimateData from "../data/atom_clima_horario.json" with { type: "json" };

// Factors de conversió (esquema de referència)
const CONVERSION_FACTORS = {
  peoplePerModule: 4, // 4 persones / 1 mòdul
  modulsPerPersona: 1 / 4, // 1 mòdul / 4 persones
  diesPerModul: 3, // 3 dies / 1 mòdul
  eurPerModulReferencia: 30000, // ~30.000 € / 1 mòdul
  kgPerTonne: 1000,
  percentBase: 100,
  A: {
    name: "Autosuficient",
    eurPerModule: 33530, // 33.530 € / 1 mòdul A
    co2TonnesPerModule: 13.3, // 13,3 t / 1 mòdul A
    pvM2PerModule: 14,
    batteryKwhPerModule: 10,
  },
  B: {
    name: "Amb xarxa",
    eurPerModule: 27400, // 27.400 € / 1 mòdul B
    co2TonnesPerModule: 11.5, // 11,5 t / 1 mòdul B
    pvM2PerModule: 0,
    batteryKwhPerModule: 0,
  },
};

// K temps = 1 mòdul / 4 persones · 3 dies / 1 mòdul = 0,75 dies/persona
export const K_TEMPS =
  CONVERSION_FACTORS.modulsPerPersona * CONVERSION_FACTORS.diesPerModul;

// K pressupost = 1 mòdul / 4 persones · 30.000 € / 1 mòdul = 7.500 €/persona
export const K_PRESSUPOST =
  CONVERSION_FACTORS.modulsPerPersona * CONVERSION_FACTORS.eurPerModulReferencia;

// Constants de cada kit (fred i calor)
export const KIT_FACTORS = {
  calor: {
    absortancia: 0.2, // coberta i façana de color clar
    recuperadorCalorPct: 75, // recuperador entàlpic
    recuperadorHumitatPct: 65,
    reduccioRefrigeracioPct: -20, // a les tres onades de calor
    tempOperativaC: 25.6,
    humitatPct: 55,
    climatizacionKw: null,
  },
  fred: {
    vidreG: 0.5, // vidre baix emissiu (factor solar g)
    calefaccioKwh: 0,
    tempInteriorC: 22.6,
    climatizacionKw: 1.8, // bomba de calor de suport
  },
};

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

// Materials comuns als dos kits
const COMMON_MATERIALS = [
  "fusta laminada",
  "cel·lulosa 24 cm (U 0,162)",
  "panell de fusta",
  "vidre baix emissiu", // M15 vidrio_bajo_emisivo
];

const fmtCa = (v, d = 1) =>
  Number(v).toLocaleString("ca-ES", { maximumFractionDigits: d });

const FC = KIT_FACTORS.calor;
const FF = KIT_FACTORS.fred;

// Kits de fabrica segun el clima, con sus elementos y KPI
export const KITS = {
  calor: {
    id: "calor",
    configId: "Kit Calor",
    inicial: "C",
    subtitulo: "Costa càlida · interior sec · calor humida",
    elementos: [
      `Coberta i façana de color clar (absortància ${fmtCa(FC.absortancia)})`,
      "Vidre de control solar",
      "Persiana exterior automàtica amb sol",
      `Recuperador entàlpic (${FC.recuperadorCalorPct} % calor, ${FC.recuperadorHumitatPct} % humitat)`,
    ],
    climatizacionKw: FC.climatizacionKw,
    reutilizacion: 0,
    kpis: [
      {
        valor: `${FC.reduccioRefrigeracioPct < 0 ? "−" : "+"}${Math.abs(FC.reduccioRefrigeracioPct)} %`,
        texto: "refrigeració amb el kit Calor a les tres onades de calor",
      },
      {
        valor: `${fmtCa(FC.tempOperativaC)} °C · ${FC.humitatPct} %`,
        texto: "mateix confort: temperatura operativa i humitat",
      },
    ],
  },
  fred: {
    id: "fred",
    configId: "Kit Fred",
    inicial: "F",
    subtitulo: "Onada de fred",
    elementos: [
      "Persiana exterior: oberta de dia, tancada de nit",
      "Recuperador de calor en mode hivern",
      "Bomba de calor de suport, la mateixa als dos kits",
    ],
    climatizacionKw: FF.climatizacionKw,
    reutilizacion: 0,
    kpis: [
      {
        valor: `${FF.calefaccioKwh} kWh`,
        texto: `calefacció a l'hivern amb el kit Fred (${fmtCa(FF.tempInteriorC)} °C)`,
      },
    ],
  },
};

// Kit recomanat segons el cas climàtic: si C03 -> Fred, sinó -> Calor
export function recommendKit(escenarioId) {
  return escenarioId === "C03" ? "fred" : "calor";
}

// Relacion escenario climatico -> kit (derivada de recommendKit)
export const SCENARIO_KIT = Object.fromEntries(
  Object.keys(snarioLabels).map((id) => [id, recommendKit(id)]),
);

// Devuelve el kit para un escenario (o un id de kit directo: "calor" / "fred")
export function getKit(scenarioOrKitId) {
  const kitId = KITS[scenarioOrKitId]
    ? scenarioOrKitId
    : recommendKit(scenarioOrKitId);
  const kit = KITS[kitId];
  return { ...kit, materiales: [...COMMON_MATERIALS, ...kit.elementos] };
}

// Parametros de entrada del cuadro de mando (Entrades): id, label y tipo de campo
export const input = {
  Clima: {
    id: "escenarioId",
    label: "Tipus de clima",
    tipo: "select",
    // Tipo de kit segun el clima: Kit Fred o Kit Calor
    opciones: Object.entries(snarioLabels).map(([value, label]) => ({
      value,
      label,
      kit: SCENARIO_KIT[value],
      kitLabel: KITS[SCENARIO_KIT[value]].configId,
    })),
  },
  Personas: {
    id: "personasAfectadas",
    label: "Persones afectades",
    tipo: "number",
    // Relacion: 4 personas por modulo
    relacion: { personasPorModulo: CONVERSION_FACTORS.peoplePerModule },
    min: 1,
    step: CONVERSION_FACTORS.peoplePerModule,
  },
  Termino: {
    id: "plazoMaximoDias",
    label: "Termini màxim (dies)",
    tipo: "number",
    unidad: "dies",
    min: 0.5,
    step: 0.5,
  },
  Presupuesto: {
    id: "presupuestoTotalEur",
    label: "Pressupost total (€)",
    tipo: "number",
    unidad: "€",
    // Depende del KPI del modulo: A (autosuficient) o B (amb xarxa)
    kpi: {
      A: CONVERSION_FACTORS.A.eurPerModule,
      B: CONVERSION_FACTORS.B.eurPerModule,
    },
    min: 1,
  },
  PorcentajeRed: {
    id: "pctConexionRed",
    label: "% de mòduls connectables a la xarxa",
    tipo: "range",
    unidad: "%",
    // Relacion A-B: 0% = tots A (autosuficient), 100% = tots B (amb xarxa)
    relacion: { min: "A", max: "B" },
    min: 0,
    max: CONVERSION_FACTORS.percentBase,
    step: 5,
  },
};

// Solo etiquetas (compatibilidad con index.astro)
export const inputLabels = Object.fromEntries(
  Object.entries(input).map(([key, field]) => [key, field.label]),
);

// Etiquetas de los resultados de salida del cuadro de mando (Sortides)
export const outputLabels = {
  KitRecomendado: "Kit recomanat",
  ModulosA: "Nombre de mòduls A",
  ModulosB: "Nombre de mòduls B",
  Coste: "Cost",
  CO2: "CO₂",
  Energia: "Energia",
  // Posibles estados del veredicto final de viabilidad
  Veredicto: {
    viable: "Viable",
    ambEstoc: "Amb estoc",
    noArriba: "No arriba",
  },
};

// Carga los datos brutos del dataset desde los JSON importados
export function loadDataset() {
  return {
    cases: rawCasesData,
    materials: rawMaterialsData,
    configs: rawConfigsData,
    results: rawResultsData,
  };
}

// Converteix un percentatge (0-100) en fracció (0-1)
function percentToFraction(percent) {
  return percent / CONVERSION_FACTORS.percentBase;
}

// Converteix tones de CO2 a kg
function tonnesToKg(tonnes) {
  return tonnes * CONVERSION_FACTORS.kgPerTonne;
}

// Mòduls A o B
// A = x persones · (1 mòdul / 4 persones) · (%A / 100)
// B = x persones · (1 mòdul / 4 persones) · (%B / 100)
// (arrodonit cap amunt: no es pot desplegar mig mòdul)
export function calculateModules(persones, pctXarxa) {
  const pctB = pctXarxa;
  const pctA = CONVERSION_FACTORS.percentBase - pctB;
  const base = persones * CONVERSION_FACTORS.modulsPerPersona;
  return {
    modulsA: Math.ceil(base * percentToFraction(pctA)),
    modulsB: Math.ceil(base * percentToFraction(pctB)),
  };
}

// Cost
// A€ = mòduls A · 33.530 € / 1 mòdul A
// B€ = mòduls B · 27.400 € / 1 mòdul B
// Cost = A€ + B€
export function calculateCost(modulsA, modulsB) {
  const eurA = modulsA * CONVERSION_FACTORS.A.eurPerModule;
  const eurB = modulsB * CONVERSION_FACTORS.B.eurPerModule;
  return { eurA, eurB, total: eurA + eurB };
}

// CO2
// tA = mòduls A · 13,3 t / 1 mòdul A
// tB = mòduls B · 11,5 t / 1 mòdul B
export function calculateCO2(modulsA, modulsB) {
  const tA = modulsA * CONVERSION_FACTORS.A.co2TonnesPerModule;
  const tB = modulsB * CONVERSION_FACTORS.B.co2TonnesPerModule;
  return { tA, tB, total: tA + tB };
}

// Veredicte: viabilitat per capacitat, per temps i per pressupost
export function evaluateViability({
  persones,
  modulsA,
  modulsB,
  terminiDies,
  pressupostEur,
}) {
  // Capacitat: els mòduls A + B cobreixen x persones · (1 mòdul / 4 persones)
  const modulsNecessaris = persones * CONVERSION_FACTORS.modulsPerPersona;
  const capacitat = {
    viable: modulsA + modulsB >= modulsNecessaris,
    modulsNecessaris,
    modulsDesplegats: modulsA + modulsB,
  };

  // Temps: termini (dies) <= x persones · K
  const limitDies = persones * K_TEMPS;
  const temps = {
    viable: terminiDies <= limitDies,
    terminiDies,
    limitDies,
    K: K_TEMPS,
  };

  // Pressupost: pressupost (€) <= x persones · K
  const limitEur = persones * K_PRESSUPOST;
  const pressupost = {
    viable: pressupostEur <= limitEur,
    pressupostEur,
    limitEur,
    K: K_PRESSUPOST,
  };

  const viable = capacitat.viable && temps.viable && pressupost.viable;
  return {
    capacitat,
    temps,
    pressupost,
    veredicto: viable ? "viable" : "no_arriba",
  };
}

// Dades de sortida d'un grup de mòduls (A o B)
function buildModuleGroup(factors, count, baseKit) {
  const unitCo2Kg = tonnesToKg(factors.co2TonnesPerModule);
  return {
    configId: baseKit.configId,
    count,
    costeUnitarioEur: factors.eurPerModule,
    costeSubtotalEur: count * factors.eurPerModule,
    co2UnitarioKg: unitCo2Kg,
    co2SubtotalKg: count * unitCo2Kg,
    pvM2: factors.pvM2PerModule,
    bateriaKwh: factors.batteryKwhPerModule,
    climatizacionKw: baseKit.climatizacionKw,
    kitId: baseKit.id,
    reutilizacion: baseKit.reutilizacion,
    materiales: baseKit.materiales,
  };
}

const fmtNum = (n) => Math.round(n).toLocaleString("ca-ES");

// Avalua un escenari encadenant els càlculs de l'esquema
export function evaluateScenario(input) {
  const persones = Math.max(1, Math.round(Number(input.personasAfectadas)));
  const terminiDies = Math.max(0.5, Number(input.plazoMaximoDias));
  const pressupostEur = Math.max(1, Number(input.presupuestoTotalEur));
  const pctXarxa = Math.max(
    0,
    Math.min(CONVERSION_FACTORS.percentBase, Number(input.pctConexionRed)),
  );

  // Kit recomanat
  const baseKit = getKit(input.escenarioId);

  // Mòduls A o B
  const { modulsA, modulsB } = calculateModules(persones, pctXarxa);
  const totalModuls = modulsA + modulsB;

  // Cost i CO2
  const cost = calculateCost(modulsA, modulsB);
  const co2 = calculateCO2(modulsA, modulsB);

  // Veredicte
  const viabilitat = evaluateViability({
    persones,
    modulsA,
    modulsB,
    terminiDies,
    pressupostEur,
  });

  const configA =
    modulsA > 0 ? buildModuleGroup(CONVERSION_FACTORS.A, modulsA, baseKit) : null;
  const configB =
    modulsB > 0 ? buildModuleGroup(CONVERSION_FACTORS.B, modulsB, baseKit) : null;

  const scenarioName = snarioLabels[input.escenarioId] ?? input.escenarioId;
  const veredictoTitulo = `${totalModuls} mòduls · ${baseKit.configId} · ${scenarioName}`;

  const errors = [];
  if (!viabilitat.capacitat.viable) {
    errors.push(
      `Els ${totalModuls} mòduls no cobreixen les ${persones} persones.`,
    );
  }
  if (!viabilitat.temps.viable) {
    errors.push(
      `El termini (${terminiDies} dies) supera el límit de ${viabilitat.temps.limitDies} dies.`,
    );
  }
  if (!viabilitat.pressupost.viable) {
    errors.push(
      `El pressupost (${fmtNum(pressupostEur)} €) supera el límit de ${fmtNum(viabilitat.pressupost.limitEur)} €.`,
    );
  }
  const veredictoDetalle =
    errors.length === 0
      ? `Viable per capacitat, temps (${terminiDies} ≤ ${viabilitat.temps.limitDies} dies) i pressupost (${fmtNum(pressupostEur)} ≤ ${fmtNum(viabilitat.pressupost.limitEur)} €).`
      : errors.join(" ");

  return {
    veredicto: viabilitat.veredicto,
    veredictoTitulo,
    veredictoDetalle,
    viabilitat,
    totalModulos: totalModuls,
    configA,
    configB,
    costeTotalEur: cost.total,
    pctPresupuesto: (cost.total / pressupostEur) * CONVERSION_FACTORS.percentBase,
    despliegueDias: viabilitat.temps.limitDies,
    co2TotalT: co2.total,
    co2PorPersonaKg: tonnesToKg(co2.total) / persones,
    kit: {
      id: baseKit.id,
      nombre: baseKit.configId,
      inicial: baseKit.inicial,
      subtitulo: baseKit.subtitulo,
      elementos: baseKit.elementos,
      materiales: baseKit.materiales,
      kpis: baseKit.kpis,
    },
  };
}

// Els 60 casos d'emergència del dataset, preparats per al selector
export function getCases() {
  return rawCasesData.map((c) => ({
    id: c.caso_id,
    label: `${c.caso_id} · ${snarioLabels[c.escenario_id] ?? c.escenario_id} · ${c.personas_afectadas} persones`,
    input: {
      escenarioId: c.escenario_id,
      personasAfectadas: Number(c.personas_afectadas),
      plazoMaximoDias: Number(c.plazo_maximo_montaje_dias),
      presupuestoTotalEur: Number(c.presupuesto_total_eur),
      pctConexionRed: RED_PCT[c.disponibilidad_red] ?? 50,
    },
  }));
}
