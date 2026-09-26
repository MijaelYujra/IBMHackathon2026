const fileInput = document.getElementById("fileInput");
const content = document.getElementById("content");

fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const entries = text
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => {
            try {
                return JSON.parse(l);
            } catch {
                return null;
            }
        })
        .filter(Boolean);

    render(entries);
});

function render(entries) {
    if (entries.length === 0) {
        content.innerHTML =
            '<div class="empty">El archivo no tiene entradas válidas.</div>';
        return;
    }

    const totalDetections = entries.length;
    const totalDiffs = entries.reduce((s, e) => s + (e.total_diffs || 0), 0);
    const totalHighRisk = entries.reduce(
        (s, e) => s + (e.high_risk_diffs || 0),
        0,
    );
    const totalMinutes = entries.reduce(
        (s, e) => s + (e.estimated_minutes_saved || 0),
        0,
    );
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

    const maxMinutes = Math.max(
        ...entries.map((e) => e.estimated_minutes_saved || 0),
        1,
    );

    const cardsHtml = `
        <div class="cards">
            <div class="card">
                <div class="value">
                    ${totalDetections}
                </div>
                <div class="label">
                    Corridas con drift detectado
                </div>
            </div>
            <div class="card">
                <div class="value">
                    ${totalDiffs}
                </div>
                <div class="label">
                    Diferencias totales encontradas
                </div>
            </div>
            <div class="card">
                <div class="value" style="color:var(--high)">
                    ${totalHighRisk}</div>
                <div class="label">
                    De alto riesgo
                </div>
            </div>
            <div class="card">
                <div class="value" style="color:var(--accent)">
                    ${totalHours}h
                </div>
                <div class="label">
                    Tiempo estimado ahorrado
                </div>
            </div>
        </div>
    `;

    const barsHtml = entries
        .slice(-10)
        .map((e) => {
            const pct = Math.max(
                4,
                Math.round(((e.estimated_minutes_saved || 0) / maxMinutes) * 100),
            );
            const dt = new Date(e.timestamp);
            const label = isNaN(dt) ? e.timestamp : dt.toLocaleTimeString();
            return `
            <div class="bar-row">
                <div class="bar-label">
                    ${label}
                </div>
                <div class="bar-track">
                    <div class="bar-fill" style="width:${pct}%; border-radius: 999px">
                    </div>
                </div>
                <div style="width:70px; text-align:right; font-size:0.8rem; color:var(--muted)">
                    ${e.estimated_minutes_saved} min
                </div>
            </div>
        `;
        })
        .join("");

    const tableRows = entries
        .slice()
        .reverse()
        .map((e) => {
            const dt = new Date(e.timestamp);
            const label = isNaN(dt) ? e.timestamp : dt.toLocaleString();
            const badgeClass = e.high_risk_diffs > 0 ? "alta" : "baja";
            const badgeText =
                e.high_risk_diffs > 0
                    ? `${e.high_risk_diffs} de alto riesgo`
                    : "sin riesgo alto";
            return `
            <tr>
                <td>${label}</td>
                <td>${e.total_diffs}</td>
                <td><span class="badge ${badgeClass}">${badgeText}</span></td>
                <td>${e.estimated_minutes_saved} min</td>
            </tr>
            `;
        })
        .join("");

    content.innerHTML = `
        ${cardsHtml}
        <div class="panel">
            <h2>Tiempo ahorrado por corrida (últimas 10)</h2>
            ${barsHtml}
        </div>
        <div class="panel">
            <h2>Historial de detecciones</h2>
            <table>
            <thead><tr><th>Fecha</th><th>Diffs</th><th>Riesgo</th><th>Tiempo ahorrado</th></tr></thead>
            <tbody>${tableRows}</tbody>
            </table>
        </div>
    `;
}
