# Drift Detector risk model / Modelo de riesgo

Drift Detector assigns a deterministic score to every infrastructure difference.
The overall run score is the highest individual score, preventing many harmless
changes from artificially becoming a critical incident.

Drift Detector asigna un puntaje determinista a cada diferencia de
infraestructura. El puntaje general de una corrida es el valor individual mas
alto, evitando que muchos cambios inofensivos se conviertan artificialmente en
un incidente critico.

| Score | Level | Nivel | Example / Ejemplo |
|---:|---|---|---|
| 0 | None | Ninguno | Declared and observed state match / Los estados coinciden |
| 1–39 | Low | Bajo | Governance metadata or tag drift / Cambio de etiquetas |
| 40–69 | Medium | Medio | Capacity and cost change / Cambio de capacidad y costo |
| 70–100 | High | Alto | Public SSH or storage exposure / Exposicion de SSH o almacenamiento |

## Reproducible scenarios / Escenarios reproducibles

| ID | Score | Expected result / Resultado esperado |
|---|---:|---|
| `healthy` | 0 | No drift |
| `low` | 20 | S3 `Environment` tag changed |
| `medium` | 55 | EC2 type changed from `t3.micro` to `t3.xlarge` |
| `high-ssh` | 95 | Port 22 opened to `0.0.0.0/0` |
| `high-bucket` | 92 | S3 public-access protection disabled |

The demo never calls `terraform apply`. Every scenario only rewrites the local
simulated state and begins from a newly generated Terraform baseline.

La demostracion nunca ejecuta `terraform apply`. Cada escenario solo modifica
el estado simulado local y comienza desde una linea base generada nuevamente
desde Terraform.
