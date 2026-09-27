/**
 * Global Constants & Enums for Sistem Manajemen Surat Menyurat (Koneksi)
 */

const ROLES = Object.freeze({
  DRAFTER: 'drafter',
  REVIEWER: 'reviewer',
  APPROVER: 'approver',
  ADMIN: 'admin'
});

const LETTER_STATUS = Object.freeze({
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected'
});

const FLOW_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
});

const SIGNATURE_METHOD = Object.freeze({
  DIGITAL: 'digital',
  WET: 'wet'
});

const AUDIT_ACTION = Object.freeze({
  SUBMIT_DRAFT: 'submit_draft',
  APPROVE: 'approve',
  REJECT: 'reject',
  CHOOSE_SIGNATURE_METHOD: 'choose_signature_method',
  UPLOAD_WET_SIGNATURE: 'upload_wet_signature'
});

const SHEET_NAMES = Object.freeze({
  USERS: 'Users',
  LETTERS: 'Letters',
  COUNTERS: 'Counters',
  APPROVAL_LOG: 'ApprovalLog'
});

const PROPERTY_KEYS = Object.freeze({
  SPREADSHEET_ID: 'SPREADSHEET_ID',
  ROOT_FOLDER_ID: 'ROOT_FOLDER_ID',
  TEMPLATES_FOLDER_ID: 'TEMPLATES_FOLDER_ID',
  SIGNATURES_FOLDER_ID: 'SIGNATURES_FOLDER_ID',
  LETTERS_FOLDER_ID: 'LETTERS_FOLDER_ID'
});

const TEMPLATE_DEFAULTS = Object.freeze([
  {
    code: 'SP1',
    name: 'Surat Peringatan 1',
    description: 'Surat teguran resmi tahap pertama untuk pelanggaran disiplin kerja.'
  },
  {
    code: 'ST',
    name: 'Surat Tugas',
    description: 'Surat penugasan kedinasan karyawan ke lokasi atau agenda tertentu.'
  },
  {
    code: 'SK',
    name: 'Surat Keputusan',
    description: 'Surat penetapan kebijakan, mutasi, atau promosi karyawan resmi.'
  }
]);

const UPLOAD_CONFIG = Object.freeze({
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  ALLOWED_MIME_TYPES: ['application/pdf', 'image/jpeg', 'image/png']
});
