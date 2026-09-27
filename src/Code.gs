/**
 * Main Application Entry Point & HTML Router
 * Google Apps Script Web App entry point for Koneksi
 */

/**
 * Handles HTTP GET requests to the Web App.
 * Serves Index.html as a dynamic HTML template.
 * @param {Object} e
 * @return {GoogleAppsScript.HTML.HtmlOutput}
 */
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Index');
  
  // Expose routing query parameters if needed
  template.page = (e && e.parameter && e.parameter.page) || 'dashboard';
  template.letterId = (e && e.parameter && e.parameter.letterId) || '';

  const htmlOutput = template.evaluate()
    .setTitle('Koneksi - Sistem Manajemen Surat Menyurat')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  return htmlOutput;
}

/**
 * HTML include helper: embeds partial HTML files into the master template.
 * Used in Index.html via <?!= include('Filename') ?> syntax.
 * @param {string} filename
 * @return {string}
 */
function include(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (err) {
    console.error(`Gagal memuat template: ${filename}`, err);
    return `<!-- Gagal memuat ${filename}: ${err.message} -->`;
  }
}

/**
 * One-time setup utility to initialize Google Sheets database sheets with proper headers.
 * Run this function from Apps Script Editor upon initial deployment.
 */
function setupDatabase() {
  const ss = sheetRepository.getSpreadsheet();
  if (!ss) {
    throw new Error('Spreadsheet tidak ditemukan. Atur SPREADSHEET_ID di Script Properties atau tautkan script ke Spreadsheet.');
  }

  // 1. Users Sheet
  sheetRepository.getSheet(SHEET_NAMES.USERS, userRepository.headers);

  // 2. Letters Sheet
  sheetRepository.getSheet(SHEET_NAMES.LETTERS, [
    'letterId',
    'letterNumber',
    'templateType',
    'templateCode',
    'googleDocTemplateId',
    'contentData',
    'status',
    'drafterEmail',
    'approvalFlow',
    'signatureMethod',
    'awaitingWetSignature',
    'unsignedDriveFileId',
    'unsignedDraftBaseRevisionId',
    'finalPdfUrl',
    'finalFileName',
    'createdAt',
    'updatedAt'
  ]);

  // 3. Counters Sheet
  sheetRepository.getSheet(SHEET_NAMES.COUNTERS, counterRepository.headers);

  // 4. ApprovalLog Sheet
  sheetRepository.getSheet(SHEET_NAMES.APPROVAL_LOG, auditLogRepository.headers);

  console.log('Inisialisasi database Google Sheets berhasil diselesaikan.');
  return 'SETUP_COMPLETED';
}
