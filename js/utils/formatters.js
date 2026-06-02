export const parseDate = d3.timeParse("%Y-%m-%d");
export const formatDate = d3.timeFormat("%d.%m.%Y");
export const formatValue = d3.format(".1f");

export function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

export function getAcceptedBadge(accepted) {
    const normalized = String(accepted ?? "").trim().toLowerCase();
    if (normalized === "1" || normalized === "true") {
        return `<span style="color:#16a34a;font-weight:800;">✓</span>`;
    }
    if (normalized === "0" || normalized === "false") {
        return `<span style="color:#dc2626;font-weight:800;">✗</span>`;
    }
    return `<span style="color:#64748b;font-weight:800;">•</span>`;
}
