/**
 * ✅ GAS Auth Code — อัปเดตให้รองรับ fetch() จาก VS Code / Local HTML
 * เพิ่ม action=login ใน doGet เพื่อให้ Login.html เรียกผ่าน fetch ได้
 */

function doGet(e) {
  const action    = e && e.parameter && e.parameter.action ? String(e.parameter.action) : '';
  const sessionId = e && e.parameter ? e.parameter.session : '';

  // ──────────────────────────────────────────────────
  // ✅ NEW: action=login — ให้ fetch() จาก VS Code / local HTML เรียกได้
  // URL: GAS_URL?action=login&username=XXX&password=YYY
  // ──────────────────────────────────────────────────
  if (action === 'login') {
    const username = (e.parameter.username || '').trim();
    const password = (e.parameter.password || '').trim();
    const result   = checkLogin(username, password);
    return jsonResponse(result);
  }

  // ──────────────────────────────────────────────────
  // ✅ Session-based page routing (เหมือนเดิม)
  // ──────────────────────────────────────────────────
  if (sessionId) {
    const userData = getSessionData(sessionId);

    if (userData && userData.logged_in === 'true') {
      Logger.log('✅ Valid session: ' + userData.username);

      if (userData.status === 'admin') {
        const template = HtmlService.createTemplateFromFile('index');
        template.userData  = userData;
        template.sessionId = sessionId;
        return template.evaluate()
          .setTitle('ThaiDrill Lao')
          .setFaviconUrl('https://thaidrilllao-fbcda.firebaseapp.com/assets/logo_remover-0nfOxi9p.png')
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      }

      if (userData.status === 'user') {
        const template = HtmlService.createTemplateFromFile('index_user');
        template.userData  = userData;
        template.sessionId = sessionId;
        return template.evaluate()
          .setTitle('ThaiDrill Lao')
          .setFaviconUrl('https://thaidrilllao-fbcda.firebaseapp.com/assets/logo_remover-0nfOxi9p.png')
          .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      }
    }
  }

  // ── ไม่มี session / session หมดอายุ → แสดง Login ──
  Logger.log('❌ No valid session - Show login page');
  return HtmlService.createHtmlOutputFromFile('Login')
    .setTitle('ThaiDrill Login - ເຂົ້າສູ່ລະບົບ')
    .setFaviconUrl('https://thaidrilllao-fbcda.firebaseapp.com/assets/41-removebg-preview-C1XuUAgZ.png')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ──────────────────────────────────────────────────
// ✅ Helper: ส่ง JSON response พร้อม CORS headers
// (จำเป็นต้องใช้ ContentService แทน HtmlService)
// ──────────────────────────────────────────────────
function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

// ──────────────────────────────────────────────────
// ✅ checkLogin — ตรวจสอบ username/password จากชีต Admin
// คอลัมน์: A=ลำดับ, B=fullname, C=employeeId, D=status, E=username, F=password
// ──────────────────────────────────────────────────
function checkLogin(username, password) {
  try {
    const ss    = SpreadsheetApp.openById('1WItlGibbL14gmej3p_Lv61p74m7xFKplNsYiy88R7Ec');
    const sheet = ss.getSheetByName('admin');

    if (!sheet) {
      Logger.log('❌ ไม่พบชีต admin');
      return { success: false, message: 'ไม่พบชีต admin ในระบบ' };
    }

    const data = sheet.getDataRange().getValues();
    Logger.log('🔍 Login attempt — username: ' + username);

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row.length < 6) continue;

      const fullname    = row[1] ? String(row[1]).trim() : '';
      const employeeId  = row[2] ? String(row[2]).trim() : '';
      const status      = row[3] ? String(row[3]).trim() : '';
      const dbUsername  = row[4] ? String(row[4]).trim().toUpperCase() : '';
      const dbPassword  = row[5] ? String(row[5]).trim() : '';

      if (dbUsername === String(username).trim().toUpperCase() &&
          dbPassword === String(password).trim()) {

        Logger.log('✅ Match found: ' + fullname);

        let fname = fullname, lname = '';
        if (fullname.includes(' ')) {
          const parts = fullname.split(' ');
          fname = parts[0];
          lname = parts.slice(1).join(' ');
        }

        // สร้างและบันทึก session
        const newSessionId = generateSessionId();
        const userData = {
          username:   dbUsername,
          status:     status,
          fname:      fname,
          lname:      lname,
          fullname:   fullname,
          employeeId: employeeId,
          password:   dbPassword,
          department: status === 'admin' ? 'ฝ่ายเหมือง' : 'ฝ่ายเครื่องจักร'
        };
        saveSessionData(newSessionId, userData);

        const baseUrl     = ScriptApp.getService().getUrl();
        const redirectUrl = baseUrl + '?session=' + newSessionId;

        Logger.log('✅ Login success → ' + fullname);
        Logger.log('✅ Redirect URL: ' + redirectUrl);

        return {
          success:     true,
          status:      status,
          message:     'เข้าสู่ระบบสำเร็จ',
          username:    dbUsername,
          fname:       fname,
          lname:       lname,
          fullname:    fullname,
          employeeId:  employeeId,
          sessionId:   newSessionId,
          redirectUrl: redirectUrl
        };
      }
    }

    Logger.log('❌ No matching user');
    return { success: false, message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' };

  } catch (error) {
    Logger.log('❌ checkLogin error: ' + error.toString());
    return { success: false, message: 'เกิดข้อผิดพลาดในระบบ: ' + error.toString() };
  }
}

// ──────────────────────────────────────────────────
// Session Helpers (เหมือนเดิม)
// ──────────────────────────────────────────────────

function generateSessionId() {
  return 'session_' + new Date().getTime() + '_' + Math.random().toString(36).substring(2, 15);
}

function saveSessionData(sessionId, userData) {
  const cache = CacheService.getScriptCache();
  const sessionData = {
    logged_in:  'true',
    username:   userData.username,
    status:     userData.status,
    fname:      userData.fname,
    lname:      userData.lname,
    fullname:   userData.fullname,
    employeeId: userData.employeeId,
    password:   userData.password,
    department: userData.department,
    loginTime:  new Date().toISOString()
  };
  cache.put(sessionId, JSON.stringify(sessionData), 604800); // 1 สัปดาห์
  Logger.log('✅ Session saved: ' + sessionId);
  return sessionId;
}

function getSessionData(sessionId) {
  if (!sessionId) return null;
  const cache      = CacheService.getScriptCache();
  const cachedData = cache.get(sessionId);
  if (!cachedData) { Logger.log('❌ Session not found/expired: ' + sessionId); return null; }
  try {
    const data = JSON.parse(cachedData);
    Logger.log('✅ Session retrieved: ' + data.username);
    return data;
  } catch (e) { Logger.log('❌ Parse session error: ' + e); return null; }
}

function deleteSession(sessionId) {
  if (!sessionId) return false;
  CacheService.getScriptCache().remove(sessionId);
  Logger.log('✅ Session deleted: ' + sessionId);
  return true;
}

function getCurrentUser(sessionId) {
  try {
    if (!sessionId) return null;
    const userData = getSessionData(sessionId);
    if (userData && userData.logged_in === 'true') return userData;
    return null;
  } catch (e) { Logger.log('❌ getCurrentUser error: ' + e); return null; }
}

function logout(sessionId) {
  try {
    if (sessionId) deleteSession(sessionId);
    return { success: true, message: 'ออกจากระบบสำเร็จ', redirect: ScriptApp.getService().getUrl() };
  } catch (e) { return { success: false, message: 'เกิดข้อผิดพลาด: ' + e.toString() }; }
}

function isSessionValid(sessionId) {
  return getSessionData(sessionId) !== null;
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}