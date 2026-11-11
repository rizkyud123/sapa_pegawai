import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Users, 
  Heart, 
  Baby, 
  AlertTriangle, 
  CheckCircle2, 
  FileCheck, 
  Search, 
  Building2, 
  Sliders, 
  FileDown, 
  DollarSign,
  MessageSquare
} from 'lucide-react';
import { ASNProfile, KP4Anak, Puskesmas } from '../../types';
import { sendWhatsAppMessage } from '../../utils';

interface PuskesmasItem {
  id: number;
  nama?: string;
  nama_puskesmas?: string;
  kode_puskesmas?: string;
  alamat?: string;
  total_penduduk?: number;
}

interface DashboardKP4Props {
  currentRole: 'admin_dinkes' | 'admin_puskesmas';
  selectedPuskesmasId: number;
  puskesmasList: PuskesmasItem[];
  asnProfiles: ASNProfile[];
  onEditEmployee: (employee: ASNProfile) => void;
}

export default function DashboardKP4({
  currentRole,
  selectedPuskesmasId,
  puskesmasList,
  asnProfiles,
  onEditEmployee
}: DashboardKP4Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [unitFilter, setUnitFilter] = useState<number | 'ALL'>(
    currentRole === 'admin_dinkes' ? 100 : selectedPuskesmasId
  );
  const [statusWarnFilter, setStatusWarnFilter] = useState<'ALL' | 'WARNING_ONLY' | 'CLEAN_ONLY'>('ALL');
  const [selectedWarningCode, setSelectedWarningCode] = useState<string | null>(null);

  // WhatsApp Preview Modal States
  const [waModalOpen, setWaModalOpen] = useState(false);
  const [waRecipientName, setWaRecipientName] = useState('');
  const [waRecipientPhone, setWaRecipientPhone] = useState('');
  const [waDraftMessage, setWaDraftMessage] = useState('');
  const [waCatatanInput, setWaCatatanInput] = useState('');
  const [waOriginalBaseMsg, setWaOriginalBaseMsg] = useState('');

  const handleCatatanChange = (newVal: string) => {
    setWaCatatanInput(newVal);
    if (newVal.trim() !== '') {
      setWaDraftMessage(`${waOriginalBaseMsg}\n\n*Catatan Tambahan*: _"${newVal}"_`);
    } else {
      setWaDraftMessage(waOriginalBaseMsg);
    }
  };

  // get Puskesmas Name Helper
  const getPuskesmasName = (id: any) => {
    const numericId = Number(id);
    const found = puskesmasList.find(p => Number(p.id) === numericId);
    return found ? (found.nama_puskesmas || found.nama || `Puskesmas ID ${numericId}`) : `Puskesmas ID ${numericId}`;
  };

  // 2026 Fixed budget simulation based on approximate PNS/PPPK base salary
  const getEstimatedBaseSalary = (profile: ASNProfile) => {
    if (profile.status_pegawai_detail === 'PNS') {
      // standard Gapok III/a - IV/b approximation
      if (profile.golongan_ruang?.startsWith('IV')) return 4200000;
      if (profile.golongan_ruang?.startsWith('III')) return 3200000;
      if (profile.golongan_ruang?.startsWith('II')) return 2400000;
      return 2800000;
    } else {
      // PPPK salary approximation
      return 3000000;
    }
  };

  // Helper audit calculations for single profile
  const auditASNProfile = (asn: ASNProfile) => {
    const issues: { type: 'ERROR' | 'WARNING'; message: string; code: string; potentialFine: number }[] = [];
    if (asn.status_pegawai_detail === 'Non_ASN') return { isClean: true, issues, spouseClaimed: false, childrenClaimedCount: 0, estimatedAllowance: 0 };

    const baseSalary = getEstimatedBaseSalary(asn);
    let spouseAllowance = 0;
    let kidsAllowance = 0;

    // A. Spouse check
    const spouseClaimed = asn.kp4_status_pernikahan === 'Kawin' && asn.kp4_pasangan_tunjangan_diklaim;
    if (spouseClaimed) {
      spouseAllowance = baseSalary * 0.10; // 10% marriage allowance
      // BPK Violation if Partner is also ASN and allowance claimed
      if (asn.kp4_pasangan_asn) {
        issues.push({
          type: 'ERROR',
          code: 'DOUBLE_ASN_CLAIM',
          message: `Pasangan sesama ASN diklaim tunjangannya oleh PNS bersangkutan (${asn.kp4_nama_pasangan || 'Tanpa Nama'} - ASN). Beresiko temuan audit ganda (Double-funding).`,
          potentialFine: spouseAllowance * 12 // 1 year fine simulation
        });
      }
    }

    // B. Outdated KP4 year
    const validationYear = asn.kp4_tahun_validasi || 0;
    if (validationYear && validationYear < 2026) {
      issues.push({
        type: 'WARNING',
        code: 'OUTDATED_KP4',
        message: `Berkas KP4 kedaluwarsa (Tahun ${validationYear}). Wajib diperbarui ke Tahun Anggaran berjalan 2026 untuk meminimalisir temuan administratif BPK.`,
        potentialFine: 0
      });
    } else if (!asn.kp4_tanggal_validasi) {
      issues.push({
        type: 'WARNING',
        code: 'MISSING_DATE',
        message: 'Tanggal pengesahan KP4 kosong atau berkas fisik belum diverifikasi.',
        potentialFine: 0
      });
    }

    // C. Scan file check
    if (!asn.kp4_berkas_file_name) {
      issues.push({
        type: 'WARNING',
        code: 'NO_PHYSICAL_SCAN',
        message: 'Scan formulir KP4 asli (Model DK) fisik belum terunggah untuk pembuktian tanda tangan Kepala Unit.',
        potentialFine: 0
      });
    }

    // D. Children checks
    let childList: KP4Anak[] = [];
    try {
      childList = JSON.parse(asn.kp4_daftar_anak || '[]');
    } catch (e) {
      childList = [];
    }

    const claimedChildren = childList.filter(c => c.tunjangan_diklaim);
    const claimedCount = claimedChildren.length;

    // PP 51/1992: Limit max 2 children allowance
    if (claimedCount > 2) {
      issues.push({
        type: 'ERROR',
        code: 'EXCESSIVE_KIDS_LIMIT',
        message: `Jumlah klaim anak tertanggung (${claimedCount} anak) melebihi batas regulasi PP 51/1992 (Maksimal 2 Anak). Pengeluaran kas daerah kelebihan ${claimedCount - 2} anak.`,
        potentialFine: (baseSalary * 0.02) * (claimedCount - 2) * 12
      });
    }

    childList.forEach(child => {
      let age = 0;
      if (child.tanggal_lahir) {
        const birthYear = new Date(child.tanggal_lahir).getFullYear();
        age = 2026 - birthYear; // system simulation calendar year 2026
      }

      if (child.tunjangan_diklaim) {
        kidsAllowance += baseSalary * 0.02; // 2% per child

        const childBenefit = baseSalary * 0.02;

        // Age > 25 (strict forbidden)
        if (age > 25) {
          issues.push({
            type: 'ERROR',
            code: 'CHILD_OVERAGE_25',
            message: `Anak "${child.nama}" berumur ${age} Tahun (Melebihi batas absolut 25 tahun PP 7/1977). Tunjangan wajib dihentikan segera!`,
            potentialFine: childBenefit * 12
          });
        }
        // Age 21-25 (special check: must be active student with SKKS)
        else if (age >= 21) {
          if (child.status_sekolah !== 'Sekolah/Kuliah') {
            issues.push({
              type: 'ERROR',
              code: 'CHILD_NOT_STUDENT',
              message: `Anak "${child.nama}" berumur kuliah (${age} Tahun) tetapi status tertulis: "${child.status_sekolah}". Tidak berhak menerima tunjangan keluarga karena diasumsikan bekerja/mandiri.`,
              potentialFine: childBenefit * 12
            });
          } else if (!child.has_skks) {
            issues.push({
              type: 'WARNING',
              code: 'CHILD_MISSING_SKKS',
              message: `Anak "${child.nama}" kuliah (${age} Tahun) tetapi Surat Keterangan Kuliah Aktif (SKKS) tahun berjalan belum terlampir. Beresiko tinggi menjadi temuan sampling BPK.`,
              potentialFine: 0
            });
          }
        }

        // Status Pekerjaan / Menikah
        if (child.status_sekolah === 'Bekerja' || child.status_sekolah === 'Menikah') {
          issues.push({
            type: 'ERROR',
            code: 'CHILD_INELIGIBLE_STATUS',
            message: `Anak "${child.nama}" status sudah Menikah/Bekerja. Secara administratif gugur hak tunjangannya sesuai UU Gaji Pegawai BKN.`,
            potentialFine: childBenefit * 12
          });
        }
      }
    });

    const isClean = issues.length === 0;
    const totalPotentialFine = issues.reduce((acc, iss) => acc + iss.potentialFine, 0);

    return {
      isClean,
      issues,
      spouseClaimed,
      childrenClaimedCount: claimedCount,
      estimatedAllowance: spouseAllowance + (Math.min(claimedCount, 2) * (baseSalary * 0.02)),
      totalPotentialFine
    };
  };

  // 1. Get baseline list of ASNs matching the selected Dinkes / Unit database scope (ignores searchTerm)
  const databaseAsnList = asnProfiles.filter(p => {
    if (p.status_pegawai_detail === 'Non_ASN') return false; // Only ASN has families KP4

    // Limit to tenant unit if role is admin_puskesmas
    if (currentRole !== 'admin_dinkes' && p.id_puskesmas !== selectedPuskesmasId) {
      return false;
    }

    // Filter by selected Unit work if role is admin_dinkes
    if (currentRole === 'admin_dinkes' && unitFilter !== 'ALL' && p.id_puskesmas !== unitFilter) {
      return false;
    }

    return true;
  });

  // 2. Perform audits on complete database scope
  const auditedDatabaseList = databaseAsnList.map(asn => {
    const audit = auditASNProfile(asn);
    return {
      asn,
      ...audit
    };
  });

  // 3. Compute database-scoped global statistics
  const totalASN = databaseAsnList.length;
  const auditedDatabaseCleanList = auditedDatabaseList.filter(item => item.isClean);
  const totalClean = auditedDatabaseCleanList.length;
  const complianceRate = totalASN > 0 ? Math.round((totalClean / totalASN) * 100) : 100;

  const totalWarnings = auditedDatabaseList.reduce((acc, item) => acc + item.issues.length, 0);
  const totalErrors = auditedDatabaseList.reduce((acc, item) => acc + item.issues.filter(i => i.type === 'ERROR').length, 0);

  const estimatedAllowanceSum = auditedDatabaseList.reduce((acc, item) => acc + item.estimatedAllowance, 0);
  const totalPotentialFineSum = auditedDatabaseList.reduce((acc, item) => acc + item.totalPotentialFine, 0);

  // Group Issues by categories for audit monitoring panel over the database scope
  const groupCount = {
    DOUBLE_ASN_CLAIM: 0,
    OUTDATED_KP4: 0,
    EXCESSIVE_KIDS_LIMIT: 0,
    CHILD_OVERAGE_25: 0,
    CHILD_MISSING_SKKS: 0,
  };

  auditedDatabaseList.forEach(item => {
    item.issues.forEach(issue => {
      if (issue.code in groupCount) {
        groupCount[issue.code as keyof typeof groupCount]++;
      }
    });
  });

  // 4. Calculate searchable & table-filtered lists
  const rawAsnList = databaseAsnList.filter(p => {
    const matchesSearch = p.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.nip.includes(searchTerm) || 
                          (p.nik || '').includes(searchTerm);

    return matchesSearch;
  });

  const auditedList = rawAsnList.map(asn => {
    const audit = auditASNProfile(asn);
    return {
      asn,
      ...audit
    };
  });

  const finalFilteredList = auditedList.filter(item => {
    // A. Audit status filter (WARNING_ONLY, CLEAN_ONLY)
    if (statusWarnFilter === 'WARNING_ONLY' && item.isClean) return false;
    if (statusWarnFilter === 'CLEAN_ONLY' && !item.isClean) return false;

    // B. Interactive BPK critical warning tag filter
    if (selectedWarningCode) {
      const hasWarningOfSelectedType = item.issues.some(issue => issue.code === selectedWarningCode);
      if (!hasWarningOfSelectedType) return false;
    }

    return true;
  });

  const sendKP4WhatsAppNotification = (
    p: ASNProfile,
    isClean: boolean,
    issues: { type: 'ERROR' | 'WARNING'; message: string; code: string; potentialFine: number }[]
  ) => {
    const rawWaNum = p.nomor_wa || '';
    let cleanPhone = rawWaNum.replace(/[^0-9+]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '+62' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('62') && !cleanPhone.startsWith('+62')) {
      cleanPhone = '+' + cleanPhone;
    } else if (!cleanPhone.startsWith('+62') && cleanPhone !== '') {
      cleanPhone = '+62' + cleanPhone;
    }

    let messageContent = '';
    
    if (isClean) {
      messageContent = `Yth. Bapak/Ibu *${p.nama_lengkap}${p.gelar_belakang ? `, ${p.gelar_belakang}` : ''}*,

Menginformasikan hasil audit kepatuhan database *SAPA Pegawai UPT Puskesmas Sedau Kab. Lombok Barat* untuk berkas Keluarga (*Formulir KP4 / Model DK*):

📌 *STATUS HASIL AUDIT*: ✅ *100% BEBAS TEMUAN (BERSIH)*

Seluruh data tunjangan pasangan (suami/istri) dan anak-anak Anda telah tervalidasi sesuai PP No.7/1977 & PP No.51/1992. Terima kasih atas kepatuhan administrasi Anda dalam menjaga integritas dan ketertiban data kepegawaian.

_Notifikasi otomatis dikirim via Sistem Analisa KP4 UPT Puskesmas Sedau Kab. Lombok Barat_`;
    } else {
      const issuesListStr = issues.map((i, idx) => `${idx + 1}. *[${i.type}]* ${i.message}`).join('\n');
      messageContent = `Yth. Bapak/Ibu *${p.nama_lengkap}${p.gelar_belakang ? `, ${p.gelar_belakang}` : ''}*,

Menginformasikan hasil audit kepatuhan database *SAPA Pegawai UPT Puskesmas Sedau Kab. Lombok Barat* untuk berkas Keluarga (*Formulir KP4 / Model DK*):

📌 *STATUS HASIL AUDIT*: ⚠️ *TERDETEKSI POTENSI TEMUAN AUDIT BPK*

Sistem auto-validasi kami mendeteksi ketidaksesuaian administrasi pada data Anda:

${issuesListStr}

*Mohon Tindak Lanjut Segera:*
1. Lakukan pembaruan berkas KP4 digital di menu SIMPEG Anda.
2. Unggah fotokopi SK / berkas pendukung terupdate untuk menghindari sanksi Tuntutan Ganti Rugi (TGR) / pemotongan tunjangan.

_Notifikasi otomatis dikirim via Sistem Analisa KP4 UPT Puskesmas Sedau Kab. Lombok Barat_`;
    }

    if (!rawWaNum) {
      window.alert(
        `⚠️ Nomor WhatsApp untuk pegawai "${p.nama_lengkap}" belum terekam di database pegawai.\n\nHarap edit profil pegawai terlebih dahulu untuk menambahkan nomor WhatsApp.`
      );
    } else {
      setWaRecipientName(`${p.nama_lengkap}${p.gelar_belakang ? `, ${p.gelar_belakang}` : ''}`);
      setWaRecipientPhone(cleanPhone);
      setWaOriginalBaseMsg(messageContent);
      setWaDraftMessage(messageContent);
      setWaCatatanInput('');
      setWaModalOpen(true);
    }
  };

  return (
    <div className="space-y-6 text-slate-800 animate-in fade-in duration-200">
      
      {/* WhatsApp Modal Dialog */}
      {waModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl text-left space-y-4">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="text-emerald-600 text-base">💬</span>
                  Pratinjau Kirim WhatsApp
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kepada: <strong className="text-slate-700">{waRecipientName}</strong> ({waRecipientPhone})
                </p>
              </div>
              <button
                onClick={() => setWaModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Edit Draft Format Pesan</label>
              <textarea
                rows={10}
                value={waDraftMessage}
                onChange={(e) => setWaDraftMessage(e.target.value)}
                className="w-full p-3 border border-slate-200 bg-slate-50 rounded-lg text-xs text-slate-700 font-mono focus:ring-1 focus:ring-slate-450 focus:outline-none focus:bg-white leading-relaxed resize-y"
                placeholder="Tulis pesan..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Catatan Tambahan (Opsional)</label>
              <input
                type="text"
                value={waCatatanInput}
                onChange={(e) => handleCatatanChange(e.target.value)}
                placeholder="e.g. Harap segera diserahkan sebelum hari Jumat ini."
                className="w-full p-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:ring-1 focus:ring-teal-500 focus:outline-none"
              />
              <p className="text-[10px] text-slate-400">Catatan akan ditambahkan otomatis di bagian bawah draf pesan di atas.</p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setWaModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const result = await sendWhatsAppMessage(waRecipientPhone, waDraftMessage);
                    if (result.method === 'baileys') {
                      alert(`✓ Berhasil mengirim pesan via WhatsApp Gateway (${result.method}) secara langsung.`);
                    } else {
                      alert(`⚠️ Pesan tidak dapat dikirim secara langsung.\nNotifikasi dialihkan via WhatsApp Web.`);
                    }
                  } catch (err: any) {
                    alert(`❌ Gagal mengirim: ${err.message || err}`);
                  }
                  setWaModalOpen(false);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs transition cursor-pointer shadow-sm flex items-center space-x-1.5"
              >
                <MessageSquare size={13} />
                <span>Kirim</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="text-left py-1">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-display font-bold text-slate-800">
              Analisa KP4 &amp; Model DK
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengawasan dan validasi data tunjangan keluarga pegawai UPT Puskesmas Sedau
          </p>
        </div>

        {/* Export report button mockup */}
        <button
          onClick={() => alert("✓ Mengunduh Lembar Analisa Kepatuhan KP4 Lombok Barat Format XLSX...")}
          className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl flex items-center space-x-2 transition cursor-pointer shadow-xs min-h-[36px]"
        >
          <FileDown size={14} className="text-emerald-700" />
          <span>Ekspor Rekap KP4 (XLSX)</span>
        </button>
      </div>

      {/* Bento Grid Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Compliance */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 flex items-center justify-between shadow-xs">
          <div className="space-y-1 text-left">
            <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider block">Kepatuhan Berkas</span>
            <span className="text-2xl font-mono font-extrabold text-slate-900 block">{complianceRate}%</span>
            <span className="text-[10.5px] text-slate-500 font-medium block">
              {totalClean} dr {totalASN} ASN Bersih Audit
            </span>
          </div>
          <div className={`h-11 w-11 rounded-full flex items-center justify-center ${complianceRate > 90 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
            <CheckCircle2 size={20} />
          </div>
        </div>

        {/* Card 2: BPK Warnings */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 flex items-center justify-between shadow-xs">
          <div className="space-y-1 text-left">
            <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider block">Resiko Temuan</span>
            <span className="text-2xl font-mono font-extrabold text-rose-600 block">
              {totalWarnings} <span className="text-xs font-normal text-slate-500">Temuan</span>
            </span>
            <span className="text-[10.5px] text-slate-500 font-medium block">
              <span className="text-rose-600 font-bold">{totalErrors} Mayor</span>, <span className="text-amber-600 font-bold">{totalWarnings - totalErrors} Minor (Administratif)</span>
            </span>
          </div>
          <div className="h-11 w-11 rounded-full bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center">
            <ShieldAlert size={20} />
          </div>
        </div>

        {/* Card 3: Budget claimed */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 flex items-center justify-between shadow-xs">
          <div className="space-y-1 text-left">
            <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider block">Estimasi Beban Tunjangan</span>
            <span className="text-xl font-mono font-extrabold text-teal-700 block">
              Rp {estimatedAllowanceSum.toLocaleString('id-ID')}
            </span>
            <span className="text-[10.5px] text-slate-500 font-medium block">
              Tunjangan Suami/Istri &amp; Anak / Bulan
            </span>
          </div>
          <div className="h-11 w-11 rounded-full bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center">
            <DollarSign size={20} />
          </div>
        </div>

        {/* Card 4: Potential recovery audit */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-5 flex items-center justify-between shadow-xs">
          <div className="space-y-1 text-left">
            <span className="text-[10px] text-slate-500 uppercase font-extrabold tracking-wider block">Potensi TGR (Setor Balik)</span>
            <span className="text-xl font-mono font-extrabold text-amber-700 block">
              Rp {totalPotentialFineSum.toLocaleString('id-ID')}
            </span>
            <span className="text-[10.5px] text-slate-500 font-medium block">
              Risiko Pengembalian Kas per Tahun (12 bln)
            </span>
          </div>
          <div className="h-11 w-11 rounded-full bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
            <AlertTriangle size={20} />
          </div>
        </div>
      </div>

      {/* BPK Rules Protective Indicators Summary */}
      <div className="bg-white border border-slate-200/95 rounded-2xl p-5 space-y-3.5 shadow-xs text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
            <span className="text-emerald-700">📋</span>
            <span>Indikator Validasi &amp; Kepatuhan Tunjangan</span>
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. DOUBLE_ASN_CLAIM */}
          <button
            type="button"
            onClick={() => setSelectedWarningCode(selectedWarningCode === 'DOUBLE_ASN_CLAIM' ? null : 'DOUBLE_ASN_CLAIM')}
            className={`p-3.5 rounded-xl space-y-1.5 transition duration-150 cursor-pointer text-left w-full border ${
              selectedWarningCode === 'DOUBLE_ASN_CLAIM'
                ? 'bg-rose-50 border-rose-400 shadow-sm ring-2 ring-rose-400/25 text-slate-900'
                : 'bg-slate-50/80 hover:bg-slate-100/90 border-slate-200 text-slate-700'
            }`}
          >
            <span className="text-[9px] font-extrabold text-slate-500 uppercase block tracking-wider">Ganda Suami/Istri</span>
            <div className="flex justify-between items-baseline gap-1">
              <span className={`text-base font-mono font-extrabold ${selectedWarningCode === 'DOUBLE_ASN_CLAIM' ? 'text-rose-700' : 'text-slate-800'}`}>
                {groupCount.DOUBLE_ASN_CLAIM} Orang
              </span>
              <span className="text-[8px] text-rose-700 font-extrabold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-250/50 shrink-0">Double ASN</span>
            </div>
            <p className="text-[9px] text-slate-400 leading-normal">Pasangan sesama ASN dilarang saling klaim tunjangan</p>
          </button>

          {/* 2. OUTDATED_KP4 */}
          <button
            type="button"
            onClick={() => setSelectedWarningCode(selectedWarningCode === 'OUTDATED_KP4' ? null : 'OUTDATED_KP4')}
            className={`p-3.5 rounded-xl space-y-1.5 transition duration-150 cursor-pointer text-left w-full border ${
              selectedWarningCode === 'OUTDATED_KP4'
                ? 'bg-rose-50 border-rose-400 shadow-sm ring-2 ring-rose-400/25 text-slate-900'
                : 'bg-slate-50/80 hover:bg-slate-100/90 border-slate-200 text-slate-700'
            }`}
          >
            <span className="text-[9px] font-extrabold text-slate-500 uppercase block tracking-wider">Kedaluwarsa KP4</span>
            <div className="flex justify-between items-baseline gap-1">
              <span className={`text-base font-mono font-extrabold ${selectedWarningCode === 'OUTDATED_KP4' ? 'text-rose-700' : 'text-slate-800'}`}>
                {groupCount.OUTDATED_KP4} Berkas
              </span>
              <span className="text-[8px] text-amber-700 font-extrabold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-250/50 shrink-0">Lama</span>
            </div>
            <p className="text-[9px] text-slate-400 leading-normal">Wajib update berkas tahun berjalan (Tahun 2026)</p>
          </button>

          {/* 3. CHILD_OVERAGE_25 */}
          <button
            type="button"
            onClick={() => setSelectedWarningCode(selectedWarningCode === 'CHILD_OVERAGE_25' ? null : 'CHILD_OVERAGE_25')}
            className={`p-3.5 rounded-xl space-y-1.5 transition duration-150 cursor-pointer text-left w-full border ${
              selectedWarningCode === 'CHILD_OVERAGE_25'
                ? 'bg-rose-50 border-rose-400 shadow-sm ring-2 ring-rose-400/25 text-slate-900'
                : 'bg-slate-50/80 hover:bg-slate-100/90 border-slate-200 text-slate-700'
            }`}
          >
            <span className="text-[9px] font-extrabold text-slate-500 uppercase block tracking-wider">Melebihi Batas Usia</span>
            <div className="flex justify-between items-baseline gap-1">
              <span className={`text-base font-mono font-extrabold ${selectedWarningCode === 'CHILD_OVERAGE_25' ? 'text-rose-700' : 'text-slate-800'}`}>
                {groupCount.CHILD_OVERAGE_25} Anak
              </span>
              <span className="text-[8px] text-red-700 font-extrabold bg-red-50 px-1.5 py-0.5 rounded border border-red-250/50 shrink-0">&gt;25 Th</span>
            </div>
            <p className="text-[9px] text-slate-400 leading-normal">Anak di atas 25 tahun gugur hak secara undang-undang</p>
          </button>

          {/* 4. CHILD_MISSING_SKKS */}
          <button
            type="button"
            onClick={() => setSelectedWarningCode(selectedWarningCode === 'CHILD_MISSING_SKKS' ? null : 'CHILD_MISSING_SKKS')}
            className={`p-3.5 rounded-xl space-y-1.5 transition duration-150 cursor-pointer text-left w-full border ${
              selectedWarningCode === 'CHILD_MISSING_SKKS'
                ? 'bg-rose-50 border-rose-400 shadow-sm ring-2 ring-rose-400/25 text-slate-900'
                : 'bg-slate-50/80 hover:bg-slate-100/90 border-slate-200 text-slate-700'
            }`}
          >
            <span className="text-[9px] font-extrabold text-slate-500 uppercase block tracking-wider">Anak Absen SKKS</span>
            <div className="flex justify-between items-baseline gap-1">
              <span className={`text-base font-mono font-extrabold ${selectedWarningCode === 'CHILD_MISSING_SKKS' ? 'text-rose-700' : 'text-slate-800'}`}>
                {groupCount.CHILD_MISSING_SKKS} Anak
              </span>
              <span className="text-[8px] text-yellow-700 font-extrabold bg-yellow-50 px-1.5 py-0.5 rounded border border-yellow-250/50 shrink-0">No SKKS</span>
            </div>
            <p className="text-[9px] text-slate-400 leading-normal">Anak kuliah (21-25 Th) wajib melampirkan SKKS aktif</p>
          </button>

          {/* 5. EXCESSIVE_KIDS_LIMIT */}
          <button
            type="button"
            onClick={() => setSelectedWarningCode(selectedWarningCode === 'EXCESSIVE_KIDS_LIMIT' ? null : 'EXCESSIVE_KIDS_LIMIT')}
            className={`p-3.5 rounded-xl space-y-1.5 transition duration-150 cursor-pointer text-left w-full border ${
              selectedWarningCode === 'EXCESSIVE_KIDS_LIMIT'
                ? 'bg-rose-50 border-rose-400 shadow-sm ring-2 ring-rose-400/25 text-slate-900'
                : 'bg-slate-50/80 hover:bg-slate-100/90 border-slate-200 text-slate-700'
            }`}
          >
            <span className="text-[9px] font-extrabold text-slate-500 uppercase block tracking-wider">Melebihi 2 Anak</span>
            <div className="flex justify-between items-baseline gap-1">
              <span className={`text-base font-mono font-extrabold ${selectedWarningCode === 'EXCESSIVE_KIDS_LIMIT' ? 'text-rose-700' : 'text-slate-800'}`}>
                {groupCount.EXCESSIVE_KIDS_LIMIT} Orang
              </span>
              <span className="text-[8px] text-indigo-700 font-extrabold bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-250/50 shrink-0">Max 2</span>
            </div>
            <p className="text-[9px] text-slate-400 leading-normal">Regulasi PP 51/1992 melarang klaim di atas 2 anak</p>
          </button>
        </div>
      </div>

      {/* Main Filter & Table area */}
      <div className="bg-white border border-slate-200 shadow-md rounded-2xl p-6 space-y-4">
        
        {/* Navigation & Search toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                placeholder="Cari Nama / NIP / NIK..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 p-2 pl-8 border border-slate-300 bg-white text-xs text-black rounded-xl focus:ring-1 focus:ring-teal-500 outline-none transition font-medium shadow-2xs"
              />
              <Search size={13} className="absolute left-2.5 top-3.5 text-slate-400" />
            </div>

            {/* Unit Tenant Filter (only for Dinkes) */}
            {currentRole === 'admin_dinkes' && (
              <div className="flex items-center space-x-2">
                <Building2 size={13} className="text-slate-500" />
                <select
                  value={unitFilter}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUnitFilter(val === 'ALL' ? 'ALL' : parseInt(val));
                  }}
                  className="p-2 border border-slate-300 bg-white text-xs text-black rounded-xl focus:ring-1 focus:ring-teal-500 outline-none transition font-bold shadow-2xs cursor-pointer"
                >
                  <option value={100} className="text-black bg-white font-bold">UPT Puskesmas Sedau</option>
                  <option value="ALL" className="text-black bg-white font-bold">Semua Unit Kerja Lombok Barat</option>
                  {puskesmasList.filter(p => p.id !== 100).map(p => (
                    <option key={p.id} value={p.id} className="text-black bg-white">{p.nama_puskesmas || p.nama || `Puskesmas ${p.id}`}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Audit Status Filter */}
            <select
              value={statusWarnFilter}
              onChange={(e) => setStatusWarnFilter(e.target.value as any)}
              className="p-2 border border-slate-300 bg-white text-xs text-black rounded-xl focus:ring-1 focus:ring-teal-500 outline-none transition font-semibold cursor-pointer"
            >
              <option value="ALL">Semua Hasil Audit</option>
              <option value="WARNING_ONLY">⚠️ Butuh Perhatian (Telah Terdeteksi Issue BPK)</option>
              <option value="CLEAN_ONLY">✓ Bebas Mayor &amp; Minor (Layak BPK)</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 font-semibold">
            Menampilkan <strong className="text-slate-800 font-mono font-extrabold">{finalFilteredList.length}</strong> Pegawai ASN
          </div>
        </div>

        {/* Selected warning badge indicator */}
        {selectedWarningCode && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center justify-between animate-in slide-in-from-top-1">
            <div className="flex items-center space-x-2 text-rose-800 text-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
              <span>
                Menyaring data dengan alarm: {' '}
                <strong className="uppercase underline">
                  {selectedWarningCode === 'DOUBLE_ASN_CLAIM' && 'Ganda Suami/Istri (Double ASN Claim)'}
                  {selectedWarningCode === 'OUTDATED_KP4' && 'Kedaluwarsa KP4 (> 1 Tahun)'}
                  {selectedWarningCode === 'CHILD_OVERAGE_25' && 'Anak Melebihi Batas Usia (> 25 Tahun)'}
                  {selectedWarningCode === 'CHILD_MISSING_SKKS' && 'Anak Kerja / Kuliah Absen SKKS'}
                  {selectedWarningCode === 'EXCESSIVE_KIDS_LIMIT' && 'Klaim Anak Melebihi Batas PP (Maks 2)'}
                </strong>
              </span>
            </div>
            <button
              onClick={() => setSelectedWarningCode(null)}
              className="text-[10px] font-bold bg-white text-rose-700 border border-rose-300 hover:bg-rose-100 rounded-lg px-2.5 py-1 cursor-pointer transition shadow-3xs"
            >
              Hapus saringan alarm
            </button>
          </div>
        )}

        {/* Table Employee KP4 list */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-white text-slate-800 font-extrabold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="p-3.5 bg-white text-slate-800 font-bold">Pegawai / Identitas</th>
                <th className="p-3.5 bg-white text-slate-800 font-bold">Puskesmas Unit</th>
                <th className="p-3.5 bg-white text-slate-800 font-bold">Status Klaim KP4</th>
                <th className="p-3.5 bg-white text-slate-800 font-bold">Estimasi Tunjangan</th>
                <th className="p-3.5 bg-white text-slate-800 font-bold">Hasil Audit Anti-BPK</th>
                <th className="p-3.5 bg-white text-slate-800 font-bold text-center">Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
              {finalFilteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                    Tidak ditemukan data pegawai ASN yang cocok dengan filter penelusuran.
                  </td>
                </tr>
              ) : (
                finalFilteredList.map((item) => {
                  const { asn, isClean, issues, spouseClaimed, childrenClaimedCount, estimatedAllowance, totalPotentialFine } = item;
                  return (
                    <tr key={asn.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3">
                        <p className="font-bold text-slate-800 text-xs">{asn.nama_lengkap}{asn.gelar_belakang ? `, ${asn.gelar_belakang}` : ''}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">NIP. {asn.nip}</p>
                        <p className="text-[10px] text-slate-400 font-mono">NIK. {asn.nik || 'Belum Diisi'}</p>
                      </td>
                      <td className="p-3 font-semibold text-slate-600">
                        {getPuskesmasName(asn.id_puskesmas)}
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold block w-fit border ${
                            asn.kp4_status_pernikahan === 'Kawin' 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                            {asn.kp4_status_pernikahan || 'Belum Kawin'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium block">
                            Tunjangan: {spouseClaimed ? 'Suami/Istri (✓)' : 'Suami/Istri (✗)'} &amp; {childrenClaimedCount} Anak
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            KP4 Validasi: <span className="font-mono text-slate-700 font-semibold">{asn.kp4_tahun_validasi || 'Belum'}</span>
                          </span>
                        </div>
                      </td>
                      <td className="p-3">
                        <p className="font-mono font-bold text-teal-700">Rp {estimatedAllowance.toLocaleString('id-ID')}</p>
                        <p className="text-[9px] text-slate-400">Estimasi Tunjangan/bln</p>
                      </td>
                      <td className="p-3">
                        {isClean ? (
                          <div className="flex items-center space-x-1.5 text-emerald-800 bg-emerald-50 border border-emerald-250 px-2.5 py-1.5 rounded-lg text-[10.5px] font-bold w-fit shadow-3xs">
                            <CheckCircle2 size={13} className="text-emerald-600" />
                            <span>100% Bebas Temuan (Bersih)</span>
                          </div>
                        ) : (
                          <div className="space-y-1.5 py-1">
                            <div className="flex items-center space-x-1.5 text-rose-800 bg-rose-50 border border-rose-250 p-2 rounded-lg text-[10.5px] font-bold w-fit shadow-3xs">
                              <AlertTriangle size={13} className="text-rose-600 flex-shrink-0" />
                              <span>{issues.length} Risiko Temuan BPK</span>
                            </div>
                            
                            <ul className="list-disc pl-4 text-[10px] text-slate-700 space-y-1 max-w-sm">
                              {issues.map((i, idx) => (
                                <li key={idx} className="leading-tight">
                                  {i.type === 'ERROR' ? (
                                    <span className="text-rose-700 font-bold bg-rose-50 px-1 py-0.2 rounded border border-rose-100">
                                      {i.message}
                                    </span>
                                  ) : (
                                    <span className="text-amber-800 font-semibold bg-amber-50 px-1 py-0.2 rounded border border-amber-100">
                                      {i.message}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>

                            {totalPotentialFine > 0 && (
                              <p className="text-[10px] text-red-700 font-bold bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-md block w-fit shadow-2xs">
                                Potensi TGR: Rp {totalPotentialFine.toLocaleString('id-ID')}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => sendKP4WhatsAppNotification(asn, isClean, issues)}
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition flex items-center space-x-1 mx-auto cursor-pointer shadow-xs border border-emerald-700/20 w-full max-w-[130px] justify-center"
                          >
                            <MessageSquare size={12} />
                            <span>Kirim WA</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onEditEmployee(asn)}
                            className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[10px] font-bold transition flex items-center space-x-1 mx-auto cursor-pointer shadow-xs border border-teal-700/20 w-full max-w-[130px] justify-center"
                          >
                            <Sliders size={12} />
                            <span>Sesuaikan data</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
