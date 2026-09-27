/**
 * Notification Service
 * Sends automated transactional HTML emails via MailApp with daily quota protection and fallback logging.
 */

const notificationService = {
  /**
   * Helper to retrieve Web App execution URL.
   * @return {string}
   */
  getWebAppUrl() {
    try {
      if (typeof ScriptApp !== 'undefined' && ScriptApp.getService) {
        return ScriptApp.getService().getUrl() || '';
      }
    } catch (e) {
      // Ignored
    }
    return '';
  },

  /**
   * Safe email dispatcher that guards against quota exhaustion and invalid recipients.
   * @param {string} to
   * @param {string} subject
   * @param {string} htmlBody
   * @return {boolean}
   */
  sendEmailSafe(to, subject, htmlBody) {
    if (!to || typeof to !== 'string') {
      console.warn('[NotificationService] Alamat email tujuan kosong atau tidak valid.');
      return false;
    }

    if (typeof MailApp === 'undefined' || !MailApp.sendEmail) {
      console.log(`[MockNotification] To: ${to} | Subject: ${subject}`);
      return true;
    }

    try {
      // Periksa sisa kuota harian MailApp
      const remainingQuota = MailApp.getRemainingDailyQuota();
      if (remainingQuota <= 0) {
        console.warn(`[NotificationService] Kuota pengiriman email harian habis (sisa: ${remainingQuota}). Email ke ${to} dialihkan ke log.`);
        return false;
      }

      MailApp.sendEmail({
        to: to.trim(),
        subject: subject,
        htmlBody: htmlBody
      });
      return true;
    } catch (err) {
      console.error(`[NotificationService] Gagal mengirim email ke ${to}: ${err.message}`);
      return false;
    }
  },

  /**
   * Notifies a reviewer or approver that their turn has arrived.
   * @param {Object} letter
   * @param {Object} reviewer
   * @return {boolean}
   */
  sendReviewerTurnNotification(letter, reviewer) {
    const webAppUrl = this.getWebAppUrl();
    const actionUrl = webAppUrl ? `${webAppUrl}?page=detail&letterId=${letter.letterId}` : '#';

    const subject = `[Koneksi] Permohonan Persetujuan: ${letter.letterNumber} (${letter.templateType})`;
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background: #2563eb; padding: 20px; color: white;">
          <h2 style="margin: 0; font-size: 18px;">Permohonan Persetujuan Naskah Dinas</h2>
          <p style="margin: 4px 0 0; opacity: 0.9; font-size: 13px;">Sistem Manajemen Surat Menyurat (Koneksi)</p>
        </div>
        <div style="padding: 24px;">
          <p>Halo <strong>${reviewer.name || reviewer.email}</strong>,</p>
          <p>Terdapat naskah dinas yang membutuhkan peninjauan dan persetujuan dari Anda:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #64748b; width: 35%;">Nomor Surat:</td><td><strong>${letter.letterNumber}</strong></td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Jenis Naskah:</td><td>${letter.templateType}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Pembuat Draf:</td><td>${letter.drafterEmail}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Tanggal Diajukan:</td><td>${new Date(letter.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</td></tr>
          </table>
          ${webAppUrl ? `
          <div style="margin: 24px 0; text-align: center;">
            <a href="${actionUrl}" style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
              Buka & Periksa Naskah di Aplikasi
            </a>
          </div>
          ` : ''}
          <p style="font-size: 12px; color: #94a3b8; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
            Pesan ini dikirim otomatis oleh sistem Koneksi. Harap tidak membalas email ini.
          </p>
        </div>
      </div>
    `;

    return this.sendEmailSafe(reviewer.email, subject, htmlBody);
  },

  /**
   * Notifies drafter when a draft is rejected with specific revision notes.
   * @param {Object} letter
   * @param {string} drafterEmail
   * @param {string} notes
   * @return {boolean}
   */
  sendRejectionNotification(letter, drafterEmail, notes) {
    const webAppUrl = this.getWebAppUrl();
    const actionUrl = webAppUrl ? `${webAppUrl}?page=detail&letterId=${letter.letterId}` : '#';

    const subject = `[Koneksi] Draf Surat Ditolak: ${letter.letterNumber}`;
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background: #ef4444; padding: 20px; color: white;">
          <h2 style="margin: 0; font-size: 18px;">Pemberitahuan Penolakan Draf Surat</h2>
          <p style="margin: 4px 0 0; opacity: 0.9; font-size: 13px;">Sistem Manajemen Surat Menyurat (Koneksi)</p>
        </div>
        <div style="padding: 24px;">
          <p>Halo <strong>${drafterEmail}</strong>,</p>
          <p>Draf surat yang Anda ajukan telah <strong>ditolak</strong> oleh peninjau dan diarsipkan secara permanen:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #64748b; width: 35%;">Nomor Surat Terkait:</td><td><strong>${letter.letterNumber}</strong></td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Jenis Naskah:</td><td>${letter.templateType}</td></tr>
          </table>
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 16px 0; border-radius: 4px;">
            <strong style="color: #991b1b; display: block; margin-bottom: 4px;">Catatan Alasan Penolakan:</strong>
            <p style="margin: 0; color: #7f1d1d; font-style: italic;">"${notes || 'Tidak ada catatan tambahan.'}"</p>
          </div>
          <p style="font-size: 13px; color: #64748b;">
            Nomor surat sebelumnya telah dirilis kembali ke sistem daur ulang nomor. Anda dapat menggunakan fitur <em>Salin Menjadi Draf Baru</em> di aplikasi untuk memperbaiki isi surat dan mengajukan draf baru.
          </p>
          ${webAppUrl ? `
          <div style="margin: 20px 0; text-align: center;">
            <a href="${actionUrl}" style="background: #475569; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 13px; display: inline-block;">
              Lihat Detail di Aplikasi
            </a>
          </div>
          ` : ''}
        </div>
      </div>
    `;

    return this.sendEmailSafe(drafterEmail, subject, htmlBody);
  },

  /**
   * Notifies drafter when a letter is fully approved and officially published.
   * @param {Object} letter
   * @param {string} drafterEmail
   * @return {boolean}
   */
  sendApprovalFinalNotification(letter, drafterEmail) {
    const webAppUrl = this.getWebAppUrl();
    const actionUrl = webAppUrl ? `${webAppUrl}?page=detail&letterId=${letter.letterId}` : '#';

    const subject = `[Koneksi] Surat Telah Disetujui & Diterbitkan: ${letter.letterNumber}`;
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <div style="background: #10b981; padding: 20px; color: white;">
          <h2 style="margin: 0; font-size: 18px;">Naskah Resmi Telah Disahkan</h2>
          <p style="margin: 4px 0 0; opacity: 0.9; font-size: 13px;">Sistem Manajemen Surat Menyurat (Koneksi)</p>
        </div>
        <div style="padding: 24px;">
          <p>Halo <strong>${drafterEmail}</strong>,</p>
          <p>Surat resmi Anda telah selesai melalui seluruh rangkaian persetujuan dan resmi disahkan:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
            <tr><td style="padding: 6px 0; color: #64748b; width: 35%;">Nomor Surat:</td><td><strong style="color: #047857;">${letter.letterNumber}</strong></td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Jenis Naskah:</td><td>${letter.templateType}</td></tr>
            <tr><td style="padding: 6px 0; color: #64748b;">Metode Pengesahan:</td><td>${letter.signatureMethod === 'digital' ? 'Tanda Tangan Digital' : 'Tanda Tangan Basah (Scan Terverifikasi)'}</td></tr>
          </table>
          <div style="margin: 24px 0; text-align: center;">
            ${letter.finalPdfUrl ? `
            <a href="${letter.finalPdfUrl}" style="background: #10b981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block; margin-right: 8px;">
              Unduh Berkas PDF Final Resmi
            </a>
            ` : ''}
            ${webAppUrl ? `
            <a href="${actionUrl}" style="background: #f1f5f9; color: #334155; padding: 12px 20px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
              Buka Detail Surat
            </a>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    return this.sendEmailSafe(drafterEmail, subject, htmlBody);
  }
};
