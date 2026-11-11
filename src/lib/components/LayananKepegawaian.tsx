/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Upload, 
  Check, 
  X, 
  AlertTriangle,
  FileCheck,
  RotateCw,
  Download,
  Plus,
  Trash2,
  Trash,
  Eye,
  MessageSquare,
  Settings,
  Copy
} from 'lucide-react';
import { 
  ASNProfile, 
  UsulanLayanan, 
  MasterFitur, 
  MasterDokumen, 
  Puskesmas, 
  UsulanDokumenFile,
  RiwayatAngkaKredit,
  PredikatSKP,
  StatusUsulan,
  User
} from '../../types';
import { 
  KOEFISIEN_TAHUNAN_JAFUNG, 
  MULTIPLIER_PREDIKAT_SKP, 
  calculateYearlyCredit, 
  compileTotalCredit, 
  runMockOcrValidation,
  formatDate,
  sendWhatsAppMessage
} from '../../utils';

const dataURLtoBlob = (dataurl: string): Blob => {
  const arr = dataurl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || '';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

const generateMinimalPDF = (title: string, lines: string[]): Blob => {
  const content = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Courier >> >> >> /MediaBox [0 0 595 842] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length ${50 + lines.length * 50} >>
stream
BT
/F1 10 Tf
14 TL
70 750 Td
(${title.toUpperCase()}) Tj T*
(========================================) Tj T*
${lines.map(line => `(${line.replace(/[()]/g, '')}) Tj T*`).join('\n')}
ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000056 00000 n
0000000111 00000 n
0000000240 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
${240 + 50 + lines.length * 50 + 20}
%%EOF`;

  const bytes = new Uint8Array(content.length);
  for (let i = 0; i < content.length; i++) {
    bytes[i] = content.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'application/pdf' });
};

const PDFCanvasViewer = ({ dataUrl }: { dataUrl: string }) => {
  const [pages, setPages] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    const loadPdfJsAndRender = async () => {
      try {
        if (!(window as any).pdfjsLib) {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          script.async = true;
          document.body.appendChild(script);
          
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = () => reject(new Error('Gagal memuat engine PDF.'));
          });
        }

        if (!active) return;

        const pdfjsLib = (window as any).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const base64Prefix = ';base64,';
        const idx = dataUrl.indexOf(base64Prefix);
        if (idx === -1) throw new Error('Data PDF tidak valid.');
        const base64Str = dataUrl.substring(idx + base64Prefix.length);

        const raw = window.atob(base64Str);
        const rawLength = raw.length;
        const array = new Uint8Array(new ArrayBuffer(rawLength));
        for (let i = 0; i < rawLength; i++) {
          array[i] = raw.charCodeAt(i);
        }

        const loadingTask = pdfjsLib.getDocument({ data: array });
        const pdf = await loadingTask.promise;

        if (!active) return;

        const renderedPages: string[] = [];
        const pagesToRender = Math.min(pdf.numPages, 10);

        for (let pageNum = 1; pageNum <= pagesToRender; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.5 });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) continue;

          canvas.height = viewport.height;
          canvas.width = viewport.width;

          await page.render({
            canvasContext: context,
            viewport: viewport
          }).promise;

          if (!active) return;
          renderedPages.push(canvas.toDataURL('image/png'));
        }

        if (active) {
          setPages(renderedPages);
          setLoading(false);
        }
      } catch (err: any) {
        console.error("PDF.js error:", err);
        if (active) {
          setError(err.message || 'Gagal memproses dokumen PDF.');
          setLoading(false);
        }
      }
    };

    loadPdfJsAndRender();
    return () => {
      active = false;
    };
  }, [dataUrl]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400 bg-slate-950/60 rounded-xl border border-white/5 space-y-3 min-h-[40vh]">
        <div className="w-8 h-8 rounded-full border-2 border-r-transparent border-teal-500 animate-spin" />
        <span className="text-xs font-medium animate-pulse">Melakukan render & pratinjau halaman PDF langsung...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-rose-950/30 border border-rose-500/20 rounded-xl space-y-3 text-rose-300">
        <p className="text-xs font-bold">⚠️ Pratinjau Terbatasi Sandbox</p>
        <p className="text-[11px] text-rose-400/80">Gagal merender lembar PDF asli. Silakan klik tombol 'Buka / Unduh File' untuk membukanya secara penuh.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto p-2 bg-slate-950/60 rounded-xl border border-white/5">
      {pages.map((imgSrc, index) => (
        <div key={index} className="relative bg-white p-2 rounded-lg shadow-md border border-slate-700/50 max-w-2xl mx-auto">
          <div className="absolute top-2 right-2 bg-slate-900/80 text-white text-[9px] px-2 py-0.5 rounded font-mono z-10 select-none">
            Halaman {index + 1} dari {pages.length}
          </div>
          <img 
            src={imgSrc} 
            alt={`Halaman ${index + 1}`} 
            className="w-full h-auto object-contain rounded border border-slate-200 shadow-sm" 
            referrerPolicy="no-referrer"
          />
        </div>
      ))}
    </div>
  );
};

interface LayananKepegawaianProps {
  currentRole: 'admin_dinkes' | 'admin_puskesmas';
  selectedPuskesmasId: number | null;
  puskesmasList: Puskesmas[];
  asnProfiles: ASNProfile[];
  usulanLayanan: UsulanLayanan[];
  masterFitur: MasterFitur[];
  masterDokumen: MasterDokumen[];
  syaratFiturMap: Record<string, number[]>;
  usulanDokumenFile: UsulanDokumenFile[];
  riwayatAk: RiwayatAngkaKredit[];
  usersList?: User[];
  initialSubTab?: 'berjalan' | 'baru';
  onUpdateAsnProfiles: (updated: ASNProfile[]) => void;
  onUpdateUsulanLayanan: (updated: UsulanLayanan[]) => void;
  onUpdateUsulanDokumenFile: (updated: any[]) => void;
  onUpdateRiwayatAk: (updated: RiwayatAngkaKredit[]) => void;
  initiallySelectedAsnId?: number | null;
  initiallySelectedSlug?: string | null;
}

export default function LayananKepegawaian({
  currentRole,
  selectedPuskesmasId,
  puskesmasList,
  asnProfiles,
  usulanLayanan,
  masterFitur,
  masterDokumen,
  syaratFiturMap,
  usulanDokumenFile,
  riwayatAk,
  usersList = [],
  initialSubTab = 'berjalan',
  onUpdateAsnProfiles,
  onUpdateUsulanLayanan,
  onUpdateUsulanDokumenFile,
  onUpdateRiwayatAk,
  initiallySelectedAsnId = null,
  initiallySelectedSlug = null
}: LayananKepegawaianProps) {

  // Setup tabs or workflow steps: 1) "Daftarkan Usulan Baru", 2) "Daftar Usulan Berjalan"
  const [activeSubTab, setActiveSubTab] = useState<'berjalan' | 'baru'>(initialSubTab);

  React.useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);
  
  // Pelacakan Berkas Layanan Kepegawaian filter state
  const [trackingSearch, setTrackingSearch] = useState('');
  const [trackingStatus, setTrackingStatus] = useState('Semua');
  const [trackingLayanan, setTrackingLayanan] = useState('Semua');
  const [trackingPuskesmas, setTrackingPuskesmas] = useState('Semua');
  
  // State for adding new request
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAsnId, setSelectedAsnId] = useState<number | null>(initiallySelectedAsnId);
  const [selectedFiturId, setSelectedFiturId] = useState<number>(
    initiallySelectedSlug 
      ? (masterFitur.find(f => f.slug === initiallySelectedSlug)?.id || 1)
      : 1
  );

  // Specific variables for specific feature services
  const [cutiDays, setCutiDays] = useState<number | "">(3);
  const [targetMutasiPuskesmasId, setTargetMutasiPuskesmasId] = useState<number>(2);
  const [gelarBaru, setGelarBaru] = useState<string>('S.Kep, Ners');

  // Dynamic Options for Pangkat & Jafung CRUD
  const [pangkatOptions, setPangkatOptions] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('simpeg_pangkat_options');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn("pangkat_options load error", e);
    }
    return ["III/b - Penata Muda Tk. I", "III/c - Penata", "III/d - Penata Tk. I", "IV/a - Pembina", "IV/b - Pembina Tk. I"];
  });

  const [jafungOptions, setJafungOptions] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('simpeg_jafung_options');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn("jafung_options load error", e);
    }
    return ["Ahli Pertama", "Ahli Muda", "Ahli Madya"];
  });

  const [pangkatBaru, setPangkatBaru] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('simpeg_pangkat_options');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
      }
    } catch {}
    return 'III/b - Penata Muda Tk. I';
  });

  const [jafungBaruLevel, setJafungBaruLevel] = useState<string>(() => {
    try {
      const stored = localStorage.getItem('simpeg_jafung_options');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
      }
    } catch {}
    return 'Ahli Pertama';
  });

  const [managingOptionsType, setManagingOptionsType] = useState<'pangkat' | 'jafung' | null>(null);
  const [newOptionInput, setNewOptionInput] = useState('');
  const [editingOptionIdx, setEditingOptionIdx] = useState<number | null>(null);
  const [editingOptionVal, setEditingOptionVal] = useState('');
  const [customConfigValue, setCustomConfigValue] = useState<string>('');

  // OCR simulation attachment fields
  const [ocrRawText, setOcrRawText] = useState<string>('');
  const [ocrFileName, setOcrFileName] = useState<string>('');
  const [selectedDocIdForUpload, setSelectedDocIdForUpload] = useState<number | null>(null);
  const [ocrFeedbackMessage, setOcrFeedbackMessage] = useState<{success: boolean; text: string} | null>(null);

  // Draft attachments temp state
  const [currentDraftAttachments, setCurrentDraftAttachments] = useState<Record<number, { file_name: string; text: string; ocr_status: 'SUCCESS' | 'FAILED' }>>({});

  // Riwayat SKP Calculator states for Jafung Service
  const [skpTahun, setSkpTahun] = useState<number>(2026);
  const [skpPredikat, setSkpPredikat] = useState<PredikatSKP>('Baik');

  // Dinkes verification action details
  const [reviewUsulanId, setReviewUsulanId] = useState<number | null>(null);
  const [catatanPerbaikan, setCatatanPerbaikan] = useState<string>('');
  const [skFileNameInput, setSkFileNameInput] = useState<string>('');

  // Proposal Editing States
  const [editingUsulan, setEditingUsulan] = useState<UsulanLayanan | null>(null);
  const [editingPuskesmasUsulan, setEditingPuskesmasUsulan] = useState<UsulanLayanan | null>(null);
  const [editUsulanStatus, setEditUsulanStatus] = useState<StatusUsulan>('Draft');
  const [editUsulanCatatan, setEditUsulanCatatan] = useState<string>('');
  const [editUsulanSkFile, setEditUsulanSkFile] = useState<string>('');
  const [editUsulanWaMessage, setEditUsulanWaMessage] = useState<string>('');

  React.useEffect(() => {
    if (editingUsulan) {
      const asm = asnProfiles.find(a => a.id === editingUsulan.id_asn);
      const ftr = masterFitur.find(f => f.id === editingUsulan.id_fitur);
      if (asm) {
        const msg = generateLayananWhatsAppMessage(asm, editUsulanStatus, ftr?.slug || '', {
          golonganLama: asm.golongan_ruang,
          catatan: editUsulanCatatan
        });
        setEditUsulanWaMessage(msg);
      }
    } else {
      setEditUsulanWaMessage('');
    }
  }, [editingUsulan, editUsulanStatus, editUsulanCatatan, asnProfiles, masterFitur]);

  const getActiveAdminDinkes = () => {
    const userAdmin = (usersList || []).find(u => u.role === 'admin_dinkes');
    if (userAdmin) {
      return {
        nama_lengkap: userAdmin.nama_lengkap,
        nomor_wa: userAdmin.nomor_wa || '+628123456781'
      };
    }
    const profileAdmin = asnProfiles.find(p => p.nip === "198004122005011003" || p.id === 1);
    if (profileAdmin) {
      return {
        nama_lengkap: profileAdmin.nama_lengkap,
        nomor_wa: profileAdmin.nomor_wa || '+628123456781'
      };
    }
    return {
      nama_lengkap: 'dr. Wahyu Darizki (Kadin)',
      nomor_wa: '+628123456781'
    };
  };

  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [usulanToDelete, setUsulanToDelete] = useState<{ id: number; serviceName: string } | null>(null);

  // States for the overhauled Step 2 (Ubah Detail & Status Usulan)
  const [newUsulanStatus, setNewUsulanStatus] = useState<StatusUsulan>('Usulan Dikirim ke BKD');
  const [newUsulanCatatan, setNewUsulanCatatan] = useState<string>('');

  const [editedWaMessage, setEditedWaMessage] = useState<string>('');

  // WhatsApp Preview Modal States for LayananKepegawaian
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

  const generateLayananWhatsAppMessage = (
    p: ASNProfile,
    status: string,
    serviceSlug: string,
    details: {
      golonganLama?: string;
      golonganBaru?: string;
      cutiDays?: number | string;
      jenjangSekarang?: string;
      jenjangSelanjutnya?: string;
      catatan?: string;
    }
  ) => {
    let serviceLabel = '';
    let descriptionText = '';

    const golLama = details.golonganLama || p.golongan_ruang || 'III/a';
    const golBaru = details.golonganBaru || pangkatBaru || 'IV/a';
    const jfSekarang = details.jenjangSekarang || p.jenjang_jafung || 'Ahli Pertama';
    const jfSelanjutnya = details.jenjangSelanjutnya || jafungBaruLevel || 'Ahli Muda';
    const cutiAmount = details.cutiDays || cutiDays || 3;

    if (serviceSlug === 'kenaikan-pangkat') {
      serviceLabel = 'Kenaikan Pangkat/Golongan';
      descriptionText = `Usulan kenaikan pangkat Anda dari Golongan *${golLama}* ke *${golBaru}*`;
    } else if (serviceSlug === 'cuti') {
      serviceLabel = 'Permohonan Cuti Pegawai';
      descriptionText = `Usulan cuti tahunan Anda sebanyak *${cutiAmount} Hari*. Sisa hak cuti tahunan aktif Anda saat ini adalah *${p.sisa_cuti_tahunan || 0} Hari Kerja*`;
    } else if (serviceSlug === 'usulan-jafung') {
      serviceLabel = 'Peningkatan Jabatan Fungsional (Jafung)';
      descriptionText = `Usulan peningkatan jabatan dari jenjang *${jfSekarang}* ke jenjang lanjut yaitu *${jfSelanjutnya}*`;
    } else if (serviceSlug === 'mutasi') {
      serviceLabel = 'Mutasi Unit Fasyankes';
      const targetPk = puskesmasList.find(pl => pl.id === targetMutasiPuskesmasId)?.nama_puskesmas || 'Unit Terpilih';
      descriptionText = `Usulan mutasi unit kerja Anda dari *${getPuskesmasName(p.id_puskesmas)}* menuju *${targetPk}*`;
    } else if (serviceSlug === 'pencantuman-gelar') {
      serviceLabel = 'Pencantuman Gelar Akademik';
      descriptionText = `Usulan pencantuman gelar akademik baru Anda: *${gelarBaru}*`;
    } else {
      const ftr = masterFitur.find(f => f.slug === serviceSlug);
      serviceLabel = ftr?.nama_fitur || 'Layanan Kepegawaian SAPA';
      descriptionText = `Usulan layanan *${serviceLabel}* Anda`;
    }

    let messageContent = '';

    if (status === 'Pemberitahuan') {
      const requiredDocIds = syaratFiturMap[serviceSlug] || [];
      const docsList = masterDokumen.filter(d => requiredDocIds.includes(d.id));
      const docStr = docsList.length > 0
        ? docsList.map((d, index) => `${index + 1}. *${d.nama_dokumen}*`).join('\n')
        : '- (Belum ada dokumen yang dipersyaratkan)';

      messageContent = 
`Yth. Bapak/Ibu *${p.nama_lengkap}${p.gelar_belakang ? `, ${p.gelar_belakang}` : ''}*,
 
Kami menginformasikan perkembangan usulan berkas kepegawaian Anda di *UPT Puskesmas Sedau Kabupaten Lombok Barat*:
 
*Detail Usulan*: ${descriptionText}
*Status Terbaru*: 📌 *PEMBERITAHUAN PERSYARATAN WAJIB*
 
Berdasarkan manajemen dokumen kepegawaian, usulan ini membutuhkan kelengkapan dokumen persyaratan berikut yang wajib dilengkapi segera:
${docStr}
${details.catatan ? `\n*Catatan Keterangan*: _"${details.catatan}"_` : ''}
 
Mohon segera melengkapi berkas ini melalui portal mandiri SAPA atau menyerahkan kepada pengelola kepegawaian unit kerja Anda.

_Notifikasi ini dikirim via Dashboard Terintegrasi SAPA pegawai UPT Puskesmas Sedau Kab. Lombok Barat._`;
    } else {
      const catatanText = details.catatan ? `\n*Catatan Admin*: _"${details.catatan}"_` : '';
      messageContent = 
`Yth. Bapak/Ibu *${p.nama_lengkap}${p.gelar_belakang ? `, ${p.gelar_belakang}` : ''}*,
 
Kami menginformasikan perkembangan usulan berkas kepegawaian Anda di *UPT Puskesmas Sedau Kabupaten Lombok Barat*:
 
*Detail Usulan*: ${descriptionText}
*Status Terbaru*: 📌 *${status.toUpperCase()}*
${catatanText}
 
_Notifikasi ini dikirim via Dashboard Terintegrasi SAPA pegawai UPT Puskesmas Sedau Kab. Lombok Barat._`;
    }

    return messageContent;
  };

  const sendUsulanWhatsAppNotification = (
    p: ASNProfile,
    status: string,
    serviceSlug: string,
    details: {
      golonganLama?: string;
      golonganBaru?: string;
      cutiDays?: number | string;
      jenjangSekarang?: string;
      jenjangSelanjutnya?: string;
      customConfigValue?: string;
      catatan?: string;
    }
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

    if (!rawWaNum) {
      window.alert(
        `⚠️ Nomor WhatsApp untuk pegawai "${p.nama_lengkap}" belum terekam di database pegawai.\n\nNamun Anda tetap dapat memproses transaksi ini.`
      );
      return;
    }

    const messageContent = generateLayananWhatsAppMessage(p, status, serviceSlug, details);

    setWaRecipientName(`${p.nama_lengkap}${p.gelar_belakang ? `, ${p.gelar_belakang}` : ''}`);
    setWaRecipientPhone(cleanPhone);
    setWaOriginalBaseMsg(messageContent);
    setWaDraftMessage(messageContent);
    setWaCatatanInput('');
    setWaModalOpen(true);
  };

  React.useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => {
        setSuccessToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  const handleDeleteUsulan = (id: number) => {
    const item = usulanLayanan.find(u => u.id === id);
    const ftr = item ? masterFitur.find(f => f.id === item.id_fitur) : null;
    const serviceName = ftr ? ftr.nama_fitur : `Usulan #${id}`;
    setUsulanToDelete({ id, serviceName });
  };

  const handleOpenEditUsulan = (u: UsulanLayanan) => {
    setEditingUsulan(u);
    setEditUsulanStatus(u.status);
    setEditUsulanCatatan(u.catatan_perbaikan || '');
    setEditUsulanSkFile(u.file_sk_final || '');
  };

  const syncAsnProfileOnApproval = (usulanId: number, originalProfiles: ASNProfile[]) => {
    const usulan = usulanLayanan.find(u => u.id === usulanId);
    if (!usulan) return originalProfiles;

    // Load meta payload
    let metaPayload: any = {};
    try {
      const stored = localStorage.getItem(`simpeg_meta_payload_${usulan.id}`);
      if (stored) metaPayload = JSON.parse(stored);
    } catch {
      metaPayload = {};
    }

    return originalProfiles.map(asn => {
      if (asn.id === usulan.id_asn) {
        let nAsn = { ...asn };
        const feature = masterFitur.find(f => f.id === usulan.id_fitur);

        if (feature) {
          switch (feature.slug) {
            case 'kenaikan-pangkat':
              // Upgrade pangkat. e.g. from III/a to III/b or use payload
              nAsn.golongan_ruang = metaPayload.pangkat_baru || "III/b";
              // recalculate next Pangkat TMT (+4 years from today)
              const tNow = new Date();
              nAsn.tmt_pangkat_terakhir = tNow.toISOString().split('T')[0];
              nAsn.pns_tmt_golongan = tNow.toISOString().split('T')[0];
              nAsn.pppk_tmt_golongan = tNow.toISOString().split('T')[0];
              break;

            case 'pensiun':
              nAsn.status_kepegawaian = 'Pensiun';
              break;

            case 'gaji-berkala':
              // Increment berkala date by 2 years
              const bNow = new Date();
              nAsn.tmt_berkala_terakhir = bNow.toISOString().split('T')[0];
              break;

            case 'cuti':
              // Deduct allowance
              const days = metaPayload.days !== undefined ? parseInt(metaPayload.days) : 3;
              nAsn.sisa_cuti_tahunan = Math.max(0, nAsn.sisa_cuti_tahunan - (isNaN(days) ? 3 : days));
              break;

            case 'mutasi':
              // Change Puskesmas destination
              const targetPkId = metaPayload.target_puskesmas_id || 2;
              nAsn.id_puskesmas = targetPkId;
              break;

            case 'pencantuman-gelar':
              nAsn.gelar_belakang = metaPayload.gelar_baru || "M.Si";
              break;

            case 'usulan-jafung':
              // Update level
              nAsn.jenjang_jafung = metaPayload.jenjang_baru || "Ahli Madya";
              const jNow = new Date();
              nAsn.tmt_jabatan_terakhir = jNow.toISOString().split('T')[0];
              // Reset credit points to minimum baseline or archive
              nAsn.ak_integrasi_2022 = nAsn.ak_integrasi_2022 + 50; // virtual promotion points
              break;

            default:
              break;
          }
        }
        return nAsn;
      }
      return asn;
    });
  };

  const handleSaveEditUsulan = async () => {
    if (!editingUsulan) return;
    
    // Check if moving to Selesai and if there are side effects needed
    const updatedList = usulanLayanan.map(u => {
      if (u.id === editingUsulan.id) {
        return {
          ...u,
          status: editUsulanStatus,
          catatan_perbaikan: editUsulanCatatan || null,
          file_sk_final: editUsulanSkFile || null
        };
      }
      return u;
    });

    let updatedProfiles = [...asnProfiles];
    if (editUsulanStatus === 'Selesai' && editingUsulan.status !== 'Selesai') {
      updatedProfiles = syncAsnProfileOnApproval(editingUsulan.id, asnProfiles);
      onUpdateAsnProfiles(updatedProfiles);
    }

    onUpdateUsulanLayanan(updatedList);
    
    const asm = asnProfiles.find(a => a.id === editingUsulan.id_asn);
    
    if (asm) {
      const rawWaNum = asm.nomor_wa || '';
      let cleanPhone = rawWaNum.replace(/[^0-9+]/g, '');
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '+62' + cleanPhone.substring(1);
      } else if (cleanPhone.startsWith('62') && !cleanPhone.startsWith('+62')) {
        cleanPhone = '+' + cleanPhone;
      } else if (!cleanPhone.startsWith('+62') && cleanPhone !== '') {
        cleanPhone = '+62' + cleanPhone;
      }

      if (cleanPhone) {
        try {
          const result = await sendWhatsAppMessage(cleanPhone, editUsulanWaMessage);
          if (result.method === 'baileys') {
            alert(`✓ Perubahan Usulan #${editingUsulan.id} disimpan dan notifikasi berhasil terkirim via WhatsApp Gateway (${result.method}) secara langsung.`);
          } else {
            alert(`✓ Perubahan Usulan #${editingUsulan.id} disimpan.\n⚠️ Notifikasi langsung tidak tersedia, draf dialihkan ke WhatsApp Web.`);
          }
        } catch (err: any) {
          alert(`✓ Perubahan Usulan #${editingUsulan.id} disimpan.\n❌ Gagal mengirim notifikasi: ${err.message || err}`);
        }
      } else {
        alert(`✓ Perubahan Usulan #${editingUsulan.id} berhasil disimpan.\n⚠️ Catatan: Nomor WhatsApp pegawai belum terdaftar.`);
      }
    } else {
      alert(`✓ Perubahan Usulan #${editingUsulan.id} berhasil disimpan.`);
    }

    setEditingUsulan(null);
  };

  // File Preview & Download handlers for Usulan Documents
  const [activeUsulanFilePreview, setActiveUsulanFilePreview] = useState<{ file: UsulanDokumenFile; usulan: UsulanLayanan } | null>(null);
  const [previewStatusUsulan, setPreviewStatusUsulan] = useState<UsulanLayanan | null>(null);
  const [usulanPreviewUrl, setUsulanPreviewUrl] = React.useState<string | null>(null);
  const [usulanPreviewType, setUsulanPreviewType] = React.useState<'PDF' | 'IMAGE' | 'FALLBACK'>('FALLBACK');
  const [usulanImageError, setUsulanImageError] = React.useState<boolean>(false);
  const usulanUrlRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    setUsulanImageError(false);
    if (!activeUsulanFilePreview) {
      if (usulanUrlRef.current) {
        URL.revokeObjectURL(usulanUrlRef.current);
        usulanUrlRef.current = null;
      }
      setUsulanPreviewUrl(null);
      return;
    }

    const { file, usulan } = activeUsulanFilePreview;
    const asm = asnProfiles.find(a => a.id === usulan.id_asn);
    const ftr = masterFitur.find(f => f.id === usulan.id_fitur);
    const docType = masterDokumen.find(d => d.id === file.id_dokumen)?.nama_dokumen || "Dokumen Pendukung";
    const cleanUnit = asm?.id_puskesmas === 100 ? "UPT Puskesmas Sedau" : getPuskesmasName(asm?.id_puskesmas || 1);

    let localUrl = '';
    let type: 'PDF' | 'IMAGE' | 'FALLBACK' = 'PDF';

    // Check if we have high-fidelity real uploaded dataUrl
    const dataUrlToUse = file.data_url || (file.file_path && file.file_path.startsWith('data:') ? file.file_path : '');

    if (dataUrlToUse) {
      try {
        const blob = dataURLtoBlob(dataUrlToUse);
        localUrl = URL.createObjectURL(blob);
        if (dataUrlToUse.startsWith('data:image/') || file.file_name?.match(/\.(jpe?g|png|gif)$/i)) {
          type = 'IMAGE';
        } else {
          type = 'PDF';
        }
      } catch (err) {
        console.error("Gagal convert dataURL ke blob:", err);
        const pdfLines = [
          `ID DOKUMEN USULAN: LOBAR-USL-DOC-${file.id}`,
          `NOMOR USULAN: #USL-${usulan.id}`,
          `LAYANAN: ${ftr?.nama_fitur || 'Layanan SIMPEG'}`,
          `PEGAWAI: ${asm?.nama_lengkap || 'Tidak diketahui'}`,
          `NIP: ${asm?.nip || '-'}`,
          `UNIT KERJA: ${cleanUnit}`,
          `SYARAT DOKUMEN: ${docType}`,
          `FILENAME ASLI: ${file.file_name}`,
          `TANGGAL USULAN: ${new Date(usulan.tanggal_pengusulan).toLocaleDateString('id-ID')}`
        ];
        const blob = generateMinimalPDF(docType, pdfLines);
        localUrl = URL.createObjectURL(blob);
        type = 'PDF';
      }
    } else {
      const pdfLines = [
        `ID DOKUMEN USULAN: LOBAR-USL-DOC-${file.id}`,
        `NOMOR USULAN: #USL-${usulan.id}`,
        `LAYANAN: ${ftr?.nama_fitur || 'Layanan SIMPEG'}`,
        `PEGAWAI: ${asm?.nama_lengkap || 'Tidak diketahui'}`,
        `NIP: ${asm?.nip || '-'}`,
        `UNIT KERJA: ${cleanUnit}`,
        `SYARAT DOKUMEN: ${docType}`,
        `FILENAME ASLI: ${file.file_name}`,
        `TANGGAL USULAN: ${new Date(usulan.tanggal_pengusulan).toLocaleDateString('id-ID')}`
      ];
      const blob = generateMinimalPDF(docType, pdfLines);
      localUrl = URL.createObjectURL(blob);
      type = 'PDF';
    }

    if (usulanUrlRef.current && usulanUrlRef.current !== localUrl) {
      URL.revokeObjectURL(usulanUrlRef.current);
    }

    usulanUrlRef.current = localUrl;
    setUsulanPreviewUrl(localUrl);
    setUsulanPreviewType(type);
  }, [activeUsulanFilePreview?.file?.id, activeUsulanFilePreview?.file?.data_url]);

  const handleOpenImageInNewTab = (url: string | null) => {
    if (!url) return;
    try {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Pratinjau Berkas Gambar - SIMPEG</title>
            <style>
              body {
                margin: 0;
                padding: 0;
                background-color: #0f172a;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              }
              .container {
                text-align: center;
                max-width: 100%;
                padding: 16px;
                box-sizing: border-box;
              }
              img {
                max-width: 100%;
                max-height: 85vh;
                object-fit: contain;
                border-radius: 12px;
                box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.5);
                border: 1px solid rgba(255, 255, 255, 0.1);
              }
              .toolbar {
                margin-top: 20px;
                color: #94a3b8;
                font-size: 13px;
                background-color: rgba(30, 41, 59, 0.8);
                padding: 8px 16px;
                border-radius: 9999px;
                border: 1px solid rgba(255, 255, 255, 0.05);
                display: inline-block;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <img src="${url}" alt="Pratinjau Berkas Gambar" />
              <p></p>
              <div class="toolbar">
                Menampilkan berkas gambar menggunakan penampil gambar bawaan browser.
              </div>
            </div>
          </body>
        </html>
      `;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const blobUrl = URL.createObjectURL(blob);
      const newWin = window.open(blobUrl, '_blank');
      if (!newWin) {
        window.open(url, '_blank');
      }
    } catch (e) {
      window.open(url, '_blank');
    }
  };

  const handlePreviewUsulanFile = (file: UsulanDokumenFile, usulan: UsulanLayanan) => {
    setActiveUsulanFilePreview({ file, usulan });
  };

  const handleDownloadUsulanFile = (file: UsulanDokumenFile, usulan: UsulanLayanan) => {
    const asm = asnProfiles.find(a => a.id === usulan.id_asn);
    const ftr = masterFitur.find(f => f.id === usulan.id_fitur);
    const docType = masterDokumen.find(d => d.id === file.id_dokumen)?.nama_dokumen || "Dokumen Pendukung";
    const empName = asm ? asm.nama_lengkap.replace(/\s+/g, '_') : 'Pegawai';
    const cleanDocType = docType.replace(/\s+/g, '_');
    
    // Preserve the original file's extension to ensure it downloads as the original photo/document format
    const originalExt = file.file_name ? file.file_name.substring(file.file_name.lastIndexOf('.')) : '.pdf';
    const outputFilename = `${empName}-${asm?.nip || 'STAF'}-${cleanDocType}${originalExt}`;

    const cleanUnit = asm?.id_puskesmas === 100 ? "UPT Puskesmas Sedau" : getPuskesmasName(asm?.id_puskesmas || 1);

    let blob: Blob;
    let isOriginal = false;

    // Check if we have high-fidelity real uploaded dataUrl
    const dataUrlToUse = file.data_url || (file.file_path && file.file_path.startsWith('data:') ? file.file_path : '');

    if (dataUrlToUse) {
      try {
        blob = dataURLtoBlob(dataUrlToUse);
        isOriginal = true;
      } catch (err) {
        console.error("Gagal melakukan pencanderaan berkas usulan base64:", err);
        // Fallback to text lines in PDF
        const pdfLines = [
          `ID DOKUMEN USULAN: LOBAR-USL-DOC-${file.id}`,
          `NOMOR USULAN: #USL-${usulan.id}`,
          `LAYANAN: ${ftr?.nama_fitur || 'Layanan SIMPEG'}`,
          `PEGAWAI: ${asm?.nama_lengkap || 'Tidak diketahui'}`,
          `NIP: ${asm?.nip || '-'}`,
          `UNIT KERJA: ${cleanUnit}`,
          `SYARAT DOKUMEN: ${docType}`,
          `FILENAME ASLI: ${file.file_name}`,
          `TANGGAL USULAN: ${new Date(usulan.tanggal_pengusulan).toLocaleDateString('id-ID')}`
        ];
        blob = generateMinimalPDF(docType, pdfLines);
      }
    } else {
      // Fallback to standard clean legal PDF metadata format for mock/pre-seeded files
      const pdfLines = [
        `ID DOKUMEN USULAN: LOBAR-USL-DOC-${file.id}`,
        `NOMOR USULAN: #USL-${usulan.id}`,
        `LAYANAN: ${ftr?.nama_fitur || 'Layanan SIMPEG'}`,
        `PEGAWAI: ${asm?.nama_lengkap || 'Tidak diketahui'}`,
        `NIP: ${asm?.nip || '-'}`,
        `UNIT KERJA: ${cleanUnit}`,
        `SYARAT DOKUMEN: ${docType}`,
        `FILENAME ASLI: ${file.file_name}`,
        `TANGGAL USULAN: ${new Date(usulan.tanggal_pengusulan).toLocaleDateString('id-ID')}`
      ];
      blob = generateMinimalPDF(docType, pdfLines);
    }

    const downloadURL = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = downloadURL;
    link.download = outputFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(downloadURL);

    if (isOriginal) {
      alert(`✓ Berhasil Mengunduh Berkas Asli!\nNama File: ${outputFilename}`);
    } else {
      alert(`✓ Berhasil Mengunduh Berkas Usulan!\nFile: ${outputFilename}\n(Format berkas representasi PDF resmi SIMPEG)`);
    }
  };

  // Filtering list options
  const features1to9 = masterFitur.filter(f => f.is_active && f.slug !== 'keadaan-sdmk'); // active services except Keadaan SDMK

  const getPuskesmasName = (id: number) => {
    return puskesmasList.find(p => p.id === id)?.nama_puskesmas || `Puskesmas #${id}`;
  };

  // Visibility filters
  const visibleAsn = currentRole === 'admin_dinkes' 
    ? asnProfiles 
    : asnProfiles.filter(p => p.id_puskesmas === selectedPuskesmasId);

  const filteredAsnList = visibleAsn.filter(p => {
    if (p.status_kepegawaian !== 'Aktif') return false;
    const term = searchQuery.toLowerCase();
    return p.nama_lengkap.toLowerCase().includes(term) || p.nip.includes(term);
  });

  const selectedAsn = asnProfiles.find(p => p.id === selectedAsnId);
  const selectedFitur = masterFitur.find(f => f.id === selectedFiturId);

  // Automatically suggest pangkat/golongan or jafung level one level higher
  React.useEffect(() => {
    if (selectedAsn) {
      if (selectedFitur?.slug === 'kenaikan-pangkat') {
        const currentGolongan = selectedAsn.golongan_ruang || '';
        const LIST_GOLONGAN_PNS = [
          "I/a", "I/b", "I/c", "I/d",
          "II/a", "II/b", "II/c", "II/d",
          "III/a", "III/b", "III/c", "III/d",
          "IV/a", "IV/b", "IV/c", "IV/d", "IV/e"
        ];
        const idx = LIST_GOLONGAN_PNS.findIndex(g => g.toLowerCase() === currentGolongan.trim().toLowerCase());
        if (idx !== -1 && idx < LIST_GOLONGAN_PNS.length - 1) {
          const nextGolongan = LIST_GOLONGAN_PNS[idx + 1];
          const matchedOpt = pangkatOptions.find(opt => opt.toLowerCase().includes(nextGolongan.toLowerCase()));
          if (matchedOpt) {
            setPangkatBaru(matchedOpt);
          }
        }
      } else if (selectedFitur?.slug === 'usulan-jafung') {
        const currentJenjang = selectedAsn.jenjang_jafung || '';
        const jenjangOrder = ["Terampil", "Mahir", "Penyelia", "Ahli Pertama", "Ahli Muda", "Ahli Madya", "Ahli Utama"];
        const currentIdx = jenjangOrder.findIndex(j => j.toLowerCase() === currentJenjang.trim().toLowerCase());
        if (currentIdx !== -1 && currentIdx < jenjangOrder.length - 1) {
          const nextJenjang = jenjangOrder[currentIdx + 1];
          const matchedOpt = jafungOptions.find(opt => opt.toLowerCase() === nextJenjang.toLowerCase());
          if (matchedOpt) {
            setJafungBaruLevel(matchedOpt);
          } else {
            const partialMatched = jafungOptions.find(opt => opt.toLowerCase().includes(nextJenjang.toLowerCase()));
            if (partialMatched) {
              setJafungBaruLevel(partialMatched);
            }
          }
        }
      }
    }
  }, [selectedAsnId, selectedFiturId, pangkatOptions, jafungOptions, selectedAsn, selectedFitur]);

  React.useEffect(() => {
    if (selectedAsn && selectedFitur) {
      // Find the unit kerja (puskesmas) name of this pegawai
      const pusk = puskesmasList.find(pk => pk.id === selectedAsn.id_puskesmas);
      const unitKerjaName = pusk ? pusk.nama_puskesmas : 'Puskesmas Pengusul';
      
      let serviceLabel = '';
      let descriptionText = '';

      const golLama = selectedAsn.golongan_ruang || 'III/a';
      const golBaru = pangkatBaru || 'IV/a';
      const jfSekarang = selectedAsn.jenjang_jafung || 'Ahli Pertama';
      const jfSelanjutnya = jafungBaruLevel || 'Ahli Muda';
      const cutiAmount = typeof cutiDays === 'number' ? cutiDays : 1;

      if (selectedFitur.slug === 'kenaikan-pangkat') {
        serviceLabel = 'Kenaikan Pangkat/Golongan';
        descriptionText = `Kenaikan pangkat dari Golongan ${golLama} ke ${golBaru}`;
      } else if (selectedFitur.slug === 'cuti') {
        serviceLabel = 'Permohonan Cuti Pegawai';
        descriptionText = `Cuti tahunan sebanyak ${cutiAmount} Hari`;
      } else if (selectedFitur.slug === 'usulan-jafung') {
        serviceLabel = 'Peningkatan Jabatan Fungsional (Jafung)';
        descriptionText = `Peningkatan jabatan dari jenjang ${jfSekarang} ke jenjang ${jfSelanjutnya}`;
      } else if (selectedFitur.slug === 'mutasi') {
        serviceLabel = 'Mutasi Unit Fasyankes';
        const targetPk = puskesmasList.find(pl => pl.id === targetMutasiPuskesmasId)?.nama_puskesmas || 'Unit Terpilih';
        descriptionText = `Mutasi unit dari ${getPuskesmasName(selectedAsn.id_puskesmas)} ke ${targetPk}`;
      } else if (selectedFitur.slug === 'pencantuman-gelar') {
        serviceLabel = 'Pencantuman Gelar Akademik';
        descriptionText = `Pencantuman gelar akademik baru: ${gelarBaru}`;
      } else {
        serviceLabel = selectedFitur.nama_fitur;
        descriptionText = `Layanan ${serviceLabel}`;
      }

      let statusLine = '';
      if (currentRole === 'admin_dinkes') {
        if (newUsulanStatus === 'Pemberitahuan') {
          const reqDocIds = syaratFiturMap[selectedFitur.slug] || [];
          const reqDocs = reqDocIds.map((id, index) => {
            const doc = masterDokumen.find(d => d.id === id);
            return `  ${index + 1}. *${doc?.nama_dokumen || `Dokumen ID ${id}`}*`;
          });
          const docsString = reqDocs.length > 0 
            ? reqDocs.join('\n') 
            : '  - (Belum ada dokumen yang dipersyaratkan)';
          
          statusLine = `\n- Status Dokumen: 📌 *PEMBERITAHUAN PERSYARATAN WAJIB*\n\n*DAFTAR DOKUMEN WAJIB YANG HARUS KELENGKAPAN (${selectedFitur.nama_fitur})*:\n${docsString}\n\nMohon siapkan dan unggah berkas-berkas wajib di atas melalui aplikasi SAPA pegawai UPT Puskesmas Sedau agar usulan dapat segera diproses lebih lanjut.`;
        } else {
          statusLine = `\n- Status Dokumen: 📌 *${newUsulanStatus.toUpperCase()}*`;
        }
      }
      const notesText = newUsulanCatatan ? `\n- Catatan Tambahan: "${newUsulanCatatan}"` : '';

      const isDinkes = currentRole === 'admin_dinkes';
      const greetingHeader = isDinkes
        ? `*Yth. Bapak/Ibu ${selectedAsn.nama_lengkap}*,`
        : `*Yth. Admin UPT Puskesmas Sedau Kabupaten Lombok Barat*,`;
        
      const introMessage = isDinkes
        ? `Kami menginformasikan bahwa berkas usulan layanan kepegawaian Anda sedang diproses oleh Tim Kepegawaian UPT Puskesmas Sedau Kab. Lombok Barat di SAPA pegawai UPT Puskesmas Sedau:`
        : `Kami menginformasikan bahwa Unit Kerja *${unitKerjaName}* telah mengajukan usulan layanan baru di SAPA pegawai UPT Puskesmas Sedau:`;

      const concludingMessage = isDinkes
        ? `Mohon agar berkas usulan Anda dapat dipantau secara berkala melalui dashboard mandiri pegawai. Terima kasih.`
        : `Mohon agar berkas usulan tersebut segera diproses dan diverifikasi lebih lanjut. Terima kasih.`;

      const msg = 
`${greetingHeader}
 
${introMessage}
 
*IDENTITAS PEGAWAI*:
- Nama: *${selectedAsn.nama_lengkap}${selectedAsn.gelar_belakang ? `, ${selectedAsn.gelar_belakang}` : ''}*
- NIP: *${selectedAsn.nip}*
- Golongan Sekarang: *${selectedAsn.golongan_ruang || '-'}*
- Jabatan: *${selectedAsn.jenjang_jafung || 'Struktural / Staf'}*
 
*DETAIL USULAN*:
- Layanan: *${serviceLabel}*
- Deskripsi: *${descriptionText}*${statusLine}${notesText}
 
${concludingMessage}
 
_Notifikasi ini dikirim via Pemberkasan Digital Dual-Channel SAPA pegawai UPT Puskesmas Sedau Kab. Lombok Barat._`;

      setEditedWaMessage(msg);
    }
  }, [
    selectedAsn,
    selectedFitur,
    newUsulanStatus,
    newUsulanCatatan,
    pangkatBaru,
    cutiDays,
    jafungBaruLevel,
    targetMutasiPuskesmasId,
    gelarBaru,
    puskesmasList,
    masterDokumen,
    syaratFiturMap,
    currentRole
  ]);

  // Requirements list for selected feature slug 
  const fetchRequiredDocIds = (slug?: string) => {
    if (!slug) return [];
    return syaratFiturMap[slug] || [1]; // default fallback
  };

  const requiredDocIds = selectedFitur ? fetchRequiredDocIds(selectedFitur.slug) : [];
  const requiredDocs = masterDokumen.filter(d => requiredDocIds.includes(d.id));

  // Determine if draft satisfies requirements uploader (100% checks)
  const isSubmissionCompleted = requiredDocIds.every(docId => currentDraftAttachments[docId]?.ocr_status === 'SUCCESS');

  // Trigger simulated uploader (OCR parser)
  const handleOcrFileAttachClick = (docId: number) => {
    setSelectedDocIdForUpload(docId);
    setOcrFeedbackMessage(null);
    const doc = masterDokumen.find(d => d.id === docId);
    setOcrFileName(doc ? `${doc.nama_dokumen.toLowerCase().replace(/ /g, "_")}_test.pdf` : 'file.pdf');

    // pre-fill correct mock OCR string based on keyword so user gets helpful template!
    if (selectedAsn && doc) {
      const keywordFirst = doc.kata_kunci_ocr.split(',')[0] || '';
      setOcrRawText(`KEMENTERIAN KESEHATAN REPUBLIK INDONESIA\nPUSKESMAS WILAYAH LOMBOK BARAT\n\nNAMA PENERANG: ${selectedAsn.nama_lengkap.toUpperCase()}\nNIP PEG: ${selectedAsn.nip}\nTENTANG DOKUMEN: ${keywordFirst} SELESAI.`);
    } else {
      setOcrRawText('');
    }
  };

  const processOcrScanSimulate = () => {
    if (!selectedAsn || !selectedDocIdForUpload) return;
    const doc = masterDokumen.find(d => d.id === selectedDocIdForUpload);
    if (!doc) return;

    const res = runMockOcrValidation(
      ocrFileName,
      ocrRawText,
      doc.kata_kunci_ocr,
      selectedAsn.nip,
      selectedAsn.nama_lengkap
    );

    if (res.success) {
      setOcrFeedbackMessage({ success: true, text: `✓ Validasi OCR Berhasil! Kata kunci ditemukan: ${res.keywordsFound.join(', ')}` });
      setCurrentDraftAttachments({
        ...currentDraftAttachments,
        [selectedDocIdForUpload]: {
          file_name: ocrFileName,
          text: ocrRawText,
          ocr_status: 'SUCCESS'
        }
      });
      setTimeout(() => setSelectedDocIdForUpload(null), 1200);
    } else {
      setOcrFeedbackMessage({ success: false, text: `✗ Gagal Validasi: ${res.reason}` });
    }
  };

  const handleRealFileUpload = (docId: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedExtensions.includes(fileExtension)) {
      alert("⚠️ Format berkas tidak didukung! Pastikan berkas berupa PDF, JPG, JPEG, atau PNG.");
      return;
    }

    const doc = masterDokumen.find(d => d.id === docId);
    if (!doc || !selectedAsn) return;

    const keywordFirst = doc.kata_kunci_ocr.split(',')[0] || '';
    const simulatedText = `KOP REPUBLIK INDONESIA\nPEMERINTAH PROVINSI NUSA TENGGARA BARAT\n\nNAMA LENGKAP PEGAWAI : ${selectedAsn.nama_lengkap.toUpperCase()}\nNIP : ${selectedAsn.nip}\nDOKUMEN SAH: ${doc.nama_dokumen.toUpperCase()}\nKATA KUNCI PERNYATAAN: ${keywordFirst.toUpperCase()}\nNAMA BERKAS DIGITAL: ${file.name}\nSTATUS PENGECEKAN: AUTOMATIC VERIFIED`;

    // Read real file data to display in the live preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCurrentDraftAttachments(prev => ({
        ...prev,
        [docId]: {
          file_name: file.name,
          text: simulatedText,
          ocr_status: 'SUCCESS' as const,
          data_url: dataUrl
        }
      }));
    };
    reader.readAsDataURL(file);

    // Alert removed as requested by the user - file uploads seamlessly without notification
  };

  // Submit Usulan Transaction (Client -> DB)
  const handleKirimUsulan = () => {
    if (!selectedAsn || !selectedFitur) return;

    const newUsulanId = usulanLayanan.length > 0 ? Math.max(...usulanLayanan.map(u => u.id)) + 1 : 1;
    const newUsulan: UsulanLayanan = {
      id: newUsulanId,
      id_fitur: selectedFitur.id,
      id_asn: selectedAsn.id,
      id_puskesmas_pengusul: selectedAsn.id_puskesmas,
      tanggal_pengusulan: new Date().toISOString(),
      status: newUsulanStatus,
      catatan_perbaikan: newUsulanCatatan || null,
      file_sk_final: null
    };

    // Since files are no longer required to be uploaded during usulan creation, newFiles list is empty
    const newFiles: any[] = [];

    // Perform specific inline config parameters for the sync calculations later
    // Save additional transactional parameters to local storage mock trackers for the specific usulan
    const payloadKey = `simpeg_meta_payload_${newUsulanId}`;
    let dataPayload: any = {};
    if (selectedFitur.slug === 'cuti') {
      dataPayload = { days: typeof cutiDays === 'number' ? cutiDays : 1 };
    } else if (selectedFitur.slug === 'mutasi') {
      dataPayload = { target_puskesmas_id: targetMutasiPuskesmasId };
    } else if (selectedFitur.slug === 'pencantuman-gelar') {
      dataPayload = { gelar_baru: gelarBaru };
    } else if (selectedFitur.slug === 'kenaikan-pangkat') {
      const activePangkat = pangkatOptions.includes(pangkatBaru) ? pangkatBaru : (pangkatOptions[0] || '');
      dataPayload = { pangkat_baru: activePangkat };
    } else if (selectedFitur.slug === 'usulan-jafung') {
      const activeJafung = jafungOptions.includes(jafungBaruLevel) ? jafungBaruLevel : (jafungOptions[0] || '');
      dataPayload = { jenjang_baru: activeJafung };
    } else if (selectedFitur.konfigurasi_tambahan) {
      dataPayload = { 
        custom_config_label: selectedFitur.konfigurasi_tambahan, 
        custom_config_value: customConfigValue 
      };
    }
    localStorage.setItem(payloadKey, JSON.stringify(dataPayload));

    // Save states
    onUpdateUsulanLayanan([newUsulan, ...usulanLayanan]);
    onUpdateUsulanDokumenFile([...usulanDokumenFile, ...newFiles]);

    // reset fields
    setCurrentDraftAttachments({});
    setSelectedAsnId(null);
    setSearchQuery('');
    setCustomConfigValue('');
    setNewUsulanCatatan('');
    setNewUsulanStatus('Usulan Dikirim ke BKD');
    setActiveSubTab('berjalan');
  };

  // Add Jafung Annual SKP parameters to cumulative chart log
  const handleAddSkpCalcRow = () => {
    if (!selectedAsnId) return;

    const gained = calculateYearlyCredit(
      selectedAsn?.jenjang_jafung || 'Ahli Pertama', 
      skpPredikat
    );

    const newRowId = riwayatAk.length > 0 ? Math.max(...riwayatAk.map(r => r.id)) + 1 : 1;
    const newRow: RiwayatAngkaKredit = {
      id: newRowId,
      id_asn: selectedAsnId,
      tahun_skp: skpTahun,
      predikat_skp: skpPredikat,
      ak_diperoleh: gained
    };

    const nextAkList = [...riwayatAk, newRow];
    onUpdateRiwayatAk(nextAkList);
    setSkpTahun(prev => prev + 1);
  };

  // Remove individual SKP row
  const handleRemoveSkpRow = (rowId: number) => {
    const nextArr = riwayatAk.filter(r => r.id !== rowId);
    onUpdateRiwayatAk(nextArr);
  };

  // Calculate Cumulative total score
  const selectedAsnAkHistory = riwayatAk.filter(r => r.id_asn === selectedAsnId);
  const tally = selectedAsn 
    ? compileTotalCredit(selectedAsn.ak_integrasi_2022, selectedAsn.jenjang_jafung || 'Ahli Pertama', selectedAsnAkHistory) 
    : { total: 0, detailHistorySum: 0 };


  // DINKES ADMIN FLOWS
  const handleOpenReview = (usulan: UsulanLayanan) => {
    setReviewUsulanId(usulan.id);
    setCatatanPerbaikan(usulan.catatan_perbaikan || '');
    setSkFileNameInput(`SK_${usulan.id_fitur === 1 ? 'Pangkat' : usulan.id_fitur === 2 ? 'Pensiun' : 'GajiBerkala'}_${usulan.id}.pdf`);
  };

  const handleProcessDinkesRejection = () => {
    if (!reviewUsulanId) return;
    const updated = usulanLayanan.map(u => {
      if (u.id === reviewUsulanId) {
        return {
          ...u,
          status: 'Perbaikan Berkas' as StatusUsulan,
          catatan_perbaikan: catatanPerbaikan || "Berkas wajib tidak terbaca, mohon periksa kesesuaian dokumen."
        };
      }
      return u;
    });
    onUpdateUsulanLayanan(updated);
    setReviewUsulanId(null);
  };

  // Approval with Automatic Background Profile Sync TMT recalcs!
  const handleProcessDinkesApprove = () => {
    if (!reviewUsulanId) return;

    const usulan = usulanLayanan.find(u => u.id === reviewUsulanId);
    if (!usulan) return;

    // Update usulan status to 'Selesai'
    const updatedUsulanList = usulanLayanan.map(u => {
      if (u.id === reviewUsulanId) {
        return {
          ...u,
          status: 'Selesai' as StatusUsulan,
          file_sk_final: skFileNameInput || "SK_PuskesmasSedau_Disahkan.pdf",
          catatan_perbaikan: null
        };
      }
      return u;
    });

    // Run Profile updates instantly matching the background logic described in blueprint!
    const updatedProfiles = syncAsnProfileOnApproval(reviewUsulanId, asnProfiles);

    // Save states
    onUpdateAsnProfiles(updatedProfiles);
    onUpdateUsulanLayanan(updatedUsulanList);
    setReviewUsulanId(null);
  };

  return (
    <div className="space-y-6">
      
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

      <div className="bg-white border border-slate-100 p-6 rounded-2xl shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 className="text-xl font-display font-bold text-slate-800">Urus Layanan Kepegawaian</h2>
            <p className="text-xs text-slate-400">Pemberkasan digital dual-channel UPT Puskesmas Sedau Lombok Barat</p>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-xl w-fit self-start md:self-center">
            <button
              onClick={() => {
                setActiveSubTab('baru');
                setSelectedAsnId(null);
                setCurrentDraftAttachments({});
              }}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${activeSubTab === 'baru' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Buat Usulan Baru
            </button>
            <button
              onClick={() => setActiveSubTab('berjalan')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${activeSubTab === 'berjalan' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Lacak Dokumen Aktif ({usulanLayanan.length})
            </button>
          </div>
        </div>

        {/* ======================= TAB: NEW REQUEST FORM (Puskesmas Only) ======================= */}
        {activeSubTab === 'baru' && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Find Employee & Service Selection (Left, 5 columns) */}
            <div className="lg:col-span-5 space-y-4">
              <h3 className="font-semibold text-slate-700 text-sm flex items-center space-x-1">
                <span className="h-4 w-1 bg-teal-600 rounded-full mr-1 inline-block"></span>
                1. Cari Pegawai & Layanan
              </h3>

              <div className="space-y-3">
                <label className="text-xs font-medium text-slate-500 block">Pilih Pegawai Aktif</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Masukkan NIP atau nama..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-teal-500 block"
                  />
                </div>

                {/* ASN search dropdown simulation box */}
                <div className="max-h-40 overflow-y-auto border border-slate-100 rounded-xl p-1 bg-slate-50 space-y-1">
                  {filteredAsnList.map(asn => (
                    <button
                      key={asn.id}
                      onClick={() => {
                        setSelectedAsnId(asn.id);
                        setCurrentDraftAttachments({});
                      }}
                      className={`w-full text-left p-2.5 rounded-lg text-xs transition flex items-center justify-between ${selectedAsnId === asn.id ? 'bg-teal-900 text-white' : 'hover:bg-slate-100 text-slate-700'}`}
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold">{asn.nama_lengkap}</div>
                        <div className="opacity-80 font-mono text-[10px]">NIP. {asn.nip}</div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-500/20">
                        {asn.golongan_ruang}
                      </span>
                    </button>
                  ))}
                  {filteredAsnList.length === 0 && (
                    <p className="text-center text-slate-400 py-4 text-xs font-light">Tidak ada data pegawai aktif.</p>
                  )}
                </div>
              </div>

              {selectedAsn && (
                <div className="space-y-4">
                  {/* Select parameters */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500 block">Pilih Layanan Kepegawaian</label>
                    <select
                      value={selectedFiturId}
                      onChange={(e) => {
                        setSelectedFiturId(parseInt(e.target.value));
                        setCurrentDraftAttachments({});
                        setCustomConfigValue('');
                      }}
                      className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-white"
                    >
                      {features1to9.map(f => (
                        <option key={f.id} value={f.id}>{f.nama_fitur}</option>
                      ))}
                    </select>
                  </div>

                  {/* Operational Settings dynamic metadata box */}
                  <div className="bg-slate-50/50 p-4 border border-slate-150 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Konfigurasi Tambahan</h4>
                    
                    {selectedFitur?.slug === 'kenaikan-pangkat' && (
                      <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] font-medium text-slate-500">Target Golongan Ruang Baru</label>
                          <button
                            type="button"
                            onClick={() => {
                              setManagingOptionsType('pangkat');
                              setNewOptionInput('');
                              setEditingOptionIdx(null);
                            }}
                            className="text-[10px] text-teal-600 font-bold hover:text-teal-800 flex items-center space-x-1 transition cursor-pointer"
                          >
                            <span>⚙️ Kelola Opsi</span>
                          </button>
                        </div>
                        <select
                          value={pangkatOptions.includes(pangkatBaru) ? pangkatBaru : (pangkatOptions[0] || '')}
                          onChange={(e) => setPangkatBaru(e.target.value)}
                          className="w-full p-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                        >
                          {pangkatOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                          {pangkatOptions.length === 0 && (
                            <option value="">(Belum ada opsi - Klik Kelola Opsi)</option>
                          )}
                        </select>
                      </div>
                    )}

                    {selectedFitur?.slug === 'pencantuman-gelar' && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-slate-500">Tulis Gelar Akademik Baru</label>
                        <input
                          type="text"
                          value={gelarBaru}
                          onChange={(e) => setGelarBaru(e.target.value)}
                          className="w-full p-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                          placeholder="Contoh: S.KM, M.Kes"
                        />
                      </div>
                    )}

                    {selectedFitur?.slug === 'cuti' && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-slate-500">Jumlah Hari Diambil</label>
                        <input
                          type="number"
                          value={cutiDays}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '') {
                              setCutiDays('');
                            } else {
                              setCutiDays(parseInt(val) || 0);
                            }
                          }}
                          className="w-full p-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                          placeholder="Jumlah hari cuti"
                        />
                        <p className="text-[10px] text-slate-400">Cuti tahunan sisa: {selectedAsn.sisa_cuti_tahunan} hari.</p>
                      </div>
                    )}

                    {selectedFitur?.slug === 'mutasi' && (
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-slate-500">Unit Fasyankes / Puskesmas Tujuan</label>
                        <select
                          value={targetMutasiPuskesmasId}
                          onChange={(e) => setTargetMutasiPuskesmasId(parseInt(e.target.value))}
                          className="w-full p-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                        >
                          {puskesmasList.filter(p => p.id !== selectedAsn.id_puskesmas).map(p => (
                            <option key={p.id} value={p.id}>{p.nama_puskesmas}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {selectedFitur?.slug === 'usulan-jafung' && (
                      <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex justify-between items-center">
                          <label className="text-[11px] font-medium text-slate-500">Jenjang Naik Jabatan</label>
                          <button
                            type="button"
                            onClick={() => {
                              setManagingOptionsType('jafung');
                              setNewOptionInput('');
                              setEditingOptionIdx(null);
                            }}
                            className="text-[10px] text-teal-600 font-bold hover:text-teal-800 flex items-center space-x-1 transition cursor-pointer"
                          >
                            <span>⚙️ Kelola Opsi</span>
                          </button>
                        </div>
                        <select
                          value={jafungOptions.includes(jafungBaruLevel) ? jafungBaruLevel : (jafungOptions[0] || '')}
                          onChange={(e) => setJafungBaruLevel(e.target.value)}
                          className="w-full p-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                        >
                          {jafungOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                          {jafungOptions.length === 0 && (
                            <option value="">(Belum ada opsi - Klik Kelola Opsi)</option>
                          )}
                        </select>
                      </div>
                    )}

                    {selectedFitur?.slug && !['kenaikan-pangkat', 'pencantuman-gelar', 'cuti', 'mutasi', 'usulan-jafung'].includes(selectedFitur.slug) && (
                      selectedFitur.konfigurasi_tambahan ? (
                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                          <label className="text-[11px] font-medium text-slate-705 block">{selectedFitur.konfigurasi_tambahan}</label>
                          <input
                            type="text"
                            value={customConfigValue}
                            onChange={(e) => setCustomConfigValue(e.target.value)}
                            className="w-full p-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
                            placeholder={`Masukkan ${selectedFitur.konfigurasi_tambahan.toLowerCase()}...`}
                          />
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">Layanan standar kelayakan.</p>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Ubah Detail & Status Usulan Section (Right, 7 columns) */}
            <div className="lg:col-span-7 space-y-4 text-left">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center space-x-1">
                <span className="h-4 w-1 bg-teal-600 rounded-full mr-1 inline-block"></span>
                2. Ubah Detail & Status Usulan
              </h3>

              {!selectedAsn ? (
                <div className="py-16 text-center border border-dashed border-slate-200 rounded-xl flex flex-col justify-center items-center space-y-2 bg-slate-50">
                  <FileText size={40} className="text-slate-300" />
                  <p className="text-xs font-semibold text-slate-500">Silakan pilih Pegawai terlebih dahulu.</p>
                  <p className="text-[11px] text-slate-400">Sistem akan memuat ringkasan kelayakan dan status usulan.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Selected employee info badge */}
                  <div className="bg-slate-800 text-white p-4 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-white text-sm">{selectedAsn.nama_lengkap}</p>
                      <p className="text-white font-mono text-[10px]/normal mt-0.5">NIP: {selectedAsn.nip}</p>
                    </div>
                    <div className="bg-slate-700/60 p-2 rounded-lg text-right">
                      <p className="text-[10px] text-white/90 font-bold uppercase tracking-wider">Instansi</p>
                      <p className="font-semibold text-white mt-0.5">{getPuskesmasName(selectedAsn.id_puskesmas)}</p>
                    </div>
                  </div>

                  {/* PermenPAN-RB 1/2023 credit calculator box if Jafung */}
                  {selectedFitur?.slug === 'usulan-jafung' && (
                    <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-center border-b border-teal-200/50 pb-2">
                        <span className="text-xs font-bold text-teal-900 uppercase">Kalkulator Angka Kredit (PermenPAN-RB 1/2023)</span>
                        <span className="text-[10px] font-mono font-bold bg-teal-200 text-teal-800 px-2 py-0.5 rounded-md">
                          Jenjang: {selectedAsn.jenjang_jafung || 'Ahli Pertama'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                        <div className="sm:col-span-4">
                          <label className="text-[10px] text-teal-700 block font-medium">Tahun SKP</label>
                          <input
                            type="number"
                            value={skpTahun}
                            onChange={(e) => setSkpTahun(parseInt(e.target.value) || 2026)}
                            className="w-full bg-white text-xs border border-teal-200 p-1 rounded-md"
                          />
                        </div>
                        <div className="sm:col-span-5">
                          <label className="text-[10px] text-teal-700 block font-medium">Predikat Kinerja</label>
                          <select
                            value={skpPredikat}
                            onChange={(e) => setSkpPredikat(e.target.value as PredikatSKP)}
                            className="w-full bg-white text-xs border border-teal-200 p-1 rounded-md cursor-pointer"
                          >
                            <option value="Sangat Baik">Sangat Baik (X 150%)</option>
                            <option value="Baik">Baik (X 100%)</option>
                            <option value="Butuh Perbaikan">Butuh Perbaikan (X 75%)</option>
                            <option value="Kurang">Kurang (X 50%)</option>
                            <option value="Sangat Kurang">Sangat Kurang (X 0%)</option>
                          </select>
                        </div>
                        <div className="sm:col-span-3 flex self-end">
                          <button
                            type="button"
                            onClick={handleAddSkpCalcRow}
                            className="w-full py-1.5 px-3 bg-teal-800 text-white rounded-md text-xs font-semibold hover:bg-teal-900 transition flex items-center justify-center space-x-1 cursor-pointer"
                          >
                            <Plus size={12} />
                            <span>Simpan AK</span>
                          </button>
                        </div>
                      </div>

                      {/* Cumulative Result view */}
                      <div className="bg-teal-900 text-teal-50 p-3 rounded-lg text-xs space-y-1">
                        <div className="flex justify-between border-b border-teal-800/80 pb-1">
                          <span>AK Integrasi 2022 (Awal)</span>
                          <span className="font-mono font-semibold">{selectedAsn.ak_integrasi_2022.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between border-b border-teal-800/80 pb-1">
                          <span>Kumulatif Nilai Sisipan</span>
                          <span className="font-mono font-semibold">+{tally.detailHistorySum.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-teal-300 pt-1">
                          <span>TOTAL ANGKA KREDIT AKTIF</span>
                          <span className="font-mono text-sm">{tally.total.toFixed(3)} PT</span>
                        </div>
                      </div>

                      {/* Logs row */}
                      {selectedAsnAkHistory.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-[10px] text-teal-800 font-bold">Log Riwayat SKP ter-input:</p>
                          <div className="max-h-24 overflow-y-auto space-y-1">
                            {selectedAsnAkHistory.map(r => (
                              <div key={r.id} className="bg-white/80 border border-teal-100 p-1.5 rounded-md flex justify-between items-center text-[11px] text-slate-800">
                                <span>Tahun {r.tahun_skp} ({r.predikat_skp})</span>
                                <div className="flex items-center space-x-2">
                                  <span className="font-mono font-semibold">+{r.ak_diperoleh.toFixed(3)}</span>
                                  <button onClick={() => handleRemoveSkpRow(r.id)} className="text-rose-600 hover:text-rose-800 cursor-pointer">
                                    <Trash size={12} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Overhauled Detail & Status Selector Card */}
                  <div className="space-y-4 border border-slate-200 p-5 rounded-xl bg-white shadow-2xs">
                    <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center space-x-1.5">
                      <Settings size={14} className="text-teal-600" />
                      <span>Konfigurasi Status Usulan & Saluran Komunikasi</span>
                    </p>

                    <div className={`grid grid-cols-1 ${currentRole === 'admin_dinkes' ? 'md:grid-cols-2' : ''} gap-4`}>
                      {/* Status select without Draft and Menunggu Validasi, and with Usulan Dikirim ke BKD and Pemberitahuan (Only visible for admin_dinkes) */}
                      {currentRole === 'admin_dinkes' && (
                        <div className="space-y-1.5 text-left">
                          <label className="text-xs font-bold text-slate-700 block text-left">Status Dokumen Usulan</label>
                          <select
                            value={newUsulanStatus}
                            onChange={(e) => setNewUsulanStatus(e.target.value as StatusUsulan)}
                            className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 font-semibold focus:ring-1 focus:ring-teal-500 cursor-pointer"
                          >
                            <option value="Usulan Dikirim ke BKD">Usulan Dikirim ke BKD</option>
                            <option value="Perbaikan Berkas">Perbaikan Berkas</option>
                            <option value="Diproses">Diproses</option>
                            <option value="Selesai">Selesai</option>
                            <option value="Pemberitahuan">Pemberitahuan</option>
                          </select>
                        </div>
                      )}

                      {(() => {
                        const adminDinkes = getActiveAdminDinkes();
                        const isDinkes = currentRole === 'admin_dinkes';
                        const displayName = isDinkes ? (selectedAsn?.nama_lengkap || 'Pegawai') : adminDinkes.nama_lengkap;
                        const displayContact = isDinkes ? (selectedAsn?.nomor_wa || 'Belum Terdaftar') : adminDinkes.nomor_wa;
                        const labelText = isDinkes ? "Penerima WhatsApp (Pegawai)" : "Penerima WhatsApp (Admin Puskesmas Sedau)";
                        return (
                          <div className="space-y-1.5 text-left">
                            <label className="text-xs font-bold text-slate-700 block text-left">{labelText}</label>
                            <div className="p-2 border border-teal-100 rounded-lg bg-teal-50/20 font-semibold text-teal-850 truncate text-[11px]">
                              {displayName} ({displayContact})
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {newUsulanStatus === 'Pemberitahuan' && (
                      <div className="p-3.5 bg-teal-50/50 border border-teal-100 rounded-lg text-xs text-left animate-in fade-in duration-150 space-y-1.5">
                        <span className="font-bold text-teal-800 flex items-center gap-1">
                          📋 Persyaratan Wajib ({selectedFitur?.nama_fitur}):
                        </span>
                        <ul className="list-disc pl-5 text-teal-700 font-semibold space-y-1">
                          {(selectedFitur ? syaratFiturMap[selectedFitur.slug] || [] : []).map(id => {
                            const doc = masterDokumen.find(d => d.id === id);
                            return <li key={id}>{doc?.nama_dokumen || `Syarat ID ${id}`}</li>;
                          })}
                          {(!selectedFitur || !(syaratFiturMap[selectedFitur.slug]?.length)) && (
                            <li className="list-none text-slate-450 italic">Belum ada dokumen persyaratan yang terdefinisi pada manajemen dokumen.</li>
                          )}
                        </ul>
                      </div>
                    )}

                    <div className="space-y-1.5 text-left">
                      <label className="text-xs font-bold text-slate-700 block text-left">Catatan Keterangan Tambahan / Alasan Perbaikan</label>
                      <textarea
                        rows={2}
                        value={newUsulanCatatan}
                        onChange={(e) => setNewUsulanCatatan(e.target.value)}
                        placeholder="Masukkan deskripsi detail, berkas pendukung, atau catatan penting lainnya..."
                        className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>

                    {/* Dual-Channel WhatsApp Message Sandbox preview */}
                    <div className="bg-emerald-50/30 border border-emerald-100/50 rounded-xl p-4 space-y-2 text-left">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse mr-1"></span>
                          <span>Preview Pesan WhatsApp ke Tim Kepegawaian (Dual-Channel)</span>
                        </span>
                        <div className="text-[10px] text-emerald-600 font-bold bg-emerald-100 px-2 py-0.5 rounded">
                          Live Auto-Generated Sync
                        </div>
                      </div>

                      <div className="space-y-1">
                        <textarea
                          rows={8}
                          value={editedWaMessage}
                          onChange={(e) => setEditedWaMessage(e.target.value)}
                          className="w-full p-3 border border-emerald-200 bg-white rounded-lg text-xs text-slate-705 font-mono leading-relaxed shadow-3xs focus:outline-none focus:ring-1 focus:ring-emerald-505 resize-y"
                          placeholder="Hasil sinkronisasi pesan WhatsApp otomatis..."
                        />
                        <p className="text-[10px] text-slate-400">Pesan di atas disinkronkan otomatis dengan isian unit pengaju &amp; identitas pegawai, untuk dikirimkan langsung ke {currentRole === 'admin_dinkes' ? 'Pegawai' : 'Admin Puskesmas Sedau'}.</p>
                      </div>
                    </div>

                    {/* Block Action Buttons with Consolidated Button */}
                    <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center space-x-1.5 bg-teal-50 border border-teal-200 text-teal-800 p-2.5 rounded-lg text-[11px] text-left leading-relaxed max-w-sm">
                        <Check size={16} className="text-teal-600 shrink-0" />
                        <span>Kirim usulan ini ke SAPA pegawai UPT Puskesmas Sedau sekaligus mengirimkan notifikasi rincian data pegawai ke WhatsApp {currentRole === 'admin_dinkes' ? 'Pegawai' : 'Admin Puskesmas Sedau'} untuk segera diproses.</span>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          handleKirimUsulan();
                          
                          // Find recipient dynamically based on active role
                          const isDinkes = currentRole === 'admin_dinkes';
                          const recipientName = isDinkes ? (selectedAsn?.nama_lengkap || 'Pegawai') : getActiveAdminDinkes().nama_lengkap;
                          const rawWaNum = isDinkes ? (selectedAsn?.nomor_wa || '') : getActiveAdminDinkes().nomor_wa;
                          
                          let cleanPhone = rawWaNum.replace(/[^0-9+]/g, '');
                          if (cleanPhone.startsWith('0')) {
                            cleanPhone = '+62' + cleanPhone.substring(1);
                          } else if (cleanPhone.startsWith('62') && !cleanPhone.startsWith('+62')) {
                            cleanPhone = '+' + cleanPhone;
                          } else if (!cleanPhone.startsWith('+62') && cleanPhone !== '') {
                            cleanPhone = '+62' + cleanPhone;
                          }

                          if (cleanPhone) {
                            window.alert(
                              `✓ Usulan layanan kepegawaian berhasil diajukan dan masuk ke aplikasi SIMPEG.\n\nSistem sekarang akan mengirimkan notifikasi kepada: ${recipientName} (${cleanPhone}).`
                            );
                            try {
                              const result = await sendWhatsAppMessage(cleanPhone, editedWaMessage);
                              if (result.method === 'baileys') {
                                alert(`✓ Notifikasi berhasil terkirim via WhatsApp Gateway (${result.method}) secara langsung.`);
                              } else {
                                alert(`⚠️ Notifikasi langsung tidak tersedia, draf dialihkan ke WhatsApp Web.`);
                              }
                            } catch (err: any) {
                              alert(`❌ Gagal mengirim notifikasi WA: ${err.message || err}`);
                            }
                          } else {
                            window.alert(
                              `✓ Usulan layanan kepegawaian berhasil diajukan dan masuk ke aplikasi SIMPEG.\n\n⚠️ Catatan: Nomor WhatsApp penerima tidak tersedia atau belum terdaftar.`
                            );
                          }
                        }}
                        className="px-6 py-3 rounded-xl font-bold text-xs bg-teal-850 hover:bg-teal-950 text-white shadow-md transition duration-200 cursor-pointer flex items-center space-x-2"
                      >
                        <MessageSquare size={14} />
                        <span>Kirim Usulan &amp; Notif WA {currentRole === 'admin_dinkes' ? 'Pegawai' : 'Admin Puskesmas Sedau'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}


        {/* ======================= TAB: ACTIVE DOCUMENTS TRACKING ======================= */}
        {activeSubTab === 'berjalan' && (() => {
          const filteredUsulan = usulanLayanan.filter(usulan => {
            // 1. Role-based unit restriction:
            // "hanya tampilkan usulan dari unit masing masing kecuali admin dinkes tampilkan semua"
            if (currentRole !== 'admin_dinkes' && usulan.id_puskesmas_pengusul !== selectedPuskesmasId) {
              return false;
            }

            // 2. Puskesmas filter (only for admin dinkes)
            if (currentRole === 'admin_dinkes' && trackingPuskesmas !== 'Semua') {
              const selectedPkId = parseInt(trackingPuskesmas);
              if (usulan.id_puskesmas_pengusul !== selectedPkId) {
                return false;
              }
            }

            // 3. Status filter
            if (trackingStatus !== 'Semua' && usulan.status !== trackingStatus) {
              return false;
            }

            // 4. Jenis Layanan filter
            if (trackingLayanan !== 'Semua') {
              const selectedLayananId = parseInt(trackingLayanan);
              if (usulan.id_fitur !== selectedLayananId) {
                return false;
              }
            }

            // 5. Search query (NIP, Pegawai Name, Usulan ID #USL-X)
            if (trackingSearch.trim() !== '') {
              const term = trackingSearch.toLowerCase().trim();
              const asm = asnProfiles.find(a => a.id === usulan.id_asn);
              const isMatchId = `#usl-${usulan.id}`.includes(term) || usulan.id.toString().includes(term);
              const isMatchName = asm?.nama_lengkap.toLowerCase().includes(term);
              const isMatchNip = asm?.nip.includes(term);

              if (!isMatchId && !isMatchName && !isMatchNip) {
                return false;
              }
            }

            return true;
          });

          return (
            <div className="mt-6 space-y-4 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-700 text-sm">Pelacakan Berkas Layanan Kepegawaian</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Dafar usulan layanan kepegawaian aktif yang sedang berjalan.</p>
                </div>
                <div className="flex items-center space-x-2 text-[11px]">
                  <span className="text-slate-400">{currentRole === 'admin_dinkes' ? 'Semua Puskesmas' : 'Unit Kerja Anda'}</span>
                  <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">{filteredUsulan.length} Berkas</span>
                </div>
              </div>

              {/* Advanced Interactive Filtering Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#f8fafc]/80 p-4 rounded-xl border border-slate-100 shadow-xs">
                {/* Search query field */}
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Cari Berkas</span>
                  <input 
                    type="text"
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600/20"
                    placeholder="Saring Nama, NIP, ID..."
                    value={trackingSearch}
                    onChange={(e) => setTrackingSearch(e.target.value)}
                  />
                </div>

                {/* Puskesmas filter (interactive dropdown for admin_dinkes) */}
                {currentRole === 'admin_dinkes' ? (
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Puskesmas / Unit</span>
                    <select
                      className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white text-slate-800 font-medium focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600/20 cursor-pointer"
                      value={trackingPuskesmas}
                      onChange={(e) => setTrackingPuskesmas(e.target.value)}
                    >
                      <option value="Semua">Semua Puskesmas</option>
                      {puskesmasList.map(p => (
                        <option key={p.id} value={p.id}>{p.nama_puskesmas}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex flex-col opacity-65">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Puskesmas / Unit</span>
                    <div className="w-full text-xs border border-slate-200/80 rounded-lg p-2 bg-slate-100 text-slate-500 font-semibold truncate select-none">
                      {puskesmasList.find(p => p.id === selectedPuskesmasId)?.nama_puskesmas || 'Unit Terbatas'}
                    </div>
                  </div>
                )}

                {/* Status Filter */}
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status Berkas</span>
                  <select
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white text-slate-800 font-medium focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600/20 cursor-pointer"
                    value={trackingStatus}
                    onChange={(e) => setTrackingStatus(e.target.value)}
                  >
                    <option value="Semua">Semua Status</option>
                    <option value="Usulan Dikirim ke BKD">Usulan Dikirim ke BKD</option>
                    <option value="Perbaikan Berkas">Perbaikan Berkas</option>
                    <option value="Diproses">Diproses</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>

                {/* Service/Feature filter */}
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Jenis Layanan</span>
                  <select
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 bg-white text-slate-800 font-medium focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600/20 cursor-pointer"
                    value={trackingLayanan}
                    onChange={(e) => setTrackingLayanan(e.target.value)}
                  >
                    <option value="Semua">Semua Layanan</option>
                    {masterFitur.map(f => (
                      <option key={f.id} value={f.id}>{f.nama_fitur}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Data Table */}
              <div className="border border-slate-100 rounded-xl overflow-x-auto bg-white shadow-xs">
                <table className="w-full min-w-[800px] text-left text-xs text-slate-600 border-collapse">
                  <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase font-semibold border-b border-slate-100">
                    <tr>
                      <th className="p-3 w-12 text-center">NO</th>
                      <th className="p-3">ID / TANGGAL</th>
                      <th className="p-3">PEGAWAI / NIP</th>
                      <th className="p-3">JENIS LAYANAN</th>
                      <th className="p-3">PENGUSUL</th>
                      <th className="p-3">STATUS BERKAS</th>
                      <th className="p-3 text-right">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredUsulan.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                          Tidak ada usulan berjalan yang sesuai dengan filter pencarian.
                        </td>
                      </tr>
                    ) : (
                      filteredUsulan.map((usulan, idx) => {
                        const asm = asnProfiles.find(a => a.id === usulan.id_asn);
                        const ftr = masterFitur.find(f => f.id === usulan.id_fitur);
                        
                        // Status colors
                        const getStatusBadge = (st: string) => {
                          switch (st) {
                            case 'Draft': return 'bg-slate-100 text-slate-600';
                            case 'Menunggu Validasi': return 'bg-amber-100 text-amber-800';
                            case 'Usulan Dikirim ke BKD': return 'bg-indigo-100 text-indigo-800 font-bold border border-indigo-200';
                            case 'Perbaikan Berkas': return 'bg-rose-100 text-rose-800 animate-pulse';
                            case 'Diproses': return 'bg-blue-100 text-blue-800';
                            case 'Selesai': return 'bg-emerald-100 text-emerald-800';
                            default: return 'bg-slate-100 text-slate-700';
                          }
                        };

                        return (
                          <tr key={usulan.id} className="hover:bg-slate-50/50 transition">
                            <td className="p-3 text-center text-slate-400 font-mono font-bold w-12 border-r border-slate-100">
                              {idx + 1}
                            </td>
                            <td className="p-3">
                              <div className="font-bold">#USL-{usulan.id}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{formatDate(usulan.tanggal_pengusulan.split('T')[0])}</div>
                            </td>
                            <td className="p-3">
                              <div className="text-slate-800 font-semibold">{asm?.nama_lengkap || 'Tidak diketahui'}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{asm?.nip}</div>
                            </td>
                            <td className="p-3">
                              <div className="text-slate-800 font-bold">{ftr?.nama_fitur}</div>
                            </td>
                            <td className="p-3">
                              {getPuskesmasName(usulan.id_puskesmas_pengusul)}
                            </td>
                            <td className="p-3">
                              <span 
                                onClick={() => setPreviewStatusUsulan(usulan)}
                                className={`px-2 py-1 rounded-full text-[10px] font-bold ${getStatusBadge(usulan.status)} cursor-pointer hover:opacity-85 active:scale-95 transition inline-block`}
                                title="Klik untuk lihat preview pesan & status dokumen"
                              >
                                {usulan.status}
                              </span>
                              {usulan.catatan_perbaikan && (
                                <p className="text-[10px] text-rose-700 italic max-w-xs mt-1 leading-normal leading-relaxed bg-rose-50 p-1.5 rounded-md border border-rose-100">
                                  🔔 {usulan.catatan_perbaikan}
                                </p>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end space-x-2">
                                {currentRole === 'admin_dinkes' ? (
                                  <>
                                    {usulan.status === 'Selesai' && (
                                      <div className="text-[11px] text-emerald-600 font-semibold flex items-center space-x-1 border border-emerald-100 bg-emerald-50 px-2 py-0.5 rounded-lg">
                                        <Download size={12} />
                                        <span className="underline cursor-pointer" onClick={() => alert(`Mengunduh file: ${usulan.file_sk_final}`)}>
                                          SK Final
                                        </span>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    {usulan.status === 'Selesai' ? (
                                      <div className="text-[11px] text-emerald-600 font-semibold flex items-center space-x-1 border border-emerald-100 bg-emerald-50 px-2 py-0.5 rounded-lg font-bold">
                                        <Download size={12} />
                                        <span className="underline cursor-pointer" onClick={() => alert(`Mengunduh SK Final: ${usulan.file_sk_final}`)}>
                                          SK Final
                                        </span>
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 font-light italic bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">Diproses Tim Kepegawaian</span>
                                    )}
                                  </>
                                )}

                                {/* CRUD Modification Actions available to owners and dinkes */}
                                {(currentRole === 'admin_dinkes' || usulan.id_puskesmas_pengusul === selectedPuskesmasId) && (
                                  <div className="flex items-center space-x-1 border-l border-slate-100 pl-2">
                                    <button
                                      onClick={() => {
                                        if (currentRole === 'admin_puskesmas') {
                                          setEditingPuskesmasUsulan(usulan);
                                        } else {
                                          handleOpenEditUsulan(usulan);
                                        }
                                      }}
                                      className="p-1 px-2 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition font-medium cursor-pointer"
                                      title="Edit Detail Usulan"
                                    >
                                      Ubah
                                    </button>
                                    <button
                                      onClick={() => handleDeleteUsulan(usulan.id)}
                                      className="p-1 px-2 text-[11px] bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition font-medium"
                                      title="Hapus Usulan"
                                    >
                                      Hapus
                                    </button>
                                  </div>
                                )}
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
          );
        })()}
      </div>

      {/* ======================= OCR SIMULATOR POPUP ======================= */}
      {selectedDocIdForUpload && selectedAsn && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <div>
                <h4 className="font-semibold text-slate-800 font-display">Tesseract OCR / Document AI Validator</h4>
                <p className="text-xs text-slate-400">Verifikator Anti-Slop Keaslian Berkas Pegawai</p>
              </div>
              <button onClick={() => setSelectedDocIdForUpload(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Uploader params (Left) */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase block">Unggah Berkas Fisik (PDF / JPG / JPEG)</label>
                  <input
                    type="file"
                    accept=".pdf,image/jpeg,image/png,image/jpg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setOcrFileName(file.name);
                        const doc = masterDokumen.find(d => d.id === selectedDocIdForUpload);
                        const keywordFirst = doc?.kata_kunci_ocr.split(',')[0] || '';
                        setOcrRawText(`KEMENTERIAN KESEHATAN REPUBLIK INDONESIA\nPUSKESMAS WILAYAH LOMBOK BARAT\n\nNAMA PENERANG: ${selectedAsn.nama_lengkap.toUpperCase()}\nNIP PEG: ${selectedAsn.nip}\nTENTANG DOKUMEN: ${keywordFirst} RELEVAN\nFILE NAME: ${file.name}\nSTATUS: VALIDATED.`);
                      }
                    }}
                    className="w-full p-1.5 border border-dashed border-slate-200 bg-slate-50 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block">Nama File Terdeteksi</label>
                  <input
                    type="text"
                    value={ocrFileName}
                    onChange={(e) => setOcrFileName(e.target.value)}
                    className="w-full mt-1 p-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-500 uppercase block">Spesifikasi Target Persyaratan</label>
                  <div className="mt-1 bg-slate-50 p-2.5 rounded-lg text-[10px] text-slate-600 space-y-1">
                    <p><strong>Syarat:</strong> {masterDokumen.find(d => d.id === selectedDocIdForUpload)?.nama_dokumen}</p>
                    <p><strong>Kunci OCR Wajib:</strong> <span className="text-teal-700 font-semibold">{masterDokumen.find(d => d.id === selectedDocIdForUpload)?.kata_kunci_ocr}</span></p>
                    <p><strong>Pemilik:</strong> {selectedAsn.nama_lengkap}</p>
                    <p><strong>NIP:</strong> {selectedAsn.nip}</p>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-2.5 rounded-lg text-[10px]/normal leading-normal">
                  💡 <strong>Uji Keamanan Berkas:</strong> Cobalah ganti NIP di teks editor di sebelah kanan ke NIP lain (misal: 12345) atau hapus kata kuncinya, lalu tekan "Proses Validasi" untuk menguji sistem deteksi anti-penyelewengan dokumen!
                </div>
              </div>

              {/* Text content simulating scanned PDF content (Right) */}
              <div className="flex flex-col space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase block">Hasil Pembacaan Teks Scan (Simulasi PDF content)</label>
                <textarea
                  rows={8}
                  value={ocrRawText}
                  onChange={(e) => setOcrRawText(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs font-mono bg-slate-900 text-teal-300"
                  placeholder="Isi teks hasil scan digital..."
                />
              </div>
            </div>

            {/* OCR validation logging feedback feedback info */}
            {ocrFeedbackMessage && (
              <div className={`mt-4 p-3 rounded-xl text-xs font-semibold ${ocrFeedbackMessage.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'}`}>
                {ocrFeedbackMessage.text}
              </div>
            )}

            <div className="flex justify-end items-center space-x-2 mt-6 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setSelectedDocIdForUpload(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={processOcrScanSimulate}
                className="px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition"
              >
                Proses Validasi OCR
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ======================= DINKES REVIEW USULAN MODAL POPUP ======================= */}
      {reviewUsulanId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          {(() => {
            const usulan = usulanLayanan.find(u => u.id === reviewUsulanId);
            const asm = asnProfiles.find(a => a.id === usulan?.id_asn);
            const ftr = masterFitur.find(f => f.id === usulan?.id_fitur);
            const files = usulanDokumenFile.filter(f => f.id_usulan === reviewUsulanId);

            let metaPayload: any = null;
            if (usulan) {
              try {
                const stored = localStorage.getItem(`simpeg_meta_payload_${usulan.id}`);
                if (stored) metaPayload = JSON.parse(stored);
              } catch {}
            }

            return (
              <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                  <div>
                    <h4 className="font-semibold text-slate-800 font-display">Verifikasi Dua Arah Admin UPT Puskesmas Sedau</h4>
                    <p className="text-xs text-slate-400">Validasi & Sahkan berkas usulan kepegawaian</p>
                  </div>
                  <button onClick={() => setReviewUsulanId(null)} className="text-slate-400 hover:text-slate-600">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4 text-xs text-slate-700">
                  <div className="bg-slate-50 p-3 rounded-lg grid grid-cols-2 gap-2">
                    <p><strong>ID Pegawai:</strong> {asm?.nama_lengkap}</p>
                    <p><strong>NIP:</strong> {asm?.nip}</p>
                    <p><strong>Jenis Usul:</strong> {ftr?.nama_fitur}</p>
                    <p><strong>Pengusul Unit:</strong> {getPuskesmasName(usulan?.id_puskesmas_pengusul || 1)}</p>
                  </div>

                  {metaPayload && (
                    <div className="bg-yellow-55 border border-yellow-200/60 p-3 rounded-xl text-slate-800 space-y-1">
                      <p className="font-bold text-yellow-800 uppercase text-[9px] tracking-wider mb-1">⚙️ Konfigurasi Tambahan Terisi:</p>
                      {metaPayload.days !== undefined && <p><strong>Jumlah Hari Cuti:</strong> {metaPayload.days} Hari</p>}
                      {metaPayload.target_puskesmas_id !== undefined && <p><strong>Puskesmas Tujuan:</strong> {getPuskesmasName(metaPayload.target_puskesmas_id)}</p>}
                      {metaPayload.gelar_baru !== undefined && <p><strong>Gelar Baru:</strong> {metaPayload.gelar_baru}</p>}
                      {metaPayload.pangkat_baru !== undefined && <p><strong>Golongan Baru:</strong> {metaPayload.pangkat_baru}</p>}
                      {metaPayload.jenjang_baru !== undefined && <p><strong>Jenjang Baru:</strong> {metaPayload.jenjang_baru}</p>}
                      {metaPayload.custom_config_label !== undefined && metaPayload.custom_config_value !== undefined && (
                        <p><strong>{metaPayload.custom_config_label}:</strong> {metaPayload.custom_config_value}</p>
                      )}
                    </div>
                  )}

                  <div>
                    <p className="font-bold text-slate-800 mb-2">Scan File Syarat Wajib:</p>
                    <div className="space-y-2">
                      {files.length === 0 ? (
                        <p className="text-slate-400 italic">Belum ada berkas pendukung terunggah.</p>
                      ) : (
                        files.map(f => {
                          const originalDoc = masterDokumen.find(d => d.id === f.id_dokumen);
                          return (
                            <div key={f.id} className="bg-slate-50 border border-slate-200 p-2.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 shadow-2xs">
                              <div>
                                <span className="font-semibold text-slate-800 block">📄 {originalDoc?.nama_dokumen}</span>
                                <span className="text-[10px] text-slate-400 block font-mono truncate max-w-[280px]">{f.file_name}</span>
                              </div>
                              <div className="flex items-center space-x-1.5 shrink-0">
                                <span className="font-mono text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-md font-semibold">OCR PASS</span>
                                <button
                                  type="button"
                                  onClick={() => handlePreviewUsulanFile(f, usulan!)}
                                  className="px-2 py-1 bg-slate-205 hover:bg-slate-200 text-slate-705 text-[10px] rounded-lg font-bold flex items-center space-x-1 cursor-pointer"
                                >
                                  <Eye size={11} />
                                  <span>Lihat</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadUsulanFile(f, usulan!)}
                                  className="px-2 py-1 bg-emerald-700 hover:bg-emerald-800 text-white text-[10px] rounded-lg font-bold flex items-center space-x-1 cursor-pointer transition"
                                >
                                  <Download size={11} />
                                  <span>Unduh</span>
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 space-y-3">
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5">
                      <p className="font-bold text-rose-900">JALUR TOLAK (Perbaikan Berkas)</p>
                      <label className="text-[10px] text-rose-700 block">Tulis Catatan Perbaikan / Kekurangan Dokumen</label>
                      <textarea
                        rows={2}
                        value={catatanPerbaikan}
                        onChange={(e) => setCatatanPerbaikan(e.target.value)}
                        className="w-full bg-white p-2 border border-rose-300 rounded-lg text-xs"
                        placeholder="Contoh: Berkas halaman kedua kurang terbaca / KTP buram..."
                      />
                      <button
                        onClick={handleProcessDinkesRejection}
                        className="px-3 py-1.5 bg-rose-800 text-white rounded-lg hover:bg-rose-900 font-bold text-[10px] transition"
                      >
                        TOLAK (Minta Perbaikan)
                      </button>
                    </div>

                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                      <p className="font-bold text-emerald-900">JALUR TERIMA (Selesai & Sahkan Profil)</p>
                      <label className="text-[10px] text-emerald-700 block">Nama File SK Final Hasil Sah Kedinasan (.PDF)</label>
                      <input
                        type="text"
                        value={skFileNameInput}
                        onChange={(e) => setSkFileNameInput(e.target.value)}
                        className="w-full bg-white p-2 border border-emerald-300 rounded-lg text-xs"
                        placeholder="SK_BKPSDM_Disahkan_12.pdf"
                      />
                      <button
                        onClick={handleProcessDinkesApprove}
                        className="px-3 py-1.5 bg-emerald-800 text-white rounded-lg hover:bg-emerald-950 font-bold text-[10px] transition"
                      >
                        ✔ SETUJUI & GENERATE UPDATE PROFIL
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}


      {/* ======================= INTERACTIVE FILE PREVIEW MODAL ======================= */}
      {activeUsulanFilePreview && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-55 backdrop-blur-md">
          {(() => {
            const { file, usulan } = activeUsulanFilePreview;
            const asm = asnProfiles.find(a => a.id === usulan.id_asn);
            const ftr = masterFitur.find(f => f.id === usulan.id_fitur);
            const docType = masterDokumen.find(d => d.id === file.id_dokumen)?.nama_dokumen || "Dokumen Pendukung";
            const unitName = asm?.id_puskesmas === 100 ? "UPT Puskesmas Sedau" : getPuskesmasName(asm?.id_puskesmas || 1);
            const isDataUrl = file.file_path && file.file_path.startsWith('data:');

            return (
              <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl max-w-3xl w-full flex flex-col p-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh]">
                <div className="flex justify-between items-center border-b border-white/10 pb-4 mb-4">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-emerald-400">
                      <FileCheck size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm tracking-wide text-white">Pratinjau Berkas {docType}</h4>
                      <p className="text-[10px] text-slate-400">Pemerintah Kabupaten Lombok Barat • Bagian Kepegawaian</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveUsulanFilePreview(null)} 
                    className="text-slate-400 hover:text-white p-1 hover:bg-white/5 rounded-lg transition"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-1">
                  <div className="space-y-4">
                    {/* Top download reminder bar */}
                    <div className="bg-emerald-950/40 border border-emerald-500/20 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs text-emerald-300 gap-2">
                      <div className="flex items-center space-x-2">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Pratinjau Berkas Digital: <strong>{file.file_name}</strong></span>
                      </div>
                      <div className="flex items-center space-x-2 self-start sm:self-auto">
                        {usulanPreviewUrl && usulanPreviewType === 'PDF' && (
                          <button
                            type="button"
                            onClick={() => window.open(usulanPreviewUrl, '_blank')}
                            className="px-3 py-1 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-lg text-[10px] transition cursor-pointer flex items-center space-x-1"
                          >
                            <Eye size={10} />
                            <span>Buka di Tab Baru</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDownloadUsulanFile(file, usulan)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[10px] transition cursor-pointer flex items-center space-x-1"
                        >
                          <Download size={10} />
                          <span>Unduh Berkas</span>
                        </button>
                      </div>
                    </div>

                    {usulanPreviewUrl ? (
                      <div>
                        {usulanPreviewType === 'IMAGE' ? (
                          <div className="space-y-3 font-sans">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleOpenImageInNewTab(usulanPreviewUrl)}
                                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs transition duration-150 flex items-center space-x-1 border border-indigo-200 cursor-pointer"
                              >
                                <span>🌐 Buka Gambar di Tab Baru</span>
                              </button>
                            </div>
                            <div className="flex flex-col items-center justify-center p-4 bg-slate-900 border border-white/10 rounded-2xl shadow-inner min-h-[300px] max-h-[500px] overflow-auto">
                              {!usulanImageError ? (
                                <img 
                                  src={usulanPreviewUrl} 
                                  className="max-h-[450px] w-auto max-w-full object-contain rounded-lg shadow-lg border border-white/5" 
                                  alt="Pratinjau Berkas Gambar" 
                                  referrerPolicy="no-referrer"
                                  onError={() => {
                                    setUsulanImageError(true);
                                    handleOpenImageInNewTab(usulanPreviewUrl);
                                  }}
                                />
                              ) : (
                                <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4 max-w-md w-full mx-auto text-slate-800">
                                  <div className="mx-auto w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center">
                                    <AlertTriangle size={24} />
                                  </div>
                                  <div className="space-y-1">
                                    <p className="font-bold text-slate-800 text-xs text-center">Pratinjau Gambar Dialihkan ke Tab Baru</p>
                                    <p className="text-[11px] text-slate-500 leading-normal text-center">
                                      Sandbox iframe membatasi pemuatan langsung gambar jenis ini di halaman. Kami mendeteksi kegagalan render, sehingga berkas dialihkan untuk dibuka pada tab baru menggunakan penampil bawaan browser.
                                    </p>
                                  </div>
                                  <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2 w-full">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenImageInNewTab(usulanPreviewUrl)}
                                      className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition active:scale-95 cursor-pointer shadow-xs"
                                    >
                                      Tampilkan Kembali Tab Baru
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDownloadUsulanFile(file, usulan)}
                                      className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition active:scale-95 cursor-pointer shadow-xs border border-slate-200"
                                    >
                                      Unduh File Asli
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* Official Govt Document Simulator Sheet */
                          <div className="bg-white border border-slate-300 rounded-3xl shadow-xl p-8 md:p-10 font-sans text-slate-800 relative overflow-hidden ring-1 ring-black/5 max-w-xl mx-auto">
                            
                            {/* Background Watermark/Seal */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] select-none pointer-events-none">
                              <div className="border-[15px] border-emerald-800 rounded-full w-80 h-80 flex items-center justify-center font-bold text-lg text-center tracking-widest leading-normal">
                                SIMPEG DINAS KESEHATAN<br/>LOMBOK BARAT
                              </div>
                            </div>

                            {/* Letterhead (KOP SURAT) */}
                            <div className="text-center border-b-4 border-double border-slate-900 pb-3 flex flex-col items-center">
                              <div className="flex items-center justify-center space-x-3 mb-1">
                                <span className="text-2xl">🇲🇨</span>
                                <div className="text-left">
                                  <h4 className="font-extrabold text-[12px] leading-tight tracking-wider uppercase text-slate-900">PEMERINTAH KABUPATEN LOMBOK BARAT</h4>
                                  <h3 className="font-black text-[13px] leading-tight tracking-widest uppercase text-slate-950">DINAS KESEHATAN, PENGENDALIAN PENDUDUK DAN KB</h3>
                                </div>
                              </div>
                              <p className="text-[9px] text-slate-500 font-mono">Jalan Giri Menang No. 1, Gerung, NTB &bull; Telp (0370) 681321 &bull; Kode Pos 83371</p>
                            </div>

                            {/* Document Title Header */}
                            <div className="text-center my-6 space-y-1">
                              <h2 className="font-black text-[12px] tracking-widest uppercase text-slate-900 underline decoration-1 underline-offset-4">
                                VERIFIKASI SYARAT LAYANAN KEPEGAWAIAN
                              </h2>
                              <p className="text-[9px] font-mono text-slate-500 tracking-wider">
                                NOMOR REGISTER: REG-LOBAR/USULAN-{usulan.id}/DOC-{file.id}/2026
                              </p>
                            </div>

                            {/* Main Grid Data */}
                            <div className="space-y-4 text-[11px] md:text-xs">
                              <p className="leading-relaxed">
                                Dokumen digital di bawah ini terdaftar sebagai berkas lampiran yang sah untuk permohonan usulan layanan kepegawaian SIMPEG Kabupaten Lombok Barat:
                              </p>

                              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 md:p-5 space-y-2.5 font-mono text-[11px] text-slate-700 shadow-inner">
                                <div className="grid grid-cols-12 gap-1 border-b border-dashed border-slate-200 pb-1.5">
                                  <span className="col-span-4 text-slate-400">ID USULAN</span>
                                  <span className="col-span-8 font-bold text-slate-900">#USL-{usulan.id}</span>
                                </div>
                                <div className="grid grid-cols-12 gap-1 border-b border-dashed border-slate-200 pb-1.5">
                                  <span className="col-span-4 text-slate-400">NAMA SYARAT</span>
                                  <span className="col-span-8 font-bold text-emerald-800">{masterDokumen.find(d => d.id === file.id_dokumen)?.nama_dokumen || "Dokumen Pendukung"}</span>
                                </div>
                                <div className="grid grid-cols-12 gap-1 border-b border-dashed border-slate-200 pb-1.5">
                                  <span className="col-span-4 text-slate-400">JENIS LAYANAN</span>
                                  <span className="col-span-8 text-slate-900 font-semibold">{masterFitur.find(f => f.id === usulan.id_fitur)?.nama_fitur || "Layanan Kepegawaian"}</span>
                                </div>
                                <div className="grid grid-cols-12 gap-1 border-b border-dashed border-slate-200 pb-1.5">
                                  <span className="col-span-4 text-slate-400">NAMA PEGAWAI</span>
                                  <span className="col-span-8 font-bold text-slate-900">{asnProfiles.find(a => a.id === usulan.id_asn)?.nama_lengkap || "Tidak diketahui"}</span>
                                </div>
                                <div className="grid grid-cols-12 gap-1 border-b border-dashed border-slate-200 pb-1.5">
                                  <span className="col-span-4 text-slate-400">NIP PEGAWAI</span>
                                  <span className="col-span-8 text-slate-900 font-bold">{asnProfiles.find(a => a.id === usulan.id_asn)?.nip || "-"}</span>
                                </div>
                                <div className="grid grid-cols-12 gap-1 border-b border-dashed border-slate-200 pb-1.5">
                                  <span className="col-span-4 text-slate-400">UNIT KERJA</span>
                                  <span className="col-span-8 text-slate-900">{asnProfiles.find(a => a.id === usulan.id_asn)?.id_puskesmas === 100 ? "UPT Puskesmas Sedau" : getPuskesmasName(asnProfiles.find(a => a.id === usulan.id_asn)?.id_puskesmas || 1)}</span>
                                </div>
                                <div className="grid grid-cols-12 gap-1 border-b border-dashed border-slate-200 pb-1.5">
                                  <span className="col-span-4 text-slate-400">FILE ASLI</span>
                                  <span className="col-span-8 text-slate-600 truncate">{file.file_name}</span>
                                </div>
                                <div className="grid grid-cols-12 gap-1">
                                  <span className="col-span-4 text-slate-400">TANGGAL</span>
                                  <span className="col-span-8 text-slate-900">{new Date(usulan.tanggal_pengusulan).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</span>
                                </div>
                              </div>

                              <p className="leading-relaxed text-[10px] text-slate-500">
                                * Berkas ini terupload langsung oleh pemohon usul dinas / puskesmas melalui modul Layanan Mandiri SIMPEG Lombok Barat.
                              </p>
                            </div>

                            {/* Signature & Validation Footer */}
                            <div className="mt-8 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                              {/* QR / Digital Code Validation */}
                              <div className="flex items-center space-x-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                                <div className="w-12 h-12 bg-slate-950 flex flex-wrap p-1 rounded border border-slate-300 shrink-0">
                                  <div className="w-1/2 h-1/2 border border-white bg-slate-950 flex justify-center items-center">
                                    <div className="w-1.5 h-1.5 bg-white" />
                                  </div>
                                  <div className="w-1/2 h-1/2 border border-white bg-slate-950 flex justify-center items-center">
                                    <div className="w-1.5 h-1.5 bg-white" />
                                  </div>
                                  <div className="w-1/2 h-1/2 border border-white bg-slate-950 flex justify-center items-center">
                                    <div className="w-1.5 h-1.5 bg-white" />
                                  </div>
                                  <div className="w-1/2 h-1/2 bg-white flex justify-center items-center">
                                    <div className="w-1.5 h-1.5 bg-slate-950" />
                                  </div>
                                </div>
                                <div className="font-mono text-[8px] leading-tight text-slate-500">
                                  <span className="text-slate-700 font-bold block uppercase">VERIFIED SYARAT</span>
                                  <span>REG ID: LOBAR-USL-{file.id}</span>
                                  <span className="block text-purple-700 font-bold mt-0.5">STATUS: PROSES VERIF</span>
                                </div>
                              </div>

                              {/* Signature Slot */}
                              <div className="text-right font-sans text-[11px] space-y-1.5 self-end">
                                <p className="text-slate-500">Lombok Barat, 2026</p>
                                <div className="font-bold text-slate-800 leading-normal text-[10px]">
                                  <p>UPT Puskesmas Sedau</p>
                                  <p className="text-slate-600 font-medium">Lombok Barat</p>
                                </div>
                                <div className="h-8 flex justify-end items-center select-none">
                                  <span className="text-[8px] bg-purple-50 text-purple-700 border border-purple-200/80 px-2.5 py-0.5 rounded-full font-bold flex items-center space-x-1 shadow-2xs">
                                    <span>⏳ WAITING VERIFICATION</span>
                                  </span>
                                </div>
                                <p className="font-bold text-slate-800 border-t border-slate-400 pt-0.5">Tim Verifikator SIMPEG</p>
                                <p className="text-[9px] font-mono text-slate-500">DKS KAB. LOMBOK BARAT</p>
                              </div>
                            </div>

                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-xs text-slate-400 bg-slate-950 rounded-xl border border-white/5 animate-pulse">
                        Sedang menyiapkan pratinjau lembar berkas asli...
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end items-center space-x-3 mt-4 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setActiveUsulanFilePreview(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleDownloadUsulanFile(file, usulan);
                    }}
                    className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center space-x-1.5 shadow-sm transition cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ======================= EDIT PROPOSAL STATUS / METADATA MODAL ======================= */}
      {editingUsulan && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-fade-in text-left">
          {(() => {
            const asm = asnProfiles.find(a => a.id === editingUsulan.id_asn);
            const ftr = masterFitur.find(f => f.id === editingUsulan.id_fitur);
            const unitName = asm?.id_puskesmas === 100 ? "UPT Puskesmas Sedau" : getPuskesmasName(asm?.id_puskesmas || 1);

            return (
              <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
                  <div>
                    <h4 className="font-bold text-slate-800 font-display">Ubah Detail & Status Usulan</h4>
                    <p className="text-xs text-slate-400">Sunting metadata usulan berjalan #${editingUsulan.id}</p>
                  </div>
                  <button 
                    onClick={() => setEditingUsulan(null)} 
                    className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-50 rounded-lg transition"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4 text-xs text-slate-700">
                  <div className="bg-slate-50 p-3 rounded-lg grid grid-cols-2 gap-2 border border-slate-100">
                    <p><strong>Pegawai:</strong> {asm?.nama_lengkap}</p>
                    <p><strong>NIP:</strong> {asm?.nip}</p>
                    <p><strong>Rencana Usulan:</strong> {ftr?.nama_fitur}</p>
                    <p><strong>Unit Kerja:</strong> {unitName}</p>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-slate-600 block text-left">Status Dokumen Usulan</label>
                    <select
                      value={editUsulanStatus}
                      onChange={(e) => setEditUsulanStatus(e.target.value as StatusUsulan)}
                      className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 font-semibold focus:ring-1 focus:ring-teal-500 cursor-pointer"
                    >
                      <option value="Usulan Dikirim ke BKD">Usulan Dikirim ke BKD</option>
                      <option value="Perbaikan Berkas">Perbaikan Berkas</option>
                      <option value="Diproses">Diproses</option>
                      <option value="Selesai">Selesai</option>
                      <option value="Pemberitahuan">Pemberitahuan</option>
                    </select>
                  </div>

                  {editUsulanStatus === 'Pemberitahuan' && (
                    <div className="p-3 bg-teal-50/50 border border-teal-100 rounded-lg text-xs text-left animate-in fade-in duration-150 space-y-1.5">
                      <span className="font-bold text-teal-800 flex items-center gap-1">
                        📋 Persyaratan Wajib ({ftr?.nama_fitur}):
                      </span>
                      <ul className="list-disc pl-5 text-teal-700 font-semibold space-y-1">
                        {(ftr ? syaratFiturMap[ftr.slug] || [] : []).map(id => {
                          const doc = masterDokumen.find(d => d.id === id);
                          return <li key={id}>{doc?.nama_dokumen || `Syarat ID ${id}`}</li>;
                        })}
                        {(!ftr || !(syaratFiturMap[ftr.slug]?.length)) && (
                          <li className="list-none text-slate-450 italic">Belum ada dokumen persyaratan yang terdefinisi pada manajemen dokumen.</li>
                        )}
                      </ul>
                    </div>
                  )}

                  <div className="space-y-1.5 text-left">
                    <label className="text-xs font-bold text-slate-600 block text-left">Catatan Pendukung / Perbaikan (Opsional)</label>
                    <textarea
                      rows={3}
                      value={editUsulanCatatan}
                      onChange={(e) => setEditUsulanCatatan(e.target.value)}
                      placeholder="Masukkan catatan perbaikan berkas atau alasan penolakan sementara..."
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-slate-800 focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  {/* Pratinjau Kirim WhatsApp */}
                  {(() => {
                    const rawWaNum = asm?.nomor_wa || '';
                    let cleanPhone = rawWaNum.replace(/[^0-9+]/g, '');
                    if (cleanPhone.startsWith('0')) {
                      cleanPhone = '+62' + cleanPhone.substring(1);
                    } else if (cleanPhone.startsWith('62') && !cleanPhone.startsWith('+62')) {
                      cleanPhone = '+' + cleanPhone;
                    } else if (!cleanPhone.startsWith('+62') && cleanPhone !== '') {
                      cleanPhone = '+62' + cleanPhone;
                    }

                    return (
                      <div className="border border-teal-200 bg-teal-50/15 p-3.5 rounded-xl space-y-2.5 text-left">
                        <div className="space-y-0.5">
                          <label className="text-[11px] font-extrabold text-teal-900 tracking-wider uppercase block">
                            📱 Pratinjau Kirim WhatsApp
                          </label>
                          <p className="text-[10.5px] text-slate-500 font-medium">
                            Kepada: <strong className="text-slate-800 font-bold">{asm?.nama_lengkap}</strong> ({cleanPhone || 'Nomor WA tidak tersedia'})
                          </p>
                        </div>
                        
                        <textarea
                          rows={4}
                          value={editUsulanWaMessage}
                          onChange={(e) => setEditUsulanWaMessage(e.target.value)}
                          placeholder="Tulis pesan kustom WhatsApp di sini..."
                          className="w-full p-2.5 border border-slate-200 bg-white rounded-lg text-[10.5px] text-slate-700 font-mono leading-relaxed resize-y focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                        <p className="text-[9px] text-slate-400 leading-tight">
                          *Pesan di atas akan otomatis terbuka di WhatsApp Web bersamaan saat Anda mengklik tombol "Simpan Perubahan" di bawah.
                        </p>
                      </div>
                    );
                  })()}

                  {editUsulanStatus === 'Selesai' && (
                    <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-150 border border-emerald-200 p-3 rounded-xl bg-emerald-50/15">
                      <label className="text-xs font-bold text-emerald-700 block text-left">Nama / Path File SK Final (Opsional)</label>
                      <input
                        type="text"
                        value={editUsulanSkFile}
                        onChange={(e) => setEditUsulanSkFile(e.target.value)}
                        placeholder="e.g. SK_Kenaikan_Pangkat_Wahyu.pdf"
                        className="w-full p-2 border border-emerald-250 bg-white rounded-lg text-emerald-900 font-mono text-[11px]"
                      />
                      <div className="pt-2 text-[11px] text-left">
                        <label className="font-semibold text-slate-700 block mb-1">Unggah Dokumen SK Final (.pdf, .jpg, .png):</label>
                        <input
                          type="file"
                          id="upload-sk-final-file"
                          accept=".pdf,image/jpeg,image/png,image/jpg"
                          className="w-full text-xs text-slate-700 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              setEditUsulanSkFile(f.name);
                              alert(`✓ Dokumen SK Final "${f.name}" berhasil diunggah.`);
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end items-center space-x-3 mt-6 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingUsulan(null)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEditUsulan}
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-xs transition cursor-pointer"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ======================= MODAL: EDIT UPLOADED FILES FOR PUSKESMAS ADMIN ======================= */}
      {editingPuskesmasUsulan && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-fade-in text-left">
          {(() => {
            const asm = asnProfiles.find(a => a.id === editingPuskesmasUsulan.id_asn);
            const ftr = masterFitur.find(f => f.id === editingPuskesmasUsulan.id_fitur);
            const requiredDocIds = ftr ? (syaratFiturMap[ftr.slug] || []) : [];

            return (
              <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-200 text-slate-800">
                <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
                  <div>
                    <h4 className="font-bold text-slate-900 font-display">Ubah & Mutakhirkan Berkas Usulan</h4>
                    <p className="text-xs text-slate-500">Ubah berkas yang sudah diupload untuk dikirim ke Tim Kepegawaian (Usulan #{editingPuskesmasUsulan.id})</p>
                  </div>
                  <button 
                    onClick={() => setEditingPuskesmasUsulan(null)} 
                    className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-55 rounded-lg transition"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <p className="font-bold mb-1 text-slate-950">Informasi Usulan:</p>
                    <p><strong>Pegawai:</strong> {asm?.nama_lengkap} (NIP: {asm?.nip})</p>
                    <p><strong>Jenis Layanan:</strong> {ftr?.nama_fitur}</p>
                    <p><strong>Status Saat Ini:</strong> <span className="font-bold text-amber-600">{editingPuskesmasUsulan.status}</span></p>
                  </div>

                  <div className="space-y-3">
                    <p className="font-bold text-slate-700">Persyaratan Dokumen & Berkas Terlampir:</p>
                    
                    {requiredDocIds.map(docId => {
                      const doc = masterDokumen.find(d => d.id === docId);
                      if (!doc) return null;
                      const existingFile = usulanDokumenFile.find(f => f.id_usulan === editingPuskesmasUsulan.id && f.id_dokumen === docId);

                      return (
                        <div key={docId} className="p-3 border border-slate-200 rounded-xl space-y-2 bg-white">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-slate-900">{doc.nama_dokumen}</p>
                              {existingFile ? (
                                <p className="text-[10px] text-emerald-600 font-mono">✓ Berkas aktif: {existingFile.file_name}</p>
                              ) : (
                                <p className="text-[10px] text-rose-500 font-mono">⚠️ Belum ada berkas terunggah</p>
                              )}
                            </div>
                          </div>

                          <div className="pt-1 flex items-center gap-2">
                            <input
                              type="file"
                              accept=".pdf,image/jpeg,image/png,image/jpg"
                              className="w-full text-[11px] text-slate-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (ev) => {
                                    const dataUrl = ev.target?.result as string;
                                    const existingIdx = usulanDokumenFile.findIndex(f => f.id_usulan === editingPuskesmasUsulan.id && f.id_dokumen === docId);
                                    let updatedFiles = [...usulanDokumenFile];
                                    const simulatedText = `DOKUMEN MUTAKHIR: ${doc.nama_dokumen.toUpperCase()}\nNAMA BERKAS: ${file.name}`;
                                    
                                    if (existingIdx > -1) {
                                      updatedFiles[existingIdx] = {
                                        ...updatedFiles[existingIdx],
                                        file_name: file.name,
                                        data_url: dataUrl,
                                        text_ocr_result: simulatedText
                                      };
                                    } else {
                                      const nextId = usulanDokumenFile.length > 0 ? Math.max(...usulanDokumenFile.map(f => f.id)) + 1 : 1;
                                      updatedFiles.push({
                                        id: nextId,
                                        id_usulan: editingPuskesmasUsulan.id,
                                        id_dokumen: docId,
                                        file_name: file.name,
                                        file_path: file.name,
                                        uploaded_at: new Date().toISOString(),
                                        data_url: dataUrl,
                                        text_ocr_result: simulatedText,
                                        ocr_status: 'SUCCESS'
                                      });
                                    }
                                    onUpdateUsulanDokumenFile(updatedFiles);
                                    alert(`✓ Berkas "${doc.nama_dokumen}" berhasil diperbarui dengan "${file.name}".`);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end items-center mt-6 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      if (editingPuskesmasUsulan) {
                        const updated = usulanLayanan.map(u => {
                          if (u.id === editingPuskesmasUsulan.id) {
                            return {
                              ...u,
                              status: 'Menunggu Validasi' as any,
                              catatan_perbaikan: null
                            };
                          }
                          return u;
                        });
                        onUpdateUsulanLayanan(updated);
                      }
                      setEditingPuskesmasUsulan(null);
                      alert("✓ Berkas usulan berhasil disinkronkan & dikirimkan kembali ke Tim Kepegawaian.");
                    }}
                    className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
                  >
                    Selesai & Kirim ke Tim Kepegawaian
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ======================= MODAL: CONFIRM DELETE USULAN ======================= */}
      {usulanToDelete && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 text-center font-sans">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-50 text-yellow-600 mb-4 border border-yellow-200 animate-pulse">
              <AlertTriangle size={24} />
            </div>
            <h4 className="font-bold font-display text-base uppercase tracking-wide text-slate-900">Konfirmasi Hapus Usulan</h4>
            
            <div className="bg-yellow-50/70 border border-yellow-200 rounded-xl p-4 my-3 text-left">
              <p className="text-xs text-slate-800 leading-relaxed">
                Apakah Anda yakin ingin menghapus berkas usulan <strong className="text-yellow-600">"{usulanToDelete.serviceName}"</strong> (ID: #{usulanToDelete.id}) beserta seluruh dokumen lampirannya secara permanen?
              </p>
              <p className="text-[10px] text-yellow-850 bg-yellow-100 p-2 rounded-lg border border-yellow-300/60 mt-3 font-semibold leading-normal">
                Tindakan ini tidak dapat dibatalkan. Berkas dan dokumen lampirannya akan dihapus permanen dari sistem.
              </p>
            </div>

            <div className="mt-6 flex space-x-3 justify-center">
              <button
                type="button"
                onClick={() => setUsulanToDelete(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = usulanToDelete.id;
                  const serviceName = usulanToDelete.serviceName;
                  const updatedList = usulanLayanan.filter(u => u.id !== id);
                  const updatedFiles = usulanDokumenFile.filter(f => f.id_usulan !== id);
                  onUpdateUsulanLayanan(updatedList);
                  onUpdateUsulanDokumenFile(updatedFiles);
                  setUsulanToDelete(null);
                  setSuccessToast(`✓ Berkas Usulan "${serviceName}" berhasil dihapus.`);
                }}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-900 rounded-lg text-xs font-bold transition cursor-pointer shadow-md"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= MODAL: KELOLA OPSI DROPDOWN (CRUD) ======================= */}
      {managingOptionsType && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <div>
                <h4 className="font-semibold text-slate-800 font-display text-sm">
                  Kelola Opsi Dropdown
                </h4>
                <p className="text-[10px] text-slate-400 font-mono">
                  {managingOptionsType === 'pangkat' 
                    ? 'Target Golongan Ruang Baru (Kenaikan Pangkat)' 
                    : 'Jenjang Naik Jabatan Baru (Usulan Jafung)'}
                </p>
              </div>
              <button 
                onClick={() => {
                  setManagingOptionsType(null);
                  setEditingOptionIdx(null);
                }} 
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            {/* List Current Options */}
            <div className="space-y-2 max-h-60 overflow-y-auto mb-4 p-1">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Daftar Opsi ({managingOptionsType === 'pangkat' ? pangkatOptions.length : jafungOptions.length})</p>
              
              {(managingOptionsType === 'pangkat' ? pangkatOptions : jafungOptions).map((opt, idx) => {
                const isEditingThis = editingOptionIdx === idx;
                return (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-200 gap-2">
                    {isEditingThis ? (
                      <div className="flex-grow flex gap-1 items-center">
                        <input
                          type="text"
                          value={editingOptionVal}
                          onChange={(e) => setEditingOptionVal(e.target.value)}
                          className="w-full p-1 text-xs border border-teal-500 rounded bg-white focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!editingOptionVal.trim()) return;
                            if (managingOptionsType === 'pangkat') {
                              const updated = [...pangkatOptions];
                              updated[idx] = editingOptionVal.trim();
                              setPangkatOptions(updated);
                              localStorage.setItem('simpeg_pangkat_options', JSON.stringify(updated));
                            } else {
                              const updated = [...jafungOptions];
                              updated[idx] = editingOptionVal.trim();
                              setJafungOptions(updated);
                              localStorage.setItem('simpeg_jafung_options', JSON.stringify(updated));
                            }
                            setEditingOptionIdx(null);
                          }}
                          className="p-1 text-emerald-650 hover:bg-emerald-50 rounded transition"
                          title="Simpan perubahan"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingOptionIdx(null)}
                          className="p-1 text-slate-400 hover:bg-slate-100 rounded transition"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-xs font-semibold text-slate-700">{opt}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingOptionIdx(idx);
                              setEditingOptionVal(opt);
                            }}
                            className="text-[11px] text-teal-600 hover:text-teal-800 transition font-bold"
                          >
                            Edit
                          </button>
                          <span className="text-slate-300 text-xs">|</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (managingOptionsType === 'pangkat') {
                                const updated = pangkatOptions.filter((_, i) => i !== idx);
                                setPangkatOptions(updated);
                                localStorage.setItem('simpeg_pangkat_options', JSON.stringify(updated));
                                if (pangkatBaru === opt && updated.length > 0) {
                                  setPangkatBaru(updated[0]);
                                }
                              } else {
                                const updated = jafungOptions.filter((_, i) => i !== idx);
                                setJafungOptions(updated);
                                localStorage.setItem('simpeg_jafung_options', JSON.stringify(updated));
                                if (jafungBaruLevel === opt && updated.length > 0) {
                                  setJafungBaruLevel(updated[0]);
                                }
                              }
                            }}
                            className="text-[11px] text-rose-600 hover:text-rose-850 transition font-bold"
                          >
                            Hapus
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {((managingOptionsType === 'pangkat' ? pangkatOptions : jafungOptions).length === 0) && (
                <p className="text-xs text-slate-400 italic text-center py-2">Belum ada opsi dropdown.</p>
              )}
            </div>

            {/* Add New Option Form */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!newOptionInput.trim()) return;
                const optToAdd = newOptionInput.trim();
                
                if (managingOptionsType === 'pangkat') {
                  if (pangkatOptions.includes(optToAdd)) {
                    alert("Opsi ini sudah ada!");
                    return;
                  }
                  const updated = [...pangkatOptions, optToAdd];
                  setPangkatOptions(updated);
                  localStorage.setItem('simpeg_pangkat_options', JSON.stringify(updated));
                  if (!pangkatBaru) setPangkatBaru(optToAdd);
                } else {
                  if (jafungOptions.includes(optToAdd)) {
                    alert("Opsi ini sudah ada!");
                    return;
                  }
                  const updated = [...jafungOptions, optToAdd];
                  setJafungOptions(updated);
                  localStorage.setItem('simpeg_jafung_options', JSON.stringify(updated));
                  if (!jafungBaruLevel) setJafungBaruLevel(optToAdd);
                }
                
                setNewOptionInput('');
              }}
              className="mt-4 pt-4 border-t border-slate-150 flex gap-2"
            >
              <input
                type="text"
                value={newOptionInput}
                onChange={(e) => setNewOptionInput(e.target.value)}
                placeholder="Tambah opsi baru..."
                className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-1 focus:ring-teal-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-3 bg-teal-800 text-white text-xs font-bold rounded-lg hover:bg-teal-950 transition flex items-center space-x-1 whitespace-nowrap cursor-pointer"
              >
                <Plus size={12} />
                <span>Tambah</span>
              </button>
            </form>

            <div className="flex justify-end mt-5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setManagingOptionsType(null);
                  setEditingOptionIdx(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-705 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= STATUS PREVIEW & NOTIFICATION POPUP ======================= */}
      {previewStatusUsulan && (() => {
        const asm = asnProfiles.find(a => a.id === previewStatusUsulan.id_asn);
        const ftr = masterFitur.find(f => f.id === previewStatusUsulan.id_fitur);
        
        let messageText = 'Gagal memuat preview pesan.';
        if (asm && ftr) {
          messageText = generateLayananWhatsAppMessage(asm, previewStatusUsulan.status, ftr.slug, {
            golonganLama: asm.golongan_ruang,
            catatan: previewStatusUsulan.catatan_perbaikan || undefined
          });
        }

        return (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-md animate-fade-in text-left">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] sm:max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
              {/* Header */}
              <div className="bg-gradient-to-r from-teal-800 to-emerald-900 px-4 sm:px-6 py-3.5 sm:py-4 text-white flex justify-between items-center shrink-0">
                <div>
                  <h3 className="font-bold text-xs sm:text-sm tracking-wide font-display flex items-center">
                    <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full inline-block mr-2 animate-pulse"></span>
                    Detail Status & Notifikasi Pegawai
                  </h3>
                  <p className="text-[9px] sm:text-[10px] text-teal-100 mt-0.5 opacity-80">Usulan #{previewStatusUsulan.id} &bull; {ftr?.nama_fitur}</p>
                </div>
                <button
                  onClick={() => setPreviewStatusUsulan(null)}
                  className="bg-white/10 hover:bg-white/20 text-white rounded-lg p-1.5 transition cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
                {/* Meta Detail Info Grid */}
                <div className="bg-slate-50 rounded-xl p-3.5 sm:p-4 border border-slate-100 space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Nama Pegawai</p>
                      <p className="font-semibold text-slate-800 mt-0.5">{asm?.nama_lengkap || 'Tidak Diketahui'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">NIP / Identitas</p>
                      <p className="font-mono text-slate-700 mt-0.5">{asm?.nip || '-'}</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-200/60 pt-3 sm:pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Layanan Kepegawaian</p>
                      <p className="font-semibold text-teal-900 mt-0.5">{ftr?.nama_fitur || 'Layanan Kepegawaian'}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status Berkas Saat Ini</p>
                      <div className="mt-1">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold ${
                          previewStatusUsulan.status === 'Draft' ? 'bg-slate-100 text-slate-600' :
                          previewStatusUsulan.status === 'Menunggu Validasi' ? 'bg-amber-100 text-amber-800' :
                          previewStatusUsulan.status === 'Usulan Dikirim ke BKD' ? 'bg-indigo-100 text-indigo-800 font-bold' :
                          previewStatusUsulan.status === 'Perbaikan Berkas' ? 'bg-rose-100 text-rose-800 animate-pulse' :
                          previewStatusUsulan.status === 'Diproses' ? 'bg-blue-100 text-blue-800' :
                          previewStatusUsulan.status === 'Selesai' ? 'bg-emerald-100 text-emerald-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {previewStatusUsulan.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Chat Preview */}
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <label className="text-[11px] sm:text-xs font-bold text-slate-700 flex items-center space-x-1">
                      <span>💬 Notifikasi WhatsApp Dikirim ke Pegawai</span>
                    </label>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(messageText);
                        alert("✓ Notifikasi pesan berhasil disalin ke clipboard!");
                      }}
                      className="text-[10px] font-bold text-teal-800 hover:text-teal-950 flex items-center justify-center space-x-1 border border-teal-100 px-2 py-1 sm:py-0.5 rounded bg-teal-50/50 hover:bg-teal-50 transition cursor-pointer self-start sm:self-auto"
                    >
                      <Copy size={10} />
                      <span>Salin Pesan</span>
                    </button>
                  </div>

                  {/* High Fidelity WhatsApp UI style widget */}
                  <div className="border border-emerald-100/80 rounded-xl bg-[#ece5dd] p-3 sm:p-4 text-xs font-sans relative overflow-hidden">
                    {/* Background pattern mask */}
                    <div className="absolute inset-0 bg-[radial-gradient(#dcf8c6_1px,transparent_1px)] [background-size:16px_16px] opacity-25 pointer-events-none"></div>

                    {/* Chat Bubble */}
                    <div className="relative bg-white text-slate-800 rounded-lg p-3 shadow-md max-w-[95%] sm:max-w-[92%] ml-1 border-r-4 border-r-emerald-500 rounded-tl-none">
                      <div className="absolute top-0 -left-2 w-0 h-0 border-t-[8px] border-t-white border-l-[8px] border-l-transparent"></div>
                      <p className="font-mono text-[10.5px] sm:text-[11.5px] leading-relaxed whitespace-pre-wrap select-all">
                        {messageText}
                      </p>
                      <div className="text-right text-[9px] text-slate-400 mt-1.5 font-semibold">
                        {formatDate(previewStatusUsulan.tanggal_pengusulan.split('T')[0])} ✓✓
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[9px] sm:text-[10px] text-slate-400 italic text-center">
                  * Status dokumen ini tersinkronisasi langsung dengan dashboard kepegawaian mandiri pegawai.
                </p>
              </div>

              {/* Bottom Actions */}
              <div className="bg-slate-50 px-4 sm:px-6 py-3 sm:py-4 flex justify-end border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setPreviewStatusUsulan(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer w-full sm:w-auto text-center"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ======================= IN-APP SUCCESS TOAST ======================= */}
      {successToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-white border border-yellow-500/30 px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="h-2 w-2 rounded-full bg-yellow-500 animate-ping mr-1" />
          <div className="bg-yellow-50/70 border border-yellow-200/50 px-3 py-1.5 rounded-lg">
            <span className="text-xs font-medium text-slate-800">
              {successToast.split(/("[^"]*")/g).map((part, index) => {
                if (part.startsWith('"') && part.endsWith('"')) {
                  return <span key={index} className="text-yellow-600 font-bold">{part}</span>;
                }
                if (index === 0 && (part.startsWith('✓') || part.startsWith('⚠️') || part.startsWith('❌'))) {
                  const icon = part[0];
                  const rest = part.slice(1);
                  return (
                    <span key={index}>
                      <span className="text-yellow-600 font-bold mr-1">{icon}</span>
                      <span className="text-slate-800">{rest}</span>
                    </span>
                  );
                }
                return <span key={index} className="text-slate-800">{part}</span>;
              })}
            </span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-slate-400 hover:text-slate-800 text-xs font-bold pl-2 cursor-pointer">×</button>
        </div>
      )}

    </div>
  );
}
