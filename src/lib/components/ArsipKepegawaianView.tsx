import React, { useState } from 'react';
import { 
  Folder, 
  FolderCheck, 
  Download, 
  Eye, 
  Upload, 
  Plus, 
  Search, 
  Calendar, 
  User, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  FileText,
  Trash2,
  Info,
  X,
  FileDown
} from 'lucide-react';
import { Puskesmas, ASNProfile, ArsipKepegawaian } from '../../types';

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

interface ArsipKepegawaianViewProps {
  currentRole: 'admin_dinkes' | 'admin_puskesmas';
  selectedPuskesmasId: number;
  puskesmasList: Puskesmas[];
  asnProfiles: ASNProfile[];
  arsipList: ArsipKepegawaian[];
  onUpdateArsipList: (updated: ArsipKepegawaian[]) => void;
  onUpdateAsnProfiles: (updated: ASNProfile[]) => void;
}

export default function ArsipKepegawaianView({
  currentRole,
  selectedPuskesmasId,
  puskesmasList,
  asnProfiles,
  arsipList,
  onUpdateArsipList,
  onUpdateAsnProfiles
}: ArsipKepegawaianViewProps) {
  // Navigation: Active ASN
  const [selectedAsnId, setSelectedAsnId] = useState<number | null>(() => {
    // Default to the first available employee matching visibility rules
    const visible = asnProfiles.filter(p => currentRole === 'admin_dinkes' || p.id_puskesmas === selectedPuskesmasId);
    return visible.length > 0 ? visible[0].id : null;
  });

  // State filters for Employee List
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState<string>(
    currentRole === 'admin_dinkes' ? 'ALL' : String(selectedPuskesmasId)
  );
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Archive interactive states
  const [activeKelompok, setActiveKelompok] = useState<string>('Dasar');
  const [selectedArsipForPreview, setSelectedArsipForPreview] = useState<ArsipKepegawaian | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Custom interactive confirmation states
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<{ id: number; name: string } | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Auto-clear toast after 5 seconds
  React.useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => {
        setSuccessToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  // New File Upload Form States
  const [newNamaBerkas, setNewNamaBerkas] = useState('');
  const [newKategori, setNewKategori] = useState<'Dasar' | 'Mutasi' | 'Pendidikan' | 'Personal' | 'Kinerja' | 'PPPK_Khusus' | 'PKWT_Khusus'>('Dasar');
  const [uploadNote, setUploadNote] = useState('');
  const [strExpiryDate, setStrExpiryDate] = useState('');
  const [pkwtYear, setPkwtYear] = useState('2026');
  const [simulatedFileName, setSimulatedFileName] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFileDataUrl, setUploadedFileDataUrl] = useState('');

  // PPPK Paruh Waktu editing state for attributes on ASN Profile
  const [isEditingPpwAttrs, setIsEditingPpwAttrs] = useState(false);
  const [ppwHours, setPpwHours] = useState<number>(20);
  const [ppwScheduleFile, setPpwScheduleFile] = useState('Surat_Jadwal_Dinas_ParuhWaktu.pdf');

  // Visible Employees based on authorization
  const visibleAsnProfiles = asnProfiles.filter(asn => {
    // Multi-tenant ACL: Dinas sees everyone, Puskesmas sees only their own staff
    if (currentRole === 'admin_puskesmas' && asn.id_puskesmas !== selectedPuskesmasId) {
      return false;
    }
    // Search
    if (employeeSearch) {
      const q = employeeSearch.toLowerCase();
      const matchName = asn.nama_lengkap.toLowerCase().includes(q);
      const matchNip = asn.nip.includes(q);
      if (!matchName && !matchNip) return false;
    }
    // Unit filter
    if (currentRole === 'admin_dinkes' && unitFilter !== 'ALL') {
      if (asn.id_puskesmas !== Number(unitFilter)) return false;
    }
    // Detail status filter
    if (statusFilter !== 'ALL') {
      if (asn.status_pegawai_detail !== statusFilter) return false;
    }
    return true;
  });

  const selectedASNObj = asnProfiles.find(a => a.id === selectedAsnId);
  const file = selectedArsipForPreview;
  const unitKerja = selectedASNObj 
    ? (selectedASNObj.id_puskesmas === 100 
        ? 'UPT Puskesmas Sedau' 
        : (puskesmasList.find(p => p.id === selectedASNObj.id_puskesmas)?.nama_puskesmas || 'UPT Puskesmas Sedau'))
    : '';

  // States to track preview of files in Arsip Kepegawaian context
  const [profilePreviewUrl, setProfilePreviewUrl] = useState<string | null>(null);
  const [profilePreviewType, setProfilePreviewType] = useState<'PDF' | 'IMAGE' | 'FALLBACK'>('FALLBACK');
  const [previewImageError, setPreviewImageError] = useState<boolean>(false);
  const profileUrlRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    setPreviewImageError(false);
    if (!selectedArsipForPreview || !selectedASNObj) {
      if (profileUrlRef.current) {
        URL.revokeObjectURL(profileUrlRef.current);
        profileUrlRef.current = null;
      }
      setProfilePreviewUrl(null);
      return;
    }

    const file = selectedArsipForPreview;
    let localUrl = '';
    let type: 'PDF' | 'IMAGE' | 'FALLBACK' = 'PDF';

    if (file.file_path && file.file_path.startsWith('data:')) {
      try {
        const blob = dataURLtoBlob(file.file_path);
        localUrl = URL.createObjectURL(blob);
        if (file.file_path.startsWith('data:image/') || file.file_name?.match(/\.(jpe?g|png|gif)$/i)) {
          type = 'IMAGE';
        } else {
          type = 'PDF';
        }
      } catch (err) {
        console.error("Gagal convert dataURL ke blob:", err);
        const unitKerja = selectedASNObj.id_puskesmas === 100 
          ? 'UPT Puskesmas Sedau' 
          : getPuskesmasName(selectedASNObj.id_puskesmas);
        const pdfLines = [
          `ID DOKUMEN ARSIP: LOBAR-ARSDIG-${file.id}`,
          `NAMA DOKUMEN: ${file.nama_berkas}`,
          `NAMA PEGAWAI: ${selectedASNObj.nama_lengkap}`,
          `NIP PEGAWAI: ${selectedASNObj.nip}`,
          `UNIT KERJA: ${unitKerja}`,
          `GOLONGAN: ${selectedASNObj.golongan_ruang}`,
          `STATUS PEG: ${selectedASNObj.status_pegawai_detail}`,
          `KELOMPOK MAP: ${file.kategori_kelompok}`,
          `SUMBER RIWAYAT: ${file.source}`,
          `CATATAN: ${file.notes || '-'}`
        ];
        const blob = generateMinimalPDF(file.nama_berkas, pdfLines);
        localUrl = URL.createObjectURL(blob);
        type = 'PDF';
      }
    } else {
      const unitKerja = selectedASNObj.id_puskesmas === 100 
        ? 'UPT Puskesmas Sedau' 
        : getPuskesmasName(selectedASNObj.id_puskesmas);
      const pdfLines = [
        `ID DOKUMEN ARSIP: LOBAR-ARSDIG-${file.id}`,
        `NAMA DOKUMEN: ${file.nama_berkas}`,
        `NAMA PEGAWAI: ${selectedASNObj.nama_lengkap}`,
        `NIP PEGAWAI: ${selectedASNObj.nip}`,
        `UNIT KERJA: ${unitKerja}`,
        `GOLONGAN: ${selectedASNObj.golongan_ruang}`,
        `STATUS PEG: ${selectedASNObj.status_pegawai_detail}`,
        `KELOMPOK MAP: ${file.kategori_kelompok}`,
        `SUMBER RIWAYAT: ${file.source}`,
        `CATATAN: ${file.notes || '-'}`
      ];
      const blob = generateMinimalPDF(file.nama_berkas, pdfLines);
      localUrl = URL.createObjectURL(blob);
      type = 'PDF';
    }

    if (profileUrlRef.current && profileUrlRef.current !== localUrl) {
      URL.revokeObjectURL(profileUrlRef.current);
    }

    profileUrlRef.current = localUrl;
    setProfilePreviewUrl(localUrl);
    setProfilePreviewType(type);
  }, [selectedArsipForPreview?.id, selectedArsipForPreview?.file_path]);

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

  const handleOpenPreview = (file: ArsipKepegawaian) => {
    let isImage = false;
    if (file.file_path && file.file_path.startsWith('data:')) {
      if (file.file_path.startsWith('data:image/') || file.file_name?.match(/\.(jpe?g|png|gif)$/i)) {
        isImage = true;
      }
    }

    if (isImage) {
      setSelectedArsipForPreview(file);
    } else {
      let localUrl = '';
      if (file.file_path && file.file_path.startsWith('data:')) {
        try {
          const blob = dataURLtoBlob(file.file_path);
          localUrl = URL.createObjectURL(blob);
        } catch (err) {
          console.error("Gagal convert dataURL ke blob:", err);
          const unitKerjaName = selectedASNObj
            ? (selectedASNObj.id_puskesmas === 100 ? 'UPT Puskesmas Sedau' : getPuskesmasName(selectedASNObj.id_puskesmas))
            : 'UPT Puskesmas Sedau';
          const pdfLines = [
            `ID DOKUMEN ARSIP: LOBAR-ARSDIG-${file.id}`,
            `NAMA DOKUMEN: ${file.nama_berkas}`,
            `NAMA PEGAWAI: ${selectedASNObj?.nama_lengkap || ''}`,
            `NIP PEGAWAI: ${selectedASNObj?.nip || ''}`,
            `UNIT KERJA: ${unitKerjaName}`,
            `GOLONGAN: ${selectedASNObj?.golongan_ruang || ''}`,
            `STATUS PEG: ${selectedASNObj?.status_pegawai_detail || ''}`,
            `KELOMPOK MAP: ${file.kategori_kelompok}`,
            `SUMBER RIWAYAT: ${file.source}`,
            `CATATAN: ${file.notes || '-'}`
          ];
          const blob = generateMinimalPDF(file.nama_berkas, pdfLines);
          localUrl = URL.createObjectURL(blob);
        }
      } else {
        const unitKerjaName = selectedASNObj
          ? (selectedASNObj.id_puskesmas === 100 ? 'UPT Puskesmas Sedau' : getPuskesmasName(selectedASNObj.id_puskesmas))
          : 'UPT Puskesmas Sedau';
        const pdfLines = [
          `ID DOKUMEN ARSIP: LOBAR-ARSDIG-${file.id}`,
          `NAMA DOKUMEN: ${file.nama_berkas}`,
          `NAMA PEGAWAI: ${selectedASNObj?.nama_lengkap || ''}`,
          `NIP PEGAWAI: ${selectedASNObj?.nip || ''}`,
          `UNIT KERJA: ${unitKerjaName}`,
          `GOLONGAN: ${selectedASNObj?.golongan_ruang || ''}`,
          `STATUS PEG: ${selectedASNObj?.status_pegawai_detail || ''}`,
          `KELOMPOK MAP: ${file.kategori_kelompok}`,
          `SUMBER RIWAYAT: ${file.source}`,
          `CATATAN: ${file.notes || '-'}`
        ];
        const blob = generateMinimalPDF(file.nama_berkas, pdfLines);
        localUrl = URL.createObjectURL(blob);
      }

      if (localUrl) {
        window.open(localUrl, '_blank');
      }
    }
  };

  // Get archives of selected ASN
  const selectedAsnArchives = arsipList.filter(file => file.id_asn === selectedAsnId);

  const getPuskesmasName = (id: number) => {
    return puskesmasList.find(p => p.id === id)?.nama_puskesmas || 'UPT Puskesmas Sedau';
  };

  // Preset file names to help users select standard documents accurately
  const documentPresets: Record<string, string[]> = {
    Dasar: [
      "SK CPNS (Calon Pegawai Negeri Sipil)",
      "SK PNS (Pegawai Negeri Sipil) / SK Pengangkatan PPPK",
      "Surat Tanda Tamat Pendidikan & Pelatihan (STTPP) / Prajabatan",
      "Surat Pernyataan Melaksanakan Tugas (SPMT)",
      "Kartu Pegawai (KARPEG) / Kartu P3K"
    ],
    Mutasi: [
      "Buku Riwayat Golongan (Seluruh SK Kenaikan Pangkat)",
      "Buku Riwayat Jabatan (SK Jafung / Struktural / Pelantikan)",
      "Buku Riwayat Tempat Tugas (SK Mutasi / Penugasan Khusus / Plt / Plh)"
    ],
    Pendidikan: [
      "Ijazah & Transkrip Nilai Terakhir (Pencantuman Gelar)",
      "STR (Surat Tanda Registrasi) Aktif",
      "SIP (Surat Izin Praktik) Fasilitas Pelayanan Kesehatan",
      "Sertifikat Pelatihan Teknis / Workshop"
    ],
    Personal: [
      "KTP & Kartu Keluarga (KK) Terbaru",
      "Akta Nikah / Akta Cerai Resmi",
      "Akta Kelahiran Anak (Tanggungan Gaji)",
      "BPJS Kesehatan & Karsa / Taspen"
    ],
    Kinerja: [
      "SKP (Sasaran Kinerja Pegawai) Tahunan Evaluasi Cetak",
      "SK PAK (Penetapan Angka Kredit) Integrasi & Konversi",
      "Bukti Surat Laporan Kekayaan LHKPN / LHKASN",
      "Surat Keputusan Hukuman Disiplin (Pencegahan Usulan)"
    ],
    PPPK_Khusus: [
      "SK Pengangkatan PPPK (Awal s.d. Akhir)",
      "Perjanjian Kerja Kontrak PPPK Resmi",
      "Surat Pernyataan Melaksanakan Tugas (SPMT)",
      "Sertifikat Orientasi Pengenalan Nilai & Etika",
      "SK Perpanjangan Perjanjian Kerja"
    ],
    PKWT_Khusus: [
      "SK Pengangkatan Tenaga Kontrak / Honor Daerah",
      "Dokumen Kontrak Kerja PKWT Tahunan",
      "Surat Rekomendasi Perpanjangan Kontrak Pimpinan",
      "Sertifikat Kompetensi Aktif / STR & SIP PKWT"
    ]
  };

  // Dynamic automatic calculation of directory completion indicators (E-Folder Checklists)
  const calcFolderStatus = (asn: ASNProfile, kategori: string) => {
    const files = arsipList.filter(f => f.id_asn === asn.id && f.kategori_kelompok === kategori);
    if (files.length === 0) return 'RED'; // Red = Empty
    
    // Define standard targets based on categories
    let target = 2;
    if (kategori === 'Dasar') target = 3;
    if (kategori === 'Personal') target = 2;
    if (kategori === 'Pendidikan' && (asn.jenis_pegawai === 'Jafung_Kesehatan')) target = 3; // nakes needs STR, SIP, Ijazah

    if (files.length >= target) {
      return 'GREEN'; // Complete
    }
    return 'YELLOW'; // Incomplete
  };

  // Trigger HTML download with clean PDF format naming rule: (nama-Nip-puskesmas mana/dinkes ppkb)
  const handleDownloadPDF = (arsip: ArsipKepegawaian) => {
    if (!selectedASNObj) return;

    const asnNameClean = selectedASNObj.nama_lengkap.replace(/\s+/g, '_');
    const asnNip = selectedASNObj.nip;
    const unitKerja = selectedASNObj.id_puskesmas === 100 
      ? 'UPT Puskesmas Sedau' 
      : getPuskesmasName(selectedASNObj.id_puskesmas);
    
    // Clean dangerous slash symbols from path name
    const unitKerjaClean = unitKerja.replace(/[\/\\?%*:|"<>]/g, '_');
    
    // Preserve the original file's extension to ensure it downloads as the original photo/document format
    const originalExt = arsip.file_name ? arsip.file_name.substring(arsip.file_name.lastIndexOf('.')) : '.pdf';
    const outputFilename = `${asnNameClean}-${asnNip}-${unitKerjaClean}${originalExt}`;

    let blob: Blob;
    let isOriginal = false;

    if (arsip.file_path && arsip.file_path.startsWith('data:')) {
      try {
        blob = dataURLtoBlob(arsip.file_path);
        isOriginal = true;
      } catch (err) {
        console.error("Gagal melakukan pencanderaan berkas base64:", err);
        // Fallback to text lines in PDF
        const pdfLines = [
          `ID DOKUMEN ARSIP: LOBAR-ARSDIG-${arsip.id}`,
          `NAMA DOKUMEN: ${arsip.nama_berkas}`,
          `NAMA PEGAWAI: ${selectedASNObj.nama_lengkap}`,
          `NIP PEGAWAI: ${selectedASNObj.nip}`,
          `UNIT KERJA: ${unitKerja}`,
          `GOLONGAN: ${selectedASNObj.golongan_ruang}`,
          `STATUS PEG: ${selectedASNObj.status_pegawai_detail}`,
          `KELOMPOK MAP: ${arsip.kategori_kelompok}`,
          `SUMBER RIWAYAT: ${arsip.source}`,
          `CATATAN: ${arsip.notes || '-'}`
        ];
        blob = generateMinimalPDF(arsip.nama_berkas, pdfLines);
      }
    } else {
      // Fallback to standard clean legal PDF metadata format for mock/pre-seeded files
      const pdfLines = [
        `ID DOKUMEN ARSIP: LOBAR-ARSDIG-${arsip.id}`,
        `NAMA DOKUMEN: ${arsip.nama_berkas}`,
        `NAMA PEGAWAI: ${selectedASNObj.nama_lengkap}`,
        `NIP PEGAWAI: ${selectedASNObj.nip}`,
        `UNIT KERJA: ${unitKerja}`,
        `GOLONGAN: ${selectedASNObj.golongan_ruang}`,
        `STATUS PEG: ${selectedASNObj.status_pegawai_detail}`,
        `KELOMPOK MAP: ${arsip.kategori_kelompok}`,
        `SUMBER RIWAYAT: ${arsip.source}`,
        `CATATAN: ${arsip.notes || '-'}`
      ];
      blob = generateMinimalPDF(arsip.nama_berkas, pdfLines);
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
      alert(`✓ Berhasil Mengunduh Berkas!\nFile: ${outputFilename}\n(Sistem otomatis mengekspor ke dalam salinan .PDF yang sah)`);
    }
  };

  // Manual File Upload handler
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSimulatedFileName(file.name);
      if (!newNamaBerkas || newNamaBerkas === 'DOKUMEN_LAINNYA') {
        setNewNamaBerkas(file.name.replace(/\.[^/.]+$/, ""));
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedFileDataUrl(event.target?.result as string || '');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSimulatedFileName(file.name);
      if (!newNamaBerkas || newNamaBerkas === 'DOKUMEN_LAINNYA') {
        const cleanedName = file.name.replace(/\.[^/.]+$/, "");
        setNewNamaBerkas(cleanedName);
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedFileDataUrl(event.target?.result as string || '');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsnId) {
      alert("⚠️ Harap pilih pegawai tujuan arsip.");
      return;
    }
    
    // Fallback nama berkas jika masih DOKUMEN_LAINNYA atau kosong
    const effectiveNamaBerkas = (!newNamaBerkas || newNamaBerkas === 'DOKUMEN_LAINNYA')
      ? (simulatedFileName ? simulatedFileName.replace(/\.[^/.]+$/, "") : "Dokumen Kepegawaian")
      : newNamaBerkas;

    const nextId = arsipList.length > 0 ? Math.max(...arsipList.map(f => f.id)) + 1 : 1;
    const finalFileName = simulatedFileName || `${effectiveNamaBerkas.toLowerCase().replace(/\s+/g, '_')}_upload.pdf`;

    const newFile: ArsipKepegawaian = {
      id: nextId,
      id_asn: selectedAsnId,
      nama_berkas: effectiveNamaBerkas,
      kategori_kelompok: newKategori,
      file_name: finalFileName,
      file_path: uploadedFileDataUrl || "data:application/pdf;base64,SIMULATED_MANUAL_UPLOAD",
      uploaded_at: new Date().toISOString(),
      source: "Upload Kerja",
      notes: uploadNote.trim() || undefined,
      str_expired_date: newKategori === 'Pendidikan' && effectiveNamaBerkas.includes('STR') && strExpiryDate ? strExpiryDate : undefined,
      pkwt_tahun: newKategori === 'PKWT_Khusus' ? Number(pkwtYear) : undefined
    };

    onUpdateArsipList([...arsipList, newFile]);
    setActiveKelompok(newKategori);
    
    // Clear Form
    setNewNamaBerkas('');
    setUploadNote('');
    setStrExpiryDate('');
    setSimulatedFileName('');
    setUploadedFileDataUrl('');
    setIsUploadOpen(false);
    setSuccessToast(`✓ Berkas "${effectiveNamaBerkas}" berhasil diunggah ke arsip ${newKategori}!`);
  };

  const handleDeleteFile = (id: number, name: string) => {
    setConfirmDeleteFile({ id, name });
  };

  const handleSavePPWAttributes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedASNObj) return;

    const updated = asnProfiles.map(p => {
      if (p.id === selectedASNObj.id) {
        return {
          ...p,
          pppw_jumlah_jam_kerja_per_minggu: ppwHours,
          pppw_surat_kesepakatan_file: ppwScheduleFile
        };
      }
      return p;
    });

    onUpdateAsnProfiles(updated);
    setIsEditingPpwAttrs(false);

    // Also auto-inject schedule file into archives right away to streamline PKWT-like transparency!
    const matchesScheduleInArsip = arsipList.some(
      f => f.id_asn === selectedASNObj.id && f.nama_berkas.includes("Surat Kesepakatan Jadwal Dinas")
    );

    if (!matchesScheduleInArsip) {
      const nextId = arsipList.length > 0 ? Math.max(...arsipList.map(f => f.id)) + 1 : 1;
      const newScheduleFile: ArsipKepegawaian = {
        id: nextId,
        id_asn: selectedASNObj.id,
        nama_berkas: "Surat Kesepakatan Jadwal Dinas Terjadwal",
        kategori_kelompok: "PPPK_Khusus",
        file_name: ppwScheduleFile,
        file_path: "PPPW-SCHEDULE-AUTOMATION-BLOB",
        uploaded_at: new Date().toISOString(),
        source: "Upload Kerja",
        notes: `Sesuai jam dinas per minggu yaitu ${ppwHours} jam.`
      };
      onUpdateArsipList([...arsipList, newScheduleFile]);
    }

    alert(`✓ Atribut PK/PW berhasil dimutakhirkan!\nJadwal Dinas "${ppwScheduleFile}" otomatis terarsip dalam folder PPPK Khusus.`);
  };

  return (
    <div className="space-y-6" id="digital_archive_workspace">
      
      {/* HEADER SECTION */}
      <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-800">
            Arsip Kepegawaian &amp; Dokumen Digital
          </h2>
          <p className="text-xs text-slate-500">
            Pustaka arsip e-Folder terpadu pegawai UPT Puskesmas Sedau &amp; Jaringan
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => {
              if (!selectedAsnId) {
                alert("Harap pilih pegawai terlebih dahulu.");
                return;
              }
              setNewKategori('Dasar');
              setIsUploadOpen(true);
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer shadow-sm hover:shadow-md"
          >
            <Upload size={13} />
            <span>Unggah Berkas Baru</span>
          </button>
        </div>
      </div>

      {/* CORE PARTITION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: LIST PEGAWAI SELECTION (4 Columns) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/60 p-5 rounded-2xl space-y-4">
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center space-x-1.5">
              <span>Daftar Pegawai Aktif</span>
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 rounded-full font-bold">
                {visibleAsnProfiles.length}
              </span>
            </h3>
            
            {/* Search inputs */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400">
                <Search size={13} />
              </span>
              <input
                type="text"
                placeholder="Cari Nama / NIP..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-2 border border-slate-100 bg-slate-50 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none transition"
              />
            </div>

            {/* Dinkes Unit filtering dropdown */}
            {currentRole === 'admin_dinkes' && (
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={unitFilter}
                  onChange={(e) => setUnitFilter(e.target.value)}
                  className="w-full text-[11px] p-2 border border-slate-100 bg-slate-50 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="ALL">Semua Unit (UPT Puskesmas Sedau)</option>
                  {puskesmasList.map(pk => (
                    <option key={pk.id} value={pk.id}>{pk.nama_puskesmas}</option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full text-[11px] p-2 border border-slate-100 bg-slate-50 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="PNS">PNS Only</option>
                  <option value="PPPK_Penuh_Waktu">PPPK Penuh</option>
                  <option value="PPPK_Paruh_Waktu">PPPK Paruh</option>
                  <option value="Non_ASN">Non-ASN/PKWT</option>
                </select>
              </div>
            )}
          </div>

          {/* Pegawai cards stack */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {visibleAsnProfiles.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-100 rounded-xl text-slate-400 text-xs">
                Tidak ada pegawai yang cocok.
              </div>
            ) : (
              visibleAsnProfiles.map(asn => {
                const totalFiles = arsipList.filter(f => f.id_asn === asn.id).length;
                const isSelected = selectedAsnId === asn.id;
                
                return (
                  <button
                    key={asn.id}
                    onClick={() => {
                      setSelectedAsnId(asn.id);
                      setIsEditingPpwAttrs(false);
                      // set initial values for PPPW schedule edits
                      setPpwHours(asn.pppw_jumlah_jam_kerja_per_minggu || 20);
                      setPpwScheduleFile(asn.pppw_surat_kesepakatan_file || 'Surat_Jadwal_Dinas_ParuhWaktu.pdf');
                    }}
                    className={`w-full text-left p-3 border rounded-xl flex items-center justify-between transition cursor-pointer text-xs ${isSelected ? 'bg-emerald-50 border-emerald-300 text-slate-800 font-medium' : 'bg-slate-50/50 hover:bg-slate-50 border-slate-100 hover:border-slate-300 text-slate-700'}`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-slate-800 truncate">{asn.nama_lengkap}</p>
                      <p className="text-[10px] text-slate-400 font-mono">NIP {asn.nip}</p>
                      
                      <div className="flex items-center space-x-1.5 mt-1 select-none">
                        <span className="text-[9px] bg-slate-100 text-slate-600 px-1 py-0.5 rounded uppercase font-bold shrink-0">
                          {asn.status_pegawai_detail}
                        </span>
                        <span className="text-[9px] text-slate-400 truncate max-w-[120px]">
                          {getPuskesmasName(asn.id_puskesmas)}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] bg-slate-200/60 text-slate-800 font-bold px-2 py-1 rounded-lg font-mono">
                        {totalFiles} Berkas
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: REPOSITORY WORKSPACE (8 Columns) */}
        <div className="lg:col-span-8 space-y-6">
          
          {selectedASNObj ? (
            <>
              {/* SELECTED EMPLOYEE OVERVIEW CARD */}
              <div className="bg-white border border-slate-200/60 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-800 shrink-0 select-none">
                    <User size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-[16px] text-slate-800 leading-tight">
                      {selectedASNObj.nama_lengkap} {selectedASNObj.gelar_belakang && `, ${selectedASNObj.gelar_belakang}`}
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      NIP/Identitas: {selectedASNObj.nip} &bull; Unit Penempatan: <span className="text-emerald-700 font-semibold">{getPuskesmasName(selectedASNObj.id_puskesmas)}</span>
                    </p>
                    <div className="flex flex-wrap gap-2 mt-1.5 items-center">
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md">
                        {selectedASNObj.status_pegawai_detail.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-mono">
                        {selectedASNObj.golongan_ruang}
                      </span>
                      
                      {/* Interactive edit for PPPK Paruh Waktu schedule */}
                      {selectedASNObj.status_pegawai_detail === 'PPPK_Paruh_Waktu' && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-bold">
                          Paruh Waktu: {selectedASNObj.pppw_jumlah_jam_kerja_per_minggu || 20} Jam/Minggu
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 self-stretch md:self-auto shrink-0">
                  {selectedASNObj.status_pegawai_detail === 'PPPK_Paruh_Waktu' && (
                    <button
                      onClick={() => {
                        setIsEditingPpwAttrs(!isEditingPpwAttrs);
                        setPpwHours(selectedASNObj.pppw_jumlah_jam_kerja_per_minggu || 20);
                        setPpwScheduleFile(selectedASNObj.pppw_surat_kesepakatan_file || 'Surat_Jadwal_Dinas_ParuhWaktu.pdf');
                      }}
                      className="px-3.5 py-1.5 border border-amber-400/40 bg-amber-500/5 hover:bg-amber-500/10 text-amber-800 rounded-lg text-xs font-semibold cursor-pointer transition flex items-center space-x-1"
                    >
                      <span>Atur Jam & Jadwal Dinas PK/PW</span>
                    </button>
                  )}
                </div>
              </div>

              {/* PPPK PARUH WAKTU ATTRIBUTE UPDATES DRAWER/CARD */}
              {isEditingPpwAttrs && (
                <form onSubmit={handleSavePPWAttributes} className="bg-amber-500/[0.03] border border-amber-500/20 p-5 rounded-2xl space-y-4 animate-in slide-in-from-top-4 duration-300">
                  <div className="flex justify-between items-center border-b border-amber-500/10 pb-2">
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center space-x-1.5">
                      <span className="w-1.5 h-3 bg-amber-500 rounded-full inline-block"></span>
                      <span>Konfigurasi Status Khusus PPPK Paruh Waktu</span>
                    </h4>
                    <button type="button" onClick={() => setIsEditingPpwAttrs(false)}>
                      <X size={15} className="text-amber-700" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="text-slate-600 font-semibold block">Jumlah Jam Kerja per Minggu (Jam)</label>
                      <input
                        type="number"
                        required
                        min={1}
                        max={40}
                        value={ppwHours}
                        onChange={(e) => setPpwHours(Number(e.target.value))}
                        className="w-full p-2 border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                        placeholder="Contoh: 20"
                      />
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Atribut ketenagakerjaan transparan bagi auditor dinkes terhadap status paruh-waktu yang terdaftar.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-600 font-semibold block">Berkas Surat Kesepakatan Jadwal Dinas (Upload Link)</label>
                      <input
                        type="text"
                        required
                        value={ppwScheduleFile}
                        onChange={(e) => setPpwScheduleFile(e.target.value)}
                        className="w-full p-2 border border-slate-200 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-slate-700"
                        placeholder="Contoh: Surat_Kontrak_Dinas_2026.pdf"
                      />
                      <p className="text-[10px] text-slate-500 leading-normal">
                        Nama berkas fisik kesepakatan jam dinas di UPT Puskesmas bersangkutan.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setIsEditingPpwAttrs(false)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-lg transition"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow transition"
                    >
                      Simpan Atribut PK/PW
                    </button>
                  </div>
                </form>
              )}

              {/* AUTOMATIC E-FOLDER DIRECTORY CHECKLIST PORTALS */}
              <div className="space-y-2.5">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider pl-1 select-none">
                  Status Kelengkapan e-Folder (Indikator Checklist Digital)
                </h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3.5 text-xs">
                  {[
                    { key: 'Dasar', label: 'E-Folder Dasar', desc: 'Core Identity' },
                    { key: 'Mutasi', label: 'Career Mutasi', desc: 'Journey' },
                    { key: 'Pendidikan', label: 'Pendidikan', desc: 'Credentials' },
                    { key: 'Personal', label: 'Personal & KK', desc: 'Civil Registry' },
                    { key: 'Kinerja', label: 'Kinerja & PAK', desc: 'Evaluations' },
                  ].map(fold => {
                    const status = calcFolderStatus(selectedASNObj, fold.key);
                    const filesCount = arsipList.filter(f => f.id_asn === selectedASNObj.id && f.kategori_kelompok === fold.key).length;
                    
                    return (
                      <button
                        key={fold.key}
                        onClick={() => setActiveKelompok(fold.key)}
                        className={`p-3 border rounded-xl text-left transition relative select-none cursor-pointer flex flex-col justify-between ${activeKelompok === fold.key ? 'bg-slate-900 border-slate-900 text-white shadow-sm' : 'bg-slate-50 hover:bg-slate-100 border-slate-100/80 text-slate-600'}`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            {status === 'GREEN' ? (
                              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block" title="Lengkap (Min. Dokumen Terpenuhi)"></span>
                            ) : status === 'YELLOW' ? (
                              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full inline-block" title="Belum Lengkap"></span>
                            ) : (
                              <span className="w-2.5 h-2.5 bg-rose-500 rounded-full inline-block" title="Kosong"></span>
                            )}
                            
                            <span className={`text-[10px] font-mono leading-none ${activeKelompok === fold.key ? 'text-zinc-400' : 'text-slate-400'}`}>
                              {filesCount} file
                            </span>
                          </div>

                          <p className="font-bold text-[11px] leading-tight truncate">{fold.label}</p>
                          <p className={`text-[9px] truncate tracking-normal ${activeKelompok === fold.key ? 'text-zinc-400' : 'text-slate-400'}`}>{fold.desc}</p>
                        </div>

                        <div className="mt-2.5 flex items-center justify-end">
                          <span className={`text-[9px] font-bold px-1 py-0.2 rounded uppercase ${status === 'GREEN' ? 'bg-emerald-500/10 text-emerald-500' : status === 'YELLOW' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'}`}>
                            {status === 'GREEN' ? '🟢 LENGKAP' : status === 'YELLOW' ? '🟡 PARSIAL' : '🔴 KOSONG'}
                          </span>
                        </div>
                      </button>
                    );
                  })}

                  {/* Dynamic Category 6: PPPK Particulars - visible only to P3K employees */}
                  {(selectedASNObj.status_pegawai_detail === 'PPPK_Penuh_Waktu' || selectedASNObj.status_pegawai_detail === 'PPPK_Paruh_Waktu') && (
                    <button
                      onClick={() => setActiveKelompok('PPPK_Khusus')}
                      className={`p-3 border rounded-xl text-left transition relative select-none cursor-pointer flex flex-col justify-between ${activeKelompok === 'PPPK_Khusus' ? 'bg-slate-900 border-slate-900 text-white shadow-sm' : 'bg-indigo-50/40 hover:bg-indigo-50 border-indigo-100/55 text-slate-700'}`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          {calcFolderStatus(selectedASNObj, 'PPPK_Khusus') === 'GREEN' ? (
                            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block"></span>
                          ) : calcFolderStatus(selectedASNObj, 'PPPK_Khusus') === 'YELLOW' ? (
                            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full inline-block"></span>
                          ) : (
                            <span className="w-2.5 h-2.5 bg-rose-500 rounded-full inline-block"></span>
                          )}
                          <span className="text-[10px] font-mono leading-none text-indigo-400">
                            {arsipList.filter(f => f.id_asn === selectedASNObj.id && f.kategori_kelompok === 'PPPK_Khusus').length} file
                          </span>
                        </div>
                        <p className="font-bold text-[11px] leading-tight text-indigo-900">Arsip PPPK</p>
                        <p className="text-[9px] text-indigo-500">Kontrak & SPMT</p>
                      </div>
                      <div className="mt-2.5 text-right">
                        <span className="text-[8px] bg-indigo-500/10 text-indigo-600 font-bold px-1.5 py-0.5 rounded uppercase">
                          PPPK KHUSUS
                        </span>
                      </div>
                    </button>
                  )}

                  {/* Dynamic Category 7: PKWT Particulars - visible only to PKWT/Non_ASN employees */}
                  {selectedASNObj.status_pegawai_detail === 'Non_ASN' && (
                    <button
                      onClick={() => setActiveKelompok('PKWT_Khusus')}
                      className={`p-3 border rounded-xl text-left transition relative select-none cursor-pointer flex flex-col justify-between ${activeKelompok === 'PKWT_Khusus' ? 'bg-slate-900 border-slate-900 text-white shadow-sm' : 'bg-teal-50/40 hover:bg-teal-50 border-teal-100/55 text-slate-700'}`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          {calcFolderStatus(selectedASNObj, 'PKWT_Khusus') === 'GREEN' ? (
                            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block"></span>
                          ) : calcFolderStatus(selectedASNObj, 'PKWT_Khusus') === 'YELLOW' ? (
                            <span className="w-2.5 h-2.5 bg-amber-500 rounded-full inline-block"></span>
                          ) : (
                            <span className="w-2.5 h-2.5 bg-rose-500 rounded-full inline-block"></span>
                          )}
                          <span className="text-[10px] font-mono leading-none text-teal-500">
                            {arsipList.filter(f => f.id_asn === selectedASNObj.id && f.kategori_kelompok === 'PKWT_Khusus').length} file
                          </span>
                        </div>
                        <p className="font-bold text-[11px] leading-tight text-teal-900">Arsip PKWT</p>
                        <p className="text-[9px] text-teal-600">MOU & Kontrak</p>
                      </div>
                      <div className="mt-2.5 text-right">
                        <span className="text-[8px] bg-teal-500/10 text-teal-600 font-bold px-1.5 py-0.5 rounded uppercase">
                          PKWT KHUSUS
                        </span>
                      </div>
                    </button>
                  )}
                </div>
              </div>

              {/* FILES LIST EXPLORER PER KELOMPOK MAP */}
              <div className="bg-white border border-slate-200/60 p-5 rounded-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center space-x-1">
                    <span className="w-1.5 h-3 bg-emerald-500 rounded-full"></span>
                    <span>Kelompok Berkas: {activeKelompok.replace(/_/g, ' ')} ({selectedAsnArchives.filter(f => f.kategori_kelompok === activeKelompok).length})</span>
                  </h4>

                  <span className="text-[10px] text-slate-400 italic">
                    Dikuasai oleh server SIMPEG digital
                  </span>
                </div>

                {/* Main Directory Table list */}
                <div className="space-y-3">
                  {selectedAsnArchives.filter(f => f.kategori_kelompok === activeKelompok).length === 0 ? (
                    <div className="p-12 text-center border-2 border-dashed border-slate-50 rounded-2xl space-y-2">
                      <Folder size={32} className="mx-auto text-slate-300" />
                      <p className="text-xs font-medium text-slate-500">Belum ada berkas pada folder ini.</p>
                      <p className="text-[10px] text-slate-400 max-w-[280px] mx-auto">
                        Unggah berkas resmi melalui admin, atau gunakan modul "Sistem Sekali Upload" pada usulan layanan untuk mengarsipkan secara otomatis.
                      </p>
                    </div>
                  ) : (
                    selectedAsnArchives.filter(f => f.kategori_kelompok === activeKelompok).map(file => {
                      // Check for warning: STR expiry imminent
                      let isStrImminent = false;
                      if (file.str_expired_date) {
                        const expDate = new Date(file.str_expired_date);
                        const today = new Date();
                        const timeDiff = expDate.getTime() - today.getTime();
                        const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
                        if (daysDiff <= 60) {
                          isStrImminent = true;
                        }
                      }

                      return (
                        <div 
                          key={file.id} 
                          className={`p-3.5 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:bg-slate-50 text-xs ${isStrImminent ? 'bg-amber-500/[0.02] border-amber-300' : 'bg-slate-50/40 border-slate-100'}`}
                        >
                          <div className="space-y-1 min-w-0">
                            <p className="font-bold text-slate-800 flex items-center flex-wrap gap-2">
                              <span>{file.nama_berkas}</span>
                              {file.source === 'Auto-Copy Usulan' && (
                                <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase hover:opacity-85" title="Disalin otomatis setelah usulan disetujui">
                                  Auto-Copy
                                </span>
                              )}
                              
                              {/* STR Alert Warning */}
                              {isStrImminent && (
                                <span className="bg-amber-100 text-amber-800 border border-amber-300 font-bold px-1.5 py-0.5 rounded text-[9px] flex items-center space-x-1 animate-pulse">
                                  <AlertTriangle size={10} />
                                  <span>STR Kedaluwarsa Segera! ({file.str_expired_date})</span>
                                </span>
                              )}

                              {file.pkwt_tahun && (
                                <span className="bg-teal-100 text-teal-800 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase">
                                  PKWT TAHUN {file.pkwt_tahun}
                                </span>
                              )}
                            </p>
                            
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400 font-mono">
                              <p className="truncate max-w-[200px] sm:max-w-xs">{file.file_name}</p>
                              <p>&bull;</p>
                              <p>Diunggah: {new Date(file.uploaded_at).toLocaleDateString('id-ID')}</p>
                            </div>

                            {file.notes && (
                              <p className="text-[11px] text-slate-500 italic bg-white p-1.5 border border-slate-100 rounded-lg max-w-lg mt-1">
                                <strong>Catatan:</strong> {file.notes}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center space-x-1.5 self-end sm:self-auto shrink-0 leading-none">
                            <button
                              onClick={() => handleOpenPreview(file)}
                              className="p-1 px-2.5 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 rounded-xl transition text-slate-700 text-xs font-semibold flex items-center space-x-1.5 h-8 cursor-pointer shadow-xs"
                              title="Lihat Berkas"
                            >
                              <Eye size={12} />
                              <span>Lihat</span>
                            </button>
                            
                            <button
                              onClick={() => handleDownloadPDF(file)}
                              className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition text-xs font-semibold flex items-center space-x-1.5 h-8 cursor-pointer"
                              title="Ekspor .PDF"
                            >
                              <Download size={12} />
                              <span>Unduh PDF</span>
                            </button>

                            <button
                              onClick={() => handleDeleteFile(file.id, file.nama_berkas)}
                              className="p-1.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 hover:text-rose-700 rounded-lg transition h-8"
                              title="Hapus"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* DINKES INHERENT ARCHIVE LOGS INFORMATION - MINIMALIS */}
              <div className="bg-slate-50 border border-slate-200/70 p-3.5 rounded-xl text-xs flex items-center justify-between text-slate-500 font-medium">
                <span className="flex items-center space-x-1.5 text-[11px]">
                  <Info size={13} className="text-emerald-600 shrink-0" />
                  <span>Berkas usulan yang disahkan otomatis tersinkronisasi ke e-folder arsip digital pegawai.</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">One-Time Cloud Sync</span>
              </div>
            </>
          ) : (
            <div className="p-16 text-center bg-white border border-slate-100 rounded-3xl space-y-3">
              <Folder size={48} className="mx-auto text-emerald-600/25" />
              <h3 className="font-bold text-slate-800 text-[15px]">Arsip Digital Lombok Barat</h3>
              <p className="text-xs text-slate-400 max-w-[340px] mx-auto">
                Silakan pilih nama pegawai di panel sebelah kiri untuk menampilkan directory file, status kelengkapan folder, and riwayat verifikasi berkas.
              </p>
            </div>
          )}

        </div>

      </div>

      {/* MODAL: PREVIEW BERKAS */}
      {selectedArsipForPreview && selectedASNObj && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Title */}
            <div className="p-4.5 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold text-xs uppercase tracking-widest">Pratinjau Berkas Pegawai</h3>
                <p className="text-[10px] text-slate-400 mt-1">{selectedArsipForPreview.nama_berkas}</p>
              </div>
              <button 
                onClick={() => setSelectedArsipForPreview(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Virtual Document Canvas */}
            <div className="p-6 bg-slate-50 flex-1 overflow-y-auto space-y-6">
              
              {profilePreviewUrl ? (
                <div className="space-y-4">
                  {profilePreviewType === 'IMAGE' ? (
                    <div className="space-y-3">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleOpenImageInNewTab(profilePreviewUrl)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs transition duration-150 flex items-center space-x-1 border border-indigo-200 cursor-pointer"
                        >
                          <span>🌐 Buka Gambar di Tab Baru</span>
                        </button>
                      </div>
                      <div className="flex flex-col items-center justify-center p-4 bg-slate-900 border border-slate-200/60 rounded-xl shadow-inner min-h-[300px] max-h-[500px] overflow-auto">
                        {!previewImageError ? (
                          <img 
                            src={profilePreviewUrl} 
                            className="max-h-[450px] w-auto max-w-full object-contain rounded-lg shadow-md" 
                            alt="Pratinjau Berkas Gambar" 
                            referrerPolicy="no-referrer"
                            onError={() => {
                              setPreviewImageError(true);
                              handleOpenImageInNewTab(profilePreviewUrl);
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
                                onClick={() => handleOpenImageInNewTab(profilePreviewUrl)}
                                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition active:scale-95 cursor-pointer shadow-xs"
                              >
                                Tampilkan Kembali Tab Baru
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadPDF(selectedArsipForPreview)}
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
                    <div className="p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4 max-w-md mx-auto">
                      <div className="mx-auto w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                        <Download size={24} />
                      </div>
                      <div className="space-y-1">
                        <p className="font-bold text-slate-800 text-xs text-center">Dokumen PDF Telah Dibuka di Tab Baru</p>
                        <p className="text-[11px] text-slate-500 text-center leading-normal">
                          Peramban (browser) Anda membuka dokumen secara langsung untuk performa penuh.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => window.open(profilePreviewUrl || '', '_blank')}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition active:scale-95 cursor-pointer shadow-xs"
                      >
                        Buka Ulang Penampil PDF Asli
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center text-xs text-slate-500 bg-white border rounded-2xl shadow-sm animate-pulse">
                  Sedang menyiapkan pratinjau lembar berkas...
                </div>
              )}

              {/* Meta specifications */}
              <div className="bg-slate-100 p-4 rounded-xl space-y-2 text-xs text-slate-600 font-medium">
                <p className="font-bold text-slate-800">Spesifikasi Metadata Berkas:</p>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px] font-normal leading-normal">
                  <p><strong>ID Berkas:</strong> #{selectedArsipForPreview.id}</p>
                  <p><strong>Sumber:</strong> {selectedArsipForPreview.source}</p>
                  <p><strong>Kategori Map:</strong> {selectedArsipForPreview.kategori_kelompok}</p>
                  <p><strong>Format Salinan:</strong> {selectedArsipForPreview.file_name?.match(/\.(jpe?g|png|gif)$/i) ? "Gambar (JPG/PNG)" : "PDF Digital"}</p>
                </div>
                {selectedArsipForPreview.notes && (
                  <p className="text-[11px] font-normal italic mt-1 leading-normal">
                    <strong>Catatan Perekaman:</strong> {selectedArsipForPreview.notes}
                  </p>
                )}
              </div>

            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <button
                onClick={() => setSelectedArsipForPreview(null)}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer transition"
              >
                Tutup Pratinjau
              </button>
              <button
                onClick={() => handleDownloadPDF(selectedArsipForPreview)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition cursor-pointer"
              >
                <FileDown size={14} />
                <span>Unduh PDF Resmi</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: MANUAL UPLOAD FILE FORM */}
      {isUploadOpen && selectedASNObj && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <form 
            onSubmit={handleSaveUpload} 
            className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-slate-200 overflow-hidden text-xs flex flex-col max-h-[90vh]"
          >
            
            <div className="p-4.5 bg-emerald-700 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold leading-none uppercase">Unggah Berkas Baru ke Arsip</h3>
                <p className="text-[10px] text-emerald-200 mt-1">Pegawai: {selectedASNObj.nama_lengkap}</p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsUploadOpen(false)}
                className="p-1 text-emerald-200 hover:text-white rounded-lg transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              
              {/* Category selector */}
              <div className="space-y-1.5">
                <label className="text-slate-600 font-semibold block">Kelompok E-Folder</label>
                <select
                  value={newKategori}
                  onChange={(e) => {
                    const cat = e.target.value as any;
                    setNewKategori(cat);
                    // Autofill preset if available
                    if (documentPresets[cat] && documentPresets[cat].length > 0) {
                      setNewNamaBerkas(documentPresets[cat][0]);
                    }
                  }}
                  className="w-full p-2 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="Dasar">Kelompok Dokumen Dasar Kepegawaian (Core Identity)</option>
                  <option value="Mutasi">Kelompok Dokumen Mutasi Historis (Career)</option>
                  <option value="Pendidikan">Kelompok Dokumen Pendidikan & Kompetensi (Credentials)</option>
                  <option value="Personal">Kelompok Dokumen Personal & Keluarga (Civil Registry)</option>
                  <option value="Kinerja">Kelompok Kinerja & Kedisiplinan (Performance Records)</option>
                  
                  {/* Categorized PPPK/PKWT Khusus options based on actual profile */}
                  {(selectedASNObj.status_pegawai_detail === 'PPPK_Penuh_Waktu' || selectedASNObj.status_pegawai_detail === 'PPPK_Paruh_Waktu') && (
                    <option value="PPPK_Khusus">Tambahan Arsip Khusus PPPK (Penuh & Paruh Waktu)</option>
                  )}
                  {selectedASNObj.status_pegawai_detail === 'Non_ASN' && (
                    <option value="PKWT_Khusus">Tambahan Arsip Khusus PKWT (Tenaga Kontrak / Honorer)</option>
                  )}
                </select>
              </div>

              {/* Document name presets / manual title */}
              <div className="space-y-1.5">
                <label className="text-slate-600 font-semibold block">Nama Dokumen Persyaratan</label>
                <select
                  value={documentPresets[newKategori]?.includes(newNamaBerkas) ? newNamaBerkas : (newNamaBerkas ? 'DOKUMEN_LAINNYA' : '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'DOKUMEN_LAINNYA') {
                      setNewNamaBerkas('DOKUMEN_LAINNYA');
                    } else {
                      setNewNamaBerkas(val);
                    }
                  }}
                  className="w-full p-2 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">-- Pilih Jenis Dokumen Standar --</option>
                  {documentPresets[newKategori]?.map(item => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                  <option value="DOKUMEN_LAINNYA">-- Tulis Nama Kustom / Berkas Lain --</option>
                </select>

                {/* If kustom name */}
                {(newNamaBerkas === 'DOKUMEN_LAINNYA' || (!documentPresets[newKategori]?.includes(newNamaBerkas) && newNamaBerkas !== '')) && (
                  <input
                    type="text"
                    placeholder="Tulis nama berkas digital disini..."
                    value={newNamaBerkas === 'DOKUMEN_LAINNYA' ? '' : newNamaBerkas}
                    onChange={(e) => setNewNamaBerkas(e.target.value)}
                    className="w-full p-2 mt-2 border border-slate-200 bg-white rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold"
                  />
                )}
              </div>

              {/* Secondary fields conditionally based on selections */}
              {newKategori === 'Pendidikan' && newNamaBerkas.includes('STR') && (
                <div className="space-y-1.5 p-3.5 bg-amber-50 rounded-xl border border-amber-200 animate-in fade-in duration-200">
                  <label className="text-amber-900 font-semibold block flex items-center space-x-1">
                    <AlertTriangle size={13} />
                    <span>Masa Berlaku STR (Tanggal Kedaluwarsa)</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={strExpiryDate}
                    onChange={(e) => setStrExpiryDate(e.target.value)}
                    className="w-full p-2 border border-amber-300 bg-white rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  <p className="text-[10px] text-amber-700 leading-normal">
                    Penting bagi tenaga kesehatan. Sistem akan mengeluarkan peringatan dini (early warning badge) di e-Folder apabila STR tersisa kurang dari 60 hari menuju kedaluwarsa.
                  </p>
                </div>
              )}

              {newKategori === 'PKWT_Khusus' && (
                <div className="space-y-1.5 p-3.5 bg-teal-50 rounded-xl border border-teal-200 animate-in fade-in duration-300">
                  <label className="text-teal-900 font-semibold block">Tahun Anggaran Kontrak PKWT</label>
                  <select
                    value={pkwtYear}
                    onChange={(e) => setPkwtYear(e.target.value)}
                    className="w-full p-2 border border-teal-300 bg-white rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
                  >
                    <option value="2026">Tahun Anggaran 2026</option>
                    <option value="2025">Tahun Anggaran 2025</option>
                    <option value="2024">Tahun Anggaran 2024</option>
                    <option value="2023">Tahun Anggaran 2023</option>
                  </select>
                  <p className="text-[10px] text-teal-700 leading-normal">
                    Manajemen PKWT difokuskan pada kronologis tahun anggaran demi legalitas audit fasyankes.
                  </p>
                </div>
              )}

              {/* Simulated upload drag and drop canvas */}
              <div className="space-y-1.5">
                <label className="text-slate-600 font-semibold block">Lampirkan Dokumen (PDF, JPG, PNG)</label>
                
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('manual-inner-uploader')?.click()}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center transition duration-150 cursor-pointer ${dragActive ? 'border-emerald-600 bg-emerald-50' : simulatedFileName ? 'border-emerald-400 bg-emerald-50/20' : 'border-slate-200 bg-slate-50 hover:bg-slate-150'}`}
                >
                  <input 
                    type="file" 
                    id="manual-inner-uploader" 
                    className="hidden" 
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                  />
                  <Upload size={24} className="mx-auto text-slate-400 mb-1.5" />
                  {simulatedFileName ? (
                    <div className="space-y-1">
                      <p className="font-bold text-slate-800 text-xs truncate max-w-[280px] mx-auto">{simulatedFileName}</p>
                      <p className="text-[10px] text-emerald-600">✓ Berkas siap diunggah ke server database</p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-slate-700 text-xs">Seret & taruh berkas di sini atau klik untuk mencari</p>
                      <p className="text-[10px] text-slate-400">PDF, PNG, JPG (Maks. 10MB)</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload note */}
              <div className="space-y-1.5">
                <label className="text-slate-600 font-semibold block">Catatan Tambahan (Keterangan)</label>
                <textarea
                  placeholder="Tulis keterangan atau No. SK jika diperlukan..."
                  value={uploadNote}
                  onChange={(e) => setUploadNote(e.target.value)}
                  rows={2}
                  className="w-full p-2 border border-slate-200 bg-slate-50 focus:bg-white rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-xs"
              >
                Simpan & Arsipkan Berkas
              </button>
            </div>

          </form>
        </div>
      )}

      {/* ======================= MODAL: CONFIRM DELETE ARCHIVE FILE ======================= */}
      {confirmDeleteFile && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 text-center font-sans">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-50 text-yellow-600 mb-4 border border-yellow-200 animate-pulse">
              <AlertTriangle size={24} />
            </div>
            <h4 className="font-bold font-display text-base uppercase tracking-wide text-slate-900">Konfirmasi Hapus Berkas</h4>
            
            <div className="bg-yellow-50/70 border border-yellow-200 rounded-xl p-4 my-3 text-left">
              <p className="text-xs text-slate-800 font-sans leading-relaxed">
                Apakah Anda yakin ingin menghapus dokumen arsip <strong className="text-yellow-600 font-bold">"{confirmDeleteFile.name}"</strong> secara permanen dari sistem kepegawaian?
              </p>
              <p className="text-[10px] text-yellow-850 bg-yellow-100 border border-yellow-300/60 p-2 rounded-lg mt-3 font-semibold leading-normal">
                Tindakan ini permanen dan tidak dapat dibatalkan. Berkas fisik dokumen Anda tidak dapat diakses lagi.
              </p>
            </div>

            <div className="mt-6 flex space-x-3 justify-center">
              <button
                type="button"
                onClick={() => setConfirmDeleteFile(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const id = confirmDeleteFile.id;
                  const name = confirmDeleteFile.name;
                  const filtered = arsipList.filter(f => f.id !== id);
                  onUpdateArsipList(filtered);
                  setConfirmDeleteFile(null);
                  setSuccessToast(`✓ Berkas "${name}" berhasil dihapus dari sistem.`);
                  if (selectedArsipForPreview?.id === id) {
                    setSelectedArsipForPreview(null);
                  }
                }}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-900 rounded-lg text-xs font-bold transition cursor-pointer shadow-md"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

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
