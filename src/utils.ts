/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ASNProfile, RiwayatAngkaKredit, PredikatSKP } from './types';

// Anchor system date: June 11, 2026
export const SYSTEM_DATE_STR = "2026-06-11";
export const SYSTEM_DATE = new Date(SYSTEM_DATE_STR);

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
  type: 'pensiun' | 'pangkat' | 'berkala' | 'kp4';
  message: string;
  subMessage: string;
  monthsLeft: number;
  targetDateStr: string;
  asnName: string;
  nip: string;
  puskesmasId: number;
}

/**
 * Multi-Tenant Local Early Warning System logic matcher
 */
export function getEarlyWarningAlerts(asnList: ASNProfile[]): EarlyWarningAlert[] {
  const alerts: EarlyWarningAlert[] = [];

  asnList.forEach(asn => {
    if (asn.status_kepegawaian !== 'Aktif') return;

    // 1. PENSIUN (BUP is 58 years for common civil service / clinical Jafung in primary clinics)
    const birthDate = new Date(asn.tanggal_lahir);
    const targetPensiun = new Date(birthDate.getFullYear() + 58, birthDate.getMonth(), birthDate.getDate());
    const mPensiun = countMonthDiff(SYSTEM_DATE, targetPensiun);

    if (mPensiun > 0 && mPensiun <= 6) {
      alerts.push({
        id: `pensiun-${asn.id}`,
        id_asn: asn.id,
        type: 'pensiun',
        message: `Masa Pensiun Mendekati (BUP 58 Tahun)`,
        subMessage: `${Math.round(mPensiun * 10) / 10} bulan tersisa sebelum TMT pensiun (${formatDate(targetPensiun.toISOString().split('T')[0])})`,
        monthsLeft: mPensiun,
        targetDateStr: targetPensiun.toISOString().split('T')[0],
        asnName: asn.nama_lengkap + (asn.gelar_belakang ? `, ${asn.gelar_belakang}` : ''),
        nip: asn.nip,
        puskesmasId: asn.id_puskesmas
      });
    }

    // 2. KENAIKAN PANGKAT (Period is every 4 years)
    const pangkatDate = new Date(asn.tmt_pangkat_terakhir);
    const targetPangkat = new Date(pangkatDate.getFullYear() + 4, pangkatDate.getMonth(), pangkatDate.getDate());
    const mPangkat = countMonthDiff(SYSTEM_DATE, targetPangkat);

    if (mPangkat > 0 && mPangkat <= 4) {
      alerts.push({
        id: `pangkat-${asn.id}`,
        id_asn: asn.id,
        type: 'pangkat',
        message: `Kenaikan Pangkat Berkala (Siklus 4 Tahun)`,
        subMessage: `${Math.round(mPangkat * 10) / 10} bulan tersisa sebelum TMT pangkat baru (${formatDate(targetPangkat.toISOString().split('T')[0])})`,
        monthsLeft: mPangkat,
        targetDateStr: targetPangkat.toISOString().split('T')[0],
        asnName: asn.nama_lengkap + (asn.gelar_belakang ? `, ${asn.gelar_belakang}` : ''),
        nip: asn.nip,
        puskesmasId: asn.id_puskesmas
      });
    }

    // 3. GAJI BERKALA (Period is every 2 years)
    const berkalaDate = new Date(asn.tmt_berkala_terakhir);
    const targetBerkala = new Date(berkalaDate.getFullYear() + 2, berkalaDate.getMonth(), berkalaDate.getDate());
    const mBerkala = countMonthDiff(SYSTEM_DATE, targetBerkala);

    if (mBerkala > 0 && mBerkala <= 2) {
      alerts.push({
        id: `berkala-${asn.id}`,
        id_asn: asn.id,
        type: 'berkala',
        message: `Kenaikan Gaji Berkala (KGB - Siklus 2 Tahun)`,
        subMessage: `${Math.round(mBerkala * 10) / 10} bulan tersisa sebelum TMT berkala baru (${formatDate(targetBerkala.toISOString().split('T')[0])})`,
        monthsLeft: mBerkala,
        targetDateStr: targetBerkala.toISOString().split('T')[0],
        asnName: asn.nama_lengkap + (asn.gelar_belakang ? `, ${asn.gelar_belakang}` : ''),
        nip: asn.nip,
        puskesmasId: asn.id_puskesmas
      });
    }

    // 4. KP4 / MODEL DK (Annual Family Allowance Validation update for current year)
    if (asn.status_pegawai_detail && asn.status_pegawai_detail !== 'Non_ASN') {
      const currentYear = SYSTEM_DATE.getFullYear();
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
          puskesmasId: asn.id_puskesmas
        });
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

