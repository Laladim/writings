const reservationForm = document.querySelector("#reservation-form");
const reserveMessage = document.querySelector("#reserve-message");
const reserveButton = document.querySelector("#reserve-button");
const joinPill = document.querySelector("#join-pill");
let currentEvent = null;

function renderJoin(event) {
  currentEvent = event;
  const ready = Boolean(event && event.eventId);
  reserveButton.disabled = !ready;
  joinPill.textContent = ready ? "Open" : "Waiting";
  joinPill.classList.toggle("ready", ready);

  const title = ready ? event.summary : "Work At Home Geek Community Event by Shela";
  const description = ready && event.description ? event.description.split("\n\nAgenda")[0] : document.querySelector("#page-description").textContent;
  document.querySelector("#page-title").textContent = title;
  document.querySelector("#page-description").textContent = description;
  document.querySelector("#event-time").textContent = ready ? formatTime(event) : "Registration will open once Shela creates the Google Calendar event.";
  document.querySelector("#ticket-title").textContent = ready ? "Registration is open. Enter your name and email to join." : "Join the event once Shela opens registration.";
  document.querySelector("#ticket-date").textContent = ready ? formatTime(event) : "Registration status";
  document.querySelector("#summary-title").textContent = title;
  document.querySelector("#summary-time").textContent = ready ? formatTime(event) : "Not set";
  document.querySelector("#summary-seats").textContent = ready ? `${event.attendeeCount || 0} joined, ${event.seatsLeft ?? "unlimited"} seats left` : "Waiting";
  renderAgenda(document.querySelector("#agenda-list"), ready ? event.agenda : []);
}

async function loadJoinEvent() {
  try {
    renderJoin(await fetchJoinEvent());
  } catch (error) {
    renderJoin(null);
    setMessage(reserveMessage, "error", "The event system is not reachable yet. Please check again soon.");
  }
}

reservationForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage(reserveMessage, "", "");
  if (!currentEvent || !currentEvent.eventId) {
    setMessage(reserveMessage, "error", "Registration is not open yet.");
    return;
  }

  reserveButton.disabled = true;
  try {
    await reserveSpot({
      name: reservationForm.name.value.trim(),
      email: reservationForm.email.value.trim()
    });
    setMessage(reserveMessage, "success", "You joined the event. Google Calendar has been updated.");
    reservationForm.reset();
    await loadJoinEvent();
  } catch (error) {
    setMessage(reserveMessage, "error", error.message);
  } finally {
    reserveButton.disabled = !currentEvent;
  }
});

renderJoin(null);
loadJoinEvent();
