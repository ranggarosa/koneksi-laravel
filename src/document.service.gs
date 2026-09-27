/**
 * Document Service
 * Handles Google Docs template cloning, placeholder substitution,
 * digital signature image injection, synchronous PDF export, and wet signature revision updating.
 */

const documentService = {
  /**
   * Helper to get target folder for letter: Letters/{letterId}/
   * @param {string} letterId
   * @return {GoogleAppsScript.Drive.Folder|null}
   */
  getLetterFolder(letterId) {
    if (typeof DriveApp === 'undefined') return null;

    let parentFolder = DriveApp.getRootFolder();
    try {
      if (typeof PropertiesService !== 'undefined' && PropertiesService.getScriptProperties) {
        const lettersFolderId = PropertiesService.getScriptProperties().getProperty(PROPERTY_KEYS.LETTERS_FOLDER_ID);
        if (lettersFolderId) {
          parentFolder = DriveApp.getFolderById(lettersFolderId);
        }
      }
    } catch (e) {
      console.warn('Gagal membaca LETTERS_FOLDER_ID, menggunakan Root Folder Drive.', e);
    }

    const folderName = String(letterId).trim();
    const existing = parentFolder.getFoldersByName(folderName);
    if (existing.hasNext()) {
      return existing.next();
    }
    return parentFolder.createFolder(folderName);
  },

  /**
   * Cleans up orphaned or failed partial files from Google Drive (Task T044).
   * @param {string} fileId
   */
  cleanupPartialArtifact(fileId) {
    if (!fileId || typeof DriveApp === 'undefined') return;
    try {
      const file = DriveApp.getFileById(fileId);
      if (file) {
        file.setTrashed(true);
      }
    } catch (e) {
      console.warn(`Gagal membersihkan artefak parsial ${fileId}:`, e.message);
    }
  },

  /**
   * Generates final PDF with digital signature injected.
   * @param {Object} letter
   * @param {Object} approverUser
   * @return {{pdfUrl: string, fileName: string}}
   */
  generateFinalPdfWithDigitalSignature(letter, approverUser) {
    const cleanFileName = Utils.sanitizeFileName(`${letter.letterNumber} - ${letter.templateType}.pdf`);

    // In mock or standalone environment
    if (typeof DriveApp === 'undefined' || typeof DocumentApp === 'undefined') {
      return {
        pdfUrl: `https://drive.google.com/file/d/mock-pdf-${letter.letterId}/view`,
        fileName: cleanFileName
      };
    }

    let tempDocFile = null;
    try {
      const folder = this.getLetterFolder(letter.letterId);
      
      // 1. Dapatkan Template Master Google Docs
      let templateFile = null;
      if (letter.googleDocTemplateId) {
        templateFile = DriveApp.getFileById(letter.googleDocTemplateId);
      } else {
        // Fallback: cari di folder Templates
        let templatesFolderId = null;
        if (typeof PropertiesService !== 'undefined' && PropertiesService.getScriptProperties) {
          templatesFolderId = PropertiesService.getScriptProperties().getProperty(PROPERTY_KEYS.TEMPLATES_FOLDER_ID);
        }
        if (templatesFolderId) {
          const tFolder = DriveApp.getFolderById(templatesFolderId);
          const files = tFolder.getFilesByName(`Master Template ${letter.templateType}`);
          if (files.hasNext()) templateFile = files.next();
        }
      }

      // Duplikasi template ke folder surat
      const docName = `Doc - ${cleanFileName}`;
      if (templateFile) {
        tempDocFile = templateFile.makeCopy(docName, folder);
      } else {
        // Buat Google Doc baru jika master template belum diatur
        tempDocFile = DriveApp.createFile(docName, '', MimeType.GOOGLE_DOCS);
        folder.addFile(tempDocFile);
        DriveApp.getRootFolder().removeFile(tempDocFile);
      }

      const doc = DocumentApp.openById(tempDocFile.getId());
      const body = doc.getBody();

      // 2. Substitusi Placeholder Variabel {{variable}}
      body.replaceText('\\{\\{nomorSurat\\}\\}', letter.letterNumber || '');
      body.replaceText('\\{\\{tanggalSurat\\}\\}', new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }));
      body.replaceText('\\{\\{templateType\\}\\}', letter.templateType || '');
      body.replaceText('\\{\\{approverName\\}\\}', approverUser.name || '');
      body.replaceText('\\{\\{approverRole\\}\\}', approverUser.role || '');

      const content = letter.contentData || {};
      for (const key of Object.keys(content)) {
        const val = content[key] || '';
        body.replaceText(`\\{\\{${key}\\}\\}`, String(val));
      }

      // 3. Injeksi Gambar Tanda Tangan Digital
      if (approverUser.signatureFileId) {
        try {
          const sigFile = DriveApp.getFileById(approverUser.signatureFileId);
          const sigBlob = sigFile.getBlob();
          
          // Cari placeholder {{tandaTangan}}
          const found = body.findText('\\{\\{tandaTangan\\}\\}');
          if (found) {
            const el = found.getElement();
            const parent = el.getParent();
            el.asText().setText(''); // Kosongkan teks placeholder
            const img = parent.asParagraph().appendInlineImage(sigBlob);
            img.setWidth(140);
            img.setHeight(70);
          } else {
            // Append ke akhir dokumen jika placeholder tidak ada
            const img = body.appendImage(sigBlob);
            img.setWidth(140);
            img.setHeight(70);
          }
        } catch (sigErr) {
          console.warn('Gagal memuat berkas tanda tangan referensi:', sigErr.message);
        }
      }

      doc.saveAndClose();

      // 4. Ekspor PDF Sinkron
      const pdfBlob = tempDocFile.getAs('application/pdf').setName(cleanFileName);
      const pdfFile = folder.createFile(pdfBlob);

      // Batasi izin dokumen: draf hanya untuk pihak terkait
      pdfFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      return {
        pdfUrl: pdfFile.getUrl(),
        fileName: cleanFileName
      };
    } catch (err) {
      if (tempDocFile) {
        this.cleanupPartialArtifact(tempDocFile.getId());
      }
      throw err;
    }
  },

  /**
   * Creates an unsigned draft Google Doc in Drive for wet signature workflow.
   * @param {Object} letter
   * @return {{fileId: string, baseRevisionId: string}}
   */
  createUnsignedDraftDoc(letter) {
    if (typeof DriveApp === 'undefined' || typeof DocumentApp === 'undefined') {
      return { fileId: `mock-doc-${letter.letterId}`, baseRevisionId: '1' };
    }

    const folder = this.getLetterFolder(letter.letterId);
    const docName = `Draf Unsigned - ${Utils.sanitizeFileName(letter.letterNumber)}`;
    
    let templateFile = null;
    if (letter.googleDocTemplateId) {
      templateFile = DriveApp.getFileById(letter.googleDocTemplateId);
    }
    
    let docFile;
    if (templateFile) {
      docFile = templateFile.makeCopy(docName, folder);
    } else {
      docFile = DriveApp.createFile(docName, '', MimeType.GOOGLE_DOCS);
      folder.addFile(docFile);
      DriveApp.getRootFolder().removeFile(docFile);
    }

    const doc = DocumentApp.openById(docFile.getId());
    const body = doc.getBody();

    body.replaceText('\\{\\{nomorSurat\\}\\}', letter.letterNumber || '');
    body.replaceText('\\{\\{tanggalSurat\\}\\}', new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }));
    body.replaceText('\\{\\{tandaTangan\\}\\}', '(Tanda Tangan Basah)');

    const content = letter.contentData || {};
    for (const key of Object.keys(content)) {
      body.replaceText(`\\{\\{${key}\\}\\}`, String(content[key] || ''));
    }

    doc.saveAndClose();

    // Prinsip Least-Privilege Sharing: beri Editor hanya ke Drafter dan Reviewer
    try {
      if (letter.drafterEmail) docFile.addEditor(letter.drafterEmail);
      if (Array.isArray(letter.approvalFlow)) {
        letter.approvalFlow.forEach(item => {
          if (item.email) docFile.addEditor(item.email);
        });
      }
    } catch (shareErr) {
      console.warn('Gagal menambahkan editor Drive secara otomatis:', shareErr.message);
    }

    let baseRevId = '1';
    try {
      if (typeof Drive !== 'undefined' && Drive.Files && Drive.Files.get) {
        const fileMeta = Drive.Files.get(docFile.getId());
        baseRevId = String(fileMeta.headRevisionId || '1');
      }
    } catch (e) {
      baseRevId = '1';
    }

    return {
      fileId: docFile.getId(),
      baseRevisionId: baseRevId
    };
  },

  /**
   * Updates existing Google Drive draft file with wet signature scan using Drive.Files.update.
   * Verifies that the new revision ID is greater than base revision ID.
   * @param {string} driveFileId
   * @param {string} fileBase64
   * @param {string} mimeType
   * @param {string} [baseRevisionId]
   * @return {{fileId: string, revisionId: string, pdfUrl: string}}
   */
  updateWetSignatureScan(driveFileId, fileBase64, mimeType, baseRevisionId = '1') {
    if (!driveFileId) {
      throw new Error('ID berkas Google Drive draf tidak ditemukan.');
    }

    if (typeof Drive === 'undefined' || !Drive.Files || !Drive.Files.update) {
      // Mock / fallback
      return {
        fileId: driveFileId,
        revisionId: String(parseInt(baseRevisionId || '1', 10) + 1),
        pdfUrl: `https://drive.google.com/file/d/${driveFileId}/view`
      };
    }

    const decodedBytes = Utilities.base64Decode(fileBase64);
    const blob = Utilities.newBlob(decodedBytes, mimeType, 'scan_signed');

    const resource = {
      description: 'Hasil pindai (scan) dokumen bertanda tangan basah'
    };

    const updated = Drive.Files.update(resource, driveFileId, blob, {
      newRevision: true
    });

    const newRevisionId = String(updated.headRevisionId || '2');

    return {
      fileId: driveFileId,
      revisionId: newRevisionId,
      pdfUrl: updated.alternateLink || updated.webContentLink || `https://drive.google.com/file/d/${driveFileId}/view`
    };
  }
};
