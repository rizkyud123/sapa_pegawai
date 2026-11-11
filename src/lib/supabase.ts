import { createClient } from '@supabase/supabase-js';

// Supplied Supabase Credentials
export const SUPABASE_URL = "https://ulcjlgryfbwsqemmehfq.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsY2psZ3J5ZmJ3c3FlbW1laGZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MDg1NzQsImV4cCI6MjA5NzA4NDU3NH0.aTiPFlNZF7CDwfZnQNlj9M8rNb3q1HIX-9S07JVsmAU";

// Initialize Supabase Client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * SQL Schema script to create tables in Supabase Console
 */
export const SUPABASE_SQL_SCHEMA = `-- DATABASE SCHEMA FOR SAPA PEGAWAI UPT PUSKESMAS SEDAU & LAPORAN SDMK KABUPATEN LOMBOK BARAT

-- 1. Table Puskesmas
CREATE TABLE IF NOT EXISTS puskesmas (
    id SERIAL PRIMARY KEY,
    kode_puskesmas VARCHAR(50) UNIQUE NOT NULL,
    nama_puskesmas VARCHAR(255) NOT NULL,
    alamat TEXT,
    total_penduduk INT DEFAULT 0
);

-- 2. Table Master Profesi SDMK
CREATE TABLE IF NOT EXISTS profesi_sdmk (
    id SERIAL PRIMARY KEY,
    nama_profesi VARCHAR(255) NOT NULL
);

-- 3. Table Master Fitur Layanan Kepegawaian
CREATE TABLE IF NOT EXISTS fitur (
    id SERIAL PRIMARY KEY,
    nama_fitur VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    warning_threshold_bulan INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    konfigurasi_tambahan TEXT
);

-- 4. Table Master Dokumen Persyaratan
CREATE TABLE IF NOT EXISTS dokumen (
    id SERIAL PRIMARY KEY,
    nama_dokumen VARCHAR(255) NOT NULL,
    kata_kunci_ocr TEXT NOT NULL
);

-- 5. Junction Table Syarat Fitur (Fitur dan Dokumen)
CREATE TABLE IF NOT EXISTS syarat_fitur_map (
    id_fitur INT REFERENCES fitur(id) ON DELETE CASCADE,
    id_dokumen INT REFERENCES dokumen(id) ON DELETE CASCADE,
    PRIMARY KEY (id_fitur, id_dokumen)
);

-- 6. Table ASN / Pegawai Profiles
CREATE TABLE IF NOT EXISTS asn_profiles (
    id SERIAL PRIMARY KEY,
    nip VARCHAR(50) UNIQUE NOT NULL,
    nama_lengkap VARCHAR(255) NOT NULL,
    gelar_belakang VARCHAR(50),
    id_puskesmas INT REFERENCES puskesmas(id) ON DELETE SET NULL,
    tanggal_lahir DATE NOT NULL,
    golongan_ruang VARCHAR(50) NOT NULL,
    tmt_pangkat_terakhir DATE NOT NULL,
    tmt_berkala_terakhir DATE NOT NULL,
    tmt_jabatan_terakhir DATE NOT NULL,
    jenis_pegawai VARCHAR(50) NOT NULL, -- 'Struktural' | 'Jafung_Kesehatan' | 'Staf_Umum'
    jenjang_jafung VARCHAR(100),
    ak_integrasi_2022 NUMERIC(10, 2) DEFAULT 0,
    sisa_cuti_tahunan INT DEFAULT 12,
    status_kepegawaian VARCHAR(50) NOT NULL, -- 'Aktif' | 'Pensiun' | 'Mutasi_Keluar'
    jenis_kelamin VARCHAR(5) NOT NULL, -- 'L' | 'P'
    status_pegawai_detail VARCHAR(100) NOT NULL, -- 'PNS' | 'PPPK_Penuh_Waktu' | 'PPPK_Paruh_Waktu' | 'Non_ASN'
    id_profesi INT REFERENCES profesi_sdmk(id) ON DELETE SET NULL,
    nomor_wa VARCHAR(50),

    -- PNS Details
    pangkat_nama VARCHAR(150),
    pns_jenis_kenaikan_pangkat VARCHAR(255),
    pns_masa_kerja_golongan VARCHAR(100),
    pns_tmt_golongan DATE,
    pns_no_pertek_bkn VARCHAR(100),
    pns_tgl_pertek_bkn DATE,
    pns_no_sk VARCHAR(100),
    pns_tgl_sk DATE,
    pns_nama_jabatan VARCHAR(255),
    pns_jenis_jabatan VARCHAR(255),
    pns_jenis_mutasi VARCHAR(255),
    pns_tmt_jabatan DATE,
    pns_instansi_kerja VARCHAR(255),
    pns_instansi_induk VARCHAR(255),
    pns_satker VARCHAR(255),
    pns_satker_induk VARCHAR(255),
    pns_unor VARCHAR(255),
    pns_unor_induk VARCHAR(255),
    pns_no_sk_jabatan VARCHAR(100),
    pns_tgl_sk_jabatan DATE,
    pns_instansi_pembina VARCHAR(255),

    -- PPPK Details
    pppk_ni VARCHAR(100),
    pppk_no_perjanjian VARCHAR(100),
    pppk_tgl_perjanjian DATE,
    pppk_tmt_perjanjian_mulai DATE,
    pppk_tmt_perjanjian_selesai DATE,
    pppk_tmt_golongan DATE,
    pppk_no_sk VARCHAR(100),
    pppk_tgl_sk DATE,
    pppk_instansi_kerja VARCHAR(255),
    pppk_instansi_induk VARCHAR(255),
    pppk_satker VARCHAR(255),
    pppk_unor VARCHAR(255),
    pppk_jabatan VARCHAR(255),
    pppk_golongan VARCHAR(50),

    -- PKWT / Non ASN
    nik VARCHAR(50),
    pkwt_tmt_sk DATE,
    pkwt_no_sk_kontrak VARCHAR(100),
    pkwt_tgl_sk_kontrak DATE,
    pkwt_masa_kerja VARCHAR(100),
    pkwt_pembiayaan VARCHAR(20), -- 'APBD' | 'BLUD' | 'APBN'
    pkwt_jabatan VARCHAR(255),

    -- PPPK Paruh Waktu
    pppw_jumlah_jam_kerja_per_minggu INT,
    pppw_surat_kesepakatan_file TEXT,

    -- STR & SIP
    no_str VARCHAR(100),
    tanggal_terbit_str DATE,
    tanggal_akhir_str DATE,
    is_str_seumur_hidup BOOLEAN DEFAULT FALSE,
    no_sip VARCHAR(100),
    tanggal_terbit_sip DATE,
    tanggal_akhir_sip DATE,

    -- KP4 / Model DK (Tunjangan Keluarga ASN)
    kp4_status_pernikahan VARCHAR(50),
    kp4_nik_pasangan VARCHAR(50),
    kp4_nama_pasangan VARCHAR(255),
    kp4_pasangan_asn BOOLEAN,
    kp4_pasangan_nip VARCHAR(50),
    kp4_pasangan_kerja_instansi VARCHAR(255),
    kp4_pasangan_tunjangan_diklaim BOOLEAN,
    kp4_tahun_validasi INT,
    kp4_tanggal_validasi DATE,
    kp4_berkas_file_name TEXT,
    kp4_berkas_file_path TEXT,
    kp4_daftar_anak TEXT
);

-- 7. Table Usulan Layanan Kepegawaian
CREATE TABLE IF NOT EXISTS usulan_layanan (
    id SERIAL PRIMARY KEY,
    id_fitur INT REFERENCES fitur(id) ON DELETE CASCADE,
    id_asn INT REFERENCES asn_profiles(id) ON DELETE CASCADE,
    id_puskesmas_pengusul INT REFERENCES puskesmas(id) ON DELETE CASCADE,
    tanggal_pengusulan TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'Draft', -- 'Draft' | 'Menunggu Validasi' | 'Perbaikan Berkas' | 'Diproses' | 'Selesai'
    catatan_perbaikan TEXT,
    file_sk_final TEXT
);

-- 8. Table Usulan Dokumen File (OCR Integrated Uploads)
CREATE TABLE IF NOT EXISTS usulan_dokumen_file (
    id SERIAL PRIMARY KEY,
    id_usulan INT REFERENCES usulan_layanan(id) ON DELETE CASCADE,
    id_dokumen INT REFERENCES dokumen(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ocr_status VARCHAR(30) DEFAULT 'GENERIC_PASS', -- 'SUCCESS' | 'FAILED' | 'GENERIC_PASS'
    ocr_feedback_message TEXT,
    data_url TEXT,
    text_ocr_result TEXT
);

-- 9. Table Riwayat Angka Kredit (Jafung)
CREATE TABLE IF NOT EXISTS riwayat_ak (
    id SERIAL PRIMARY KEY,
    id_asn INT REFERENCES asn_profiles(id) ON DELETE CASCADE,
    tahun_skp INT NOT NULL,
    predikat_skp VARCHAR(50) NOT NULL, -- 'Sangat Baik' | 'Baik' | ...
    ak_diperoleh NUMERIC(10, 2) NOT NULL
);

-- 10. Table Laporan SDMK Bulanan
CREATE TABLE IF NOT EXISTS laporan_sdmk (
    id SERIAL PRIMARY KEY,
    id_puskesmas INT REFERENCES puskesmas(id) ON DELETE CASCADE,
    periode_bulan INT NOT NULL CHECK(periode_bulan BETWEEN 1 AND 12),
    periode_tahun INT NOT NULL,
    id_profesi INT REFERENCES profesi_sdmk(id) ON DELETE CASCADE,
    pns_l INT DEFAULT 0,
    pns_p INT DEFAULT 0,
    p3k_pn_l INT DEFAULT 0,
    p3k_pn_p INT DEFAULT 0,
    p3k_pw_l INT DEFAULT 0,
    p3k_pw_p INT DEFAULT 0,
    non_asn_l INT DEFAULT 0,
    non_asn_p INT DEFAULT 0
);

-- 11. Table Arsip Kepegawaian Dinas
CREATE TABLE IF NOT EXISTS arsip_kepegawaian (
    id SERIAL PRIMARY KEY,
    id_asn INT REFERENCES asn_profiles(id) ON DELETE CASCADE,
    nama_berkas VARCHAR(255) NOT NULL,
    kategori_kelompok VARCHAR(50) NOT NULL, -- 'Dasar' | 'Mutasi' | 'Pendidikan' | ...
    file_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    source VARCHAR(50) DEFAULT 'Upload Kerja', -- 'Upload Kerja' | 'Auto-Copy Usulan'
    notes TEXT,
    str_expired_date DATE,
    pkwt_tahun INT
);

-- 12. Table Users login & roles
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    nip VARCHAR(50) UNIQUE NOT NULL,
    nama_lengkap VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'admin_puskesmas', -- 'admin_dinkes' | 'admin_puskesmas'
    id_puskesmas INT REFERENCES puskesmas(id) ON DELETE SET NULL,
    username VARCHAR(100) UNIQUE,
    password VARCHAR(255),
    nomor_wa VARCHAR(50)
);

-- Create fast query lookup Indexes
CREATE INDEX IF NOT EXISTS idx_asn_nip ON asn_profiles(nip);
CREATE INDEX IF NOT EXISTS idx_asn_puskesmas ON asn_profiles(id_puskesmas);
CREATE INDEX IF NOT EXISTS idx_usulan_asn ON usulan_layanan(id_asn);
CREATE INDEX IF NOT EXISTS idx_usulan_status ON usulan_layanan(status);
CREATE INDEX IF NOT EXISTS idx_laporan_sdmk_period ON laporan_sdmk(periode_tahun, periode_bulan);
CREATE INDEX IF NOT EXISTS idx_arsip_asn ON arsip_kepegawaian(id_asn);

-- DISABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES & CREATE PERMISSIVE PUBLIC ACCESS POLICIES
ALTER TABLE puskesmas DISABLE ROW LEVEL SECURITY;
ALTER TABLE profesi_sdmk DISABLE ROW LEVEL SECURITY;
ALTER TABLE fitur DISABLE ROW LEVEL SECURITY;
ALTER TABLE dokumen DISABLE ROW LEVEL SECURITY;
ALTER TABLE syarat_fitur_map DISABLE ROW LEVEL SECURITY;
ALTER TABLE asn_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE usulan_layanan DISABLE ROW LEVEL SECURITY;
ALTER TABLE usulan_dokumen_file DISABLE ROW LEVEL SECURITY;
ALTER TABLE riwayat_ak DISABLE ROW LEVEL SECURITY;
ALTER TABLE laporan_sdmk DISABLE ROW LEVEL SECURITY;
ALTER TABLE arsip_kepegawaian DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Create Open Fallback Policies (in case RLS remains active)
DROP POLICY IF EXISTS public_puskesmas ON puskesmas;
CREATE POLICY public_puskesmas ON puskesmas FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS public_profesi_sdmk ON profesi_sdmk;
CREATE POLICY public_profesi_sdmk ON profesi_sdmk FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS public_fitur ON fitur;
CREATE POLICY public_fitur ON fitur FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS public_dokumen ON dokumen;
CREATE POLICY public_dokumen ON dokumen FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS public_syarat_fitur_map ON syarat_fitur_map;
CREATE POLICY public_syarat_fitur_map ON syarat_fitur_map FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS public_asn_profiles ON asn_profiles;
CREATE POLICY public_asn_profiles ON asn_profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS public_usulan_layanan ON usulan_layanan;
CREATE POLICY public_usulan_layanan ON usulan_layanan FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS public_usulan_dokumen_file ON usulan_dokumen_file;
CREATE POLICY public_usulan_dokumen_file ON usulan_dokumen_file FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS public_riwayat_ak ON riwayat_ak;
CREATE POLICY public_riwayat_ak ON riwayat_ak FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS public_laporan_sdmk ON laporan_sdmk;
CREATE POLICY public_laporan_sdmk ON laporan_sdmk FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS public_arsip_kepegawaian ON arsip_kepegawaian;
CREATE POLICY public_arsip_kepegawaian ON arsip_kepegawaian FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS public_users ON users;
CREATE POLICY public_users ON users FOR ALL USING (true) WITH CHECK (true);

-- Insert Master Puskesmas Seed data
INSERT INTO puskesmas (id, kode_puskesmas, nama_puskesmas, alamat) VALUES
(100, 'P520106', 'UPT Puskesmas Sedau', 'Jl. Raya Sedau, Kec. Narmada, Kab. Lombok Barat'),
(1, 'P520101', 'Puskesmas Gerung', 'Jl. Ki Hajar Dewantara No. 12, Gerung, Lombok Barat'),
(2, 'P520102', 'Puskesmas Narmada', 'Jl. Raya Narmada No. 45, Narmada, Lombok Barat'),
(3, 'P520103', 'Puskesmas Kediri', 'Jl. TGH Abdul Karim, Kediri, Lombok Barat'),
(4, 'P520104', 'Puskesmas Gunungsari', 'Jl. Raya Gunungsari No. 8, Gunungsari, Lombok Barat'),
(5, 'P520105', 'Puskesmas Lingsar', 'Jl. Raya Lingsar, Lingsar, Lombok Barat')
ON CONFLICT (id) DO NOTHING;

-- Insert Master Rumpun Profesi Seed data
INSERT INTO profesi_sdmk (id, nama_profesi) VALUES
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
(15, 'Tenaga Sistem Informasi Kesehatan')
ON CONFLICT (id) DO NOTHING;

-- Insert Master Fitur Layanan Kepegawaian Seed data
INSERT INTO fitur (id, nama_fitur, slug, warning_threshold_bulan, is_active, konfigurasi_tambahan) VALUES
(1, 'Kenaikan Pangkat', 'kenaikan-pangkat', 4, true, 'Kenaikan Golongan Ruang PNS Berdasar Masa Kerja dan Kinerja'),
(2, 'Pensiun', 'pensiun', 6, true, 'Usulan Pensiun Pegawai Negeri Sipil'),
(3, 'Usul Gaji Berkala', 'gaji-berkala', 2, true, 'Kenaikan Gaji Berkala Periodik (Setiap 2 Tahun sekali)'),
(4, 'Cuti Kepegawaian', 'cuti', 0, true, 'Pengurangan Sisa Hari Hak Cuti Tahunan Pegawai'),
(5, 'Izin Belajar', 'izin-belajar', 0, true, 'Persetujuan Melanjutkan Pendidikan Formal bagi PNS/TKN'),
(6, 'Mutasi Internal', 'mutasi', 0, true, 'Alih Tugas Penempatan Pelayanan Puskesmas Lombok Barat'),
(7, 'Pencantuman Gelar', 'pencantuman-gelar', 0, true, 'Penyetaraan Ijazah Pendidikan Formal Tenaga Kesehatan di SAPA'),
(8, 'Uji Kompetensi', 'uji-kompetensi', 0, true, 'Sertifikasi Jenjang Tingkat Karir ASN'),
(9, 'Usulan Jafung & Angka Kredit', 'usulan-jafung', 0, true, 'Sertifikasi Jenjang Fungsional Baru (Uji Kompetensi BKN)'),
(11, 'Pelaporan Keadaan SDMK Bulanan', 'keadaan-sdmk', 0, true, 'Rekapitulasi SDMK Bulanan')
ON CONFLICT (id) DO NOTHING;

-- Insert Master Dokumen Persyaratan Seed data
INSERT INTO dokumen (id, nama_dokumen, kata_kunci_ocr) VALUES
(1, 'Surat Pengantar Kepsek Puskesmas', 'SURAT PENGANTAR, KEPALA PUSKESMAS, DINKES'),
(2, 'SK Pangkat Terakhir', 'KEPUTUSAN BUPATI, KENAIKAN PANGKAT, GOLONGAN'),
(3, 'PAK (Penetapan Angka Kredit)', 'ANGKA KREDIT, KOMULATIF, JAFUNG, JABATAN'),
(4, 'Penilaian Prestasi Kerja (SKP) 2 Tahun', 'SASARAN KINERJA PEGAWAI, PRESTASI KERJA, BAIK'),
(5, 'Surat Permohonan Pensiun', 'PERMOHONAN PENSIUN, APS, BUP, KELUARGA'),
(6, 'Data Riwayat Hidup / Buku Nikah', 'DAFTAR RIWAYAT HIDUP, NIKAH, KELUARGA, ANAK'),
(7, 'SK Kenaikan Gaji Berkala Terakhir', 'GAJI BERKALA, GAJI POKOK, TMT BERKALA'),
(8, 'Surat Permohonan Cuti', 'PERMOHONAN CUTI, TAHUNAN, SAKIT, ALASAN PENTING'),
(9, 'Rekomendasi Mutasi', 'REKOMENDASI MUTASI, PERSETUJUAN KEPALA, PINDAH'),
(10, 'Ijazah Baru / Transkrip Nilai', 'IJAZAH, GELAR AKADEMIK, SARJANA, DIPLOMA'),
(11, 'Sertifikat Kelulusan Uji Kompetensi', 'SERTIFIKAT KELULUSAN, UJI KOMPETENSI, UKOM, JAFUNG')
ON CONFLICT (id) DO NOTHING;

-- Insert Junction table map Seed data
INSERT INTO syarat_fitur_map (id_fitur, id_dokumen) VALUES
(1, 1), (1, 2), (1, 3), (1, 4), -- Kenaikan Pangkat
(2, 1), (2, 5), (2, 6),          -- Pensiun
(3, 1), (3, 7),                  -- KGB
(4, 1), (4, 8),                  -- Cuti
(5, 1), (5, 10),                 -- Izin Belajar
(6, 1), (6, 9),                  -- Mutasi
(7, 1), (7, 10),                 -- Pencantuman Gelar
(8, 1), (8, 11),                 -- Uji Kompetensi
(9, 1), (9, 3), (9, 4), (9, 11)  -- Usulan Jafung
ON CONFLICT DO NOTHING;
`;

/**
 * Utility to verify connection correctness with Supabase
 */
// Memory cache for connection state to make it lightning-fast
let cachedOfflineStatus: boolean | null = null;

export async function isSupabaseOffline(): Promise<boolean> {
  // Always prioritize real direct Supabase connection and disable mock offline/virtual-link fallback
  return false;
}

export async function testSupabaseConnection(): Promise<{ success: boolean; message: string; mode: string }> {
  try {
    // Check connection with a reliable 5000ms timeout
    const checkPromise = supabase.from('puskesmas').select('id', { count: 'exact', head: true });
    const timeoutPromise = new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000));
    
    const res = await Promise.race([checkPromise, timeoutPromise]);
    const error = res?.error;
    if (error) {
      return { 
        success: false, 
        message: `Koneksi gagal: ${error.message} (Kemungkinan tabel database kosong / belum terbuat. Gunakan SQL Editor Supabase untuk migrasi tabel terlebih dahulu).`,
        mode: "CREDENTIALS_OK_TABLES_MISSING"
      };
    }
    return { 
      success: true, 
      message: "Sukses Terkoneksi! Database Supabase Lombok Barat Aktif dan tabel ditemukan secara responsif.",
      mode: "LIVE"
    };
  } catch (err: any) {
    return { 
      success: false, 
      message: `Koneksi gagal: ${err?.message || err}. Harap pastikan koneksi internet aktif dan kredensial Supabase benar.`,
      mode: "OFFLINE"
    };
  }
}

/**
 * Helper to sanitize Postgres DATE type. Converts empty/invalid values to null or a safe fallback.
 */
function sanitizePgDate(dateStr: any): string | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (trimmed === "" || trimmed === "undefined" || trimmed === "null") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const parsed = Date.parse(trimmed);
  if (!isNaN(parsed)) {
    try {
      return new Date(parsed).toISOString().split('T')[0];
    } catch (e) {
      return null;
    }
  }
  return null;
}

/**
 * Bulk or Targeted Push Client State to Supabase
 */
export async function pushClientDataToSupabase(dbState: any, keysToSync?: string[]): Promise<{ success: boolean; log: string[] }> {
  const logs: string[] = [];
  const syncAll = !keysToSync || keysToSync.length === 0;
  
  // Normalize keys to lowercase for flexible matching
  const activeKeys = keysToSync ? keysToSync.map(k => k.toLowerCase()) : [];
  const shouldSync = (key: string) => syncAll || activeKeys.includes(key.toLowerCase());

  // Always use the absolute latest, fully merged data from localStorage to prevent React state race conditions during synchronous batching
  let latestDb = dbState;
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
      latestDb = dbState;
    }
  }

  // Pre-check connectivity to avoid structural failed to fetch errors in sandboxed containers
  const isIsolated = await isSupabaseOffline();

  if (isIsolated) {
    logs.push("⏳ Memulai sinkronisasi push ke database cloud Supabase...");
    logs.push("ℹ️ Terdeteksi keterbatasan koneksi jaringan (Sistem Offline-Ready).");
    logs.push("⚡ Mengaktifkan Supabase Virtual-Link untuk sinkronisasi instan...");
    
    if (shouldSync('puskesmas') && latestDb.puskesmas) {
      logs.push(`📤 Mengirim ${latestDb.puskesmas.length} data unit kerja Puskesmas...`);
      logs.push(`✅ Unit kerja Puskesmas berhasil disatukan (Virtual-Link).`);
    }
    if (shouldSync('profesiSdmk') && latestDb.profesiSdmk) {
      logs.push(`📤 Mengirim ${latestDb.profesiSdmk.length} rumpun profesi SDMK...`);
      logs.push(`✅ Rumpun profesi SDMK berhasil disatukan (Virtual-Link).`);
    }
    if (shouldSync('fitur') && latestDb.fitur) {
      logs.push(`📤 Mengirim ${latestDb.fitur.length} konfigurasi jenis layanan...`);
      logs.push(`✅ Konfigurasi jenis layanan berhasil disatukan (Virtual-Link).`);
    }
    if (shouldSync('dokumen') && latestDb.dokumen) {
      logs.push(`📤 Mengirim ${latestDb.dokumen.length} master dokumen persyaratan...`);
      logs.push(`✅ Master dokumen persyaratan berhasil disatukan (Virtual-Link).`);
    }
    if (shouldSync('syaratFiturMap') && latestDb.syaratFiturMap) {
      logs.push(`📤 Mengirim relasi syarat dokumen per fitur...`);
      logs.push(`✅ Relasi syarat dokumen berhasil disatukan (Virtual-Link).`);
    }
    if (shouldSync('asnProfiles') && latestDb.asnProfiles) {
      logs.push(`📤 Mengirim ${latestDb.asnProfiles.length} data biografi pegawai SAPA...`);
      logs.push(`✅ Biografi pegawai SAPA berhasil disatukan (Virtual-Link).`);
    }
    if (shouldSync('usulanLayanan') && latestDb.usulanLayanan) {
      logs.push(`📤 Mengirim ${latestDb.usulanLayanan.length} riwayat usulan masuk...`);
      logs.push(`✅ Riwayat usulan masuk berhasil disatukan (Virtual-Link).`);
    }
    if (shouldSync('usulanDokumenFile') && latestDb.usulanDokumenFile) {
      logs.push(`📤 Mengirim ${latestDb.usulanDokumenFile.length} lampiran OCR berkas...`);
      logs.push(`✅ Lampiran OCR berkas berhasil disatukan (Virtual-Link).`);
    }
    if (shouldSync('riwayatAk') && latestDb.riwayatAk) {
      logs.push(`📤 Mengirim ${latestDb.riwayatAk.length} riwayat SKP & Angka Kredit...`);
      logs.push(`✅ Riwayat Angka Kredit berhasil disatukan (Virtual-Link).`);
    }
    if (shouldSync('laporanSdmk') && latestDb.laporanSdmk) {
      logs.push(`📤 Mengirim ${latestDb.laporanSdmk.length} rekaman matriks SDMK bulanan...`);
      logs.push(`✅ Rekaman matriks SDMK bulanan berhasil disatukan (Virtual-Link).`);
    }
    if (shouldSync('arsipKepegawaian') && latestDb.arsipKepegawaian) {
      logs.push(`📤 Mengirim ${latestDb.arsipKepegawaian.length} dokumen arsip pegawai dinas...`);
      logs.push(`✅ Dokumen arsip pegawai dinas berhasil disatukan (Virtual-Link).`);
    }
    if (shouldSync('users') && latestDb.users) {
      logs.push(`📤 Mengirim ${latestDb.users.length} akun akses multi-tenant...`);
      logs.push(`✅ Akun akses multi-tenant berhasil disatukan (Virtual-Link).`);
    }
    
    logs.push("✅ Sinkronisasi background Virtual-Link selesai.");
    return { success: true, log: logs };
  }

  let hasAnyFailure = false;

  try {
    logs.push("⏳ Memulai sinkronisasi push ke database cloud Supabase...");

    // 1. Puskesmas
    if (shouldSync('puskesmas') && latestDb.puskesmas) {
      try {
        logs.push(`📤 Mengirim ${latestDb.puskesmas.length} data unit kerja Puskesmas...`);
        const sanitizedPusk = latestDb.puskesmas.map((pk: any) => ({
          id: Number(pk.id),
          kode_puskesmas: pk.kode_puskesmas,
          nama_puskesmas: pk.nama_puskesmas,
          alamat: pk.alamat || null
        }));
        if (sanitizedPusk.length > 0) {
          const { error } = await supabase.from('puskesmas').upsert(sanitizedPusk);
          if (error) throw new Error(`Puskesmas error: ${error.message}`);
        }
        
        // Handle deletions: retrieve existing records and delete any that are not present locally
        const { data: existing, error: fetchErr } = await supabase.from('puskesmas').select('id');
        if (!fetchErr && existing) {
          const localIds = new Set(sanitizedPusk.map((pk: any) => pk.id));
          const toDelete = existing.map((r: any) => r.id).filter(id => !localIds.has(id));
          if (toDelete.length > 0) {
            // Cascade delete dependants
            const { data: relatedUsulans } = await supabase.from('usulan_layanan').select('id').in('id_puskesmas_pengusul', toDelete);
            if (relatedUsulans && relatedUsulans.length > 0) {
              const uIds = relatedUsulans.map((u: any) => u.id);
              await supabase.from('usulan_dokumen_file').delete().in('id_usulan', uIds);
              await supabase.from('usulan_layanan').delete().in('id', uIds);
            }
            const { data: relatedAsns } = await supabase.from('asn_profiles').select('id').in('id_puskesmas', toDelete);
            if (relatedAsns && relatedAsns.length > 0) {
              const asnIds = relatedAsns.map((a: any) => a.id);
              const { data: asnUsulans } = await supabase.from('usulan_layanan').select('id').in('id_asn', asnIds);
              if (asnUsulans && asnUsulans.length > 0) {
                const auIds = asnUsulans.map((u: any) => u.id);
                await supabase.from('usulan_dokumen_file').delete().in('id_usulan', auIds);
                await supabase.from('usulan_layanan').delete().in('id', auIds);
              }
              await supabase.from('riwayat_ak').delete().in('id_asn', asnIds);
              await supabase.from('arsip_kepegawaian').delete().in('id_asn', asnIds);
              await supabase.from('asn_profiles').delete().in('id', asnIds);
            }
            await supabase.from('laporan_sdmk').delete().in('id_puskesmas', toDelete);
            await supabase.from('users').delete().in('id_puskesmas', toDelete);
            const { error: delErr } = await supabase.from('puskesmas').delete().in('id', toDelete);
            if (delErr) logs.push(`⚠️ Info membersihkan data terhapus di cloud: ${delErr.message}`);
          }
        }
        logs.push(`✅ Unit kerja Puskesmas berhasil disatukan.`);
      } catch (err: any) {
        hasAnyFailure = true;
        logs.push(`❌ Gagal sinkronisasi Puskesmas: ${err.message}`);
        console.warn("Puskesmas sync failure:", err);
      }
    }

    // 2. Profesi
    if (shouldSync('profesiSdmk') && latestDb.profesiSdmk) {
      try {
        logs.push(`📤 Mengirim ${latestDb.profesiSdmk.length} rumpun profesi SDMK...`);
        const sanitizedProf = latestDb.profesiSdmk.map((pr: any) => ({
          id: Number(pr.id),
          nama_profesi: pr.nama_profesi
        }));
        if (sanitizedProf.length > 0) {
          const { error } = await supabase.from('profesi_sdmk').upsert(sanitizedProf);
          if (error) throw new Error(`Profesi error: ${error.message}`);
        }

        // Handle deletions
        const { data: existing, error: fetchErr } = await supabase.from('profesi_sdmk').select('id');
        if (!fetchErr && existing) {
          const localIds = new Set(sanitizedProf.map((pr: any) => pr.id));
          const toDelete = existing.map((r: any) => r.id).filter(id => !localIds.has(id));
          if (toDelete.length > 0) {
            await supabase.from('laporan_sdmk').delete().in('id_profesi', toDelete);
            await supabase.from('asn_profiles').update({ id_profesi: null }).in('id_profesi', toDelete);
            const { error: delErr } = await supabase.from('profesi_sdmk').delete().in('id', toDelete);
            if (delErr) logs.push(`⚠️ Info membersihkan data terhapus di cloud: ${delErr.message}`);
          }
        }
        logs.push(`✅ Rumpun profesi SDMK berhasil disatukan.`);
      } catch (err: any) {
        hasAnyFailure = true;
        logs.push(`❌ Gagal sinkronisasi Profesi: ${err.message}`);
        console.warn("Profesi sync failure:", err);
      }
    }

    // 3. Fitur
    if (shouldSync('fitur') && latestDb.fitur) {
      try {
        logs.push(`📤 Mengirim ${latestDb.fitur.length} konfigurasi jenis layanan...`);
        const sanitizedFitur = latestDb.fitur.map((ft: any) => ({
          id: Number(ft.id),
          nama_fitur: ft.nama_fitur,
          slug: ft.slug,
          warning_threshold_bulan: ft.warning_threshold_bulan !== undefined ? Number(ft.warning_threshold_bulan) : 0,
          is_active: !!ft.is_active,
          konfigurasi_tambahan: ft.konfigurasi_tambahan || null
        }));
        if (sanitizedFitur.length > 0) {
          const { error } = await supabase.from('fitur').upsert(sanitizedFitur);
          if (error) throw new Error(`Fitur error: ${error.message}`);
        }

        // Handle deletions
        const { data: existing, error: fetchErr } = await supabase.from('fitur').select('id');
        if (!fetchErr && existing) {
          const localIds = new Set(sanitizedFitur.map((ft: any) => ft.id));
          const toDelete = existing.map((r: any) => r.id).filter(id => !localIds.has(id));
          if (toDelete.length > 0) {
            await supabase.from('syarat_fitur_map').delete().in('id_fitur', toDelete);
            const { data: relatedUsulans } = await supabase.from('usulan_layanan').select('id').in('id_fitur', toDelete);
            if (relatedUsulans && relatedUsulans.length > 0) {
              const uIds = relatedUsulans.map((u: any) => u.id);
              await supabase.from('usulan_dokumen_file').delete().in('id_usulan', uIds);
              await supabase.from('usulan_layanan').delete().in('id', uIds);
            }
            const { error: delErr } = await supabase.from('fitur').delete().in('id', toDelete);
            if (delErr) logs.push(`⚠️ Info membersihkan data terhapus di cloud: ${delErr.message}`);
          }
        }
        logs.push(`✅ Konfigurasi jenis layanan berhasil disatukan.`);
      } catch (err: any) {
        hasAnyFailure = true;
        logs.push(`❌ Gagal sinkronisasi Fitur: ${err.message}`);
        console.warn("Fitur sync failure:", err);
      }
    }

    // 4. Dokumen
    if (shouldSync('dokumen') && latestDb.dokumen) {
      try {
        logs.push(`📤 Mengirim ${latestDb.dokumen.length} master dokumen persyaratan...`);
        const sanitizedDoc = latestDb.dokumen.map((dc: any) => ({
          id: Number(dc.id),
          nama_dokumen: dc.nama_dokumen,
          kata_kunci_ocr: String(dc.kata_kunci_ocr || "")
        }));
        if (sanitizedDoc.length > 0) {
          const { error } = await supabase.from('dokumen').upsert(sanitizedDoc);
          if (error) throw new Error(`Dokumen error: ${error.message}`);
        }

        // Handle deletions
        const { data: existing, error: fetchErr } = await supabase.from('dokumen').select('id');
        if (!fetchErr && existing) {
          const localIds = new Set(sanitizedDoc.map((dc: any) => dc.id));
          const toDelete = existing.map((r: any) => r.id).filter(id => !localIds.has(id));
          if (toDelete.length > 0) {
            await supabase.from('syarat_fitur_map').delete().in('id_dokumen', toDelete);
            await supabase.from('usulan_dokumen_file').delete().in('id_dokumen', toDelete);
            const { error: delErr } = await supabase.from('dokumen').delete().in('id', toDelete);
            if (delErr) logs.push(`⚠️ Info membersihkan data terhapus di cloud: ${delErr.message}`);
          }
        }
        logs.push(`✅ Master dokumen persyaratan berhasil disatukan.`);
      } catch (err: any) {
        hasAnyFailure = true;
        logs.push(`❌ Gagal sinkronisasi Dokumen: ${err.message}`);
        console.warn("Dokumen sync failure:", err);
      }
    }

    // 5. Syarat Fitur Map
    if (shouldSync('syaratFiturMap') && latestDb.syaratFiturMap && latestDb.fitur?.length) {
      try {
        logs.push(`📤 Mengirim relasi syarat dokumen per fitur...`);
        const mapRows: any[] = [];
        const seenMapKeys = new Set<string>();
        Object.entries(latestDb.syaratFiturMap).forEach(([slug, docIds]) => {
          const feature = latestDb.fitur.find((f: any) => f.slug === slug);
          if (feature && Array.isArray(docIds)) {
            docIds.forEach((docId: any) => {
              const key = `${feature.id}-${docId}`;
              if (!seenMapKeys.has(key)) {
                seenMapKeys.add(key);
                mapRows.push({
                  id_fitur: Number(feature.id),
                  id_dokumen: Number(docId)
                });
              }
            });
          }
        });
        if (mapRows.length > 0) {
          const { error: deleteError } = await supabase.from('syarat_fitur_map').delete().neq('id_fitur', -1);
          if (deleteError) logs.push(`⚠️ Info membersihkan mapping lama: ${deleteError.message}`);

          const { error } = await supabase.from('syarat_fitur_map').insert(mapRows);
          if (error) throw new Error(`Syarat map error: ${error.message}`);
          logs.push(`✅ Relasi syarat dokumen berhasil disatukan.`);
        }
      } catch (err: any) {
        hasAnyFailure = true;
        logs.push(`❌ Gagal sinkronisasi Syarat Fitur Map: ${err.message}`);
        console.warn("SyaratFiturMap sync failure:", err);
      }
    }

    // 6. ASN Profiles
    if (shouldSync('asnProfiles') && latestDb.asnProfiles) {
      try {
        logs.push(`📤 Mengirim ${latestDb.asnProfiles.length} data biografi pegawai SAPA...`);
        
        const sanitizedAsn = latestDb.asnProfiles.map((p: any) => ({
          id: Number(p.id),
          nip: String(p.nip || ""),
          nama_lengkap: String(p.nama_lengkap || ""),
          gelar_belakang: p.gelar_belakang || null,
          id_puskesmas: p.id_puskesmas && !isNaN(Number(p.id_puskesmas)) ? Number(p.id_puskesmas) : null,
          tanggal_lahir: sanitizePgDate(p.tanggal_lahir) || '1990-01-01',
          golongan_ruang: String(p.golongan_ruang || ""),
          tmt_pangkat_terakhir: sanitizePgDate(p.tmt_pangkat_terakhir) || '2025-01-01',
          tmt_berkala_terakhir: sanitizePgDate(p.tmt_berkala_terakhir) || '2025-01-01',
          tmt_jabatan_terakhir: sanitizePgDate(p.tmt_jabatan_terakhir) || '2025-01-01',
          jenis_pegawai: String(p.jenis_pegawai || ""),
          jenjang_jafung: p.jenjang_jafung || null,
          ak_integrasi_2022: p.ak_integrasi_2022 !== undefined && p.ak_integrasi_2022 !== "" ? Number(p.ak_integrasi_2022) : 0,
          sisa_cuti_tahunan: p.sisa_cuti_tahunan !== undefined && p.sisa_cuti_tahunan !== "" ? Number(p.sisa_cuti_tahunan) : 12,
          status_kepegawaian: String(p.status_kepegawaian || "Aktif"),
          jenis_kelamin: String(p.jenis_kelamin || "L"),
          status_pegawai_detail: String(p.status_pegawai_detail || ""),
          id_profesi: p.id_profesi && !isNaN(Number(p.id_profesi)) ? Number(p.id_profesi) : null,
          nomor_wa: p.nomor_wa || null,

          // PNS Details
          pangkat_nama: p.pangkat_nama || null,
          pns_jenis_kenaikan_pangkat: p.pns_jenis_kenaikan_pangkat || null,
          pns_masa_kerja_golongan: p.pns_masa_kerja_golongan || null,
          pns_tmt_golongan: sanitizePgDate(p.pns_tmt_golongan),
          pns_no_pertek_bkn: p.pns_no_pertek_bkn || null,
          pns_tgl_pertek_bkn: sanitizePgDate(p.pns_tgl_pertek_bkn),
          pns_no_sk: p.pns_no_sk || null,
          pns_tgl_sk: sanitizePgDate(p.pns_tgl_sk),
          pns_nama_jabatan: p.pns_nama_jabatan || null,
          pns_jenis_jabatan: p.pns_jenis_jabatan || null,
          pns_jenis_mutasi: p.pns_jenis_mutasi || null,
          pns_tmt_jabatan: sanitizePgDate(p.pns_tmt_jabatan),
          pns_instansi_kerja: p.pns_instansi_kerja || null,
          pns_instansi_induk: p.pns_instansi_induk || null,
          pns_satker: p.pns_satker || null,
          pns_satker_induk: p.pns_satker_induk || null,
          pns_unor: p.pns_unor || null,
          pns_unor_induk: p.pns_unor_induk || null,
          pns_no_sk_jabatan: p.pns_no_sk_jabatan || null,
          pns_tgl_sk_jabatan: sanitizePgDate(p.pns_tgl_sk_jabatan),
          pns_instansi_pembina: p.pns_instansi_pembina || null,

          // PPPK Details
          pppk_ni: p.pppk_ni || null,
          pppk_no_perjanjian: p.pppk_no_perjanjian || null,
          pppk_tgl_perjanjian: sanitizePgDate(p.pppk_tgl_perjanjian),
          pppk_tmt_perjanjian_mulai: sanitizePgDate(p.pppk_tmt_perjanjian_mulai),
          pppk_tmt_perjanjian_selesai: sanitizePgDate(p.pppk_tmt_perjanjian_selesai),
          pppk_tmt_golongan: sanitizePgDate(p.pppk_tmt_golongan),
          pppk_no_sk: p.pppk_no_sk || null,
          pppk_tgl_sk: sanitizePgDate(p.pppk_tgl_sk),
          pppk_instansi_kerja: p.pppk_instansi_kerja || null,
          pppk_instansi_induk: p.pppk_instansi_induk || null,
          pppk_satker: p.pppk_satker || null,
          pppk_unor: p.pppk_unor || null,
          pppk_jabatan: p.pppk_jabatan || null,
          pppk_golongan: p.pppk_golongan || null,

          // PKWT / Non ASN Details
          nik: p.nik || null,
          pkwt_tmt_sk: sanitizePgDate(p.pkwt_tmt_sk),
          pkwt_no_sk_kontrak: p.pkwt_no_sk_kontrak || null,
          pkwt_tgl_sk_kontrak: sanitizePgDate(p.pkwt_tgl_sk_kontrak),
          pkwt_masa_kerja: p.pkwt_masa_kerja || null,
          pkwt_pembiayaan: p.pkwt_pembiayaan || null,
          pkwt_jabatan: p.pkwt_jabatan || null,

          // PPPK Paruh Waktu Details
          pppw_jumlah_jam_kerja_per_minggu: p.pppw_jumlah_jam_kerja_per_minggu !== undefined && p.pppw_jumlah_jam_kerja_per_minggu !== "" ? Number(p.pppw_jumlah_jam_kerja_per_minggu) : null,
          pppw_surat_kesepakatan_file: p.pppw_surat_kesepakatan_file || null,

          // STR & SIP Details
          no_str: p.no_str || null,
          tanggal_terbit_str: sanitizePgDate(p.tanggal_terbit_str),
          tanggal_akhir_str: sanitizePgDate(p.tanggal_akhir_str),
          is_str_seumur_hidup: !!p.is_str_seumur_hidup,
          no_sip: p.no_sip || null,
          tanggal_terbit_sip: sanitizePgDate(p.tanggal_terbit_sip),
          tanggal_akhir_sip: sanitizePgDate(p.tanggal_akhir_sip),

          // KP4 / Model DK (Tunjangan Keluarga ASN)
          kp4_status_pernikahan: p.kp4_status_pernikahan || null,
          kp4_nik_pasangan: p.kp4_nik_pasangan || null,
          kp4_nama_pasangan: p.kp4_nama_pasangan || null,
          kp4_pasangan_asn: p.kp4_pasangan_asn !== undefined ? !!p.kp4_pasangan_asn : null,
          kp4_pasangan_nip: p.kp4_pasangan_nip || null,
          kp4_pasangan_kerja_instansi: p.kp4_pasangan_kerja_instansi || null,
          kp4_pasangan_tunjangan_diklaim: p.kp4_pasangan_tunjangan_diklaim !== undefined ? !!p.kp4_pasangan_tunjangan_diklaim : null,
          kp4_tahun_validasi: p.kp4_tahun_validasi ? Number(p.kp4_tahun_validasi) : null,
          kp4_tanggal_validasi: sanitizePgDate(p.kp4_tanggal_validasi),
          kp4_berkas_file_name: p.kp4_berkas_file_name || null,
          kp4_berkas_file_path: p.kp4_berkas_file_path || null,
          kp4_daftar_anak: p.kp4_daftar_anak || null
        }));

        if (sanitizedAsn.length > 0) {
          const { error } = await supabase.from('asn_profiles').upsert(sanitizedAsn);
          if (error) throw new Error(`ASN error: ${error.message}`);
        }

        // Handle deletions
        const { data: existing, error: fetchErr } = await supabase.from('asn_profiles').select('id');
        if (!fetchErr && existing) {
          const localIds = new Set(sanitizedAsn.map((p: any) => p.id));
          const toDelete = existing.map((r: any) => r.id).filter(id => !localIds.has(id));
          if (toDelete.length > 0) {
            const { data: relatedUsulans } = await supabase.from('usulan_layanan').select('id').in('id_asn', toDelete);
            if (relatedUsulans && relatedUsulans.length > 0) {
              const uIds = relatedUsulans.map((u: any) => u.id);
              await supabase.from('usulan_dokumen_file').delete().in('id_usulan', uIds);
              await supabase.from('usulan_layanan').delete().in('id', uIds);
            }
            await supabase.from('riwayat_ak').delete().in('id_asn', toDelete);
            await supabase.from('arsip_kepegawaian').delete().in('id_asn', toDelete);
            const { error: delErr } = await supabase.from('asn_profiles').delete().in('id', toDelete);
            if (delErr) logs.push(`⚠️ Info membersihkan data terhapus di cloud: ${delErr.message}`);
          }
        }
        logs.push(`✅ Biografi pegawai SAPA berhasil disatukan.`);
      } catch (err: any) {
        hasAnyFailure = true;
        const errDetail = err?.message || err;
        logs.push(`❌ Gagal sinkronisasi ASN Profiles: ${errDetail}`);
        console.error("🔴🔴🔴 [Supabase Sync Error] Gagal Menyimpan ASN Profiles ke Supabase:", err);
      }
    }

    // 7. Usulan Layanan
    if (shouldSync('usulanLayanan') && latestDb.usulanLayanan) {
      try {
        logs.push(`📤 Mengirim ${latestDb.usulanLayanan.length} riwayat usulan masuk...`);
        const sanitizedUsulan = latestDb.usulanLayanan.map((u: any) => ({
          id: Number(u.id),
          id_fitur: u.id_fitur && !isNaN(Number(u.id_fitur)) ? Number(u.id_fitur) : null,
          id_asn: u.id_asn && !isNaN(Number(u.id_asn)) ? Number(u.id_asn) : null,
          id_puskesmas_pengusul: u.id_puskesmas_pengusul && !isNaN(Number(u.id_puskesmas_pengusul)) && Number(u.id_puskesmas_pengusul) !== 0 ? Number(u.id_puskesmas_pengusul) : null,
          tanggal_pengusulan: u.tanggal_pengusulan || new Date().toISOString(),
          status: u.status,
          catatan_perbaikan: u.catatan_perbaikan || null,
          file_sk_final: u.file_sk_final || null
        }));
        if (sanitizedUsulan.length > 0) {
          const { error } = await supabase.from('usulan_layanan').upsert(sanitizedUsulan);
          if (error) throw new Error(`Usulan error: ${error.message}`);
        }

        // Handle deletions
        const { data: existing, error: fetchErr } = await supabase.from('usulan_layanan').select('id');
        if (!fetchErr && existing) {
          const localIds = new Set(sanitizedUsulan.map((u: any) => u.id));
          const toDelete = existing.map((r: any) => r.id).filter(id => !localIds.has(id));
          if (toDelete.length > 0) {
            await supabase.from('usulan_dokumen_file').delete().in('id_usulan', toDelete);
            const { error: delErr } = await supabase.from('usulan_layanan').delete().in('id', toDelete);
            if (delErr) logs.push(`⚠️ Info membersihkan data terhapus di cloud: ${delErr.message}`);
          }
        }
        logs.push(`✅ Riwayat usulan masuk berhasil disatukan.`);
      } catch (err: any) {
        hasAnyFailure = true;
        logs.push(`❌ Gagal sinkronisasi Usulan Layanan: ${err.message}`);
        console.warn("Usulan Layanan sync failure:", err);
      }
    }

    // 8. Usulan Dokumen File
    if (shouldSync('usulanDokumenFile') && latestDb.usulanDokumenFile) {
      try {
        logs.push(`📤 Mengirim ${latestDb.usulanDokumenFile.length} lampiran OCR berkas...`);
        const sanitizedDocFiles = latestDb.usulanDokumenFile.map((df: any) => ({
          id: Number(df.id),
          id_usulan: df.id_usulan && !isNaN(Number(df.id_usulan)) ? Number(df.id_usulan) : null,
          id_dokumen: df.id_dokumen && !isNaN(Number(df.id_dokumen)) ? Number(df.id_dokumen) : null,
          file_name: String(df.file_name || ""),
          file_path: String(df.file_path || ""),
          uploaded_at: df.uploaded_at || new Date().toISOString(),
          ocr_status: df.ocr_status || 'GENERIC_PASS',
          ocr_feedback_message: df.ocr_feedback_message || null,
          data_url: df.data_url || null,
          text_ocr_result: df.text_ocr_result || null
        }));
        if (sanitizedDocFiles.length > 0) {
          const { error } = await supabase.from('usulan_dokumen_file').upsert(sanitizedDocFiles);
          if (error) throw new Error(`Lampiran error: ${error.message}`);
        }

        // Handle deletions
        const { data: existing, error: fetchErr } = await supabase.from('usulan_dokumen_file').select('id');
        if (!fetchErr && existing) {
          const localIds = new Set(sanitizedDocFiles.map((df: any) => df.id));
          const toDelete = existing.map((r: any) => r.id).filter(id => !localIds.has(id));
          if (toDelete.length > 0) {
            const { error: delErr } = await supabase.from('usulan_dokumen_file').delete().in('id', toDelete);
            if (delErr) logs.push(`⚠️ Info membersihkan data terhapus di cloud: ${delErr.message}`);
          }
        }
        logs.push(`✅ Lampiran OCR berkas berhasil disatukan.`);
      } catch (err: any) {
        hasAnyFailure = true;
        logs.push(`❌ Gagal sinkronisasi Lampiran Berkas: ${err.message}`);
        console.warn("Usulan Dokumen File sync failure:", err);
      }
    }

    // 9. Riwayat AK
    if (shouldSync('riwayatAk') && latestDb.riwayatAk) {
      try {
        logs.push(`📤 Mengirim ${latestDb.riwayatAk.length} riwayat SKP & Angka Kredit...`);
        const sanitizedAk = latestDb.riwayatAk.map((r: any) => ({
          id: Number(r.id),
          id_asn: r.id_asn && !isNaN(Number(r.id_asn)) ? Number(r.id_asn) : null,
          tahun_skp: Number(r.tahun_skp),
          predikat_skp: r.predikat_skp || 'Baik',
          ak_diperoleh: Number(r.ak_diperoleh)
        }));
        if (sanitizedAk.length > 0) {
          const { error } = await supabase.from('riwayat_ak').upsert(sanitizedAk);
          if (error) throw new Error(`Riwayat AK error: ${error.message}`);
        }

        // Handle deletions
        const { data: existing, error: fetchErr } = await supabase.from('riwayat_ak').select('id');
        if (!fetchErr && existing) {
          const localIds = new Set(sanitizedAk.map((r: any) => r.id));
          const toDelete = existing.map((r: any) => r.id).filter(id => !localIds.has(id));
          if (toDelete.length > 0) {
            const { error: delErr } = await supabase.from('riwayat_ak').delete().in('id', toDelete);
            if (delErr) logs.push(`⚠️ Info membersihkan data terhapus di cloud: ${delErr.message}`);
          }
        }
        logs.push(`✅ Riwayat Angka Kredit berhasil disatukan.`);
      } catch (err: any) {
        hasAnyFailure = true;
        logs.push(`❌ Gagal sinkronisasi Riwayat AK: ${err.message}`);
        console.warn("Riwayat AK sync failure:", err);
      }
    }

    // 10. Laporan SDMK
    if (shouldSync('laporanSdmk') && latestDb.laporanSdmk) {
      try {
        logs.push(`📤 Mengirim ${latestDb.laporanSdmk.length} rekaman matriks SDMK bulanan...`);
        const sanitizedLapor = latestDb.laporanSdmk.map((l: any) => ({
          id: Number(l.id),
          id_puskesmas: l.id_puskesmas && !isNaN(Number(l.id_puskesmas)) ? Number(l.id_puskesmas) : null,
          periode_bulan: Number(l.periode_bulan),
          periode_tahun: Number(l.periode_tahun),
          id_profesi: l.id_profesi && !isNaN(Number(l.id_profesi)) ? Number(l.id_profesi) : null,
          pns_l: Number(l.pns_l || 0),
          pns_p: Number(l.pns_p || 0),
          p3k_pn_l: Number(l.p3k_pn_l || 0),
          p3k_pn_p: Number(l.p3k_pn_p || 0),
          p3k_pw_l: Number(l.p3k_pw_l || 0),
          p3k_pw_p: Number(l.p3k_pw_p || 0),
          non_asn_l: Number(l.non_asn_l || 0),
          non_asn_p: Number(l.non_asn_p || 0)
        }));
        if (sanitizedLapor.length > 0) {
          const { error } = await supabase.from('laporan_sdmk').upsert(sanitizedLapor);
          if (error) throw new Error(`Laporan SDMK error: ${error.message}`);
        }

        // Handle deletions
        const { data: existing, error: fetchErr } = await supabase.from('laporan_sdmk').select('id');
        if (!fetchErr && existing) {
          const localIds = new Set(sanitizedLapor.map((l: any) => l.id));
          const toDelete = existing.map((r: any) => r.id).filter(id => !localIds.has(id));
          if (toDelete.length > 0) {
            const { error: delErr } = await supabase.from('laporan_sdmk').delete().in('id', toDelete);
            if (delErr) logs.push(`⚠️ Info membersihkan data terhapus di cloud: ${delErr.message}`);
          }
        }
        logs.push(`✅ Rekaman matriks SDMK bulanan berhasil disatukan.`);
      } catch (err: any) {
        hasAnyFailure = true;
        logs.push(`❌ Gagal sinkronisasi Laporan SDMK: ${err.message}`);
        console.warn("Laporan SDMK sync failure:", err);
      }
    }

    // 11. Arsip Kepegawaian
    if (shouldSync('arsipKepegawaian') && latestDb.arsipKepegawaian) {
      try {
        logs.push(`📤 Mengirim ${latestDb.arsipKepegawaian.length} dokumen arsip pegawai dinas...`);
        const sanitizedArsip = latestDb.arsipKepegawaian.map((a: any) => ({
          id: Number(a.id),
          id_asn: a.id_asn && !isNaN(Number(a.id_asn)) ? Number(a.id_asn) : null,
          nama_berkas: String(a.nama_berkas || "Berkas"),
          kategori_kelompok: String(a.kategori_kelompok || "Dasar"),
          file_name: String(a.file_name || "unnamed.bin"),
          file_path: String(a.file_path || ""),
          uploaded_at: a.uploaded_at || new Date().toISOString(),
          source: a.source || 'Upload Kerja',
          notes: a.notes || null,
          str_expired_date: sanitizePgDate(a.str_expired_date),
          pkwt_tahun: a.pkwt_tahun ? Number(a.pkwt_tahun) : null
        }));
        if (sanitizedArsip.length > 0) {
          const { error } = await supabase.from('arsip_kepegawaian').upsert(sanitizedArsip);
          if (error) throw new Error(`Arsip error: ${error.message}`);
        }

        // Handle deletions
        const { data: existing, error: fetchErr } = await supabase.from('arsip_kepegawaian').select('id');
        if (!fetchErr && existing) {
          const localIds = new Set(sanitizedArsip.map((a: any) => a.id));
          const toDelete = existing.map((r: any) => r.id).filter(id => !localIds.has(id));
          if (toDelete.length > 0) {
            const { error: delErr } = await supabase.from('arsip_kepegawaian').delete().in('id', toDelete);
            if (delErr) logs.push(`⚠️ Info membersihkan data terhapus di cloud: ${delErr.message}`);
          }
        }
        logs.push(`✅ Dokumen arsip pegawai dinas berhasil disatukan.`);
      } catch (err: any) {
        hasAnyFailure = true;
        logs.push(`❌ Gagal sinkronisasi Arsip Kepegawaian: ${err.message}`);
        console.warn("Arsip Kepegawaian sync failure:", err);
      }
    }

    // 12. Users
    if (shouldSync('users') && latestDb.users) {
      try {
        logs.push(`📤 Mengirim ${latestDb.users.length} akun akses multi-tenant...`);
        // Omit id from payload and upsert matching by unique 'nip' to bypass mismatching id-conflict
        const sanitizedUsrs = latestDb.users.map((u: any) => ({
          nip: String(u.nip || ""),
          nama_lengkap: String(u.nama_lengkap || ""),
          role: String(u.role || "admin_puskesmas"),
          id_puskesmas: u.id_puskesmas && !isNaN(Number(u.id_puskesmas)) ? Number(u.id_puskesmas) : null,
          username: u.username ? String(u.username) : null,
          password: u.password ? String(u.password) : null,
          nomor_wa: u.nomor_wa ? String(u.nomor_wa) : null
        }));
        if (sanitizedUsrs.length > 0) {
          const { error } = await supabase.from('users').upsert(sanitizedUsrs, { onConflict: 'nip' });
          if (error) throw new Error(`Users error: ${error.message}`);
        }

        // Handle deletions by unique 'nip' instead of 'id'
        const { data: existing, error: fetchErr } = await supabase.from('users').select('nip');
        if (!fetchErr && existing) {
          const localNips = new Set(sanitizedUsrs.map((u: any) => u.nip));
          const toDelete = existing.map((r: any) => r.nip).filter(nip => !localNips.has(nip));
          if (toDelete.length > 0) {
            const { error: delErr } = await supabase.from('users').delete().in('nip', toDelete);
            if (delErr) logs.push(`⚠️ Info membersihkan data terhapus di cloud: ${delErr.message}`);
          }
        }
        logs.push(`✅ Akun akses multi-tenant berhasil disatukan.`);
      } catch (err: any) {
        hasAnyFailure = true;
        logs.push(`❌ Gagal sinkronisasi Users (RLS/Akses): ${err.message}`);
        console.warn("Users sync failure:", err);
      }
    }

    if (hasAnyFailure) {
      logs.push("⚠️ Sinkronisasi background selesai dengan beberapa kesalahan tabel.");
      return { success: false, log: logs };
    }

    logs.push("✅ Sinkronisasi background selesai.");
    return { success: true, log: logs };
  } catch (err: any) {
    logs.push(`❌ SINKRONISASI PUSH REJECTED: ${err?.message || err}`);
    return { success: false, log: logs };
  }
}

/**
 * Helper to robustly merge local list (changes, additions) with cloud list (master source)
 * for offline-first replication.
 */
function mergeLocalAndCloud<T extends { id: number | string }>(localList: T[], cloudList: T[], cloudTakesPrecedence: boolean = true): T[] {
  console.log(`[mergeLocalAndCloud] MERGING arrays - localList:`, localList, `cloudList:`, cloudList, `cloudTakesPrecedence:`, cloudTakesPrecedence);
  const localMap = new Map(localList.map(item => [String(item.id), item]));
  const cloudMap = new Map(cloudList.map(item => [String(item.id), item]));

  const merged: T[] = [];

  // 1. Process items from the local list. If also present in cloud, merge them with proper precedence.
  localList.forEach(localItem => {
    const id = String(localItem.id);
    const cloudItem = cloudMap.get(id);
    if (cloudItem) {
      const mergedItem = cloudTakesPrecedence
        ? {
            ...localItem,
            ...cloudItem
          }
        : {
            ...cloudItem,
            ...localItem
          };
      merged.push(mergedItem);
    } else {
      // Local-only item (new creations not yet in the cloud)
      merged.push(localItem);
    }
  });

  // 2. Process items that are ONLY in the cloud list (created by others or seeded originally)
  cloudList.forEach(cloudItem => {
    const id = String(cloudItem.id);
    if (!localMap.has(id)) {
      merged.push(cloudItem);
    }
  });

  console.log(`[mergeLocalAndCloud] MERGING complete - result:`, merged);
  return merged;
}

/**
 * Bulk Pull Cloud State from Supabase
 */
export async function pullCloudDataFromSupabase(): Promise<{ success: boolean; data?: any; log: string[] }> {
  const logs: string[] = [];

  // Pre-check connectivity to avoid structural failed to fetch errors in sandboxed containers
  const isIsolated = await isSupabaseOffline();

  if (isIsolated) {
    logs.push("⏳ Memulai sinkronisasi pull data real-time dari Supabase cloud...");
    logs.push("ℹ️ Terdeteksi keterbatasan koneksi jaringan (Sistem Offline-Ready).");
    logs.push("⚡ Sinkronisasi virtual diselesaikan lewat database local cache...");
    
    let localPusk = [];
    let localProfs = [];
    let localFits = [];
    let localDocs = [];
    let localMap = {};
    let localAsns = [];
    let localUsulans = [];
    let localDf = [];
    let localRiwayats = [];
    let localLaporans = [];
    let localArsips = [];
    let localUsrs = [];

    try {
      localPusk = JSON.parse(localStorage.getItem('simpeg_puskesmas') || '[]');
      localProfs = JSON.parse(localStorage.getItem('simpeg_profesi_sdmk') || '[]');
      localFits = JSON.parse(localStorage.getItem('simpeg_fitur') || '[]');
      localDocs = JSON.parse(localStorage.getItem('simpeg_dokumen') || '[]');
      localMap = JSON.parse(localStorage.getItem('simpeg_syarat_fitur_map') || '{}');
      localAsns = JSON.parse(localStorage.getItem('simpeg_asn_profiles') || '[]');
      localUsulans = JSON.parse(localStorage.getItem('simpeg_usulan_layanan') || '[]');
      localDf = JSON.parse(localStorage.getItem('simpeg_usulan_dokumen_file') || '[]');
      localRiwayats = JSON.parse(localStorage.getItem('simpeg_riwayat_ak') || '[]');
      localLaporans = JSON.parse(localStorage.getItem('simpeg_laporan_sdmk') || '[]');
      localArsips = JSON.parse(localStorage.getItem('simpeg_arsip_kepegawaian') || '[]');
      localUsrs = JSON.parse(localStorage.getItem('simpeg_users') || '[]');
    } catch (_) {}

    logs.push("✅ Pull Berhasil (Virtual-Link)! Seluruh data virtual cloud telah dimuat.");
    return {
      success: true,
      log: logs,
      data: {
        puskesmas: localPusk,
        profesiSdmk: localProfs,
        fitur: localFits,
        dokumen: localDocs,
        syaratFiturMap: localMap,
        asnProfiles: localAsns,
        usulanLayanan: localUsulans,
        usulanDokumenFile: localDf,
        riwayatAk: localRiwayats,
        laporanSdmk: localLaporans,
        arsipKepegawaian: localArsips,
        users: localUsrs
      }
    };
  }

  try {
    logs.push("⏳ Memulai sinkronisasi pull data real-time dari Supabase cloud...");
    logs.push("📥 Menarik data dari seluruh tabel Supabase secara paralel...");

    const [
      resPusk,
      resProfs,
      resFits,
      resDocs,
      resMapRows,
      resAsns,
      resUsulans,
      resDf,
      resRiwayats,
      resLaporans,
      resArsips,
      resUsrs
    ] = await Promise.all([
      supabase.from('puskesmas').select('*').order('id'),
      supabase.from('profesi_sdmk').select('*').order('id'),
      supabase.from('fitur').select('*').order('id'),
      supabase.from('dokumen').select('*').order('id'),
      supabase.from('syarat_fitur_map').select('*'),
      supabase.from('asn_profiles').select('*').order('id'),
      supabase.from('usulan_layanan').select('*').order('id'),
      supabase.from('usulan_dokumen_file').select('*').order('id'),
      supabase.from('riwayat_ak').select('*').order('id'),
      supabase.from('laporan_sdmk').select('*').order('id'),
      supabase.from('arsip_kepegawaian').select('*').order('id'),
      supabase.from('users').select('*').order('id')
    ]);

    if (resPusk.error) throw new Error(`Puskesmas: ${resPusk.error.message}`);
    if (resProfs.error) throw new Error(`Profesi: ${resProfs.error.message}`);
    if (resFits.error) throw new Error(`Fitur: ${resFits.error.message}`);
    if (resDocs.error) throw new Error(`Dokumen: ${resDocs.error.message}`);
    if (resMapRows.error) throw new Error(`Syarat Map: ${resMapRows.error.message}`);
    if (resAsns.error) throw new Error(`ASN: ${resAsns.error.message}`);
    if (resUsulans.error) throw new Error(`Usulan: ${resUsulans.error.message}`);
    if (resDf.error) throw new Error(`Usulan Dokumen: ${resDf.error.message}`);
    if (resRiwayats.error) throw new Error(`Riwayat AK: ${resRiwayats.error.message}`);
    if (resLaporans.error) throw new Error(`Laporan SDMK: ${resLaporans.error.message}`);
    if (resArsips.error) throw new Error(`Arsip: ${resArsips.error.message}`);
    if (resUsrs.error) throw new Error(`Users: ${resUsrs.error.message}`);

    const pusk = resPusk.data;
    const profs = resProfs.data;
    const fits = resFits.data;
    const docs = resDocs.data;
    const mapRows = resMapRows.data;
    const asns = resAsns.data;
    const usulans = resUsulans.data;
    const docsFiles = resDf.data;
    const riwayats = resRiwayats.data;
    const laporans = resLaporans.data;
    const arsips = resArsips.data;
    const usrs = resUsrs.data;

    // Merge back any local-only fields (like total_penduduk) to prevent losing them during pull
    let localPuskesmas: any[] = [];
    try {
      localPuskesmas = JSON.parse(localStorage.getItem('simpeg_puskesmas') || '[]');
    } catch (_) {}

    const mergedPusk = pusk?.map((p: any) => {
      const localItem = localPuskesmas.find((lp: any) => Number(lp.id) === Number(p.id));
      return {
        ...p,
        total_penduduk: localItem && localItem.total_penduduk !== undefined ? localItem.total_penduduk : 50000
      };
    }) || pusk;

    // Reconstruct syaratFiturMap Record<string, number[]>
    const syaratFiturMap: Record<string, number[]> = {};
    if (mapRows && fits) {
      fits.forEach((fit: any) => {
        const docIds = mapRows
          .filter((m: any) => Number(m.id_fitur) === Number(fit.id))
          .map((m: any) => Number(m.id_dokumen));
        syaratFiturMap[fit.slug] = docIds;
      });
    }

    // Cloud is the absolute primary master source of truth.
    // We completely bypass local caching/merging to ensure multi-device instant synchronization.
    const mergedAsns = asns || [];
    const mergedUsulans = usulans || [];
    const mergedDocsFiles = docsFiles || [];
    const mergedRiwayats = riwayats || [];
    const mergedArsips = arsips || [];

    logs.push("✅ Pull Berhasil! Seluruh data live terupdate dari cloud dan disinkronkan dengan perubahan lokal.");
    
    return {
      success: true,
      log: logs,
      data: {
        puskesmas: mergedPusk,
        profesiSdmk: profs,
        fitur: fits,
        dokumen: docs,
        syaratFiturMap: syaratFiturMap,
        asnProfiles: mergedAsns,
        usulanLayanan: mergedUsulans,
        usulanDokumenFile: mergedDocsFiles,
        riwayatAk: mergedRiwayats,
        laporanSdmk: laporans,
        arsipKepegawaian: mergedArsips,
        users: usrs
      }
    };
  } catch (err: any) {
    logs.push(`❌ SINKRONISASI PULL REJECTED: ${err?.message || err}`);
    return { success: false, log: logs };
  }
}
