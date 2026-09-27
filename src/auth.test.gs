/**
 * Unit Tests: Auth Service, Whitelist Matching & Role Guards (User Story 4)
 */

function runAuthTests() {
  console.log('--- Menjalankan AuthService Unit Tests ---');

  const activeDrafter = { email: 'drafter@gmail.com', name: 'Drafter HR', role: ROLES.DRAFTER, isActive: true };
  const inactiveUser = { email: 'inactive@gmail.com', name: 'Mantan Pegawai', role: ROLES.DRAFTER, isActive: false };
  const adminUser = { email: 'admin@gmail.com', name: 'Admin Sistem', role: ROLES.ADMIN, isActive: true };
  const approverUser = { email: 'approver@gmail.com', name: 'Approver HR', role: ROLES.APPROVER, isActive: true };

  const setupAuth = () => {
    const mockUserRepo = TestUtils.createMockUserRepository([activeDrafter, inactiveUser, adminUser, approverUser]);
    authService.setUserRepository(mockUserRepo);
    return { mockUserRepo };
  };

  // Test 1: Akun Whitelist Aktif Berhasil Terautentikasi
  (() => {
    setupAuth();
    authService.setOverrideEmail('drafter@gmail.com');

    const user = authService.getCurrentUser();
    TestUtils.assertEqual(user.email, 'drafter@gmail.com');
    TestUtils.assertEqual(user.role, ROLES.DRAFTER);
    TestUtils.assertTrue(user.isActive);
  })();

  // Test 2: Akun Tidak Terdaftar di Whitelist Ditolak (NOT_WHITELISTED)
  (() => {
    setupAuth();
    authService.setOverrideEmail('stranger@gmail.com');

    TestUtils.assertThrows(() => {
      authService.getCurrentUser();
    }, 'NOT_WHITELISTED', 'Email luar yang belum terdaftar harus ditolak');
  })();

  // Test 3: Akun Dinonaktifkan Dikunci (ACCOUNT_DEACTIVATED)
  (() => {
    setupAuth();
    authService.setOverrideEmail('inactive@gmail.com');

    TestUtils.assertThrows(() => {
      authService.getCurrentUser();
    }, 'ACCOUNT_DEACTIVATED', 'Pengguna tidak aktif harus ditolak');
  })();

  // Test 4: Sesi Akun Google Tidak Terdeteksi (SESSION_NOT_DETECTED)
  (() => {
    setupAuth();
    authService.setOverrideEmail('');

    TestUtils.assertThrows(() => {
      authService.getCurrentUser();
    }, 'SESSION_NOT_DETECTED', 'Sesi kosong harus memicu SESSION_NOT_DETECTED');
  })();

  // Test 5: Guard Peran Server-Side (UNAUTHORIZED_ROLE)
  (() => {
    setupAuth();
    authService.setOverrideEmail('drafter@gmail.com');

    // Drafter mencoba memanggil endpoint khusus Admin
    TestUtils.assertThrows(() => {
      authService.requireUser([ROLES.ADMIN]);
    }, 'UNAUTHORIZED_ROLE', 'Drafter dilarang mengakses aksi khusus Admin');
  })();

  // Test 6: Admin Berhasil Mengelola Pengguna (Upsert User)
  (() => {
    setupAuth();
    authService.setOverrideEmail('admin@gmail.com');
    const admin = authService.getCurrentUser();

    // Admin mendaftarkan akun baru
    const newUser = authService.upsertUser(admin, {
      email: 'new.reviewer@gmail.com',
      name: 'Reviewer Baru',
      role: ROLES.REVIEWER,
      isActive: true
    });
    TestUtils.assertEqual(newUser.email, 'new.reviewer@gmail.com');

    // Cek bahwa pengguna baru sekarang bisa login
    authService.setOverrideEmail('new.reviewer@gmail.com');
    const loggedIn = authService.getCurrentUser();
    TestUtils.assertEqual(loggedIn.role, ROLES.REVIEWER);
  })();

  console.log('✓ Seluruh pengujian AuthService berhasil.');
}

if (typeof TestUtils !== 'undefined') {
  TestUtils.registerSuite('AuthService Test Suite', runAuthTests);
}
