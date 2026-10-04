/**
 * Schedule Service
 * Handles periodic background and scheduled tasks such as reconciliation auditing,
 * Day-5 H-2 escalation reminders, and Day-7 auto-expiration of unfulfilled take-number letters.
 */

const scheduleService = {
  _injectedLetterRepo: null,
  _injectedCounterRepo: null,
  _injectedAuditLogRepo: null,
  _injectedNotificationService: null,

  get _letterRepo() {
    return this._injectedLetterRepo || (typeof letterRepository !== 'undefined' ? letterRepository : null);
  },
  set _letterRepo(repo) { this._injectedLetterRepo = repo; },

  get _counterRepo() {
    return this._injectedCounterRepo || (typeof counterRepository !== 'undefined' ? counterRepository : null);
  },
  set _counterRepo(repo) { this._injectedCounterRepo = repo; },

  get _auditLogRepo() {
    return this._injectedAuditLogRepo || (typeof auditLogRepository !== 'undefined' ? auditLogRepository : null);
  },
  set _auditLogRepo(repo) { this._injectedAuditLogRepo = repo; },

  get _notificationService() {
    return this._injectedNotificationService || (typeof notificationService !== 'undefined' ? notificationService : null);
  },
  set _notificationService(svc) { this._injectedNotificationService = svc; },

  setLetterRepository(repo) { this._injectedLetterRepo = repo; },
  setCounterRepository(repo) { this._injectedCounterRepo = repo; },
  setAuditLogRepository(repo) { this._injectedAuditLogRepo = repo; },
  setNotificationService(svc) { this._injectedNotificationService = svc; },

  /**
   * Audits all letters in 'Pending Upload' status.
   * 1. If now >= reconciliationDeadline -> marks status 'Expired', releases sequence to recycled pool,
   *    logs AUTO_EXPIRE_TAKE_NUMBER, and dispatches expiration notification.
   * 2. Else if (now - createdAt) >= 5 calendar days and !escalationSentAt ->
   *    dispatches Day-5 escalation reminder (H-2) and sets escalationSentAt = now.toISOString().
   * 
   * @param {Date} [referenceDate] Optional reference date for testing
   * @return {{ checked: number, escalated: number, expired: number, retained: number }}
   */
  auditPendingReconciliations(referenceDate) {
    const now = referenceDate instanceof Date ? referenceDate : new Date();
    const nowIso = now.toISOString();

    const pendingLetters = (typeof this._letterRepo.findAll === 'function')
      ? this._letterRepo.findAll({
          status: LETTER_STATUS.PENDING_UPLOAD,
          documentType: DOCUMENT_TYPE.EXTERNAL
        })
      : (this._letterRepo.listAll ? this._letterRepo.listAll() : []).filter(l =>
          l.status === LETTER_STATUS.PENDING_UPLOAD &&
          l.documentType === DOCUMENT_TYPE.EXTERNAL
        );

    const stats = {
      checked: pendingLetters.length,
      escalated: 0,
      expired: 0,
      retained: 0
    };

    for (const letter of pendingLetters) {
      try {
        let isExpired = false;
        if (letter.reconciliationDeadline) {
          const deadline = new Date(letter.reconciliationDeadline);
          if (now.getTime() >= deadline.getTime()) {
            isExpired = true;
          }
        }

        if (isExpired) {
          // Auto-expire
          letter.status = LETTER_STATUS.EXPIRED;
          letter.cancellationReason = 'Otomatis kedaluwarsa: Batas waktu rekonsiliasi 7 hari kalender telah terlampaui.';

          // Release sequence to recycled pool
          if (letter.letterNumber) {
            const parsed = Utils.parseLetterNumberParts(letter.letterNumber);
            if (parsed && this._counterRepo && typeof this._counterRepo.releaseNumberToRecycledPool === 'function') {
              this._counterRepo.releaseNumberToRecycledPool(
                parsed.templateCode,
                parsed.sequence,
                parsed.month,
                parsed.year
              );
            }
          }

          this._letterRepo.save(letter);

          if (this._auditLogRepo) {
            this._auditLogRepo.logAction(
              letter.letterId,
              'SYSTEM',
              AUDIT_ACTION.AUTO_EXPIRE_TAKE_NUMBER,
              `Surat ${letter.letterNumber || letter.letterId} otomatis kedaluwarsa setelah H+7. Nomor dilepas kembali ke antrean daur ulang.`
            );
          }

          if (this._notificationService && typeof this._notificationService.sendTakeNumberExpiredNotification === 'function') {
            try {
              this._notificationService.sendTakeNumberExpiredNotification(letter);
            } catch (notifErr) {
              console.warn(`Gagal mengirim email kedaluwarsa untuk surat ${letter.letterId}:`, notifErr.message);
            }
          }

          stats.expired++;
          continue;
        }

        // Check for Day-5 escalation
        // Condition: calendar diff >= 5 days and !letter.escalationSentAt
        let shouldEscalate = false;
        if (!letter.escalationSentAt && letter.createdAt) {
          const diffDays = Utils.calculateCalendarDaysDiff(letter.createdAt, now);
          if (diffDays >= 5) {
            shouldEscalate = true;
          }
        }

        if (shouldEscalate) {
          letter.escalationSentAt = nowIso;
          this._letterRepo.save(letter);

          if (this._auditLogRepo) {
            this._auditLogRepo.logAction(
              letter.letterId,
              'SYSTEM',
              AUDIT_ACTION.ESCALATE_TAKE_NUMBER_DAY5,
              `Peringatan eskalasi H-2 dikirimkan ke Drafter dan Approver untuk surat ${letter.letterNumber}.`
            );
          }

          if (this._notificationService && typeof this._notificationService.sendReconciliationEscalationReminder === 'function') {
            try {
              this._notificationService.sendReconciliationEscalationReminder(letter);
            } catch (notifErr) {
              console.warn(`Gagal mengirim email eskalasi untuk surat ${letter.letterId}:`, notifErr.message);
            }
          }

          stats.escalated++;
        } else {
          stats.retained++;
        }
      } catch (err) {
        console.error(`Error auditing letter ${letter.letterId}:`, err);
      }
    }

    return stats;
  }
};
