const translations = {
  en: {
    home: "Home",
    impact: "Impact Dashboard",
    localMode: "LOCAL DEMO",
    title: "Infrastructure Drift Response Console",
    intro: "Select a reproducible scenario, run the MCP comparison, review the risk and recommendations, then make the final human decision.",
    safeTitle: "Safe simulation",
    safeText: "No cloud resources are changed",
    chooseScenario: "Choose a drift scenario",
    scenarioHint: "Each run starts from a clean Terraform baseline.",
    loadingScenarios: "Loading scenarios…",
    runScenario: "Run selected scenario",
    running: "Running analysis…",
    resetBaseline: "Reset baseline",
    analysisTitle: "Automated analysis",
    riskAssessment: "Risk assessment",
    executionTimeline: "Execution timeline",
    systemEvents: "System events",
    findingsTitle: "Detected problem",
    recommendationsTitle: "Recommended actions",
    reviewTitle: "Human review required",
    reviewText: "Review the problem and recommendations before approving the local simulated remediation.",
    reject: "Reject",
    approve: "Approve simulated remediation",
    deciding: "Saving decision…",
    verification: "Verification",
    verificationSuccess: "Drift resolved and verified",
    verificationSuccessText: "The observed state now matches the Terraform declared state.",
    verificationRejected: "Remediation rejected",
    verificationRejectedText: "The finding remains open for further review.",
    verificationFailed: "Verification still detects drift",
    verificationFailedText: "The simulated remediation did not restore the expected state and needs further review.",
    downloadReport: "Download JSON report",
    errorTitle: "The run could not be completed",
    footerSafety: "Terraform planning · MCP detection · Human approval",
    severityNone: "Healthy",
    severityLow: "Low",
    severityMedium: "Medium",
    severityHigh: "High",
    statusHealthy: "Healthy",
    statusAwaiting: "Awaiting review",
    statusRemediated: "Remediated",
    statusRejected: "Rejected",
    statusFailed: "Verification failed",
    noFindingsTitle: "No drift detected",
    noFindingsText: "The observed infrastructure matches the state generated from Terraform.",
    declared: "Declared",
    observed: "Observed",
    field: "Field",
    score: "Score",
    priority: "Priority",
    priorityImmediate: "Immediate",
    priorityNext: "Next",
    priorityReview: "Review",
    priorityPlanned: "Planned",
    priorityMonitor: "Monitor",
    riskSummary: "Highest detected infrastructure risk",
    resetSuccess: "Baseline restored. Select a scenario to run another analysis.",
    apiUnavailable: "Start the local console with: npm.cmd --prefix .\\mcp-server run web",
  },
  es: {
    home: "Inicio",
    impact: "Dashboard de impacto",
    localMode: "DEMO LOCAL",
    title: "Consola de respuesta a drift de infraestructura",
    intro: "Selecciona un escenario reproducible, ejecuta la comparacion MCP, revisa el riesgo y las recomendaciones, y toma la decision humana final.",
    safeTitle: "Simulacion segura",
    safeText: "No se modifican recursos cloud",
    chooseScenario: "Elige un escenario de drift",
    scenarioHint: "Cada corrida comienza desde una linea base limpia de Terraform.",
    loadingScenarios: "Cargando escenarios…",
    runScenario: "Ejecutar escenario seleccionado",
    running: "Ejecutando analisis…",
    resetBaseline: "Restablecer linea base",
    analysisTitle: "Analisis automatico",
    riskAssessment: "Evaluacion de riesgo",
    executionTimeline: "Linea de ejecucion",
    systemEvents: "Eventos del sistema",
    findingsTitle: "Problema detectado",
    recommendationsTitle: "Acciones recomendadas",
    reviewTitle: "Se requiere revision humana",
    reviewText: "Revisa el problema y las recomendaciones antes de aprobar la remediacion local simulada.",
    reject: "Rechazar",
    approve: "Aprobar remediacion simulada",
    deciding: "Guardando decision…",
    verification: "Verificacion",
    verificationSuccess: "Drift resuelto y verificado",
    verificationSuccessText: "El estado observado ahora coincide con el estado declarado por Terraform.",
    verificationRejected: "Remediacion rechazada",
    verificationRejectedText: "El hallazgo permanece abierto para una revision posterior.",
    verificationFailed: "La verificacion aun detecta drift",
    verificationFailedText: "La remediacion simulada no restauro el estado esperado y necesita una nueva revision.",
    downloadReport: "Descargar reporte JSON",
    errorTitle: "No se pudo completar la ejecucion",
    footerSafety: "Planificacion Terraform · Deteccion MCP · Aprobacion humana",
    severityNone: "Saludable",
    severityLow: "Bajo",
    severityMedium: "Medio",
    severityHigh: "Alto",
    statusHealthy: "Saludable",
    statusAwaiting: "Esperando revision",
    statusRemediated: "Remediado",
    statusRejected: "Rechazado",
    statusFailed: "Fallo la verificacion",
    noFindingsTitle: "No se detecto drift",
    noFindingsText: "La infraestructura observada coincide con el estado generado desde Terraform.",
    declared: "Declarado",
    observed: "Observado",
    field: "Campo",
    score: "Puntaje",
    priority: "Prioridad",
    priorityImmediate: "Inmediata",
    priorityNext: "Siguiente",
    priorityReview: "Revision",
    priorityPlanned: "Planificada",
    priorityMonitor: "Monitoreo",
    riskSummary: "Mayor riesgo de infraestructura detectado",
    resetSuccess: "Linea base restaurada. Selecciona un escenario para ejecutar otro analisis.",
    apiUnavailable: "Inicia la consola local con: npm.cmd --prefix .\\mcp-server run web",
  },
};

const elements = {
  scenarioGrid: document.getElementById("scenarioGrid"),
  runButton: document.getElementById("runButton"),
  resetButton: document.getElementById("resetButton"),
  resetNotice: document.getElementById("resetNotice"),
  runWorkspace: document.getElementById("runWorkspace"),
  runStatus: document.getElementById("runStatus"),
  riskGauge: document.getElementById("riskGauge"),
  riskScore: document.getElementById("riskScore"),
  riskLevel: document.getElementById("riskLevel"),
  riskSummary: document.getElementById("riskSummary"),
  timeline: document.getElementById("timeline"),
  eventLog: document.getElementById("eventLog"),
  findingCount: document.getElementById("findingCount"),
  findings: document.getElementById("findings"),
  recommendations: document.getElementById("recommendations"),
  reviewPanel: document.getElementById("reviewPanel"),
  approveButton: document.getElementById("approveButton"),
  rejectButton: document.getElementById("rejectButton"),
  verificationPanel: document.getElementById("verificationPanel"),
  verificationTitle: document.getElementById("verificationTitle"),
  verificationText: document.getElementById("verificationText"),
  downloadButton: document.getElementById("downloadButton"),
  errorPanel: document.getElementById("errorPanel"),
  errorMessage: document.getElementById("errorMessage"),
};

let currentLanguage = localStorage.getItem("3ntropy-language") ||
  (navigator.language?.toLowerCase().startsWith("es") ? "es" : "en");
let scenarios = [];
let selectedScenarioId = null;
let currentRun = null;
let isBusy = false;

function text() {
  return translations[currentLanguage] || translations.en;
}

function localized(value) {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  return value[currentLanguage] || value.en || value.es || "—";
}

function setLanguage(language) {
  currentLanguage = translations[language] ? language : "en";
  document.documentElement.lang = currentLanguage;
  document.querySelectorAll("[data-console-i18n]").forEach((element) => {
    const value = text()[element.dataset.consoleI18n];
    if (value) element.textContent = value;
  });
  document.querySelectorAll("[data-console-language]").forEach((button) => {
    const active = button.dataset.consoleLanguage === currentLanguage;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  localStorage.setItem("3ntropy-language", currentLanguage);
  renderScenarios();
  if (currentRun) renderRun(currentRun);
}

function severityLabel(level) {
  const labels = {
    none: text().severityNone,
    low: text().severityLow,
    medium: text().severityMedium,
    high: text().severityHigh,
  };
  return labels[level] || String(level || "none").toUpperCase();
}

function statusLabel(status) {
  const labels = {
    healthy: text().statusHealthy,
    awaiting_review: text().statusAwaiting,
    remediated: text().statusRemediated,
    rejected: text().statusRejected,
    verification_failed: text().statusFailed,
  };
  return labels[status] || status;
}

function riskColor(level) {
  return {
    none: "#00f0ff",
    low: "#37f2a4",
    medium: "#f7c85d",
    high: "#ff6174",
  }[level] || "#00f0ff";
}

function priorityLabel(priority) {
  const labels = {
    immediate: text().priorityImmediate,
    next: text().priorityNext,
    review: text().priorityReview,
    planned: text().priorityPlanned,
    monitor: text().priorityMonitor,
  };
  return labels[priority] || priority;
}

function createElement(tagName, className, value) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  if (value !== undefined) element.textContent = value;
  return element;
}

function renderScenarios() {
  if (scenarios.length === 0) return;
  elements.scenarioGrid.replaceChildren();
  scenarios.forEach((scenario) => {
    const card = createElement("button", "scenario-card");
    card.type = "button";
    card.dataset.scenarioId = scenario.id;
    card.dataset.severity = scenario.severity;
    card.classList.toggle("selected", scenario.id === selectedScenarioId);
    card.setAttribute("aria-pressed", String(scenario.id === selectedScenarioId));

    const top = createElement("div", "scenario-card-top");
    top.append(
      createElement("span", "severity-pill", severityLabel(scenario.severity)),
      createElement("span", "scenario-score", `${scenario.risk_score}/100`)
    );
    card.append(
      top,
      createElement("h3", "", localized(scenario.title)),
      createElement("p", "", localized(scenario.description))
    );
    card.addEventListener("click", () => {
      selectedScenarioId = scenario.id;
      elements.runButton.disabled = isBusy;
      renderScenarios();
    });
    elements.scenarioGrid.append(card);
  });
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.detail || result.error || `HTTP ${response.status}`);
  return result;
}

function showError(error) {
  elements.errorMessage.textContent = error.message || String(error);
  elements.errorPanel.classList.remove("hidden");
}

function clearError() {
  elements.errorPanel.classList.add("hidden");
  elements.errorMessage.textContent = "";
}

function setBusy(value, labelKey = "runScenario") {
  isBusy = value;
  elements.runButton.disabled = value || !selectedScenarioId;
  elements.resetButton.disabled = value;
  elements.approveButton.disabled = value;
  elements.rejectButton.disabled = value;
  const runLabel = elements.runButton.querySelector("span");
  runLabel.textContent = text()[value ? "running" : labelKey];
}

function renderTimeline(timeline) {
  elements.timeline.replaceChildren();
  timeline.forEach((step) => {
    const item = createElement("li", `timeline-item ${step.status}`);
    item.append(
      createElement("strong", "", localized(step.title)),
      createElement("span", "", localized(step.detail))
    );
    elements.timeline.append(item);
  });
}

function renderEvents(run) {
  elements.eventLog.replaceChildren();
  const start = new Date(run.created_at);
  run.timeline.forEach((step, index) => {
    const entry = createElement("div", "event-entry");
    const timeValue = new Date(start.getTime() + index * 350).toLocaleTimeString(
      currentLanguage === "es" ? "es-BO" : "en-US",
      { hour12: false }
    );
    entry.append(
      createElement("time", "", timeValue),
      createElement("strong", "", localized(step.title))
    );
    elements.eventLog.append(entry);
  });
  elements.eventLog.scrollTop = elements.eventLog.scrollHeight;
}

function formatValue(value) {
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function renderFindings(report) {
  const differences = report.detalle || [];
  elements.findingCount.textContent = String(differences.length);
  elements.findings.replaceChildren();

  if (differences.length === 0) {
    const card = createElement("article", "finding-card");
    card.dataset.level = "low";
    card.append(
      createElement("h3", "", text().noFindingsTitle),
      createElement("p", "", text().noFindingsText)
    );
    elements.findings.append(card);
    return;
  }

  differences.forEach((difference) => {
    const card = createElement("article", "finding-card");
    card.dataset.level = difference.severity_level;
    const top = createElement("div", "finding-top");
    const heading = createElement("div");
    heading.append(
      createElement("span", "finding-resource", difference.resource),
      createElement("h3", "", localized(difference.problem)),
      createElement("p", "", `${text().field}: ${difference.field}`)
    );
    top.append(
      heading,
      createElement("span", "risk-score-chip", `${text().score} ${difference.risk_score}`)
    );

    const values = createElement("div", "diff-values");
    const declared = createElement("div", "diff-value");
    declared.append(
      createElement("span", "", text().declared),
      createElement("code", "", formatValue(difference.declared))
    );
    const observed = createElement("div", "diff-value");
    observed.append(
      createElement("span", "", text().observed),
      createElement("code", "", formatValue(difference.actual))
    );
    values.append(declared, observed);
    card.append(top, values);
    elements.findings.append(card);
  });
}

function renderRecommendations(recommendations = []) {
  elements.recommendations.replaceChildren();
  recommendations.forEach((recommendation, index) => {
    const card = createElement("article", "recommendation-card");
    card.append(
      createElement("span", "recommendation-number", String(index + 1).padStart(2, "0")),
      createElement("h3", "", localized(recommendation.title)),
      createElement("p", "", localized(recommendation.action)),
      createElement("span", "priority-label", `${text().priority}: ${priorityLabel(recommendation.priority)}`)
    );
    elements.recommendations.append(card);
  });
}

function renderVerification(run) {
  const visible = ["remediated", "rejected", "verification_failed"].includes(run.status);
  elements.verificationPanel.classList.toggle("hidden", !visible);
  if (!visible) return;
  const remediated = run.status === "remediated";
  const failed = run.status === "verification_failed";
  elements.verificationTitle.textContent = remediated
    ? text().verificationSuccess
    : failed
      ? text().verificationFailed
      : text().verificationRejected;
  elements.verificationText.textContent = remediated
    ? text().verificationSuccessText
    : failed
      ? text().verificationFailedText
      : text().verificationRejectedText;
  elements.verificationPanel.classList.toggle("verification-rejected", run.status === "rejected");
  elements.verificationPanel.classList.toggle("verification-failed", failed);
}

function renderRun(run) {
  currentRun = run;
  const report = run.report;
  const level = report.risk_level || "none";
  const score = Number(report.risk_score || 0);
  const color = riskColor(level);

  elements.runWorkspace.classList.remove("hidden");
  elements.runStatus.textContent = statusLabel(run.status);
  elements.runStatus.style.color = color;
  elements.riskScore.textContent = String(score);
  elements.riskLevel.textContent = severityLabel(level).toUpperCase();
  elements.riskSummary.textContent = text().riskSummary;
  elements.riskGauge.style.setProperty("--risk-angle", `${score * 3.6}deg`);
  elements.riskGauge.style.setProperty("--risk-color", color);
  elements.riskLevel.style.setProperty("--risk-color", color);

  renderTimeline(run.timeline || []);
  renderEvents(run);
  renderFindings(report);
  renderRecommendations(report.recommendations || []);
  elements.reviewPanel.classList.toggle("hidden", run.status !== "awaiting_review");
  renderVerification(run);
}

async function loadScenarios() {
  try {
    const result = await api("/api/scenarios");
    scenarios = result.scenarios || [];
    selectedScenarioId = scenarios.find((scenario) => scenario.id === "high-ssh")?.id || scenarios[0]?.id;
    elements.runButton.disabled = !selectedScenarioId;
    renderScenarios();
  } catch (error) {
    elements.scenarioGrid.replaceChildren(createElement("div", "scenario-loading", text().apiUnavailable));
    showError(error);
  }
}

async function runScenario() {
  if (!selectedScenarioId || isBusy) return;
  clearError();
  elements.resetNotice.classList.add("hidden");
  setBusy(true);
  elements.runWorkspace.classList.remove("hidden");
  elements.runStatus.textContent = text().running;
  elements.reviewPanel.classList.add("hidden");
  elements.verificationPanel.classList.add("hidden");
  try {
    const run = await api("/api/runs", {
      method: "POST",
      body: JSON.stringify({ scenario_id: selectedScenarioId }),
    });
    renderRun(run);
    elements.runWorkspace.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
  }
}

async function saveDecision(decision) {
  if (!currentRun || isBusy) return;
  clearError();
  setBusy(true);
  elements.approveButton.textContent = text().deciding;
  try {
    const run = await api(`/api/runs/${currentRun.id}/decision`, {
      method: "POST",
      body: JSON.stringify({ decision }),
    });
    renderRun(run);
  } catch (error) {
    showError(error);
  } finally {
    elements.approveButton.textContent = text().approve;
    setBusy(false);
  }
}

async function resetBaseline() {
  if (isBusy) return;
  clearError();
  setBusy(true);
  try {
    await api("/api/reset", { method: "POST", body: "{}" });
    currentRun = null;
    elements.runWorkspace.classList.add("hidden");
    elements.resetNotice.textContent = text().resetSuccess;
    elements.resetNotice.classList.remove("hidden");
  } catch (error) {
    showError(error);
  } finally {
    setBusy(false);
  }
}

function downloadReport() {
  if (!currentRun) return;
  const blob = new Blob([JSON.stringify(currentRun, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `drift-detector-${currentRun.scenario.scenario_id}-${currentRun.id.slice(0, 8)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

document.querySelectorAll("[data-console-language]").forEach((button) => {
  button.addEventListener("click", () => setLanguage(button.dataset.consoleLanguage));
});
elements.runButton.addEventListener("click", runScenario);
elements.resetButton.addEventListener("click", resetBaseline);
elements.approveButton.addEventListener("click", () => saveDecision("approve"));
elements.rejectButton.addEventListener("click", () => saveDecision("reject"));
elements.downloadButton.addEventListener("click", downloadReport);

setLanguage(currentLanguage);
loadScenarios();
