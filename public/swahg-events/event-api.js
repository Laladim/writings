const EVENT_API_BASE = window.EVENT_API_BASE || "";

function apiUrl(path) {
  return `${EVENT_API_BASE}${path}`;
}

function setMessage(el, state, text) {
  if (!el) return;
  el.dataset.state = state || "";
  el.textContent = text || "";
}

function toGoogleDateTime(value) {
  if (!value) return "";
  return new Date(value).toISOString();
}

function formatTime(event) {
  if (!event || !event.start || !event.start.dateTime) return "Not set";
  const start = new Date(event.start.dateTime);
  const end = event.end && event.end.dateTime ? new Date(event.end.dateTime) : null;
  const startText = start.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  const endText = end ? end.toLocaleTimeString([], { timeStyle: "short" }) : "";
  return endText ? `${startText} to ${endText}` : startText;
}

function localDatetimeValue(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function renderAgenda(listEl, agenda) {
  if (!listEl) return;
  listEl.innerHTML = "";
  (agenda || []).forEach((item) => {
    const li = document.createElement("li");
    const time = document.createElement("strong");
    const title = document.createElement("span");
    const notes = document.createElement("p");
    time.textContent = item.time || "Agenda";
    title.textContent = item.title || "";
    notes.className = "note";
    notes.textContent = item.notes || "";
    li.append(time, title, notes);
    listEl.appendChild(li);
  });
}

function renderAttendees(listEl, attendees) {
  if (!listEl) return;
  listEl.innerHTML = "";
  (attendees || []).forEach((attendee) => {
    const li = document.createElement("li");
    const name = document.createElement("strong");
    const status = document.createElement("span");
    name.textContent = attendee.displayName || attendee.email || "Attendee";
    status.textContent = attendee.responseStatus || "joined";
    li.append(name, status);
    listEl.appendChild(li);
  });
}

async function fetchEvent() {
  const response = await fetch(apiUrl("/api/event"));
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || "Could not load event.");
  return data.event;
}

async function fetchJoinEvent() {
  const response = await fetch(apiUrl("/api/join-event"));
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || "Could not load event.");
  return data.event;
}

async function postEvent(payload) {
  const response = await fetch(apiUrl("/api/event"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || "Could not create event.");
  return data.event;
}

async function reserveSpot(payload) {
  const response = await fetch(apiUrl("/api/reserve"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok || !data.ok) throw new Error(data.error || "Could not join event.");
  return data;
}
