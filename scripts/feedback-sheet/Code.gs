/**
 * Eat Out Better — feedback endpoint (Google Apps Script web app).
 *
 * Lives in the "Feedback Form" Google Sheet (owner: eatoutbetter@gmail.com):
 * Extensions → Apps Script. This file is the source of truth; the copy in the
 * script editor is a deployment of it. See README.md next to this file for how
 * to paste and redeploy WITHOUT changing the URL the app posts to.
 *
 * The app (apps/mobile/components/FeedbackSheet.tsx) POSTs JSON as text/plain:
 *
 *   posthog_distinct_id, screen, feedback_type, rating, tags, feedback,
 *   scan_session_id, dish_count, app_version, environment
 *
 * Columns are matched BY HEADER NAME, not position, and any column this script
 * knows about but the sheet lacks is added on the fly. So the sheet can be
 * reordered, and a field added to the app later only needs one line in COLUMNS.
 *
 * The web app URL is public (it ships inside the app), so every value is
 * treated as hostile: fields with a fixed set of values are allowlisted, and
 * every other string goes through text_(), which stops a value like
 * =IMPORTXML(...) from becoming a live formula when someone opens the sheet.
 */

// The values apps/mobile/components/FeedbackSheet.tsx and its callers send.
// Anything else is stored as "other" (screen) or blank (feedback_type).
var SCREENS = ["index", "capture", "processing", "results", "results_history"];
var FEEDBACK_TYPES = ["scan_rating", "general"];
var MAX_TEXT = 2000;

var COLUMNS = [
  // [header in the sheet, how to read it from the request]
  ["Timestamp", function () { return new Date(); }],
  ["User ID", function (p) { return text_(p.posthog_distinct_id); }],
  ["Screen", function (p) { return oneOf_(p.screen, SCREENS, "other"); }],
  ["Feedback", function (p) { return text_(p.feedback); }],
  ["Rating", function (p) { return intInRange_(p.rating, 1, 5); }],
  ["feedback_type", function (p) { return oneOf_(p.feedback_type, FEEDBACK_TYPES, ""); }],
  ["tags", function (p) { return text_(p.tags); }],
  ["scan_session_id", function (p) { return text_(p.scan_session_id); }],
  ["dish_count", function (p) { return intInRange_(p.dish_count, 0, 10000); }],
  ["app_version", function (p) { return text_(p.app_version); }],
  ["environment", function (p) { return text_(p.environment); }],
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(10000); // two testers submitting at once must not share a row
  try {
    var payload = {};
    try {
      payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    } catch (parseError) {
      payload = { feedback: String(e && e.postData && e.postData.contents) };
    }
    if (!payload || typeof payload !== "object") payload = {};

    var sheet = feedbackSheet_();
    var headers = ensureHeaders_(sheet);
    var row = headers.map(function (header) {
      for (var i = 0; i < COLUMNS.length; i++) {
        if (COLUMNS[i][0] === header) {
          var value = COLUMNS[i][1](payload);
          return value === undefined || value === null ? "" : value;
        }
      }
      return ""; // a column someone added by hand — leave it blank
    });
    sheet.appendRow(row);

    return json_({ ok: true });
  } catch (error) {
    // Details go to the Apps Script execution log, never to the caller.
    console.error(error);
    return json_({ ok: false });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Run once from the editor (select it in the function menu → Run) to add the
 * new column headers straight away, rather than waiting for the next feedback.
 */
function setupHeaders() {
  ensureHeaders_(feedbackSheet_());
}

function feedbackSheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
}

/** Returns the header row, appending any known column the sheet is missing. */
function ensureHeaders_(sheet) {
  var lastColumn = Math.max(sheet.getLastColumn(), 1);
  var headers = sheet
    .getRange(1, 1, 1, lastColumn)
    .getValues()[0]
    .map(function (h) { return String(h).trim(); });
  // A brand-new sheet reads back as one empty cell.
  if (headers.length === 1 && headers[0] === "") headers = [];

  COLUMNS.forEach(function (column) {
    if (headers.indexOf(column[0]) === -1) {
      headers.push(column[0]);
      sheet.getRange(1, headers.length).setValue(column[0]);
    }
  });
  return headers;
}

/**
 * Free text, made safe for a spreadsheet cell: capped at MAX_TEXT, and
 * prefixed with ' when it starts with a character Sheets treats as the start
 * of a formula (= + - @, or a tab / carriage return before one). The ' is
 * hidden in the cell; the text reads as typed.
 */
function text_(value) {
  if (value === undefined || value === null) return "";
  var s = String(value).slice(0, MAX_TEXT);
  return /^[=+\-@\t\r]/.test(s) ? "'" + s : s;
}

function oneOf_(value, allowed, fallback) {
  if (value === undefined || value === null || value === "") return "";
  return allowed.indexOf(String(value)) === -1 ? fallback : String(value);
}

/** A whole number in [min, max], or blank. Accepts "4" as well as 4. */
function intInRange_(value, min, max) {
  if (value === undefined || value === null || value === "") return "";
  var n = Number(value);
  return Math.floor(n) === n && n >= min && n <= max ? n : "";
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(
    ContentService.MimeType.JSON
  );
}
