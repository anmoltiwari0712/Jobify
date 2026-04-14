// content.js – Multi-strategy form field detection and filling engine
// This is the heart of the extension. It uses layered detection to work across sites.

(() => {
  "use strict";

  // =========================================================================
  // FIELD MAPPING DICTIONARY
  // Maps profile keys to all known ways a form field might be identified.
  // Each entry has: labels (visible text), attributes (name/id/autocomplete),
  // and dataAutomation (for Workday-style sites).
  // =========================================================================
  const FIELD_MAP = {
    firstName: {
      labels: ["first name", "given name", "first", "fname", "prénom"],
      attributes: [
        "firstname", "first_name", "first-name", "fname", "given-name",
        "givenname", "given_name", "legalname-firstname",
        "candidatefirstname", "applicant_first_name"
      ],
      autocomplete: ["given-name"],
      dataAutomation: ["legalNameSection_firstName", "firstName"],
    },
    lastName: {
      labels: ["last name", "family name", "surname", "last", "lname"],
      attributes: [
        "lastname", "last_name", "last-name", "lname", "family-name",
        "familyname", "family_name", "surname", "legalname-lastname",
        "candidatelastname", "applicant_last_name"
      ],
      autocomplete: ["family-name"],
      dataAutomation: ["legalNameSection_lastName", "lastName"],
    },
    fullName: {
      labels: ["full name", "your name", "name", "applicant name"],
      attributes: [
        "fullname", "full_name", "full-name", "name", "your-name",
        "candidatename", "applicant_name"
      ],
      autocomplete: ["name"],
      dataAutomation: ["name"],
    },
    email: {
      labels: ["email", "email address", "e-mail", "e-mail address"],
      attributes: [
        "email", "emailaddress", "email_address", "email-address",
        "candidateemail", "applicant_email", "e-mail"
      ],
      autocomplete: ["email"],
      dataAutomation: ["email"],
      inputTypes: ["email"],
    },
    phone: {
      labels: ["phone", "phone number", "mobile", "mobile number", "cell", "telephone", "contact number"],
      attributes: [
        "phone", "phonenumber", "phone_number", "phone-number",
        "mobile", "mobilenumber", "mobile_number", "cell", "telephone",
        "tel", "candidatephone", "applicant_phone"
      ],
      autocomplete: ["tel"],
      dataAutomation: ["phone", "phoneNumber"],
      inputTypes: ["tel"],
    },
    address: {
      labels: ["address", "street address", "address line 1", "street"],
      attributes: [
        "address", "street", "address1", "address_line_1", "addressline1",
        "street-address", "streetaddress"
      ],
      autocomplete: ["street-address", "address-line1"],
      dataAutomation: ["addressSection_addressLine1"],
    },
    city: {
      labels: ["city", "town", "city/town"],
      attributes: [
        "city", "town", "locality", "address-level2",
        "addresscity", "address_city"
      ],
      autocomplete: ["address-level2"],
      dataAutomation: ["addressSection_city"],
    },
    state: {
      labels: ["state", "province", "region", "state/province"],
      attributes: [
        "state", "province", "region", "address-level1",
        "addressstate", "address_state"
      ],
      autocomplete: ["address-level1"],
      dataAutomation: ["addressSection_region"],
    },
    zip: {
      labels: ["zip", "zip code", "postal code", "postcode", "pin code", "pincode"],
      attributes: [
        "zip", "zipcode", "zip_code", "zip-code", "postal",
        "postalcode", "postal_code", "postal-code", "postcode", "pincode"
      ],
      autocomplete: ["postal-code"],
      dataAutomation: ["addressSection_postalCode"],
    },
    country: {
      labels: ["country", "country/region"],
      attributes: [
        "country", "countrycode", "country_code", "country-code",
        "countryregion", "country_region"
      ],
      autocomplete: ["country", "country-name"],
      dataAutomation: ["addressSection_country"],
    },
    linkedin: {
      labels: ["linkedin", "linkedin url", "linkedin profile", "linkedin profile url"],
      attributes: [
        "linkedin", "linkedinurl", "linkedin_url", "linkedin-url",
        "linkedin_profile", "linkedinprofile"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    website: {
      labels: ["website", "personal website", "portfolio", "portfolio url", "url", "personal url"],
      attributes: [
        "website", "url", "portfolio", "personalwebsite",
        "personal_website", "portfolio_url", "portfoliourl"
      ],
      autocomplete: ["url"],
      dataAutomation: [],
    },
    github: {
      labels: ["github", "github url", "github profile"],
      attributes: [
        "github", "githuburl", "github_url", "github-url",
        "githubprofile", "github_profile"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    currentCompany: {
      labels: ["current company", "current employer", "company", "employer", "organization"],
      attributes: [
        "company", "currentcompany", "current_company", "employer",
        "current_employer", "organization"
      ],
      autocomplete: ["organization"],
      dataAutomation: [],
    },
    currentTitle: {
      labels: ["current title", "job title", "title", "position", "current position", "designation"],
      attributes: [
        "title", "jobtitle", "job_title", "job-title", "currenttitle",
        "current_title", "position", "designation"
      ],
      autocomplete: ["organization-title"],
      dataAutomation: [],
    },
    salary: {
      labels: [
        "salary", "expected salary", "desired salary", "salary expectation",
        "current salary", "compensation"
      ],
      attributes: [
        "salary", "expectedsalary", "expected_salary", "desiredsalary",
        "desired_salary", "compensation", "current_salary"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    noticePeriod: {
      labels: ["notice period", "availability", "start date", "earliest start date"],
      attributes: [
        "noticeperiod", "notice_period", "notice-period",
        "availability", "startdate", "start_date"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    experience: {
      labels: [
        "years of experience", "total experience", "experience",
        "work experience", "professional experience"
      ],
      attributes: [
        "experience", "yearsofexperience", "years_of_experience",
        "totalexperience", "total_experience", "work_experience"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
  };

  // =========================================================================
  // STRATEGY 1: Attribute Matching
  // Checks name, id, autocomplete, data-automation-id, aria-label
  // =========================================================================
  function matchByAttributes(input) {
    const attrs = [
      (input.getAttribute("name") || "").toLowerCase().replace(/[\[\]{}().]/g, ""),
      (input.getAttribute("id") || "").toLowerCase(),
      (input.getAttribute("autocomplete") || "").toLowerCase(),
      (input.getAttribute("data-automation-id") || "").toLowerCase(),
      (input.getAttribute("aria-label") || "").toLowerCase(),
      (input.getAttribute("data-testid") || "").toLowerCase(),
      (input.getAttribute("data-field") || "").toLowerCase(),
      (input.getAttribute("placeholder") || "").toLowerCase(),
    ];

    for (const [profileKey, mapping] of Object.entries(FIELD_MAP)) {
      // Check autocomplete first (most reliable signal)
      const autoVal = input.getAttribute("autocomplete") || "";
      if (mapping.autocomplete && mapping.autocomplete.includes(autoVal.toLowerCase())) {
        return profileKey;
      }

      // Check data-automation-id (Workday)
      const daId = input.getAttribute("data-automation-id") || "";
      if (mapping.dataAutomation && mapping.dataAutomation.some(d => daId.includes(d))) {
        return profileKey;
      }

      // Check input type (e.g., type="email", type="tel")
      if (mapping.inputTypes && mapping.inputTypes.includes(input.type)) {
        return profileKey;
      }

      // Check all other attributes
      for (const attr of attrs) {
        if (!attr) continue;
        const normalized = attr.replace(/[^a-z0-9]/g, "");
        for (const candidate of mapping.attributes) {
          const normalizedCandidate = candidate.replace(/[^a-z0-9]/g, "");
          if (normalized === normalizedCandidate || normalized.includes(normalizedCandidate)) {
            return profileKey;
          }
        }
      }
    }
    return null;
  }

  // =========================================================================
  // STRATEGY 2: Label Matching
  // Finds the <label> element associated with the input and matches text
  // =========================================================================
  function matchByLabel(input) {
    let labelText = "";

    // Method A: <label for="inputId">
    if (input.id) {
      const label = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
      if (label) labelText = label.textContent.trim().toLowerCase();
    }

    // Method B: Input inside a <label>
    if (!labelText) {
      const parentLabel = input.closest("label");
      if (parentLabel) labelText = parentLabel.textContent.trim().toLowerCase();
    }

    // Method C: aria-labelledby
    if (!labelText) {
      const ariaLabelledBy = input.getAttribute("aria-labelledby");
      if (ariaLabelledBy) {
        const labelEl = document.getElementById(ariaLabelledBy);
        if (labelEl) labelText = labelEl.textContent.trim().toLowerCase();
      }
    }

    // Method D: Preceding sibling or parent's text (common in custom forms)
    if (!labelText) {
      const parent = input.parentElement;
      if (parent) {
        // Check for a preceding label-like element
        const prev = input.previousElementSibling;
        if (prev && ["LABEL", "SPAN", "DIV", "P"].includes(prev.tagName)) {
          labelText = prev.textContent.trim().toLowerCase();
        }
        // Check parent's direct text (not children's text)
        if (!labelText && parent.childNodes.length <= 4) {
          const directText = Array.from(parent.childNodes)
            .filter(n => n.nodeType === 3)
            .map(n => n.textContent.trim())
            .join(" ")
            .toLowerCase();
          if (directText.length > 1 && directText.length < 60) {
            labelText = directText;
          }
        }
      }
    }

    if (!labelText) return null;

    // Clean common suffixes
    labelText = labelText.replace(/\s*\*\s*$/, "").replace(/\s*\(required\)\s*/i, "").trim();

    for (const [profileKey, mapping] of Object.entries(FIELD_MAP)) {
      for (const label of mapping.labels) {
        if (labelText === label || labelText.startsWith(label + " ") || labelText.endsWith(" " + label)) {
          return profileKey;
        }
      }
    }

    // Fuzzy: check if any label keyword is contained
    for (const [profileKey, mapping] of Object.entries(FIELD_MAP)) {
      for (const label of mapping.labels) {
        if (label.split(" ").length >= 2 && labelText.includes(label)) {
          return profileKey;
        }
      }
    }

    return null;
  }

  // =========================================================================
  // STRATEGY 3: Placeholder Matching
  // =========================================================================
  function matchByPlaceholder(input) {
    const placeholder = (input.getAttribute("placeholder") || "").toLowerCase().trim();
    if (!placeholder) return null;

    for (const [profileKey, mapping] of Object.entries(FIELD_MAP)) {
      for (const label of mapping.labels) {
        if (placeholder.includes(label)) {
          return profileKey;
        }
      }
      for (const attr of mapping.attributes) {
        if (placeholder.replace(/[^a-z0-9]/g, "").includes(attr.replace(/[^a-z0-9]/g, ""))) {
          return profileKey;
        }
      }
    }
    return null;
  }

  // =========================================================================
  // STRATEGY 4: Context Matching (surrounding DOM structure)
  // For tricky cases where the field itself has no useful attributes
  // =========================================================================
  function matchByContext(input) {
    // Walk up 3 levels and check for class names or text
    let el = input;
    for (let i = 0; i < 3 && el.parentElement; i++) {
      el = el.parentElement;
      const className = (el.className || "").toString().toLowerCase();
      const text = el.textContent.trim().toLowerCase().slice(0, 100);

      for (const [profileKey, mapping] of Object.entries(FIELD_MAP)) {
        for (const label of mapping.labels) {
          if (className.includes(label.replace(/\s/g, "")) || className.includes(label.replace(/\s/g, "-"))) {
            return profileKey;
          }
        }
        // Only match on text if this container is small (to avoid false positives)
        if (text.length < 50) {
          for (const label of mapping.labels) {
            if (text.includes(label)) {
              return profileKey;
            }
          }
        }
      }
    }
    return null;
  }

  // =========================================================================
  // MASTER FIELD DETECTOR – Runs all strategies with priority
  // =========================================================================
  function detectField(input) {
    // Priority order: attributes → label → placeholder → context
    return matchByAttributes(input)
      || matchByLabel(input)
      || matchByPlaceholder(input)
      || matchByContext(input);
  }

  // =========================================================================
  // FORM FILLER – Sets values and triggers proper events
  // =========================================================================
  function setFieldValue(input, value) {
    if (!value) return false;

    const tag = input.tagName.toLowerCase();
    const type = (input.getAttribute("type") || "text").toLowerCase();

    // Skip hidden, submit, button, file fields
    if (["hidden", "submit", "button", "file", "image"].includes(type)) return false;

    if (tag === "select") {
      return setSelectValue(input, value);
    }

    if (type === "checkbox" || type === "radio") {
      return false; // Skip for now – these need special handling
    }

    // Text-like input or textarea
    const nativeInputValueSetter =
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set
      || Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;

    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(input, value);
    } else {
      input.value = value;
    }

    // Dispatch events in the right order to trigger React/Vue/Angular handlers
    input.dispatchEvent(new Event("focus", { bubbles: true }));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new Event("blur", { bubbles: true }));

    // Also dispatch keyboard events for frameworks that listen to those
    input.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));

    return true;
  }

  function setSelectValue(select, value) {
    const options = Array.from(select.options);
    const valueLower = value.toLowerCase().trim();

    // Try exact match first
    let match = options.find(o => o.value.toLowerCase() === valueLower || o.text.toLowerCase().trim() === valueLower);

    // Try contains match
    if (!match) {
      match = options.find(o => o.text.toLowerCase().includes(valueLower) || valueLower.includes(o.text.toLowerCase().trim()));
    }

    // Try fuzzy for countries (US, USA, United States, etc.)
    if (!match) {
      const fuzzyMap = {
        "united states": ["us", "usa", "united states of america", "u.s.", "u.s.a."],
        "united kingdom": ["uk", "gb", "great britain", "u.k."],
        "india": ["in", "ind"],
      };
      for (const [canonical, aliases] of Object.entries(fuzzyMap)) {
        if (aliases.includes(valueLower) || valueLower === canonical) {
          match = options.find(o => {
            const t = o.text.toLowerCase().trim();
            const v = o.value.toLowerCase().trim();
            return t === canonical || aliases.includes(v) || aliases.includes(t);
          });
          if (match) break;
        }
      }
    }

    if (match) {
      select.value = match.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      select.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    }

    return false;
  }

  // =========================================================================
  // FIELD SCANNER – Finds all fillable fields on the page
  // =========================================================================
  function getAllInputs() {
    const inputs = [];
    const selectors = [
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="file"]):not([type="image"]):not([type="reset"])',
      "textarea",
      "select",
      '[contenteditable="true"]',
      '[role="textbox"]',
      '[role="combobox"]',
    ];

    // Main document
    document.querySelectorAll(selectors.join(", ")).forEach(el => inputs.push(el));

    // Check iframes (same-origin only)
    try {
      document.querySelectorAll("iframe").forEach(iframe => {
        try {
          const doc = iframe.contentDocument || iframe.contentWindow?.document;
          if (doc) {
            doc.querySelectorAll(selectors.join(", ")).forEach(el => inputs.push(el));
          }
        } catch (e) {
          // Cross-origin iframe, skip
        }
      });
    } catch (e) {}

    // Check shadow DOMs
    function searchShadow(root) {
      root.querySelectorAll("*").forEach(el => {
        if (el.shadowRoot) {
          el.shadowRoot.querySelectorAll(selectors.join(", ")).forEach(inp => inputs.push(inp));
          searchShadow(el.shadowRoot);
        }
      });
    }
    searchShadow(document);

    // Filter out invisible fields
    return inputs.filter(el => {
      const style = window.getComputedStyle(el);
      return style.display !== "none" && style.visibility !== "hidden" && el.offsetParent !== null;
    });
  }

  // =========================================================================
  // COMPOSITE VALUE BUILDER – Handles fullName from first+last, etc.
  // =========================================================================
  function getProfileValue(profileKey, profile) {
    // Direct match
    if (profile[profileKey] !== undefined && profile[profileKey] !== "") {
      return profile[profileKey];
    }

    // Composite: fullName from first + last
    if (profileKey === "fullName" && profile.firstName && profile.lastName) {
      return `${profile.firstName} ${profile.lastName}`;
    }

    return null;
  }

  // =========================================================================
  // MESSAGE HANDLER – Responds to popup commands
  // =========================================================================
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "fillForm") {
      const profile = message.profile;
      const inputs = getAllInputs();
      let filledCount = 0;
      const details = [];

      for (const input of inputs) {
        const profileKey = detectField(input);
        if (profileKey) {
          const value = getProfileValue(profileKey, profile);
          if (value) {
            const success = setFieldValue(input, value);
            if (success) {
              filledCount++;
              // Highlight filled field briefly
              const originalBg = input.style.backgroundColor;
              input.style.backgroundColor = "#d4f5d4";
              input.style.transition = "background-color 0.3s";
              setTimeout(() => {
                input.style.backgroundColor = originalBg;
              }, 1500);
              details.push({ field: profileKey, status: "filled" });
            }
          }
        }
      }

      sendResponse({ success: true, filled: filledCount, total: inputs.length, details });
    }

    if (message.action === "scanForm") {
      const inputs = getAllInputs();
      const fields = [];

      for (const input of inputs) {
        const profileKey = detectField(input);
        fields.push({
          tag: input.tagName.toLowerCase(),
          type: input.type || "",
          name: input.name || "",
          id: input.id || "",
          placeholder: input.placeholder || "",
          matched: profileKey || null,
        });
      }

      sendResponse({ fields, total: inputs.length });
    }

    return true;
  });

  // Log that content script is ready
  console.log("[JobFill] Content script loaded and ready.");
})();
 