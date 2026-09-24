const CLOUDFLARE_COMPONENTS = [
  "D1",
  "Durable Objects",
  "Email Routing",
  "Queues",
  "R2",
  "Turnstile",
  "Workers",
  "Workers Assets",
];

const STATE_LABELS = {
  investigating: "Investigating",
  monitoring: "Monitoring",
  operational: "Operational",
  resolved: "Resolved",
};

const STATUS_WEIGHT = {
  operational: 0,
  under_maintenance: 1,
  degraded_performance: 2,
  partial_outage: 3,
  major_outage: 4,
};

const STATUS_PRESENTATION = {
  operational: { label: "Operational", tone: "good" },
  under_maintenance: { label: "Maintenance", tone: "maintenance" },
  degraded_performance: { label: "Degraded", tone: "warning" },
  partial_outage: { label: "Partial outage", tone: "bad" },
  major_outage: { label: "Major outage", tone: "bad" },
  unknown: { label: "Unknown", tone: "unknown" },
};

function byId(id) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required page element: ${id}`);
  }
  return element;
}

function setStatusIcon(element, alert) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("viewBox", "0 0 24 24");
  path.setAttribute(
    "d",
    alert ? "M12 9v4m0 4h.01M10.3 3.7 2.4 18a2 2 0 0 0 1.75 3h15.7a2 2 0 0 0 1.75-3L13.7 3.7a2 2 0 0 0-3.4 0Z" : "M20 6 9 17l-5-5",
  );
  svg.append(path);
  element.replaceChildren(svg);
}

function showHistoryMessage(container, message) {
  const paragraph = document.createElement("p");
  paragraph.className = "history-empty";
  paragraph.textContent = message;
  container.replaceChildren(paragraph);
}

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZoneName: "short",
    year: "numeric",
  }).format(date);
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, { cache: "no-store", signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Status request failed with ${response.status}`);
    }
    return await response.json();
  } finally {
    window.clearTimeout(timeout);
  }
}

function setPill(element, status) {
  const presentation = STATUS_PRESENTATION[status] ?? STATUS_PRESENTATION.unknown;
  element.className = `status-pill status-pill--${presentation.tone}`;
  element.textContent = presentation.label;
}

function worstStatus(statuses) {
  if (statuses.length === 0 || statuses.some((status) => STATUS_WEIGHT[status] === undefined)) {
    return "unknown";
  }
  return statuses.reduce((worst, status) => (STATUS_WEIGHT[status] > STATUS_WEIGHT[worst] ? status : worst));
}

async function loadJamStatus() {
  const section = byId("jam-status");
  try {
    const status = await fetchJson(`/status.json?published=${Date.now()}`);
    const active = status.state === "investigating" || status.state === "monitoring";
    section.classList.toggle("status-current--incident", active);
    setStatusIcon(byId("jam-status-icon"), active);
    byId("jam-status-label").textContent = STATE_LABELS[status.state] ?? "Published notice";
    byId("current-status").textContent = status.notice.title;
    byId("jam-status-summary").textContent = status.notice.summary;

    const details = byId("jam-status-details");
    details.hidden = !active;
    if (active) {
      byId("jam-status-affected").textContent = status.notice.affected;
      byId("jam-status-action").textContent = status.notice.safeAction;
      byId("jam-status-updated").textContent = formatTime(status.updatedAt);
      byId("jam-status-next").textContent = formatTime(status.notice.nextUpdate);
    }
  } catch {
    section.classList.add("status-current--unknown");
    setStatusIcon(byId("jam-status-icon"), true);
    byId("jam-status-label").textContent = "Status unavailable";
    byId("current-status").textContent = "The Jam notice could not be loaded.";
    byId("jam-status-summary").textContent = "Use the support link below if you are having trouble with Jam.";
  } finally {
    section.setAttribute("aria-busy", "false");
  }
}

function providerUnavailable(prefix, message) {
  const card = byId(`${prefix}-status`);
  card.setAttribute("aria-busy", "false");
  setPill(byId(`${prefix}-label`), "unknown");
  byId(`${prefix}-summary`).textContent = message;
  byId(`${prefix}-updated`).textContent = "Open the provider status page for the latest report.";
}

async function loadWorkOSStatus() {
  try {
    const report = await fetchJson("https://status.workos.com/api/v2/summary.json");
    const authKit = report.components?.find((component) => component.name === "AuthKit");
    if (!authKit) {
      throw new Error("AuthKit is missing from the provider report");
    }
    setPill(byId("workos-label"), authKit.status);
    byId("workos-summary").textContent =
      authKit.status === "operational"
        ? "WorkOS reports AuthKit as operational."
        : `WorkOS reports AuthKit as ${STATUS_PRESENTATION[authKit.status]?.label.toLowerCase() ?? "unknown"}.`;
    byId("workos-updated").textContent = `Provider report updated ${formatTime(report.page?.updated_at)}.`;
    byId("workos-status").setAttribute("aria-busy", "false");
  } catch {
    providerUnavailable("workos", "WorkOS status could not be checked.");
  }
}

async function loadCloudflareStatus() {
  try {
    const report = await fetchJson("https://www.cloudflarestatus.com/api/v2/summary.json");
    const byName = new Map((report.components ?? []).map((component) => [component.name, component]));
    const components = CLOUDFLARE_COMPONENTS.map((name) => byName.get(name));
    if (components.some((component) => !component)) {
      throw new Error("The provider report is missing a Jam dependency");
    }

    const status = worstStatus(components.map((component) => component.status));
    setPill(byId("cloudflare-label"), status);
    byId("cloudflare-summary").textContent =
      status === "operational"
        ? "Cloudflare reports Jam's selected runtime services as operational."
        : "Cloudflare reports an issue or maintenance affecting at least one service Jam uses.";

    const list = byId("cloudflare-components");
    list.replaceChildren();
    for (const component of components) {
      const item = document.createElement("li");
      const name = document.createElement("span");
      const state = document.createElement("span");
      name.textContent = component.name;
      state.className = `component-state component-state--${STATUS_PRESENTATION[component.status]?.tone ?? "unknown"}`;
      state.textContent = STATUS_PRESENTATION[component.status]?.label ?? "Unknown";
      item.append(name, state);
      list.append(item);
    }

    byId("cloudflare-updated").textContent = `Provider report updated ${formatTime(report.page?.updated_at)}.`;
    byId("cloudflare-status").setAttribute("aria-busy", "false");
  } catch {
    providerUnavailable("cloudflare", "Cloudflare status could not be checked.");
  }
}

async function loadIncidentHistory() {
  const container = byId("incident-history");
  try {
    const report = await fetchJson(`/incidents.json?published=${Date.now()}`);
    if (report.incidents.length === 0) {
      showHistoryMessage(container, "No public incidents have been recorded yet.");
      return;
    }

    const list = document.createElement("ol");
    list.className = "history-list";
    for (const incident of report.incidents) {
      const item = document.createElement("li");
      const heading = document.createElement("h3");
      const summary = document.createElement("p");
      const time = document.createElement("p");
      heading.textContent = incident.title;
      summary.textContent = incident.summary;
      time.className = "history-list__time";
      time.textContent = `${formatTime(incident.startedAt)} to ${formatTime(incident.resolvedAt)}`;
      item.append(heading, summary, time);
      list.append(item);
    }
    container.replaceChildren(list);
  } catch {
    showHistoryMessage(container, "Incident history could not be loaded.");
  }
}

async function loadPage() {
  await Promise.allSettled([loadJamStatus(), loadWorkOSStatus(), loadCloudflareStatus(), loadIncidentHistory()]);
  byId("provider-check-time").textContent = `Provider feeds checked ${formatTime(new Date().toISOString())}.`;
}

void loadPage();
