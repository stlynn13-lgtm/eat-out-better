# Feedback sheet script

`Code.gs` receives the in-app feedback and writes it to the **Feedback Form** Google Sheet. It used to live only
inside the sheet, which is why the six fields the app has sent since build 9 (`feedback_type`, `tags`,
`scan_session_id`, `dish_count`, `app_version`, `environment`) were arriving and being thrown away. This folder
is now the source of truth.

## Install / update it (5 minutes)

Do this signed in as **eatoutbetter@gmail.com**, which owns the sheet.

1. Open the **Feedback Form** sheet → **Extensions → Apps Script**.
2. Select everything in `Code.gs` and replace it with the contents of this folder's `Code.gs`. **Save** (⌘S).
3. In the function menu at the top, choose **`setupHeaders`** → **Run**. If Google asks, approve access to the
   spreadsheet. Six new column headers appear in the sheet.
4. **Deploy → Manage deployments** → the pencil icon on the **existing** Web app deployment → **Version: New
   version** → **Deploy**.
   - **Not "New deployment."** That makes a new URL, and the app would keep posting to the old one.
   - Keep "Execute as: Me" and "Who has access: Anyone" as they are.
5. Send feedback from the app (both the ★ prompt after a scan and the Feedback link). Each should add one row
   with all eleven columns filled where relevant.

Columns are matched by header name, so reordering the sheet is safe. To capture a new field later, add one line
to `COLUMNS` and repeat steps 2 and 4.
