/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Puskesmas {
  id: number;
  kode_puskesmas: string;
  nama_puskesmas: string;
  alamat: string;
  total_penduduk?: number;
}

export type RoleType = 'admin_dinkes' | 'admin_puskesmas';

export interface User {
  id: bigint | number;
  nip: string;
  nama_lengkap: string;
  role: RoleType;
  id_puskesmas: number | null; // NULL if Dinkes
  username?: string;
  password?: string;
  nomor_wa?: string;
}

export type JenisPegawai = 'Struktural' | 'Jafung_Kesehatan' | 'Staf_Umum';
export type StatusKepegawaian = 'Aktif' | 'Pensiun' | 'Mutasi_Keluar';
export type JenisKelamin = 'L' | 'P';
export type StatusPegawaiDetail = 'PNS' | 'PPPK_Penuh_Waktu' | 'PPPK_Paruh_Waktu' | 'Non_ASN';

export interface KP4Anak {
  id: number;
  nik: string;
  nama: string;
  tanggal_lahir: string; // YYYY-MM-DD
  status_sekolah: 'Tidak Sekolah' | 'Sekolah/Kuliah' | 'Bekerja' | 'Menikah';
  has_skks: boolean; // Surat Keterangan Kuliah/Sekolah
  skks_nomor?: string;
  skks_tanggal_terbit?: string;
  tunjangan_diklaim: boolean; // Apakah menerima tunjangan (max 2 anak)
}

export interface ASNProfile {
  id: number;
  nip: string;
  nama_lengkap: string;
  gelar_belakang: string | null;
  id_puskesmas: number;
  tanggal_lahir: string; // ISO Date YYYY-MM-DD
  golongan_ruang: string; // e.g., "III/a", "III/b", "IV/a"
  tmt_pangkat_terakhir: string; // ISO Date
  tmt_berkala_terakhir: string; // ISO Date
  tmt_jabatan_terakhir: string; // ISO Date
  jenis_pegawai: JenisPegawai;
  jenjang_jafung: string | null; // e.g. "Terampil", "Ahli Pertama", "Ahli Muda", "Ahli Madya"
  ak_integrasi_2022: number;
  sisa_cuti_tahunan: number;
  status_kepegawaian: StatusKepegawaian;
  jenis_kelamin: JenisKelamin;
  status_pegawai_detail: StatusPegawaiDetail; // PNS, P3K (PN/PW), Non-ASN for logic crosschecks
  id_profesi?: number; // Linked Rumpun Profesi Kes (15)
  nomor_wa?: string; // Active WhatsApp number with +62 prefix

  // === PNS Detail Fields ===
  pangkat_nama?: string; // e.g. "Pembina Tingkat I" or "Penata"
  pns_jenis_kenaikan_pangkat?: string; // e.g. "Pilihan (Jabatan Fungsional Tertentu)"
  pns_masa_kerja_golongan?: string; // e.g. "28 tahun 1 bulan"
  pns_tmt_golongan?: string; // YYYY-MM-DD
  pns_no_pertek_bkn?: string;
  pns_tgl_pertek_bkn?: string; // YYYY-MM-DD
  pns_no_sk?: string;
  pns_tgl_sk?: string; // YYYY-MM-DD
  pns_nama_jabatan?: string; // e.g. "Perawat Ahli Madya"
  pns_jenis_jabatan?: string; // e.g. "Jabatan Fungsional"
  pns_jenis_mutasi?: string; // e.g. "Mutasi Jabatan"
  pns_tmt_jabatan?: string; // YYYY-MM-DD
  pns_instansi_kerja?: string;
  pns_instansi_induk?: string;
  pns_satker?: string;
  pns_satker_induk?: string;
  pns_unor?: string;
  pns_unor_induk?: string;
  pns_no_sk_jabatan?: string;
  pns_tgl_sk_jabatan?: string; // YYYY-MM-DD
  pns_instansi_pembina?: string;

  // === PPPK (Penuh / Paruh Waktu) BKN Regulated Fields ===
  pppk_ni?: string; // Nomor Induk PPPK
  pppk_no_perjanjian?: string;
  pppk_tgl_perjanjian?: string; // YYYY-MM-DD
  pppk_tmt_perjanjian_mulai?: string; // YYYY-MM-DD
  pppk_tmt_perjanjian_selesai?: string; // YYYY-MM-DD
  pppk_tmt_golongan?: string; // YYYY-MM-DD
  pppk_no_sk?: string;
  pppk_tgl_sk?: string; // YYYY-MM-DD
  pppk_instansi_kerja?: string;
  pppk_instansi_induk?: string;
  pppk_satker?: string;
  pppk_unor?: string;
  pppk_jabatan?: string;
  pppk_golongan?: string; // e.g. "IX", "VII"

  // === PKWT / Non_ASN Fields ===
  nik?: string; // Nomor Induk Kependudukan
  pkwt_tmt_sk?: string; // YYYY-MM-DD
  pkwt_no_sk_kontrak?: string;
  pkwt_tgl_sk_kontrak?: string; // YYYY-MM-DD
  pkwt_masa_kerja?: string;
  pkwt_pembiayaan?: 'APBD' | 'BLUD' | 'APBN';
  pkwt_jabatan?: string;

  // === PPPK Paruh Waktu Additional Attributes ===
  pppw_jumlah_jam_kerja_per_minggu?: number;
  pppw_surat_kesepakatan_file?: string; // name or dummy url of uploaded file schedule

  // === STR & SIP Fields ===
  no_str?: string;
  tanggal_terbit_str?: string;
  tanggal_akhir_str?: string;
  is_str_seumur_hidup?: boolean;
  no_sip?: string;
  tanggal_terbit_sip?: string;
  tanggal_akhir_sip?: string;

  // === KP4 / Model DK Fields (Tunjangan Keluarga ASN) ===
  kp4_status_pernikahan?: 'Belum Kawin' | 'Kawin' | 'Cerai Hidup' | 'Cerai Mati';
  kp4_nik_pasangan?: string;
  kp4_nama_pasangan?: string;
  kp4_pasangan_asn?: boolean;
  kp4_pasangan_nip?: string;
  kp4_pasangan_kerja_instansi?: string;
  kp4_pasangan_tunjangan_diklaim?: boolean;
  kp4_tahun_validasi?: number;
  kp4_tanggal_validasi?: string; // YYYY-MM-DD
  kp4_berkas_file_name?: string;
  kp4_berkas_file_path?: string; // Data URL / Base64/ Placeholder
  kp4_daftar_anak?: string; // JSON String of KP4Anak[]
}

export interface MasterFitur {
  id: number;
  nama_fitur: string;
  slug: string;
  warning_threshold_bulan: number; // 0 if none
  is_active: boolean;
  konfigurasi_tambahan?: string;
}

export interface MasterDokumen {
  id: number;
  nama_dokumen: string;
  kata_kunci_ocr: string; // comma separated keywords
}

export interface SyaratFitur {
  id_fitur: number;
  id_dokumen: number;
}

export type StatusUsulan = 'Draft' | 'Menunggu Validasi' | 'Perbaikan Berkas' | 'Diproses' | 'Selesai' | 'Usulan Dikirim ke BKD' | 'Pemberitahuan';

export interface UsulanLayanan {
  id: number;
  id_fitur: number;
  id_asn: number;
  id_puskesmas_pengusul: number;
  tanggal_pengusulan: string; // ISO timestamp
  status: StatusUsulan;
  catatan_perbaikan: string | null;
  file_sk_final: string | null; // name/URL of uploaded file
}

export interface UsulanDokumenFile {
  id: number;
  id_usulan: number;
  id_dokumen: number;
  file_name: string;
  file_path: string;
  uploaded_at: string;
  ocr_status: 'SUCCESS' | 'FAILED' | 'GENERIC_PASS';
  ocr_feedback_message?: string;
  data_url?: string;
  text_ocr_result?: string;
}

export type PredikatSKP = 'Sangat Baik' | 'Baik' | 'Butuh Perbaikan' | 'Kurang' | 'Sangat Kurang';

export interface RiwayatAngkaKredit {
  id: number;
  id_asn: number;
  tahun_skp: number;
  predikat_skp: PredikatSKP;
  ak_diperoleh: number;
}

export interface MasterProfesiSDMK {
  id: number;
  nama_profesi: string;
}

export interface MasterRenbutKemenkes {
  id: number;
  id_puskesmas: number;
  nama_jabatan: string; // Jafung title matching jenjang
  jenjang: string; // Terampil, Ahli Pertama, Ahli Muda, Ahli Madya
  kuota_ideal_kemenkes: number;
  tahun_anggaran: number;
}

export interface LaporanSDMKBulanan {
  id: number;
  id_puskesmas: number;
  periode_bulan: number; // 1 to 12
  periode_tahun: number;
  id_profesi: number;
  pns_l: number;
  pns_p: number;
  p3k_pn_l: number;
  p3k_pn_p: number;
  p3k_pw_l: number;
  p3k_pw_p: number;
  non_asn_l: number;
  non_asn_p: number;
}

export interface ArsipKepegawaian {
  id: number;
  id_asn: number;
  nama_berkas: string; // e.g., "SK CPNS", "STR", "Perjanjian Kerja PPPK"
  kategori_kelompok: 'Dasar' | 'Mutasi' | 'Pendidikan' | 'Personal' | 'Kinerja' | 'PPPK_Khusus' | 'PKWT_Khusus';
  file_name: string; // e.g., "sk_cpns_dany.pdf"
  file_path: string; // File contents (fake path or sample placeholder dataUrl)
  uploaded_at: string; // ISO datetime
  source: 'Upload Kerja' | 'Auto-Copy Usulan'; 
  notes?: string;
  str_expired_date?: string; // Optional warning if STR is expiring soon
  pkwt_tahun?: number; // Optional contract year groups
}

export interface InAppNotification {
  id: number;
  sender: string;
  time: string; // ISO date string
  title: string;
  message: string;
  targetRole: 'admin_dinkes' | 'admin_puskesmas';
  targetPuskesmasId?: number | null; // null if for admin_dinkes, otherwise specific puskesmas id
  isRead: boolean;
}


