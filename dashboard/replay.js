const textByLanguage = {
  en: {
    home: "Home", impact: "Impact Dashboard", hostedBadge: "HOSTED REPLAY", title: "Evidence without cloud credentials.",
    intro: "Explore reproducible drift cases from a static public site. Live IBM Bob runs stay local; verified recordings appear here only after export and review.",
    modeTitle: "Hosted Replay Mode", modeText: "No Bob Shell, Terraform, cloud APIs, or credentials run in this deployment.",
    selectRun: "Select a replay", findings: "Detected problem", recommendations: "Recommended actions", bobTrace: "IBM Bob trace",
    openLocal: "Open Live Local Console", guided: "GUIDED MCP PREVIEW", recorded: "RECORDED IBM BOB RUN", noBob: "This guided preview does not claim IBM Bob output. Run the local workflow, review its artifacts, then export it to publish a verified replay.",
    none: "No recorded Bob runs have been published yet.", declared: "Declared", observed: "Observed", priority: "Priority",
  },
  es: {
    home: "Inicio", impact: "Dashboard de impacto", hostedBadge: "REPLAY PUBLICO", title: "Evidencia sin credenciales cloud.",
    intro: "Explora casos de drift reproducibles desde un sitio publico estatico. Las corridas reales de IBM Bob se mantienen locales; los registros verificados aparecen aqui tras exportarlos y revisarlos.",
    modeTitle: "Modo replay publico", modeText: "Este despliegue no ejecuta Bob Shell, Terraform, APIs cloud ni credenciales.",
    selectRun: "Elige un replay", findings: "Problema detectado", recommendations: "Acciones recomendadas", bobTrace: "Traza de IBM Bob",
    openLocal: "Abrir consola local en vivo", guided: "VISTA MCP GUIADA", recorded: "CORRIDA IBM BOB GRABADA", noBob: "Esta vista guiada no atribuye salida a IBM Bob. Ejecuta el flujo local, revisa sus artefactos y luego exportalo para publicar un replay verificado.",
    none: "Todavia no se publicaron corridas grabadas de Bob.", declared: "Declarado", observed: "Observado", priority: "Prioridad",
  },
};

const guidedReplays = [
  {
    id: "guided-low", source: "guided_preview", scenario: { scenario_id: "low", title: { en: "Environment tag changed", es: "Etiqueta de entorno modificada" }, description: { en: "A governance tag no longer matches the Terraform baseline.", es: "Una etiqueta de gobierno ya no coincide con la linea base de Terraform." } },
    report: { risk_score: 20, risk_level: "low", detalle: [{ resource: "aws_s3_bucket.data", field: "tags.Environment", risk_score: 20, problem: { en: "A governance tag drift can break ownership reporting and policy automation.", es: "El drift de una etiqueta de gobierno puede afectar reportes de propiedad y automatizacion de politicas." }, declared: "hackathon-demo", actual: "production" }], recommendations: [{ priority: "planned", title: { en: "Restore the declared tag", es: "Restaurar la etiqueta declarada" }, action: { en: "Reconcile the Environment tag through reviewed Terraform changes.", es: "Reconciliar la etiqueta Environment mediante cambios Terraform revisados." } }] }, bob: { phases: [] },
  },
  {
    id: "guided-medium", source: "guided_preview", scenario: { scenario_id: "medium", title: { en: "Instance resized", es: "Instancia redimensionada" }, description: { en: "Compute capacity differs from Terraform and may increase cost.", es: "La capacidad de computo difiere de Terraform y puede aumentar el costo." } },
    report: { risk_score: 55, risk_level: "medium", detalle: [{ resource: "aws_instance.app_server", field: "instance_type", risk_score: 55, problem: { en: "The compute size differs from Terraform and can introduce unexpected cost or performance changes.", es: "El tamano de computo difiere de Terraform y puede introducir cambios inesperados de costo o rendimiento." }, declared: "t3.micro", actual: "t3.xlarge" }], recommendations: [{ priority: "review", title: { en: "Validate capacity need", es: "Validar la necesidad de capacidad" }, action: { en: "Review utilization and either restore the size or declare the approved change in code.", es: "Revisar utilizacion y restaurar el tamano o declarar el cambio aprobado en codigo." } }] }, bob: { phases: [] },
  },
  {
    id: "guided-high", source: "guided_preview", scenario: { scenario_id: "high-ssh", title: { en: "Public SSH exposure", es: "SSH expuesto a internet" }, description: { en: "Port 22 was opened to the internet outside Terraform.", es: "El puerto 22 fue abierto a internet fuera de Terraform." } },
    report: { risk_score: 95, risk_level: "high", detalle: [{ resource: "aws_security_group.app_sg", field: "ingress_rules", risk_score: 95, problem: { en: "SSH is open to the entire internet, increasing the chance of unauthorized access and automated attacks.", es: "SSH esta abierto a todo internet, aumentando el riesgo de accesos no autorizados y ataques automatizados." }, declared: [], actual: [{ from_port: 22, to_port: 22, protocol: "tcp", cidr_blocks: ["0.0.0.0/0"] }] }], recommendations: [{ priority: "immediate", title: { en: "Remove the public SSH rule", es: "Eliminar la regla SSH publica" }, action: { en: "Restore the Terraform declared rule set and review access evidence during the exposure window.", es: "Restaurar las reglas declaradas por Terraform y revisar evidencia de acceso durante el periodo de exposicion." } }, { priority: "next", title: { en: "Use controlled administration access", es: "Usar acceso administrativo controlado" }, action: { en: "Prefer Session Manager, VPN, or a restricted bastion over public SSH.", es: "Preferir Session Manager, VPN o un bastion restringido sobre SSH publico." } }] }, bob: { phases: [] },
  },
];

const elements = {
  list: document.getElementById("replayList"), source: document.getElementById("sourceLabel"), title: document.getElementById("runTitle"), description: document.getElementById("runDescription"), score: document.getElementById("riskScore"), level: document.getElementById("riskLevel"),
  findingList: document.getElementById("findingList"), recommendationList: document.getElementById("recommendationList"), disclosure: document.getElementById("bobDisclosure"), phaseList: document.getElementById("phaseList"), eventList: document.getElementById("eventList"),
};
let language = localStorage.getItem("3ntropy-language") || (navigator.language?.startsWith("es") ? "es" : "en");
let replays = [...guidedReplays];
let selectedId = replays[2].id;

function t() { return textByLanguage[language] || textByLanguage.en; }
function local(value) { return typeof value === "string" ? value : value?.[language] || value?.en || value?.es || "—"; }
function el(tag, className, content) { const node = document.createElement(tag); if (className) node.className = className; if (content !== undefined) node.textContent = content; return node; }
function color(level) { return ({ low: "#37f2a4", medium: "#f7c85d", high: "#ff6174" })[level] || "#00f0ff"; }
function priority(value) { return ({ immediate: language === "es" ? "Inmediata" : "Immediate", next: language === "es" ? "Siguiente" : "Next", review: language === "es" ? "Revision" : "Review", planned: language === "es" ? "Planificada" : "Planned" })[value] || value; }

function renderList() {
  elements.list.replaceChildren();
  replays.forEach((replay) => {
    const card = el("button", "run-card"); card.type = "button"; card.dataset.risk = replay.report.risk_level; card.classList.toggle("active", replay.id === selectedId);
    card.append(el("strong", "", local(replay.scenario.title)), el("small", "", `${replay.report.risk_level} / ${replay.report.risk_score}/100`));
    card.addEventListener("click", () => { selectedId = replay.id; render(); }); elements.list.append(card);
  });
}

function renderDetail(replay) {
  const report = replay.report; const recorded = replay.source === "recorded_local_bob_run";
  elements.source.textContent = recorded ? t().recorded : t().guided;
  elements.title.textContent = local(replay.scenario.title); elements.description.textContent = local(replay.scenario.description);
  elements.score.textContent = String(report.risk_score); elements.level.textContent = report.risk_level; elements.score.parentElement.style.setProperty("--risk", color(report.risk_level));
  elements.findingList.replaceChildren();
  (report.detalle || []).forEach((finding) => { const card = el("article", "finding"); card.style.setProperty("--risk", color(report.risk_level)); card.append(el("strong", "", local(finding.problem)), el("p", "", `${finding.resource} · ${finding.field}`), el("div", "difference", `${t().declared}: ${JSON.stringify(finding.declared)}\n${t().observed}: ${JSON.stringify(finding.actual)}`)); elements.findingList.append(card); });
  elements.recommendationList.replaceChildren();
  (report.recommendations || []).forEach((item) => { const card = el("article", "recommendation"); card.append(el("b", "", local(item.title)), el("p", "", local(item.action)), el("small", "", `${t().priority}: ${priority(item.priority)}`)); elements.recommendationList.append(card); });
  elements.disclosure.textContent = recorded ? "This is a reviewed local IBM Bob recording. It is replayed statically and cannot change infrastructure." : t().noBob;
  elements.phaseList.replaceChildren(); const phases = replay.bob?.phases || [];
  if (phases.length === 0) { elements.phaseList.append(el("p", "empty", t().none)); } else phases.forEach((phase) => { const card = el("div", "phase"); card.append(el("strong", "", phase.phase), el("small", "", phase.status)); elements.phaseList.append(card); });
  elements.eventList.replaceChildren(); const events = phases.flatMap((phase) => (phase.events || []).map((event) => ({ phase: phase.phase, event })));
  if (events.length === 0) { elements.eventList.append(el("p", "empty", t().noBob)); } else events.slice(-80).forEach(({ phase, event }) => { const row = el("div", "event"); row.append(el("span", "", phase), el("div", "", event.text || event.type || "event")); elements.eventList.append(row); });
}

function render() { renderList(); renderDetail(replays.find((item) => item.id === selectedId) || replays[0]); }
function setLanguage(next) { language = textByLanguage[next] ? next : "en"; document.documentElement.lang = language; localStorage.setItem("3ntropy-language", language); document.querySelectorAll("[data-i18n]").forEach((node) => { const value = t()[node.dataset.i18n]; if (value) node.textContent = value; }); document.querySelectorAll("[data-language]").forEach((button) => button.classList.toggle("active", button.dataset.language === language)); render(); }

async function loadRecordedReplays() {
  try {
    const manifest = await fetch("./replays/index.json", { cache: "no-store" }).then((response) => response.ok ? response.json() : { replays: [] });
    const records = await Promise.all((manifest.replays || []).map(async (entry) => fetch(`./replays/${entry.file}`, { cache: "no-store" }).then((response) => response.ok ? response.json() : null)));
    replays = [...records.filter(Boolean), ...guidedReplays]; selectedId = replays[0]?.id || ""; render();
  } catch { render(); }
}

document.querySelectorAll("[data-language]").forEach((button) => button.addEventListener("click", () => setLanguage(button.dataset.language)));
setLanguage(language); loadRecordedReplays();
