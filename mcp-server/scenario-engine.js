import { writeFileSync } from "fs";

const SCENARIOS = {
  healthy: {
    id: "healthy",
    severity: "none",
    risk_score: 0,
    title: { en: "Healthy baseline", es: "Infraestructura saludable" },
    description: {
      en: "Declared and observed infrastructure match exactly.",
      es: "La infraestructura declarada y observada coinciden exactamente.",
    },
    resource: null,
    field: null,
  },
  low: {
    id: "low",
    severity: "low",
    risk_score: 20,
    title: { en: "Environment tag changed", es: "Etiqueta de entorno modificada" },
    description: {
      en: "The bucket Environment tag changed from hackathon-demo to production.",
      es: "La etiqueta Environment del bucket cambio de hackathon-demo a production.",
    },
    resource: "aws_s3_bucket.data",
    field: "tags",
  },
  medium: {
    id: "medium",
    severity: "medium",
    risk_score: 55,
    title: { en: "Instance resized", es: "Instancia redimensionada" },
    description: {
      en: "The instance changed from t3.micro to t3.xlarge, increasing cost and capacity.",
      es: "La instancia cambio de t3.micro a t3.xlarge, aumentando costo y capacidad.",
    },
    resource: "aws_instance.app_server",
    field: "instance_type",
  },
  "high-ssh": {
    id: "high-ssh",
    severity: "high",
    risk_score: 95,
    title: { en: "Public SSH exposure", es: "SSH expuesto a internet" },
    description: {
      en: "Port 22 was opened to 0.0.0.0/0 outside Terraform.",
      es: "El puerto 22 fue abierto a 0.0.0.0/0 fuera de Terraform.",
    },
    resource: "aws_security_group.app_sg",
    field: "ingress_rules",
  },
  "high-bucket": {
    id: "high-bucket",
    severity: "high",
    risk_score: 92,
    title: { en: "Public bucket exposure", es: "Bucket expuesto publicamente" },
    description: {
      en: "The S3 public-access protection was disabled outside Terraform.",
      es: "La proteccion de acceso publico de S3 fue desactivada fuera de Terraform.",
    },
    resource: "aws_s3_bucket.data",
    field: "public_access_blocked",
  },
};

const ALIASES = {
  reset: "healthy",
  "tag-drift": "low",
  resize: "medium",
  "open-ssh": "high-ssh",
  "expose-bucket": "high-bucket",
};

export function listScenarios() {
  return Object.values(SCENARIOS).map((scenario) => structuredClone(scenario));
}

export function normalizeScenarioId(requestedId) {
  return ALIASES[requestedId] || requestedId;
}

export function getScenario(requestedId) {
  const id = normalizeScenarioId(requestedId);
  const scenario = SCENARIOS[id];
  if (!scenario) {
    const valid = Object.keys(SCENARIOS).join(" | ");
    throw new Error(`Escenario desconocido: ${requestedId}. Usa: ${valid}`);
  }
  return structuredClone(scenario);
}

function mutateResources(scenarioId, resources) {
  switch (scenarioId) {
    case "healthy":
      break;
    case "low":
      resources["aws_s3_bucket.data"].tags.Environment = "production";
      break;
    case "medium":
      resources["aws_instance.app_server"].instance_type = "t3.xlarge";
      break;
    case "high-ssh":
      resources["aws_security_group.app_sg"].ingress_rules.push({
        description: "SSH (manual change outside Terraform)",
        from_port: 22,
        to_port: 22,
        protocol: "tcp",
        cidr_blocks: ["0.0.0.0/0"],
      });
      break;
    case "high-bucket":
      resources["aws_s3_bucket.data"].public_access_blocked = false;
      break;
    default:
      throw new Error(`No existe una mutacion para el escenario ${scenarioId}.`);
  }
}

export function createScenarioState(requestedId, declaredState) {
  const scenario = getScenario(requestedId);
  const resources = structuredClone(declaredState.resources || {});
  mutateResources(scenario.id, resources);

  return {
    actualState: {
      generated_note:
        scenario.id === "healthy"
          ? "Estado actual simulado. Restablecido desde el estado declarado generado por Terraform."
          : `Estado actual simulado para el escenario reproducible: ${scenario.id}.`,
      scenario_id: scenario.id,
      resources,
    },
    summary: {
      status: "ready",
      scenario_id: scenario.id,
      expected_severity: scenario.severity,
      expected_risk_score: scenario.risk_score,
      title: scenario.title,
      description: scenario.description,
      changed_resource: scenario.resource,
      changed_field: scenario.field,
      declared_state_source: declaredState.source || "snapshot_json",
      cloud_changes_applied: false,
    },
  };
}

export function applyScenario(requestedId, declaredState, actualStatePath) {
  const result = createScenarioState(requestedId, declaredState);
  writeFileSync(actualStatePath, `${JSON.stringify(result.actualState, null, 2)}\n`);
  return result.summary;
}
