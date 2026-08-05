const RAW_SHEET = "RawData";
const USERS_SHEET = "Users";
const PROFILES_SHEET = "Profiles";
const FOODS_SHEET = "Foods";
const LOGS_SHEET = "Logs";
const SPREADSHEET_ID = "1u7iTIX_Rw73tvnb5XMjorbwSCjNN0YaDkztSW6k2MFE";

let spreadsheet__;

function spreadsheet_() {
  if (!spreadsheet__) spreadsheet__ = SpreadsheetApp.openById(SPREADSHEET_ID);
  return spreadsheet__;
}

function sheet_(name, headers) {
  const ss = spreadsheet_();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  return sheet;
}

function rawSheet_() {
  return sheet_(RAW_SHEET, ["key", "value", "updatedAt"]);
}

function usersSheet_() {
  return sheet_(USERS_SHEET, ["userId", "userName", "updatedAt"]);
}

function profilesSheet_() {
  return sheet_(PROFILES_SHEET, ["userId", "userName", "profileJson", "updatedAt"]);
}

function foodsSheet_() {
  return sheet_(FOODS_SHEET, ["userId", "userName", "foodCount", "foodsJson", "updatedAt"]);
}

function logsSheet_() {
  return sheet_(LOGS_SHEET, ["userId", "userName", "date", "totalKcal", "entryCount", "entriesJson", "updatedAt"]);
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function findRowByValue_(sheet, col, value) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const values = sheet.getRange(2, col, lastRow - 1, 1).getValues();
  const index = values.findIndex((row) => String(row[0]) === String(value));
  return index >= 0 ? index + 2 : 0;
}

function findRowByTwoValues_(sheet, colA, valueA, colB, valueB) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  const index = values.findIndex((row) => String(row[colA - 1]) === String(valueA) && String(row[colB - 1]) === String(valueB));
  return index >= 0 ? index + 2 : 0;
}

function upsertRaw_(key, value) {
  const sheet = rawSheet_();
  const row = findRowByValue_(sheet, 1, key) || sheet.getLastRow() + 1;
  sheet.getRange(row, 1, 1, 3).setValues([[key, value, new Date()]]);
}

function getRaw_(key) {
  const sheet = rawSheet_();
  const row = findRowByValue_(sheet, 1, key);
  if (!row) return "";
  return String(sheet.getRange(row, 2).getValue() || "");
}

function parseUserKey_(key) {
  const match = String(key || "").match(/^user:([^:]+):(profile|foods|log)(?::(.+))?$/);
  if (!match) return null;
  return { userId: match[1], type: match[2], date: match[3] || "" };
}

function userName_(userId) {
  const sheet = usersSheet_();
  const row = findRowByValue_(sheet, 1, userId);
  return row ? String(sheet.getRange(row, 2).getValue() || "") : "";
}

function syncUsers_(value) {
  const users = JSON.parse(value || "[]");
  const sheet = usersSheet_();
  users.forEach((user) => {
    if (!user || !user.id) return;
    const row = findRowByValue_(sheet, 1, user.id) || sheet.getLastRow() + 1;
    sheet.getRange(row, 1, 1, 3).setValues([[String(user.id), String(user.name || ""), new Date()]]);
  });
}

function syncUserData_(key, value) {
  const meta = parseUserKey_(key);
  if (!meta) return;
  const name = userName_(meta.userId);

  if (meta.type === "profile") {
    const sheet = profilesSheet_();
    const row = findRowByValue_(sheet, 1, meta.userId) || sheet.getLastRow() + 1;
    sheet.getRange(row, 1, 1, 4).setValues([[meta.userId, name, value, new Date()]]);
    return;
  }

  if (meta.type === "foods") {
    let foods = [];
    try { foods = JSON.parse(value || "[]"); } catch (err) {}
    const sheet = foodsSheet_();
    const row = findRowByValue_(sheet, 1, meta.userId) || sheet.getLastRow() + 1;
    sheet.getRange(row, 1, 1, 5).setValues([[meta.userId, name, foods.length, value, new Date()]]);
    return;
  }

  if (meta.type === "log") {
    let entries = [];
    try { entries = JSON.parse(value || "[]"); } catch (err) {}
    const total = entries.reduce((sum, item) => sum + Number(item.kcal || 0), 0);
    const sheet = logsSheet_();
    const row = findRowByTwoValues_(sheet, 1, meta.userId, 3, meta.date) || sheet.getLastRow() + 1;
    sheet.getRange(row, 1, 1, 7).setValues([[meta.userId, name, meta.date, total, entries.length, value, new Date()]]);
  }
}

function doGet(e) {
  if (e.parameter && e.parameter.cap === "batch") return json_({ ok: true, batch: true });
  const key = String((e.parameter && e.parameter.key) || "");
  if (!key) return json_({ ok: false, error: "missing key" });
  return json_({ ok: true, key, value: getRaw_(key) });
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const items = Array.isArray(body.items)
      ? body.items
      : [{ key: body.key, value: body.value }];
    const normalized = items
      .map((item) => ({
        key: String((item && item.key) || ""),
        value: String(item && item.value == null ? "" : item.value),
      }))
      .filter((item) => item.key);
    if (!normalized.length) return json_({ ok: false, error: "missing key" });

    const lock = LockService.getScriptLock();
    lock.waitLock(5000);
    try {
      normalized.forEach((item) => {
        upsertRaw_(item.key, item.value);
        if (item.key === "users") syncUsers_(item.value);
        else syncUserData_(item.key, item.value);
      });
      return json_({ ok: true, count: normalized.length, key: normalized[0].key });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}
