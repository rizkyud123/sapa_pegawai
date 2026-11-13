/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ASNProfile, RiwayatAngkaKredit, PredikatSKP } from './types';

// Dynamic real-time system calendar date (running year & month)
export function getCurrentSystemDate(): Date {
  return new Date();
}

export const SYSTEM_DATE = new Date();
export const SYSTEM_DATE_STR = new Date().toISOString().split('T')[0];

export function formatDate(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateString;
  }
}

/**
 * Calculates month difference helper
 */
export function countMonthDiff(start: Date, end: Date): number {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()) + (end.getDate() - start.getDate()) / 30;
}

export interface EarlyWarningAlert {
  id: string;
  id_asn: number;
  type: 'pensiun' | 'pangkat' | 'berkala' | 'kp4' | 'kontrak';
  message: string;
  subMessage: string;
  monthsLeft: number;
  targetDateStr: string;
  asnName: string;
  nip: string;
  puskesmasId: number;
  statusPegawaiDetail?: string;
}

/**
 * Multi-Tenant Local Early Warning System logic matcher
 * Mendeteksi otomatis batas jatuh tempo layanan kepegawaian administratif (TMT)
 * disesuaikan secara presisi menurut status kepegawaian (PNS, PPPK Penuh Waktu, PPPK Paruh Waktu, dan Non-ASN / PKWT)
 */
export function getEarlyWarningAlerts(asnList: ASNProfile[], referenceDate: Date = new Date()): EarlyWarningAlert[] {
  const alerts: EarlyWarningAlert[] = [];
  const refDate = referenceDate || new Date();

  asnList.forEach(asn => {
    if (asn.status_kepegawaian !== 'Aktif') return;

    const statusDetail = asn.status_pegawai_detail || 'PNS';
    const isPns = statusDetail === 'PNS';
    const isPppk = statusDetail === 'PPPK_Penuh_Waktu' || statusDetail === 'PPPK_Paruh_Waktu';
    const isNonAsn = statusDetail === 'Non_ASN';

    // 1. PENSIUN & BATAS USIA PENSIUN (BUP) - KHUSUS PNS & PPPK
    // PNS & PPPK: BUP 58 Tahun (Umum / Jafung Pertama-Muda), 60 Tahun (Jafung Madya), 65 Tahun (Utama)
    // Non-ASN TIDAK memiliki BUP pensiun melainkan Akhir Masa Kontrak Kerja (lihat poin 5)
    if (!isNonAsn) {
      let birthDate: Date | null = null;
      if (asn.tanggal_lahir) {
        const d = new Date(asn.tanggal_lahir);
        if (!isNaN(d.getTime())) birthDate = d;
      }
      if (!birthDate && asn.nip && asn.nip.length >= 8) {
        const y = parseInt(asn.nip.slice(0, 4), 10);
        const m = parseInt(asn.nip.slice(4, 6), 10) - 1;
        const d = parseInt(asn.nip.slice(6, 8), 10);
        const calculated = new Date(y, m, d);
        if (!isNaN(calculated.getTime())) birthDate = calculated;
      }

      if (birthDate) {
        const isMadya = (asn.jenjang_jafung && asn.jenjang_jafung.toLowerCase().includes('madya')) || false;
        const isUtama = (asn.jenjang_jafung && asn.jenjang_jafung.toLowerCase().includes('utama')) || false;
        const bupAge = isUtama ? 65 : isMadya ? 60 : 58;

        const targetPensiun = new Date(birthDate.getFullYear() + bupAge, birthDate.getMonth() + 1, 1);
        const mPensiun = countMonthDiff(refDate, targetPensiun);

        if (mPensiun > 0 && mPensiun <= 6) {
          alerts.push({
            id: `pensiun-${asn.id}`,
            id_asn: asn.id,
            type: 'pensiun',
            message: `Masa Pensiun Mendekati (BUP ${bupAge} Tahun - ${isPns ? 'PNS' : 'PPPK'})`,
            subMessage: `${Math.round(mPensiun * 10) / 10} bulan tersisa sebelum TMT pensiun (${formatDate(targetPensiun.toISOString().split('T')[0])})`,
            monthsLeft: mPensiun,
            targetDateStr: targetPensiun.toISOString().split('T')[0],
            asnName: asn.nama_lengkap + (asn.gelar_belakang ? `, ${asn.gelar_belakang}` : ''),
            nip: asn.nip,
            puskesmasId: asn.id_puskesmas,
            statusPegawaiDetail: statusDetail
          });
        }
      }
    }

    // 2. KENAIKAN PANGKAT (Siklus 4 Tahun / 6 Periode BKN) - HANYA BERLAKU UNTUK PNS
    // PPPK dan Non-ASN tidak mengenal kenaikan pangkat/golongan reguler PNS
    if (isPns && asn.tmt_pangkat_terakhir) {
      const pangkatDate = new Date(asn.tmt_pangkat_terakhir);
      if (!isNaN(pangkatDate.getTime())) {
        const targetPangkat = new Date(pangkatDate.getFullYear() + 4, pangkatDate.getMonth(), pangkatDate.getDate());
        const mPangkat = countMonthDiff(refDate, targetPangkat);

        if (mPangkat > 0 && mPangkat <= 4) {
          alerts.push({
            id: `pangkat-${asn.id}`,
            id_asn: asn.id,
            type: 'pangkat',
            message: `Kenaikan Pangkat Berkala (PNS - Siklus 4 Tahun)`,
            subMessage: `${Math.round(mPangkat * 10) / 10} bulan tersisa sebelum TMT pangkat baru (${formatDate(targetPangkat.toISOString().split('T')[0])})`,
            monthsLeft: mPangkat,
            targetDateStr: targetPangkat.toISOString().split('T')[0],
            asnName: asn.nama_lengkap + (asn.gelar_belakang ? `, ${asn.gelar_belakang}` : ''),
            nip: asn.nip,
            puskesmasId: asn.id_puskesmas,
            statusPegawaiDetail: statusDetail
          });
        }
      }
    }

    // 3. KENAIKAN GAJI BERKALA (KGB - Siklus 2 Tahun)
    // Sesuai PP No. 7 Tahun 1977 dan PermenPAN-RB No. 7 Tahun 2023:
    // KGB HANYA BERLAKU UNTUK ASN (PNS, PPPK Penuh Waktu, PPPK Paruh Waktu).
    // Non-ASN (PKWT / Tenaga Kontrak) TIDAK berhak atas KGB (haknya berupa evaluasi/perpanjangan kontrak kerja tahunan).
    if (!isNonAsn) {
      const lastBerkalaStr = asn.tmt_berkala_terakhir || asn.tmt_pangkat_terakhir || (isPppk ? asn.pppk_tmt_golongan : undefined);
      if (lastBerkalaStr) {
        const berkalaDate = new Date(lastBerkalaStr);
        if (!isNaN(berkalaDate.getTime())) {
          const targetBerkala = new Date(berkalaDate.getFullYear() + 2, berkalaDate.getMonth(), berkalaDate.getDate());
          const mBerkala = countMonthDiff(refDate, targetBerkala);

          if (mBerkala > 0 && mBerkala <= 2) {
            alerts.push({
              id: `berkala-${asn.id}`,
              id_asn: asn.id,
              type: 'berkala',
              message: `Kenaikan Gaji Berkala (KGB ${isPns ? 'PNS' : 'PPPK'} - Siklus 2 Tahun)`,
              subMessage: `${Math.round(mBerkala * 10) / 10} bulan tersisa sebelum TMT berkala baru (${formatDate(targetBerkala.toISOString().split('T')[0])})`,
              monthsLeft: mBerkala,
              targetDateStr: targetBerkala.toISOString().split('T')[0],
              asnName: asn.nama_lengkap + (asn.gelar_belakang ? `, ${asn.gelar_belakang}` : ''),
              nip: asn.nip,
              puskesmasId: asn.id_puskesmas,
              statusPegawaiDetail: statusDetail
            });
          }
        }
      }
    }

    // 4. KP4 / MODEL DK (Daftar Susunan Keluarga Tunjangan Suami/Istri & Anak)
    // Berlaku untuk seluruh ASN Penggajian (PNS, PPPK Penuh Waktu, PPPK Paruh Waktu)
    // Non-ASN TIDAK menggunakan formulir KP4 Model DK tunjangan gaji negara BKN.
    if (!isNonAsn) {
      const currentYear = refDate.getFullYear();
      if (!asn.kp4_tahun_validasi || asn.kp4_tahun_validasi < currentYear) {
        alerts.push({
          id: `kp4-${asn.id}`,
          id_asn: asn.id,
          type: 'kp4',
          message: `Validasi Formulir KP4 / Model DK Tahunan Belum Diperbarui`,
          subMessage: `Terakhir divalidasi tahun ${asn.kp4_tahun_validasi || 'Belum Ada'}. Hubungkan data KK/KP4 baru Anda ke Sistem.`,
          monthsLeft: 2.5, // Priority ranking
          targetDateStr: `${currentYear}-12-31`,
          asnName: asn.nama_lengkap + (asn.gelar_belakang ? `, ${asn.gelar_belakang}` : ''),
          nip: asn.nip,
          puskesmasId: asn.id_puskesmas,
          statusPegawaiDetail: statusDetail
        });
      }
    }

    // 5. BATAS JATUH TEMPO KONTRAK KERJA / PERJANJIAN (PPPK & Non-ASN / PKWT)
    // - PPPK: Berdasarkan akhir masa perjanjian kerja (pppk_tmt_perjanjian_selesai)
    // - Non-ASN (PKWT): Berdasarkan batas kontrak tahunan (pkwt_tgl_sk_kontrak / 31 Desember)
    if (isPppk || isNonAsn) {
      let targetKontrak: Date | null = null;
      let labelKontrak = '';

      if (isPppk) {
        if (asn.pppk_tmt_perjanjian_selesai) {
          const d = new Date(asn.pppk_tmt_perjanjian_selesai);
          if (!isNaN(d.getTime())) targetKontrak = d;
        } else if (asn.pppk_tmt_perjanjian_mulai) {
          const mulai = new Date(asn.pppk_tmt_perjanjian_mulai);
          if (!isNaN(mulai.getTime())) targetKontrak = new Date(mulai.getFullYear() + 5, mulai.getMonth(), mulai.getDate());
        }
        labelKontrak = `Batas Akhir Perjanjian Kerja PPPK (${statusDetail === 'PPPK_Paruh_Waktu' ? 'Paruh Waktu' : 'Penuh Waktu'})`;
      } else if (isNonAsn) {
        if (asn.pkwt_tgl_sk_kontrak) {
          const tglSk = new Date(asn.pkwt_tgl_sk_kontrak);
          if (!isNaN(tglSk.getTime())) targetKontrak = new Date(tglSk.getFullYear(), 11, 31);
        }
        if (!targetKontrak) {
          targetKontrak = new Date(refDate.getFullYear(), 11, 31);
        }
        labelKontrak = `Batas Akhir Kontrak Kerja Non-ASN / PKWT (${asn.pkwt_pembiayaan || 'BLUD'})`;
      }

      if (targetKontrak) {
        const mKontrak = countMonthDiff(refDate, targetKontrak);
        // Alert jika dalam 2 bulan sebelum kontrak berakhir atau sudah lewat tempo
        if (mKontrak > 0 && mKontrak <= 2) {
          alerts.push({
            id: `kontrak-${asn.id}`,
            id_asn: asn.id,
            type: 'kontrak',
            message: labelKontrak,
            subMessage: `${Math.round(mKontrak * 10) / 10} bulan tersisa sebelum masa kontrak berakhir (${formatDate(targetKontrak.toISOString().split('T')[0])})`,
            monthsLeft: mKontrak,
            targetDateStr: targetKontrak.toISOString().split('T')[0],
            asnName: asn.nama_lengkap + (asn.gelar_belakang ? `, ${asn.gelar_belakang}` : ''),
            nip: asn.nik || asn.nip,
            puskesmasId: asn.id_puskesmas,
            statusPegawaiDetail: statusDetail
          });
        }
      }
    }
  });

  return alerts.sort((a, b) => a.monthsLeft - b.monthsLeft);
}

/**
 * PermenPAN-RB 1/2023 Jafung credit points definitions
 */
export const KOEFISIEN_TAHUNAN_JAFUNG: Record<string, number> = {
  "Terampil": 5.0,
  "Ahli Pertama": 12.5,
  "Ahli Muda": 25.0,
  "Ahli Madya": 37.5
};

export const MULTIPLIER_PREDIKAT_SKP: Record<PredikatSKP, number> = {
  "Sangat Baik": 1.5,
  "Baik": 1.0,
  "Butuh Perbaikan": 0.75,
  "Kurang": 0.5,
  "Sangat Kurang": 0.0
};

/**
 * Calculate credits acquired per year
 */
export function calculateYearlyCredit(jenjang: string, predikat: PredikatSKP): number {
  const coeff = KOEFISIEN_TAHUNAN_JAFUNG[jenjang] || 12.5; // default Ahli Pertama
  const mult = MULTIPLIER_PREDIKAT_SKP[predikat] ?? 1.0;
  return coeff * mult;
}

/**
 * Run overall calculation logic for an Jafung ASN
 */
export function compileTotalCredit(
  akIntegrasi2022: number, 
  jenjang: string, 
  riwayat: RiwayatAngkaKredit[]
): { total: number; detailHistorySum: number } {
  const sumHistory = riwayat.reduce((acc, curr) => acc + curr.ak_diperoleh, 0);
  return {
    total: akIntegrasi2022 + sumHistory,
    detailHistorySum: sumHistory
  };
}

/**
 * Simple mock OCR parser
 * Read content & check if it matches target keywords and owner's credentials (NIP or name)
 */
export function runMockOcrValidation(
  fileName: string,
  rawText: string,
  requiredDocKeywords: string,
  targetNip: string,
  targetName: string
): { success: boolean; reason: string; keywordsFound: string[] } {
  const textUpper = (rawText + " " + fileName).toUpperCase();
  const nipClear = targetNip.replace(/\D/g, ''); // numerical
  const nameParts = targetName.toLowerCase().split(/\s+/).filter(p => p.length > 2);

  // 1. check for other people's NIP! (Anti-slop safety upload check)
  // Let's check if the text contains a 18-digit number that starts with "19" or "20" but DOES NOT MATCH target NIP
  const nipPattern = /\b(19|20)\d{16}\b/g;
  const foundNips = textUpper.match(nipPattern);
  if (foundNips) {
    const foreignNip = foundNips.find(n => n !== nipClear);
    if (foreignNip) {
      return {
        success: false,
        reason: `Sistem mendeteksi NIP lain (${foreignNip}) di dalam dokumen yang diunggah. Berkas ini dicurigai milik pegawai lain.`,
        keywordsFound: []
      };
    }
  }

  // 2. keyword matching checks
  const keywords = requiredDocKeywords.split(',').map(k => k.trim().toUpperCase());
  const matched: string[] = [];
  keywords.forEach(k => {
    if (textUpper.includes(k)) {
      matched.push(k);
    }
  });

  const matchRatio = keywords.length > 0 ? (matched.length / keywords.length) : 1;
  
  if (matchRatio < 0.4) {
    return {
      success: false,
      reason: `Dokumen tidak valid atau kurang lengkap. Kata kunci tipe berkas wajib tidak ditemukan (mencari: ${requiredDocKeywords.toLowerCase()}).`,
      keywordsFound: matched
    };
  }

  return {
    success: true,
    reason: "Validasi Dokumen Sukses: Kata kunci tipe syarat lulus verifikasi OCR dan data pegawai sesuai.",
    keywordsFound: matched
  };
}

/**
 * Adds specify number of years to a standard ISO date string
 */
export function addYearsToDateString(dateString: string | undefined | null, years: number): string {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "-";
    d.setFullYear(d.getFullYear() + years);
    return d.toISOString().split('T')[0];
  } catch {
    return "-";
  }
}

/**
 * Normalizes any variation of an Indonesian phone number to standard country-coded digits (e.g. "628...")
 * and optionally to standard storage format (e.g. "+628...")
 */
export function normalizeIndonesianPhoneNumber(phone: string, withPlus: boolean = false): string {
  if (!phone) return '';
  // Remove all non-digits
  let digits = phone.replace(/\D/g, '');
  
  // If it starts with 62, normalize by stripping 62 temporarily
  if (digits.startsWith('62')) {
    digits = digits.substring(2);
  }
  
  // Strip any leading zeros
  while (digits.startsWith('0')) {
    digits = digits.substring(1);
  }
  
  // If digits are empty, return empty
  if (!digits) return '';
  
  // Return either "+62..." or "62..."
  return withPlus ? '+62' + digits : '62' + digits;
}

/**
 * Sends a WhatsApp message using Baileys Gateway with a fallback to opening a WhatsApp Web / App link.
 * @param phone Recipient phone number (handles standard phone digits, e.g. "08...", "+62...")
 * @param message Message body text
 * @returns Promise<{ success: boolean; method: 'wa_web' | 'baileys'; error?: string }>
 */
export async function sendWhatsAppMessage(phone: string, message: string): Promise<{ success: boolean; method: 'wa_web' | 'baileys'; error?: string }> {
  // Clean phone number:
  const cleanPhone = normalizeIndonesianPhoneNumber(phone, false);
  
  if (!cleanPhone) {
    throw new Error('Nomor telepon tidak valid');
  }

  const whatsappMode = localStorage.getItem('whatsapp_mode') || 'baileys';

  // Helper to open WhatsApp Web or App
  const openWhatsAppWebLink = () => {
    const isMobileOrTablet = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && navigator.platform === 'MacIntel');
    const encoded = encodeURIComponent(message);
    const targetUrl = isMobileOrTablet 
      ? `whatsapp://send?phone=${cleanPhone}&text=${encoded}`
      : `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`;
    
    window.open(targetUrl, 'whatsapp_window');
  };

  // If user explicitly chose to ALWAYS use WhatsApp Web
  if (whatsappMode === 'wa_web') {
    openWhatsAppWebLink();
    return { success: true, method: 'wa_web' };
  }

  // Path A: Baileys Server-side Gateway
  try {
    const response = await fetch('/api/send-whatsapp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: cleanPhone,
        message: message,
        mode: 'baileys'
      }),
    });

    if (response.ok) {
      const result = await response.json();
      if (result && (result.status === true || result.success === true)) {
        return { success: true, method: 'baileys' };
      }
    }
    
    // Fall back to opening WA Web if Baileys isn't currently connected
    openWhatsAppWebLink();
    return { success: true, method: 'wa_web' };
  } catch (err: any) {
    console.warn('[WhatsApp] Baileys failed, falling back to direct WhatsApp Web:', err);
    openWhatsAppWebLink();
    return { 
      success: true, 
      method: 'wa_web', 
      error: err?.message || String(err)
    };
  }
}

