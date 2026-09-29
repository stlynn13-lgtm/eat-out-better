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
 */

var COLUMNS = [
  // [header in the sheet, how to read it from the request]
  ["Timestamp", function () { return new Date(); }],
  ["User ID", function (p) { return p.posthog_distinct_id; }],
  ["Screen", function (p) { return p.screen; }],
  ["Feedback", function (p) { return p.feedback; }],
  ["Rating", function (p) { return p.rating; }],
  ["feedback_type", function (p) { return p.feedback_type; }],
  ["tags", function (p) { return p.tags; }],
  ["scan_session_id", function (p) { return p.scan_session_id; }],
  ["dish_count", function (p) { return p.dish_count; }],
  ["app_version", function (p) { return p.app_version; }],
  ["environment", function (p) { return p.environment; }],
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
    return json_({ ok: false, error: String(error) });
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

function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(
    ContentService.MimeType.JSON
  );
}
