// popup.js – Profile management, form filling trigger, and scan functionality

(() => {
  "use strict";

  // Profile field IDs (must match both popup inputs and content script FIELD_MAP keys)
  const PROFILE_FIELDS = [
    "firstName", "lastName", "email", "phone", "country",
    "address", "city", "state", "zip",
    "currentCompany", "currentTitle", "experience", "salary", "noticePeriod",
    "linkedin", "website", "github"
  ];

  const STORAGE_KEY = "jobfill_profile";

  // =========================================================================
  // PROFILE STORAGE
  // =========================================================================
  function loadProfile() {
    chrome.storage.local.get(STORAGE_KEY, (result) => {
      const profile = result[STORAGE_KEY] || {};
      for (const field of PROFILE_FIELDS) {
        const input = document.getElementById(field);
        if (input && profile[field]) {
          input.value = profile[field];
        }
      }
    });
  }

  function saveProfile() {
    const profile = {};
    for (const field of PROFILE_FIELDS) {
      const input = document.getElementById(field);
      if (input) {
        profile[field] = input.value.trim();
      }
    }
    chrome.storage.local.set({ [STORAGE_KEY]: profile }, () => {
      showSaveIndicator();
    });
    return profile;
  }

  function getProfile() {
    return new Promise((resolve) => {
      chrome.storage.local.get(STORAGE_KEY, (result) => {
        resolve(result[STORAGE_KEY] || {});
      });
    });
  }

  // Auto-save on every field change
  function setupAutoSave() {
    for (const field of PROFILE_FIELDS) {
      const input = document.getElementById(field);
      if (input) {
        input.addEventListener("input", debounce(saveProfile, 500));
      }
    }
  }

  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function showSaveIndicator() {
    const indicator = document.getElementById("saveIndicator");
    indicator.classList.add("show");
    setTimeout(() => indicator.classList.remove("show"), 1500);
  }

  // =========================================================================
  // TAB SWITCHING
  // =========================================================================
  function setupTabs() {
    const tabs = document.querySelectorAll(".tab");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));

        tab.classList.add("active");
        const panelId = `panel-${tab.dataset.tab}`;
        document.getElementById(panelId).classList.add("active");
      });
    });
  }

  // =========================================================================
  // FILL FORM
  // =========================================================================
  function setupFillButton() {
    document.getElementById("btnFill").addEventListener("click", async () => {
      const profile = await getProfile();
      const filledFields = Object.values(profile).filter(v => v).length;

      if (filledFields === 0) {
        showStatus("warning", "⚠️", "No profile data. Fill in your profile first.");
        return;
      }

      const btn = document.getElementById("btnFill");
      btn.textContent = "Filling...";
      btn.disabled = true;

      chrome.runtime.sendMessage(
        { action: "fillForm", profile },
        (response) => {
          btn.disabled = false;
          btn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            Auto-Fill This Page
          `;

          if (chrome.runtime.lastError) {
            showStatus("error", "✗", "Could not reach page. Try refreshing.");
            return;
          }

          if (response && response.filled > 0) {
            showStatus("success", "✓", `Filled ${response.filled} of ${response.total} fields`);
          } else if (response && response.total > 0) {
            showStatus("warning", "⚠️", `Found ${response.total} fields but no matches. Try scanning to debug.`);
          } else {
            showStatus("warning", "⚠️", "No form fields found on this page.");
          }
        }
      );
    });
  }

  // =========================================================================
  // SCAN FORM
  // =========================================================================
  function setupScanButton() {
    document.getElementById("btnScan").addEventListener("click", () => {
      chrome.runtime.sendMessage({ action: "scanForm" }, (response) => {
        if (chrome.runtime.lastError || !response) {
          showStatus("error", "✗", "Could not scan page. Try refreshing.");
          return;
        }

        const container = document.getElementById("scanResults");
        container.innerHTML = "";
        container.classList.add("show");

        if (response.fields.length === 0) {
          container.innerHTML = '<div style="color: var(--text-muted); font-size: 12px; padding: 8px 0;">No form fields found on this page.</div>';
          return;
        }

        const title = document.createElement("div");
        title.className = "section-title";
        title.textContent = `${response.fields.length} fields detected`;
        container.appendChild(title);

        for (const field of response.fields) {
          const item = document.createElement("div");
          item.className = "scan-item";

          const fieldId = field.name || field.id || field.placeholder || `<${field.tag}>`;

          item.innerHTML = `
            <span class="scan-field-name">${escapeHtml(fieldId)}</span>
            <span class="scan-match ${field.matched ? "matched" : "unmatched"}">
              ${field.matched ? `→ ${field.matched}` : "No match"}
            </span>
          `;
          container.appendChild(item);
        }
      });
    });
  }

  // =========================================================================
  // SETTINGS
  // =========================================================================
  function setupSettings() {
    // Export
    document.getElementById("btnExport").addEventListener("click", async () => {
      const profile = await getProfile();
      const blob = new Blob([JSON.stringify(profile, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "jobfill-profile.json";
      a.click();
      URL.revokeObjectURL(url);
    });

    // Import
    document.getElementById("btnImport").addEventListener("click", () => {
      document.getElementById("importFile").click();
    });

    document.getElementById("importFile").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const profile = JSON.parse(event.target.result);
          chrome.storage.local.set({ [STORAGE_KEY]: profile }, () => {
            loadProfile();
            showStatus("success", "✓", "Profile imported successfully");
          });
        } catch (err) {
          showStatus("error", "✗", "Invalid JSON file");
        }
      };
      reader.readAsText(file);
    });

    // Clear
    document.getElementById("btnClear").addEventListener("click", () => {
      if (confirm("Delete all saved profile data? This cannot be undone.")) {
        chrome.storage.local.remove(STORAGE_KEY, () => {
          for (const field of PROFILE_FIELDS) {
            const input = document.getElementById(field);
            if (input) input.value = "";
          }
          showStatus("success", "✓", "All data cleared");
        });
      }
    });
  }

  // =========================================================================
  // UTILITIES
  // =========================================================================
  function showStatus(type, icon, message) {
    const status = document.getElementById("fillStatus");
    status.className = `status show ${type}`;
    status.innerHTML = `<span class="status-icon">${icon}</span><span>${message}</span>`;
    setTimeout(() => status.classList.remove("show"), 4000);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // =========================================================================
  // INIT
  // =========================================================================
  document.addEventListener("DOMContentLoaded", () => {
    loadProfile();
    setupAutoSave();
    setupTabs();
    setupFillButton();
    setupScanButton();
    setupSettings();
  });
})();
 