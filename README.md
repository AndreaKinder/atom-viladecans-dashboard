# ATOM Modular · Emergency Deployment Planner

> **A Decision-Making Dashboard** para la asignación y planificación óptima de viviendas modulares industrializadas de emergencia ante crisis climáticas.  
---

## 🎯 Contexto y Reto

En situaciones de emergencia climática extrema (olas de calor costeras o de interior, olas de frío continental y tormentas húmedas), los municipios intermedios necesitan dar refugio inmediato, digno y energéticamente eficiente a la población afectada sin comprometer los objetivos de descarbonización ni desbordar los presupuestos públicos.

Este cuadro de mando interactivo utiliza el **Dataset CON-E1 de ATOM Modular** (construcción industrializada con módulos 3D) para calcular la configuración óptima de módulos, el despliegue logístico, los costes y la huella de carbono incorporada para **60 casos de emergencia**.

---

## ⚙️ Principios del Motor de Decisión (`decision-engine.js`)

### 1. Arquetipos Modulares (Módulo A y Módulo B)
Ambos módulos comparten el mismo chasis de base (**madera laminada**, **24 cm de aislamiento de celulosa** con $U = 0{,}162\,\text{W/m}^2\text{K}$, revestimiento de madera y capacidad para **4 personas por módulo en 22 m²**):

* **Módulo A (Autosuficiente / Off-Grid):**
  * $14\,\text{m}^2$ de paneles solares fotovoltaicos + batería de $10\,\text{kWh}$.
  * Coste: **33.530 €/módulo** | Montaje: **3,6 días/módulo** | Huella: **13,3 t CO₂e**.
  * Diseñado para situaciones de red eléctrica caída o inexistente (`sin_red`).
* **Módulo B (Conectado a Red):**
  * Sin fotovoltaica ni batería instalada.
  * Coste: **27.400 €/módulo** | Montaje: **3,1 días/módulo** | Huella: **11,5 t CO₂e**.
  * Diseñado para ubicaciones con suministro eléctrico operativo (`red_disponible`).

El simulador permite balancear el porcentaje entre Módulo A y Módulo B en función de la disponibilidad real de la red eléctrica en la zona.

### 2. Kits Climáticos Adaptativos
Para evitar sobrecostes y optimizar el confort higrotérmico sin redimensionar sistemas mecánicos:
* **Heat Kit (Calor · C01, C02, C04):** Cubierta y fachada de albedo alto (absorptancia 0,2), vidrio de control solar, persiana exterior domotizada y recuperador entálpico de calor y humedad. Ahorro del 20% en refrigeración y estabilidad a 25,6 °C y 55% HR.
* **Cold Kit (Frío · C03):** Vidrio bajo emisivo ($g = 0{,}50$) para ganancia solar pasiva, persiana exterior abierta de día y cerrada de noche para retención térmica, y ventilación con recuperación de calor.

### 3. Solución al Gap de Viabilidad (Stock de Emergencia)
El montaje de un módulo requiere entre 3,1 y 3,6 días de trabajo de una cuadrilla especializada (con un supuesto de **10 cuadrillas operando en paralelo**).  
Para los casos de emergencia que exigen plazos máximos de **2 días**, el simulador incorpora la estrategia de **Stock Base in situ (4 módulos = 16 personas)**, lo que garantiza refugio inmediato a los primeros afectados mientras el resto de módulos se ensamblan dentro del plazo.

---

## 📊 KPIs Calculados en Tiempo Real

1. **Capacidad y Módulos:** Total de módulos necesarios, desglose Módulo A vs B, y cobertura inmediata con stock base.
2. **Coste Económico:** Coste total de fabricación/montaje, coste por persona y coste por persona y noche de estancia.
3. **Plazos de Despliegue:** Días de ensamblaje con 10 cuadrillas paralelas vs plazo máximo exigido y duración de la estancia.
4. **Presupuesto:** Comparativa frente al presupuesto asignado y cálculo del remanente o exceso.
5. **Impacto Ambiental:** Emisiones de $\text{CO}_2$ incorporado totales y kilogramos de $\text{CO}_2$ por persona alojada.
6. **Avisos Operativos:** Alertas automáticas según accesibilidad para camiones (estándar vs limitado/grúa) y criterio prioritario del caso (rapidez, confort, coste, emisiones o autosuficiencia).

---

## 🛠️ Stack Tecnológico

* **Framework:** [Astro 7](https://astro.build/) (renderizado rápido, arquitectura basada en componentes e islas interactivas).
* **Lógica y Cálculos:** Vanilla JavaScript ES Modules determinista y reactivo (`src/lib/decision-engine.js`).
* **Estilos:** CSS3 nativo moderno (`src/styles/index.css`) con variables CSS y diseño responsive.
* **Testing:** Suite de tests unitarios nativos con `node:test` y `node:assert`, compatible al 100% con `bun test`.
* **Runtime:** Compatible tanto con [Bun](https://bun.sh/) como con [Node.js](https://nodejs.org/).

---

## 🚀 Instalación y Puesta en Marcha

### Prerrequisitos
Tener instalado [Bun](https://bun.sh/) o [Node.js](https://nodejs.org/) (versión 18+).

### 1. Clonar e instalar dependencias
```bash
git clone https://github.com/tu-usuario/atom-viladecans-dashboard.git
cd atom-viladecans-dashboard
bun install
# o con npm:
# npm install
```

### 2. Modo Desarrollo
```bash
bun dev
# o con npm:
# npm run dev
```
Abre en tu navegador: [http://localhost:4321](http://localhost:4321)

### 3. Ejecutar Tests
```bash
bun test
# o con npm:
# npm test
```

### 4. Compilar para Producción
```bash
bun run build
# o con npm:
# npm run build
```

---

## 📁 Estructura del Proyecto

```text
atom-viladecans-dashboard/
├── ATOM_DataSet/                # Dataset CSV original del reto CON-E1
│   ├── atom_casos_emergencia.csv
│   ├── atom_catalogo_materiales.csv
│   ├── atom_clima_horario.csv
│   ├── atom_configuraciones.csv
│   ├── atom_resultados_modelo.csv
│   ├── atom_simulacion_horaria.csv
│   └── MANIFIESTO.json
├── src/
│   ├── data/                    # Dataset normalizado en formato JSON
│   ├── lib/
│   │   ├── decision-engine.js   # Motor de cálculo, proporciones y lógica de negocio
│   │   └── desition-engine.js   # Re-export de compatibilidad
│   ├── pages/
│   │   ├── api/cases.js         # Endpoint REST con los casos del dataset
│   │   └── index.astro          # Interfaz principal (Dashboard y pestaña de Fórmulas)
│   └── styles/
│       └── index.css            # Estilos y variables visuales del dashboard
├── tests/
│   └── decision-engine.test.js  # 14 tests unitarios del motor de decisión
├── astro.config.mjs
├── package.json
└── tsconfig.json
```

---

## 📄 Licencia

Este proyecto está bajo licencia MIT. Desarrollado en el marco de la **Hackathon Viladecans 2030**.
