import fs from "fs";
import path from "path";

export interface D1ServerConfig {
  database_name: string;
  database_id: string;
  account_id: string;
  api_token: string;
}

const CONFIG_FILE = path.join(process.cwd(), "cloudflare_d1_config.json");

export function getD1ServerConfig(): D1ServerConfig {
  let config: D1ServerConfig = {
    database_name: "sapa_pegawai",
    database_id: process.env.CLOUDFLARE_DATABASE_ID || process.env.CF_DATABASE_ID || "ad596f89-28c6-4266-ac02-90c60833b682",
    account_id: process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID || "be66d713872f04cf7066e1c62ddb2ff5",
    api_token: process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || "cfut_yvaIxKQGIb18zMWfdSZ9ScxDXIszXvWuAvqcQawKfed1a415"
  };

  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
      config = {
        database_name: process.env.CLOUDFLARE_DATABASE_ID ? config.database_name : (data.database_name || config.database_name),
        database_id: process.env.CLOUDFLARE_DATABASE_ID || process.env.CF_DATABASE_ID || data.database_id || config.database_id,
        account_id: process.env.CLOUDFLARE_ACCOUNT_ID || process.env.CF_ACCOUNT_ID || data.account_id || config.account_id,
        api_token: process.env.CLOUDFLARE_API_TOKEN || process.env.CF_API_TOKEN || data.api_token || config.api_token
      };
    } catch (err) {
      console.warn("Failed to read D1 config file:", err);
    }
  }

  return config;
}

export function saveD1ServerConfig(newConfig: Partial<D1ServerConfig>): D1ServerConfig {
  const current = getD1ServerConfig();
  const updated: D1ServerConfig = {
    database_name: newConfig.database_name || current.database_name || "sapa_pegawai",
    database_id: newConfig.database_id || current.database_id || "ad596f89-28c6-4266-ac02-90c60833b682",
    account_id: newConfig.account_id !== undefined ? newConfig.account_id : current.account_id,
    api_token: newConfig.api_token !== undefined ? newConfig.api_token : current.api_token
  };

  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to write D1 config file:", err);
  }

  return updated;
}

/**
 * Execute query on Cloudflare D1 HTTP API
 */
export async function queryCloudflareD1(
  sql: string,
  params: any[] = [],
  overrideConfig?: Partial<D1ServerConfig>
): Promise<{ success: boolean; results?: any[]; error?: string; raw?: any; needs_credentials?: boolean }> {
  const current = getD1ServerConfig();
  const accountId = overrideConfig?.account_id || current.account_id;
  const databaseId = overrideConfig?.database_id || current.database_id || "ad596f89-28c6-4266-ac02-90c60833b682";
  const apiToken = overrideConfig?.api_token || current.api_token;

  if (!accountId || !apiToken) {
    return {
      success: false,
      error: `Cloudflare Account ID atau API Token belum dikonfigurasi. Database ID: ${databaseId} (${current.database_name}). Masukkan Account ID dan API Token Cloudflare Anda di panel Administrasi.`,
      needs_credentials: true
    };
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ sql, params })
    });

    const data = await response.json() as any;

    if (!response.ok || !data.success) {
      const errMsg = data.errors?.map((e: any) => e.message).join(", ") || data.messages?.join(", ") || `HTTP ${response.status}`;
      return {
        success: false,
        error: `Cloudflare D1 Error: ${errMsg}`,
        raw: data
      };
    }

    const firstResult = data.result?.[0];
    return {
      success: true,
      results: firstResult?.results || [],
      raw: data
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Network Error contacting Cloudflare D1: ${err?.message || err}`
    };
  }
}

/**
 * Split SQL statements safely by semicolon (ignoring strings)
 */
function splitSqlStatements(sql: string): string[] {
  return sql
    .replace(/--.*$/gm, '') // remove line comments
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

/**
 * Run migration on Cloudflare D1
 */
export async function migrateCloudflareD1(
  sql: string,
  overrideConfig?: Partial<D1ServerConfig>
): Promise<{ success: boolean; executedCount: number; errors: string[]; log: string[] }> {
  const statements = splitSqlStatements(sql);
  const errors: string[] = [];
  const log: string[] = [];
  let executedCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 60).replace(/\s+/g, ' ');
    const res = await queryCloudflareD1(stmt, [], overrideConfig);
    if (res.success) {
      executedCount++;
      log.push(`✓ [${executedCount}/${statements.length}] ${preview}...`);
    } else {
      errors.push(`Stmt ${i + 1} (${preview}): ${res.error}`);
      log.push(`✗ Gagal: ${res.error}`);
    }
  }

  return {
    success: errors.length === 0,
    executedCount,
    errors,
    log
  };
}

/**
 * Push full local DB state to Cloudflare D1
 */
export async function pushDataToCloudflareD1(
  dbState: any,
  keysToSync?: string[],
  overrideConfig?: Partial<D1ServerConfig>
): Promise<{ success: boolean; log: string[]; error?: string }> {
  const logs: string[] = [];
  const syncAll = !keysToSync || keysToSync.length === 0;
  const activeKeys = keysToSync ? keysToSync.map(k => k.toLowerCase()) : [];
  const shouldSync = (k: string) => syncAll || activeKeys.includes(k.toLowerCase());

  // 1. Puskesmas
  if (shouldSync('puskesmas') && Array.isArray(dbState.puskesmas)) {
    logs.push(`📤 Mengirim ${dbState.puskesmas.length} unit kerja Puskesmas ke D1...`);
    const activePuskIds = dbState.puskesmas
      .map((p: any) => p.id)
      .filter((id: any) => id !== undefined && id !== null);

    if (activePuskIds.length > 0) {
      await queryCloudflareD1(
        `DELETE FROM puskesmas WHERE id NOT IN (${activePuskIds.join(',')});`,
        [],
        overrideConfig
      );
    } else {
      await queryCloudflareD1(`DELETE FROM puskesmas;`, [], overrideConfig);
    }

    for (const pk of dbState.puskesmas) {
      await queryCloudflareD1(
        `INSERT OR REPLACE INTO puskesmas (id, kode_puskesmas, nama_puskesmas, alamat, total_penduduk) VALUES (?, ?, ?, ?, ?);`,
        [pk.id, pk.kode_puskesmas, pk.nama_puskesmas, pk.alamat || null, pk.total_penduduk || 0],
        overrideConfig
      );
    }
    logs.push(`✓ Data unit kerja Puskesmas tersimpan.`);
  }

  // 2. Profesi SDMK
  if (shouldSync('profesiSdmk') && Array.isArray(dbState.profesiSdmk)) {
    logs.push(`📤 Mengirim ${dbState.profesiSdmk.length} profesi SDMK ke D1...`);
    for (const pr of dbState.profesiSdmk) {
      await queryCloudflareD1(
        `INSERT OR REPLACE INTO profesi_sdmk (id, nama_profesi) VALUES (?, ?);`,
        [pr.id, pr.nama_profesi],
        overrideConfig
      );
    }
    logs.push(`✓ Data rumpun profesi tersimpan.`);
  }

  // 3. Fitur
  if (shouldSync('fitur') && Array.isArray(dbState.fitur)) {
    logs.push(`📤 Mengirim ${dbState.fitur.length} jenis layanan ke D1...`);
    for (const ft of dbState.fitur) {
      await queryCloudflareD1(
        `INSERT OR REPLACE INTO fitur (id, nama_fitur, slug, warning_threshold_bulan, is_active, konfigurasi_tambahan) VALUES (?, ?, ?, ?, ?, ?);`,
        [ft.id, ft.nama_fitur, ft.slug, ft.warning_threshold_bulan || 0, ft.is_active ? 1 : 0, ft.konfigurasi_tambahan || null],
        overrideConfig
      );
    }
    logs.push(`✓ Data konfigurasi jenis layanan tersimpan.`);
  }

  // 4. Dokumen
  if (shouldSync('dokumen') && Array.isArray(dbState.dokumen)) {
    logs.push(`📤 Mengirim ${dbState.dokumen.length} master dokumen persyaratan ke D1...`);
    for (const dc of dbState.dokumen) {
      await queryCloudflareD1(
        `INSERT OR REPLACE INTO dokumen (id, nama_dokumen, kata_kunci_ocr) VALUES (?, ?, ?);`,
        [dc.id, dc.nama_dokumen, dc.kata_kunci_ocr || ''],
        overrideConfig
      );
    }
    logs.push(`✓ Master dokumen persyaratan tersimpan.`);
  }

  // 5. ASN Profiles
  if (shouldSync('asnProfiles') && Array.isArray(dbState.asnProfiles)) {
    logs.push(`📤 Mengirim ${dbState.asnProfiles.length} biografi pegawai ke D1...`);
    
    // Purge records that were removed locally so they never resurrect
    const activeIds = dbState.asnProfiles
      .map((p: any) => p.id)
      .filter((id: any) => id !== undefined && id !== null);

    if (activeIds.length > 0) {
      await queryCloudflareD1(
        `DELETE FROM asn_profiles WHERE id NOT IN (${activeIds.join(',')});`,
        [],
        overrideConfig
      );
    } else {
      await queryCloudflareD1(`DELETE FROM asn_profiles;`, [], overrideConfig);
    }

    const asnCols = [
      'id', 'nip', 'nama_lengkap', 'gelar_belakang', 'id_puskesmas', 'tanggal_lahir', 'golongan_ruang',
      'tmt_pangkat_terakhir', 'tmt_berkala_terakhir', 'tmt_jabatan_terakhir', 'jenis_pegawai', 'jenjang_jafung',
      'ak_integrasi_2022', 'sisa_cuti_tahunan', 'status_kepegawaian', 'jenis_kelamin', 'status_pegawai_detail',
      'id_profesi', 'nomor_wa', 'pangkat_nama', 'pns_jenis_kenaikan_pangkat', 'pns_masa_kerja_golongan',
      'pns_tmt_golongan', 'pns_no_pertek_bkn', 'pns_tgl_pertek_bkn', 'pns_no_sk', 'pns_tgl_sk',
      'pns_nama_jabatan', 'pns_jenis_jabatan', 'pns_jenis_mutasi', 'pns_tmt_jabatan', 'pns_instansi_kerja',
      'pns_instansi_induk', 'pns_satker', 'pns_satker_induk', 'pns_unor', 'pns_unor_induk',
      'pns_no_sk_jabatan', 'pns_tgl_sk_jabatan', 'pns_instansi_pembina', 'pppk_ni', 'pppk_no_perjanjian',
      'pppk_tgl_perjanjian', 'pppk_tmt_perjanjian_mulai', 'pppk_tmt_perjanjian_selesai', 'pppk_tmt_golongan',
      'pppk_no_sk', 'pppk_tgl_sk', 'pppk_instansi_kerja', 'pppk_instansi_induk', 'pppk_satker', 'pppk_unor',
      'pppk_jabatan', 'pppk_golongan', 'nik', 'pkwt_tmt_sk', 'pkwt_no_sk_kontrak', 'pkwt_tgl_sk_kontrak',
      'pkwt_masa_kerja', 'pkwt_pembiayaan', 'pkwt_jabatan', 'pppw_jumlah_jam_kerja_per_minggu',
      'pppw_surat_kesepakatan_file', 'no_str', 'tanggal_terbit_str', 'tanggal_akhir_str', 'is_str_seumur_hidup',
      'no_sip', 'tanggal_terbit_sip', 'tanggal_akhir_sip', 'kp4_status_pernikahan', 'kp4_nik_pasangan',
      'kp4_nama_pasangan', 'kp4_pasangan_asn', 'kp4_pasangan_nip', 'kp4_pasangan_kerja_instansi',
      'kp4_pasangan_tunjangan_diklaim', 'kp4_tahun_validasi', 'kp4_tanggal_validasi', 'kp4_berkas_file_name',
      'kp4_berkas_file_path', 'kp4_daftar_anak'
    ];
    const asnSql = `INSERT OR REPLACE INTO asn_profiles (${asnCols.join(', ')}) VALUES (${asnCols.map(() => '?').join(', ')});`;

    for (const p of dbState.asnProfiles) {
      await queryCloudflareD1(
        asnSql,
        [
          p.id, p.nip || "", p.nama_lengkap || "", p.gelar_belakang || null, p.id_puskesmas || null, p.tanggal_lahir || "1990-01-01", p.golongan_ruang || "",
          p.tmt_pangkat_terakhir || "2025-01-01", p.tmt_berkala_terakhir || "2025-01-01", p.tmt_jabatan_terakhir || "2025-01-01", p.jenis_pegawai || "", p.jenjang_jafung || null,
          p.ak_integrasi_2022 || 0, p.sisa_cuti_tahunan ?? 12, p.status_kepegawaian || "Aktif", p.jenis_kelamin || "L", p.status_pegawai_detail || "PNS",
          p.id_profesi || null, p.nomor_wa || null, p.pangkat_nama || null, p.pns_jenis_kenaikan_pangkat || null, p.pns_masa_kerja_golongan || null,
          p.pns_tmt_golongan || null, p.pns_no_pertek_bkn || null, p.pns_tgl_pertek_bkn || null, p.pns_no_sk || null, p.pns_tgl_sk || null,
          p.pns_nama_jabatan || null, p.pns_jenis_jabatan || null, p.pns_jenis_mutasi || null, p.pns_tmt_jabatan || null, p.pns_instansi_kerja || null,
          p.pns_instansi_induk || null, p.pns_satker || null, p.pns_satker_induk || null, p.pns_unor || null, p.pns_unor_induk || null,
          p.pns_no_sk_jabatan || null, p.pns_tgl_sk_jabatan || null, p.pns_instansi_pembina || null, p.pppk_ni || null, p.pppk_no_perjanjian || null,
          p.pppk_tgl_perjanjian || null, p.pppk_tmt_perjanjian_mulai || null, p.pppk_tmt_perjanjian_selesai || null, p.pppk_tmt_golongan || null,
          p.pppk_no_sk || null, p.pppk_tgl_sk || null, p.pppk_instansi_kerja || null, p.pppk_instansi_induk || null, p.pppk_satker || null, p.pppk_unor || null,
          p.pppk_jabatan || null, p.pppk_golongan || null, p.nik || null, p.pkwt_tmt_sk || null, p.pkwt_no_sk_kontrak || null, p.pkwt_tgl_sk_kontrak || null,
          p.pkwt_masa_kerja || null, p.pkwt_pembiayaan || null, p.pkwt_jabatan || null, p.pppw_jumlah_jam_kerja_per_minggu || null,
          p.pppw_surat_kesepakatan_file || null, p.no_str || null, p.tanggal_terbit_str || null, p.tanggal_akhir_str || null, p.is_str_seumur_hidup ? 1 : 0,
          p.no_sip || null, p.tanggal_terbit_sip || null, p.tanggal_akhir_sip || null, p.kp4_status_pernikahan || null, p.kp4_nik_pasangan || null,
          p.kp4_nama_pasangan || null, p.kp4_pasangan_asn ? 1 : 0, p.kp4_pasangan_nip || null, p.kp4_pasangan_kerja_instansi || null,
          p.kp4_pasangan_tunjangan_diklaim ? 1 : 0, p.kp4_tahun_validasi || null, p.kp4_tanggal_validasi || null, p.kp4_berkas_file_name || null,
          p.kp4_berkas_file_path || null, p.kp4_daftar_anak || null
        ],
        overrideConfig
      );
    }
    logs.push(`✓ Biografi ${dbState.asnProfiles.length} pegawai berhasil disinkronkan ke D1.`);
  }

  // 6. Usulan Layanan
  if (shouldSync('usulanLayanan') && Array.isArray(dbState.usulanLayanan)) {
    logs.push(`📤 Mengirim ${dbState.usulanLayanan.length} usulan layanan ke D1...`);
    const activeIds = dbState.usulanLayanan.map((u: any) => u.id).filter((id: any) => id !== undefined && id !== null);
    if (activeIds.length > 0) {
      await queryCloudflareD1(`DELETE FROM usulan_layanan WHERE id NOT IN (${activeIds.join(',')});`, [], overrideConfig);
    } else {
      await queryCloudflareD1(`DELETE FROM usulan_layanan;`, [], overrideConfig);
    }

    for (const u of dbState.usulanLayanan) {
      await queryCloudflareD1(
        `INSERT OR REPLACE INTO usulan_layanan (id, id_fitur, id_asn, id_puskesmas_pengusul, tanggal_pengusulan, status, catatan_perbaikan, file_sk_final) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [u.id, u.id_fitur, u.id_asn, u.id_puskesmas_pengusul, u.tanggal_pengusulan || new Date().toISOString(), u.status, u.catatan_perbaikan || null, u.file_sk_final || null],
        overrideConfig
      );
    }
    logs.push(`✓ Data usulan layanan kepegawaian tersimpan.`);
  }

  // 7. Usulan Dokumen File
  if (shouldSync('usulanDokumenFile') && Array.isArray(dbState.usulanDokumenFile)) {
    const activeIds = dbState.usulanDokumenFile.map((df: any) => df.id).filter((id: any) => id !== undefined && id !== null);
    if (activeIds.length > 0) {
      await queryCloudflareD1(`DELETE FROM usulan_dokumen_file WHERE id NOT IN (${activeIds.join(',')});`, [], overrideConfig);
    } else {
      await queryCloudflareD1(`DELETE FROM usulan_dokumen_file;`, [], overrideConfig);
    }

    for (const df of dbState.usulanDokumenFile) {
      await queryCloudflareD1(
        `INSERT OR REPLACE INTO usulan_dokumen_file (id, id_usulan, id_dokumen, file_name, file_path, uploaded_at, ocr_status, ocr_feedback_message, data_url, text_ocr_result) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [df.id, df.id_usulan, df.id_dokumen, df.file_name, df.file_path, df.uploaded_at || new Date().toISOString(), df.ocr_status || 'GENERIC_PASS', df.ocr_feedback_message || null, df.data_url || null, df.text_ocr_result || null],
        overrideConfig
      );
    }
  }

  // 8. Riwayat AK
  if (shouldSync('riwayatAk') && Array.isArray(dbState.riwayatAk)) {
    const activeIds = dbState.riwayatAk.map((ak: any) => ak.id).filter((id: any) => id !== undefined && id !== null);
    if (activeIds.length > 0) {
      await queryCloudflareD1(`DELETE FROM riwayat_ak WHERE id NOT IN (${activeIds.join(',')});`, [], overrideConfig);
    } else {
      await queryCloudflareD1(`DELETE FROM riwayat_ak;`, [], overrideConfig);
    }

    for (const ak of dbState.riwayatAk) {
      await queryCloudflareD1(
        `INSERT OR REPLACE INTO riwayat_ak (id, id_asn, tahun_skp, predikat_skp, ak_diperoleh) VALUES (?, ?, ?, ?, ?);`,
        [ak.id, ak.id_asn, ak.tahun_skp, ak.predikat_skp, ak.ak_diperoleh],
        overrideConfig
      );
    }
  }

  // 9. Laporan SDMK
  if (shouldSync('laporanSdmk') && Array.isArray(dbState.laporanSdmk)) {
    const activeIds = dbState.laporanSdmk.map((lp: any) => lp.id).filter((id: any) => id !== undefined && id !== null);
    if (activeIds.length > 0) {
      await queryCloudflareD1(`DELETE FROM laporan_sdmk WHERE id NOT IN (${activeIds.join(',')});`, [], overrideConfig);
    } else {
      await queryCloudflareD1(`DELETE FROM laporan_sdmk;`, [], overrideConfig);
    }

    for (const lp of dbState.laporanSdmk) {
      await queryCloudflareD1(
        `INSERT OR REPLACE INTO laporan_sdmk (id, id_puskesmas, periode_bulan, periode_tahun, id_profesi, pns_l, pns_p, p3k_pn_l, p3k_pn_p, p3k_pw_l, p3k_pw_p, non_asn_l, non_asn_p) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [lp.id, lp.id_puskesmas, lp.periode_bulan, lp.periode_tahun, lp.id_profesi, lp.pns_l || 0, lp.pns_p || 0, lp.p3k_pn_l || 0, lp.p3k_pn_p || 0, lp.p3k_pw_l || 0, lp.p3k_pw_p || 0, lp.non_asn_l || 0, lp.non_asn_p || 0],
        overrideConfig
      );
    }
  }

  // 10. Arsip Kepegawaian
  if (shouldSync('arsipKepegawaian') && Array.isArray(dbState.arsipKepegawaian)) {
    const activeIds = dbState.arsipKepegawaian.map((ar: any) => ar.id).filter((id: any) => id !== undefined && id !== null);
    if (activeIds.length > 0) {
      await queryCloudflareD1(`DELETE FROM arsip_kepegawaian WHERE id NOT IN (${activeIds.join(',')});`, [], overrideConfig);
    } else {
      await queryCloudflareD1(`DELETE FROM arsip_kepegawaian;`, [], overrideConfig);
    }

    for (const ar of dbState.arsipKepegawaian) {
      await queryCloudflareD1(
        `INSERT OR REPLACE INTO arsip_kepegawaian (id, id_asn, nama_berkas, kategori_kelompok, file_name, file_path, uploaded_at, source, notes, str_expired_date, pkwt_tahun) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [ar.id, ar.id_asn, ar.nama_berkas, ar.kategori_kelompok, ar.file_name, ar.file_path, ar.uploaded_at || new Date().toISOString(), ar.source || 'Upload Kerja', ar.notes || null, ar.str_expired_date || null, ar.pkwt_tahun || null],
        overrideConfig
      );
    }
  }

  // 11. Users
  if (shouldSync('users') && Array.isArray(dbState.users)) {
    const activeIds = dbState.users.map((usr: any) => usr.id).filter((id: any) => id !== undefined && id !== null);
    if (activeIds.length > 0) {
      await queryCloudflareD1(`DELETE FROM users WHERE id NOT IN (${activeIds.join(',')});`, [], overrideConfig);
    } else {
      await queryCloudflareD1(`DELETE FROM users;`, [], overrideConfig);
    }

    for (const usr of dbState.users) {
      await queryCloudflareD1(
        `INSERT OR REPLACE INTO users (id, nip, nama_lengkap, role, id_puskesmas, username, password, nomor_wa) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [usr.id, usr.nip, usr.nama_lengkap, usr.role, usr.id_puskesmas || null, usr.username || null, usr.password || null, usr.nomor_wa || null],
        overrideConfig
      );
    }
  }

  return { success: true, log: logs };
}

/**
 * Delete a single record directly from Cloudflare D1
 */
export async function deleteRecordFromCloudflareD1(
  table: string,
  id: number | string,
  overrideConfig?: Partial<D1ServerConfig>
): Promise<{ success: boolean; error?: string; log?: string[] }> {
  const allowedTables = [
    'puskesmas',
    'fitur',
    'dokumen',
    'asn_profiles',
    'usulan_layanan',
    'usulan_dokumen_file',
    'riwayat_ak',
    'laporan_sdmk',
    'arsip_kepegawaian',
    'users'
  ];

  if (!allowedTables.includes(table)) {
    return { success: false, error: `Tabel "${table}" tidak diizinkan untuk operasi penghapusan.` };
  }

  const logs: string[] = [];
  try {
    if (table === 'asn_profiles') {
      // Cascade delete relations tied to this pegawai
      await queryCloudflareD1(`DELETE FROM usulan_layanan WHERE id_asn = ?;`, [id], overrideConfig);
      await queryCloudflareD1(`DELETE FROM riwayat_ak WHERE id_asn = ?;`, [id], overrideConfig);
      await queryCloudflareD1(`DELETE FROM arsip_kepegawaian WHERE id_asn = ?;`, [id], overrideConfig);
      logs.push(`✓ Data relasi usulan, riwayat AK, dan arsip untuk pegawai id ${id} telah dihapus.`);
    }

    const res = await queryCloudflareD1(`DELETE FROM ${table} WHERE id = ?;`, [id], overrideConfig);
    if (res.success) {
      logs.push(`✓ Record id ${id} berhasil dihapus permanen dari tabel ${table} di Cloudflare D1.`);
      return { success: true, log: logs };
    } else {
      return { success: false, error: res.error, log: logs };
    }
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Pull all tables from Cloudflare D1
 */
export async function pullDataFromCloudflareD1(
  overrideConfig?: Partial<D1ServerConfig>
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const puskRes = await queryCloudflareD1("SELECT * FROM puskesmas ORDER BY id ASC;", [], overrideConfig);
    const profRes = await queryCloudflareD1("SELECT * FROM profesi_sdmk ORDER BY id ASC;", [], overrideConfig);
    const fiturRes = await queryCloudflareD1("SELECT * FROM fitur ORDER BY id ASC;", [], overrideConfig);
    const docRes = await queryCloudflareD1("SELECT * FROM dokumen ORDER BY id ASC;", [], overrideConfig);
    const mapRes = await queryCloudflareD1("SELECT * FROM syarat_fitur_map;", [], overrideConfig);
    const asnRes = await queryCloudflareD1("SELECT * FROM asn_profiles ORDER BY id ASC;", [], overrideConfig);
    const usulanRes = await queryCloudflareD1("SELECT * FROM usulan_layanan ORDER BY id ASC;", [], overrideConfig);
    const docFileRes = await queryCloudflareD1("SELECT * FROM usulan_dokumen_file ORDER BY id ASC;", [], overrideConfig);
    const akRes = await queryCloudflareD1("SELECT * FROM riwayat_ak ORDER BY id ASC;", [], overrideConfig);
    const sdmkRes = await queryCloudflareD1("SELECT * FROM laporan_sdmk ORDER BY id ASC;", [], overrideConfig);
    const arsipRes = await queryCloudflareD1("SELECT * FROM arsip_kepegawaian ORDER BY id ASC;", [], overrideConfig);
    const usersRes = await queryCloudflareD1("SELECT * FROM users ORDER BY id ASC;", [], overrideConfig);

    if (!puskRes.success && puskRes.needs_credentials) {
      return { success: false, error: puskRes.error };
    }

    // Build syarat_fitur_map dictionary by slug
    const syaratFiturMap: Record<string, number[]> = {};
    const fiturList = fiturRes.results || [];
    const mapList = mapRes.results || [];
    for (const f of fiturList) {
      const matchDocIds = mapList.filter((m: any) => m.id_fitur === f.id).map((m: any) => Number(m.id_dokumen));
      syaratFiturMap[f.slug] = matchDocIds;
    }

    return {
      success: true,
      data: {
        puskesmas: puskRes.results || [],
        profesiSdmk: profRes.results || [],
        fitur: fiturList,
        dokumen: docRes.results || [],
        syaratFiturMap,
        asnProfiles: asnRes.results || [],
        usulanLayanan: usulanRes.results || [],
        usulanDokumenFile: docFileRes.results || [],
        riwayatAk: akRes.results || [],
        laporanSdmk: sdmkRes.results || [],
        arsipKepegawaian: arsipRes.results || [],
        users: usersRes.results || []
      }
    };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}
