const SCORE_BANDS = [
  { minimum: 70, level: "high", severity: "alta" },
  { minimum: 40, level: "medium", severity: "media" },
  { minimum: 1, level: "low", severity: "baja" },
  { minimum: 0, level: "none", severity: "ninguna" },
];

function bandForScore(score) {
  return SCORE_BANDS.find((band) => score >= band.minimum);
}

function containsPublicSsh(value) {
  if (!Array.isArray(value)) return false;
  return value.some(
    (rule) =>
      Number(rule?.from_port) <= 22 &&
      Number(rule?.to_port) >= 22 &&
      ["tcp", "-1"].includes(String(rule?.protocol)) &&
      (rule?.cidr_blocks || []).includes("0.0.0.0/0")
  );
}

export function assessDifferenceRisk(resourceKey, fieldPath, declared, actual) {
  const field = `${resourceKey}.${fieldPath}`.toLowerCase();

  if (field.includes("ingress") && containsPublicSsh(actual)) {
    return {
      score: 95,
      code: "public_ssh",
      reason:
        "SSH esta expuesto a internet, lo que aumenta el riesgo de acceso no autorizado.",
    };
  }

  if (field.includes("public_access") && actual === false) {
    return {
      score: 92,
      code: "public_storage",
      reason:
        "La proteccion de acceso publico esta desactivada y puede exponer datos.",
    };
  }

  if (field.includes("instance_type") || field.includes("size")) {
    return {
      score: 55,
      code: "capacity_cost_change",
      reason:
        "Cambio de capacidad que puede incrementar costos o alterar el rendimiento.",
    };
  }

  if (field.includes("tags")) {
    return {
      score: 20,
      code: "metadata_change",
      reason:
        "Cambio de metadatos con impacto operativo bajo, pero relevante para gobierno y trazabilidad.",
    };
  }

  if (
    field.includes("ingress") ||
    field.includes("security_group") ||
    field.includes("public_access")
  ) {
    return {
      score: 82,
      code: "security_boundary_change",
      reason: "Cambio no declarado en un control de seguridad de red o acceso.",
    };
  }

  return {
    score: 15,
    code: "configuration_change",
    reason: "Cambio de configuracion no declarado con impacto inicialmente bajo.",
  };
}

function buildExplanation(resourceKey, fieldPath, declared, actual) {
  return `En "${resourceKey}", el campo "${fieldPath}" deberia ser ${JSON.stringify(
    declared
  )} segun el codigo, pero el estado real tiene ${JSON.stringify(actual)}.`;
}

function createDifference({ resource, field, declared, actual, risk }) {
  const band = bandForScore(risk.score);
  return {
    resource,
    field,
    declared,
    actual,
    severity: band.severity,
    severity_level: band.level,
    risk_score: risk.score,
    risk_code: risk.code,
    risk_reason: risk.reason,
    explanation: buildExplanation(resource, field, declared, actual),
  };
}

function diffFields(resourceKey, declaredObject, actualObject, differences, prefix = "") {
  const keys = new Set([
    ...Object.keys(declaredObject || {}),
    ...Object.keys(actualObject || {}),
  ]);

  for (const field of keys) {
    const declaredValue = declaredObject?.[field];
    const actualValue = actualObject?.[field];
    const fieldPath = prefix ? `${prefix}.${field}` : field;

    if (JSON.stringify(declaredValue) === JSON.stringify(actualValue)) continue;

    differences.push(
      createDifference({
        resource: resourceKey,
        field: fieldPath,
        declared: declaredValue,
        actual: actualValue,
        risk: assessDifferenceRisk(
          resourceKey,
          fieldPath,
          declaredValue,
          actualValue
        ),
      })
    );
  }
}

export function diffResources(declaredState, actualState) {
  const differences = [];
  const declaredResources = declaredState.resources || {};
  const actualResources = actualState.resources || {};
  const allKeys = new Set([
    ...Object.keys(declaredResources),
    ...Object.keys(actualResources),
  ]);

  for (const resourceKey of allKeys) {
    const declared = declaredResources[resourceKey];
    const actual = actualResources[resourceKey];

    if (!declared) {
      differences.push(
        createDifference({
          resource: resourceKey,
          field: "(recurso completo)",
          declared: null,
          actual,
          risk: {
            score: 50,
            code: "unmanaged_resource",
            reason:
              "Existe un recurso no administrado por el codigo y requiere revision.",
          },
        })
      );
      continue;
    }

    if (!actual) {
      differences.push(
        createDifference({
          resource: resourceKey,
          field: "(recurso completo)",
          declared,
          actual: null,
          risk: {
            score: 88,
            code: "missing_resource",
            reason:
              "Un recurso declarado fue eliminado o no esta disponible en el estado observado.",
          },
        })
      );
      continue;
    }

    diffFields(resourceKey, declared, actual, differences);
  }

  return differences;
}

export function summarizeRisk(differences) {
  const highestScore = differences.reduce(
    (maximum, difference) => Math.max(maximum, difference.risk_score || 0),
    0
  );
  const band = bandForScore(highestScore);
  const counts = { high: 0, medium: 0, low: 0 };

  for (const difference of differences) {
    if (Object.hasOwn(counts, difference.severity_level)) {
      counts[difference.severity_level] += 1;
    }
  }

  return {
    risk_score: highestScore,
    risk_level: band.level,
    severity: band.severity,
    counts,
  };
}
