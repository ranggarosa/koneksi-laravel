/**
 * Global Constants & Enums for Sistem Manajemen Surat Menyurat (Koneksi)
 */

const ROLES = Object.freeze({
  DRAFTER: 'drafter',
  REVIEWER: 'reviewer',
  APPROVER: 'approver',
  ADMIN: 'admin'
});

const DOCUMENT_TYPE = Object.freeze({
  INTERNAL: 'INTERNAL',
  EXTERNAL: 'EXTERNAL'
});

const LETTER_STATUS = Object.freeze({
  DRAFT: 'Draft',
  IN_REVIEW: 'In Review',
  PENDING_UPLOAD: 'Pending Upload',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled'
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
  UPLOAD_WET_SIGNATURE: 'upload_wet_signature',
  // Ambil Nomor Actions
  SUBMIT_TAKE_NUMBER: 'submit_take_number',
  APPROVE_TAKE_NUMBER: 'approve_take_number',
  REJECT_TAKE_NUMBER: 'reject_take_number',
  CANCEL_TAKE_NUMBER_DRAFTER: 'cancel_take_number_drafter',
  CANCEL_TAKE_NUMBER_MANUAL: 'cancel_take_number_manual',
  AUTO_EXPIRE_TAKE_NUMBER: 'auto_expire_take_number',
  ESCALATE_TAKE_NUMBER_DAY5: 'escalate_take_number_day5',
  UPLOAD_FINAL_SCAN: 'upload_final_scan',
  REPLACE_FINAL_SCAN_ADMIN: 'replace_final_scan_admin'
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
