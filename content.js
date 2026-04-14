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
    // =========================== PERSONAL INFO ===========================
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
    middleName: {
      labels: ["middle name", "middle initial", "middle"],
      attributes: [
        "middlename", "middle_name", "middle-name", "middleinitial",
        "middle_initial"
      ],
      autocomplete: ["additional-name"],
      dataAutomation: ["legalNameSection_middleName"],
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
    altPhone: {
      labels: ["alternate phone", "alternative phone", "secondary phone", "home phone", "landline"],
      attributes: [
        "altphone", "alt_phone", "alternatephone", "alternate_phone",
        "secondaryphone", "secondary_phone", "homephone", "home_phone", "landline"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    dob: {
      labels: ["date of birth", "dob", "birth date", "birthday"],
      attributes: [
        "dob", "dateofbirth", "date_of_birth", "date-of-birth",
        "birthdate", "birth_date", "birthday"
      ],
      autocomplete: ["bday"],
      dataAutomation: ["dateOfBirth"],
    },
    gender: {
      labels: ["gender", "sex"],
      attributes: ["gender", "sex", "genderidentity", "gender_identity"],
      autocomplete: ["sex"],
      dataAutomation: ["gender"],
    },
    maritalStatus: {
      labels: ["marital status", "martial status"],
      attributes: [
        "maritalstatus", "marital_status", "marital-status",
        "martialstatus"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    nationality: {
      labels: ["nationality", "citizenship"],
      attributes: [
        "nationality", "citizenship", "citizenshipstatus",
        "citizenship_status"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    fatherName: {
      labels: ["father's name", "father name", "fathers name"],
      attributes: [
        "fathername", "father_name", "father-name", "fathersname",
        "fathers_name"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    motherName: {
      labels: ["mother's name", "mother name", "mothers name"],
      attributes: [
        "mothername", "mother_name", "mother-name", "mothersname",
        "mothers_name"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    languages: {
      labels: ["languages", "languages known", "language proficiency"],
      attributes: [
        "languages", "languagesknown", "languages_known", "languageproficiency",
        "language_proficiency"
      ],
      autocomplete: [],
      dataAutomation: [],
    },



    // =========================== ADDRESS ===========================
    address: {
      labels: ["address", "street address", "address line 1", "street", "permanent address", "residential address"],
      attributes: [
        "address", "street", "address1", "address_line_1", "addressline1",
        "street-address", "streetaddress", "permanentaddress", "permanent_address",
        "residentialaddress"
      ],
      autocomplete: ["street-address", "address-line1"],
      dataAutomation: ["addressSection_addressLine1"],
    },
    addressLine2: {
      labels: ["address line 2", "apt", "suite", "apartment", "flat"],
      attributes: [
        "address2", "addressline2", "address_line_2", "address-line2",
        "apt", "suite", "apartment", "flat", "unit"
      ],
      autocomplete: ["address-line2"],
      dataAutomation: ["addressSection_addressLine2"],
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



    // =========================== IDENTITY DOCUMENTS ===========================
    panNumber: {
      labels: ["pan", "pan number", "pan card", "pan card number", "permanent account number"],
      attributes: [
        "pan", "pannumber", "pan_number", "pan-number", "pancard",
        "pan_card", "permanentaccountnumber"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    aadharNumber: {
      labels: ["aadhar", "aadhaar", "aadhar number", "aadhaar number", "aadhar card", "uid"],
      attributes: [
        "aadhar", "aadhaar", "aadharnumber", "aadhar_number", "aadhaarnumber",
        "aadhaar_number", "uid", "uidnumber"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    passportNumber: {
      labels: ["passport", "passport number", "passport no"],
      attributes: [
        "passport", "passportnumber", "passport_number", "passport-number",
        "passportno", "passport_no"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    ssn: {
      labels: ["ssn", "social security", "social security number"],
      attributes: [
        "ssn", "socialsecurity", "social_security", "social-security",
        "socialsecuritynumber", "social_security_number"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    drivingLicense: {
      labels: ["driving license", "driver's license", "driving licence", "dl number", "license number"],
      attributes: [
        "drivinglicense", "driving_license", "driverslicense", "drivers_license",
        "drivinglicence", "dlnumber", "dl_number", "licensenumber", "license_number"
      ],
      autocomplete: [],
      dataAutomation: [],
    },



    // =========================== EDUCATION ===========================
    highestQualification: {
      labels: ["highest qualification", "highest degree", "highest education", "qualification"],
      attributes: [
        "highestqualification", "highest_qualification", "highestdegree",
        "highest_degree", "highesteducation", "qualification"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    tenthSchool: {
      labels: ["10th school", "sslc school", "10th school name", "high school name", "secondary school"],
      attributes: [
        "tenthschool", "tenth_school", "sslcschool", "sslc_school",
        "highschoolname", "secondary_school", "10thschool"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    tenthBoard: {
      labels: ["10th board", "sslc board", "10th board of education", "secondary board"],
      attributes: [
        "tenthboard", "tenth_board", "sslcboard", "sslc_board",
        "10thboard", "secondaryboard", "secondary_board"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    tenthPercentage: {
      labels: [
        "10th percentage", "10th marks", "10th cgpa", "10th gpa", "sslc percentage",
        "sslc marks", "class 10 percentage", "class x percentage", "10th grade",
        "10th score", "secondary percentage", "high school percentage"
      ],
      attributes: [
        "tenthpercentage", "tenth_percentage", "10thpercentage", "10th_percentage",
        "sslcpercentage", "sslc_percentage", "sslcmarks", "sslc_marks",
        "tenthmarks", "tenth_marks", "class10percentage", "classx",
        "secondarypercentage", "highschoolpercentage"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    tenthYear: {
      labels: ["10th year of passing", "10th passing year", "sslc year", "class 10 year"],
      attributes: [
        "tenthyear", "tenth_year", "10thyear", "10th_year",
        "sslcyear", "sslc_year", "tenthpassingyear", "tenth_passing_year"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    twelfthSchool: {
      labels: ["12th school", "hsc school", "12th school name", "senior secondary school", "intermediate college"],
      attributes: [
        "twelfthschool", "twelfth_school", "hscschool", "hsc_school",
        "12thschool", "seniorsecondaryschool", "intermediatecollege"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    twelfthBoard: {
      labels: ["12th board", "hsc board", "12th board of education", "senior secondary board"],
      attributes: [
        "twelfthboard", "twelfth_board", "hscboard", "hsc_board",
        "12thboard", "seniorsecondaryboard"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    twelfthPercentage: {
      labels: [
        "12th percentage", "12th marks", "12th cgpa", "12th gpa", "hsc percentage",
        "hsc marks", "class 12 percentage", "class xii percentage", "12th grade",
        "12th score", "senior secondary percentage", "intermediate percentage",
        "plus two percentage", "+2 percentage"
      ],
      attributes: [
        "twelfthpercentage", "twelfth_percentage", "12thpercentage", "12th_percentage",
        "hscpercentage", "hsc_percentage", "hscmarks", "hsc_marks",
        "twelfthmarks", "twelfth_marks", "class12percentage", "classxii",
        "seniorsecondarypercentage", "intermediatepercentage", "plustwo"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    twelfthYear: {
      labels: ["12th year of passing", "12th passing year", "hsc year", "class 12 year"],
      attributes: [
        "twelfthyear", "twelfth_year", "12thyear", "12th_year",
        "hscyear", "hsc_year", "twelfthpassingyear", "twelfth_passing_year"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    twelfthStream: {
      labels: ["12th stream", "12th specialization", "hsc stream", "stream", "12th group"],
      attributes: [
        "twelfthstream", "twelfth_stream", "12thstream", "hscstream",
        "hsc_stream", "stream", "12thgroup"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    ugDegree: {
      labels: [
        "ug degree", "undergraduate degree", "bachelor's degree", "bachelors degree",
        "degree", "graduation", "ug course"
      ],
      attributes: [
        "ugdegree", "ug_degree", "undergraddegree", "undergrad_degree",
        "bachelorsdegree", "bachelors_degree", "degree", "graduation",
        "ugcourse", "ug_course"
      ],
      autocomplete: [],
      dataAutomation: ["formField-degree"],
    },
    ugSpecialization: {
      labels: [
        "ug specialization", "ug major", "major", "specialization",
        "branch", "department", "field of study", "ug branch"
      ],
      attributes: [
        "ugspecialization", "ug_specialization", "ugmajor", "ug_major",
        "major", "specialization", "branch", "department", "fieldofstudy",
        "field_of_study", "ugbranch", "ug_branch"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    ugCollege: {
      labels: [
        "ug college", "college name", "university name", "college",
        "university", "institution", "ug institution", "school or university",
        "school/university"
      ],
      attributes: [
        "ugcollege", "ug_college", "collegename", "college_name",
        "universityname", "university_name", "college", "university",
        "institution", "uginstitution", "schoolname", "school_name"
      ],
      autocomplete: [],
      dataAutomation: ["formField-schoolName"],
    },
    ugPercentage: {
      labels: [
        "ug percentage", "ug cgpa", "ug gpa", "graduation percentage",
        "degree percentage", "college cgpa", "college gpa", "undergraduate gpa",
        "ug marks", "bachelor's gpa", "overall result", "overall result gpa",
        "grade average", "gpa"
      ],
      attributes: [
        "ugpercentage", "ug_percentage", "ugcgpa", "ug_cgpa", "uggpa",
        "ug_gpa", "graduationpercentage", "graduation_percentage",
        "degreepercentage", "collegecgpa", "college_cgpa",
        "undergraduategpa", "ugmarks", "gradeaverage", "grade_average"
      ],
      autocomplete: [],
      dataAutomation: ["formField-gradeAverage"],
    },
    ugYear: {
      labels: [
        "ug year of passing", "ug passing year", "graduation year",
        "year of graduation", "college year", "ug completion year"
      ],
      attributes: [
        "ugyear", "ug_year", "ugpassingyear", "ug_passing_year",
        "graduationyear", "graduation_year", "yearofgraduation",
        "collegeyear", "ugcompletionyear"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    pgDegree: {
      labels: [
        "pg degree", "postgraduate degree", "master's degree", "masters degree",
        "pg course", "postgraduation"
      ],
      attributes: [
        "pgdegree", "pg_degree", "postgraddegree", "postgrad_degree",
        "mastersdegree", "masters_degree", "pgcourse", "pg_course",
        "postgraduation"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    pgSpecialization: {
      labels: [
        "pg specialization", "pg major", "pg branch", "masters specialization",
        "postgraduate specialization"
      ],
      attributes: [
        "pgspecialization", "pg_specialization", "pgmajor", "pg_major",
        "pgbranch", "pg_branch", "mastersspecialization",
        "postgraduatespecialization"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    pgCollege: {
      labels: ["pg college", "pg university", "pg institution", "masters college"],
      attributes: [
        "pgcollege", "pg_college", "pguniversity", "pg_university",
        "pginstitution", "pg_institution", "masterscollege"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    pgPercentage: {
      labels: [
        "pg percentage", "pg cgpa", "pg gpa", "masters percentage",
        "masters cgpa", "postgraduate gpa", "pg marks"
      ],
      attributes: [
        "pgpercentage", "pg_percentage", "pgcgpa", "pg_cgpa", "pggpa",
        "pg_gpa", "masterspercentage", "masterscgpa", "postgraduategpa",
        "pgmarks"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    pgYear: {
      labels: [
        "pg year of passing", "pg passing year", "pg completion year",
        "masters year", "postgraduation year"
      ],
      attributes: [
        "pgyear", "pg_year", "pgpassingyear", "pg_passing_year",
        "pgcompletionyear", "mastersyear", "postgraduationyear"
      ],
      autocomplete: [],
      dataAutomation: [],
    },



    // =========================== PROFESSIONAL ===========================
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
    experience: {
      labels: [
        "years of experience", "total experience", "experience",
        "professional experience"
      ],
      attributes: [
        "experience", "yearsofexperience", "years_of_experience",
        "totalexperience", "total_experience"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    currentCTC: {
      labels: [
        "current ctc", "current salary", "present salary", "current compensation",
        "current annual salary", "ctc"
      ],
      attributes: [
        "currentctc", "current_ctc", "currentsalary", "current_salary",
        "presentsalary", "present_salary", "currentcompensation", "ctc"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    expectedCTC: {
      labels: [
        "expected ctc", "expected salary", "desired salary", "salary expectation",
        "expected compensation", "desired ctc"
      ],
      attributes: [
        "expectedctc", "expected_ctc", "expectedsalary", "expected_salary",
        "desiredsalary", "desired_salary", "salaryexpectation",
        "expectedcompensation", "desiredctc"
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
    skills: {
      labels: ["skills", "key skills", "technical skills", "skill set", "competencies"],
      attributes: [
        "skills", "keyskills", "key_skills", "technicalskills",
        "technical_skills", "skillset", "skill_set", "competencies"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    preferredLocation: {
      labels: ["preferred location", "preferred work location", "desired location", "work location preference"],
      attributes: [
        "preferredlocation", "preferred_location", "desiredlocation",
        "desired_location", "worklocation", "work_location",
        "locationpreference", "location_preference"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    previousCompany: {
      labels: ["previous company", "last company", "previous employer", "last employer"],
      attributes: [
        "previouscompany", "previous_company", "lastcompany", "last_company",
        "previousemployer", "previous_employer", "lastemployer"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    previousTitle: {
      labels: ["previous title", "last title", "previous designation", "previous position"],
      attributes: [
        "previoustitle", "previous_title", "lasttitle", "last_title",
        "previousdesignation", "previousposition"
      ],
      autocomplete: [],
      dataAutomation: [],
    },



    // =========================== LINKS ===========================
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
    twitter: {
      labels: ["twitter", "twitter url", "x profile", "twitter handle"],
      attributes: [
        "twitter", "twitterurl", "twitter_url", "twitter-url",
        "twitterhandle", "twitter_handle", "xprofile"
      ],
      autocomplete: [],
      dataAutomation: [],
    },



    // =========================== EEO / DIVERSITY ===========================
    race: {
      labels: ["race", "race/ethnicity", "ethnicity"],
      attributes: [
        "race", "ethnicity", "raceethnicity", "race_ethnicity"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    veteranStatus: {
      labels: ["veteran status", "veteran", "protected veteran"],
      attributes: [
        "veteranstatus", "veteran_status", "veteran", "protectedveteran"
      ],
      autocomplete: [],
      dataAutomation: [],
    },
    disabilityStatus: {
      labels: ["disability", "disability status", "do you have a disability"],
      attributes: [
        "disability", "disabilitystatus", "disability_status"
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
    const automationHost = input.closest?.("[data-automation-id], [data-fkit-id]");
    const hostAutomationId = (automationHost?.getAttribute("data-automation-id") || "").toLowerCase();
    const hostFkitId = (automationHost?.getAttribute("data-fkit-id") || "").toLowerCase();
    const attrs = [
      (input.getAttribute("name") || "").toLowerCase().replace(/[\[\]{}().]/g, ""),
      (input.getAttribute("id") || "").toLowerCase(),
      (input.getAttribute("autocomplete") || "").toLowerCase(),
      (input.getAttribute("data-automation-id") || "").toLowerCase(),
      hostAutomationId,
      hostFkitId,
      (input.getAttribute("aria-label") || "").toLowerCase(),
      (input.getAttribute("data-testid") || "").toLowerCase(),
      (input.getAttribute("data-field") || "").toLowerCase(),
      (input.getAttribute("placeholder") || "").toLowerCase(),
    ];



    // Check autocomplete first across all mappings. It is a strong browser-level signal.
    for (const [profileKey, mapping] of Object.entries(FIELD_MAP)) {
      const autoVal = input.getAttribute("autocomplete") || "";
      if (mapping.autocomplete && mapping.autocomplete.includes(autoVal.toLowerCase())) {
        return profileKey;
      }
    }



    // Check data-automation-id next. Workday commonly uses this. Prefer exact
    // matches so generic keys like "name" do not steal "formField-schoolName".
    const daId = `${input.getAttribute("data-automation-id") || ""} ${hostAutomationId}`.toLowerCase();
    const normalizedDaId = daId.replace(/[^a-z0-9]/g, "");
    for (const [profileKey, mapping] of Object.entries(FIELD_MAP)) {
      if (mapping.dataAutomation && mapping.dataAutomation.some(d => normalizedDaId === d.toLowerCase().replace(/[^a-z0-9]/g, ""))) {
        return profileKey;
      }
    }



    const genericAutomationAttrs = new Set(["name"]);
    for (const [profileKey, mapping] of Object.entries(FIELD_MAP)) {
      if (
        mapping.dataAutomation
        && mapping.dataAutomation.some(d => {
          const normalizedCandidate = d.toLowerCase().replace(/[^a-z0-9]/g, "");
          return !genericAutomationAttrs.has(normalizedCandidate)
            && normalizedCandidate.length >= 5
            && normalizedDaId.includes(normalizedCandidate);
        })
      ) {
        return profileKey;
      }
    }



    // Check input type (e.g., type="email", type="tel").
    for (const [profileKey, mapping] of Object.entries(FIELD_MAP)) {
      if (mapping.inputTypes && mapping.inputTypes.includes(input.type)) {
        return profileKey;
      }
    }



    // Prefer exact attribute matches before partial matches so fields like
    // "addresscity" resolve to city instead of the broader address key.
    for (const [profileKey, mapping] of Object.entries(FIELD_MAP)) {
      for (const attr of attrs) {
        if (!attr) continue;
        const normalized = attr.replace(/[^a-z0-9]/g, "");
        for (const candidate of mapping.attributes) {
          const normalizedCandidate = candidate.replace(/[^a-z0-9]/g, "");
          if (normalized === normalizedCandidate) {
            return profileKey;
          }
        }
      }
    }



    // Fall back to partial attribute matches, but avoid tiny/generic candidates
    // stealing more specific fields. Example: cards[address][field2] should
    // still be allowed to match its visible City label later.
    const genericPartialAttrs = new Set([
      "address", "name", "city", "state", "zip", "country", "phone", "email",
      "title", "degree", "experience", "workexperience", "race", "gender",
      "skills", "website", "github"
    ]);

    for (const [profileKey, mapping] of Object.entries(FIELD_MAP)) {
      for (const attr of attrs) {
        if (!attr) continue;
        const normalized = attr.replace(/[^a-z0-9]/g, "");
        for (const candidate of mapping.attributes) {
          const normalizedCandidate = candidate.replace(/[^a-z0-9]/g, "");
          if (
            normalizedCandidate.length >= 5
            && !genericPartialAttrs.has(normalizedCandidate)
            && normalized.includes(normalizedCandidate)
          ) {
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
  function cleanLabelText(text) {
    return text
      .toLowerCase()
      .replace(/\s*\*\s*$/, "")
      .replace(/\s*\(required\)\s*/i, "")
      .replace(/\s+/g, " ")
      .trim();
  }



  function matchesLabelText(text, label) {
    return text === label
      || text.startsWith(label + " ")
      || text.startsWith(label + " -")
      || text.startsWith(label + ":")
      || text.endsWith(" " + label);
  }



  function getLabelCandidates() {
    return Object.entries(FIELD_MAP)
      .flatMap(([profileKey, mapping]) => (
        mapping.labels.map(label => ({ profileKey, label }))
      ))
      .sort((a, b) => b.label.length - a.label.length);
  }



  function findProfileKeyByLabelText(labelText) {
    for (const { profileKey, label } of getLabelCandidates()) {
      if (labelText === label) {
        return profileKey;
      }
    }



    for (const { profileKey, label } of getLabelCandidates()) {
      if (matchesLabelText(labelText, label)) {
        return profileKey;
      }
    }



    return null;
  }



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
    labelText = cleanLabelText(labelText);



    const labelMatch = findProfileKeyByLabelText(labelText);
    if (labelMatch) {
      return labelMatch;
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
      const text = cleanLabelText(el.textContent).slice(0, 100);



      for (const [profileKey, mapping] of Object.entries(FIELD_MAP)) {
        for (const label of mapping.labels) {
          if (className.includes(label.replace(/\s/g, "")) || className.includes(label.replace(/\s/g, "-"))) {
            return profileKey;
          }
        }
        // Only match on text if this container is small (to avoid false positives)
        if (text.length < 50) {
          const labelMatch = findProfileKeyByLabelText(text);
          if (labelMatch) return labelMatch;
        }
      }
    }
    return null;
  }



  // =========================================================================
  // MASTER FIELD DETECTOR – Runs all strategies with priority
  // =========================================================================
  function isUnsupportedWorkExperienceField(input) {
    const rawIdentity = [
      input.getAttribute("id") || "",
      input.getAttribute("name") || "",
      input.getAttribute("data-automation-id") || "",
      input.closest?.("[data-automation-id], [data-fkit-id]")?.getAttribute("data-fkit-id") || "",
    ].join(" ").toLowerCase();

    if (!rawIdentity.includes("workexperience")) {
      return false;
    }



    return !/(jobtitle|companyname)/i.test(rawIdentity);
  }



  function detectField(input) {
    if (isUnsupportedWorkExperienceField(input)) {
      return null;
    }



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
    if (["hidden", "submit", "file", "image"].includes(type)) return false;



    if (tag === "button") {
      return false; // Custom ATS dropdowns are detected, but not auto-selected yet.
    }



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
      'button[aria-haspopup="listbox"]',
      'button[role="combobox"]',
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
      const automationHost = el.closest?.("[data-automation-id], [data-fkit-id]");
      return style.display !== "none"
        && style.visibility !== "hidden"
        && (el.offsetParent !== null || Boolean(automationHost));
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
 
