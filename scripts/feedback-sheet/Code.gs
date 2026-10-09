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
 * SECURITY: this URL is public and unauthenticated — anyone who finds it can
 * POST. So every value is treated as hostile before it reaches the sheet:
 *   - enum-like fields (feedback_type, screen, rating) are allowlisted;
 *   - every string is truncated and neutralised against formula injection
 *     (a cell starting with "=" would otherwise run as a live formula when the
 *     sheet is opened, e.g. =IMPORTXML(...) leaking other rows to a URL);
 *   - errors are logged, never echoed back to the caller.
 * A new screen or feedback type in the app needs adding to the allowlists
 * below, or it is recorded as "other".
 */

// Values apps/mobile/components/FeedbackSheet.tsx actually sends.
var FEEDBACK_TYPES = ["scan_rating", "general"];
var SCREENS = ["index", "capture", "processing", "results", "results_history"];
var ENVIRONMENTS = ["development", "preview", "production"];
var MAX_CELL_LENGTH = 2000;

var COLUMNS = [
  // [header in the sheet, how to read it from the request]
  ["Timestamp", function () { return new Date(); }],
  ["User ID", function (p) { return p.posthog_distinct_id; }],
  ["Screen", function (p) { return oneOf_(p.screen, SCREENS); }],
  ["Feedback", function (p) { return p.feedback; }],
  ["Rating", function (p) { return rating_(p.rating); }],
  ["feedback_type", function (p) { return oneOf_(p.feedback_type, FEEDBACK_TYPES); }],
  ["tags", function (p) { return p.tags; }],
  ["scan_session_id", function (p) { return p.scan_session_id; }],
  ["dish_count", function (p) { return count_(p.dish_count); }],
  ["app_version", function (p) { return p.app_version; }],
  ["environment", function (p) { return oneOf_(p.environment, ENVIRONMENTS); }],
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // two testers submitting at once must not share a row
    var payload = {};
    try {
      payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    } catch (parseError) {
      payload = { feedback: String(e && e.postData && e.postData.contents) };
    }
    // JSON.parse happily returns null, numbers, strings and arrays.
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      payload = {};
    }

    var sheet = feedbackSheet_();
    var headers = ensureHeaders_(sheet);
    var row = headers.map(function (header) {
      for (var i = 0; i < COLUMNS.length; i++) {
        if (COLUMNS[i][0] === header) {
          return cell_(COLUMNS[i][1](payload));
        }
      }
      return ""; // a column someone added by hand — leave it blank
    });
    sheet.appendRow(row);

    return json_({ ok: true });
  } catch (error) {
    // Logged to Apps Script → Executions. Never returned: the caller is
    // anonymous, and error text can describe the sheet and the script.
    console.error("doPost failed: " + (error && error.stack ? error.stack : error));
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
 * Makes any value safe to write to a cell: Dates and finite numbers pass
 * through, everything else becomes a string, truncated, with a leading "'"
 * if it would otherwise be parsed as a formula. "'" is the sheet's own
 * "treat as plain text" marker and does not show in the cell.
 */
function cell_(value) {
  if (value === undefined || value === null) return "";
  if (value instanceof Date) return value;
  if (typeof value === "number") return isFinite(value) ? value : "";
  var text = (typeof value === "string" ? value : JSON.stringify(value)) || "";
  if (text.length > MAX_CELL_LENGTH) text = text.slice(0, MAX_CELL_LENGTH);
  if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
  return text;
}

/** The value if it is one of `allowed`; blank if missing; otherwise "other". */
function oneOf_(value, allowed) {
  if (value === undefined || value === null || value === "") return "";
  return allowed.indexOf(value) !== -1 ? value : "other";
}

/** An integer 1–5, else blank. The app sends "" when there is no rating. */
function rating_(value) {
  if (typeof value !== "number" && typeof value !== "string") return "";
  var n = Number(value);
  return value !== "" && n % 1 === 0 && n >= 1 && n <= 5 ? n : "";
}

/** A non-negative integer below 10,000 (no menu has more dishes), else blank. */
function count_(value) {
  if (typeof value !== "number" && typeof value !== "string") return "";
  var n = Number(value);
  return value !== "" && n % 1 === 0 && n >= 0 && n < 10000 ? n : "";
}

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(
    ContentService.MimeType.JSON
  );
}
