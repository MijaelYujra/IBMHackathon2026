const translations = {
  en: {
    skip: "Skip to content",
    navHome: "Home",
    navAbout: "About Us",
    navProjects: "Projects",
    navTeam: "Team",
    navContact: "Contact",
    navExplore: "Explore",
    heroEyebrow: "IBM Bob 2.0 Hackathon · Team online",
    heroTagline: "Coding Beyond the Event Horizon",
    heroSummary: "We turn infrastructure uncertainty into explainable, human-reviewed action with AI, Terraform, and MCP.",
    heroPrimary: "View Hackathon Project",
    heroSecondary: "Meet the Team",
    proofProject: "flagship project",
    proofMembers: "team members",
    proofReview: "human-reviewed",
    hudStatus: "SYSTEM STATUS",
    hudHuman: "HUMAN IN CONTROL",
    aboutIndex: "01 / ABOUT",
    aboutTitle: "We build clarity at the edge of complexity.",
    aboutLead: "3ntropy is a Bolivian hackathon team exploring how responsible AI can make technical systems safer, faster, and easier to understand.",
    featureOneTitle: "Detect the invisible",
    featureOneText: "Surface infrastructure changes that happen outside the declared source of truth.",
    featureTwoTitle: "Explain the risk",
    featureTwoText: "Turn raw configuration differences into prioritized, understandable findings.",
    featureThreeTitle: "Keep humans in control",
    featureThreeText: "Prepare safe remediation proposals without blindly applying cloud changes.",
    featureFourTitle: "Measure the impact",
    featureFourText: "Transform every detection into evidence, traceability, and actionable metrics.",
    projectIndex: "02 / FLAGSHIP PROJECT",
    projectLead: "An AI-assisted safety layer that compares Terraform with observed infrastructure, detects drift, explains its risk, and prepares a remediation for human approval.",
    projectDisclosure: "The hackathon prototype generates its declared state from real Terraform plans and uses a simulated cloud state, so the demo is safe, reproducible, and credential-free.",
    projectDashboard: "Open Impact Dashboard",
    projectCode: "View public code ↗",
    pipelineDeclared: "Declared state",
    pipelineCompare: "Deterministic comparison",
    pipelineExplain: "Risk explanation",
    pipelineApprove: "Review and approval",
    teamIndex: "03 / CREW",
    teamTitle: "Three minds. One shared orbit.",
    teamLead: "A multidisciplinary team building practical, responsible technology from Bolivia.",
    teamRole: "Hackathon Builder",
    contactIndex: "04 / TRANSMISSION",
    contactTitle: "Explore our signal.",
    contactText: "Review the source, reproduce the demo, and follow the evolution of Drift Detector.",
    contactButton: "Explore on GitHub",
    footerText: "Built for the IBM Bob 2.0 Hackathon."
  },
  es: {
    skip: "Saltar al contenido",
    navHome: "Inicio",
    navAbout: "Nosotros",
    navProjects: "Proyectos",
    navTeam: "Equipo",
    navContact: "Contacto",
    navExplore: "Explorar",
    heroEyebrow: "Hackathon IBM Bob 2.0 · Equipo en línea",
    heroTagline: "Programando más allá del horizonte de eventos",
    heroSummary: "Transformamos la incertidumbre de infraestructura en acciones explicables y revisadas por personas mediante IA, Terraform y MCP.",
    heroPrimary: "Ver proyecto del hackathon",
    heroSecondary: "Conocer al equipo",
    proofProject: "proyecto principal",
    proofMembers: "integrantes",
    proofReview: "revisión humana",
    hudStatus: "ESTADO DEL SISTEMA",
    hudHuman: "HUMANO AL MANDO",
    aboutIndex: "01 / NOSOTROS",
    aboutTitle: "Creamos claridad en el límite de la complejidad.",
    aboutLead: "3ntropy es un equipo boliviano de hackathon que explora cómo la IA responsable puede hacer que los sistemas técnicos sean más seguros, rápidos y fáciles de comprender.",
    featureOneTitle: "Detectar lo invisible",
    featureOneText: "Descubrimos cambios de infraestructura que ocurren fuera de la fuente de verdad declarada.",
    featureTwoTitle: "Explicar el riesgo",
    featureTwoText: "Convertimos diferencias de configuración en hallazgos comprensibles y priorizados.",
    featureThreeTitle: "Mantener el control humano",
    featureThreeText: "Preparamos remediaciones seguras sin aplicar cambios en la nube a ciegas.",
    featureFourTitle: "Medir el impacto",
    featureFourText: "Transformamos cada detección en evidencia, trazabilidad y métricas accionables.",
    projectIndex: "02 / PROYECTO PRINCIPAL",
    projectLead: "Una capa de seguridad asistida por IA que compara Terraform con la infraestructura observada, detecta drift, explica su riesgo y prepara una remediación para aprobación humana.",
    projectDisclosure: "El prototipo genera su estado declarado desde planes reales de Terraform y usa un estado cloud simulado; así, la demostración es segura, reproducible y no necesita credenciales.",
    projectDashboard: "Abrir dashboard de impacto",
    projectCode: "Ver código público ↗",
    pipelineDeclared: "Estado declarado",
    pipelineCompare: "Comparación determinista",
    pipelineExplain: "Explicación del riesgo",
    pipelineApprove: "Revisión y aprobación",
    teamIndex: "03 / EQUIPO",
    teamTitle: "Tres mentes. Una órbita compartida.",
    teamLead: "Un equipo multidisciplinario que construye tecnología práctica y responsable desde Bolivia.",
    teamRole: "Creador del hackathon",
    contactIndex: "04 / TRANSMISIÓN",
    contactTitle: "Explora nuestra señal.",
    contactText: "Revisa el código, reproduce la demostración y sigue la evolución de Drift Detector.",
    contactButton: "Explorar en GitHub",
    footerText: "Creado para el Hackathon IBM Bob 2.0."
  }
};

const languageButtons = document.querySelectorAll("[data-language]");
const translatableElements = document.querySelectorAll("[data-i18n]");
const storedLanguage = localStorage.getItem("3ntropy-language");
const browserLanguage = navigator.language?.toLowerCase().startsWith("es") ? "es" : "en";

function setLanguage(language) {
  const dictionary = translations[language] || translations.en;
  document.documentElement.lang = language;
  translatableElements.forEach((element) => {
    const value = dictionary[element.dataset.i18n];
    if (value) element.textContent = value;
  });
  languageButtons.forEach((button) => {
    const active = button.dataset.language === language;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  localStorage.setItem("3ntropy-language", language);
}

languageButtons.forEach((button) => {
  button.addEventListener("click", () => setLanguage(button.dataset.language));
});

setLanguage(storedLanguage || browserLanguage);

const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

menuToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(open));
});

navLinks.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
  });
});

const stars = document.getElementById("stars");
for (let index = 0; index < 70; index += 1) {
  const star = document.createElement("span");
  star.className = "star";
  star.style.left = `${Math.random() * 100}%`;
  star.style.top = `${Math.random() * 100}%`;
  star.style.setProperty("--star-size", `${Math.random() * 1.8 + 0.5}px`);
  star.style.setProperty("--star-opacity", `${Math.random() * 0.55 + 0.2}`);
  star.style.setProperty("--star-speed", `${Math.random() * 4 + 2}s`);
  star.style.animationDelay = `${Math.random() * -5}s`;
  stars.appendChild(star);
}

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 }
);

document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
document.getElementById("year").textContent = new Date().getFullYear();
