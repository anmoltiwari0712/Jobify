# JobFill

JobFill is a Chrome extension that stores a local job-application profile and uses it to auto-fill application forms. It is built to detect common field patterns used by job platforms such as Workday, Greenhouse, Lever-style forms, and custom ATS pages.

## Current Scope

The popup supports profile data for:

- Personal information
- Address
- Identity documents
- Education
- Professional details
- Links and social profiles
- EEO / diversity fields

The extension intentionally stores data locally in Chrome extension storage. It does not send profile data to a server.

## Files

- `manifest.json`: Chrome extension configuration.
- `popup.html`: Extension popup UI.
- `popup.js`: Profile storage, popup tabs, section expand/collapse, import/export, scan/fill triggers.
- `content.js`: Form detection and autofill engine injected into pages.
- `background.js`: Message bridge between the popup and active tab.
- `test-page.html`: Smaller form-detection test page.
- `ats-test-page.html`: Larger ATS-style test page with Workday/Greenhouse-like field patterns.
- `icons/`: Extension icons used by Chrome.

## Setup In Chrome

1. Open Chrome.
2. Go to `chrome://extensions`.
3. Turn on `Developer mode`.
4. Click `Load unpacked`.
5. Select this project folder: `Jobify`.
6. Pin the JobFill extension from the extensions menu.

When you make code changes, return to `chrome://extensions` and click the reload button on the JobFill card.

## Basic Usage

1. Open the JobFill extension popup.
2. Fill out fields in the `Profile` tab.
3. Expand sections as needed.
4. The profile auto-saves while you type.
5. Open a job application page in the active tab.
6. Open the JobFill popup and go to `Fill Page`.
7. Click `Scan Page Fields` to inspect detected fields.
8. Click `Auto-Fill This Page`.
9. Review the page before submitting anything.

## Import And Export

Use the `Settings` tab in the popup:

- `Export`: downloads the saved profile as `jobfill-profile.json`.
- `Import`: loads a previously exported JSON profile.
- `Clear`: deletes the saved local profile.

## Local Test Pages

You can test the extension without using a real job site.

Start a local server from this folder:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000/test-page.html
```

or:

```text
http://localhost:8000/ats-test-page.html
```

`test-page.html` is a smaller sanity check.

`ats-test-page.html` is better for deeper testing. It includes:

- Workday-style `data-automation-id` fields.
- Greenhouse-style nested field names.
- Label-based fields.
- Placeholder-based fields.
- `aria-label` fields.
- Generated/nested names such as `cards[address][field0]`.
- A `Show Filled Values` button to inspect what was filled.

## Testing Checklist

Please test these flows:

- Popup opens correctly.
- Profile sections expand and collapse.
- Profile values auto-save after typing.
- Saved values still appear after closing and reopening the popup.
- Export downloads valid JSON.
- Import restores values correctly.
- Clear removes saved values.
- `Scan Page Fields` returns useful matches on the test pages.
- `Auto-Fill This Page` fills the correct fields.
- Country/select fields choose the expected option when possible.
- The extension does not fill hidden, submit, file, reset, or button fields.
- The page remains usable after autofill.

## Bug Report Template

When reporting bugs, include:

- Page URL or test page used.
- Browser and operating system.
- Steps to reproduce.
- Expected result.
- Actual result.
- Screenshot or screen recording, if possible.
- Whether `Scan Page Fields` detected the field.
- Field label/name/id/placeholder if a specific field failed.

Example:

```text
Page: http://localhost:8000/ats-test-page.html
Browser: Chrome
Steps:
1. Fill profile first name as John.
2. Open ATS test page.
3. Click Auto-Fill This Page.

Expected:
Legal First Name fills with John.

Actual:
Field stays blank.

Scan result:
Field detected as firstName / not detected.
```

## Known Notes

- Reload the extension after code changes.
- Refresh the test page after reloading the extension.
- Some real ATS pages use iframes, shadow DOM, delayed rendering, or custom React controls. These are important areas to test.
- Always review filled data before submitting a real application.
