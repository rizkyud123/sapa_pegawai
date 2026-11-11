/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  Puskesmas, 
  ASNProfile, 
  MasterFitur, 
  MasterDokumen, 
  UsulanLayanan, 
  MasterProfesiSDMK, 
  LaporanSDMKBulanan,
  RiwayatAngkaKredit,
  User,
  ArsipKepegawaian,
  InAppNotification
} from './types';

// 1. Lister Puskesmas (including UPT Puskesmas Sedau as safe ID 100)
export const MASTER_PUSKESMAS: Puskesmas[] = [
  { id: 100, kode_puskesmas: "P520106", nama_puskesmas: "UPT Puskesmas Sedau", alamat: "Jl. Raya Sedau, Kec. Narmada, Kab. Lombok Barat", total_penduduk: 45000 },
  { id: 1, kode_puskesmas: "P520101", nama_puskesmas: "Puskesmas Gerung", alamat: "Jl. Ki Hajar Dewantara No. 12, Gerung, Lombok Barat", total_penduduk: 92000 },
  { id: 2, kode_puskesmas: "P520102", nama_puskesmas: "Puskesmas Narmada", alamat: "Jl. Raya Narmada No. 45, Narmada, Lombok Barat", total_penduduk: 110000 },
  { id: 3, kode_puskesmas: "P520103", nama_puskesmas: "Puskesmas Kediri", alamat: "Jl. TGH Abdul Karim, Kediri, Lombok Barat", total_penduduk: 85000 },
  { id: 4, kode_puskesmas: "P520104", nama_puskesmas: "Puskesmas Gunungsari", alamat: "Jl. Raya Gunungsari No. 8, Gunungsari, Lombok Barat", total_penduduk: 98000 },
  { id: 5, kode_puskesmas: "P520105", nama_puskesmas: "Puskesmas Lingsar", alamat: "Jl. Raya Lingsar, Lingsar, Lombok Barat", total_penduduk: 76000 }
];

// 2. Master Fitur (Layanan Core 1-9 & SDMK 11. Renbut 10 removed!)
export const MASTER_FITUR: MasterFitur[] = [
  { id: 1, nama_fitur: "Kenaikan Pangkat", slug: "kenaikan-pangkat", warning_threshold_bulan: 4, is_active: true },
  { id: 2, nama_fitur: "Pensiun", slug: "pensiun", warning_threshold_bulan: 6, is_active: true },
  { id: 3, nama_fitur: "Usul Gaji Berkala", slug: "gaji-berkala", warning_threshold_bulan: 2, is_active: true },
  { id: 4, nama_fitur: "Cuti Kepegawaian", slug: "cuti", warning_threshold_bulan: 0, is_active: true },
  { id: 5, nama_fitur: "Izin Belajar", slug: "izin-belajar", warning_threshold_bulan: 0, is_active: true },
  { id: 6, nama_fitur: "Mutasi Internal", slug: "mutasi", warning_threshold_bulan: 0, is_active: true },
  { id: 7, nama_fitur: "Pencantuman Gelar", slug: "pencantuman-gelar", warning_threshold_bulan: 0, is_active: true },
  { id: 8, nama_fitur: "Uji Kompetensi", slug: "uji-kompetensi", warning_threshold_bulan: 0, is_active: true },
  { id: 9, nama_fitur: "Usulan Jafung & Angka Kredit", slug: "usulan-jafung", warning_threshold_bulan: 0, is_active: true },
  { id: 11, nama_fitur: "Laporan SDMK", slug: "keadaan-sdmk", warning_threshold_bulan: 0, is_active: true }
];

// 3. Master Dokumen
export const MASTER_DOKUMEN: MasterDokumen[] = [
  { id: 1, nama_dokumen: "Surat Pengantar Kepsek Puskesmas", kata_kunci_ocr: "SURAT PENGANTAR, KEPALA PUSKESMAS, DINKES" },
  { id: 2, nama_dokumen: "SK Pangkat Terakhir", kata_kunci_ocr: "KEPUTUSAN BUPATI, KENAIKAN PANGKAT, GOLONGAN" },
  { id: 3, nama_dokumen: "PAK (Penetapan Angka Kredit)", kata_kunci_ocr: "ANGKA KREDIT, KOMULATIF, JAFUNG, JABATAN" },
  { id: 4, nama_dokumen: "Penilaian Prestasi Kerja (SKP) 2 Tahun", kata_kunci_ocr: "SASARAN KINERJA PEGAWAI, PRESTASI KERJA, BAIK" },
  { id: 5, nama_dokumen: "Surat Permohonan Pensiun", kata_kunci_ocr: "PERMOHONAN PENSIUN, APS, BUP, KELUARGA" },
  { id: 6, nama_dokumen: "Data Riwayat Hidup / Buku Nikah", kata_kunci_ocr: "DAFTAR RIWAYAT HIDUP, NIKAH, KELUARGA, ANAK" },
  { id: 7, nama_dokumen: "SK Kenaikan Gaji Berkala Terakhir", kata_kunci_ocr: "GAJI BERKALA, GAJI POKOK, TMT BERKALA" },
  { id: 8, nama_dokumen: "Surat Permohonan Cuti", kata_kunci_ocr: "PERMOHONAN CUTI, TAHUNAN, SAKIT, ALASAN PENTING" },
  { id: 9, nama_dokumen: "Rekomendasi Mutasi", kata_kunci_ocr: "REKOMENDASI MUTASI, PERSETUJUAN KEPALA, PINDAH" },
  { id: 10, nama_dokumen: "Ijazah Baru / Transkrip Nilai", kata_kunci_ocr: "IJAZAH, GELAR AKADEMIK, SARJANA, DIPLOMA" },
  { id: 11, nama_dokumen: "Sertifikat Kelulusan Uji Kompetensi", kata_kunci_ocr: "SERTIFIKAT KELULUSAN, UJI KOMPETENSI, UKOM, JAFUNG" }
];

// 4. Hubungan Syarat Dokumen per Fitur (Slug) - Initial Seed
export const INITIAL_SYARAT_FITUR_MAP: Record<string, number[]> = {
  "kenaikan-pangkat": [1, 2, 3, 4],
  "pensiun": [1, 5, 6],
  "gaji-berkala": [1, 7],
  "cuti": [1, 8],
  "izin-belajar": [1, 10],
  "mutasi": [1, 9],
  "pencantuman-gelar": [1, 10],
  "uji-kompetensi": [1, 11],
  "usulan-jafung": [1, 3, 4, 11]
};

// 5. Seeds ASN/Non-ASN Profiles (Classified as PNS, PPPK Penuh Waktu, PPPK Paruh Waktu, and PKWT/Non_ASN)
export const SEED_ASN_PROFILES: ASNProfile[] = [];

// 6. Master Profesi Rumpun SDMK
export const MASTER_PROFESI_SDMK: MasterProfesiSDMK[] = [
  { id: 1, nama_profesi: "Perawat" },
  { id: 2, nama_profesi: "Dokter" },
  { id: 3, nama_profesi: "Dokter Gigi" },
  { id: 4, nama_profesi: "Bidan" },
  { id: 5, nama_profesi: "Apoteker" },
  { id: 6, nama_profesi: "Tenaga Teknik Kefarmasian" },
  { id: 7, nama_profesi: "Promkes & Ilmu Perilaku" },
  { id: 8, nama_profesi: "Sanitarian" },
  { id: 9, nama_profesi: "Nutrisionis" },
  { id: 10, nama_profesi: "Ahli Teknologi Lab Medik" },
  { id: 11, nama_profesi: "Rekam Medis" },
  { id: 12, nama_profesi: "Terapis Gigi & Mulut" },
  { id: 13, nama_profesi: "Umum & Kepeg" },
  { id: 14, nama_profesi: "Tenaga Adm. Keuangan" },
  { id: 15, nama_profesi: "Tenaga Sistem Informasi Kes." }
];

// 7. Seed Riwayat SKP / Angka Kredit
export const SEED_RIWAYAT_AK: RiwayatAngkaKredit[] = [];

// 8. Initial Usulan Layanan
export const SEED_USULAN_LAYANAN: UsulanLayanan[] = [];

// 9. Seeding monthly SDMK reports for Lombok Barat (Juni 2026)
export const SEED_LAPORAN_SDMK: LaporanSDMKBulanan[] = [];

// 10. Seed users (Default Super Admin & Admin Puskesmas)
export const SEED_USERS: User[] = [
  {
    id: 1,
    nip: "198501012010011001",
    nama_lengkap: "Administrator Super (Dinkes)",
    role: "admin_dinkes",
    id_puskesmas: null,
    username: "admin",
    password: "admin",
    nomor_wa: "081234567890"
  },
  {
    id: 2,
    nip: "199002022015022002",
    nama_lengkap: "Admin UPT Puskesmas Sedau",
    role: "admin_puskesmas",
    id_puskesmas: 100,
    username: "sedau",
    password: "admin",
    nomor_wa: "081234567891"
  }
];

// Seed data for the Digital Archive library (Arsip Kepegawaian)
export const SEED_ARSIP_KEPEGAWAIAN: ArsipKepegawaian[] = [];

export const SEED_NOTIFICATIONS: InAppNotification[] = [];

// Helper to fully initialize and retrieve stored db state
export const initializeDB = () => {
  if (typeof window === 'undefined') return;

  const checkAndSet = (key: string, defaultVal: any) => {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
    }
  };

  // Master definitions: check null explicitly so an empty array [] or filtered list set by user is not overwritten
  const checkInitMaster = (key: string, defaultVal: any) => {
    if (localStorage.getItem(key) === null) {
      localStorage.setItem(key, JSON.stringify(defaultVal));
    }
  };

  checkInitMaster('simpeg_puskesmas', MASTER_PUSKESMAS);
  checkInitMaster('simpeg_fitur', MASTER_FITUR);
  checkInitMaster('simpeg_dokumen', MASTER_DOKUMEN);
  checkInitMaster('simpeg_syarat_fitur_map', INITIAL_SYARAT_FITUR_MAP);
  checkInitMaster('simpeg_profesi_sdmk', MASTER_PROFESI_SDMK);

  // Operational data: default with SEED_USERS so admin can always login
  checkInitMaster('simpeg_asn_profiles', []);
  checkInitMaster('simpeg_usulan_layanan', []);
  checkInitMaster('simpeg_riwayat_ak', []);
  checkInitMaster('simpeg_laporan_sdmk', []);
  checkInitMaster('simpeg_users', SEED_USERS);
  checkInitMaster('simpeg_arsip_kepegawaian', []);
  checkInitMaster('simpeg_notifications', []);

  checkInitMaster('simpeg_logo_url', '/icon.svg');
  checkInitMaster('simpeg_favicon_url', '/icon.svg');
  
  if (!localStorage.getItem('simpeg_usulan_dokumen_file')) {
    localStorage.setItem('simpeg_usulan_dokumen_file', JSON.stringify([]));
  }
};

export function getFallbackProfesiId(nama: string, gelar: string | null): number {
  const text = (nama + " " + (gelar || '')).toLowerCase();
  if (text.includes("drg. ") || text.includes("dokter gigi")) return 3; // Dokter Gigi
  if (text.includes("dr. ") || text.includes("dokter")) return 2; // Dokter
  if (text.includes("bidan") || text.includes("keb") || text.includes("a.md.keb")) return 4; // Bidan
  if (text.includes("perawat") || text.includes("kep") || text.includes("a.md.kep")) return 1; // Perawat
  if (text.includes("apoteker") || text.includes("farm") || text.includes("apt")) return 5; // Apoteker
  if (text.includes("tenaga teknik kefarmasian")) return 6;
  if (text.includes("promkes") || text.includes("ilmu perilaku")) return 7;
  if (text.includes("sanitarian") || text.includes("kesehatan lingkungan")) return 8;
  if (text.includes("nutrisionis") || text.includes("gizi")) return 9;
  if (text.includes("laboratorium") || text.includes("analis") || text.includes("a.k") || text.includes("lab medik") || text.includes("atlm")) return 10; // Ahli Teknologi Lab Medik
  if (text.includes("rekam medis")) return 11;
  if (text.includes("terapis gigi") || text.includes("mulut") || text.includes("kg")) return 12; // Terapis Gigi & Mulut
  if (text.includes("s.kom") || text.includes("sistem informasi") || text.includes("telematika")) return 15; // Tenaga Sistem Informasi Kes.
  if (text.includes("keuangan") || text.includes("akuntansi") || text.includes("se") || text.includes("kasir")) return 14; // Tenaga Adm. Keuangan
  return 13; // Umum & Kepeg
}

export const getDB = () => {
  initializeDB();

  const safeParse = <T>(key: string, fallback: T): T => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return fallback;
      const parsed = JSON.parse(item);
      return parsed as T;
    } catch (e) {
      console.warn(`Error parsing key "${key}" from localStorage, using fallback.`, e);
      return fallback;
    }
  };

  const rawProfiles = safeParse<ASNProfile[]>('simpeg_asn_profiles', []);
  console.log(`[getDB] Berhasil memuat rawProfiles dari localStorage (sebelum healed):`, rawProfiles);
  const safeProfilesList = Array.isArray(rawProfiles) ? rawProfiles : [];

  const healedProfiles: ASNProfile[] = safeProfilesList.map(p => {
    const updated = { ...p };
    updated.id_profesi = updated.id_profesi || getFallbackProfesiId(updated.nama_lengkap, updated.gelar_belakang);
    return updated;
  });

  const psk = safeParse<Puskesmas[]>('simpeg_puskesmas', []);
  const ftr = safeParse<MasterFitur[]>('simpeg_fitur', []);
  const doc = safeParse<MasterDokumen[]>('simpeg_dokumen', []);
  const map = safeParse<Record<string, number[]>>('simpeg_syarat_fitur_map', {});
  const usul = safeParse<UsulanLayanan[]>('simpeg_usulan_layanan', []);
  const ak = safeParse<RiwayatAngkaKredit[]>('simpeg_riwayat_ak', []);
  const lpr = safeParse<LaporanSDMKBulanan[]>('simpeg_laporan_sdmk', []);
  const prof = safeParse<MasterProfesiSDMK[]>('simpeg_profesi_sdmk', []);
  const udoc = safeParse<any[]>('simpeg_usulan_dokumen_file', []);
  const ars = safeParse<ArsipKepegawaian[]>('simpeg_arsip_kepegawaian', []);
  const rawUsers = safeParse<User[]>('simpeg_users', []);
  const usr = Array.isArray(rawUsers) && rawUsers.length > 0 ? rawUsers : SEED_USERS;
  const ntf = safeParse<InAppNotification[]>('simpeg_notifications', []);

  return {
    puskesmas: Array.isArray(psk) ? psk : [],
    fitur: Array.isArray(ftr) ? ftr : [],
    dokumen: Array.isArray(doc) ? doc : [],
    syaratFiturMap: (map && typeof map === 'object') ? map : {},
    asnProfiles: healedProfiles,
    usulanLayanan: Array.isArray(usul) ? usul : [],
    riwayatAk: Array.isArray(ak) ? ak : [],
    laporanSdmk: Array.isArray(lpr) ? lpr : [],
    profesiSdmk: Array.isArray(prof) ? prof : [],
    usulanDokumenFile: Array.isArray(udoc) ? udoc : [],
    arsipKepegawaian: Array.isArray(ars) ? ars : [],
    users: Array.isArray(usr) ? usr : [],
    notifications: Array.isArray(ntf) ? ntf : [],
    logoUrl: localStorage.getItem('simpeg_logo_url') || '/icon.svg',
    faviconUrl: localStorage.getItem('simpeg_favicon_url') || '/icon.svg'
  };
};

export const saveDB = (data: Partial<ReturnType<typeof getDB>> & Record<string, any>) => {
  if (typeof window === 'undefined') return;
  Object.entries(data).forEach(([key, val]) => {
    let storageKey = '';
    if (key === 'puskesmas') storageKey = 'simpeg_puskesmas';
    else if (key === 'fitur') storageKey = 'simpeg_fitur';
    else if (key === 'dokumen') storageKey = 'simpeg_dokumen';
    else if (key === 'syaratFiturMap') storageKey = 'simpeg_syarat_fitur_map';
    else if (key === 'asnProfiles') storageKey = 'simpeg_asn_profiles';
    else if (key === 'usulanLayanan') storageKey = 'simpeg_usulan_layanan';
    else if (key === 'riwayatAk') storageKey = 'simpeg_riwayat_ak';
    else if (key === 'laporanSdmk') storageKey = 'simpeg_laporan_sdmk';
    else if (key === 'profesiSdmk') storageKey = 'simpeg_profesi_sdmk';
    else if (key === 'usulanDokumenFile') storageKey = 'simpeg_usulan_dokumen_file';
    else if (key === 'arsipKepegawaian') storageKey = 'simpeg_arsip_kepegawaian';
    else if (key === 'users') storageKey = 'simpeg_users';
    else if (key === 'logoUrl') storageKey = 'simpeg_logo_url';
    else if (key === 'faviconUrl') storageKey = 'simpeg_favicon_url';
    else if (key === 'notifications') storageKey = 'simpeg_notifications';

    if (storageKey) {
      const serializedValue = typeof val === 'string' ? val : JSON.stringify(val);
      try {
        localStorage.setItem(storageKey, serializedValue);
        if (storageKey === 'simpeg_asn_profiles') {
          console.log(`[saveDB] Berhasil menyimpan simpeg_asn_profiles ke localStorage:`, val);
        }
      } catch (err: any) {
        if (err.name === 'QuotaExceededError' || err.code === 22 || err.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
          console.warn(`SAPA Storage quota exceeded for key "${storageKey}". Attempting automatic base64 compression/pruning of older records...`);
          
          if (storageKey === 'simpeg_arsip_kepegawaian' || storageKey === 'simpeg_usulan_dokumen_file') {
            try {
              const list = typeof val === 'string' ? JSON.parse(val) : val;
              if (Array.isArray(list)) {
                // Keep only the most recent files intact, stub the rest to save space.
                const processed = list.map((item: any, idx: number) => {
                  // Keep item fully intact if it is the latest uploaded item
                  if (idx < list.length - 1 && item.file_path && item.file_path.startsWith('data:')) {
                    return {
                      ...item,
                      file_path: "data:application/pdf;base64,SIMULATED_LARGE_FILE_REDUCED_TO_PRESERVE_LOCAL_QUOTA_STUB_OK"
                    };
                  }
                  return item;
                });
                localStorage.setItem(storageKey, JSON.stringify(processed));
                console.log(`Successfully saved processed/pruned list for "${storageKey}" within localStorage quota limit!`);
                return;
              }
            } catch (_) {}
          }
          console.error(`Unable to automatically compress store data for key "${storageKey}".`);
        } else {
          console.error(`Storage save failure for key "${storageKey}":`, err);
        }
      }
    }
  });
};
