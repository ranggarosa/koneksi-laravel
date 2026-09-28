/**
 * Generic Sheet Repository & Formula Escaping
 * Wraps SpreadsheetApp with automated formula injection protection.
 */

const sheetRepository = {
  /**
   * Retrieves the active or configured spreadsheet instance.
   * @return {GoogleAppsScript.Spreadsheet.Spreadsheet}
   */
  getSpreadsheet() {
    let ssId = null;
    try {
      if (typeof PropertiesService !== 'undefined' && PropertiesService.getScriptProperties) {
        ssId = PropertiesService.getScriptProperties().getProperty(PROPERTY_KEYS.SPREADSHEET_ID);
      }
    } catch (e) {
      // Ignore in non-GAS / mocked environments
    }

    if (ssId && typeof SpreadsheetApp !== 'undefined' && SpreadsheetApp.openById) {
      return SpreadsheetApp.openById(ssId);
    }
    if (typeof SpreadsheetApp !== 'undefined' && SpreadsheetApp.getActiveSpreadsheet) {
      return SpreadsheetApp.getActiveSpreadsheet();
    }
    return null;
  },

  /**
   * Gets sheet by name, or creates it with header row if it doesn't exist.
   * @param {string} sheetName
   * @param {string[]} defaultHeaders
   * @return {GoogleAppsScript.Spreadsheet.Sheet|null}
   */
  getSheet(sheetName, defaultHeaders = []) {
    const ss = this.getSpreadsheet();
    if (!ss) return null;

    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      if (defaultHeaders.length > 0) {
        sheet.appendRow(defaultHeaders);
      }
    }
    return sheet;
  },

  /**
   * Reads all records from a sheet as an array of JavaScript objects.
   * @param {string} sheetName
   * @return {Array<Object>}
   */
  readAll(sheetName) {
    const sheet = this.getSheet(sheetName);
    if (!sheet) return [];

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return [];

    const headers = data[0].map(h => String(h).trim());
    const rows = data.slice(1);

    return rows.map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        let val = row[index];
        // Strip leading formula escape quote if present
        if (typeof val === 'string' && val.startsWith("'") && ['=', '+', '-', '@'].includes(val.charAt(1))) {
          val = val.substring(1);
        }
        obj[header] = val;
      });
      return obj;
    });
  },

  /**
   * Appends an object as a new row in the specified sheet.
   * Automatically sanitizes text fields against formula injection.
   * @param {string} sheetName
   * @param {Object} rowObj
   * @param {string[]} headers
   * @return {Object}
   */
  appendRow(sheetName, rowObj, headers) {
    const sheet = this.getSheet(sheetName, headers);
    if (!sheet) return rowObj;

    const rowData = headers.map(header => {
      const rawVal = rowObj[header];
      if (rawVal === undefined || rawVal === null) return '';
      if (typeof rawVal === 'object') {
        return JSON.stringify(rawVal);
      }
      return Utils.sanitizeForSheets(rawVal);
    });

    sheet.appendRow(rowData);
    return rowObj;
  },

  /**
   * Updates an existing row identified by its primary key.
   * @param {string} sheetName
   * @param {string} pkColumnName
   * @param {*} pkValue
   * @param {Object} updatedFields
   * @param {string[]} headers
   * @return {boolean}
   */
  updateRow(sheetName, pkColumnName, pkValue, updatedFields, headers) {
    const sheet = this.getSheet(sheetName, headers);
    if (!sheet) return false;

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return false;

    const sheetHeaders = data[0].map(h => String(h).trim());
    const pkIndex = sheetHeaders.indexOf(pkColumnName);
    if (pkIndex === -1) return false;

    for (let r = 1; r < data.length; r++) {
      if (String(data[r][pkIndex]) === String(pkValue)) {
        const rowNumber = r + 1;
        const currentVals = data[r];
        
        sheetHeaders.forEach((header, colIdx) => {
          if (updatedFields[header] !== undefined) {
            let newVal = updatedFields[header];
            if (typeof newVal === 'object' && newVal !== null) {
              newVal = JSON.stringify(newVal);
            }
            const sanitized = Utils.sanitizeForSheets(newVal);
            sheet.getRange(rowNumber, colIdx + 1).setValue(sanitized);
          }
        });
        return true;
      }
    }
    return false;
  },

  /**
   * Finds a single row matching primary key.
   * @param {string} sheetName
   * @param {string} pkColumnName
   * @param {*} pkValue
   * @return {Object|null}
   */
  findByPk(sheetName, pkColumnName, pkValue) {
    const records = this.readAll(sheetName);
    return records.find(item => String(item[pkColumnName]) === String(pkValue)) || null;
  }
};

/**
 * Audit Log Repository (Sheet: ApprovalLog)
 * Append-only immutable log repository.
 */
const auditLogRepository = {
  headers: ['logId', 'letterId', 'actorEmail', 'action', 'notes', 'timestamp'],

  /**
   * Records an audit event.
   * @param {string} letterId
   * @param {string} actorEmail
   * @param {string} action
   * @param {string} notes
   * @return {Object}
   */
  logAction(letterId, actorEmail, action, notes = '') {
    const entry = {
      logId: Utils.generateUuid(),
      letterId,
      actorEmail: (actorEmail || '').toLowerCase().trim(),
      action,
      notes: notes || '',
      timestamp: Utils.formatIsoDate(new Date())
    };

    sheetRepository.appendRow(SHEET_NAMES.APPROVAL_LOG, entry, this.headers);
    return entry;
  },

  /**
   * Retrieves all audit logs for a specific letter in chronological order.
   * @param {string} letterId
   * @return {Array<Object>}
   */
  getLogsForLetter(letterId) {
    const all = sheetRepository.readAll(SHEET_NAMES.APPROVAL_LOG);
    return all
      .filter(l => l.letterId === letterId)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  },

  /**
   * Retrieves all audit logs across all letters.
   * @return {Array<Object>}
   */
  getAllLogs() {
    return sheetRepository.readAll(SHEET_NAMES.APPROVAL_LOG);
  }
};
