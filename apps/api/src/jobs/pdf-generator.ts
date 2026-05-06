import puppeteer from "puppeteer";
import type { Report, Client, SenutoSnapshot, GscSnapshot, OptimizationNote, LinkFile } from "@agency/db";

interface ReportData {
  report: Report;
  client: Client;
  seoData: SenutoSnapshot[];
  gscData: GscSnapshot[];
  notes: OptimizationNote[];
  links: LinkFile[];
}

const MONTH_NAMES_PL = [
  "", "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"
];

export async function generateReportPdf(data: ReportData): Promise<Buffer> {
  const { report, client, seoData, gscData, notes, links } = data;

  const latestSeo = seoData[seoData.length - 1];
  const prevSeo = seoData[seoData.length - 2];
  const latestGsc = gscData[gscData.length - 1];

  const html = buildReportHtml({ report, client, latestSeo, prevSeo, latestGsc, notes, links });

  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH ?? "/usr/bin/chromium",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdf = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
  });

  await browser.close();
  return Buffer.from(pdf);
}

function buildReportHtml(data: {
  report: Report;
  client: Client;
  latestSeo: SenutoSnapshot | undefined;
  prevSeo: SenutoSnapshot | undefined;
  latestGsc: GscSnapshot | undefined;
  notes: OptimizationNote[];
  links: LinkFile[];
}): string {
  const { report, client, latestSeo, prevSeo, latestGsc, notes, links } = data;
  const monthName = MONTH_NAMES_PL[report.month];

  const notesByType = notes.reduce((acc, note) => {
    if (!acc[note.type]) acc[note.type] = [];
    acc[note.type].push(note);
    return acc;
  }, {} as Record<string, typeof notes>);

  const typeLabels: Record<string, string> = {
    optimization: "Optymalizacje",
    text: "Teksty",
    brief: "Briefy",
    link_building: "Link building",
    technical: "Prace techniczne",
    other: "Inne",
  };

  return `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: #fff; font-size: 13px; }
  .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 32px; margin-bottom: 32px; }
  .header h1 { font-size: 26px; font-weight: 700; margin-bottom: 6px; }
  .header p { opacity: 0.85; font-size: 14px; }
  .section { margin-bottom: 28px; padding: 0 8px; }
  h2 { font-size: 16px; font-weight: 700; color: #667eea; margin-bottom: 14px; border-bottom: 2px solid #667eea; padding-bottom: 6px; }
  h3 { font-size: 13px; font-weight: 600; color: #444; margin: 12px 0 8px; }
  .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .metric-card { background: #f8f9ff; border: 1px solid #e8eaf6; border-radius: 10px; padding: 16px; text-align: center; }
  .metric-card .value { font-size: 26px; font-weight: 700; color: #667eea; }
  .metric-card .label { font-size: 11px; color: #888; margin-top: 4px; }
  .metric-card .change { font-size: 11px; margin-top: 4px; }
  .change.up { color: #22c55e; }
  .change.down { color: #ef4444; }
  .note-item { background: #fafafa; border-left: 3px solid #667eea; padding: 10px 14px; margin-bottom: 8px; border-radius: 0 6px 6px 0; }
  .note-item .title { font-weight: 600; font-size: 13px; color: #1a1a2e; }
  .note-item .content { color: #666; font-size: 12px; margin-top: 4px; line-height: 1.5; }
  .note-item .url { font-size: 11px; color: #667eea; margin-top: 4px; }
  .links-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .link-card { background: #f0f4ff; border-radius: 8px; padding: 12px; }
  .link-card .filename { font-weight: 600; font-size: 12px; }
  .link-card .count { font-size: 18px; font-weight: 700; color: #667eea; }
  .footer { text-align: center; color: #aaa; font-size: 11px; margin-top: 32px; padding: 16px; border-top: 1px solid #eee; }
  .gsc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .gsc-card { background: #f0fff4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 14px; text-align: center; }
  .gsc-card .value { font-size: 22px; font-weight: 700; color: #16a34a; }
  .gsc-card .label { font-size: 11px; color: #888; margin-top: 4px; }
</style>
</head>
<body>
<div class="header">
  <h1>${report.title ?? `Raport SEO – ${monthName} ${report.year}`}</h1>
  <p>${client.name} &nbsp;|&nbsp; ${client.domain} &nbsp;|&nbsp; ${monthName} ${report.year}</p>
</div>

${latestSeo ? `
<div class="section">
  <h2>Widoczność w wynikach wyszukiwania (Senuto)</h2>
  <div class="metrics-grid">
    <div class="metric-card">
      <div class="value">${latestSeo.top3 ?? "—"}</div>
      <div class="label">Frazy TOP 3</div>
      ${prevSeo?.top3 != null && latestSeo.top3 != null ? `<div class="change ${(latestSeo.top3 - prevSeo.top3) >= 0 ? 'up' : 'down'}">${(latestSeo.top3 - prevSeo.top3) >= 0 ? '+' : ''}${latestSeo.top3 - prevSeo.top3} vs poprzedni miesiąc</div>` : ''}
    </div>
    <div class="metric-card">
      <div class="value">${latestSeo.top10 ?? "—"}</div>
      <div class="label">Frazy TOP 10</div>
      ${prevSeo?.top10 != null && latestSeo.top10 != null ? `<div class="change ${(latestSeo.top10 - prevSeo.top10) >= 0 ? 'up' : 'down'}">${(latestSeo.top10 - prevSeo.top10) >= 0 ? '+' : ''}${latestSeo.top10 - prevSeo.top10}</div>` : ''}
    </div>
    <div class="metric-card">
      <div class="value">${latestSeo.top50 ?? "—"}</div>
      <div class="label">Frazy TOP 50</div>
      ${prevSeo?.top50 != null && latestSeo.top50 != null ? `<div class="change ${(latestSeo.top50 - prevSeo.top50) >= 0 ? 'up' : 'down'}">${(latestSeo.top50 - prevSeo.top50) >= 0 ? '+' : ''}${latestSeo.top50 - prevSeo.top50}</div>` : ''}
    </div>
    <div class="metric-card">
      <div class="value">${latestSeo.totalKeywords ?? "—"}</div>
      <div class="label">Wszystkie frazy</div>
    </div>
  </div>
</div>
` : ''}

${latestGsc ? `
<div class="section">
  <h2>Google Search Console</h2>
  <div class="gsc-grid">
    <div class="gsc-card">
      <div class="value">${latestGsc.clicks?.toLocaleString("pl-PL") ?? "—"}</div>
      <div class="label">Kliknięcia</div>
    </div>
    <div class="gsc-card">
      <div class="value">${latestGsc.impressions?.toLocaleString("pl-PL") ?? "—"}</div>
      <div class="label">Wyświetlenia</div>
    </div>
    <div class="gsc-card">
      <div class="value">${latestGsc.ctr ? (parseFloat(latestGsc.ctr.toString()) * 100).toFixed(1) + "%" : "—"}</div>
      <div class="label">CTR</div>
    </div>
    <div class="gsc-card">
      <div class="value">${latestGsc.avgPosition ? parseFloat(latestGsc.avgPosition.toString()).toFixed(1) : "—"}</div>
      <div class="label">Śr. pozycja</div>
    </div>
  </div>
</div>
` : ''}

${notes.length > 0 ? `
<div class="section">
  <h2>Wykonane prace</h2>
  ${Object.entries(notesByType).map(([type, items]) => `
    <h3>${typeLabels[type] ?? type}</h3>
    ${items.map(note => `
      <div class="note-item">
        <div class="title">${note.title}</div>
        ${note.content ? `<div class="content">${note.content}</div>` : ""}
        ${note.url ? `<div class="url">${note.url}</div>` : ""}
      </div>
    `).join("")}
  `).join("")}
</div>
` : ''}

${links.length > 0 ? `
<div class="section">
  <h2>Pozyskane linki</h2>
  <div class="links-grid">
    ${links.map(link => `
      <div class="link-card">
        <div class="filename">${link.filename}</div>
        ${link.linksCount != null ? `<div class="count">${link.linksCount} linków</div>` : ""}
        ${link.description ? `<div style="font-size:11px;color:#666;margin-top:4px">${link.description}</div>` : ""}
      </div>
    `).join("")}
  </div>
</div>
` : ''}

${report.notes ? `
<div class="section">
  <h2>Komentarz</h2>
  <p style="line-height:1.7;color:#555">${report.notes}</p>
</div>
` : ""}

<div class="footer">Raport wygenerowany automatycznie &nbsp;|&nbsp; ${new Date().toLocaleDateString("pl-PL")}</div>
</body>
</html>`;
}
