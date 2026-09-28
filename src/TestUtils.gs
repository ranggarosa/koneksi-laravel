/**
 * Test utilities and assertions for unit testing in Google Apps Script and local environments.
 */

const TestUtils = {
  registeredSuites: [],

  /**
   * Asserts equality between two values.
   */
  assertEqual(actual, expected, message = '') {
    const actStr = JSON.stringify(actual);
    const expStr = JSON.stringify(expected);
    if (actStr !== expStr) {
      throw new Error(`[AssertionFailed] ${message} -> Expected: ${expStr}, Actual: ${actStr}`);
    }
  },

  /**
   * Asserts that a value is truthy.
   */
  assertTrue(value, message = '') {
    if (!value) {
      throw new Error(`[AssertionFailed] ${message} -> Expected truthy, got: ${value}`);
    }
  },

  /**
   * Asserts that a value is falsy.
   */
  assertFalse(value, message = '') {
    if (value) {
      throw new Error(`[AssertionFailed] ${message} -> Expected falsy, got: ${value}`);
    }
  },

  /**
   * Asserts that calling fn() throws an error containing expectedSubstring.
   */
  assertThrows(fn, expectedSubstring = '', message = '') {
    let threw = false;
    let errorMsg = '';
    try {
      fn();
    } catch (e) {
      threw = true;
      const codePart = e.code ? `[${e.code}] ` : '';
      errorMsg = codePart + (e.message || String(e));
      if (expectedSubstring && !errorMsg.includes(expectedSubstring)) {
        throw new Error(
          `[AssertionFailed] ${message} -> Expected error containing "${expectedSubstring}", but caught: "${errorMsg}"`
        );
      }
    }
    if (!threw) {
      throw new Error(`[AssertionFailed] ${message} -> Expected function to throw error, but it did not.`);
    }
  },

  /**
   * Registers a test suite.
   * @param {string} suiteName
   * @param {Function} suiteFn function containing tests
   */
  registerSuite(suiteName, suiteFn) {
    this.registeredSuites.push({ suiteName, suiteFn });
  },

  /**
   * In-Memory Mock Repository Helpers for isolated testing without live Google Sheets.
   */
  createMockUserRepository(initialUsers = []) {
    const users = JSON.parse(JSON.stringify(initialUsers));
    return {
      findByEmail(email) {
        if (!email) return null;
        const norm = email.toLowerCase().trim();
        return users.find(u => u.email && u.email.toLowerCase().trim() === norm) || null;
      },
      listAll() {
        return users.map(u => ({ ...u }));
      },
      save(userData) {
        const idx = users.findIndex(u => u.email.toLowerCase() === userData.email.toLowerCase());
        if (idx >= 0) {
          users[idx] = { ...users[idx], ...userData };
          return users[idx];
        } else {
          const newUser = { ...userData };
          users.push(newUser);
          return newUser;
        }
      },
      updateSignature(email, signatureFileId) {
        const user = this.findByEmail(email);
        if (user) {
          user.signatureFileId = signatureFileId;
          return true;
        }
        return false;
      }
    };
  },

  createMockCounterRepository(initialCounters = []) {
    const counters = JSON.parse(JSON.stringify(initialCounters));
    return {
      getCounter(templateCode, month, year) {
        const counterId = `${templateCode}_${String(month).padStart(2, '0')}_${year}`;
        const existing = counters.find(c => c.counterId === counterId);
        if (existing) {
          return {
            ...existing,
            recycledNumbers: Array.isArray(existing.recycledNumbers)
              ? [...existing.recycledNumbers]
              : JSON.parse(existing.recycledNumbers || '[]')
          };
        }
        return null;
      },
      saveCounter(counterData) {
        const counterId = counterData.counterId;
        const idx = counters.findIndex(c => c.counterId === counterId);
        const dataToSave = {
          ...counterData,
          recycledNumbers: Array.isArray(counterData.recycledNumbers)
            ? [...counterData.recycledNumbers]
            : JSON.parse(counterData.recycledNumbers || '[]')
        };
        if (idx >= 0) {
          counters[idx] = dataToSave;
        } else {
          counters.push(dataToSave);
        }
        return dataToSave;
      },
      addRecycledNumber(templateCode, month, year, sequenceNumberStr) {
        const counterId = `${templateCode}_${String(month).padStart(2, '0')}_${year}`;
        let counter = this.getCounter(templateCode, month, year);
        if (!counter) {
          counter = {
            counterId,
            templateCode,
            month: parseInt(month, 10),
            year: parseInt(year, 10),
            currentSequence: 0,
            recycledNumbers: []
          };
        }
        if (!counter.recycledNumbers.includes(sequenceNumberStr)) {
          counter.recycledNumbers.push(sequenceNumberStr);
        }
        this.saveCounter(counter);
        return counter;
      }
    };
  },

  createMockLetterRepository(initialLetters = []) {
    const letters = JSON.parse(JSON.stringify(initialLetters));
    return {
      findById(letterId) {
        const found = letters.find(l => l.letterId === letterId);
        return found ? JSON.parse(JSON.stringify(found)) : null;
      },
      findByLetterNumber(letterNumber) {
        const found = letters.find(l => l.letterNumber === letterNumber);
        return found ? JSON.parse(JSON.stringify(found)) : null;
      },
      save(letterData) {
        const idx = letters.findIndex(l => l.letterId === letterData.letterId);
        const copy = JSON.parse(JSON.stringify(letterData));
        if (idx >= 0) {
          letters[idx] = copy;
        } else {
          letters.push(copy);
        }
        return copy;
      },
      listAll() {
        return letters.map(l => JSON.parse(JSON.stringify(l)));
      }
    };
  },

  createMockAuditLogRepository(initialLogs = []) {
    const logs = JSON.parse(JSON.stringify(initialLogs));
    return {
      logAction(letterId, actorEmail, action, notes = '') {
        const entry = {
          logId: Utils.generateUuid(),
          letterId,
          actorEmail,
          action,
          notes,
          timestamp: Utils.formatIsoDate(new Date())
        };
        logs.push(entry);
        return entry;
      },
      getLogsForLetter(letterId) {
        return logs
          .filter(l => l.letterId === letterId)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      },
      getAllLogs() {
        return [...logs];
      }
    };
  },

  createMockNotificationService() {
    const sentEmails = [];
    return {
      sentEmails,
      sendReviewerTurnNotification(letter, reviewer) {
        sentEmails.push({ type: 'reviewer_turn', to: reviewer.email, letterId: letter.letterId });
        return true;
      },
      sendRejectionNotification(letter, drafterEmail, notes) {
        sentEmails.push({ type: 'rejection', to: drafterEmail, letterId: letter.letterId, notes });
        return true;
      },
      sendApprovalFinalNotification(letter, drafterEmail) {
        sentEmails.push({ type: 'final_approval', to: drafterEmail, letterId: letter.letterId });
        return true;
      }
    };
  },

  createMockDocumentService() {
    const createdPdfs = [];
    const createdDrafts = [];
    let currentRevision = 1;
    return {
      createdPdfs,
      createdDrafts,
      currentRevision,
      generateFinalPdfWithDigitalSignature(letter, approverUser) {
        const pdfUrl = `https://drive.google.com/mock-pdf/${letter.letterId}`;
        const fileName = `${letter.letterNumber.replace(/[\\/:*?"<>|]/g, '-')}.pdf`;
        createdPdfs.push({ letterId: letter.letterId, pdfUrl, fileName });
        return { pdfUrl, fileName };
      },
      createUnsignedDraftDoc(letter) {
        const fileId = `mock-doc-${letter.letterId}`;
        const baseRevId = '1';
        createdDrafts.push({ letterId: letter.letterId, fileId, baseRevId });
        return { fileId, baseRevisionId: baseRevId };
      },
      updateWetSignatureScan(fileId, fileBase64, mimeType) {
        currentRevision++;
        return {
          fileId,
          revisionId: String(currentRevision),
          pdfUrl: `https://drive.google.com/mock-scan-pdf/${fileId}`
        };
      }
    };
  }
};

/**
 * Global Test Runner: executes all registered test suites.
 * Can be run directly from Apps Script editor or command line.
 */
function runAllTests() {
  const summary = {
    totalSuites: TestUtils.registeredSuites.length,
    passedSuites: 0,
    failedSuites: 0,
    suiteDetails: []
  };

  console.log(`\n======================================================`);
  console.log(`🚀 RUNNING TEST SUITES: ${summary.totalSuites} suite(s) registered`);
  console.log(`======================================================\n`);

  for (const { suiteName, suiteFn } of TestUtils.registeredSuites) {
    console.log(`▶ Running Suite: ${suiteName}...`);
    try {
      suiteFn();
      summary.passedSuites++;
      summary.suiteDetails.push({ suite: suiteName, status: 'PASS' });
      console.log(`  ✓ ${suiteName} PASSED`);
    } catch (err) {
      summary.failedSuites++;
      summary.suiteDetails.push({ suite: suiteName, status: 'FAIL', error: err.message, stack: err.stack });
      console.error(`  ✗ ${suiteName} FAILED: ${err.message}`);
    }
  }

  console.log(`\n======================================================`);
  console.log(`TEST SUMMARY: ${summary.passedSuites}/${summary.totalSuites} passed (${summary.failedSuites} failed)`);
  console.log(`======================================================\n`);

  return summary;
}
