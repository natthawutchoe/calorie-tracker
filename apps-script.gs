const SHEET_NAME = "Data";

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, 3).setValues([["key", "value", "updatedAt"]]);
  }
  return sheet;
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const key = String((e.parameter && e.parameter.key) || "");
  if (!key) return json_({ ok: false, error: "missing key" });

  const sheet = getSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return json_({ ok: true, key, value: "" });

  const rows = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
  const found = rows.find((row) => String(row[0]) === key);
  return json_({ ok: true, key, value: found ? String(found[1] || "") : "" });
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const key = String(body.key || "");
    const value = String(body.value == null ? "" : body.value);
    if (!key) return json_({ ok: false, error: "missing key" });

    const lock = LockService.getScriptLock();
    lock.waitLock(5000);
    try {
      const sheet = getSheet_();
      const lastRow = sheet.getLastRow();
      let targetRow = 0;
      if (lastRow >= 2) {
        const keys = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        const index = keys.findIndex((row) => String(row[0]) === key);
        if (index >= 0) targetRow = index + 2;
      }
      if (!targetRow) targetRow = sheet.getLastRow() + 1;
      sheet.getRange(targetRow, 1, 1, 3).setValues([[key, value, new Date()]]);
      return json_({ ok: true, key });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}
