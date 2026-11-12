import { db } from '../firebase';
import { ref, get, set } from 'firebase/database';

export const DEFAULT_SECRET_TOKEN = 'Techflex_Secret_Key_2026';
export const CONTACT_SUFFIX = 'TECHFLEX';

/**
 * Formats contact name strictly to: STU-012 Name TECHFLEX
 */
export const formatContactName = (studentId = '', name = '') => {
  const cleanId = String(studentId || '').trim();
  const cleanName = String(name || '').trim();
  return `${cleanId} ${cleanName} ${CONTACT_SUFFIX}`.trim();
};

/**
 * Normalizes phone numbers to standard international/dialable format
 */
export const normalizePhoneNumber = (rawPhone = '') => {
  if (!rawPhone) return '';
  let str = String(rawPhone).trim().replace(/[\s\-\(\)]/g, '');
  
  // If Pakistani local number starting with 03 (e.g. 03001234567)
  if (/^03\d{9}$/.test(str)) {
    return `+92${str.slice(1)}`;
  }
  
  // If starting with 923... (without +)
  if (/^923\d{9}$/.test(str)) {
    return `+${str}`;
  }

  // If already starts with +
  if (str.startsWith('+')) {
    return str;
  }

  return str;
};

/**
 * Fetches contact sync configuration from Firebase Realtime Database
 */
export const getContactSyncConfig = async () => {
  try {
    const snap = await get(ref(db, 'system_settings/contact_sync'));
    if (snap.exists()) {
      return snap.val();
    }
  } catch (err) {
    console.warn('Could not read contact sync config from DB, checking localStorage:', err);
  }

  // Local storage fallback
  try {
    const local = localStorage.getItem('techflex_contact_sync_config');
    if (local) return JSON.parse(local);
  } catch (e) {
    // ignore
  }

  return {
    enabled: true,
    webhook_url: '',
    secret_key: DEFAULT_SECRET_TOKEN,
    auto_sync_on_enroll: true
  };
};

/**
 * Saves contact sync configuration to Firebase Realtime Database
 */
export const saveContactSyncConfig = async (config) => {
  const payload = {
    enabled: config.enabled ?? true,
    webhook_url: (config.webhook_url || '').trim(),
    secret_key: (config.secret_key || DEFAULT_SECRET_TOKEN).trim(),
    auto_sync_on_enroll: config.auto_sync_on_enroll ?? true,
    updatedAt: new Date().toISOString()
  };

  try {
    await set(ref(db, 'system_settings/contact_sync'), payload);
  } catch (err) {
    console.warn('Failed saving to Firebase, saving to localStorage:', err);
  }

  localStorage.setItem('techflex_contact_sync_config', JSON.stringify(payload));
  return payload;
};

/**
 * Sends a student's contact to the Google Apps Script Webhook.
 * Runs in background without throwing errors to avoid interrupting user flows.
 */
export const syncStudentToGoogleContacts = async (studentData, customConfig = null) => {
  if (!studentData) return { success: false, message: 'No student data provided' };

  const config = customConfig || (await getContactSyncConfig());
  if (!config?.webhook_url) {
    return { success: false, message: 'Google Contacts Webhook URL not configured' };
  }

  if (config.enabled === false) {
    return { success: false, message: 'Contact sync is disabled in settings' };
  }

  const studentId = studentData.student_id || studentData.id || '';
  const studentName = studentData.name || '';
  const contactName = formatContactName(studentId, studentName);
  const phone = normalizePhoneNumber(studentData.contact);
  const secondaryPhone = studentData.secondary_contact ? normalizePhoneNumber(studentData.secondary_contact) : '';

  const courses = studentData.enrolled_courses
    ? Object.values(studentData.enrolled_courses).map(c => c.course_name).filter(Boolean).join(', ')
    : '';

  const payload = {
    token: config.secret_key || DEFAULT_SECRET_TOKEN,
    name: contactName,
    display_name: contactName,
    student_id: studentId,
    student_name: studentName,
    phone: phone,
    raw_phone: studentData.contact || '',
    secondary_phone: secondaryPhone,
    raw_secondary_phone: studentData.secondary_contact || '',
    company: 'TECHFLEX Institute',
    course_name: courses || 'Student',
    enrolled_at: studentData.createdAt ? new Date(studentData.createdAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
    notes: `Student ID: ${studentId}\nCourse: ${courses || 'General'}\nPrimary Phone: ${studentData.contact || 'N/A'}${studentData.secondary_contact ? `\nParent/Secondary Phone: ${studentData.secondary_contact}` : ''}\nEnrolled: ${studentData.createdAt || 'N/A'}\nTechflex Management System`
  };

  try {
    // Send as text/plain to avoid browser CORS preflight issues with Google Apps Script
    const response = await fetch(config.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      let data = {};
      try {
        data = await response.json();
      } catch (e) {
        data = { status: 'success' };
      }

      if (data.status === 'error') {
        return { success: false, message: data.message || 'Error from Google Apps Script' };
      }
      if (data.status === 'unauthorized') {
        return { success: false, message: 'Secret key mismatch!' };
      }

      return { success: true, message: `Synced: ${contactName}`, data };
    } else {
      return { success: false, message: `Webhook responded with HTTP ${response.status}` };
    }
  } catch (err) {
    console.error('Contact sync fetch error:', err);
    return { success: false, message: err.message };
  }
};

/**
 * Tests connection with Google Apps Script Webhook
 */
export const testWebhookConnection = async (webhookUrl, secretKey) => {
  if (!webhookUrl) throw new Error('Please enter a Webhook URL');

  const testPayload = {
    token: secretKey || DEFAULT_SECRET_TOKEN,
    name: `STU-000 Test Student ${CONTACT_SUFFIX}`,
    student_id: 'STU-000',
    student_name: 'Test Student',
    phone: '+923000000000',
    company: 'TECHFLEX Institute',
    course_name: 'Testing Sync',
    notes: 'Diagnostic test contact from Techflex Management System'
  };

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(testPayload)
  });

  if (!response.ok) {
    throw new Error(`Webhook returned HTTP ${response.status}`);
  }

  const data = await response.json().catch(() => {
    throw new Error('Invalid response from Webhook. Make sure you deployed as Web app with access set to "Anyone".');
  });

  if (data.status === 'unauthorized') {
    throw new Error('Secret key mismatch! Please check your Secret Token.');
  }

  if (data.status === 'error') {
    throw new Error(data.message || 'Error reported by Google Apps Script.');
  }

  return data;
};

/**
 * Generates single vCard 3.0 (.vcf) formatted string
 */
export const generateVCardString = (student) => {
  const studentId = student.student_id || student.id || 'STU-000';
  const name = student.name || 'Student';
  const formattedName = formatContactName(studentId, name);
  const phone = normalizePhoneNumber(student.contact);
  const secondaryPhone = student.secondary_contact ? normalizePhoneNumber(student.secondary_contact) : '';
  const course = student.enrolled_courses
    ? Object.values(student.enrolled_courses).map(c => c.course_name).filter(Boolean).join(', ')
    : '';

  const vcardLines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${formattedName}`,
    `N:${CONTACT_SUFFIX};${studentId} ${name};;;`,
    `TEL;TYPE=CELL,VOICE:${phone}`
  ];

  if (secondaryPhone) {
    vcardLines.push(`TEL;TYPE=HOME,VOICE:${secondaryPhone}`);
  }

  vcardLines.push(
    'ORG:TECHFLEX Institute',
    `TITLE:${course || 'Student'}`,
    `NOTE:Student ID: ${studentId} | Course: ${course} | Primary: ${student.contact || ''}${student.secondary_contact ? ` | Parent: ${student.secondary_contact}` : ''} | Techflex Management System`,
    'END:VCARD'
  );

  return vcardLines.join('\r\n');
};

/**
 * Downloads a single vCard file or bulk vCard file for importing directly into mobile phone / Google Contacts
 */
export const downloadVCardFile = (studentsList, filename = 'Techflex_Students.vcf') => {
  if (!Array.isArray(studentsList) || studentsList.length === 0) return;

  const vCardContent = studentsList.map(s => generateVCardString(s)).join('\r\n\r\n');
  const blob = new Blob([vCardContent], { type: 'text/vcard;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Modern Google Apps Script using official Google People API
 */
export const GOOGLE_APPS_SCRIPT_CODE = `// ============================================================================
// TECHFLEX MANAGEMENT SYSTEM - GOOGLE CONTACTS AUTOMATIC SYNC (PEOPLE API)
// ============================================================================
// STEP 1: On the left menu, click the "+" icon next to "Services"
// STEP 2: Scroll down, select "People API" (version: v1, Identifier: People), and click "Add"
// STEP 3: Click "Run" on authorizeAndTest() to grant permissions once!
// STEP 4: Deploy > New deployment > Web app > Execute as: Me > Who has access: Anyone
// ============================================================================

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "No post data received" }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    
    var data = JSON.parse(e.postData.contents);
    var EXPECTED_SECRET = "Techflex_Secret_Key_2026"; // Must match Secret Key in Techflex settings
    
    if (data.token && data.token !== EXPECTED_SECRET) {
      return ContentService.createTextOutput(JSON.stringify({ status: "unauthorized", message: "Invalid secret token" }))
                           .setMimeType(ContentService.MimeType.JSON);
    }
    
    // Check if People API service is added
    if (typeof People === "undefined" || !People.People) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "People API is not added! In script.google.com, click '+' next to Services on the left sidebar, add 'People API', and re-deploy."
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Format requested: STU-012 Name TECHFLEX
    var contactName = data.name || (data.student_id + " " + data.student_name + " TECHFLEX");
    var phone = data.phone || data.raw_phone || "";
    var course = data.course_name || "General";
    var studentId = data.student_id || "";
    
    var contactResource = {
      names: [
        {
          givenName: contactName,
          displayName: contactName
        }
      ]
    };
    
    if (phone) {
      contactResource.phoneNumbers = [
        {
          value: phone,
          type: "mobile"
        }
      ];
    }
    
    var secondaryPhone = data.secondary_phone || data.raw_secondary_phone || "";
    if (secondaryPhone) {
      if (!contactResource.phoneNumbers) contactResource.phoneNumbers = [];
      contactResource.phoneNumbers.push({
        value: secondaryPhone,
        type: "home"
      });
    }
    
    contactResource.organizations = [
      {
        name: "TECHFLEX Institute",
        title: course
      }
    ];
    
    var notes = "Student ID: " + studentId + "\\nCourse: " + course + "\\nSystem: Techflex Management System";
    if (data.enrolled_at) notes += "\\nEnrolled: " + data.enrolled_at;
    
    contactResource.biographies = [
      {
        value: notes,
        contentType: "TEXT_PLAIN"
      }
    ];
    
    // =========================================================================
    // DUPLICATE PREVENTION: Check STRICTLY by Student ID (e.g. STU-012)
    // Allows siblings/family members with the SAME phone number to have separate contacts!
    // =========================================================================
    var existingResourceName = null;
    
    // Search strictly by Student ID (e.g. STU-012)
    if (studentId) {
      try {
        var searchRes = People.People.searchContacts({
          query: studentId,
          readMask: "names"
        });
        if (searchRes && searchRes.results && searchRes.results.length > 0) {
          for (var i = 0; i < searchRes.results.length; i++) {
            var p = searchRes.results[i].person;
            var dName = (p.names && p.names[0] && p.names[0].displayName) || "";
            if (dName.indexOf(studentId) !== -1) {
              existingResourceName = p.resourceName;
              break;
            }
          }
        }
      } catch (errSearch) {
        Logger.log("Search by ID error: " + errSearch);
      }
    }
    
    var response;
    var actionTaken = "created";
    
    if (existingResourceName) {
      // Contact already exists -> Fetch current etag and UPDATE in-place!
      try {
        var existingPerson = People.People.get(existingResourceName, {
          personFields: "names,phoneNumbers,organizations,biographies"
        });
        contactResource.etag = existingPerson.etag;
        response = People.People.updateContact(
          contactResource,
          existingResourceName,
          { updatePersonFields: "names,phoneNumbers,organizations,biographies" }
        );
        actionTaken = "updated";
      } catch (updateErr) {
        // Fallback: If update fails (e.g. invalid etag), create new
        Logger.log("Update failed, falling back to create: " + updateErr);
        response = People.People.createContact(contactResource);
        actionTaken = "created";
      }
    } else {
      // New Contact -> Create
      response = People.People.createContact(contactResource);
      actionTaken = "created";
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      action: actionTaken,
      message: (actionTaken === "updated" ? "Contact updated (no duplicate): " : "Contact saved: ") + contactName,
      resourceName: response.resourceName
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  var isPeopleEnabled = (typeof People !== "undefined" && !!People.People);
  return ContentService.createTextOutput(JSON.stringify({
    status: isPeopleEnabled ? "active" : "warning",
    people_api_enabled: isPeopleEnabled,
    message: isPeopleEnabled
      ? "Techflex Google Contacts Webhook is ready! People API is active."
      : "Webhook is reachable, but People API is missing. Click '+' next to Services on the left menu and add 'People API'."
  })).setMimeType(ContentService.MimeType.JSON);
}

// Click "Run" on this function once in the editor to grant Google Contacts permissions!
function authorizeAndTest() {
  Logger.log("Testing People API connection...");
  if (typeof People === "undefined" || !People.People) {
    throw new Error("People API is not added! Click '+' next to Services on left menu, choose 'People API', and click Add.");
  }
  var testRes = People.People.createContact({
    names: [{ givenName: "STU-000 Test Setup TECHFLEX" }],
    phoneNumbers: [{ value: "+923000000000", type: "mobile" }],
    organizations: [{ name: "TECHFLEX Institute", title: "Test Setup" }]
  });
  Logger.log("SUCCESS! Created contact: " + testRes.resourceName);
}`;
