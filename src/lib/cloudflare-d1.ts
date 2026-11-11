/**
 * Cloudflare D1 Database Integration Client
 * Database Name: sapa_pegawai
 * Database ID  : ad596f89-28c6-4266-ac02-90c60833b682
 * 
 * Manages schema synchronization, data pull/push, and direct SQL execution
 * with Cloudflare D1 (serverless SQLite on the edge).
 */

export interface D1Config {
  database_name: string;
  database_id: string;
  account_id: string;
  api_token: string;
}

export const DEFAULT_D1_CONFIG: D1Config = {
  database_name: "sapa_pegawai",
  database_id: "ad596f89-28c6-4266-ac02-90c60833b682",
  account_id: "be66d713872f04cf7066e1c62ddb2ff5",
  api_token: "cfut_yvaIxKQGIb18zMWfdSZ9ScxDXIszXvWuAvqcQawKfed1a415"
};

/**
 * Retrieve saved Cloudflare D1 configuration from localStorage or backend
 */
export function getLocalD1Config(): D1Config {
  if (typeof window === 'undefined') return DEFAULT_D1_CONFIG;
  try {
    const saved = localStorage.getItem('sapa_cloudflare_d1_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        database_name: parsed.database_name || DEFAULT_D1_CONFIG.database_name,
        database_id: parsed.database_id || DEFAULT_D1_CONFIG.database_id,
        account_id: parsed.account_id || DEFAULT_D1_CONFIG.account_id,
        api_token: parsed.api_token || DEFAULT_D1_CONFIG.api_token
      };
    }
  } catch (e) {
    console.warn("Failed to read local D1 config:", e);
  }
  return DEFAULT_D1_CONFIG;
}

/**
 * Save Cloudflare D1 configuration locally and synchronize with server proxy
 */
export async function saveLocalD1Config(config: Partial<D1Config>): Promise<D1Config> {
  const current = getLocalD1Config();
  const updated: D1Config = {
    ...current,
    ...config,
    database_name: config.database_name || current.database_name || "sapa_pegawai",
    database_id: config.database_id || current.database_id || "ad596f89-28c6-4266-ac02-90c60833b682"
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem('sapa_cloudflare_d1_config', JSON.stringify(updated));
  }

  // Also push to backend proxy
  try {
    await fetch('/api/d1/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
  } catch (err) {
    console.warn("Failed to sync D1 config to server proxy:", err);
  }

  return updated;
}

/**
 * SQL Schema for Cloudflare D1 (SQLite Dialect)
 */
export const CLOUDFLARE_D1_SQL_SCHEMA = `-- ==============================================================================
-- DATABASE SCHEMA FOR CLOUDFLARE D1 (SQLITE)
-- Database Name: sapa_pegawai
-- Database ID  : ad596f89-28c6-4266-ac02-90c60833b682
-- Application  : SAPA pegawai UPT Puskesmas Sedau Kab. Lombok Barat
-- ==============================================================================

-- 1. Table Puskesmas
CREATE TABLE IF NOT EXISTS puskesmas (
    id INTEGER PRIMARY KEY,
    kode_puskesmas TEXT UNIQUE NOT NULL,
    nama_puskesmas TEXT NOT NULL,
    alamat TEXT,
    total_penduduk INTEGER DEFAULT 0
);

-- 2. Table Master Profesi SDMK
CREATE TABLE IF NOT EXISTS profesi_sdmk (
    id INTEGER PRIMARY KEY,
    nama_profesi TEXT NOT NULL
);

-- 3. Table Master Fitur Layanan Kepegawaian
CREATE TABLE IF NOT EXISTS fitur (
    id INTEGER PRIMARY KEY,
    nama_fitur TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    warning_threshold_bulan INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    konfigurasi_tambahan TEXT
);

-- 4. Table Master Dokumen Persyaratan
CREATE TABLE IF NOT EXISTS dokumen (
    id INTEGER PRIMARY KEY,
    nama_dokumen TEXT NOT NULL,
    kata_kunci_ocr TEXT NOT NULL
);

-- 5. Table Junction Syarat Fitur Map
CREATE TABLE IF NOT EXISTS syarat_fitur_map (
    id_fitur INTEGER NOT NULL,
    id_dokumen INTEGER NOT NULL,
    PRIMARY KEY (id_fitur, id_dokumen)
);

-- 6. Table ASN / Pegawai Profiles
CREATE TABLE IF NOT EXISTS asn_profiles (
    id INTEGER PRIMARY KEY,
    nip TEXT UNIQUE NOT NULL,
    nama_lengkap TEXT NOT NULL,
    gelar_belakang TEXT,
    id_puskesmas INTEGER,
    tanggal_lahir TEXT NOT NULL,
    golongan_ruang TEXT NOT NULL,
    tmt_pangkat_terakhir TEXT NOT NULL,
    tmt_berkala_terakhir TEXT NOT NULL,
    tmt_jabatan_terakhir TEXT NOT NULL,
    jenis_pegawai TEXT NOT NULL,
    jenjang_jafung TEXT,
    ak_integrasi_2022 REAL DEFAULT 0,
    sisa_cuti_tahunan INTEGER DEFAULT 12,
    status_kepegawaian TEXT NOT NULL,
    jenis_kelamin TEXT NOT NULL,
    status_pegawai_detail TEXT NOT NULL,
    id_profesi INTEGER,
    nomor_wa TEXT,

    -- PNS Details
    pangkat_nama TEXT,
    pns_jenis_kenaikan_pangkat TEXT,
    pns_masa_kerja_golongan TEXT,
    pns_tmt_golongan TEXT,
    pns_no_pertek_bkn TEXT,
    pns_tgl_pertek_bkn TEXT,
    pns_no_sk TEXT,
    pns_tgl_sk TEXT,
    pns_nama_jabatan TEXT,
    pns_jenis_jabatan TEXT,
    pns_jenis_mutasi TEXT,
    pns_tmt_jabatan TEXT,
    pns_instansi_kerja TEXT,
    pns_instansi_induk TEXT,
    pns_satker TEXT,
    pns_satker_induk TEXT,
    pns_unor TEXT,
    pns_unor_induk TEXT,
    pns_no_sk_jabatan TEXT,
    pns_tgl_sk_jabatan TEXT,
    pns_instansi_pembina TEXT,

    -- PPPK Details
    pppk_ni TEXT,
    pppk_no_perjanjian TEXT,
    pppk_tgl_perjanjian TEXT,
    pppk_tmt_perjanjian_mulai TEXT,
    pppk_tmt_perjanjian_selesai TEXT,
    pppk_tmt_golongan TEXT,
    pppk_no_sk TEXT,
    pppk_tgl_sk TEXT,
    pppk_instansi_kerja TEXT,
    pppk_instansi_induk TEXT,
    pppk_satker TEXT,
    pppk_unor TEXT,
    pppk_jabatan TEXT,
    pppk_golongan TEXT,

    -- PKWT / Non ASN
    nik TEXT,
    pkwt_tmt_sk TEXT,
    pkwt_no_sk_kontrak TEXT,
    pkwt_tgl_sk_kontrak TEXT,
    pkwt_masa_kerja TEXT,
    pkwt_pembiayaan TEXT,
    pkwt_jabatan TEXT,

    -- PPPK Paruh Waktu
    pppw_jumlah_jam_kerja_per_minggu INTEGER,
    pppw_surat_kesepakatan_file TEXT,

    -- STR & SIP
    no_str TEXT,
    tanggal_terbit_str TEXT,
    tanggal_akhir_str TEXT,
    is_str_seumur_hidup INTEGER DEFAULT 0,
    no_sip TEXT,
    tanggal_terbit_sip TEXT,
    tanggal_akhir_sip TEXT,

    -- KP4 / Model DK
    kp4_status_pernikahan TEXT,
    kp4_nik_pasangan TEXT,
    kp4_nama_pasangan TEXT,
    kp4_pasangan_asn INTEGER,
    kp4_pasangan_nip TEXT,
    kp4_pasangan_kerja_instansi TEXT,
    kp4_pasangan_tunjangan_diklaim INTEGER,
    kp4_tahun_validasi INTEGER,
    kp4_tanggal_validasi TEXT,
    kp4_berkas_file_name TEXT,
    kp4_berkas_file_path TEXT,
    kp4_daftar_anak TEXT
);

-- 7. Table Usulan Layanan Kepegawaian
CREATE TABLE IF NOT EXISTS usulan_layanan (
    id INTEGER PRIMARY KEY,
    id_fitur INTEGER,
    id_asn INTEGER,
    id_puskesmas_pengusul INTEGER,
    tanggal_pengusulan TEXT DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'Draft',
    catatan_perbaikan TEXT,
    file_sk_final TEXT
);

-- 8. Table Usulan Dokumen File
CREATE TABLE IF NOT EXISTS usulan_dokumen_file (
    id INTEGER PRIMARY KEY,
    id_usulan INTEGER,
    id_dokumen INTEGER,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
    ocr_status TEXT DEFAULT 'GENERIC_PASS',
    ocr_feedback_message TEXT,
    data_url TEXT,
    text_ocr_result TEXT
);

-- 9. Table Riwayat Angka Kredit
CREATE TABLE IF NOT EXISTS riwayat_ak (
    id INTEGER PRIMARY KEY,
    id_asn INTEGER,
    tahun_skp INTEGER NOT NULL,
    predikat_skp TEXT NOT NULL,
    ak_diperoleh REAL NOT NULL
);

-- 10. Table Laporan SDMK Bulanan
CREATE TABLE IF NOT EXISTS laporan_sdmk (
    id INTEGER PRIMARY KEY,
    id_puskesmas INTEGER NOT NULL,
    periode_bulan INTEGER NOT NULL,
    periode_tahun INTEGER NOT NULL,
    id_profesi INTEGER NOT NULL,
    pns_l INTEGER DEFAULT 0,
    pns_p INTEGER DEFAULT 0,
    p3k_pn_l INTEGER DEFAULT 0,
    p3k_pn_p INTEGER DEFAULT 0,
    p3k_pw_l INTEGER DEFAULT 0,
    p3k_pw_p INTEGER DEFAULT 0,
    non_asn_l INTEGER DEFAULT 0,
    non_asn_p INTEGER DEFAULT 0
);

-- 11. Table Arsip Kepegawaian
CREATE TABLE IF NOT EXISTS arsip_kepegawaian (
    id INTEGER PRIMARY KEY,
    id_asn INTEGER,
    nama_berkas TEXT NOT NULL,
    kategori_kelompok TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_at TEXT DEFAULT CURRENT_TIMESTAMP,
    source TEXT DEFAULT 'Upload Kerja',
    notes TEXT,
    str_expired_date TEXT,
    pkwt_tahun INTEGER
);

-- 12. Table Users login & roles
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    nip TEXT UNIQUE NOT NULL,
    nama_lengkap TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin_puskesmas',
    id_puskesmas INTEGER,
    username TEXT UNIQUE,
    password TEXT,
    nomor_wa TEXT
);

-- Indexes for high-speed queries
CREATE INDEX IF NOT EXISTS idx_asn_nip ON asn_profiles(nip);
CREATE INDEX IF NOT EXISTS idx_asn_puskesmas ON asn_profiles(id_puskesmas);
CREATE INDEX IF NOT EXISTS idx_usulan_asn ON usulan_layanan(id_asn);
CREATE INDEX IF NOT EXISTS idx_usulan_status ON usulan_layanan(status);
CREATE INDEX IF NOT EXISTS idx_laporan_sdmk_period ON laporan_sdmk(periode_tahun, periode_bulan);
CREATE INDEX IF NOT EXISTS idx_arsip_asn ON arsip_kepegawaian(id_asn);

-- Master Puskesmas Seed
INSERT OR IGNORE INTO puskesmas (id, kode_puskesmas, nama_puskesmas, alamat) VALUES
(100, 'P520106', 'UPT Puskesmas Sedau', 'Jl. Raya Sedau, Kec. Narmada, Kab. Lombok Barat'),
(1, 'P520101', 'Puskesmas Gerung', 'Jl. Ki Hajar Dewantara No. 12, Gerung, Lombok Barat'),
(2, 'P520102', 'Puskesmas Narmada', 'Jl. Raya Narmada No. 45, Narmada, Lombok Barat'),
(3, 'P520103', 'Puskesmas Kediri', 'Jl. TGH Abdul Karim, Kediri, Lombok Barat'),
(4, 'P520104', 'Puskesmas Gunungsari', 'Jl. Raya Gunungsari No. 8, Gunungsari, Lombok Barat'),
(5, 'P520105', 'Puskesmas Lingsar', 'Jl. Raya Lingsar, Lingsar, Lombok Barat');

-- Master Rumpun Profesi Seed
INSERT OR IGNORE INTO profesi_sdmk (id, nama_profesi) VALUES
(1, 'Perawat'),
(2, 'Dokter'),
(3, 'Dokter Gigi'),
(4, 'Bidan'),
(5, 'Apoteker'),
(6, 'Tenaga Teknik Kefarmasian'),
(7, 'Tenaga Promosi Kesehatan & Ilmu Perilaku'),
(8, 'Sanitarian (Kesehatan Lingkungan)'),
(9, 'Nutrisionis (Tenaga Gizi)'),
(10, 'Ahli Teknologi Laboratorium Medik'),
(11, 'Tenaga Rekam Medis & Informasi Kes.'),
(12, 'Terapis Gigi & Mulut'),
(13, 'Administrasi Umum & Kepegawaian'),
(14, 'Tenaga Adm. Keuangan'),
(15, 'Tenaga Sistem Informasi Kesehatan');

-- Master Fitur Layanan Kepegawaian Seed
INSERT OR IGNORE INTO fitur (id, nama_fitur, slug, warning_threshold_bulan, is_active, konfigurasi_tambahan) VALUES
(1, 'Kenaikan Pangkat', 'kenaikan-pangkat', 4, 1, 'Kenaikan Golongan Ruang PNS Berdasar Masa Kerja dan Kinerja'),
(2, 'Pensiun', 'pensiun', 6, 1, 'Usulan Pensiun Pegawai Negeri Sipil'),
(3, 'Usul Gaji Berkala', 'gaji-berkala', 2, 1, 'Kenaikan Gaji Berkala Periodik (Setiap 2 Tahun sekali)'),
(4, 'Cuti Kepegawaian', 'cuti', 0, 1, 'Pengurangan Sisa Hari Hak Cuti Tahunan Pegawai'),
(5, 'Izin Belajar', 'izin-belajar', 0, 1, 'Persetujuan Melanjutkan Pendidikan Formal bagi PNS/TKN'),
(6, 'Mutasi Internal', 'mutasi', 0, 1, 'Alih Tugas Penempatan Pelayanan Puskesmas Lombok Barat'),
(7, 'Pencantuman Gelar', 'pencantuman-gelar', 0, 1, 'Penyetaraan Ijazah Pendidikan Formal Tenaga Kesehatan di SAPA'),
(8, 'Uji Kompetensi', 'uji-kompetensi', 0, 1, 'Sertifikasi Jenjang Tingkat Karir ASN'),
(9, 'Usulan Jafung & Angka Kredit', 'usulan-jafung', 0, 1, 'Sertifikasi Jenjang Fungsional Baru (Uji Kompetensi BKN)'),
(11, 'Pelaporan Keadaan SDMK Bulanan', 'keadaan-sdmk', 0, 1, 'Rekapitulasi SDMK Bulanan');

-- Master Dokumen Persyaratan Seed
INSERT OR IGNORE INTO dokumen (id, nama_dokumen, kata_kunci_ocr) VALUES
(1, 'Surat Pengantar Kepala Puskesmas', 'SURAT PENGANTAR, KEPALA PUSKESMAS, DINKES'),
(2, 'SK Pangkat Terakhir', 'KEPUTUSAN BUPATI, KENAIKAN PANGKAT, GOLONGAN'),
(3, 'PAK (Penetapan Angka Kredit)', 'ANGKA KREDIT, KOMULATIF, JAFUNG, JABATAN'),
(4, 'Penilaian Prestasi Kerja (SKP) 2 Tahun', 'SASARAN KINERJA PEGAWAI, PRESTASI KERJA, BAIK'),
(5, 'Surat Permohonan Pensiun', 'PERMOHONAN PENSIUN, APS, BUP, KELUARGA'),
(6, 'Data Riwayat Hidup / Buku Nikah', 'DAFTAR RIWAYAT HIDUP, NIKAH, KELUARGA, ANAK'),
(7, 'SK Kenaikan Gaji Berkala Terakhir', 'GAJI BERKALA, GAJI POKOK, TMT BERKALA'),
(8, 'Surat Permohonan Cuti', 'PERMOHONAN CUTI, TAHUNAN, SAKIT, ALASAN PENTING'),
(9, 'Rekomendasi Mutasi', 'REKOMENDASI MUTASI, PERSETUJUAN KEPALA, PINDAH'),
(10, 'Ijazah Baru / Transkrip Nilai', 'IJAZAH, GELAR AKADEMIK, SARJANA, DIPLOMA'),
(11, 'Sertifikat Kelulusan Uji Kompetensi', 'SERTIFIKAT KELULUSAN, UJI KOMPETENSI, UKOM, JAFUNG');

-- Junction Syarat Fitur Map Seed
INSERT OR IGNORE INTO syarat_fitur_map (id_fitur, id_dokumen) VALUES
(1, 1), (1, 2), (1, 3), (1, 4),
(2, 1), (2, 5), (2, 6),
(3, 1), (3, 7),
(4, 1), (4, 8),
(5, 1), (5, 10),
(6, 1), (6, 9),
(7, 1), (7, 10),
(8, 1), (8, 11),
(9, 1), (9, 3), (9, 4), (9, 11);

-- Default Admin User Seed
INSERT OR IGNORE INTO users (id, nip, nama_lengkap, role, id_puskesmas, username, password, nomor_wa) VALUES
(1, '198203152006041005', 'Administrator UPT Puskesmas Sedau', 'admin_dinkes', 100, 'admin_sedau', 'admin123', '081234567890'),
(2, '198705202011012010', 'Pengelola Kepegawaian Sedau', 'admin_dinkes', 100, 'kepegawaian', 'sedau2026', '081234567891');
`;

/**
 * Test connectivity with Cloudflare D1
 */
export async function testD1Connection(): Promise<{ success: boolean; message: string; mode: string; details?: any }> {
  try {
    const config = getLocalD1Config();
    const res = await fetch('/api/d1/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });

    const data = await res.json();
    if (res.ok && data.success) {
      return {
        success: true,
        message: `⚡ Terhubung ke Cloudflare D1! Database: ${config.database_name} (${config.database_id}) siap digunakan.`,
        mode: "LIVE",
        details: data
      };
    } else {
      return {
        success: false,
        message: data.message || data.error || `Koneksi ke Cloudflare D1 (${config.database_name}) belum terkonfigurasi.`,
        mode: data.needs_credentials ? "CREDENTIALS_NEEDED" : "ERROR",
        details: data
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Gagal menghubungi server proxy D1: ${err?.message || err}. Menggunakan Offline Mode.`,
      mode: "OFFLINE"
    };
  }
}

/**
 * Execute raw SQL query against Cloudflare D1
 */
export async function executeD1Sql(sql: string, params: any[] = []): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const config = getLocalD1Config();
    const res = await fetch('/api/d1/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...config, sql, params })
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Send full D1 schema SQL to Cloudflare D1
 */
export async function migrateD1Schema(): Promise<{ success: boolean; log: string[] }> {
  const logs: string[] = [];
  logs.push("⏳ Mengirim seluruh skema SQL Cloudflare D1 ke database 'sapa_pegawai' (ad596f89-28c6-4266-ac02-90c60833b682)...");

  try {
    const config = getLocalD1Config();
    const res = await fetch('/api/d1/migrate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...config,
        sql: CLOUDFLARE_D1_SQL_SCHEMA
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      logs.push("✅ Berhasil mengirim dan membuat seluruh tabel di Cloudflare D1:");
      logs.push("   - puskesmas, profesi_sdmk, fitur, dokumen, syarat_fitur_map");
      logs.push("   - asn_profiles, usulan_layanan, usulan_dokumen_file, riwayat_ak");
      logs.push("   - laporan_sdmk, arsip_kepegawaian, users");
      logs.push("✅ Data master & seed awal (UPT Puskesmas Sedau) siap.");
      return { success: true, log: logs };
    } else {
      logs.push(`❌ Gagal migrasi skema Cloudflare D1: ${data.message || data.error || 'Unknown error'}`);
      if (data.needs_credentials) {
        logs.push("💡 Catatan: Cloudflare API Token dan Account ID diperlukan untuk mengirim langsung dari server.");
      }
      return { success: false, log: logs };
    }
  } catch (err: any) {
    logs.push(`❌ Kesalahan jaringan saat migrasi D1: ${err?.message || err}`);
    return { success: false, log: logs };
  }
}

/**
 * Pull live data from Cloudflare D1 database into client state
 */
export async function pullCloudDataFromD1(): Promise<{ success: boolean; data?: any; log: string[] }> {
  const logs: string[] = [];
  logs.push("⏳ Menarik seluruh data tabel dari Cloudflare D1 (sapa_pegawai)...");

  try {
    const config = getLocalD1Config();
    const res = await fetch('/api/d1/pull', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    });

    const result = await res.json();
    if (res.ok && result.success && result.data) {
      logs.push("✅ Berhasil menarik data lengkap dari Cloudflare D1:");
      logs.push(`   • ${result.data.asnProfiles?.length || 0} Biografi Pegawai`);
      logs.push(`   • ${result.data.puskesmas?.length || 0} Unit Kerja Puskesmas`);
      logs.push(`   • ${result.data.usulanLayanan?.length || 0} Usulan Layanan Kepegawaian`);
      logs.push(`   • ${result.data.arsipKepegawaian?.length || 0} Arsip Digital Pegawai`);
      return { success: true, data: result.data, log: logs };
    } else {
      logs.push(`⚠️ Cloudflare D1 belum terisi atau tabel belum ada: ${result.message || result.error || 'Empty'}`);
      return { success: false, log: logs };
    }
  } catch (err: any) {
    logs.push(`❌ Gagal menarik data dari Cloudflare D1: ${err?.message || err}`);
    return { success: false, log: logs };
  }
}

/**
 * Push client data to Cloudflare D1
 */
export async function pushClientDataToD1(dbState: any, keysToSync?: string[]): Promise<{ success: boolean; log: string[] }> {
  const logs: string[] = [];
  logs.push("⏳ Memulai sinkronisasi data ke Cloudflare D1 (sapa_pegawai)...");

  // Read latest state. If dbState is passed directly, use it priority-wise
  let latestDb: any = {};
  if (typeof window !== 'undefined') {
    try {
      latestDb = {
        puskesmas: JSON.parse(localStorage.getItem('simpeg_puskesmas') || '[]'),
        fitur: JSON.parse(localStorage.getItem('simpeg_fitur') || '[]'),
        dokumen: JSON.parse(localStorage.getItem('simpeg_dokumen') || '[]'),
        syaratFiturMap: JSON.parse(localStorage.getItem('simpeg_syarat_fitur_map') || '{}'),
        asnProfiles: JSON.parse(localStorage.getItem('simpeg_asn_profiles') || '[]'),
        usulanLayanan: JSON.parse(localStorage.getItem('simpeg_usulan_layanan') || '[]'),
        riwayatAk: JSON.parse(localStorage.getItem('simpeg_riwayat_ak') || '[]'),
        laporanSdmk: JSON.parse(localStorage.getItem('simpeg_laporan_sdmk') || '[]'),
        profesiSdmk: JSON.parse(localStorage.getItem('simpeg_profesi_sdmk') || '[]'),
        usulanDokumenFile: JSON.parse(localStorage.getItem('simpeg_usulan_dokumen_file') || '[]'),
        arsipKepegawaian: JSON.parse(localStorage.getItem('simpeg_arsip_kepegawaian') || '[]'),
        users: JSON.parse(localStorage.getItem('simpeg_users') || '[]')
      };
    } catch (_e) {
      latestDb = {};
    }
  }

  // Merge explicitly passed dbState so fresh in-memory data (like uploads) is never lost
  if (dbState && typeof dbState === 'object') {
    latestDb = {
      ...latestDb,
      ...dbState
    };
  }

  try {
    const config = getLocalD1Config();
    const res = await fetch('/api/d1/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...config,
        dbState: latestDb,
        keysToSync
      })
    });

    const result = await res.json();
    if (res.ok && result.success) {
      logs.push("✅ Berhasil mengirim dan menyinkronkan data ke Cloudflare D1 (sapa_pegawai).");
      if (result.log) logs.push(...result.log);
      return { success: true, log: logs };
    } else {
      logs.push(`⚠️ Push ke Cloudflare D1: ${result.message || result.error || 'Perlu konfigurasi kredensial Cloudflare API'}`);
      if (result.log) logs.push(...result.log);
      return { success: result.success || false, log: logs };
    }
  } catch (err: any) {
    logs.push(`❌ Gagal menghubungi server proxy D1: ${err?.message || err}`);
    return { success: false, log: logs };
  }
}
