const SHEET_NAME = "Registrations";
const BFF_REGISTRATIONS_SPREADSHEET_ID = "__BFF_REGISTRATIONS_SPREADSHEET_ID__";
const HEADERS = [
  "Timestamp",
  "Registration ID",
  "Email",
  "Archetype",
  "Archetype Name",
  "Blocker",
  "Proof Sample",
  "Next Lesson URL",
  "Source Page",
  "Q1 Background",
  "Tools",
  "Creative",
  "Shift",
  "English",
  "Experience",
  "CRM Status",
  "Email Status",
  "Brevo Status",
  "Notes"
];

function doPost(e) {
  try {
    const data = parsePayload_(e);
    const result = register_(data);
    return json_({ ok: true, registration_id: result.registrationId, crm_status: "new", email_status: "not-configured", brevo_status: "not-configured" });
  } catch (error) {
    return json_({ ok: false, errors: [String(error && error.message || error)] }, 400);
  }
}

function doGet() {
  return json_({ ok: true, service: "bff-archetype-registration" });
}

function parsePayload_(e) {
  const data = {};
  if (e && e.parameter) {
    Object.keys(e.parameter).forEach(function(key) {
      data[key] = e.parameter[key];
    });
  }
  if (e && e.postData && e.postData.type === "application/json" && e.postData.contents) {
    const json = JSON.parse(e.postData.contents);
    Object.keys(json).forEach(function(key) {
      data[key] = json[key];
    });
  }
  return data;
}

function register_(data) {
  if (data.website) throw new Error("Spam check failed.");
  const email = String(data.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Valid email is required.");
  if (!data.archetype) throw new Error("Archetype is required.");

  const sheet = getSheet_();
  const registrationId = "BFF-REG-" + Utilities.getUuid().replace(/-/g, "").slice(0, 16).toUpperCase();
  sheet.appendRow([
    new Date(),
    registrationId,
    email,
    data.archetype || "",
    data.archetype_name || "",
    data.blocker || "",
    data.proof_sample || "",
    data.next_lesson_url || "",
    data.source_page || "",
    data.q1 || "",
    data.tools || "",
    data.creative || "",
    data.q4 || "",
    data.q5 || "",
    data.experience || "",
    "new",
    "not-configured",
    "not-configured",
    ""
  ]);
  return { registrationId: registrationId };
}

function getSheet_() {
  const spreadsheetId = BFF_REGISTRATIONS_SPREADSHEET_ID;
  if (!spreadsheetId) throw new Error("Missing BFF_REGISTRATIONS_SPREADSHEET_ID.");
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function json_(data, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
