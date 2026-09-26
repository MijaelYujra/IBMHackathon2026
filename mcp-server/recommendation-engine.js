const GUIDANCE = {
  public_ssh: {
    problem: {
      en: "SSH is open to the entire internet, increasing the chance of unauthorized access and automated attacks.",
      es: "SSH esta abierto a todo internet, aumentando el riesgo de accesos no autorizados y ataques automatizados.",
    },
    recommendations: [
      {
        id: "remove-public-ssh",
        priority: "immediate",
        title: { en: "Remove the public SSH rule", es: "Eliminar la regla SSH publica" },
        action: {
          en: "Restore the security group to the Terraform declared rules and verify that port 22 is no longer reachable from 0.0.0.0/0.",
          es: "Restaurar el security group a las reglas declaradas en Terraform y verificar que el puerto 22 ya no sea accesible desde 0.0.0.0/0.",
        },
      },
      {
        id: "use-private-access",
        priority: "next",
        title: { en: "Use controlled administration access", es: "Usar acceso administrativo controlado" },
        action: {
          en: "Prefer AWS Systems Manager Session Manager, a VPN, or a restricted bastion instead of public SSH.",
          es: "Preferir AWS Systems Manager Session Manager, una VPN o un bastion restringido en lugar de SSH publico.",
        },
      },
      {
        id: "review-access-evidence",
        priority: "next",
        title: { en: "Review access evidence", es: "Revisar evidencia de acceso" },
        action: {
          en: "Inspect security logs, recent sessions, and authorized keys for activity during the exposure window.",
          es: "Revisar logs de seguridad, sesiones recientes y llaves autorizadas durante el periodo de exposicion.",
        },
      },
    ],
  },
  public_storage: {
    problem: {
      en: "The storage public access guard is disabled, which can expose objects or allow an unsafe bucket policy.",
      es: "La proteccion de acceso publico del almacenamiento esta desactivada, lo que puede exponer objetos o permitir una politica insegura.",
    },
    recommendations: [
      {
        id: "restore-public-block",
        priority: "immediate",
        title: { en: "Restore the public access block", es: "Restaurar el bloqueo de acceso publico" },
        action: {
          en: "Return all S3 public access block settings to the values declared by Terraform.",
          es: "Devolver todas las opciones de bloqueo publico de S3 a los valores declarados por Terraform.",
        },
      },
      {
        id: "audit-bucket-access",
        priority: "next",
        title: { en: "Audit bucket access", es: "Auditar el acceso al bucket" },
        action: {
          en: "Review the bucket policy, object ACLs, access logs, and recent object reads before closing the incident.",
          es: "Revisar la politica del bucket, ACL de objetos, logs de acceso y lecturas recientes antes de cerrar el incidente.",
        },
      },
    ],
  },
  capacity_cost_change: {
    problem: {
      en: "The compute size differs from Terraform and can create unexpected cost or performance changes.",
      es: "El tamano de computo difiere de Terraform y puede producir cambios inesperados de costo o rendimiento.",
    },
    recommendations: [
      {
        id: "validate-capacity",
        priority: "review",
        title: { en: "Validate the capacity need", es: "Validar la necesidad de capacidad" },
        action: {
          en: "Check CPU, memory, and workload demand to confirm whether the resize was intentional.",
          es: "Revisar CPU, memoria y demanda de trabajo para confirmar si el cambio de tamano fue intencional.",
        },
      },
      {
        id: "restore-instance-size",
        priority: "review",
        title: { en: "Restore or declare the approved size", es: "Restaurar o declarar el tamano aprobado" },
        action: {
          en: "If the change was unauthorized, return to t3.micro. If it was approved, update the infrastructure code through review.",
          es: "Si el cambio no fue autorizado, volver a t3.micro. Si fue aprobado, actualizar el codigo de infraestructura mediante revision.",
        },
      },
    ],
  },
  metadata_change: {
    problem: {
      en: "A governance tag no longer matches Terraform, affecting ownership, reporting, or policy automation.",
      es: "Una etiqueta de gobierno ya no coincide con Terraform, afectando propiedad, reportes o automatizacion de politicas.",
    },
    recommendations: [
      {
        id: "restore-tags",
        priority: "planned",
        title: { en: "Restore the declared tags", es: "Restaurar las etiquetas declaradas" },
        action: {
          en: "Restore the Environment tag from Terraform and confirm the resource appears in the correct reports and policies.",
          es: "Restaurar la etiqueta Environment desde Terraform y confirmar que el recurso aparezca en los reportes y politicas correctos.",
        },
      },
      {
        id: "enforce-tag-policy",
        priority: "next",
        title: { en: "Enforce tag policy", es: "Aplicar una politica de etiquetas" },
        action: {
          en: "Add validation or policy checks so required governance tags cannot silently diverge.",
          es: "Agregar validaciones o politicas para que las etiquetas obligatorias no puedan divergir silenciosamente.",
        },
      },
    ],
  },
  security_boundary_change: {
    problem: {
      en: "A network or access control changed outside the declared infrastructure code.",
      es: "Un control de red o acceso cambio fuera del codigo de infraestructura declarado.",
    },
    recommendations: [
      {
        id: "restore-security-boundary",
        priority: "immediate",
        title: { en: "Restore the declared security boundary", es: "Restaurar el limite de seguridad declarado" },
        action: {
          en: "Compare the observed rule with Terraform, remove the unauthorized change, and verify connectivity.",
          es: "Comparar la regla observada con Terraform, eliminar el cambio no autorizado y verificar la conectividad.",
        },
      },
    ],
  },
  missing_resource: {
    problem: {
      en: "A resource declared by Terraform is missing from the observed state.",
      es: "Un recurso declarado por Terraform no existe en el estado observado.",
    },
    recommendations: [
      {
        id: "investigate-missing-resource",
        priority: "immediate",
        title: { en: "Investigate the missing resource", es: "Investigar el recurso faltante" },
        action: {
          en: "Confirm whether it was deleted, renamed, or is temporarily unavailable before preparing recovery.",
          es: "Confirmar si fue eliminado, renombrado o esta temporalmente no disponible antes de preparar la recuperacion.",
        },
      },
    ],
  },
  unmanaged_resource: {
    problem: {
      en: "An observed resource is not managed by the current Terraform configuration.",
      es: "Un recurso observado no esta administrado por la configuracion Terraform actual.",
    },
    recommendations: [
      {
        id: "review-unmanaged-resource",
        priority: "review",
        title: { en: "Assign ownership", es: "Asignar propiedad" },
        action: {
          en: "Identify the owner and either import the resource into Terraform or remove it through an approved process.",
          es: "Identificar al propietario e importar el recurso a Terraform o retirarlo mediante un proceso aprobado.",
        },
      },
    ],
  },
  configuration_change: {
    problem: {
      en: "An observed configuration value differs from the declared source of truth.",
      es: "Un valor de configuracion observado difiere de la fuente de verdad declarada.",
    },
    recommendations: [
      {
        id: "review-configuration",
        priority: "review",
        title: { en: "Review and reconcile the change", es: "Revisar y reconciliar el cambio" },
        action: {
          en: "Confirm intent, restore the declared value when unauthorized, and verify the resource afterward.",
          es: "Confirmar la intencion, restaurar el valor declarado si no fue autorizado y verificar el recurso despues.",
        },
      },
    ],
  },
};

export function enrichDifferences(differences) {
  return differences.map((difference) => ({
    ...difference,
    problem: GUIDANCE[difference.risk_code]?.problem || GUIDANCE.configuration_change.problem,
  }));
}

export function buildRecommendations(differences) {
  if (differences.length === 0) {
    return [
      {
        id: "continue-monitoring",
        priority: "monitor",
        title: { en: "Continue monitoring", es: "Continuar monitoreando" },
        action: {
          en: "Keep periodic drift checks enabled and review every infrastructure change through code.",
          es: "Mantener verificaciones periodicas de drift y revisar cada cambio de infraestructura mediante codigo.",
        },
      },
    ];
  }

  const recommendations = new Map();
  for (const difference of differences) {
    const guidance = GUIDANCE[difference.risk_code] || GUIDANCE.configuration_change;
    for (const recommendation of guidance.recommendations) {
      recommendations.set(recommendation.id, recommendation);
    }
  }
  return [...recommendations.values()];
}
