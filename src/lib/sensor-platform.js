import rawClimateData from "../data/atom_clima_horario.json" with { type: "json" };

export const SENSOR_SPECS = {
  deviceName: "Nodo IAQ y Energía ATOM-A100",
  airQuality: ["CO₂ (ppm)", "PM2.5 (µg/m³)", "PM10 (µg/m³)", "TVOC (ppb)"],
  comfort: [
    "Temperatura (°C)",
    "Humedad (% HR)",
    "Ruido (dBA)",
    "Luz (lux)",
    "Presión atmosférica (hPa)",
  ],
  optionalSensors: [
    "Ozono (O₃)",
    "Dióxido de nitrógeno (NO₂)",
    "Monóxido de carbono (CO)",
    "Formaldehído (HCHO)",
  ],
  energy: ["SoC Batería (%)", "Solar FV (kW)", "Demanda (kW)"],
  connectivity: "Wi-Fi 2.4 / 5 GHz, MQTT",
  bms: "BACnet MS/TP e IP, Modbus RTU/IP",
  power: "PoE, 24 V AC, 10–30 V DC, USB-C",
  mounting: "Pared o techo",
  sampling: "Promedios de 1 minuto · Alojamiento en UE",
  standards: ["WELL v2 A08 y T06", "RESET Air acreditado", "CE, FCC, RoHS, REACH"],
};

export const CONTROL_MODES = {
  auto: {
    id: "auto",
    label: "Auto (Kit Climático)",
    description: "Recuperación entálpica y control solar equilibrados",
    co2Delta: 0,
    tempDelta: 0,
    pm25Delta: 0,
    powerDeltaKw: 0,
  },
  ventilation_boost: {
    id: "ventilation_boost",
    label: "Ventilación Intensiva",
    description: "Renovación rápida de aire exterior para reducir CO₂ y TVOC",
    co2Delta: -320,
    tempDelta: -0.6,
    pm25Delta: -5.5,
    powerDeltaKw: 0.18,
  },
  eco_battery: {
    id: "eco_battery",
    label: "Eco / Ahorro Batería",
    description: "Modo de bajo consumo para preservar la batería aislada",
    co2Delta: 95,
    tempDelta: 0.9,
    pm25Delta: 1.5,
    powerDeltaKw: -0.22,
  },
  night_purge: {
    id: "night_purge",
    label: "Purga Nocturna",
    description: "Ventilación cruzada pasiva y refrescamiento nocturno",
    co2Delta: -180,
    tempDelta: -1.4,
    pm25Delta: -2.0,
    powerDeltaKw: -0.08,
  },
};

export const BLIND_MODES = {
  auto_sun: { id: "auto_sun", label: "Auto Solar", tempDelta: 0 },
  closed: { id: "closed", label: "Cerrada (Sombra)", tempDelta: -0.8 },
  open: { id: "open", label: "Abierta (Ganancia Solar)", tempDelta: 0.7 },
};

export const DEFAULT_THRESHOLDS = {
  co2Ppm: 1000,
  pm25Ug: 25,
  tempHighC: 27,
  tempLowC: 19,
  humidityHighPct: 65,
  batteryLowPct: 25,
};

export const SERVICE_MODELS = {
  annual_service_fee: {
    id: "annual_service_fee",
    name: "Cuota de Servicio Anual",
    badge: "SaaS · Operación Integral",
    summary:
      "Nosotros alojamos, monitorizamos 24/7, gestionamos alertas y entregamos informes WELL/RESET alojados en la UE.",
    upfrontPerModuleEur: 0,
    annualPerModuleEur: 480,
    includes: [
      "Telemetría alojada en la UE con histórico cada 1 min",
      "Alertas automáticas 24/7 y ajuste remoto del Kit Climático",
      "Informes trimestrales de cumplimiento WELL v2 y RESET Air",
      "Mantenimiento OTA de firmware, pasarela MQTT y BMS",
    ],
  },
  platform_license: {
    id: "platform_license",
    name: "Licencia de Plataforma",
    badge: "On-Prem / Municipal",
    summary:
      "Licencia de software por módulo para municipios u operadores que gestionan sus propios despliegues.",
    upfrontPerModuleEur: 1450,
    annualPerModuleEur: 140,
    includes: [
      "Licencia completa para nube municipal o servidor local",
      "Operadores ilimitados y vistas públicas Kiosco / QR",
      "Integración directa BACnet/IP, Modbus y API REST",
      "Soporte anual y actualizaciones opcionales (140 €/mód/año)",
    ],
  },
};

function round1(n) {
  return Math.round(n * 10) / 10;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

const CLIMATE_BY_SCENARIO = new Map();
for (const row of rawClimateData) {
  if (!CLIMATE_BY_SCENARIO.has(row.escenario_id)) {
    CLIMATE_BY_SCENARIO.set(row.escenario_id, []);
  }
  CLIMATE_BY_SCENARIO.get(row.escenario_id).push(row);
}

function getOutdoorSnapshot(scenarioId, hour = 14) {
  const rows = CLIMATE_BY_SCENARIO.get(scenarioId) ?? [];
  const match = rows.find((r) => r.hora_dia === hour) ?? rows[0];
  return {
    outdoorTempC: match ? round1(match.temperatura_exterior_c) : 28.0,
    outdoorHumidityPct: match ? round1(match.humedad_exterior_pct) : 60.0,
  };
}

const BASE_FLEET_TEMPLATES = [
  {
    id: "MOD-VLD-01",
    site: "Viladecans · Parc del Mil·lenari",
    zone: "Refugio Familiar 01",
    archetype: "Módulo A (Aislado)",
    scenarioId: "C01",
    kit: "Kit Calor",
    occupants: 4,
    status: "online",
    lastSeenMinAgo: 1,
    firmware: "v2.4.1",
    protocol: "MQTT",
    controls: { hvacMode: "auto", blindMode: "auto_sun" },
    baseSensors: {
      co2Ppm: 680,
      pm25Ug: 9.2,
      pm10Ug: 15.4,
      tvocPpb: 145,
      indoorTempC: 24.8,
      humidityPct: 52,
      noiseDba: 38,
      lightLux: 340,
      pressureHpa: 1015,
      batterySocPct: 84,
      solarKw: 1.85,
      powerKw: 0.62,
    },
    hoursOver1000Ppm: 1.5,
  },
  {
    id: "MOD-VLD-02",
    site: "Viladecans · Parc del Mil·lenari",
    zone: "Refugio Familiar 02",
    archetype: "Módulo A (Aislado)",
    scenarioId: "C01",
    kit: "Kit Calor",
    occupants: 4,
    status: "online",
    lastSeenMinAgo: 1,
    firmware: "v2.4.1",
    protocol: "MQTT",
    controls: { hvacMode: "auto", blindMode: "auto_sun" },
    baseSensors: {
      co2Ppm: 1185,
      pm25Ug: 18.4,
      pm10Ug: 29.1,
      tvocPpb: 390,
      indoorTempC: 26.4,
      humidityPct: 59,
      noiseDba: 44,
      lightLux: 290,
      pressureHpa: 1015,
      batterySocPct: 68,
      solarKw: 1.72,
      powerKw: 0.74,
    },
    hoursOver1000Ppm: 14.2,
  },
  {
    id: "MOD-VLD-03",
    site: "Viladecans · Parc del Mil·lenari",
    zone: "Módulo Médico y Triaje",
    archetype: "Módulo B (Red)",
    scenarioId: "C01",
    kit: "Kit Calor",
    occupants: 3,
    status: "online",
    lastSeenMinAgo: 1,
    firmware: "v2.4.1",
    protocol: "BACnet/IP",
    controls: { hvacMode: "ventilation_boost", blindMode: "closed" },
    baseSensors: {
      co2Ppm: 540,
      pm25Ug: 6.1,
      pm10Ug: 11.0,
      tvocPpb: 110,
      indoorTempC: 23.6,
      humidityPct: 49,
      noiseDba: 41,
      lightLux: 480,
      pressureHpa: 1016,
      batterySocPct: null,
      solarKw: 0,
      powerKw: 0.85,
    },
    hoursOver1000Ppm: 0.0,
  },
  {
    id: "MOD-GAV-04",
    site: "Gavà · Zona Marítima",
    zone: "Unidad Costera 04",
    archetype: "Módulo A (Aislado)",
    scenarioId: "C04",
    kit: "Kit Calor",
    occupants: 4,
    status: "online",
    lastSeenMinAgo: 2,
    firmware: "v2.4.0",
    protocol: "MQTT",
    controls: { hvacMode: "auto", blindMode: "open" },
    baseSensors: {
      co2Ppm: 940,
      pm25Ug: 27.6,
      pm10Ug: 41.2,
      tvocPpb: 310,
      indoorTempC: 27.5,
      humidityPct: 67,
      noiseDba: 42,
      lightLux: 510,
      pressureHpa: 1012,
      batterySocPct: 21,
      solarKw: 0.95,
      powerKw: 0.88,
    },
    hoursOver1000Ppm: 8.6,
  },
  {
    id: "MOD-GAV-05",
    site: "Gavà · Zona Marítima",
    zone: "Unidad Costera 05",
    archetype: "Módulo B (Red)",
    scenarioId: "C04",
    kit: "Kit Calor",
    occupants: 2,
    status: "online",
    lastSeenMinAgo: 1,
    firmware: "v2.4.1",
    protocol: "BACnet/IP",
    controls: { hvacMode: "auto", blindMode: "auto_sun" },
    baseSensors: {
      co2Ppm: 615,
      pm25Ug: 10.4,
      pm10Ug: 17.8,
      tvocPpb: 160,
      indoorTempC: 25.1,
      humidityPct: 55,
      noiseDba: 36,
      lightLux: 360,
      pressureHpa: 1012,
      batterySocPct: null,
      solarKw: 0,
      powerKw: 0.54,
    },
    hoursOver1000Ppm: 0.5,
  },
  {
    id: "MOD-SBO-06",
    site: "Sant Boi · Camp Base",
    zone: "Refugio Interior 06",
    archetype: "Módulo B (Red)",
    scenarioId: "C02",
    kit: "Kit Calor",
    occupants: 4,
    status: "online",
    lastSeenMinAgo: 1,
    firmware: "v2.4.1",
    protocol: "Modbus",
    controls: { hvacMode: "auto", blindMode: "closed" },
    baseSensors: {
      co2Ppm: 790,
      pm25Ug: 12.8,
      pm10Ug: 21.0,
      tvocPpb: 205,
      indoorTempC: 25.4,
      humidityPct: 48,
      noiseDba: 39,
      lightLux: 260,
      pressureHpa: 1014,
      batterySocPct: null,
      solarKw: 0,
      powerKw: 0.67,
    },
    hoursOver1000Ppm: 3.1,
  },
  {
    id: "MOD-SBO-07",
    site: "Sant Boi · Camp Base",
    zone: "Reserva Invierno 07",
    archetype: "Módulo A (Aislado)",
    scenarioId: "C03",
    kit: "Kit Frío",
    occupants: 3,
    status: "online",
    lastSeenMinAgo: 1,
    firmware: "v2.4.1",
    protocol: "MQTT",
    controls: { hvacMode: "auto", blindMode: "open" },
    baseSensors: {
      co2Ppm: 720,
      pm25Ug: 8.9,
      pm10Ug: 14.2,
      tvocPpb: 175,
      indoorTempC: 21.4,
      humidityPct: 46,
      noiseDba: 35,
      lightLux: 410,
      pressureHpa: 1020,
      batterySocPct: 76,
      solarKw: 1.4,
      powerKw: 0.59,
    },
    hoursOver1000Ppm: 2.0,
  },
  {
    id: "MOD-SBO-08",
    site: "Sant Boi · Camp Base",
    zone: "Logística y Recepción 08",
    archetype: "Módulo B (Red)",
    scenarioId: "C02",
    kit: "Kit Calor",
    occupants: 0,
    status: "offline",
    lastSeenMinAgo: 42,
    firmware: "v2.3.9",
    protocol: "Modbus",
    controls: { hvacMode: "auto", blindMode: "auto_sun" },
    baseSensors: {
      co2Ppm: 450,
      pm25Ug: 11.2,
      pm10Ug: 18.0,
      tvocPpb: 120,
      indoorTempC: 26.0,
      humidityPct: 50,
      noiseDba: 30,
      lightLux: 180,
      pressureHpa: 1014,
      batterySocPct: null,
      solarKw: 0,
      powerKw: 0.12,
    },
    hoursOver1000Ppm: 0.0,
  },
];

function computeEffectiveSensors(template, controls) {
  const outdoor = getOutdoorSnapshot(template.scenarioId, 14);
  const hvac = CONTROL_MODES[controls.hvacMode] ?? CONTROL_MODES.auto;
  const blind = BLIND_MODES[controls.blindMode] ?? BLIND_MODES.auto_sun;
  const baseHvac =
    CONTROL_MODES[template.controls.hvacMode] ?? CONTROL_MODES.auto;
  const baseBlind =
    BLIND_MODES[template.controls.blindMode] ?? BLIND_MODES.auto_sun;

  const co2Delta = hvac.co2Delta - baseHvac.co2Delta;
  const tempDelta =
    hvac.tempDelta - baseHvac.tempDelta + (blind.tempDelta - baseBlind.tempDelta);
  const pm25Delta = hvac.pm25Delta - baseHvac.pm25Delta;
  const powerDelta = hvac.powerDeltaKw - baseHvac.powerDeltaKw;

  const co2Ppm = Math.round(clamp(template.baseSensors.co2Ppm + co2Delta, 410, 2200));
  const pm25Ug = round1(clamp(template.baseSensors.pm25Ug + pm25Delta, 2.5, 80));
  const pm10Ug = round1(
    clamp(template.baseSensors.pm10Ug + pm25Delta * 1.4, 5, 120),
  );
  const tvocPpb = Math.round(
    clamp(template.baseSensors.tvocPpb + co2Delta * 0.28, 60, 900),
  );
  const indoorTempC = round1(
    clamp(template.baseSensors.indoorTempC + tempDelta, 16, 34),
  );
  const powerKw = round1(
    clamp(template.baseSensors.powerKw + powerDelta, 0.08, 2.5),
  );
  const batterySocPct =
    template.baseSensors.batterySocPct === null
      ? null
      : Math.round(
          clamp(
            template.baseSensors.batterySocPct - powerDelta * 18,
            5,
            100,
          ),
        );

  return {
    ...template.baseSensors,
    co2Ppm,
    pm25Ug,
    pm10Ug,
    tvocPpb,
    indoorTempC,
    outdoorTempC: outdoor.outdoorTempC,
    powerKw,
    batterySocPct,
  };
}

export function computeModuleIaqs(module, thresholds = DEFAULT_THRESHOLDS) {
  if (module.status === "offline") {
    return { score: 0, grade: "Sin conexión", band: "offline" };
  }
  const s = module.sensors;
  let score = 10.0;

  if (s.co2Ppm > thresholds.co2Ppm) {
    score -= Math.min(3.5, ((s.co2Ppm - thresholds.co2Ppm) / 250) * 1.2 + 1.0);
  } else if (s.co2Ppm > 800) {
    score -= ((s.co2Ppm - 800) / 200) * 0.6;
  }

  if (s.pm25Ug > thresholds.pm25Ug) {
    score -= Math.min(2.8, ((s.pm25Ug - thresholds.pm25Ug) / 10) * 1.0 + 0.9);
  } else if (s.pm25Ug > 12) {
    score -= ((s.pm25Ug - 12) / 13) * 0.6;
  }

  if (s.indoorTempC > thresholds.tempHighC) {
    score -= Math.min(2.0, (s.indoorTempC - thresholds.tempHighC) * 0.8 + 0.5);
  } else if (s.indoorTempC < thresholds.tempLowC) {
    score -= Math.min(2.0, (thresholds.tempLowC - s.indoorTempC) * 0.8 + 0.5);
  }

  if (s.humidityPct > thresholds.humidityHighPct) {
    score -= Math.min(1.2, (s.humidityPct - thresholds.humidityHighPct) * 0.15);
  }

  if (s.tvocPpb > 300) {
    score -= Math.min(1.0, (s.tvocPpb - 300) / 200);
  }

  const finalScore = round1(clamp(score, 1.0, 10.0));
  if (finalScore >= 8.0) {
    return { score: finalScore, grade: "Bueno (A)", band: "good" };
  }
  if (finalScore >= 6.0) {
    return { score: finalScore, grade: "Moderado (B)", band: "moderate" };
  }
  return { score: finalScore, grade: "Deficiente (C)", band: "unhealthy" };
}

function buildAlerts(modules, thresholds, resolvedIds = new Set(), ackedIds = new Set()) {
  const alerts = [];
  for (const mod of modules) {
    if (mod.status === "offline") {
      const id = `ALT-${mod.id}-OFFLINE`;
      if (!resolvedIds.has(id)) {
        alerts.push({
          id,
          moduleId: mod.id,
          site: mod.site,
          zone: mod.zone,
          severity: "critical",
          metric: "Conectividad",
          title: `Sensor ${mod.id} sin conexión (${mod.lastSeenMinAgo} min)`,
          detail: `Sin latido MQTT/Modbus durante ${mod.lastSeenMinAgo} minutos.`,
          acknowledged: ackedIds.has(id),
        });
      }
      continue;
    }

    const s = mod.sensors;
    if (s.co2Ppm > thresholds.co2Ppm) {
      const id = `ALT-${mod.id}-CO2`;
      if (!resolvedIds.has(id)) {
        alerts.push({
          id,
          moduleId: mod.id,
          site: mod.site,
          zone: mod.zone,
          severity: s.co2Ppm > 1200 ? "critical" : "warning",
          metric: "CO₂",
          title: `CO₂ elevado en ${mod.zone} (${s.co2Ppm} ppm)`,
          detail: `Supera el umbral de ${thresholds.co2Ppm} ppm. Activa Ventilación Intensiva.`,
          acknowledged: ackedIds.has(id),
        });
      }
    }

    if (s.pm25Ug > thresholds.pm25Ug) {
      const id = `ALT-${mod.id}-PM25`;
      if (!resolvedIds.has(id)) {
        alerts.push({
          id,
          moduleId: mod.id,
          site: mod.site,
          zone: mod.zone,
          severity: "warning",
          metric: "PM2.5",
          title: `PM2.5 elevado en ${mod.zone} (${s.pm25Ug} µg/m³)`,
          detail: `Por encima del límite de ${thresholds.pm25Ug} µg/m³. Revisa filtros o activa purga.`,
          acknowledged: ackedIds.has(id),
        });
      }
    }

    if (s.indoorTempC > thresholds.tempHighC) {
      const id = `ALT-${mod.id}-TEMP`;
      if (!resolvedIds.has(id)) {
        alerts.push({
          id,
          moduleId: mod.id,
          site: mod.site,
          zone: mod.zone,
          severity: "warning",
          metric: "Temperatura",
          title: `Deriva térmica en ${mod.zone} (${s.indoorTempC} °C)`,
          detail: `Supera los ${thresholds.tempHighC} °C de confort. Cierra persiana exterior o purga.`,
          acknowledged: ackedIds.has(id),
        });
      }
    }

    if (s.batterySocPct !== null && s.batterySocPct < thresholds.batteryLowPct) {
      const id = `ALT-${mod.id}-BAT`;
      if (!resolvedIds.has(id)) {
        alerts.push({
          id,
          moduleId: mod.id,
          site: mod.site,
          zone: mod.zone,
          severity: "critical",
          metric: "SoC Batería",
          title: `Batería baja en ${mod.id} (${s.batterySocPct}%)`,
          detail: `Por debajo del ${thresholds.batteryLowPct}%. Activa Eco / Ahorro Batería.`,
          acknowledged: ackedIds.has(id),
        });
      }
    }
  }
  return alerts;
}

export function createInitialFleetState() {
  const thresholds = { ...DEFAULT_THRESHOLDS };
  const modules = BASE_FLEET_TEMPLATES.map((tpl) => {
    const controls = { ...tpl.controls };
    const sensors = computeEffectiveSensors(tpl, controls);
    const mod = {
      id: tpl.id,
      site: tpl.site,
      zone: tpl.zone,
      archetype: tpl.archetype,
      scenarioId: tpl.scenarioId,
      kit: tpl.kit,
      occupants: tpl.occupants,
      status: tpl.status,
      lastSeenMinAgo: tpl.lastSeenMinAgo,
      firmware: tpl.firmware,
      protocol: tpl.protocol,
      controls,
      sensors,
      hoursOver1000Ppm: tpl.hoursOver1000Ppm,
    };
    return {
      ...mod,
      iaqs: computeModuleIaqs(mod, thresholds),
    };
  });

  return {
    thresholds,
    modules,
    resolvedAlertIds: [],
    acknowledgedAlertIds: [],
    actionLog: [
      {
        time: "14:00",
        moduleId: "MOD-VLD-03",
        action: "Ventilación Intensiva activa · Módulo Médico y Triaje",
      },
    ],
  };
}

export function applyModuleControl(fleetState, moduleId, patch = {}) {
  const prevMod = fleetState.modules.find((m) => m.id === moduleId);
  const nextModules = fleetState.modules.map((mod) => {
    if (mod.id !== moduleId) return mod;
    const template = BASE_FLEET_TEMPLATES.find((t) => t.id === moduleId);
    if (!template) return mod;

    const nextControls = {
      ...mod.controls,
      ...patch,
    };
    const nextSensors = computeEffectiveSensors(template, nextControls);
    const updated = {
      ...mod,
      controls: nextControls,
      sensors: nextSensors,
    };
    const nextIaqs = computeModuleIaqs(updated, fleetState.thresholds);
    return {
      ...updated,
      iaqs: nextIaqs,
      lastVerification: prevMod
        ? {
            before: {
              co2Ppm: prevMod.sensors.co2Ppm,
              indoorTempC: prevMod.sensors.indoorTempC,
              pm25Ug: prevMod.sensors.pm25Ug,
              score: prevMod.iaqs.score,
            },
            after: {
              co2Ppm: nextSensors.co2Ppm,
              indoorTempC: nextSensors.indoorTempC,
              pm25Ug: nextSensors.pm25Ug,
              score: nextIaqs.score,
            },
          }
        : null,
    };
  });

  const target = nextModules.find((m) => m.id === moduleId);
  const modeLabel = target
    ? CONTROL_MODES[target.controls.hvacMode]?.label ?? target.controls.hvacMode
    : "";
  const blindLabel = target
    ? BLIND_MODES[target.controls.blindMode]?.label ?? target.controls.blindMode
    : "";

  return {
    ...fleetState,
    modules: nextModules,
    actionLog: [
      {
        time: "Ahora",
        moduleId,
        action: `Modo ${modeLabel} · Persiana: ${blindLabel}`,
      },
      ...fleetState.actionLog.slice(0, 5),
    ],
  };
}

export function acknowledgeAlert(fleetState, alertId) {
  if (fleetState.acknowledgedAlertIds.includes(alertId)) return fleetState;
  return {
    ...fleetState,
    acknowledgedAlertIds: [...fleetState.acknowledgedAlertIds, alertId],
  };
}

export function resolveAlert(fleetState, alertId) {
  if (fleetState.resolvedAlertIds.includes(alertId)) return fleetState;
  return {
    ...fleetState,
    resolvedAlertIds: [...fleetState.resolvedAlertIds, alertId],
  };
}

export function computeFleetSummary(fleetState, siteFilter = "all") {
  const modules =
    siteFilter === "all"
      ? fleetState.modules
      : fleetState.modules.filter((m) => m.site === siteFilter);

  const onlineModules = modules.filter((m) => m.status === "online");
  const avgScore =
    onlineModules.length > 0
      ? round1(
          onlineModules.reduce((acc, m) => acc + m.iaqs.score, 0) /
            onlineModules.length,
        )
      : 0;

  const overallGrade =
    avgScore >= 8.0
      ? "Bueno (A)"
      : avgScore >= 6.0
        ? "Moderado (B)"
        : "Deficiente (C)";

  const counts = {
    total: modules.length,
    online: onlineModules.length,
    offline: modules.filter((m) => m.status === "offline").length,
    good: modules.filter((m) => m.iaqs.band === "good").length,
    moderate: modules.filter((m) => m.iaqs.band === "moderate").length,
    unhealthy: modules.filter((m) => m.iaqs.band === "unhealthy").length,
  };

  const alerts = buildAlerts(
    modules,
    fleetState.thresholds,
    new Set(fleetState.resolvedAlertIds),
    new Set(fleetState.acknowledgedAlertIds),
  );

  const worstMod = [...onlineModules].sort(
    (a, b) => a.iaqs.score - b.iaqs.score,
  )[0];
  let worstSpace = null;
  if (worstMod) {
    const s = worstMod.sensors;
    const t = fleetState.thresholds;
    let driver = "calidad del aire";
    if (s.co2Ppm > t.co2Ppm) driver = "CO₂";
    else if (s.pm25Ug > t.pm25Ug) driver = "PM2.5";
    else if (s.indoorTempC > t.tempHighC || s.indoorTempC < t.tempLowC) driver = "temperatura";
    else if (s.humidityPct > t.humidityHighPct) driver = "humedad";
    else if (s.tvocPpb > 300) driver = "TVOC";
    worstSpace = {
      id: worstMod.id,
      zone: worstMod.zone,
      score: worstMod.iaqs.score,
      driver,
    };
  }

  const worstCo2 = [...onlineModules].sort(
    (a, b) => b.sensors.co2Ppm - a.sensors.co2Ppm,
  )[0];
  const offlineMod = modules.find((m) => m.status === "offline");
  const weeklyInsight = `La calidad del aire de la flota es ${overallGrade} (${avgScore}/10). ${
    worstCo2
      ? `El pico de CO₂ es de ${worstCo2.sensors.co2Ppm} ppm en ${worstCo2.zone} (${worstCo2.id}).`
      : ""
  } ${
    offlineMod
      ? `Recordatorio: ${offlineMod.id} (${offlineMod.zone}) lleva ${offlineMod.lastSeenMinAgo} min sin conexión.`
      : "Todos los sensores desplegados reportan promedios cada 1 minuto."
  }`.trim();

  return {
    avgScore,
    overallGrade,
    counts,
    alerts,
    worstSpace,
    weeklyInsight,
  };
}

export function get24hSeries(
  fleetState,
  { siteFilter = "all", moduleId = "all", metric = "iaqs" } = {},
) {
  const pool =
    moduleId !== "all"
      ? fleetState.modules.filter((m) => m.id === moduleId)
      : siteFilter !== "all"
        ? fleetState.modules.filter((m) => m.site === siteFilter)
        : fleetState.modules;

  const activePool = pool.filter((m) => m.status === "online");
  const refMod = activePool[0] ?? fleetState.modules[0];
  const climateRows =
    CLIMATE_BY_SCENARIO.get(refMod?.scenarioId ?? "C01")?.slice(0, 24) ?? [];

  const avgCo2 =
    activePool.reduce((s, m) => s + m.sensors.co2Ppm, 0) /
    Math.max(1, activePool.length);
  const avgTemp =
    activePool.reduce((s, m) => s + m.sensors.indoorTempC, 0) /
    Math.max(1, activePool.length);
  const avgPm25 =
    activePool.reduce((s, m) => s + m.sensors.pm25Ug, 0) /
    Math.max(1, activePool.length);
  const avgHumidity =
    activePool.reduce((s, m) => s + m.sensors.humidityPct, 0) /
    Math.max(1, activePool.length);
  const avgScore =
    activePool.reduce((s, m) => s + m.iaqs.score, 0) /
    Math.max(1, activePool.length);
  const batPool = activePool.filter((m) => m.sensors.batterySocPct !== null);
  const avgBat =
    batPool.length > 0
      ? batPool.reduce((s, m) => s + m.sensors.batterySocPct, 0) / batPool.length
      : 75;

  return Array.from({ length: 24 }, (_, h) => {
    const row = climateRows[h];
    const outdoorTemp = row ? row.temperatura_exterior_c : 24 + Math.sin((h - 8) / 3.8) * 5;
    const occupancyWave = h >= 8 && h <= 22 ? Math.sin(((h - 8) / 14) * Math.PI) : 0.15;
    const solarWave = h >= 7 && h <= 19 ? Math.sin(((h - 7) / 12) * Math.PI) : 0;

    let value = avgScore;
    let outdoorValue = null;

    if (metric === "iaqs") {
      value = round1(clamp(avgScore + 0.5 - occupancyWave * 0.7, 2, 10));
    } else if (metric === "co2") {
      value = Math.round(clamp(avgCo2 - 180 + occupancyWave * 240, 410, 2000));
    } else if (metric === "temp") {
      value = round1(avgTemp - 0.6 + occupancyWave * 0.8);
      outdoorValue = round1(outdoorTemp);
    } else if (metric === "pm25") {
      value = round1(clamp(avgPm25 - 2 + occupancyWave * 3.5, 2, 60));
    } else if (metric === "humidity") {
      value = round1(clamp(avgHumidity + (1 - occupancyWave) * 3, 30, 85));
    } else if (metric === "battery") {
      value = Math.round(clamp(avgBat - 10 + solarWave * 16, 10, 100));
    }

    return {
      hour: `${String(h).padStart(2, "0")}:00`,
      value,
      outdoorValue,
    };
  });
}

export function answerFleetQuestion(fleetState, question) {
  const q = String(question || "").toLowerCase();
  const summary = computeFleetSummary(fleetState);
  const online = fleetState.modules.filter((m) => m.status === "online");

  if (
    q.includes("semana") ||
    q.includes("pasada") ||
    q.includes("week") ||
    q.includes("anterior")
  ) {
    const prevAvgScore = round1(clamp(summary.avgScore - 0.6, 1, 10));
    const scoreDiff = round1(summary.avgScore - prevAvgScore);
    const totalHours = round1(
      fleetState.modules.reduce((acc, m) => acc + m.hoursOver1000Ppm, 0),
    );
    const prevHours = round1(totalHours + 6.4);
    const lines = [
      `• IAQS medio de flota: ${summary.avgScore}/10 esta semana frente a ${prevAvgScore}/10 la semana pasada (+${scoreDiff} pts).`,
      `• Exposición > 1.000 ppm CO₂: ${totalHours} h acumuladas frente a ${prevHours} h la semana pasada (−6,4 h).`,
      `• Espacios en rango Bueno (A): ${summary.counts.good} de ${summary.counts.online} nodos en línea (${summary.alerts.length} alertas activas).`,
    ];
    return {
      title: "Comparativa semanal: esta semana frente a la semana pasada",
      answer: lines.join("\n"),
      dataUsed: ["indice_iaqs_semanal", "horas_co2_1000ppm", "alertas_flota"],
    };
  }

  if (
    q.includes("1,000") ||
    q.includes("1.000") ||
    q.includes("1000") ||
    q.includes("co2") ||
    q.includes("co₂") ||
    q.includes("tiempo") ||
    q.includes("longest")
  ) {
    const ranked = [...fleetState.modules]
      .sort((a, b) => b.hoursOver1000Ppm - a.hoursOver1000Ppm)
      .slice(0, 4);
    const lines = ranked.map(
      (m) => `• ${m.id} (${m.zone}): ${m.hoursOver1000Ppm} h sobre 1.000 ppm (actual: ${m.sensors.co2Ppm} ppm)`,
    );
    return {
      title: "Módulos con más horas por encima de 1.000 ppm de CO₂ esta semana",
      answer: lines.join("\n"),
      dataUsed: ["co2_ppm", "horas_ocupacion"],
    };
  }

  if (
    q.includes("batería") ||
    q.includes("bateria") ||
    q.includes("battery") ||
    q.includes("aislado") ||
    q.includes("off-grid") ||
    q.includes("soc") ||
    q.includes("solar")
  ) {
    const offGrid = online.filter((m) => m.sensors.batterySocPct !== null);
    const ranked = [...offGrid].sort(
      (a, b) => a.sensors.batterySocPct - b.sensors.batterySocPct,
    );
    const lines = ranked.map(
      (m) =>
        `• ${m.id} (${m.zone}): ${m.sensors.batterySocPct}% SoC · Solar ${m.sensors.solarKw} kW / Carga ${m.sensors.powerKw} kW`,
    );
    return {
      title: "Estado de batería y generación solar en Módulos A (aislados)",
      answer: lines.join("\n"),
      dataUsed: ["soc_bateria", "solar_fv_kw"],
    };
  }

  if (
    q.includes("exterior") ||
    q.includes("confort") ||
    q.includes("temp") ||
    q.includes("calor") ||
    q.includes("clima")
  ) {
    const lines = online.slice(0, 4).map((m) => {
      const delta = round1(m.sensors.outdoorTempC - m.sensors.indoorTempC);
      return `• ${m.id} (${m.kit}): ${m.sensors.indoorTempC} °C interior frente a ${m.sensors.outdoorTempC} °C exterior (Δ ${delta >= 0 ? "-" : "+"}${Math.abs(delta)} °C)`;
    });
    return {
      title: "Comparativa de confort térmico interior frente a clima exterior",
      answer: lines.join("\n"),
      dataUsed: ["temp_interior_c", "temp_exterior_c"],
    };
  }

  const attention = summary.alerts.slice(0, 4);
  const lines =
    attention.length > 0
      ? attention.map((a) => `• [${a.severity === "critical" ? "CRÍTICA" : "AVISO"}] ${a.title} — ${a.detail}`)
      : ["• Todos los módulos están dentro de los umbrales de confort y calidad del aire WELL/RESET."];
  return {
    title: `Estado de la flota: ${summary.overallGrade} (${summary.avgScore}/10)`,
    answer: lines.join("\n"),
    dataUsed: ["indice_iaqs", "alertas_activas"],
  };
}

export function calculateLicensingQuote(moduleCount, modelId) {
  const count = Math.max(1, Number(moduleCount) || 1);
  const model = SERVICE_MODELS[modelId] ?? SERVICE_MODELS.annual_service_fee;
  const upfrontEur = count * model.upfrontPerModuleEur;
  const annualEur = count * model.annualPerModuleEur;
  return {
    modelId: model.id,
    name: model.name,
    moduleCount: count,
    upfrontEur,
    annualEur,
    yearOneTotalEur: upfrontEur + annualEur,
    threeYearTotalEur: upfrontEur + annualEur * 3,
  };
}
