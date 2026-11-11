import React, { useState, useEffect, useMemo } from 'react';
import { 
  Award, 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle, 
  AlertTriangle, 
  AlertCircle, 
  Search, 
  FileText, 
  Edit3, 
  Filter, 
  ArrowRight, 
  Shield, 
  X, 
  Briefcase, 
  Printer, 
  Download, 
  RefreshCw,
  Sliders,
  ChevronDown,
  Check,
  Send,
  ExternalLink,
  Info
} from 'lucide-react';
import { ASNProfile, Puskesmas } from '../../types';
import { formatDate, sendWhatsAppMessage, normalizeIndonesianPhoneNumber } from '../../utils';

interface PemantauanASNViewProps {
  currentRole: string;
  selectedPuskesmasId: number | null;
  puskesmasList: Puskesmas[];
  asnProfiles: ASNProfile[];
  initialSubTab?: 'pangkat' | 'jafung' | 'kgb' | 'pensiun';
  onUpdateAsnProfiles?: (updated: ASNProfile[]) => void;
  onNavigateToService?: (asnId: number, serviceSlug: string) => void;
}

const GOLONGAN_TO_PANGKAT: Record<string, string> = {
  "I/a": "Juru Muda",
  "I/b": "Juru Muda Tk. I",
  "I/c": "Juru",
  "I/d": "Juru Tk. I",
  "II/a": "Pengatur Muda",
  "II/b": "Pengatur Muda Tk. I",
  "II/c": "Pengatur",
  "II/d": "Pengatur Tk. I",
  "III/a": "Penata Muda",
  "III/b": "Penata Muda Tk. I",
  "III/c": "Penata",
  "III/d": "Penata Tk. I",
  "IV/a": "Pembina",
  "IV/b": "Pembina Tk. I",
  "IV/c": "Pembina Utama Muda",
  "IV/d": "Pembina Utama Madya",
  "IV/e": "Pembina Utama"
};

const LIST_GOLONGAN = [
  "I/a", "I/b", "I/c", "I/d",
  "II/a", "II/b", "II/c", "II/d",
  "III/a", "III/b", "III/c", "III/d",
  "IV/a", "IV/b", "IV/c", "IV/d", "IV/e"
];

const getNextGolongan = (currentGol: string) => {
  const idx = LIST_GOLONGAN.indexOf(currentGol);
  if (idx !== -1 && idx < LIST_GOLONGAN.length - 1) {
    return LIST_GOLONGAN[idx + 1];
  }
  return currentGol;
};

const JENJANG_JAFUNG_ORDER = [
  "Terampil",
  "Mahir",
  "Penyelia",
  "Ahli Pertama",
  "Ahli Muda",
  "Ahli Madya",
  "Ahli Utama"
];

const getNextJenjangJafung = (currentJenjang: string | null) => {
  if (!currentJenjang) return "Ahli Muda";
  if (currentJenjang.toLowerCase().includes("terampil")) return "Mahir";
  if (currentJenjang.toLowerCase().includes("mahir")) return "Penyelia";
  if (currentJenjang.toLowerCase().includes("penyelia")) return "Penyelia (Maksimal Keterampilan)";
  if (currentJenjang.toLowerCase().includes("pertama")) return "Ahli Muda";
  if (currentJenjang.toLowerCase().includes("muda")) return "Ahli Madya";
  if (currentJenjang.toLowerCase().includes("madya")) return "Ahli Utama";
  if (currentJenjang.toLowerCase().includes("utama")) return "Ahli Utama (Jenjang Tertinggi)";
  return "Ahli Muda";
};

// Helper: parse date safely
const parseDateSafe = (dateStr?: string | null): Date | null => {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

// Helper: parse birth date from NIP if missing
const getBirthDateFromProfile = (asn: ASNProfile): Date => {
  if (asn.tanggal_lahir) {
    const d = new Date(asn.tanggal_lahir);
    if (!isNaN(d.getTime())) return d;
  }
  if (asn.nip && asn.nip.length >= 8) {
    const y = parseInt(asn.nip.slice(0, 4), 10);
    const m = parseInt(asn.nip.slice(4, 6), 10) - 1;
    const d = parseInt(asn.nip.slice(6, 8), 10);
    const calculated = new Date(y, m, d);
    if (!isNaN(calculated.getTime())) return calculated;
  }
  // Fallback 1985
  return new Date(1985, 0, 1);
};

export default function PemantauanASNView({
  currentRole,
  selectedPuskesmasId,
  puskesmasList,
  asnProfiles,
  initialSubTab = 'pangkat',
  onUpdateAsnProfiles,
  onNavigateToService
}: PemantauanASNViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'pangkat' | 'jafung' | 'kgb' | 'pensiun'>(initialSubTab);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Selected ASN for Update Modal
  const [editingItem, setEditingItem] = useState<any | null>(null);
  
  // Selected ASN for SK Preview Modal
  const [skPreviewItem, setSkPreviewItem] = useState<any | null>(null);

  // Success Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Helper to get Puskesmas / Unit Name
  const getUnitName = (idPuskesmas?: number | null) => {
    if (!idPuskesmas || idPuskesmas === 100) return 'UPT Puskesmas Sedau';
    const found = puskesmasList.find(p => p.id === idPuskesmas);
    return found ? found.nama_puskesmas : 'UPT Puskesmas Sedau';
  };

  const today = useMemo(() => new Date(), []);

  // Filtered source profiles based on multi-tenant scope
  const scopedProfiles = useMemo(() => {
    return (asnProfiles || []).filter(asn => {
      if (asn.status_kepegawaian === 'Pensiun') return false;
      if (currentRole !== 'admin_dinkes' && selectedPuskesmasId) {
        return asn.id_puskesmas === selectedPuskesmasId;
      }
      return true;
    });
  }, [asnProfiles, currentRole, selectedPuskesmasId]);

  // =========================================================================
  // 1. DATA PEMANTAUAN: KENAIKAN PANGKAT (PNS)
  // Aturan KemenPAN-RB / BKN: Siklus 4 Tahun, 6 Periode BKN (Feb, Apr, Jun, Ags, Okt, Des)
  // =========================================================================
  const pnsPangkatList = useMemo(() => {
    return scopedProfiles
      .filter(asn => asn.status_pegawai_detail === 'PNS')
      .map(asn => {
        const lastTmtStr = asn.tmt_pangkat_terakhir || asn.pns_tmt_golongan || '2022-04-01';
        const lastTmt = parseDateSafe(lastTmtStr) || new Date(2022, 3, 1);
        
        // Target TMT: 4 tahun kemudian
        const targetYear = lastTmt.getFullYear() + 4;
        const targetMonth = lastTmt.getMonth();
        const targetDay = lastTmt.getDate();
        const targetDate = new Date(targetYear, targetMonth, targetDay);

        // Cari periode BKN berikutnya (Feb=1, Apr=3, Jun=5, Ags=7, Okt=9, Des=11)
        const bknMonths = [1, 3, 5, 7, 9, 11];
        let periodeMonth = bknMonths.find(m => m >= targetMonth);
        let periodeYear = targetYear;
        if (periodeMonth === undefined) {
          periodeMonth = 1; // Feb tahun berikutnya
          periodeYear = targetYear + 1;
        }
        const bknPeriodName = new Date(periodeYear, periodeMonth, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

        const diffMs = targetDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const diffMonths = Math.ceil(diffDays / 30);

        let statusAlert: 'lewat' | 'h3' | 'aman' = 'aman';
        let statusLabel = '⚪ Aman / Terjadwal';
        if (diffDays < 0) {
          statusAlert = 'lewat';
          statusLabel = `⚠️ Lewat Tempo (${Math.abs(diffMonths)} bln)`;
        } else if (diffDays <= 90) {
          statusAlert = 'h3';
          statusLabel = '🔴 H-3 Bulan (Siap Usul)';
        }

        // Syarat Khusus Aturan KemenPAN-RB No. 1 Tahun 2023
        const isFungsional = asn.jenis_pegawai === 'Jafung_Kesehatan' || Boolean(asn.jenjang_jafung);
        const isStruktural = asn.jenis_pegawai === 'Struktural';
        let syaratKhusus = '🟢 Syarat Lengkap';
        let syaratBadgeType: 'ukom' | 'diklat' | 'lengkap' | 'skp' = 'lengkap';

        if (isFungsional) {
          const nextGol = getNextGolongan(asn.golongan_ruang);
          // Naik jenjang jabatan: misal III/b ke III/c atau III/d ke IV/a
          if (
            (asn.golongan_ruang === 'III/b' && nextGol === 'III/c') ||
            (asn.golongan_ruang === 'III/d' && nextGol === 'IV/a') ||
            (asn.golongan_ruang === 'II/d' && nextGol === 'III/a')
          ) {
            syaratKhusus = '🟠 Wajib UKOM';
            syaratBadgeType = 'ukom';
          } else {
            syaratKhusus = 'Konversi SKP / PAK';
            syaratBadgeType = 'skp';
          }
        } else if (isStruktural) {
          syaratKhusus = '🔵 Diklatpim / PKA';
          syaratBadgeType = 'diklat';
        }

        const nextGolongan = getNextGolongan(asn.golongan_ruang);

        return {
          id: asn.id,
          profile: asn,
          nama_lengkap: `${asn.nama_lengkap}${asn.gelar_belakang ? ', ' + asn.gelar_belakang : ''}`,
          nip: asn.nip,
          unit: getUnitName(asn.id_puskesmas),
          golongan_sekarang: asn.golongan_ruang,
          golongan_target: nextGolongan,
          pangkat_sekarang: GOLONGAN_TO_PANGKAT[asn.golongan_ruang] || 'Penata',
          pangkat_target: GOLONGAN_TO_PANGKAT[nextGolongan] || 'Penata Tk. I',
          tmt_terakhir_str: formatDate(lastTmtStr),
          target_tmt_str: formatDate(targetDate.toISOString().split('T')[0]),
          target_date: targetDate,
          bkn_period: bknPeriodName,
          diff_days: diffDays,
          diff_months: diffMonths,
          status_alert: statusAlert,
          status_label: statusLabel,
          syarat_khusus: syaratKhusus,
          syarat_badge_type: syaratBadgeType,
          jabatan_nama: asn.pns_nama_jabatan || (isFungsional ? `Fungsional (${asn.jenjang_jafung || 'Tenaga Kesehatan'})` : 'Staf Pelaksana'),
          nomor_wa: asn.nomor_wa
        };
      });
  }, [scopedProfiles, today, puskesmasList]);

  // =========================================================================
  // 2. DATA PEMANTAUAN: JABATAN FUNGSIONAL (JAFUNG)
  // Aturan PermenPAN-RB No. 1 Tahun 2023: Angka Kredit Konversi SKP & Uji Kompetensi Kemenkes
  // =========================================================================
  const jafungList = useMemo(() => {
    return scopedProfiles
      .filter(asn => asn.jenis_pegawai === 'Jafung_Kesehatan' || Boolean(asn.jenjang_jafung) || (asn.pns_jenis_jabatan && asn.pns_jenis_jabatan.toLowerCase().includes('fungsional')))
      .map(asn => {
        const lastTmtJabatanStr = asn.tmt_jabatan_terakhir || asn.tmt_pangkat_terakhir || '2022-01-01';
        const lastTmtJabatan = parseDateSafe(lastTmtJabatanStr) || new Date(2022, 0, 1);
        
        // Masa jabatan kenaikan jenjang: rata-rata 3 tahun
        const targetYear = lastTmtJabatan.getFullYear() + 3;
        const targetDate = new Date(targetYear, lastTmtJabatan.getMonth(), lastTmtJabatan.getDate());

        const diffMs = targetDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const diffMonths = Math.ceil(diffDays / 30);

        let statusAlert: 'lewat' | 'h3' | 'aman' = 'aman';
        let statusLabel = '⚪ Memenuhi Masa Jabatan';
        if (diffDays < 0) {
          statusAlert = 'lewat';
          statusLabel = `⚠️ Lewat Tempo Usulan (${Math.abs(diffMonths)} bln)`;
        } else if (diffDays <= 90) {
          statusAlert = 'h3';
          statusLabel = '🔴 H-3 Bulan Jadwal UKOM';
        }

        const jenjangSekarang = asn.jenjang_jafung || 'Ahli Pertama';
        const jenjangTarget = getNextJenjangJafung(jenjangSekarang);

        // Syarat sesuai PermenPAN-RB No. 1/2023
        let syaratKhusus = '🟠 Wajib UKOM Kemenkes';
        let syaratBadgeType: 'ukom' | 'diklat' | 'lengkap' | 'skp' = 'ukom';
        if (asn.ak_integrasi_2022 && asn.ak_integrasi_2022 >= 100) {
          syaratKhusus = '🟢 Angka Kredit Terpenuhi';
          syaratBadgeType = 'lengkap';
        } else {
          syaratKhusus = 'Konversi SKP Tahunan';
          syaratBadgeType = 'skp';
        }

        return {
          id: asn.id,
          profile: asn,
          nama_lengkap: `${asn.nama_lengkap}${asn.gelar_belakang ? ', ' + asn.gelar_belakang : ''}`,
          nip: asn.nip,
          unit: getUnitName(asn.id_puskesmas),
          jenjang_sekarang: jenjangSekarang,
          jenjang_target: jenjangTarget,
          golongan_sekarang: asn.golongan_ruang,
          tmt_jabatan_str: formatDate(lastTmtJabatanStr),
          target_tmt_str: formatDate(targetDate.toISOString().split('T')[0]),
          target_date: targetDate,
          ak_terakhir: asn.ak_integrasi_2022 || 0,
          diff_days: diffDays,
          diff_months: diffMonths,
          status_alert: statusAlert,
          status_label: statusLabel,
          syarat_khusus: syaratKhusus,
          syarat_badge_type: syaratBadgeType,
          jabatan_nama: asn.pns_nama_jabatan || `${jenjangSekarang} (Rumpun Kesehatan)`,
          nomor_wa: asn.nomor_wa
        };
      });
  }, [scopedProfiles, today, puskesmasList]);

  // =========================================================================
  // 3. DATA PEMANTAUAN: KENAIKAN GAJI BERKALA (KGB)
  // Aturan PP No. 7 Tahun 1977 & PermenPAN-RB No. 7 Tahun 2023 (PNS & PPPK setiap 2 Tahun)
  // =========================================================================
  const kgbList = useMemo(() => {
    return scopedProfiles
      .filter(asn => asn.status_pegawai_detail === 'PNS' || asn.status_pegawai_detail === 'PPPK_Penuh_Waktu' || asn.status_pegawai_detail === 'PPPK_Paruh_Waktu')
      .map(asn => {
        const lastTmtBerkalaStr = asn.tmt_berkala_terakhir || asn.tmt_pangkat_terakhir || '2023-01-01';
        const lastTmtBerkala = parseDateSafe(lastTmtBerkalaStr) || new Date(2023, 0, 1);
        
        // Siklus KGB: Tepat 2 tahun
        const targetYear = lastTmtBerkala.getFullYear() + 2;
        const targetDate = new Date(targetYear, lastTmtBerkala.getMonth(), lastTmtBerkala.getDate());

        const diffMs = targetDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const diffMonths = Math.ceil(diffDays / 30);

        let statusAlert: 'lewat' | 'h3' | 'aman' = 'aman';
        let statusLabel = '⚪ Terjadwal / Aman';
        if (diffDays < 0) {
          statusAlert = 'lewat';
          statusLabel = `⚠️ Lewat Tempo KGB (${Math.abs(diffMonths)} bln)`;
        } else if (diffDays <= 60) {
          statusAlert = 'h3';
          statusLabel = '🔴 H-2 Bulan (Terbitkan SK)';
        }

        const isPns = asn.status_pegawai_detail === 'PNS';
        const statusPegawaiTag = isPns ? 'PNS' : 'PPPK';

        return {
          id: asn.id,
          profile: asn,
          nama_lengkap: `${asn.nama_lengkap}${asn.gelar_belakang ? ', ' + asn.gelar_belakang : ''}`,
          nip: asn.nip,
          status_pegawai_tag: statusPegawaiTag,
          unit: getUnitName(asn.id_puskesmas),
          golongan_sekarang: asn.golongan_ruang || asn.pppk_golongan || 'III/a',
          tmt_berkala_terakhir_str: formatDate(lastTmtBerkalaStr),
          target_tmt_str: formatDate(targetDate.toISOString().split('T')[0]),
          target_date: targetDate,
          diff_days: diffDays,
          diff_months: diffMonths,
          status_alert: statusAlert,
          status_label: statusLabel,
          syarat_khusus: 'SKP Minimal "Baik"',
          syarat_badge_type: 'lengkap' as const,
          jabatan_nama: asn.pns_nama_jabatan || asn.pppk_jabatan || 'Tenaga Kesehatan',
          nomor_wa: asn.nomor_wa
        };
      });
  }, [scopedProfiles, today, puskesmasList]);

  // =========================================================================
  // 4. DATA PEMANTAUAN: BUP & PENSIUN / AKHIR MASA KERJA
  // - PNS: UU ASN No. 20 Tahun 2023, PP No. 11/2017 & PP No. 17/2020 (58 / 60 / 65 Tahun)
  // - PPPK (Penuh / Paruh Waktu): Sesuai Akhir Masa Kontrak / Perjanjian Kerja (pppk_tmt_perjanjian_selesai)
  // - Non-ASN (PKWT): Sesuai Akhir Masa Kontrak SK (pkwt_tgl_sk_kontrak / 1 tahun)
  // =========================================================================
  const bupList = useMemo(() => {
    return scopedProfiles.map(asn => {
      const isPns = asn.status_pegawai_detail === 'PNS';
      const isPppk = asn.status_pegawai_detail === 'PPPK_Penuh_Waktu' || asn.status_pegawai_detail === 'PPPK_Paruh_Waktu';
      const isNonAsn = asn.status_pegawai_detail === 'Non_ASN';

      const birthDate = getBirthDateFromProfile(asn);
      const isMadya = (asn.jenjang_jafung && asn.jenjang_jafung.toLowerCase().includes('madya')) || false;
      const isUtama = (asn.jenjang_jafung && asn.jenjang_jafung.toLowerCase().includes('utama')) || false;
      const bupAge = isUtama ? 65 : isMadya ? 60 : 58;

      // Usia sekarang
      let currentAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        currentAge--;
      }

      let tmtPensiun: Date;
      let dasarHukum = '';
      let statusPegawaiTag = 'PNS';

      if (isPns) {
        statusPegawaiTag = 'PNS';
        // TMT Pensiun BKN: Hari pertama bulan berikutnya setelah mencapai BUP
        const bupYear = birthDate.getFullYear() + bupAge;
        const bupMonth = birthDate.getMonth();
        tmtPensiun = new Date(bupYear, bupMonth + 1, 1);
        dasarHukum = isUtama 
          ? 'BUP 65 Thn (Ahli Utama)' 
          : isMadya 
          ? 'BUP 60 Thn (Ahli Madya)' 
          : 'BUP 58 Thn (Pelaksana / Ahli Muda / Pertama)';
      } else if (isPppk) {
        statusPegawaiTag = asn.status_pegawai_detail === 'PPPK_Paruh_Waktu' ? 'PPPK-PW' : 'PPPK';
        // PPPK: Berakhir sesuai masa kontrak perjanjian kerja
        if (asn.pppk_tmt_perjanjian_selesai) {
          tmtPensiun = parseDateSafe(asn.pppk_tmt_perjanjian_selesai) || new Date(2027, 11, 31);
        } else if (asn.pppk_tmt_perjanjian_mulai) {
          const mulai = parseDateSafe(asn.pppk_tmt_perjanjian_mulai) || new Date(2024, 0, 1);
          tmtPensiun = new Date(mulai.getFullYear() + 5, mulai.getMonth(), mulai.getDate());
        } else {
          // Fallback default kontrak 5 tahun
          tmtPensiun = new Date(2028, 11, 31);
        }
        dasarHukum = `Masa Kontrak Perjanjian PPPK (s.d. ${formatDate(tmtPensiun.toISOString().split('T')[0])})`;
      } else {
        // Non ASN (PKWT)
        statusPegawaiTag = 'NON-ASN';
        if (asn.pkwt_tgl_sk_kontrak) {
          const tglSk = parseDateSafe(asn.pkwt_tgl_sk_kontrak) || new Date(2026, 0, 1);
          tmtPensiun = new Date(tglSk.getFullYear() + 1, 11, 31);
        } else {
          // Kontrak tahunan berjalan
          tmtPensiun = new Date(today.getFullYear(), 11, 31);
        }
        dasarHukum = `Akhir Kontrak Kerja Non-ASN Tahunan (s.d. ${formatDate(tmtPensiun.toISOString().split('T')[0])})`;
      }

      const diffMs = tmtPensiun.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      const sisaBulan = Math.ceil(diffDays / 30);
      const sisaTahun = Math.floor(diffDays / 365);

      let statusAlert: 'lewat' | 'h3' | 'aman' = 'aman';
      let statusLabel = '';

      if (isPns) {
        statusLabel = `⚪ Terpantau (${bupAge - currentAge} thn lagi)`;
        if (diffDays <= 0) {
          statusAlert = 'lewat';
          statusLabel = '⛔ Sudah Mencapai BUP';
        } else if (diffDays <= 180) {
          statusAlert = 'h3';
          statusLabel = '⚠️ Kritis H-6 Bulan (Penetapan Pertek BKN)';
        } else if (diffDays <= 365) {
          statusAlert = 'h3';
          statusLabel = '🔴 H-1 Tahun (Usulan BKN & Taspen)';
        }
      } else {
        // PPPK dan Non ASN
        statusLabel = `⚪ Kontrak Aktif (${Math.max(1, sisaBulan)} bln lagi)`;
        if (diffDays <= 0) {
          statusAlert = 'lewat';
          statusLabel = '⛔ Kontrak Berakhir / Perlu Evaluasi';
        } else if (diffDays <= 90) {
          statusAlert = 'h3';
          statusLabel = '⚠️ H-3 Bulan (Persiapan Perpanjangan Kontrak)';
        } else if (diffDays <= 180) {
          statusAlert = 'h3';
          statusLabel = '🔴 H-6 Bulan (Evaluasi Kinerja Kontrak)';
        }
      }

      return {
        id: asn.id,
        profile: asn,
        nama_lengkap: `${asn.nama_lengkap}${asn.gelar_belakang ? ', ' + asn.gelar_belakang : ''}`,
        nip: asn.nip,
        status_pegawai_tag: statusPegawaiTag,
        unit: getUnitName(asn.id_puskesmas),
        tanggal_lahir_str: formatDate(birthDate.toISOString().split('T')[0]),
        usia_sekarang: currentAge,
        bup_age: isPns ? bupAge : null,
        dasar_hukum: dasarHukum,
        tmt_pensiun_str: formatDate(tmtPensiun.toISOString().split('T')[0]),
        tmt_pensiun_date: tmtPensiun,
        diff_days: diffDays,
        sisa_bulan: sisaBulan,
        sisa_tahun: sisaTahun,
        status_alert: statusAlert,
        status_label: statusLabel,
        jabatan_nama: asn.pns_nama_jabatan || asn.pppk_jabatan || asn.pkwt_jabatan || (asn.jenjang_jafung ? `${asn.jenjang_jafung}` : 'Tenaga Kesehatan'),
        golongan_sekarang: asn.golongan_ruang || asn.pppk_golongan || 'Kontrak',
        nomor_wa: asn.nomor_wa
      };
    }).sort((a, b) => a.diff_days - b.diff_days); // Prioritize closest to retirement/contract expiry
  }, [scopedProfiles, today, puskesmasList]);

  // Determine current active list based on sub-tab
  const currentItems = useMemo(() => {
    switch (activeSubTab) {
      case 'pangkat':
        return pnsPangkatList;
      case 'jafung':
        return jafungList;
      case 'kgb':
        return kgbList;
      case 'pensiun':
        return bupList;
      default:
        return pnsPangkatList;
    }
  }, [activeSubTab, pnsPangkatList, jafungList, kgbList, bupList]);

  // Filtered Items by Search & Status
  const filteredItems = useMemo(() => {
    return (currentItems as any[]).filter(item => {
      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.nama_lengkap.toLowerCase().includes(q);
        const matchesNip = item.nip.toLowerCase().includes(q);
        const matchesUnit = item.unit.toLowerCase().includes(q);
        const matchesJabatan = (item.jabatan_nama || '').toLowerCase().includes(q);
        if (!matchesName && !matchesNip && !matchesUnit && !matchesJabatan) {
          return false;
        }
      }

      // Status Filter
      if (statusFilter === 'all') return true;
      if (statusFilter === 'h3') return item.status_alert === 'h3';
      if (statusFilter === 'lewat') return item.status_alert === 'lewat';
      if (statusFilter === 'aman') return item.status_alert === 'aman';
      if (statusFilter === 'ukom') return item.syarat_badge_type === 'ukom';
      if (statusFilter === 'diklat') return item.syarat_badge_type === 'diklat';
      if (statusFilter === 'lengkap') return item.syarat_badge_type === 'lengkap';
      return true;
    });
  }, [currentItems, searchQuery, statusFilter]);

  // Counts for alert badges
  const counts = useMemo(() => {
    const list = currentItems as any[];
    return {
      total: list.length,
      h3: list.filter(i => i.status_alert === 'h3').length,
      lewat: list.filter(i => i.status_alert === 'lewat').length,
      aman: list.filter(i => i.status_alert === 'aman').length,
      ukom: list.filter(i => i.syarat_badge_type === 'ukom').length,
      diklat: list.filter(i => i.syarat_badge_type === 'diklat').length,
      lengkap: list.filter(i => i.syarat_badge_type === 'lengkap').length,
    };
  }, [currentItems]);

  // Handler: Save Update
  const handleSaveUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    if (onUpdateAsnProfiles) {
      const updated = asnProfiles.map(p => {
        if (p.id === editingItem.id) {
          return {
            ...p,
            golongan_ruang: editingItem.golongan_ruang || p.golongan_ruang,
            pangkat_nama: editingItem.pangkat_nama || p.pangkat_nama,
            tmt_pangkat_terakhir: editingItem.tmt_pangkat_terakhir || p.tmt_pangkat_terakhir,
            tmt_berkala_terakhir: editingItem.tmt_berkala_terakhir || p.tmt_berkala_terakhir,
            tmt_jabatan_terakhir: editingItem.tmt_jabatan_terakhir || p.tmt_jabatan_terakhir,
            jenjang_jafung: editingItem.jenjang_jafung || p.jenjang_jafung,
            pns_nama_jabatan: editingItem.pns_nama_jabatan || p.pns_nama_jabatan,
            tanggal_lahir: editingItem.tanggal_lahir || p.tanggal_lahir,
            pppk_tmt_perjanjian_selesai: editingItem.pppk_tmt_perjanjian_selesai || p.pppk_tmt_perjanjian_selesai,
            pkwt_tgl_sk_kontrak: editingItem.pkwt_tgl_sk_kontrak || p.pkwt_tgl_sk_kontrak,
            nomor_wa: editingItem.nomor_wa || p.nomor_wa
          };
        }
        return p;
      });
      onUpdateAsnProfiles(updated);
    }

    showToast(`Data ${editingItem.nama_lengkap} berhasil diperbarui.`);
    setEditingItem(null);
  };

  // Handler: Kirim Notifikasi WhatsApp
  const handleSendWaAlert = async (item: any) => {
    if (!item.nomor_wa) {
      alert(`Nomor WhatsApp untuk ${item.nama_lengkap} belum terdaftar. Silakan lengkapi nomor WA pada menu Update.`);
      return;
    }

    let messageText = '';
    if (activeSubTab === 'pangkat') {
      messageText = `Halo Bapak/Ibu ${item.nama_lengkap},\n\nPemberitahuan resmi dari SAPA Pegawai UPT Puskesmas Sedau Kab. Lombok Barat:\nPeriode Kenaikan Pangkat Anda diproyeksikan pada *${item.bkn_period}* (Target Golongan: *${item.golongan_target}*).\nStatus berkas: *${item.syarat_khusus}*.\n\nMohon segera melengkapi berkas portofolio kepegawaian melalui SIMPEG. Terima kasih.`;
    } else if (activeSubTab === 'jafung') {
      messageText = `Halo Bapak/Ibu ${item.nama_lengkap},\n\nPemberitahuan Kenaikan Jenjang Jabatan Fungsional (${item.jenjang_sekarang} ➔ ${item.jenjang_target}):\nStatus Uji Kompetensi: *${item.syarat_khusus}*.\nSilakan konfirmasi jadwal Uji Kompetensi Kemenkes RI melalui admin kepegawaian.`;
    } else if (activeSubTab === 'kgb') {
      messageText = `Halo Bapak/Ibu ${item.nama_lengkap},\n\nPemberitahuan Kenaikan Gaji Berkala (KGB):\nSiklus 2 tahunan Anda jatuh tempo pada *${item.target_tmt_str}*.\nSK Kenaikan Gaji Berkala sedang diproses oleh admin kepegawaian.`;
    } else {
      messageText = `Halo Bapak/Ibu ${item.nama_lengkap},\n\nPemberitahuan Masa Pensiun BUP:\nTMT Pensiun Anda ditetapkan pada *${item.tmt_pensiun_str}* (BUP ${item.bup_age} Tahun).\nPersiapan berkas Taspen dan Pertek BKN dapat dikonsultasikan dengan Bagian Kepegawaian.`;
    }

    const res = await sendWhatsAppMessage(item.nomor_wa, messageText);
    if (res.success) {
      showToast(`Notifikasi WhatsApp terkirim ke ${item.nama_lengkap}`);
    } else {
      alert(`Gagal mengirim WhatsApp otomatis: ${res.error || 'Koneksi WhatsApp belum terhubung'}. Anda tetap dapat menghubungi langsung di ${item.nomor_wa}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-teal-800 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 border border-teal-600 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle size={16} className="text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* =========================================================================
          TOP HEADER CARD: Clean White, Teal Accents, Authentic Lombok Barat Styling
         ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 transition-all">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-teal-50 border border-teal-200 text-teal-800 rounded-xl shrink-0 shadow-xs">
              <Award size={28} className="text-teal-700" />
            </div>
            
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-teal-50 text-teal-800 border border-teal-200 text-[11px] font-bold px-2.5 py-0.5 rounded-md tracking-wider uppercase">
                  PEMANTAUAN ASN › {activeSubTab === 'pangkat' ? 'KENAIKAN PANGKAT (PNS)' : activeSubTab === 'jafung' ? 'JABATAN FUNGSIONAL' : activeSubTab === 'kgb' ? 'KENAIKAN GAJI BERKALA' : 'BATAS USIA PENSIUN (BUP)'}
                </span>
                
                <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium px-2.5 py-0.5 rounded-md">
                  {activeSubTab === 'pangkat' ? '6 Periode BKN Per Tahun' : activeSubTab === 'jafung' ? 'PermenPAN-RB No. 1/2023' : activeSubTab === 'kgb' ? 'Siklus 2 Tahun (PP 7/1977)' : 'UU ASN No. 20/2023'}
                </span>

                <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-semibold px-2.5 py-0.5 rounded-md">
                  {currentRole === 'admin_dinkes' ? 'ADMIN UTAMA (FULL CONTROL)' : 'ADMIN PUSKESMAS'}
                </span>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold font-display text-slate-900 tracking-tight">
                {activeSubTab === 'pangkat' && 'Siklus Kenaikan Pangkat 4 Tahun (Khusus PNS)'}
                {activeSubTab === 'jafung' && 'Pemantauan Kenaikan Jenjang Jabatan Fungsional (Jafung)'}
                {activeSubTab === 'kgb' && 'Pemantauan Kenaikan Gaji Berkala (PNS & PPPK)'}
                {activeSubTab === 'pensiun' && 'Pemantauan Batas Usia Pensiun (BUP) Pegawai ASN'}
              </h1>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <span className="inline-flex items-center justify-center px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
              Total: {counts.total} Pegawai Terpantau
            </span>

            <div className="relative">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input 
                type="text"
                placeholder="Cari NIP / Nama / Unit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* =========================================================================
          MAIN CARD & FILTER BAR: Filter Chips matching App's Pastel Alerts
         ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
        
        {/* Title and Filter Pills row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-teal-600"></span>
              <h2 className="text-base font-bold text-slate-900">
                {activeSubTab === 'pangkat' && `Pemantauan Kenaikan Pangkat PNS (${counts.total})`}
                {activeSubTab === 'jafung' && `Pemantauan Kenaikan Jenjang Jafung (${counts.total})`}
                {activeSubTab === 'kgb' && `Pemantauan KGB Berkala PNS & PPPK (${counts.total})`}
                {activeSubTab === 'pensiun' && `Pemantauan Batas Usia Pensiun (${counts.total})`}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeSubTab === 'pangkat' && 'Siklus 4 Tahun Menjelang 6 Periode Usulan BKN (Feb, Apr, Jun, Ags, Okt, Des)'}
              {activeSubTab === 'jafung' && 'Persyaratan Konversi Predikat SKP dan Rekomendasi Uji Kompetensi Kemenkes'}
              {activeSubTab === 'kgb' && 'Pemberian Kenaikan Gaji Berkala otomatis setiap 2 tahun dengan predikat minimal Baik'}
              {activeSubTab === 'pensiun' && 'BUP 58 Tahun (Pelaksana/Ahli Muda), 60 Tahun (Ahli Madya/JPT), 65 Tahun (Ahli Utama)'}
            </p>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            
            <button
              type="button"
              onClick={() => setStatusFilter('h3')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition border cursor-pointer flex items-center space-x-1.5 ${
                statusFilter === 'h3'
                  ? 'bg-rose-100 text-rose-800 border-rose-300 ring-2 ring-rose-300'
                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
              <span>Mendekati Waktu</span>
              <span className="font-bold">({counts.h3})</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('lewat')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition border cursor-pointer flex items-center space-x-1.5 ${
                statusFilter === 'lewat'
                  ? 'bg-amber-100 text-amber-800 border-amber-300 ring-2 ring-amber-300'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
              <span>Lewat Tempo</span>
              <span className="font-bold">({counts.lewat})</span>
            </button>

            {activeSubTab === 'pangkat' && (
              <>
                <button
                  type="button"
                  onClick={() => setStatusFilter('ukom')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition border cursor-pointer flex items-center space-x-1.5 ${
                    statusFilter === 'ukom'
                      ? 'bg-teal-100 text-teal-800 border-teal-300 ring-2 ring-teal-300'
                      : 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500"></span>
                  <span>Wajib UKOM</span>
                  <span className="font-bold">({counts.ukom})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatusFilter('diklat')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition border cursor-pointer flex items-center space-x-1.5 ${
                    statusFilter === 'diklat'
                      ? 'bg-blue-100 text-blue-800 border-blue-300 ring-2 ring-blue-300'
                      : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                  <span>Diklatpim / PKA</span>
                  <span className="font-bold">({counts.diklat})</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => setStatusFilter('aman')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition border cursor-pointer flex items-center space-x-1.5 ${
                statusFilter === 'aman'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 ring-2 ring-emerald-300'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              <span>Aman</span>
              <span className="font-bold">({counts.aman})</span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition border cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-800 text-white border-slate-900 shadow-xs'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
            >
              Semua ({counts.total})
            </button>

          </div>
        </div>

        {/* =========================================================================
            DATA TABLE: Clean Typography, Responsive Rows, Action Modals
           ========================================================================= */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-4">Pegawai</th>
                <th className="py-3 px-4">
                  {activeSubTab === 'pangkat' && 'Golongan & Target Siklus'}
                  {activeSubTab === 'jafung' && 'Jenjang Sekarang ➔ Target'}
                  {activeSubTab === 'kgb' && 'Golongan & TMT Berkala'}
                  {activeSubTab === 'pensiun' && 'BUP & TMT Pensiun BKN'}
                </th>
                <th className="py-3 px-4">
                  {activeSubTab === 'pensiun' ? 'Dasar Hukum & Usia' : 'Syarat Khusus'}
                </th>
                <th className="py-3 px-4">Status Alert</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Info size={32} className="mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">Tidak ada pegawai yang sesuai dengan filter.</p>
                    <p className="text-xs text-slate-400 mt-1">Coba ubah kata kunci pencarian atau status filter.</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item: any) => (
                  <tr key={`${activeSubTab}-${item.id}`} className="hover:bg-teal-50/20 transition-colors">
                    
                    {/* Kolom 1: Profil Pegawai */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-900 text-sm">
                          {item.nama_lengkap}
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {item.nip} • <span className="font-sans font-semibold text-slate-700">{item.unit}</span>
                        </p>
                        {item.status_pegawai_tag && (
                          <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {item.status_pegawai_tag}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Kolom 2: Golongan / Target */}
                    <td className="py-3.5 px-4">
                      {activeSubTab === 'pangkat' && (
                        <div className="space-y-1">
                          <p className="font-bold text-teal-800 text-sm">
                            {item.golongan_sekarang} ➔ {item.golongan_target}
                          </p>
                          <p className="text-xs text-slate-600">
                            {item.tmt_terakhir_str} ➔ <span className="font-bold text-slate-900">{item.target_tmt_str}</span>
                          </p>
                          <p className="text-[11px] text-slate-500 italic">
                            {item.jabatan_nama}
                          </p>
                          <span className="inline-block text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-medium">
                            Periode: {item.bkn_period}
                          </span>
                        </div>
                      )}

                      {activeSubTab === 'jafung' && (
                        <div className="space-y-1">
                          <p className="font-bold text-teal-800 text-sm">
                            {item.jenjang_sekarang} ➔ {item.jenjang_target}
                          </p>
                          <p className="text-xs text-slate-600">
                            TMT Jabatan: {item.tmt_jabatan_str}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Target Promosi: <span className="font-bold text-slate-800">{item.target_tmt_str}</span>
                          </p>
                          <p className="text-[11px] text-slate-400 font-mono">
                            AK Terintegrasi: {item.ak_terakhir}
                          </p>
                        </div>
                      )}

                      {activeSubTab === 'kgb' && (
                        <div className="space-y-1">
                          <p className="font-bold text-teal-800 text-sm">
                            Golongan {item.golongan_sekarang}
                          </p>
                          <p className="text-xs text-slate-600">
                            KGB Terakhir: {item.tmt_berkala_terakhir_str}
                          </p>
                          <p className="text-xs font-bold text-slate-900">
                            Target KGB: {item.target_tmt_str}
                          </p>
                          <p className="text-[11px] text-slate-500 italic">
                            {item.jabatan_nama}
                          </p>
                        </div>
                      )}

                      {activeSubTab === 'pensiun' && (
                        <div className="space-y-1">
                          <p className="font-bold text-teal-800 text-sm">
                            {item.bup_age ? `BUP ${item.bup_age} Tahun` : 'Akhir Kontrak Kerja'}
                          </p>
                          <p className="text-xs text-slate-700">
                            {item.bup_age ? 'TMT Pensiun:' : 'Batas Kontrak:'} <span className="font-bold text-slate-900">{item.tmt_pensiun_str}</span>
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Lahir: {item.tanggal_lahir_str} ({item.usia_sekarang} Thn)
                          </p>
                        </div>
                      )}
                    </td>

                    {/* Kolom 3: Syarat Khusus / Dasar Hukum */}
                    <td className="py-3.5 px-4">
                      {activeSubTab === 'pensiun' ? (
                        <div className="space-y-1">
                          <span className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200">
                            {item.dasar_hukum}
                          </span>
                          <p className="text-[11px] text-slate-500">
                            Sisa Masa Kerja: <strong className="text-slate-800">{item.diff_days > 0 ? `${item.sisa_tahun} thn (${item.sisa_bulan} bln)` : 'Sudah Lewat BUP'}</strong>
                          </p>
                        </div>
                      ) : (
                        <div>
                          <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-md border ${
                            item.syarat_badge_type === 'ukom'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : item.syarat_badge_type === 'diklat'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : item.syarat_badge_type === 'skp'
                              ? 'bg-teal-50 text-teal-800 border-teal-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}>
                            {item.syarat_khusus}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* Kolom 4: Status Alert */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${
                          item.status_alert === 'h3'
                            ? 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                            : item.status_alert === 'lewat'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            item.status_alert === 'h3' ? 'bg-rose-500' : item.status_alert === 'lewat' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} />
                          <span>{item.status_label}</span>
                        </span>
                        
                        {item.diff_days !== undefined && (
                          <p className="text-[10px] text-slate-500">
                            {item.diff_days < 0 
                              ? `Terlambat ${Math.abs(item.diff_days)} hari`
                              : `${item.diff_days} hari lagi`
                            }
                          </p>
                        )}
                      </div>
                    </td>

                    {/* Kolom 5: Aksi */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        
                        {/* Tombol Update Data Pegawai */}
                        <button
                          type="button"
                          onClick={() => setEditingItem({
                            ...item.profile,
                            nama_lengkap: item.nama_lengkap
                          })}
                          title="Perbarui Data & Tanggal TMT"
                          className="px-2.5 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition font-medium text-xs flex items-center space-x-1 shadow-xs cursor-pointer"
                        >
                          <Edit3 size={13} />
                          <span>Update</span>
                        </button>

                        {/* Tombol SK Preview */}
                        <button
                          type="button"
                          onClick={() => setSkPreviewItem(item)}
                          title="Pratinjau SK & Berkas"
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition font-medium text-xs flex items-center space-x-1 shadow-xs cursor-pointer"
                        >
                          <FileText size={13} />
                          <span>SK</span>
                        </button>

                        {/* Tombol WhatsApp Notifikasi */}
                        <button
                          type="button"
                          onClick={() => handleSendWaAlert(item)}
                          title="Kirim Peringatan Dini via WhatsApp"
                          className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition shadow-xs cursor-pointer"
                        >
                          <Send size={13} />
                        </button>

                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* =========================================================================
          MODAL: UPDATE DATA & TMT PEGAWAI (Disesuaikan Nomenklatur Halaman)
         ========================================================================= */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            
            <div className="bg-teal-800 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">
                  {activeSubTab === 'pangkat' && 'Pembaruan Kenaikan Pangkat (PNS)'}
                  {activeSubTab === 'jafung' && 'Pembaruan Jabatan Fungsional (Jafung)'}
                  {activeSubTab === 'kgb' && 'Pembaruan Kenaikan Gaji Berkala (KGB)'}
                  {activeSubTab === 'pensiun' && 'Pembaruan BUP & Pensiun / Kontrak Kerja'}
                </h3>
                <p className="text-xs text-teal-200">{editingItem.nama_lengkap} • {editingItem.nip}</p>
              </div>
              <button 
                onClick={() => setEditingItem(null)}
                className="p-1 text-teal-200 hover:text-white rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUpdate} className="p-5 space-y-4">
              
              {/* Sesuai Nomenklatur Kenaikan Pangkat (PNS) */}
              {activeSubTab === 'pangkat' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Golongan / Ruang Saat Ini
                      </label>
                      <select
                        value={editingItem.golongan_ruang || 'III/a'}
                        onChange={(e) => setEditingItem({ ...editingItem, golongan_ruang: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                      >
                        {LIST_GOLONGAN.map(g => (
                          <option key={g} value={g}>{g} - {GOLONGAN_TO_PANGKAT[g]}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        TMT Pangkat Terakhir
                      </label>
                      <input
                        type="date"
                        value={editingItem.tmt_pangkat_terakhir ? editingItem.tmt_pangkat_terakhir.split('T')[0] : ''}
                        onChange={(e) => setEditingItem({ ...editingItem, tmt_pangkat_terakhir: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                      >
                      </input>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Pangkat Terakhir
                    </label>
                    <input
                      type="text"
                      value={editingItem.pangkat_nama || GOLONGAN_TO_PANGKAT[editingItem.golongan_ruang] || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, pangkat_nama: e.target.value })}
                      placeholder="Contoh: Penata Muda / Penata"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                </>
              )}

              {/* Sesuai Nomenklatur Jabatan Fungsional (Jafung) */}
              {activeSubTab === 'jafung' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Jenjang Jabatan Fungsional
                      </label>
                      <select
                        value={editingItem.jenjang_jafung || 'Ahli Pertama'}
                        onChange={(e) => setEditingItem({ ...editingItem, jenjang_jafung: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                      >
                        {JENJANG_JAFUNG_ORDER.map(j => (
                          <option key={j} value={j}>{j}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        TMT Jabatan Terakhir
                      </label>
                      <input
                        type="date"
                        value={editingItem.tmt_jabatan_terakhir ? editingItem.tmt_jabatan_terakhir.split('T')[0] : ''}
                        onChange={(e) => setEditingItem({ ...editingItem, tmt_jabatan_terakhir: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Lengkap Jabatan Fungsional
                    </label>
                    <input
                      type="text"
                      value={editingItem.pns_nama_jabatan || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, pns_nama_jabatan: e.target.value })}
                      placeholder="Contoh: Perawat Ahli Madya / Bidan Ahli Pertama"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>
                </>
              )}

              {/* Sesuai Nomenklatur Kenaikan Gaji Berkala (KGB) */}
              {activeSubTab === 'kgb' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Golongan / Ruang Penggajian
                      </label>
                      <select
                        value={editingItem.golongan_ruang || editingItem.pppk_golongan || 'III/a'}
                        onChange={(e) => setEditingItem({ ...editingItem, golongan_ruang: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                      >
                        {LIST_GOLONGAN.map(g => (
                          <option key={g} value={g}>{g} - {GOLONGAN_TO_PANGKAT[g]}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        TMT Berkala Terakhir
                      </label>
                      <input
                        type="date"
                        value={editingItem.tmt_berkala_terakhir ? editingItem.tmt_berkala_terakhir.split('T')[0] : ''}
                        onChange={(e) => setEditingItem({ ...editingItem, tmt_berkala_terakhir: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Sesuai Nomenklatur BUP & Pensiun / Kontrak */}
              {activeSubTab === 'pensiun' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tanggal Lahir Pegawai
                      </label>
                      <input
                        type="date"
                        value={editingItem.tanggal_lahir ? editingItem.tanggal_lahir.split('T')[0] : ''}
                        onChange={(e) => setEditingItem({ ...editingItem, tanggal_lahir: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Akhir Masa Kontrak / Perjanjian Kerja
                      </label>
                      <input
                        type="date"
                        value={editingItem.pppk_tmt_perjanjian_selesai ? editingItem.pppk_tmt_perjanjian_selesai.split('T')[0] : (editingItem.pkwt_tgl_sk_kontrak ? editingItem.pkwt_tgl_sk_kontrak.split('T')[0] : '')}
                        onChange={(e) => setEditingItem({ 
                          ...editingItem, 
                          pppk_tmt_perjanjian_selesai: e.target.value,
                          pkwt_tgl_sk_kontrak: e.target.value
                        })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor WhatsApp Pegawai (Untuk Notifikasi Peringatan Dini)
                </label>
                <input
                  type="text"
                  value={editingItem.nomor_wa || ''}
                  onChange={(e) => setEditingItem({ ...editingItem, nomor_wa: e.target.value })}
                  placeholder="08xxxxxxxxxx"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-teal-700 hover:bg-teal-800 text-white shadow-xs cursor-pointer flex items-center space-x-1"
                >
                  <Check size={14} />
                  <span>Simpan Pembaruan</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: PRATINJAU SK & DOKUMEN RESMI
         ========================================================================= */}
      {skPreviewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <FileText size={18} className="text-teal-400" />
                <h3 className="font-bold text-sm">Pratinjau Dokumen SK Kepegawaian</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white text-xs rounded font-medium flex items-center space-x-1 cursor-pointer"
                >
                  <Printer size={13} />
                  <span>Cetak</span>
                </button>
                <button 
                  onClick={() => setSkPreviewItem(null)}
                  className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 font-serif text-slate-900 bg-white leading-relaxed">
              
              {/* Kop Surat Resmi */}
              <div className="text-center pb-4 border-b-2 border-slate-900 space-y-1">
                <h4 className="text-xs uppercase font-sans tracking-widest text-slate-500 font-bold">PEMERINTAH KABUPATEN LOMBOK BARAT</h4>
                <h3 className="text-base font-bold uppercase tracking-wide">DINAS KESEHATAN</h3>
                <h2 className="text-lg font-black uppercase text-teal-900">UPT PUSKESMAS SEDAU</h2>
                <p className="text-[10px] font-sans text-slate-600">
                  Jl. Raya Sedau - Narmada, Kab. Lombok Barat, Nusa Tenggara Barat • Email: pkm.sedau@lombokbaratkab.go.id
                </p>
              </div>

              {/* Judul Surat */}
              <div className="text-center py-2 space-y-0.5">
                <h3 className="text-sm font-bold uppercase underline">
                  {activeSubTab === 'pangkat' && 'SURAT KEPUTUSAN KENAIKAN PANGKAT PNS'}
                  {activeSubTab === 'jafung' && 'SURAT REKOMENDASI KENAIKAN JENJANG JAFUNG'}
                  {activeSubTab === 'kgb' && 'SURAT PEMBERITAHUAN KENAIKAN GAJI BERKALA'}
                  {activeSubTab === 'pensiun' && 'SURAT KETERANGAN PERSIAPAN PENETAPAN BUP / PENSIUN'}
                </h3>
                <p className="text-xs font-mono text-slate-600">
                  Nomor: 800 / {skPreviewItem.id}14 / PKM-SDU / {today.getFullYear()}
                </p>
              </div>

              {/* Isi Ringkasan */}
              <div className="text-xs space-y-3 font-sans">
                <p>
                  Berdasarkan hasil verifikasi Direktori Kepegawaian dan Peraturan KemenPAN-RB / BKN yang berlaku, Kepala UPT Puskesmas Sedau dengan ini menerangkan bahwa:
                </p>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500 font-medium">Nama Lengkap</span>
                    <span className="col-span-2 font-bold text-slate-900">{skPreviewItem.nama_lengkap}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500 font-medium">NIP</span>
                    <span className="col-span-2 font-mono text-slate-900">{skPreviewItem.nip}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500 font-medium">Jabatan / Golongan</span>
                    <span className="col-span-2 font-semibold text-slate-900">{skPreviewItem.jabatan_nama} ({skPreviewItem.golongan_sekarang})</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500 font-medium">Unit Kerja</span>
                    <span className="col-span-2 text-slate-800">{skPreviewItem.unit}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500 font-medium">Target / TMT</span>
                    <span className="col-span-2 font-bold text-teal-800">{skPreviewItem.target_tmt_str || skPreviewItem.tmt_pensiun_str}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-slate-500 font-medium">Status Kelayakan</span>
                    <span className="col-span-2 text-emerald-700 font-bold">{skPreviewItem.syarat_khusus || skPreviewItem.dasar_hukum}</span>
                  </div>
                </div>

                <p className="italic text-[11px] text-slate-500">
                  *Dokumen ini diterbitkan secara elektronik melalui Sistem Informasi Manajemen Kepegawaian (SIMPEG) SAPA Pegawai UPT Puskesmas Sedau dan dapat digunakan sebagai berkas usulan resmi ke Badan Kepegawaian dan Pengembangan SDM (BKPSDM) Kab. Lombok Barat / BKN Kantor Regional X.
                </p>

                <div className="pt-6 flex justify-end">
                  <div className="text-center space-y-1">
                    <p className="text-xs text-slate-600">Sedau, {formatDate(today.toISOString().split('T')[0])}</p>
                    <p className="text-xs font-bold text-slate-900">Kepala UPT Puskesmas Sedau</p>
                    <div className="h-14"></div>
                    <p className="text-xs font-bold underline text-slate-900">Ns. H. Ahmad Fauzi, S.Kep</p>
                    <p className="text-[10px] text-slate-500 font-mono">NIP. 197805122006041011</p>
                  </div>
                </div>

              </div>

            </div>

            <div className="bg-slate-50 p-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSkPreviewItem(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-medium cursor-pointer"
              >
                Tutup Pratinjau
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
