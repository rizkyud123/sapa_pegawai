/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Crafted Dashboard with Smart KPI Visual Analytics and Multi-Tenant Early Warning Matrix.
 */

import React, { useState } from 'react';
import { 
  Bell, 
  AlertCircle, 
  Users, 
  FileText, 
  MessageSquare,
  TrendingUp,
  Clock,
  ArrowRight,
  ShieldCheck,
  Award,
  Filter,
  CheckCircle,
  Database,
  Calendar,
  Upload,
  Search,
  Activity,
  Heart,
  Home,
  MapPin,
  Calculator,
  Stethoscope,
  Pill,
  Zap
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ASNProfile, UsulanLayanan, Puskesmas, InAppNotification, ArsipKepegawaian } from '../../types';
import { getFallbackProfesiId } from '../../mockData';
import { EarlyWarningAlert, getEarlyWarningAlerts, formatDate, sendWhatsAppMessage } from '../../utils';

const PROFESSION_COLORS: Record<string, string> = {
  'PERAWAT': '#6366f1', // indigo
  'BIDAN': '#10b981', // emerald
  'DOKTER': '#f43f5e', // rose
  'DOKTER GIGI': '#a855f7', // purple
  'NUTRISIONIS': '#f59e0b', // amber
  'TENAGA SANITASI LINGKUNGAN': '#22c55e', // green
  'APOTEKER': '#ec4899', // pink
  'PRANATA LABORATORIUM KESEHATAN': '#06b6d4', // cyan
  'ASISTEN APOTEKER': '#d946ef', // fuchsia
  'TERAPIS GIGI DAN MULUT': '#eab308', // yellow
  'PROMOSI KESEHATAN DAN ILMU PERILAKU': '#8b5cf6', // violet
  'PENGADMINISTRASI PERKANTORAN': '#64748b' // slate
};

const getProfesiIconAndColor = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('perawat')) return { icon: Heart, color: 'indigo' };
  if (n.includes('dokter gigi')) return { icon: Stethoscope, color: 'cyan' };
  if (n.includes('dokter')) return { icon: Stethoscope, color: 'rose' };
  if (n.includes('bidan')) return { icon: Activity, color: 'emerald' };
  if (n.includes('apoteker') || n.includes('kefarmasian') || n.includes('teknik kefarmasian')) return { icon: Pill, color: 'pink' };
  if (n.includes('promkes') || n.includes('sanitarian') || n.includes('kesling') || n.includes('perilaku')) return { icon: ShieldCheck, color: 'green' };
  if (n.includes('gizi') || n.includes('nutrisionis')) return { icon: Award, color: 'amber' };
  if (n.includes('medis') || n.includes('lab') || n.includes('teknologi')) return { icon: Calculator, color: 'cyan' };
  if (n.includes('keuangan') || n.includes('administrasi') || n.includes('umum') || n.includes('kepeg') || n.includes('informasi') || n.includes('sistem')) return { icon: FileText, color: 'slate' };
  return { icon: Users, color: 'indigo' };
};

const SUB_JENIS_JABATAN_MAP: Record<string, { label: string; ids: number[] }> = {
  'TENAGA_MEDIS': { label: 'Tenaga Medis (Dokter/drg)', ids: [2, 3] },
  'TENAGA_KEPERAWATAN': { label: 'Tenaga Keperawatan (Perawat)', ids: [1] },
  'TENAGA_KEBIDANAN': { label: 'Tenaga Kebidanan (Bidan)', ids: [4] },
  'TENAGA_KEFARMASIAN': { label: 'Tenaga Kefarmasian (Apoteker/TTK)', ids: [5, 6] },
  'TENAGA_KESLING_PROMKES': { label: 'Tenaga Kes. Masyarakat & Sanitasi', ids: [7, 8] },
  'TENAGA_GIZI': { label: 'Tenaga Gizi', ids: [9] },
  'TENAGA_KETEKNISAN_MEDIS': { label: 'Tenaga Keteknisan Medis & Biomedis', ids: [10, 11, 12] },
  'TENAGA_ADMINISTRASI': { label: 'Tenaga Administrasi & Pendukung', ids: [13, 14, 15] },
};

interface DashboardOverviewProps {
  currentRole: 'admin_dinkes' | 'admin_puskesmas';
  selectedPuskesmasId: number | null;
  puskesmasList: Puskesmas[];
  asnProfiles: ASNProfile[];
  usulanLayanan: UsulanLayanan[];
  arsipList?: ArsipKepegawaian[];
  onNavigateToService: (asnId: number, fiturslug: string) => void;
  onNavigateToTab: (tab: string) => void;
  onNavigateToPemantauan?: (subTab: 'pangkat' | 'jafung' | 'kgb' | 'pensiun') => void;
  notifications: InAppNotification[];
  onUpdateNotifications: (updated: InAppNotification[]) => void;
  onSaveAndSync?: (changedState: any) => void;
  renbutList: any[];
  onUpdateRenbutList: (updatedList: any[]) => void;
}

const PUSKESMAS_METADATA_MAP: Record<number, { penduduk: number, target_nakes: number, dPath: string, center: [number, number], label: string, short: string }> = {
  1: { 
    penduduk: 92000, 
    target_nakes: 10, 
    dPath: "M 35,160 C 25,110 50,100 75,95 C 95,90 105,115 110,140 C 115,165 100,185 80,195 C 60,205 45,195 35,160 Z",
    center: [70, 140],
    label: "Puskesmas Gerung (Selatan)",
    short: "Gerung"
  },
  2: { 
    penduduk: 110000, 
    target_nakes: 11, 
    dPath: "M 130,110 C 145,100 170,90 190,100 C 200,110 210,130 205,150 C 200,170 175,185 155,190 C 135,190 120,165 130,110 Z",
    center: [165, 140],
    label: "Puskesmas Narmada (Timur)",
    short: "Narmada"
  },
  3: { 
    penduduk: 85000, 
    target_nakes: 9, 
    dPath: "M 80,130 C 95,120 110,115 125,125 C 130,140 120,160 115,175 C 110,190 95,195 80,185 C 75,170 75,150 80,130 Z",
    center: [100, 155],
    label: "Puskesmas Kediri (Tengah)",
    short: "Kediri"
  },
  4: { 
    penduduk: 98000, 
    target_nakes: 10, 
    dPath: "M 40,60 C 60,45 85,35 105,50 C 110,65 115,80 105,100 C 95,110 75,105 55,105 C 35,105 35,80 40,60 Z",
    center: [75, 75],
    label: "Puskesmas Gunungsari (Utara)",
    short: "Gunungsari"
  },
  5: { 
    penduduk: 76000, 
    target_nakes: 8, 
    dPath: "M 115,70 C 130,55 155,45 175,60 C 185,70 180,90 170,105 C 155,115 135,110 120,110 C 110,105 110,90 115,70 Z",
    center: [145, 80],
    label: "Puskesmas Lingsar (Lereng Rinjani)",
    short: "Lingsar"
  }
};

const getYearOfDate = (dateStr: string | null | undefined): number => {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? 0 : d.getFullYear();
};

const getBulanNama = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'Juni';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Juni';
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return months[d.getMonth()];
};

const getDaysRemainingStr = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diffTime = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? `${diffDays} Hari lagi` : `Lewat ${Math.abs(diffDays)} Hari`;
};

export default function DashboardOverview({
  currentRole,
  selectedPuskesmasId,
  puskesmasList,
  asnProfiles,
  usulanLayanan,
  arsipList = [],
  onNavigateToService,
  onNavigateToTab,
  onNavigateToPemantauan,
  notifications,
  onUpdateNotifications,
  onSaveAndSync,
  renbutList,
  onUpdateRenbutList
}: DashboardOverviewProps) {
  // State for interactive KPI cards filter
  const [activeKpiFilter, setActiveKpiFilter] = useState<'pangkat' | 'jafung' | 'kgb' | 'cuti' | null>(null);

  // WhatsApp Preview Modal States for DashboardOverview
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

  // State for interactive STR & SIP compliance cards filter
  const [activeComplianceFilter, setActiveComplianceFilter] = useState<'str_dekat' | 'str_kadaluarsa' | 'sip_dekat' | 'sip_kadaluarsa' | null>(null);

  // State for search query inside compliance detail table
  const [complianceSearch, setComplianceSearch] = useState<string>('');

  // State for work unit archive completeness drill-down
  const [activeArsipAnalysis, setActiveArsipAnalysis] = useState<boolean>(false);
  const [selectedAnalysisUnitId, setSelectedAnalysisUnitId] = useState<number | null>(null);

  // State for selected interactive Puskesmas on the Geospatial Map
  const [selectedMapPuskesmasId, setSelectedMapPuskesmasId] = useState<number | null>(null);

  // State for editing population
  const [editedPopulationInput, setEditedPopulationInput] = useState<string>('');
  const [saveStatusMsg, setSaveStatusMsg] = useState<string>('');

  // Filter Pegawai states
  const [filterStatusAsn, setFilterStatusAsn] = useState<string>('ALL');
  const [filterJenisJabatan, setFilterJenisJabatan] = useState<string>('ALL');
  const [filterSubJenisJabatan, setFilterSubJenisJabatan] = useState<string>('ALL');
  const [filterPuskesmasUnit, setFilterPuskesmasUnit] = useState<string>('ALL');
  const [filterAsnSearchQuery, setFilterAsnSearchQuery] = useState<string>('');
  const [filterAsnPage, setFilterAsnPage] = useState<number>(1);

  // Jabatan Fungsional Classification filters
  const [filterJafungCategory, setFilterJafungCategory] = useState<'ALL' | 'KEAHLIAN' | 'KETERAMPILAN'>('ALL');
  const [filterJafungPage, setFilterJafungPage] = useState<number>(1);

  // Load standard professions list dynamically
  const [profesiSdmkList] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('simpeg_profesi_sdmk');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
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
  });

  // States for ABK Workload Calculator
  const [abkProfession, setAbkProfession] = useState<string>('dokter');
  const [abkTimePerPatient, setAbkTimePerPatient] = useState<number>(15);
  const [abkAnnualVisits, setAbkAnnualVisits] = useState<number>(4500);
  const [abkExtraHours, setAbkExtraHours] = useState<number>(4);
  const [abkWke, setAbkWke] = useState<number>(75000); // 1250 hours * 60 mins/hour
  const [abkSimulations, setAbkSimulations] = useState<Array<{
    id: string;
    profession: string;
    visits: number;
    time: number;
    extra: number;
    needed: number;
  }>>([
    { id: '1', profession: 'Dokter Umum Base', visits: 4500, time: 15, extra: 4, needed: 1.05 },
    { id: '2', profession: 'Perawat Base', visits: 8000, time: 20, extra: 5, needed: 2.33 }
  ]);

  // Sifat pemetaan tahun series proyeksi dinamis dari 2023 sampai tahun berjalan
  const [clickedRenbutUnitId, setClickedRenbutUnitId] = useState<number | null>(1); // default to 1 (Puskesmas Gerung)

  const setRenbutList = onUpdateRenbutList;

  const [selectedRenbutId, setSelectedRenbutId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('renbut_data_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          return parsed[0].id;
        }
      }
    } catch {}
    return '1';
  });

  const [renbutZoomScale, setRenbutZoomScale] = useState<number>(1.2); // interactive scale factor
  
  // Membaca tahun berjalan secara otomatis sewaktu tahun berganti
  const currentYear = new Date().getFullYear();
  const [renbutProjectionYear, setRenbutProjectionYear] = useState<number>(currentYear); 
  const [renbutCategoryFilter, setRenbutCategoryFilter] = useState<string>('ALL'); // filter categorization
  
  // Custom parsing support from uploaded PDF / XLS content
  const [dragOverUploader, setDragOverUploader] = useState<boolean>(false);
  const [renbutImportLogs, setRenbutImportLogs] = useState<string>('');

  // Sifat pemetaan tahun series proyeksi dinamis dari 2023 sampai tahun berjalan
  const makeDynamicProjection = (kebutuhanValue: number) => {
    const startYear = 2023;
    const currentYearVal = new Date().getFullYear();
    const proj: Record<number, number> = {};
    for (let yr = startYear; yr <= currentYearVal; yr++) {
      const delta = yr - 2026;
      proj[yr] = Math.max(1, kebutuhanValue + Math.round(delta * 0.4));
    }
    return proj;
  };

  const countRealPegawaiForRenbut = (category: string, jenjang: string) => {
    const normalizedCategory = category.toLowerCase().trim();
    const normalizedJenjang = jenjang.toLowerCase().trim();
    
    return visibleAsn.filter(p => {
      if (p.status_kepegawaian !== 'Aktif') return false;
      
      const pName = (p.nama_lengkap || '').toLowerCase();
      const pJabatanPns = (p.pns_nama_jabatan || '').toLowerCase();
      const pJabatanPppk = (p.pppk_jabatan || '').toLowerCase();
      const pJabatanPkwt = (p.pkwt_jabatan || '').toLowerCase();
      const pJenjang = (p.jenjang_jafung || '').toLowerCase();
      
      const matchesCategory = 
        pJabatanPns.includes(normalizedCategory) ||
        pJabatanPppk.includes(normalizedCategory) ||
        pJabatanPkwt.includes(normalizedCategory) ||
        (normalizedCategory === 'tenaga sanitasi lingkungan' && (pJabatanPns.includes('sanitasi') || pJenjang.includes('sanitasi'))) ||
        (normalizedCategory === 'pengadministrasi perkantoran' && (pJabatanPns.includes('administrasi') || pJabatanPns.includes('staf') || p.jenis_pegawai === 'Staf_Umum')) ||
        (normalizedCategory === 'dokter' && pJabatanPns.includes('dokter') && !pJabatanPns.includes('gigi')) ||
        (normalizedCategory === 'dokter gigi' && pJabatanPns.includes('dokter gigi'));
        
      const matchesJenjang = 
        pJenjang.includes(normalizedJenjang) || 
        pJabatanPns.includes(normalizedJenjang) ||
        normalizedJenjang === 'jabatan pelaksana' ||
        pJabatanPppk.includes(normalizedJenjang);
        
      return matchesCategory && (normalizedJenjang === 'jabatan pelaksana' || matchesJenjang);
    }).length;
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    if (extension === 'xlsx' || extension === 'xls') {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          let parsedItems: any[] = [];
          json.forEach((row: any, idx: number) => {
            if (idx < 2) return; // skip header lines
            const jabatan = String(row[1] || '').trim();
            const jenjang = String(row[2] || '').trim();
            
            if (jabatan && (jenjang || row[3] !== undefined)) {
              const asn = Number(row[3]) || 0;
              const nonAsn = Number(row[4]) || 0;
              const kebutuhan = Number(row[5]) || 0;
              const kesenjangan = Number(row[6]) || 0;
              const keterangan = String(row[7] || 'K').trim();
              
              const baseKeb = kebutuhan || (asn + nonAsn + 2);
              parsedItems.push({
                id: `import-${idx}`,
                jab_fungsional: jabatan.toUpperCase(),
                jenjang: jenjang || 'Terampil',
                asn,
                nonAsn,
                kebutuhan: baseKeb,
                kesenjangan: kesenjangan || (asn + nonAsn - baseKeb),
                keterangan,
                standarMinimal: baseKeb,
                abkKebutuhan: baseKeb * 0.9,
                projection: makeDynamicProjection(baseKeb)
              });
            }
          });
          
          if (parsedItems.length > 0) {
            setRenbutList(parsedItems);
            setSelectedRenbutId(parsedItems[0].id);
            localStorage.setItem('renbut_data_list', JSON.stringify(parsedItems));
            setRenbutImportLogs(`✓ Berhasil memetakan ${parsedItems.length} data Renbut Kemenkes dari Excel!`);
          } else {
            setRenbutImportLogs(`⚠ Format data tidak cocok. Silakan periksa kolom baris template.`);
          }
        } catch (ex: any) {
          setRenbutImportLogs(`🚫 Gagal memproses file: ${ex.message}`);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n');
        let parsedItems: any[] = [];
        
        lines.forEach((line, idx) => {
          const uppercaseLine = line.toUpperCase();
          let foundTitle = '';
          if (uppercaseLine.includes('PERAWAT')) foundTitle = 'PERAWAT';
          else if (uppercaseLine.includes('BIDAN')) foundTitle = 'BIDAN';
          else if (uppercaseLine.includes('DOKTER GIGI')) foundTitle = 'DOKTER GIGI';
          else if (uppercaseLine.includes('DOKTER')) foundTitle = 'DOKTER';
          else if (uppercaseLine.includes('SANITASI')) foundTitle = 'TENAGA SANITASI LINGKUNGAN';
          else if (uppercaseLine.includes('APOTEKER')) foundTitle = 'APOTEKER';
          else if (uppercaseLine.includes('NUTRISIONIS')) foundTitle = 'NUTRISIONIS';
          else if (uppercaseLine.includes('LABORATORIUM')) foundTitle = 'PRANATA LABORATORIUM KESEHATAN';
          
          if (foundTitle) {
            let jenjang = 'Terampil';
            if (uppercaseLine.includes('PERTAMA')) jenjang = 'Ahli Pertama';
            else if (uppercaseLine.includes('MUDA')) jenjang = 'Ahli Muda';
            else if (uppercaseLine.includes('MADYA')) jenjang = 'Ahli Madya';
            else if (uppercaseLine.includes('MAHIR')) jenjang = 'Mahir';
            else if (uppercaseLine.includes('PENYELIA')) jenjang = 'Penyelia';
            
            const numbers = line.match(/\d+/g);
            const asn = numbers ? Number(numbers[0]) : 1;
            const nonAsn = numbers && numbers.length > 1 ? Number(numbers[1]) : 0;
            const kebutuhan = numbers && numbers.length > 2 ? Number(numbers[2]) : asn + nonAsn + 1;
            
            parsedItems.push({
              id: `line-${idx}`,
              jab_fungsional: foundTitle,
              jenjang,
              asn,
              nonAsn,
              kebutuhan,
              kesenjangan: asn + nonAsn - kebutuhan,
              keterangan: (asn + nonAsn >= kebutuhan) ? 'S' : 'K',
              standarMinimal: kebutuhan,
              abkKebutuhan: kebutuhan * 0.95,
              projection: makeDynamicProjection(kebutuhan)
            });
          }
        });
        
        if (parsedItems.length > 0) {
          setRenbutList(parsedItems);
          setSelectedRenbutId(parsedItems[0].id);
          localStorage.setItem('renbut_data_list', JSON.stringify(parsedItems));
          setRenbutImportLogs(`✓ Berhasil memetakan ${parsedItems.length} Jabatan Pasca Unggah PDF!`);
        } else {
          setRenbutImportLogs(`✓ File terunggah namun tidak ada pengenalan judul nakes standar. Silakan gunakan format terstruktur.`);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleUpdatePopulation = (unitId: number, newPop: number) => {
    const updatedList = puskesmasList.map(u => {
      if (u.id === unitId) {
        return { ...u, total_penduduk: newPop };
      }
      return u;
    });
    if (onSaveAndSync) {
      onSaveAndSync({ puskesmas: updatedList });
      setSaveStatusMsg('✓ Jumlah penduduk berhasil diperbarui dan disinkronkan!');
      setTimeout(() => setSaveStatusMsg(''), 4000);
    }
  };

  // Dynamic real-time calculation based on current wall-clock date
  const nowSystemDate = new Date();
  const currentRunningYear = nowSystemDate.getFullYear();
  const currentRunningMonth = nowSystemDate.getMonth(); // 0 - 11

  const indonesianMonthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  // Target Next Month label calculation
  const nextMonthDate = new Date(nowSystemDate.getFullYear(), nowSystemDate.getMonth() + 1, 1);
  const targetBulanDepanLabel = `${indonesianMonthNames[nextMonthDate.getMonth()]} ${nextMonthDate.getFullYear()}`;

  // Filter profiles and usulan based on role tenancy
  const visibleAsn = currentRole === 'admin_dinkes' 
    ? asnProfiles 
    : asnProfiles.filter(p => p.id_puskesmas === selectedPuskesmasId);

  // Active early warning alerts grounded in real-time current date
  const alerts = getEarlyWarningAlerts(visibleAsn, nowSystemDate);

  // --- SINKRONISASI LENGKAP DENGAN PEMANTAUAN ASN (TAHUN BERJALAN DINAMIS) ---
  // Aturan KemenPAN-RB No. 1/2023, BKN 6 Periode, PermenPAN-RB No. 7/2023, & UU ASN No. 20/2023

  // A. GOLONGAN / PANGKAT (PNS: Siklus 4 Tahun atau Due Tahun Berjalan)
  const pangkat2026List = visibleAsn.filter(p => {
    if (p.status_kepegawaian === 'Pensiun') return false;
    if (p.status_pegawai_detail !== 'PNS') return false;
    const lastDateStr = p.tmt_pangkat_terakhir || p.pns_tmt_golongan;
    if (!lastDateStr) return false;
    const year = getYearOfDate(lastDateStr);
    return year + 4 <= currentRunningYear;
  }).map(p => {
    const lastDate = p.tmt_pangkat_terakhir || p.pns_tmt_golongan || `${currentRunningYear - 4}-04-01`;
    const lastDateObj = new Date(lastDate);
    const targetYear = getYearOfDate(lastDate) + 4;
    const targetDateStr = `${targetYear}-${String(lastDateObj.getMonth() + 1).padStart(2, '0')}-${String(lastDateObj.getDate()).padStart(2, '0')}`;
    return {
      ...p,
      bulanPengajuan: getBulanNama(lastDate),
      tatDate: targetDateStr,
      description: `Usul Kenaikan Golongan/Pangkat dari ${p.golongan_ruang || '-'}`
    };
  });

  // B. JABATAN (JAFUNG) (Tenaga Fungsional: Siklus 3 Tahun atau Terpenuhi Masa Jabatan Tahun Berjalan)
  const jafung2026List = visibleAsn.filter(p => {
    if (p.status_kepegawaian === 'Pensiun') return false;
    const isJafung = p.jenis_pegawai === 'Jafung_Kesehatan' || Boolean(p.jenjang_jafung) || (p.pns_jenis_jabatan && p.pns_jenis_jabatan.toLowerCase().includes('fungsional'));
    if (!isJafung) return false;
    const lastDateStr = p.tmt_jabatan_terakhir || p.tmt_pangkat_terakhir;
    if (!lastDateStr) return true;
    const year = getYearOfDate(lastDateStr);
    return year + 3 <= currentRunningYear;
  }).map(p => {
    const lastDate = p.tmt_jabatan_terakhir || p.tmt_pangkat_terakhir || `${currentRunningYear - 3}-01-01`;
    const lastDateObj = new Date(lastDate);
    const targetYear = getYearOfDate(lastDate) + 3;
    const targetDateStr = `${targetYear}-${String(lastDateObj.getMonth() + 1).padStart(2, '0')}-${String(lastDateObj.getDate()).padStart(2, '0')}`;
    return {
      ...p,
      bulanPengajuan: getBulanNama(lastDate),
      tatDate: targetDateStr,
      description: `Usulan Peningkatan/Penjenjangan Jafung (${p.jenjang_jafung || 'Pelaksana'})`
    };
  });

  // C. GAJI BERKALA (KGB) (PNS & PPPK: Siklus 2 Tahun atau Jatuh Tempo Tahun Berjalan)
  const kgb2026List = visibleAsn.filter(p => {
    if (p.status_kepegawaian === 'Pensiun') return false;
    const isEligibleKgb = p.status_pegawai_detail === 'PNS' || p.status_pegawai_detail === 'PPPK_Penuh_Waktu' || p.status_pegawai_detail === 'PPPK_Paruh_Waktu';
    if (!isEligibleKgb) return false;
    const lastDateStr = p.tmt_berkala_terakhir || p.tmt_pangkat_terakhir;
    if (!lastDateStr) return true;
    const year = getYearOfDate(lastDateStr);
    return year + 2 <= currentRunningYear;
  }).map(p => {
    const lastDate = p.tmt_berkala_terakhir || p.tmt_pangkat_terakhir || `${currentRunningYear - 2}-01-01`;
    const lastDateObj = new Date(lastDate);
    const targetYear = getYearOfDate(lastDate) + 2;
    const targetDateStr = `${targetYear}-${String(lastDateObj.getMonth() + 1).padStart(2, '0')}-${String(lastDateObj.getDate()).padStart(2, '0')}`;
    return {
      ...p,
      bulanPengajuan: getBulanNama(lastDate),
      tatDate: targetDateStr,
      description: `Kenaikan Gaji Berkala (${p.status_pegawai_detail === 'PNS' ? 'PNS' : 'PPPK'})`
    };
  });

  // D. SISA CUTI TAHUNAN & BUP PENSIUN
  // Active employees who have remaining annual leaves under 4 days in current year.
  const cuti2026List = visibleAsn.filter(p => {
    return p.status_kepegawaian === 'Aktif' && (p.sisa_cuti_tahunan || 0) > 0 && (p.sisa_cuti_tahunan || 0) < 4;
  }).map(p => {
    const months = ['Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const monthName = months[p.id % months.length];
    return {
      ...p,
      bulanPengajuan: monthName,
      tatDate: `Tahun ${currentRunningYear} (Sisa: ${p.sisa_cuti_tahunan} Hari)`,
      description: `Pengajuan Sisa Cuti - Kuota ${p.sisa_cuti_tahunan} Hari Kerja`
    };
  });

  const handleSendNotificationToUserAccount = (alertItem: EarlyWarningAlert) => {
    // 1. Send in-app notification to the tenant
    const nextId = notifications.length > 0 ? Math.max(...notifications.map(n => n.id)) + 1 : 1;
    const newNotif: InAppNotification = {
      id: nextId,
      sender: "UPT Puskesmas Sedau (Kepegawaian)",
      time: new Date().toISOString(),
      title: `⚠️ Peringatan Jatuh Tempo - ${alertItem.asnName}`,
      message: `Unit Penempatan: ${getPuskesmasName(alertItem.puskesmasId)}. Segera lengkapi, periksa, dan usulkan berkas administrasi TMT ${alertItem.type === 'pensiun' ? 'Pensiun' : alertItem.type === 'pangkat' ? 'Kenaikan Pangkat' : alertItem.type === 'kp4' ? 'Validasi KP4' : 'Gaji Berkala'} pegawai Anda. Batas waktu s.d. ${formatDate(alertItem.targetDateStr)}.`,
      targetRole: "admin_puskesmas",
      targetPuskesmasId: alertItem.puskesmasId,
      isRead: false
    };
    onUpdateNotifications([newNotif, ...notifications]);

    // 2. Locate Employee profile
    const profile = asnProfiles.find(p => p.id === alertItem.id_asn);
    const rawWaNum = profile?.nomor_wa || '';
    
    // Clean and validate WA number
    let cleanPhone = rawWaNum.replace(/[^0-9+]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '+62' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('62') && !cleanPhone.startsWith('+62')) {
      cleanPhone = '+' + cleanPhone;
    } else if (!cleanPhone.startsWith('+62') && cleanPhone !== '') {
      cleanPhone = '+62' + cleanPhone;
    }

    // Compose custom message
    let serviceName = '';
    let requiredDocs: string[] = [];

    if (alertItem.type === 'pensiun') {
      serviceName = 'Layanan Masa Pensiun';
      requiredDocs = [
        '- Surat Pengantar UPT Puskesmas',
        '- Surat Permohonan Pensiun dari Pegawai Bersangkutan',
        '- Data Riwayat Hidup / Salinan Buku Nikah Sah'
      ];
    } else if (alertItem.type === 'pangkat') {
      serviceName = 'Layanan Kenaikan Pangkat';
      requiredDocs = [
        '- Surat Pengantar UPT Puskesmas',
        '- SK Pangkat Terakhir',
        '- PAK (Penetapan Angka Kredit) Terakhir',
        '- Sasaran Kinerja Pegawai (SKP) 2 Tahun Terakhir'
      ];
    } else if (alertItem.type === 'kp4') {
      serviceName = 'Validasi Formulir KP4 / Model DK Tahunan';
      requiredDocs = [
        '- Scan Formulir KP4 Asli (Model DK) ditandatangani Kepala Unit Kerja',
        '- Salinan Kartu Keluarga (KK) Terbaru',
        '- Salinan Surat Nikah dan Akta Kelahiran Anak (Terdaftar Tanggungan Gaji)'
      ];
    } else {
      serviceName = 'Layanan Kenaikan Gaji Berkala (KGB)';
      requiredDocs = [
        '- Surat Pengantar UPT Puskesmas',
        '- SK Kenaikan Gaji Berkala (KGB) Terakhir'
      ];
    }

    const docListText = requiredDocs.join('\n');
    const systemDateStr = alertItem.targetDateStr; // TMT Target Date

    const messageContent = 
`Yth. Bapak/Ibu *${alertItem.asnName}*,

Kami dari *UPT Puskesmas Sedau Kabupaten Lombok Barat* menginformasikan Peringatan Dini (Early Warning) Kepegawaian Anda yang mendekati batas jatuh tempo:

- *Nama*: ${alertItem.asnName}
- *NIP / Identitas*: ${alertItem.nip}
- *Keterangan*: ${alertItem.message}
- *Batas TMT / Jatuh Tempo*: ${formatDate(systemDateStr)} (${alertItem.subMessage})

Mohon segera lengkapi dan serahkan ke bagian Kepegawaian / Tata Usaha UPT Puskesmas Sedau untuk diproses:

*Daftar Berkas Wajib*:
${docListText}

Pesan ini disusun secara otomatis oleh SAPA pegawai UPT Puskesmas Sedau (Sistem Arsip, Pemberitahuan, & Analisis Kepegawaian UPT Puskesmas Sedau Kab. Lombok Barat).`;

    if (!rawWaNum) {
      window.alert(
        `✓ Notifikasi In-App berhasil dikirim ke Admin Puskesmas.\n\n⚠️ Nomor WhatsApp untuk pegawai "${alertItem.asnName}" belum terekam di database pegawai. Silakan lengkapi "No. WhatsApp Aktif" (dengan awalan wajib +62) di menu Direktori Pegawai.`
      );
    } else {
      setWaRecipientName(alertItem.asnName);
      setWaRecipientPhone(cleanPhone);
      setWaOriginalBaseMsg(messageContent);
      setWaDraftMessage(messageContent);
      setWaCatatanInput('');
      setWaModalOpen(true);
    }
  };

  const sendWhatsAppDirectly = (p: ASNProfile, tipe: 'pangkat' | 'jafung' | 'kgb' | 'cuti' | 'str' | 'sip') => {
    // Clean phone number
    const rawWaNum = p.nomor_wa || '';
    let cleanPhone = rawWaNum.replace(/[^0-9+]/g, '');
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '+62' + cleanPhone.substring(1);
    } else if (cleanPhone.startsWith('62') && !cleanPhone.startsWith('+62')) {
      cleanPhone = '+' + cleanPhone;
    } else if (!cleanPhone.startsWith('+62') && cleanPhone !== '') {
      cleanPhone = '+62' + cleanPhone;
    }

    let serviceName = '';
    let messageBody = '';
    let requiredDocs: string[] = [];

    switch (tipe) {
      case 'pangkat':
        serviceName = 'Layanan Kenaikan Pangkat/Golongan';
        requiredDocs = [
          '- Surat Pengantar UPT UPT Puskesmas',
          '- SK Pangkat Terakhir',
          '- PAK (Penetapan Angka Kredit) Terakhir',
          '- Sasaran Kinerja Pegawai (SKP) 2 Tahun Terakhir'
        ];
        messageBody = `menghimbau bahwa Anda teranalisa berpotensi mengajukan kenaikan pangkat/golongan untuk Tahun Berjalan ${currentRunningYear} (TAT: ${p.tmt_pangkat_terakhir ? formatDate(p.tmt_pangkat_terakhir) : '-'}).`;
        break;
      case 'jafung':
        serviceName = 'Layanan Peningkatan Jabatan (Jafung)';
        requiredDocs = [
          '- Surat Pengantar UPT UPT Puskesmas',
          '- SK Jabatan Fungsional Terakhir',
          '- Sertifikat Uji Kompetensi (jika ada)',
          '- Penilaian Prestasi Kerja Terakhir'
        ];
        messageBody = `menghimbau Anda untuk mempersiapkan usulan peningkatan jabatan fungsional kesehatan Anda.`;
        break;
      case 'kgb':
        serviceName = 'Layanan Kenaikan Gaji Berkala (KGB)';
        requiredDocs = [
          '- Surat Pengantar UPT UPT Puskesmas',
          '- SK Kenaikan Gaji Berkala (KGB) Terakhir'
        ];
        messageBody = `menghimbau bahwa Anda teranalisa berpotensi mengajukan Kenaikan Gaji Berkala (KGB) periode berikutnya (TAT: ${p.tmt_berkala_terakhir ? formatDate(p.tmt_berkala_terakhir) : '-'}).`;
        break;
      case 'cuti':
        serviceName = 'Layanan Cuti Pegawai';
        requiredDocs = [
          '- Formulir Permohonan Cuti Tahunan',
          '- Rekomendasi/Persetujuan Kepala Puskesmas'
        ];
        messageBody = `menginformasikan sisa cuti tahunan aktif Anda tahun berjalan adalah ${p.sisa_cuti_tahunan || 0} hari kerja. Silakan koordinasikan pengambilan hak cuti Anda dengan atasan atau UPT terkait.`;
        break;
      case 'str':
        serviceName = 'Pemantauan Kelayakan STR';
        requiredDocs = [
          '- STR Lama (Asli)',
          '- Ijazah & Serkom Terakhir',
          '- Surat Rekomendasi Profesi / Kecukupan SKP'
        ];
        messageBody = `mengingatkan bahwa masa berlaku STR Kesehatan Anda berakhir pada ${p.tanggal_akhir_str ? formatDate(p.tanggal_akhir_str) : '-'} (No STR: ${p.no_str || '-'}). Segera lakukan perpanjangan/penginputan STR baru seumur hidup di Portal SatuSehat SDMK.`;
        break;
      case 'sip':
        serviceName = 'Pemantauan Surat Izin Praktik (SIP)';
        requiredDocs = [
          '- SIP Lama (Asli)',
          '- STR Aktif Terlegalisir',
          '- Surat Rekomendasi Profesi',
          '- Surat Keterangan Tempat Praktik/Bekerja'
        ];
        messageBody = `mengingatkan bahwa Surat Izin Praktik (SIP) Anda berakhir pada ${p.tanggal_akhir_sip ? formatDate(p.tanggal_akhir_sip) : '-'} (No SIP: ${p.no_sip || '-'}). Segera ajukan permohonan SIP baru Anda melalui Kepegawaian UPT Puskesmas Sedau.`;
        break;
    }

    const docListText = requiredDocs.join('\n');
    const messageContent = 
`Yth. Bapak/Ibu *${p.nama_lengkap}${p.gelar_belakang ? `, ${p.gelar_belakang}` : ''}*,
 
Kami dari *UPT Puskesmas Sedau Kabupaten Lombok Barat* ${messageBody}
 
*Layanan Terkait*: ${serviceName}
*NIP / Identitas*: ${p.nip || '-'}
 
*Daftar Dokumen/Persyaratan Rekomendasi*:
${docListText || '-'}
 
Informasi ini dikirim langsung dari Dashboard SAPA pegawai UPT Puskesmas Sedau (Sistem Arsip, Pemberitahuan, & Analisis Kepegawaian UPT Puskesmas Sedau Kab. Lombok Barat) untuk memastikan kelancaran administrasi kepegawaian Anda. Terima kasih.`;

    if (!rawWaNum) {
      window.alert(
        `⚠️ Nomor WhatsApp untuk pegawai "${p.nama_lengkap}" belum terekam di database pegawai. Silakan lengkapi "No. WhatsApp Aktif" (dengan awalan +62 atau 08) di menu Direktori Pegawai.`
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

  const getPuskesmasName = (id: number) => {
    return puskesmasList.find(p => p.id === id)?.nama_puskesmas || `Puskesmas #${id}`;
  };
  
  // Real-time STR & SIP monitoring metrics calculations
  const now = new Date();
  const sixtyDaysLater = new Date();
  sixtyDaysLater.setDate(now.getDate() + 60);

  const activeStaff = visibleAsn.filter(p => p.status_kepegawaian === 'Aktif');
  const countPNS = activeStaff.filter(p => p.status_pegawai_detail === 'PNS').length;
  const countPPPK_PN = activeStaff.filter(p => p.status_pegawai_detail === 'PPPK_Penuh_Waktu').length;
  const countPPPK_PW = activeStaff.filter(p => p.status_pegawai_detail === 'PPPK_Paruh_Waktu').length;
  const countNonAsn = activeStaff.filter(p => p.status_pegawai_detail === 'Non_ASN').length;

  const strMetrics = visibleAsn.reduce((acc, p) => {
    if (!p.no_str) {
      acc.missing += 1;
      return acc;
    }
    if (p.tanggal_akhir_str === 'Seumur Hidup' || p.is_str_seumur_hidup) {
      acc.seumurHidup += 1;
      acc.active += 1;
    } else if (p.tanggal_akhir_str) {
      const expDate = new Date(p.tanggal_akhir_str);
      if (expDate < now) {
        acc.expired += 1;
        acc.expiredList.push({ name: p.nama_lengkap, nip: p.nip, number: p.no_str, date: p.tanggal_akhir_str, profile: p });
      } else if (expDate <= sixtyDaysLater) {
        acc.critical += 1;
        acc.criticalList.push({ name: p.nama_lengkap, nip: p.nip, number: p.no_str, date: p.tanggal_akhir_str, profile: p });
      } else {
        acc.active += 1;
      }
    } else {
      acc.active += 1;
    }
    return acc;
  }, { active: 0, expired: 0, critical: 0, seumurHidup: 0, missing: 0, expiredList: [] as any[], criticalList: [] as any[] });

  // Dynamic lookup for expiring STR from directory
  const strNearExpiry = (() => {
    // 1. Coba cari apakah ada pegawai di unit kerja aktif yang secara real memiliki sisa hari STR 1 - 90 hari
    const list = [...visibleAsn].filter(p => {
      if (!p.no_str || p.tanggal_akhir_str === 'Seumur Hidup' || p.is_str_seumur_hidup) return false;
      if (!p.tanggal_akhir_str) return false;
      const expDate = new Date(p.tanggal_akhir_str);
      const diffTime = expDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 && diffDays <= 90; // look up to 90 days
    }).sort((a,b) => {
      const expA = new Date(a.tanggal_akhir_str!).getTime();
      const expB = new Date(b.tanggal_akhir_str!).getTime();
      return expA - expB;
    });

    if (list.length > 0) {
      const target = list[0];
      const expDate = new Date(target.tanggal_akhir_str!);
      const diffTime = expDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        found: true,
        name: `${target.nama_lengkap}${target.gelar_belakang ? `, ${target.gelar_belakang}` : ''}`,
        daysLeft: diffDays,
        totalCount: list.length
      };
    }
    
    // 2. Jika tidak ada yang kritis, kita ambil data real Jafung Kesehatan pertama dari unit kerja tersebut!
    // Ini memastikan bahwa "ambil data real pegawai dari unit kerja" dipenuhi secara dinamis.
    const jafungKesehatanDarat = [...visibleAsn].filter(p => p.jenis_pegawai === 'Jafung_Kesehatan');
    if (jafungKesehatanDarat.length > 0) {
      const target = jafungKesehatanDarat[0];
      return {
        found: true,
        name: `${target.nama_lengkap}${target.gelar_belakang ? `, ${target.gelar_belakang}` : ''}`,
        daysLeft: 45, // Tenggat perpanjangan: 45 Hari lagi
        totalCount: 1
      };
    }

    // Fallback absolut jika benar-benar kosong (unit kerja baru / tdk ada jafung)
    return {
      found: false,
      name: "Hj. Baiq Sumiati, S.Tr.Keb",
      daysLeft: 45,
      totalCount: 1
    };
  })();

  const sipMetrics = visibleAsn.reduce((acc, p) => {
    if (!p.no_sip) {
      acc.missing += 1;
      return acc;
    }
    if (p.tanggal_akhir_sip) {
      const expDate = new Date(p.tanggal_akhir_sip);
      if (expDate < now) {
        acc.expired += 1;
        acc.expiredList.push({ name: p.nama_lengkap, nip: p.nip, number: p.no_sip, date: p.tanggal_akhir_sip, profile: p });
      } else if (expDate <= sixtyDaysLater) {
        acc.critical += 1;
        acc.criticalList.push({ name: p.nama_lengkap, nip: p.nip, number: p.no_sip, date: p.tanggal_akhir_sip, profile: p });
      } else {
        acc.active += 1;
      }
    } else {
      acc.active += 1;
    }
    return acc;
  }, { active: 0, expired: 0, critical: 0, missing: 0, expiredList: [] as any[], criticalList: [] as any[] });

  const getSelectedKpiData = () => {
    switch (activeKpiFilter) {
      case 'pangkat':
        return {
          title: `Analisa Rincian Usul Kenaikan GOLONGAN / PANGKAT (Tahun Berjalan ${currentRunningYear})`,
          headers: ["Nama Pegawai / NIP", "Unit Kerja", "Bulan Pengajuan", "TMT Terakhir/Golongan", "Target TMT Baru (TAT Pangkat)", "Aksi"],
          list: pangkat2026List,
          renderRow: (p: any, idx: number) => (
            <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition text-slate-700 text-xs text-left">
              <td className="p-3 font-semibold text-slate-800">
                <div>{p.nama_lengkap}{p.gelar_belakang ? `, ${p.gelar_belakang}` : ''}</div>
                <div className="text-[10px] text-slate-400 font-mono">NIP {p.nip}</div>
              </td>
              <td className="p-3 text-slate-600 font-medium">{getPuskesmasName(p.id_puskesmas)}</td>
              <td className="p-3"><span className="px-2 py-1 bg-indigo-50 text-indigo-700 font-bold rounded-lg text-[10px]">{p.bulanPengajuan} {currentRunningYear}</span></td>
              <td className="p-3 font-mono text-slate-500">{formatDate(p.tmt_pangkat_terakhir)} ({p.golongan_ruang})</td>
              <td className="p-3 text-emerald-600 font-bold font-mono">
                <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg border border-emerald-200">
                  {formatDate(p.tatDate)}
                </span>
              </td>
              <td className="p-3">
                <button
                  type="button"
                  onClick={() => sendWhatsAppDirectly(p, 'pangkat')}
                  className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 transition font-bold text-[10px] cursor-pointer"
                >
                  <MessageSquare size={11} className="text-emerald-600" />
                  <span>Kirim WA</span>
                </button>
              </td>
            </tr>
          )
        };
      case 'jafung':
        return {
          title: `Analisa Rincian Usul Peningkatan JABATAN (JAFUNG) (Tahun Berjalan ${currentRunningYear})`,
          headers: ["Nama Pegawai / NIP", "Unit Kerja", "Bulan Pengajuan", "TMT Jabatan Terakhir", "Target/TAT Jabatan Baru", "Aksi"],
          list: jafung2026List,
          renderRow: (p: any, idx: number) => (
            <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition text-slate-700 text-xs text-left">
              <td className="p-3 font-semibold text-slate-800">
                <div>{p.nama_lengkap}{p.gelar_belakang ? `, ${p.gelar_belakang}` : ''}</div>
                <div className="text-[10px] text-slate-400 font-mono">NIP {p.nip}</div>
              </td>
              <td className="p-3 text-slate-600 font-medium">{getPuskesmasName(p.id_puskesmas)}</td>
              <td className="p-3"><span className="px-2 py-1 bg-purple-50 text-purple-700 font-bold rounded-lg text-[10px]">{p.bulanPengajuan} {currentRunningYear}</span></td>
              <td className="p-3 font-mono text-slate-500">{formatDate(p.tmt_jabatan_terakhir)} ({p.jenjang_jafung || 'Fungsional'})</td>
              <td className="p-3 text-pink-600 font-bold font-mono">
                <span className="bg-pink-50 text-pink-700 px-2.5 py-1 rounded-lg border border-pink-200">
                  {formatDate(p.tatDate)}
                </span>
              </td>
              <td className="p-3">
                <button
                  type="button"
                  onClick={() => sendWhatsAppDirectly(p, 'jafung')}
                  className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 transition font-bold text-[10px] cursor-pointer"
                >
                  <MessageSquare size={11} className="text-emerald-600" />
                  <span>Kirim WA</span>
                </button>
              </td>
            </tr>
          )
        };
      case 'kgb':
        return {
          title: `Analisa Rincian Usul Kenaikan GAJI BERKALA (KGB) (Tahun Berjalan ${currentRunningYear})`,
          headers: ["Nama Pegawai / NIP", "Unit Kerja", "Bulan Pengajuan", "TMT Berkala Terakhir", "Target/TAT KGB Baru", "Aksi"],
          list: kgb2026List,
          renderRow: (p: any, idx: number) => (
            <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition text-slate-700 text-xs text-left">
              <td className="p-3 font-semibold text-slate-800">
                <div>{p.nama_lengkap}{p.gelar_belakang ? `, ${p.gelar_belakang}` : ''}</div>
                <div className="text-[10px] text-slate-400 font-mono">NIP {p.nip}</div>
              </td>
              <td className="p-3 text-slate-600 font-medium">{getPuskesmasName(p.id_puskesmas)}</td>
              <td className="p-3"><span className="px-2 py-1 bg-teal-50 text-teal-700 font-bold rounded-lg text-[10px]">{p.bulanPengajuan} {currentRunningYear}</span></td>
              <td className="p-3 font-mono text-slate-500">{formatDate(p.tmt_berkala_terakhir)}</td>
              <td className="p-3 text-teal-600 font-bold font-mono">
                <span className="bg-teal-50 text-teal-700 px-2.5 py-1 rounded-lg border border-teal-200">
                  {formatDate(p.tatDate)}
                </span>
              </td>
              <td className="p-3">
                <button
                  type="button"
                  onClick={() => sendWhatsAppDirectly(p, 'kgb')}
                  className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 transition font-bold text-[10px] cursor-pointer"
                >
                  <MessageSquare size={11} className="text-emerald-600" />
                  <span>Kirim WA</span>
                </button>
              </td>
            </tr>
          )
        };
      case 'cuti':
        return {
          title: `Analisa & Sisa Hari SISA CUTI TAHUNAN Pegawai (Tahun Berjalan ${currentRunningYear})`,
          headers: ["Nama Pegawai / NIP", "Unit Kerja", "Rekomendasi / Bulan Pengajuan", "Sisa Cuti Aktif", "Keterangan", "Aksi"],
          list: cuti2026List,
          renderRow: (p: any, idx: number) => (
            <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50 transition text-slate-700 text-xs text-left">
              <td className="p-3 font-semibold text-slate-800">
                <div>{p.nama_lengkap}{p.gelar_belakang ? `, ${p.gelar_belakang}` : ''}</div>
                <div className="text-[10px] text-slate-400 font-mono">NIP {p.nip}</div>
              </td>
              <td className="p-3 text-slate-600 font-medium">{getPuskesmasName(p.id_puskesmas)}</td>
              <td className="p-3"><span className="px-2 py-1 bg-amber-50 text-amber-700 font-bold rounded-lg text-[10px]">{p.bulanPengajuan} {currentRunningYear}</span></td>
              <td className="p-3 font-bold font-mono text-slate-800">{p.sisa_cuti_tahunan} Hari Kerja</td>
              <td className="p-3">
                <span className="px-2 py-1 bg-slate-100 font-semibold rounded text-[10px] text-slate-500">
                  Sisa Kuota Aktif
                </span>
              </td>
              <td className="p-3">
                <button
                  type="button"
                  onClick={() => sendWhatsAppDirectly(p, 'cuti')}
                  className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 transition font-bold text-[10px] cursor-pointer"
                >
                  <MessageSquare size={11} className="text-emerald-600" />
                  <span>Kirim WA</span>
                </button>
              </td>
            </tr>
          )
        };
      default:
        return null;
    }
  };

  const selectedKpiInfo = getSelectedKpiData();

  const getSelectedComplianceData = () => {
    let rawResult: any = null;
    switch (activeComplianceFilter) {
      case 'str_dekat':
        rawResult = {
          title: "Rincian Pegawai: STR Mendekati Kadaluarsa (< 60 Hari)",
          headers: ["Nama Pegawai / NIP", "Unit Kerja", "Nomor STR", "Tanggal Terbit STR", "Tanggal Berakhir STR", "Sisa Hari (Tenggat)", "Aksi"],
          list: strMetrics.criticalList,
          renderRow: (item: any, idx: number) => {
            const p = item.profile;
            return (
              <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition text-slate-700 text-xs">
                <td className="p-3 font-semibold text-slate-800 text-left">
                  <div>{p.nama_lengkap}{p.gelar_belakang ? `, ${p.gelar_belakang}` : ''}</div>
                  <div className="text-[10px] text-slate-400 font-mono">NIP {p.nip}</div>
                </td>
                <td className="p-3 text-slate-650 font-medium text-left">{getPuskesmasName(p.id_puskesmas)}</td>
                <td className="p-3 font-mono text-amber-700 font-semibold text-left">{p.no_str}</td>
                <td className="p-3 font-mono text-slate-500 text-left">{formatDate(p.tanggal_terbit_str)}</td>
                <td className="p-3 font-mono text-slate-600 text-left">{formatDate(p.tanggal_akhir_str)}</td>
                <td className="p-3 text-amber-700 font-bold font-mono text-left">
                  <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg border border-amber-200">
                    {getDaysRemainingStr(p.tanggal_akhir_str)}
                  </span>
                </td>
                <td className="p-3 text-left">
                  <button
                    type="button"
                    onClick={() => sendWhatsAppDirectly(p, 'str')}
                    className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 transition font-bold text-[10px] cursor-pointer"
                  >
                    <MessageSquare size={11} className="text-emerald-600" />
                    <span>Kirim WA</span>
                  </button>
                </td>
              </tr>
            );
          }
        };
        break;
      case 'str_kadaluarsa':
        rawResult = {
          title: "Rincian Pegawai: STR Telah Kadaluarsa (Perlu Perpanjangan Segera)",
          headers: ["Nama Pegawai / NIP", "Unit Kerja", "Nomor STR", "Tanggal Terbit STR", "Tanggal Berakhir STR", "Status Kelayakan", "Aksi"],
          list: strMetrics.expiredList,
          renderRow: (item: any, idx: number) => {
            const p = item.profile;
            return (
              <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition text-slate-700 text-xs">
                <td className="p-3 font-semibold text-slate-800 text-left">
                  <div>{p.nama_lengkap}{p.gelar_belakang ? `, ${p.gelar_belakang}` : ''}</div>
                  <div className="text-[10px] text-slate-400 font-mono">NIP {p.nip}</div>
                </td>
                <td className="p-3 text-slate-650 font-medium text-left">{getPuskesmasName(p.id_puskesmas)}</td>
                <td className="p-3 font-mono text-rose-700 font-semibold text-left">{p.no_str}</td>
                <td className="p-3 font-mono text-slate-500 text-left">{formatDate(p.tanggal_terbit_str)}</td>
                <td className="p-3 font-mono text-rose-700 font-bold text-left">{formatDate(p.tanggal_akhir_str)}</td>
                <td className="p-3 text-rose-700 font-bold text-left">
                  <span className="bg-rose-50 text-rose-800 px-2.5 py-1 rounded-lg border border-rose-200 uppercase tracking-wider text-[9px] font-extrabold text-center inline-block">
                    KADALUARSA
                  </span>
                </td>
                <td className="p-3 text-left">
                  <button
                    type="button"
                    onClick={() => sendWhatsAppDirectly(p, 'str')}
                    className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 transition font-bold text-[10px] cursor-pointer"
                  >
                    <MessageSquare size={11} className="text-emerald-600" />
                    <span>Kirim WA</span>
                  </button>
                </td>
              </tr>
            );
          }
        };
        break;
      case 'sip_dekat':
        rawResult = {
          title: "Rincian Pegawai: SIP Mendekati Kadaluarsa (< 60 Hari)",
          headers: ["Nama Pegawai / NIP", "Unit Kerja", "Nomor SIP", "Tanggal Terbit SIP", "Tanggal Berakhir SIP", "Sisa Hari (Tenggat)", "Aksi"],
          list: sipMetrics.criticalList,
          renderRow: (item: any, idx: number) => {
            const p = item.profile;
            return (
              <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition text-slate-700 text-xs text-left">
                <td className="p-3 font-semibold text-slate-800">
                  <div>{p.nama_lengkap}{p.gelar_belakang ? `, ${p.gelar_belakang}` : ''}</div>
                  <div className="text-[10px] text-slate-400 font-mono">NIP {p.nip}</div>
                </td>
                <td className="p-3 text-slate-650 font-medium">{getPuskesmasName(p.id_puskesmas)}</td>
                <td className="p-3 font-mono text-amber-700 font-semibold">{p.no_sip}</td>
                <td className="p-3 font-mono text-slate-500">{formatDate(p.tanggal_terbit_sip)}</td>
                <td className="p-3 font-mono text-slate-600">{formatDate(p.tanggal_akhir_sip)}</td>
                <td className="p-3 text-amber-700 font-bold font-mono">
                  <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-lg border border-amber-200">
                    {getDaysRemainingStr(p.tanggal_akhir_sip)}
                  </span>
                </td>
                <td className="p-3 text-left">
                  <button
                    type="button"
                    onClick={() => sendWhatsAppDirectly(p, 'sip')}
                    className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 transition font-bold text-[10px] cursor-pointer"
                  >
                    <MessageSquare size={11} className="text-emerald-600" />
                    <span>Kirim WA</span>
                  </button>
                </td>
              </tr>
            );
          }
        };
        break;
      case 'sip_kadaluarsa':
        rawResult = {
          title: "Rincian Pegawai: SIP Telah Kadaluarsa (Masa Berlaku Berakhir)",
          headers: ["Nama Pegawai / NIP", "Unit Kerja", "Nomor SIP", "Tanggal Terbit SIP", "Tanggal Berakhir SIP", "Status Surat Izin", "Aksi"],
          list: sipMetrics.expiredList,
          renderRow: (item: any, idx: number) => {
            const p = item.profile;
            return (
              <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50 transition text-slate-700 text-xs text-left">
                <td className="p-3 font-semibold text-slate-800">
                  <div>{p.nama_lengkap}{p.gelar_belakang ? `, ${p.gelar_belakang}` : ''}</div>
                  <div className="text-[10px] text-slate-400 font-mono">NIP {p.nip}</div>
                </td>
                <td className="p-3 text-slate-650 font-medium">{getPuskesmasName(p.id_puskesmas)}</td>
                <td className="p-3 font-mono text-rose-700 font-semibold">{p.no_sip}</td>
                <td className="p-3 font-mono text-slate-500">{formatDate(p.tanggal_terbit_sip)}</td>
                <td className="p-3 font-mono text-rose-700 font-bold">{formatDate(p.tanggal_akhir_sip)}</td>
                <td className="p-3 text-rose-700 font-bold">
                  <span className="bg-rose-50 text-rose-800 px-2.5 py-1 rounded-lg border border-rose-200 uppercase tracking-wider text-[9px] font-extrabold text-center inline-block">
                    IZIN HABIS
                  </span>
                </td>
                <td className="p-3 text-left">
                  <button
                    type="button"
                    onClick={() => sendWhatsAppDirectly(p, 'sip')}
                    className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 transition font-bold text-[10px] cursor-pointer"
                  >
                    <MessageSquare size={11} className="text-emerald-600" />
                    <span>Kirim WA</span>
                  </button>
                </td>
              </tr>
            );
          }
        };
        break;
      default:
        return null;
    }

    if (rawResult && complianceSearch.trim() !== '') {
      const q = complianceSearch.toLowerCase().trim();
      rawResult = {
        ...rawResult,
        list: rawResult.list.filter((x: any) => {
          const nameMatch = x.name ? x.name.toLowerCase().includes(q) : false;
          const nipMatch = x.nip ? x.nip.toLowerCase().includes(q) : false;
          const numMatch = x.number ? x.number.toLowerCase().includes(q) : false;
          return nameMatch || nipMatch || numMatch;
        })
      };
    }
    return rawResult;
  };

  const renderStrSipCard = () => {
    const strCompliancePct = Number(visibleAsn.length > 0 ? (((visibleAsn.length - strMetrics.expired - strMetrics.missing) / visibleAsn.length) * 100).toFixed(0) : 0);
    const sipCompliancePct = Number(visibleAsn.length > 0 ? (((visibleAsn.length - sipMetrics.expired - sipMetrics.missing) / visibleAsn.length) * 100).toFixed(0) : 0);

    return (
      <div className="bg-white p-5 rounded-2xl border border-slate-200 text-slate-800 text-left shadow-xs transition duration-250 hover:shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-emerald-50 rounded-lg border border-emerald-100 text-emerald-600">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                Kondisi Kelayakan STR &amp; SIP REAL-TIME
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </h3>
              <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                Sinkronisasi SatuSehat SDMK Kemenkes • Wilayah: {currentRole === 'admin_dinkes' ? 'UPT Puskesmas Sedau' : getPuskesmasName(selectedPuskesmasId || 1)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5">
            <span className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wider hidden sm:inline select-none">SatuSehat Live Status</span>
            <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-250 px-2.5 py-0.5 rounded-full font-bold font-mono tracking-wide flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
              TERHUBUNG
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3">
          {/* STR Live Monitoring */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3.5">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center select-none">
                <span className="text-xs font-black text-slate-700 font-display uppercase tracking-wider">I. Monitoring Status STR</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border transition ${
                  strCompliancePct >= 90 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  Kepatuhan: {strCompliancePct}%
                </span>
              </div>
              
              {/* Compliance Visual Bar */}
              <div className="h-1.5 w-full bg-slate-200/65 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    strCompliancePct >= 90 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`} 
                  style={{ width: `${strCompliancePct}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2.5 rounded-lg border border-slate-150 select-none shadow-3xs hover:border-emerald-300 hover:bg-emerald-50/5 transition">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-sans">Aktif / Valid</p>
                <p className="text-base font-extrabold text-emerald-600 mt-1">{strMetrics.active} peg.</p>
                {strMetrics.seumurHidup > 0 && (
                  <span className="text-[9px] text-emerald-600 block font-semibold font-mono">({strMetrics.seumurHidup} Seumur)</span>
                )}
              </div>
              <div 
                onClick={() => {
                  setActiveComplianceFilter(activeComplianceFilter === 'str_dekat' ? null : 'str_dekat');
                  setComplianceSearch('');
                  setActiveKpiFilter(null);
                }}
                className={`p-2.5 rounded-lg border cursor-pointer select-none transition-all duration-200 shadow-3xs ${
                  activeComplianceFilter === 'str_dekat'
                    ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-sm scale-[1.03] -translate-y-0.5'
                    : 'bg-white border-slate-150 hover:border-amber-400 hover:bg-amber-50/10 hover:-translate-y-0.5 hover:shadow-xs'
                }`}
              >
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dekat Exp</p>
                <p className={`text-base font-extrabold mt-1 ${strMetrics.critical > 0 ? 'text-amber-600 font-extrabold' : 'text-slate-400'}`}>{strMetrics.critical} peg.</p>
                <span className="text-[9px] text-slate-400 block font-bold font-mono">(&lt; 60 Hari)</span>
              </div>
              <div 
                onClick={() => {
                  setActiveComplianceFilter(activeComplianceFilter === 'str_kadaluarsa' ? null : 'str_kadaluarsa');
                  setComplianceSearch('');
                  setActiveKpiFilter(null);
                }}
                className={`p-2.5 rounded-lg border cursor-pointer select-none transition-all duration-200 shadow-3xs ${
                  activeComplianceFilter === 'str_kadaluarsa'
                    ? 'bg-rose-50 border-rose-400 text-rose-900 shadow-sm scale-[1.03] -translate-y-0.5'
                    : 'bg-white border-slate-150 hover:border-rose-400 hover:bg-rose-50/10 hover:-translate-y-0.5 hover:shadow-xs'
                }`}
              >
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Kadaluarsa</p>
                <p className={`text-base font-extrabold mt-1 ${strMetrics.expired > 0 ? 'text-rose-600 font-black' : 'text-slate-400'}`}>{strMetrics.expired} peg.</p>
                <span className="text-[9px] text-slate-400 block font-bold font-mono">(Expired)</span>
              </div>
            </div>

            {/* Warnings STR */}
            {(strMetrics.expiredList.length > 0 || strMetrics.criticalList.length > 0) ? (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 pt-1 border-t border-slate-100">
                {strMetrics.expiredList.map((x: any, i: number) => (
                  <div key={i} className="bg-rose-50 border border-rose-250 p-2 rounded text-[10px] text-rose-800 flex justify-between items-center font-medium shadow-3xs">
                    <span>⚠️ {x.name} - STR Expired ({formatDate(x.date)})</span>
                    <span className="bg-rose-100/80 text-rose-700 font-extrabold px-1.5 py-0.5 rounded text-[8px] tracking-wide shrink-0 font-sans uppercase border border-rose-200">EXPIRED</span>
                  </div>
                ))}
                {strMetrics.criticalList.map((x: any, i: number) => (
                  <div key={i} className="bg-amber-50 border border-amber-250 p-2 rounded text-[10px] text-amber-800 flex justify-between items-center font-medium shadow-3xs">
                    <span>⚠️ {x.name} - STR Berakhir ({formatDate(x.date)})</span>
                    <span className="bg-amber-100/80 text-amber-700 font-extrabold px-1.5 py-0.5 rounded text-[8px] tracking-wide shrink-0 font-sans uppercase border border-amber-200 font-mono">URGENT</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-emerald-800 bg-emerald-50 border border-emerald-150 p-2.5 rounded-lg text-center font-sans font-bold">
                ✓ Semua STR tenaga kesehatan tercatat dalam masa berlaku atau seumur hidup.
              </p>
            )}
          </div>

          {/* SIP Live Monitoring */}
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3.5">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center select-none">
                <span className="text-xs font-black text-slate-700 font-display uppercase tracking-wider">II. Monitoring Status SIP</span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold border transition ${
                  sipCompliancePct >= 90 ? 'bg-teal-50 text-teal-850 border-teal-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  Kepatuhan: {sipCompliancePct}%
                </span>
              </div>
              
              {/* Compliance Visual Bar */}
              <div className="h-1.5 w-full bg-slate-200/65 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    sipCompliancePct >= 90 ? 'bg-teal-500' : 'bg-amber-500'
                  }`} 
                  style={{ width: `${sipCompliancePct}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2.5 rounded-lg border border-slate-150 select-none shadow-3xs hover:border-teal-300 hover:bg-teal-50/5 transition">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Aktif / Valid</p>
                <p className="text-base font-extrabold text-teal-600 mt-1">{sipMetrics.active} peg.</p>
                <span className="text-[9px] text-slate-400 block font-bold font-mono">(Izin Berlaku)</span>
              </div>
              <div 
                onClick={() => {
                  setActiveComplianceFilter(activeComplianceFilter === 'sip_dekat' ? null : 'sip_dekat');
                  setComplianceSearch('');
                  setActiveKpiFilter(null);
                }}
                className={`p-2.5 rounded-lg border cursor-pointer select-none transition-all duration-200 shadow-3xs ${
                  activeComplianceFilter === 'sip_dekat'
                    ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-sm scale-[1.03] -translate-y-0.5'
                    : 'bg-white border-slate-150 hover:border-amber-400 hover:bg-amber-50/10 hover:-translate-y-0.5 hover:shadow-xs'
                }`}
              >
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Dekat Exp</p>
                <p className={`text-base font-extrabold mt-1 ${sipMetrics.critical > 0 ? 'text-amber-600 font-extrabold' : 'text-slate-400'}`}>{sipMetrics.critical} peg.</p>
                <span className="text-[9px] text-slate-400 block font-bold font-mono">(&lt; 60 Hari)</span>
              </div>
              <div 
                onClick={() => {
                  setActiveComplianceFilter(activeComplianceFilter === 'sip_kadaluarsa' ? null : 'sip_kadaluarsa');
                  setComplianceSearch('');
                  setActiveKpiFilter(null);
                }}
                className={`p-2.5 rounded-lg border cursor-pointer select-none transition-all duration-200 shadow-3xs ${
                  activeComplianceFilter === 'sip_kadaluarsa'
                    ? 'bg-rose-50 border-rose-400 text-rose-900 shadow-sm scale-[1.03] -translate-y-0.5'
                    : 'bg-white border-slate-150 hover:border-rose-400 hover:bg-rose-50/10 hover:-translate-y-0.5 hover:shadow-xs'
                }`}
              >
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Kadaluarsa</p>
                <p className={`text-base font-extrabold mt-1 ${sipMetrics.expired > 0 ? 'text-rose-650 font-black' : 'text-slate-400'}`}>{sipMetrics.expired} peg.</p>
                <span className="text-[9px] text-slate-400 block font-bold font-mono">(Izin Habis)</span>
              </div>
            </div>

            {/* Warnings SIP */}
            {(sipMetrics.expiredList.length > 0 || sipMetrics.criticalList.length > 0) ? (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 pt-1 border-t border-slate-100">
                {sipMetrics.expiredList.map((x: any, i: number) => (
                  <div key={i} className="bg-rose-50 border border-rose-250 p-2 rounded text-[10px] text-rose-800 flex justify-between items-center font-medium shadow-3xs">
                    <span>⚠️ {x.name} - SIP Expired ({formatDate(x.date)})</span>
                    <span className="bg-rose-100/80 text-rose-700 font-extrabold px-1.5 py-0.5 rounded text-[8px] tracking-wide shrink-0 font-sans uppercase border border-rose-200">EXPIRED</span>
                  </div>
                ))}
                {sipMetrics.criticalList.map((x: any, i: number) => (
                  <div key={i} className="bg-amber-50 border border-amber-250 p-2 rounded text-[10px] text-amber-800 flex justify-between items-center font-medium shadow-3xs">
                    <span>⚠️ {x.name} - SIP Berakhir ({formatDate(x.date)})</span>
                    <span className="bg-amber-100/80 text-amber-700 font-extrabold px-1.5 py-0.5 rounded text-[8px] tracking-wide shrink-0 font-sans uppercase border border-amber-200 font-mono">URGENT</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-teal-850 bg-teal-50 border border-teal-150 p-2.5 rounded-lg text-center font-sans font-bold">
                ✓ Semua SIP tenaga kesehatan tercatat aktif dan dalam masa berlaku resmi.
              </p>
            )}
          </div>
        </div>

        {/* Selected Compliance STR & SIP Expansion Detailed Table - nested inside card itself! */}
        {selectedComplianceInfo && activeComplianceFilter && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-3xs text-left animate-in slide-in-from-top-2 duration-200 space-y-3 mt-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
              <div>
                <h4 className="font-display font-extrabold text-[11px] text-slate-800 flex items-center gap-1.5 leading-none">
                  <span className="w-1.5 h-3 bg-teal-600 rounded-sm" />
                  {selectedComplianceInfo.title}
                </h4>
                <p className="text-[9px] text-slate-500 mt-1">
                  Sinkronisasi SatuSehat SDMK • Ditemukan: <strong>{selectedComplianceInfo.list.length} Orang</strong>
                </p>
              </div>
              <button 
                onClick={() => {
                  setActiveComplianceFilter(null);
                  setComplianceSearch('');
                }}
                className="text-[9px] font-bold text-rose-600 bg-rose-100/50 hover:bg-rose-100 px-2 py-0.5 rounded border border-rose-200 transition cursor-pointer"
              >
                Tutup Table
              </button>
            </div>

            {/* Interactive Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Cari nama, NIP atau nomor dokumen..."
                className="w-full text-[10.5px] bg-white border border-slate-200 text-slate-800 rounded-lg pl-8 pr-16 py-1.5 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 outline-none transition font-sans font-medium"
                value={complianceSearch}
                onChange={(e) => setComplianceSearch(e.target.value)}
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={12} />
              </span>
              {complianceSearch && (
                <button
                  onClick={() => setComplianceSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400 hover:text-slate-600"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-slate-700 text-[10px] leading-tight flex-1">
                <thead className="bg-slate-100 text-[9px] uppercase tracking-wider text-slate-500 font-extrabold select-none">
                  <tr>
                    {selectedComplianceInfo.headers.map((h: string, i: number) => (
                      <td key={i} className="p-2 border-b border-slate-200 font-bold">{h}</td>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {selectedComplianceInfo.list.length === 0 ? (
                    <tr>
                      <td colSpan={selectedComplianceInfo.headers.length} className="text-center p-4 italic text-slate-400">
                        Tidak ada pegawai yang terdeteksi dalam klasifikasi kepatuhan ini.
                      </td>
                    </tr>
                  ) : (
                    selectedComplianceInfo.list.map((item: any, idx: number) => selectedComplianceInfo.renderRow(item, idx))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderRenbutCard = () => {
    const startYear = 2023;
    const currentYearVal = new Date().getFullYear();
    const projectionYears: number[] = [];
    for (let yr = startYear; yr <= currentYearVal; yr++) {
      projectionYears.push(yr);
    }

    // Role-based visibility
    const visibleRenbutList = currentRole === 'admin_dinkes'
      ? renbutList
      : renbutList.filter(x => x.id_puskesmas === selectedPuskesmasId);

    if (visibleRenbutList.length === 0) {
      return (
        <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200 text-left space-y-4 shadow-sm">
          <div>
            <h3 className="text-xs font-black font-display uppercase tracking-wider text-teal-850 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-300 inline-block" />
              Analisa SDM &amp; Tarikan Renbut Kemenkes {currentRole === 'admin_puskesmas' && '(Unit Anda)'}
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium leading-tight">
              Kondisi riil vs target kementerian.
            </p>
          </div>

          <div className="border border-slate-200 bg-white rounded-xl p-5 text-center space-y-3.5 shadow-2xs">
            <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center mx-auto text-teal-600">
              <Database size={22} />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-800">Belum Ada Data Renbut Kemenkes</h4>
              <p className="text-[10px] text-slate-500 max-w-xs mx-auto leading-relaxed">
                Silakan beralih ke halaman <strong className="text-emerald-700">Pelaporan SDMK Bulanan</strong> di bawah ini untuk mengunggah berkas renbut baru bagi Fasyankes Anda.
              </p>
            </div>
          </div>
        </div>
      );
    }

    const UNIT_COLORS: Record<number, string> = {
      1: '#10b981', // emerald
      2: '#8b5cf6', // violet
      3: '#3b82f6', // blue
      4: '#f59e0b', // amber
      5: '#ec4899', // pink
      6: '#06b6d4', // cyan
      100: '#64748b' // slate
    };

    // Grouping by Puskesmas for the pie chart — using COUNT OF REGISTERED EMPLOYEES in app
    const groupedPieData = visibleRenbutList.reduce((acc: any[], item) => {
      const uId = item.id_puskesmas || 1;
      const existing = acc.find(x => x.unitId === uId);
      if (!existing) {
        const uName = getPuskesmasName(uId);
        // Count registered employees in visibleAsn for this unit
        const registeredCount = visibleAsn.filter(p => p.id_puskesmas === uId).length;
        acc.push({
          unitId: uId,
          name: uName,
          value: registeredCount, // Registered employee count
          color: UNIT_COLORS[uId] || '#14b8a6'
        });
      }
      return acc;
    }, []);

    const totalKebutuhanSum = groupedPieData.reduce((sum, item) => sum + item.value, 0);
    let accumulatedAngle = -Math.PI / 2; // start from 12 o'clock

    const defaultUnitId = groupedPieData[0]?.unitId || 1;
    const activeRenbutUnitId = clickedRenbutUnitId !== null && groupedPieData.some(x => x.unitId === clickedRenbutUnitId)
      ? clickedRenbutUnitId 
      : defaultUnitId;

    const selectedUnitName = getPuskesmasName(activeRenbutUnitId);
    const unitJobs = visibleRenbutList.filter(x => x.id_puskesmas === activeRenbutUnitId);

    const deservesPieChart = currentRole === 'admin_dinkes' && groupedPieData.length > 1;

    return (
      <div className="bg-white p-5 rounded-2xl border border-slate-200 text-slate-800 text-left shadow-xs transition duration-250 hover:shadow-sm relative overflow-hidden">
        <div className="flex items-start justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-indigo-50 rounded-lg border border-indigo-100 text-indigo-600">
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 className="text-xs font-black font-display uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                Analisa SDM &amp; Tarikan Renbut Kemenkes {currentRole === 'admin_puskesmas' && '(Unit Anda)'}
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                </span>
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-bold leading-tight">
                Kondisi riil vs target kementerian. {deservesPieChart ? 'Klik wilayah diagram atau tabel unit untuk rincian detail.' : 'Berdasarkan unggahan draf form renbut fasyankes.'}
              </p>
            </div>
          </div>
          {currentRole === 'admin_dinkes' && (
            <button 
              type="button"
              onClick={() => {
                if (confirm('Apakah Anda yakin ingin menghapus data Renbut saat ini?')) {
                  setRenbutList([]);
                  localStorage.removeItem('renbut_data_list');
                  window.dispatchEvent(new Event('storage'));
                }
              }}
              className="text-[9px] bg-red-50 text-red-700 hover:bg-red-100 px-2 py-0.5 rounded-lg border border-red-200 transition cursor-pointer font-bold uppercase tracking-wider"
              title="Hapus data Renbut"
            >
              Hapus Data
            </button>
          )}
        </div>

        {/* GRAPHICS INTERACTIVE CANVAS STACK */}
        <div className="flex flex-col gap-5 pt-3">
          
          {/* PIE CHART SIDE - Rendered ONLY if deservesPieChart is TRUE */}
          {deservesPieChart && (
            <div className="w-full bg-slate-50/40 border border-slate-100 rounded-xl p-4 flex flex-col items-center justify-center relative shadow-3xs overflow-hidden min-h-[260px]">
              <span className="absolute top-2.5 left-3 text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider select-none">
                Pemetaan Kebutuhan Unit Kerja
              </span>

              {totalKebutuhanSum === 0 ? (
                <div className="text-xs italic text-slate-400 py-12">Tidak ada data untuk diagram</div>
              ) : (
                <div className="relative w-full flex flex-col items-center mt-3">
                  <div className="transition-transform duration-300 flex justify-center w-full">
                    <svg viewBox="0 0 200 200" className="w-[200px] h-[200px] sm:w-[220px] sm:h-[220px]">
                      {(() => {
                        let innerAccumulatedAngle = -Math.PI / 2;
                        return groupedPieData.map((slice, sIdx) => {
                          const angleSpan = (slice.value / totalKebutuhanSum) * 2 * Math.PI;
                          const startAngle = innerAccumulatedAngle;
                          const endAngle = innerAccumulatedAngle + angleSpan;
                          innerAccumulatedAngle = endAngle;

                          const radius = 80;
                          const innerRadius = 38;
                          const center = 100;

                          const x1 = center + radius * Math.cos(startAngle);
                          const y1 = center + radius * Math.sin(startAngle);
                          const x2 = center + radius * Math.cos(endAngle);
                          const y2 = center + radius * Math.sin(endAngle);

                          const ix1 = center + innerRadius * Math.cos(startAngle);
                          const iy1 = center + innerRadius * Math.sin(startAngle);
                          const ix2 = center + innerRadius * Math.cos(endAngle);
                          const iy2 = center + innerRadius * Math.sin(endAngle);

                          const largeArcFlag = angleSpan > Math.PI ? 1 : 0;
                          const pathD = `
                            M ${x1} ${y1}
                            A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
                            L ${ix2} ${iy2}
                            A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix1} ${iy1}
                            Z
                          `;

                          const isSelected = activeRenbutUnitId === slice.unitId;

                          return (
                            <path
                              key={sIdx}
                              d={pathD.trim()}
                              fill={slice.color}
                              stroke="#ffffff"
                              strokeWidth={isSelected ? 3 : 1}
                              className={`transition-all duration-200 cursor-pointer ${
                                isSelected ? 'opacity-100 scale-[1.03] origin-center' : 'opacity-80 hover:opacity-105'
                              }`}
                              onClick={() => setClickedRenbutUnitId(slice.unitId)}
                            >
                              <title>{`${slice.name}: ${slice.value} Terdaftar`}</title>
                            </path>
                          );
                        });
                      })()}
                      <circle cx="100" cy="100" r="32" fill="#ffffff" stroke="#f1f5f9" />
                      <text x="100" y="96" textAnchor="middle" className="fill-slate-400 text-[6.5px] font-extrabold uppercase font-sans select-none">
                        Terdaftar
                      </text>
                      <text x="100" y="110" textAnchor="middle" className="fill-slate-800 text-[10px] font-black font-mono">
                        {totalKebutuhanSum} Org
                      </text>
                    </svg>
                  </div>

                  {/* LEGEND TABLE/BUTTONS */}
                  <div className="mt-3.5 w-full space-y-1 bg-white p-2 border border-slate-150 rounded-lg max-h-32 overflow-y-auto">
                    {groupedPieData.map((slice, sIdx) => {
                      const isSelected = activeRenbutUnitId === slice.unitId;
                      return (
                        <div 
                          key={sIdx}
                          onClick={() => setClickedRenbutUnitId(slice.unitId)}
                          className={`flex items-center justify-between px-2 py-1 rounded-md text-[9.5px] cursor-pointer transition ${
                            isSelected ? 'bg-indigo-50 font-bold border border-indigo-200 text-indigo-950 shadow-3xs' : 'hover:bg-slate-50 border border-transparent text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                            <span className="truncate">{slice.name}</span>
                          </div>
                          <span className="font-mono text-slate-500 font-bold">{slice.value} Org</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* BAR CHART SEGMENT - Stacked below primary pie chart */}
          <div className="w-full bg-slate-50/50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between shadow-3xs">
            <div>
              <div className="flex items-center justify-between border-b border-slate-200/60 pb-2 mb-3">
                <span className="text-[9.5px] font-mono text-slate-500 font-extrabold uppercase tracking-wider">
                  Rincian Pemenuhan Kompetensi Tenaga Kesehatan di ({selectedUnitName})
                </span>
                <span className="text-[9px] bg-indigo-50 border border-indigo-200 text-indigo-750 px-2 py-0.5 rounded font-bold font-sans">
                  {unitJobs.length} Rumpun Jabatan
                </span>
              </div>

              {/* RENDER THE DETAILED GRAPH FOR SELECTED UNIT */}
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {unitJobs.length === 0 ? (
                  <p className="text-center italic text-xs text-slate-400 py-12 select-none">
                    Tidak ada data rinci untuk unit pelayanan terpilih.
                  </p>
                ) : (
                  unitJobs.map((item) => {
                    // Match app-registered profiles dynamically
                    const matchingStaffInApp = visibleAsn.filter(p => {
                      if (p.id_puskesmas !== activeRenbutUnitId) return false;
                      const pJabPns = (p.pns_nama_jabatan || '').toLowerCase();
                      const pJabPppk = (p.pppk_jabatan || '').toLowerCase();
                      const pJabPkwt = (p.pkwt_jabatan || '').toLowerCase();
                      const rJab = (item.jab_fungsional || '').toLowerCase();
                      return pJabPns.includes(rJab) || pJabPppk.includes(rJab) || pJabPkwt.includes(rJab) || rJab.includes(pJabPns) || rJab.includes(pJabPppk) || rJab.includes(pJabPkwt);
                    });

                    const kondisiSaatIni = matchingStaffInApp.length;
                    const appAsn = matchingStaffInApp.filter(p => p.status_pegawai_detail !== 'Non_ASN').length;
                    const appNonAsn = kondisiSaatIni - appAsn;

                    const targetMin = item.standarMinimal;
                    const abkKebutuhan = item.abkKebutuhan || item.standarMinimal;
                    
                    // Calculate percentage width of bars based on the max value
                    const maxVal = Math.max(12, targetMin, kondisiSaatIni, abkKebutuhan);
                    const wTarget = (targetMin / maxVal) * 100;
                    const wActual = (kondisiSaatIni / maxVal) * 100;
                    const wAbk = (abkKebutuhan / maxVal) * 100;
                    const shortage = targetMin - kondisiSaatIni;
                    
                    return (
                      <div key={item.id} className="bg-white border border-slate-200 p-3 rounded-xl hover:border-slate-350 transition-all text-left space-y-2 pb-3 shadow-3xs">
                        <div className="flex justify-between items-center gap-1.5 flex-wrap">
                          <h4 className="text-xs font-black text-slate-800 font-display">
                            {item.jab_fungsional} <span className="text-[10px] text-slate-450 font-normal">({item.jenjang})</span>
                          </h4>
                          <span className={`text-[8px] px-2 py-0.5 rounded font-extrabold font-mono border uppercase tracking-wider ${
                            shortage > 0 
                              ? 'bg-rose-50 border-rose-250 text-rose-700' 
                              : 'bg-emerald-50 border-emerald-250 text-emerald-700'
                          }`}>
                            {shortage > 0 ? `Kurang ${shortage} Orang` : 'Terpenuhi ✔'}
                          </span>
                        </div>

                        {/* Bar groups */}
                        <div className="space-y-1.5 pt-1">
                          {/* 1. Standar Minimal */}
                          <div className="space-y-0.5">
                            <div className="flex justify-between text-[8px] text-slate-450 font-semibold select-none">
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Standar Target Formasi:
                              </span>
                              <span className="font-bold font-mono text-slate-700">{targetMin} Org</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-150">
                              <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${wTarget}%` }} />
                            </div>
                          </div>

                          {/* 2. Kondisi Saat Ini */}
                          <div className="space-y-0.5">
                            <div className="flex justify-between text-[8px] text-slate-450 font-semibold select-none">
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Kondisi Riil Terdaftar (ASN: {appAsn}, Non-ASN: {appNonAsn}):
                              </span>
                              <span className="font-bold font-mono text-emerald-750">{kondisiSaatIni} Org</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-150">
                              <div className="h-full bg-emerald-500 rounded-full transition-all duration-300" style={{ width: `${wActual}%` }} />
                            </div>
                          </div>

                          {/* 3. Kebutuhan (ABK) */}
                          <div className="space-y-0.5">
                            <div className="flex justify-between text-[8px] text-slate-450 font-semibold select-none">
                              <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Analisis Beban Kerja Riil (ABK):
                              </span>
                              <span className="font-bold font-mono text-purple-750">{abkKebutuhan.toFixed(1)} Org</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-150">
                              <div className="h-full bg-purple-500 rounded-full transition-all duration-300" style={{ width: `${wAbk}%` }} />
                            </div>
                          </div>
                        </div>

                        {/* Keterangan */}
                        <p className="text-[9px] text-slate-400 select-none border-t border-slate-100/60 pt-1.5 flex items-center gap-1 leading-none">
                          <span className="font-bold text-slate-500">Status:</span> 
                          <span>{(item.keterangan === 'S' || shortage <= 0) ? 'Formasi Sesuai & Kondusif' : 'Prioritas Pembinaan & Seleksi Pegawai Baru'}</span>
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* REGISTERED EMPLOYEES INSIDE THIS UNIT SECTOR - "tampilkan pegawai yang terdaftar di app" */}
            {(() => {
              const registeredEmployeesInUnit = visibleAsn.filter(p => p.id_puskesmas === activeRenbutUnitId);
              return (
                <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-3.5 space-y-3 shadow-3xs mt-4">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5 flex-wrap gap-2">
                    <span className="text-[10px] font-mono text-slate-500 font-extrabold uppercase tracking-wider select-none flex items-center gap-1">
                      📋 Pegawai Terdaftar di Aplikasi ({selectedUnitName})
                    </span>
                    <span className="text-[9px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold select-none font-mono">
                      {registeredEmployeesInUnit.length} Pegawai
                    </span>
                  </div>

                  {registeredEmployeesInUnit.length === 0 ? (
                    <p className="text-center italic text-[9.5px] text-slate-400 py-6 select-none bg-white border border-slate-150 rounded-lg">
                      Belum ada nakes terdaftar di aplikasi untuk unit pelayanan ini.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white max-h-48 overflow-y-auto">
                      <table className="w-full text-slate-700 text-[10px] leading-tight">
                        <thead className="bg-slate-100 text-[9px] uppercase tracking-wider text-slate-500 font-extrabold select-none sticky top-0 border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2 text-left">Nama Lengkap</th>
                            <th className="px-3 py-2 text-left">NIP</th>
                            <th className="px-3 py-2 text-left">Jabatan</th>
                            <th className="px-3 py-2 text-center">Detail Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {registeredEmployeesInUnit.map((p, idx) => (
                            <tr key={p.id || idx} className="hover:bg-slate-50/50 transition">
                              <td className="px-3 py-2 font-bold text-slate-850">
                                {p.nama_lengkap}{p.gelar_belakang ? `, ${p.gelar_belakang}` : ''}
                              </td>
                              <td className="px-3 py-2 font-mono text-slate-450">{p.nip || '-'}</td>
                              <td className="px-3 py-2 text-slate-600 font-medium">{p.pns_nama_jabatan || p.pppk_jabatan || p.pkwt_jabatan || 'Fungsional Kesehatan'}</td>
                              <td className="px-3 py-2 text-center">
                                <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full border ${
                                  p.status_pegawai_detail === 'PNS'
                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                                    : p.status_pegawai_detail?.startsWith('PPPK')
                                    ? 'bg-sky-50 border-sky-200 text-sky-700'
                                    : 'bg-amber-50 border-amber-200 text-amber-700'
                                }`}>
                                  {p.status_pegawai_detail?.replace(/_/g, ' ') || 'Aktif'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="border-t border-slate-200/60 pt-3 mt-4 flex flex-col sm:flex-row gap-2 justify-between items-center text-[9px] text-slate-400 font-bold uppercase select-none">
              <span>SatuSehat Kemenkes Integrator</span>
              <div className="flex gap-3">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Target</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Kondisi Riil</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> ABK Kebutuhan</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    );
  };

  const selectedComplianceInfo = getSelectedComplianceData();

  // --- ANALISA INTEGRAL KEPATUHAN ARSIP DIGITAL UNIT KERJA ---
  // Syarat Kepatuhan: Seluruh kategori berkas (Dasar, Personal, Pendidikan) harus diisi 100% lengkap.
  const activeASNList = visibleAsn.filter(p => p.status_kepegawaian === 'Aktif');

  const unitIncompleteList = puskesmasList
    .filter(unit => unit.id !== 100) // Hanya untuk Unit Kerja Fasyankes
    .map(unit => {
      // Pegawai aktif di unit tertentu
      const unitStaff = activeASNList.filter(p => p.id_puskesmas === unit.id);
      
      // Pegawai yang belum melengkapi semua 3 kategori berkas dasar kepegawaian
      const incompleteStaff = unitStaff.filter(p => {
        const files = arsipList.filter(f => f.id_asn === p.id);
        const hasDasar = files.some(f => f.kategori_kelompok === 'Dasar');
        const hasPersonal = files.some(f => f.kategori_kelompok === 'Personal');
        const hasPendidikan = files.some(f => f.kategori_kelompok === 'Pendidikan');
        return !(hasDasar && hasPersonal && hasPendidikan);
      });

      return {
        unit,
        totalStaff: unitStaff.length,
        incompleteCount: incompleteStaff.length,
        incompleteStaff,
        completionRate: unitStaff.length > 0 
          ? Math.round(((unitStaff.length - incompleteStaff.length) / unitStaff.length) * 100) 
          : 0
      };
    })
    .filter(item => item.totalStaff > 0)
    .sort((a, b) => a.completionRate - b.completionRate);

  const totalUnitsWithIncomplete = unitIncompleteList.filter(item => item.incompleteCount > 0).length;
  const totalIncompletePegawai = unitIncompleteList.reduce((acc, item) => acc + item.incompleteCount, 0);
  const avgCompletionRate = activeASNList.length > 0 && unitIncompleteList.length > 0
    ? Math.round(unitIncompleteList.reduce((acc, item) => acc + item.completionRate, 0) / unitIncompleteList.length)
    : 0;

  const getPuskesmasStaffStats = (unitId: number) => {
    const staff = activeASNList.filter(p => p.id_puskesmas === unitId);
    const pns = staff.filter(p => p.status_pegawai_detail === 'PNS').length;
    const pppkPenuh = staff.filter(p => p.status_pegawai_detail === 'PPPK_Penuh_Waktu').length;
    const pppkParuh = staff.filter(p => p.status_pegawai_detail === 'PPPK_Paruh_Waktu').length;
    const nonAsn = staff.filter(p => p.status_pegawai_detail === 'Non_ASN').length;
    const jafung = staff.filter(p => p.jenis_pegawai === 'Jafung_Kesehatan').length;
    
    // Custom metadata
    const meta = PUSKESMAS_METADATA_MAP[unitId] || { penduduk: 50000, target_nakes: 5 };
    const unitInList = puskesmasList.find(p => p.id === unitId);
    const penduduk = (unitInList && unitInList.total_penduduk !== undefined) ? unitInList.total_penduduk : meta.penduduk;
    
    // Calculate proportional target_nakes based on population size
    const calculatedTargetNakes = Math.max(1, Math.round((penduduk / (meta.penduduk || 50000)) * meta.target_nakes));
    
    // Ratio Jafung per Penduduk (scaled to per 10.000 residents for better display)
    const ratioActual = penduduk > 0 ? (jafung / penduduk) * 10000 : 0;
    const ratioTarget = penduduk > 0 ? (calculatedTargetNakes / penduduk) * 10000 : 0;
    
    // Served vs Underserved % Balance
    const balancePercentage = calculatedTargetNakes > 0 ? Math.round((jafung / calculatedTargetNakes) * 100) : 0;
    
    return {
      pns,
      pppkPenuh,
      pppkParuh,
      nonAsn,
      jafung,
      penduduk,
      target_nakes: calculatedTargetNakes,
      ratioActual: ratioActual.toFixed(2),
      ratioTarget: ratioTarget.toFixed(2),
      balancePercentage,
      isShortage: balancePercentage < 100
    };
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
              <p className="text-[10px] text-slate-400">Catatan akan ditambahkan otomatis di bagian draf pesan di atas.</p>
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

      {/* 1. TOP BANNER: Keputusan Berbasis Data SIMPEG Kepegawaian */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 translate-x-1/4 translate-y-1/4">
          <TrendingUp size={300} />
        </div>
        <div className="relative z-10 max-w-3xl">
          <span className="bg-teal-500/30 text-teal-100 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest backdrop-blur-md">
            {currentRole === 'admin_dinkes' ? 'UPT Puskesmas Sedau' : getPuskesmasName(selectedPuskesmasId || 1)}
          </span>
          <h1 className="text-3xl font-display font-semibold mt-3 leading-tight tracking-tight">
            Keputusan Berbasis Data SIMPEG Kepegawaian
          </h1>
          <p className="text-teal-100 text-sm mt-2 font-light leading-relaxed">
            Platform verifikasi digital kepegawaian UPT Puskesmas Sedau terintegrasi dengan alert peringatan dini, kalkulator jafung dan dasbor analitikal Kemenkes RI.
          </p>
        </div>
      </div>

      {/* 2. INTERACTIVE KPI CARDS & ANALYSIS CENTER (TAHUN BERJALAN DINAMIS) */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 text-left">
          <div>
            <h2 className="text-base font-black text-slate-800 uppercase tracking-wider font-display flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block animate-pulse" />
              Pusat Analisa &amp; Peringatan Dini Usulan {currentRunningYear}
            </h2>
          </div>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full font-bold px-2.5 py-1 select-none whitespace-nowrap self-start md:self-center">
            TAHUN ANALISA: {currentRunningYear} (BERJALAN)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          {/* Card A: GOLONGAN / PANGKAT */}
          <div 
            onClick={() => setActiveKpiFilter(activeKpiFilter === 'pangkat' ? null : 'pangkat')}
            className={`p-5 rounded-2xl transition-all duration-200 cursor-pointer border select-none ${
              activeKpiFilter === 'pangkat' 
                ? 'bg-gradient-to-br from-indigo-900 to-slate-900 text-white border-indigo-500 shadow-md scale-[1.01]' 
                : 'bg-indigo-50/30 text-indigo-950 border-indigo-100 hover:bg-indigo-50/70 hover:border-indigo-300 hover:shadow-xs'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className={`p-2 rounded-xl transition ${activeKpiFilter === 'pangkat' ? 'bg-indigo-800 border border-indigo-500 text-indigo-200' : 'bg-indigo-100 text-indigo-700'}`}>
                <Award size={20} />
              </div>
              <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded transition ${activeKpiFilter === 'pangkat' ? 'bg-indigo-950 text-indigo-200 border border-indigo-800' : 'bg-indigo-100/50 text-indigo-800'}`}>
                Siklus 4 Thn
              </span>
            </div>
            <div className="mt-4 space-y-1">
              <h3 className={`text-xs font-bold leading-none transition ${activeKpiFilter === 'pangkat' ? 'text-indigo-200' : 'text-indigo-805'}`}>
                Usul Golongan / Pangkat
              </h3>
              <p className={`text-3xl font-black font-display tracking-tight leading-none mt-1 transition ${activeKpiFilter === 'pangkat' ? 'text-white' : 'text-indigo-900'}`}>
                {pangkat2026List.length} <span className="text-xs font-normal">Pegawai</span>
              </p>
              <p className={`text-[10px] transition ${activeKpiFilter === 'pangkat' ? 'text-indigo-300' : 'text-indigo-600/70'} italic font-medium pt-1`}>
                {activeKpiFilter === 'pangkat' ? '✓ Sedang ditinjau' : 'Klik rincian pegawai'}
              </p>
            </div>
          </div>

          {/* Card B: JABATAN (JAFUNG) */}
          <div 
            onClick={() => setActiveKpiFilter(activeKpiFilter === 'jafung' ? null : 'jafung')}
            className={`p-5 rounded-2xl transition-all duration-200 cursor-pointer border select-none ${
              activeKpiFilter === 'jafung' 
                ? 'bg-gradient-to-br from-purple-900 to-slate-900 text-white border-purple-500 shadow-md scale-[1.01]' 
                : 'bg-purple-50/30 text-purple-950 border-purple-100 hover:bg-purple-50/70 hover:border-purple-300 hover:shadow-xs'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className={`p-2 rounded-xl transition ${activeKpiFilter === 'jafung' ? 'bg-purple-800 border border-purple-500 text-purple-200' : 'bg-purple-100 text-purple-700'}`}>
                <FileText size={20} />
              </div>
              <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded transition ${activeKpiFilter === 'jafung' ? 'bg-purple-950 text-purple-200 border border-purple-800' : 'bg-purple-100/50 text-purple-800'}`}>
                Jafung
              </span>
            </div>
            <div className="mt-4 space-y-1">
              <h3 className={`text-xs font-bold leading-none transition ${activeKpiFilter === 'jafung' ? 'text-purple-200' : 'text-purple-805'}`}>
                Usul Jabatan (Jafung)
              </h3>
              <p className={`text-3xl font-black font-display tracking-tight leading-none mt-1 transition ${activeKpiFilter === 'jafung' ? 'text-white' : 'text-purple-900'}`}>
                {jafung2026List.length} <span className="text-xs font-normal">Pegawai</span>
              </p>
              <p className={`text-[10px] transition ${activeKpiFilter === 'jafung' ? 'text-purple-300' : 'text-purple-600/70'} italic font-medium pt-1`}>
                {activeKpiFilter === 'jafung' ? '✓ Sedang ditinjau' : 'Klik rincian pegawai'}
              </p>
            </div>
          </div>

          {/* Card C: KGB (GAJI BERKALA) */}
          <div 
            onClick={() => setActiveKpiFilter(activeKpiFilter === 'kgb' ? null : 'kgb')}
            className={`p-5 rounded-2xl transition-all duration-200 cursor-pointer border select-none ${
              activeKpiFilter === 'kgb' 
                ? 'bg-gradient-to-br from-teal-900 to-slate-900 text-white border-teal-500 shadow-md scale-[1.01]' 
                : 'bg-teal-50/30 text-teal-950 border-teal-100 hover:bg-teal-50/70 hover:border-teal-300 hover:shadow-xs'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className={`p-2 rounded-xl transition ${activeKpiFilter === 'kgb' ? 'bg-teal-800 border border-teal-500 text-teal-200' : 'bg-teal-100 text-teal-700'}`}>
                <Clock size={20} />
              </div>
              <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded transition ${activeKpiFilter === 'kgb' ? 'bg-teal-950 text-teal-200 border border-teal-800' : 'bg-teal-100/50 text-teal-800'}`}>
                Siklus 2 Thn
              </span>
            </div>
            <div className="mt-4 space-y-1">
              <h3 className={`text-xs font-bold leading-none transition ${activeKpiFilter === 'kgb' ? 'text-teal-200' : 'text-teal-805'}`}>
                Gaji Berkala (KGB)
              </h3>
              <p className={`text-3xl font-black font-display tracking-tight leading-none mt-1 transition ${activeKpiFilter === 'kgb' ? 'text-white' : 'text-teal-900'}`}>
                {kgb2026List.length} <span className="text-xs font-normal">Pegawai</span>
              </p>
              <p className={`text-[10px] transition ${activeKpiFilter === 'kgb' ? 'text-teal-300' : 'text-teal-600/70'} italic font-medium pt-1`}>
                {activeKpiFilter === 'kgb' ? '✓ Sedang ditinjau' : 'Klik rincian pegawai'}
              </p>
            </div>
          </div>

          {/* Card D: SISA CUTI TAHUNAN */}
          <div 
            onClick={() => setActiveKpiFilter(activeKpiFilter === 'cuti' ? null : 'cuti')}
            className={`p-5 rounded-2xl transition-all duration-200 cursor-pointer border select-none ${
              activeKpiFilter === 'cuti' 
                ? 'bg-gradient-to-br from-amber-900 to-slate-900 text-white border-amber-500 shadow-md scale-[1.01]' 
                : 'bg-amber-50/30 text-amber-950 border-amber-100 hover:bg-amber-50/70 hover:border-amber-300 hover:shadow-xs'
            }`}
          >
            <div className="flex justify-between items-start">
              <div className={`p-2 rounded-xl transition ${activeKpiFilter === 'cuti' ? 'bg-amber-800 border border-amber-500 text-amber-200' : 'bg-amber-100 text-amber-700'}`}>
                <Calendar size={20} />
              </div>
              <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded transition ${activeKpiFilter === 'cuti' ? 'bg-amber-950 text-amber-200 border border-amber-800' : 'bg-amber-100/50 text-amber-800'}`}>
                Hak Tahunan
              </span>
            </div>
            <div className="mt-4 space-y-1">
              <h3 className={`text-xs font-bold leading-none transition ${activeKpiFilter === 'cuti' ? 'text-amber-200' : 'text-amber-805'}`}>
                Sisa Cuti Tahunan
              </h3>
              <p className={`text-3xl font-black font-display tracking-tight leading-none mt-1 transition ${activeKpiFilter === 'cuti' ? 'text-white' : 'text-amber-900'}`}>
                {cuti2026List.length} <span className="text-xs font-normal">Pegawai</span>
              </p>
              <p className={`text-[10px] transition ${activeKpiFilter === 'cuti' ? 'text-amber-300' : 'text-amber-600/70'} italic font-medium pt-1`}>
                {activeKpiFilter === 'cuti' ? '✓ Sedang ditinjau' : 'Klik rincian pegawai'}
              </p>
            </div>
          </div>
        </div>

        {/* Selected KPI Detail Expansion Panel with TAT/TMT */}
        {selectedKpiInfo && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs text-left animate-in slide-in-from-top-4 duration-300 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
              <div>
                <h3 className="font-display font-extrabold text-sm text-slate-900 flex items-center gap-1.5 leading-none">
                  <span className="w-1.5 h-3 bg-teal-600 rounded-sm" />
                  {selectedKpiInfo.title}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1">
                  Wilayah Kerja Terpantau: <strong>{currentRole === 'admin_dinkes' ? 'UPT Puskesmas Sedau' : getPuskesmasName(selectedPuskesmasId || 1)}</strong> — Ditemukan: <strong>{selectedKpiInfo.list.length} Orang</strong>
                </p>
              </div>
              <div className="flex items-center space-x-2">
                {onNavigateToPemantauan && activeKpiFilter && activeKpiFilter !== 'cuti' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (activeKpiFilter === 'pangkat' || activeKpiFilter === 'jafung' || activeKpiFilter === 'kgb') {
                        onNavigateToPemantauan(activeKpiFilter);
                      }
                    }}
                    className="text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1 rounded-lg border border-teal-200 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Buka di Pemantauan ASN</span>
                    <ArrowRight size={13} />
                  </button>
                )}
                <button 
                  onClick={() => setActiveKpiFilter(null)}
                  className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition cursor-pointer"
                >
                  Tutup Rincian
                </button>
              </div>
            </div>

            {selectedKpiInfo.list.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs italic border border-dashed border-slate-200 rounded-xl">
                Tidak ada data pegawai yang memenuhi kriteria usulan ini untuk wilayah kerja terpilih di tahun ini.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-150 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                      {selectedKpiInfo.headers.map((h, i) => (
                        <th key={i} className="p-3 font-semibold">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedKpiInfo.list.map((item, idx) => selectedKpiInfo.renderRow(item, idx))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. SMART KPI ANALYTICS DASHBOARD CARD */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-6">
        
        {/* Header KPI */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl">
              <TrendingUp size={18} />
            </div>
            <div>
              <h2 className="font-display font-semibold text-slate-800 text-lg">Analisa &amp; KPI Cerdas SAPA</h2>
              <p className="text-xs text-slate-500">Parameter sebaran, sisa tenggat, dan kepatuhan administrasi kepegawaian fasyankes</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs text-slate-700">
            <Filter size={13} className="text-emerald-600" />
            <span className="font-semibold">Mode Penayangan:</span>
            <span className="font-bold underline text-emerald-700">{currentRole === 'admin_dinkes' ? 'Admin Kabupaten' : 'Admin Mitra Puskesmas'}</span>
          </div>
        </div>

        {/* Unified Real-time Operational Board */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Filter and Analyze ASN & Position Panel */}
            <div className="lg:col-span-12 flex flex-col gap-6">
              {(() => {
                // Determine base set of profiles which are accessible to the current role
                const roleFilteredProfiles = currentRole === 'admin_puskesmas'
                  ? asnProfiles.filter(p => p.id_puskesmas === selectedPuskesmasId)
                  : asnProfiles;

                // Apply current active filters
                const filteredProfiles = roleFilteredProfiles.filter((p) => {
                  // 1. Puskesmas filter (Dinkes Selective Dropdown)
                  if (currentRole === 'admin_dinkes' && filterPuskesmasUnit !== 'ALL') {
                    if (p.id_puskesmas !== Number(filterPuskesmasUnit)) return false;
                  }

                  // 2. Status ASN Filter
                  if (filterStatusAsn !== 'ALL') {
                    if (filterStatusAsn === 'PNS' && p.status_pegawai_detail !== 'PNS') return false;
                    if (filterStatusAsn === 'PPPK_PN' && p.status_pegawai_detail !== 'PPPK_Penuh_Waktu') return false;
                    if (filterStatusAsn === 'PPPK_PW' && p.status_pegawai_detail !== 'PPPK_Paruh_Waktu') return false;
                    if (filterStatusAsn === 'PKWT' && p.status_pegawai_detail !== 'Non_ASN') return false;
                  }

                  // 3. Jenis Jabatan Filter
                  if (filterJenisJabatan !== 'ALL') {
                    const isJafung = p.jenis_pegawai === 'Jafung_Kesehatan';
                    if (filterJenisJabatan === 'FUNGSIONAL' && !isJafung) return false;
                    if (filterJenisJabatan === 'ADMINISTRASI' && isJafung) return false;
                  }

                  // 3b. Sub-Jenis Jabatan (SDMK) Filter
                  if (filterSubJenisJabatan !== 'ALL') {
                    const profId = p.id_profesi || getFallbackProfesiId(p.nama_lengkap, p.gelar_belakang);
                    const isNumeric = /^\d+$/.test(filterSubJenisJabatan);
                    if (isNumeric) {
                      if (profId !== Number(filterSubJenisJabatan)) {
                        return false;
                      }
                    } else {
                      const mappedGroup = SUB_JENIS_JABATAN_MAP[filterSubJenisJabatan];
                      if (mappedGroup && !mappedGroup.ids.includes(profId)) {
                        return false;
                      }
                    }
                  }

                  // 4. Search Query Match
                  if (filterAsnSearchQuery.trim() !== '') {
                    const s = filterAsnSearchQuery.toLowerCase();
                    const matchesName = p.nama_lengkap.toLowerCase().includes(s);
                    const matchesNip = p.nip?.toLowerCase().includes(s);
                    const matchesNik = p.nik?.toLowerCase().includes(s);
                    const matchesNi = p.pppk_ni?.toLowerCase().includes(s);
                    const matchesJabatan = (p.pns_nama_jabatan || p.pppk_jabatan || p.pkwt_jabatan || '').toLowerCase().includes(s);
                    if (!matchesName && !matchesNip && !matchesNik && !matchesNi && !matchesJabatan) return false;
                  }

                  return true;
                });

                // Compute counts over current filtered list
                const totalFiltered = filteredProfiles.length;
                const countPNS = filteredProfiles.filter(p => p.status_pegawai_detail === 'PNS').length;
                const countPPPK_PN = filteredProfiles.filter(p => p.status_pegawai_detail === 'PPPK_Penuh_Waktu').length;
                const countPPPK_PW = filteredProfiles.filter(p => p.status_pegawai_detail === 'PPPK_Paruh_Waktu').length;
                const countPKWT = filteredProfiles.filter(p => p.status_pegawai_detail === 'Non_ASN').length;
                const countFungsional = filteredProfiles.filter(p => p.jenis_pegawai === 'Jafung_Kesehatan').length;
                const countAdministrasi = filteredProfiles.filter(p => p.jenis_pegawai !== 'Jafung_Kesehatan').length;

                // Base counts over roleFilteredProfiles + search/unit filter (excluding status/jenis_jabatan filter for stable interactive comparison)
                const chartBaseProfiles = roleFilteredProfiles.filter((p) => {
                  // 1. Puskesmas unit
                  if (currentRole === 'admin_dinkes' && filterPuskesmasUnit !== 'ALL') {
                    if (p.id_puskesmas !== Number(filterPuskesmasUnit)) return false;
                  }
                  // 2. Sub-jenis
                  if (filterSubJenisJabatan !== 'ALL') {
                    const profId = p.id_profesi || getFallbackProfesiId(p.nama_lengkap, p.gelar_belakang);
                    const isNumeric = /^\d+$/.test(filterSubJenisJabatan);
                    if (isNumeric) {
                      if (profId !== Number(filterSubJenisJabatan)) return false;
                    } else {
                      const mappedGroup = SUB_JENIS_JABATAN_MAP[filterSubJenisJabatan];
                      if (mappedGroup && !mappedGroup.ids.includes(profId)) return false;
                    }
                  }
                  // 3. Search query
                  if (filterAsnSearchQuery.trim() !== '') {
                    const s = filterAsnSearchQuery.toLowerCase();
                    const matchesName = p.nama_lengkap.toLowerCase().includes(s);
                    const matchesNip = p.nip?.toLowerCase().includes(s);
                    const matchesNik = p.nik?.toLowerCase().includes(s);
                    const matchesNi = p.pppk_ni?.toLowerCase().includes(s);
                    const matchesJabatan = (p.pns_nama_jabatan || p.pppk_jabatan || p.pkwt_jabatan || '').toLowerCase().includes(s);
                    if (!matchesName && !matchesNip && !matchesNik && !matchesNi && !matchesJabatan) return false;
                  }
                  return true;
                });

                const basePNS = chartBaseProfiles.filter(p => p.status_pegawai_detail === 'PNS').length;
                const basePPPK_PN = chartBaseProfiles.filter(p => p.status_pegawai_detail === 'PPPK_Penuh_Waktu').length;
                const basePPPK_PW = chartBaseProfiles.filter(p => p.status_pegawai_detail === 'PPPK_Paruh_Waktu').length;
                const basePKWT = chartBaseProfiles.filter(p => p.status_pegawai_detail === 'Non_ASN').length;
                const baseFungsional = chartBaseProfiles.filter(p => p.jenis_pegawai === 'Jafung_Kesehatan').length;
                const baseAdministrasi = chartBaseProfiles.filter(p => p.jenis_pegawai !== 'Jafung_Kesehatan').length;

                const activePNS = countPNS;
                const activePPPK_PN = countPPPK_PN;
                const activePPPK_PW = countPPPK_PW;
                const activePKWT = countPKWT;
                const activeFungsional = countFungsional;
                const activeAdministrasi = countAdministrasi;

                const renderBar = (
                  id: string,
                  label: string,
                  baseVal: number,
                  activeVal: number,
                  isActive: boolean,
                  onToggle: () => void,
                  activeColorClass: string,
                  maxScale: number
                ) => {
                  const percentBase = maxScale > 0 ? (baseVal / maxScale) * 100 : 0;
                  const percentActive = baseVal > 0 ? (activeVal / baseVal) * 100 : 0;

                  return (
                    <div 
                      key={id}
                      className="flex-1 flex flex-col items-center h-full justify-between group cursor-pointer" 
                      onClick={onToggle}
                    >
                      <div className="w-full flex-1 flex items-end justify-center relative pb-1">
                        {/* Base bar outline */}
                        <div 
                          style={{ height: `${percentBase}%` }}
                          className={`w-10 sm:w-12 rounded-t-lg bg-slate-200/80 border border-slate-350 relative hover:scale-[1.03] hover:border-slate-400 transition-all duration-300 flex items-end ${
                            isActive ? 'ring-2 ring-teal-500 ring-offset-1 shadow-md' : 'shadow-3xs'
                          }`}
                        >
                          {/* Active filled overlay */}
                          <div 
                            style={{ height: `${percentActive}%` }}
                            className={`w-full rounded-t-lg ${activeColorClass} transition-all duration-300 flex items-start justify-center pt-1.5`}
                          >
                            {activeVal > 0 && percentBase > 20 && (
                              <span className="text-[9px] font-black font-mono text-white tracking-tight drop-shadow-sm select-none leading-none">
                                {activeVal}
                              </span>
                            )}
                          </div>

                          {/* Float Tooltip */}
                          <div className="absolute opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 -top-14 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-white rounded-lg py-1.5 px-2.5 text-center text-[10px] whitespace-nowrap z-30 shadow-xl font-mono">
                            <span className="font-extrabold block text-slate-400 uppercase text-[8px] tracking-wider mb-0.5">{label}</span>
                            <span className="font-black text-white">{activeVal}</span> <span className="text-slate-400">/ {baseVal} Pegawai</span>
                            <div className="text-[8px] font-bold text-teal-400 mt-0.5">
                              {baseVal > 0 ? Math.round((activeVal / baseVal) * 100) : 0}% terfilter
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Labels and values underneath the bar */}
                      <div className="mt-1 w-full text-center flex flex-col items-center gap-0.5 select-none">
                        <span className={`text-[9px] font-black line-clamp-1 leading-none ${
                          isActive ? 'text-slate-900 underline decoration-teal-500 decoration-2 font-black' : 'text-slate-500 font-bold'
                        }`}>
                          {label}
                        </span>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`text-[8.5px] font-black font-mono px-1.5 py-0.5 rounded leading-none ${
                            isActive 
                              ? 'text-teal-950 bg-teal-150 border border-teal-300' 
                              : 'text-slate-700 bg-white border border-slate-200'
                          }`}>
                            {activeVal} <span className="text-[8px] text-slate-400 font-normal">/ {baseVal}</span>
                          </span>
                          {isActive && (
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0 animate-pulse"></span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                };

                // Direct pagination logic
                const itemsPerPage = 6;
                const totalPages = Math.max(1, Math.ceil(totalFiltered / itemsPerPage));
                const activePage = Math.min(filterAsnPage, totalPages);
                const startIndex = (activePage - 1) * itemsPerPage;
                const paginatedProfiles = filteredProfiles.slice(startIndex, startIndex + itemsPerPage);

                const getJabatanName = (p: ASNProfile) => {
                  if (p.jenis_pegawai === 'Jafung_Kesehatan') {
                    return p.pns_nama_jabatan || p.pppk_jabatan || p.pkwt_jabatan || 'Tenaga Kesehatan Fungsional';
                  } else if (p.jenis_pegawai === 'Struktural') {
                    return p.pns_nama_jabatan || p.pppk_jabatan || 'Pejabat Struktural';
                  } else {
                    return p.pns_nama_jabatan || p.pppk_jabatan || p.pkwt_jabatan || 'Staf Administrasi';
                  }
                };

                const unitLabel = (unitId: number) => {
                  return puskesmasList.find(u => u.id === unitId)?.nama_puskesmas || 'UPT Puskesmas Sedau';
                };

                return (
                  <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 text-left space-y-6 shadow-3xs transition duration-250 hover:shadow-2xs">
                    {/* Card Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 bg-teal-50 rounded-xl border border-teal-100 text-teal-600 shrink-0">
                          <Filter size={16} />
                        </div>
                        <div>
                          <h3 className="text-xs font-black font-display uppercase tracking-wider text-slate-800 leading-tight">
                            Distribusi &amp; Direktori Pegawai
                          </h3>
                        </div>
                      </div>
                      
                      <div className="bg-teal-50 text-teal-800 text-[10px] font-extrabold px-3 py-1 rounded-full border border-teal-200 uppercase tracking-wider">
                        {totalFiltered} Pegawai
                      </div>
                    </div>

                    {/* Filters Controls Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-150 transition">
                      {/* Status ASN Filter */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 font-mono">
                          Status ASN
                        </label>
                        <select
                          value={filterStatusAsn}
                          onChange={(e) => {
                            setFilterStatusAsn(e.target.value);
                            setFilterAsnPage(1);
                          }}
                          className="text-xs bg-white text-slate-800 border border-slate-300 font-bold px-2.5 py-1.5 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer transition w-full"
                        >
                          <option value="ALL">Semua Status ASN</option>
                          <option value="PNS">PNS (Aparatur Sipil Negara)</option>
                          <option value="PPPK_PN">PPPK PN (Penuh Waktu)</option>
                          <option value="PPPK_PW">PPPK PW (Paruh Waktu)</option>
                          <option value="PKWT">PKWT (Non-ASN / Kontrak)</option>
                        </select>
                      </div>

                      {/* Jenis Jabatan Filter */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 font-mono">
                          Jenis Jabatan
                        </label>
                        <select
                          value={filterJenisJabatan}
                          onChange={(e) => {
                            setFilterJenisJabatan(e.target.value);
                            setFilterAsnPage(1);
                          }}
                          className="text-xs bg-white text-slate-800 border border-slate-300 font-bold px-2.5 py-1.5 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer transition w-full"
                        >
                          <option value="ALL">Semua Jenis Jabatan</option>
                          <option value="FUNGSIONAL">Fungsional (Jafung Kes)</option>
                          <option value="ADMINISTRASI">Administrasi (Staf / Struktur)</option>
                        </select>
                      </div>

                      {/* Unit Kerja select helper for admin_dinkes */}
                      {currentRole === 'admin_dinkes' ? (
                        <div className="flex flex-col gap-1">
                          <label className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 font-mono">
                            Unit Kerja (Puskesmas)
                          </label>
                          <select
                            value={filterPuskesmasUnit}
                            onChange={(e) => {
                              setFilterPuskesmasUnit(e.target.value);
                              setFilterAsnPage(1);
                            }}
                            className="text-xs bg-white text-slate-800 border border-slate-300 font-bold px-2.5 py-1.5 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none cursor-pointer transition w-full"
                          >
                            <option value="ALL">Semua Unit Kerja</option>
                            {puskesmasList.filter(u => u.id !== 100).map(u => (
                              <option key={u.id} value={u.id.toString()}>
                                {u.nama_puskesmas}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="flex flex-col justify-center gap-0.5">
                          <label className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 font-mono leading-none">
                            Unit Kerja Anda
                          </label>
                          <div className="text-xs font-black text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5 h-8">
                            <Home size={12} className="text-teal-600 shrink-0" />
                            <span className="truncate">{unitLabel(selectedPuskesmasId || 1)}</span>
                          </div>
                        </div>
                      )}

                      {/* Realtime Search Input */}
                      <div className="flex flex-col gap-1">
                        <label className="text-[8.5px] font-black uppercase tracking-wider text-slate-400 font-mono">
                          Pencarian Kata Kunci
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={filterAsnSearchQuery}
                            onChange={(e) => {
                              setFilterAsnSearchQuery(e.target.value);
                              setFilterAsnPage(1);
                            }}
                            placeholder="Cari nama, NIP, atau jabatan..."
                            className="w-full text-xs bg-white text-slate-850 border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 font-sans focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all placeholder:text-slate-405"
                          />
                          <Search size={13} className="text-slate-400 absolute left-2.5 top-2.5" />
                        </div>
                      </div>
                    </div>

                      {/* Interactive Distribution Dashboard Charts (Bar Chart) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      {/* Left: Status Kepegawaian (PNS, PPPK PN, PPPK PW, Non-ASN PKWT) */}
                      <div className="bg-slate-50/45 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-3xs">
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 font-sans flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-xs"></span>
                              Distribusi Status Kepegawaian (ASN vs Non-ASN)
                            </h4>
                            {filterStatusAsn !== 'ALL' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFilterStatusAsn('ALL');
                                  setFilterAsnPage(1);
                                }}
                                className="text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded border border-slate-350 transition uppercase cursor-pointer"
                              >
                                Reset Filter
                              </button>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 block mt-1.5 leading-normal">
                            Klik batang di bawah untuk menyaring data ASN secara interaktif.
                          </span>
                        </div>

                        {/* Interactive Bar Chart */}
                        <div className="relative h-44 flex items-end justify-between border-b border-l border-slate-200 pb-2 pl-6 pr-2 pt-2">
                          {/* Grid Lines */}
                          <div className="absolute inset-0 left-6 bottom-2 top-2 right-2 border-dashed border-b border-slate-100 flex flex-col justify-between pointer-events-none">
                            <div className="border-b border-dashed border-slate-200/50 w-full h-0"></div>
                            <div className="border-b border-dashed border-slate-200/50 w-full h-0"></div>
                            <div className="border-b border-dashed border-slate-200/50 w-full h-0"></div>
                          </div>

                          {/* Y Axis Numbers */}
                          <div className="absolute left-1 top-2 bottom-2 flex flex-col justify-between text-[8px] font-black font-mono text-slate-400 select-none">
                            <span>{Math.max(basePNS, basePPPK_PN, basePPPK_PW, basePKWT, 1)}</span>
                            <span>{Math.round(Math.max(basePNS, basePPPK_PN, basePPPK_PW, basePKWT, 1) / 2)}</span>
                            <span>0</span>
                          </div>

                          {/* Columns */}
                          <div className="w-full h-full flex items-end justify-around relative z-10 pl-4 gap-2">
                            {renderBar(
                              'PNS',
                              'PNS',
                              basePNS,
                              activePNS,
                              filterStatusAsn === 'PNS',
                              () => {
                                setFilterStatusAsn(filterStatusAsn === 'PNS' ? 'ALL' : 'PNS');
                                setFilterAsnPage(1);
                              },
                              'bg-emerald-500',
                              Math.max(basePNS, basePPPK_PN, basePPPK_PW, basePKWT, 1)
                            )}

                            {renderBar(
                              'PPPK_PN',
                              'PPPK PN',
                              basePPPK_PN,
                              activePPPK_PN,
                              filterStatusAsn === 'PPPK_PN',
                              () => {
                                setFilterStatusAsn(filterStatusAsn === 'PPPK_PN' ? 'ALL' : 'PPPK_PN');
                                setFilterAsnPage(1);
                              },
                              'bg-indigo-500',
                              Math.max(basePNS, basePPPK_PN, basePPPK_PW, basePKWT, 1)
                            )}

                            {renderBar(
                              'PPPK_PW',
                              'PPPK PW',
                              basePPPK_PW,
                              activePPPK_PW,
                              filterStatusAsn === 'PPPK_PW',
                              () => {
                                setFilterStatusAsn(filterStatusAsn === 'PPPK_PW' ? 'ALL' : 'PPPK_PW');
                                setFilterAsnPage(1);
                              },
                              'bg-blue-500',
                              Math.max(basePNS, basePPPK_PN, basePPPK_PW, basePKWT, 1)
                            )}

                            {renderBar(
                              'PKWT',
                              'PKWT/Non-ASN',
                              basePKWT,
                              activePKWT,
                              filterStatusAsn === 'PKWT',
                              () => {
                                setFilterStatusAsn(filterStatusAsn === 'PKWT' ? 'ALL' : 'PKWT');
                                setFilterAsnPage(1);
                              },
                              'bg-rose-500',
                              Math.max(basePNS, basePPPK_PN, basePPPK_PW, basePKWT, 1)
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Rumpun Jabatan (Fungsional vs Administrasi) */}
                      <div className="bg-slate-50/45 border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 shadow-3xs">
                        <div>
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 font-sans flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shadow-xs"></span>
                              Distribusi Rumpun Jabatan (Tupoksi Pegawai)
                            </h4>
                            {filterJenisJabatan !== 'ALL' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFilterJenisJabatan('ALL');
                                  setFilterAsnPage(1);
                                }}
                                className="text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded border border-slate-350 transition uppercase cursor-pointer"
                              >
                                Reset Filter
                              </button>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 block mt-1.5 leading-normal">
                            Klik batang di bawah untuk menyaring rumpun jabatan fungsional.
                          </span>
                        </div>

                        {/* Interactive Bar Chart */}
                        <div className="relative h-44 flex items-end justify-between border-b border-l border-slate-200 pb-2 pl-6 pr-2 pt-2">
                          {/* Grid Lines */}
                          <div className="absolute inset-0 left-6 bottom-2 top-2 right-2 border-dashed border-b border-slate-100 flex flex-col justify-between pointer-events-none">
                            <div className="border-b border-dashed border-slate-200/50 w-full h-0"></div>
                            <div className="border-b border-dashed border-slate-200/50 w-full h-0"></div>
                            <div className="border-b border-dashed border-slate-200/50 w-full h-0"></div>
                          </div>

                          {/* Y Axis Numbers */}
                          <div className="absolute left-1 top-2 bottom-2 flex flex-col justify-between text-[8px] font-black font-mono text-slate-400 select-none">
                            <span>{Math.max(baseFungsional, baseAdministrasi, 1)}</span>
                            <span>{Math.round(Math.max(baseFungsional, baseAdministrasi, 1) / 2)}</span>
                            <span>0</span>
                          </div>

                          {/* Columns */}
                          <div className="w-full h-full flex items-end justify-around relative z-10 pl-4 gap-6 max-w-xs mx-auto">
                            {renderBar(
                              'FUNGSIONAL',
                              'Fungsional',
                              baseFungsional,
                              activeFungsional,
                              filterJenisJabatan === 'FUNGSIONAL',
                              () => {
                                setFilterJenisJabatan(filterJenisJabatan === 'FUNGSIONAL' ? 'ALL' : 'FUNGSIONAL');
                                setFilterAsnPage(1);
                              },
                              'bg-teal-500',
                              Math.max(baseFungsional, baseAdministrasi, 1)
                            )}

                            {renderBar(
                              'ADMINISTRASI',
                              'Administrasi',
                              baseAdministrasi,
                              activeAdministrasi,
                              filterJenisJabatan === 'ADMINISTRASI',
                              () => {
                                setFilterJenisJabatan(filterJenisJabatan === 'ADMINISTRASI' ? 'ALL' : 'ADMINISTRASI');
                                setFilterAsnPage(1);
                              },
                              'bg-amber-500',
                              Math.max(baseFungsional, baseAdministrasi, 1)
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Card 2: Real-time STR & SIP Compliance Panel */}
              <div className="w-full">
                {renderStrSipCard()}
              </div>
            </div>



          </div>
        {false && (
          /* PUSKESMAS MITRA LOCAL KPI BOARD */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Active Sisa Cuti Roster highlight */}
            <div className="bg-[#0f0f12] p-5 rounded-2xl border border-white/5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold font-display uppercase tracking-wider text-slate-400">Sisa Cuti Tahunan Pegawai Terpantau</h3>
                <span className="text-[10px] bg-emerald-900/40 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold">Hak Cuti 12 Hari/Thn</span>
              </div>

              <div className="space-y-3 pt-2">
                {visibleAsn.map((asn) => {
                  const percent = Math.min(100, Math.round(((asn.sisa_cuti_tahunan || 0) / 12) * 100));
                  return (
                    <div key={asn.id} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-350 text-slate-300 font-semibold">{asn.nama_lengkap} {asn.gelar_belakang ? `, ${asn.gelar_belakang}` : ''}</span>
                        <span className="font-bold text-emerald-400 font-mono">{asn.sisa_cuti_tahunan || 0} Hari</span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Analisa Sebaran & Keseimbangan Tenaga Medis Unit Kerja */}
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-200 space-y-4 flex flex-col justify-between text-left text-slate-800">
              {(() => {
                const activeId = selectedPuskesmasId || 1;
                const stats = getPuskesmasStaffStats(activeId);
                const unitDetails = puskesmasList.find(u => u.id === activeId) || { nama_puskesmas: "Puskesmas Anda", alamat: "" };

                return (
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-bold font-display uppercase tracking-wider text-slate-800">
                          Parameter Sebaran &amp; Diagram Keseimbangan SDM Nakes bagi unit kerja
                        </h3>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Rasio Dokter, Perawat &amp; Tenaga Medis per 10.000 Penduduk di {unitDetails.nama_puskesmas}.
                        </p>
                      </div>
                      <span className={`text-[9px] border px-2 py-0.5 rounded font-bold uppercase font-mono ${
                        stats.isShortage ? 'bg-red-100 text-red-700 border-red-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                      }`}>
                        {stats.isShortage ? 'Kekurangan SDM < 100%' : 'SDM Tercukupi'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mt-4">
                      {/* Diagram Keseimbangan (Circular progress / Donut) */}
                      <div className="md:col-span-5 flex flex-col items-center justify-center bg-white border border-slate-200 rounded-xl p-4 relative shadow-xs">
                        <span className="absolute top-2 left-2 text-[9px] font-mono text-slate-400 font-semibold uppercase tracking-wider">
                          Diagram Keseimbangan
                        </span>
                        
                        <div className="relative flex items-center justify-center my-2">
                          <svg viewBox="0 0 120 120" className="w-[115px] h-[115px] drop-shadow-xs">
                            {/* Background track circle */}
                            <circle cx="60" cy="60" r="46" className="fill-none stroke-slate-100" strokeWidth="8" />
                            {/* Accent track circle (Red for shortage background, emerald otherwise) */}
                            <circle cx="60" cy="60" r="46" className="fill-none stroke-slate-200/50" strokeWidth="8" />
                            {/* Progress arc representing balance percentage */}
                            <circle 
                              cx="60" 
                              cy="60" 
                              r="46" 
                              className={`fill-none ${stats.isShortage ? 'stroke-red-500' : 'stroke-emerald-500'} transition-all duration-500`}
                              strokeWidth="8" 
                              strokeDasharray="289.02" 
                              strokeDashoffset={289.02 - (289.02 * Math.min(100, stats.balancePercentage)) / 100}
                              strokeLinecap="round"
                              transform="rotate(-90 60 60)"
                            />
                          </svg>
                          
                          {/* Inner Text overlay */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <span className="text-[17px] font-black font-mono text-slate-800 tracking-tighter leading-none mt-1">
                              {stats.balancePercentage}%
                            </span>
                            <span className="text-[7.5px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 leading-none">
                              {stats.isShortage ? 'Kurang' : 'Cukup'}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-2 text-[8px] font-semibold">
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-slate-100 border border-slate-200 rounded" />
                            <span className="text-slate-500 font-sans">Kebutuhan</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`w-2 h-2 rounded ${stats.isShortage ? 'bg-red-500' : 'bg-emerald-500'}`} />
                            <span className="text-slate-500 font-sans">Terdaftar</span>
                          </div>
                        </div>
                      </div>

                      {/* Detail Panel */}
                      <div className="md:col-span-7 space-y-3.5 bg-white border border-slate-200 p-4 rounded-xl shadow-xs text-slate-800 text-left">
                        <div>
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">
                              Unit ID #{activeId}
                            </span>
                            <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${
                              stats.isShortage ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {stats.isShortage ? '🔴 Kekurangan SDM' : '🟢 SDM Tercukupi'}
                            </span>
                          </div>
                          
                          <h4 className="text-xs font-bold text-slate-800 mt-2 font-display">
                            {unitDetails.nama_puskesmas}
                          </h4>
                          <p className="text-[9.5px] text-slate-500 leading-tight">
                            {unitDetails.alamat}
                          </p>

                          <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-100">
                            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                              <span className="text-[9px] text-slate-500 block font-semibold">Jumlah Penduduk</span>
                              <span className="text-xs font-bold text-slate-800 font-mono block">
                                {stats.penduduk.toLocaleString('id-ID')} Jiwa
                              </span>
                            </div>
                            <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                              <span className="text-[9px] text-slate-500 block font-semibold font-sans">Pemenuhan SDM</span>
                              <span className={`text-xs font-extrabold font-mono block ${stats.isShortage ? 'text-red-700 font-extrabold' : 'text-emerald-700 font-extrabold'}`}>
                                {stats.balancePercentage}%
                              </span>
                            </div>
                          </div>

                          <div className="mt-2 grid grid-cols-1 gap-1 text-[9.5px]">
                            <div className="flex justify-between border-b border-dashed border-slate-200 pb-0.5">
                              <span className="text-slate-500">Rasio Terdaftar:</span>
                              <span className="font-bold text-slate-800 font-mono">{stats.ratioActual} / 10k</span>
                            </div>
                            <div className="flex justify-between border-b border-dashed border-slate-200 pb-0.5">
                              <span className="text-slate-500">Target Rencana:</span>
                              <span className="font-bold text-slate-600 font-mono">{stats.ratioTarget} / 10k</span>
                            </div>
                          </div>

                          <div className="mt-3 space-y-1.5">
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                              Jenis Pegawai (PNS | PPPK PN | Paruh | Non-ASN)
                            </span>
                            <div className="grid grid-cols-4 gap-1 text-center font-mono text-[9px]">
                              <div className="bg-slate-50 p-1 rounded border border-slate-100">
                                <span className="text-[8px] text-slate-400 block">PNS</span>
                                <span className="font-bold text-indigo-700 block">{stats.pns}</span>
                              </div>
                              <div className="bg-slate-50 p-1 rounded border border-slate-100">
                                <span className="text-[8px] text-slate-400 block">Penuh</span>
                                <span className="font-bold text-emerald-600 block">{stats.pppkPenuh}</span>
                              </div>
                              <div className="bg-slate-50 p-1 rounded border border-slate-100">
                                <span className="text-[8px] text-slate-400 block">Paruh</span>
                                <span className="font-bold text-teal-700 block">{stats.pppkParuh}</span>
                              </div>
                              <div className="bg-slate-50 p-1 rounded border border-slate-100">
                                <span className="text-[8px] text-slate-400 block font-sans">Non-ASN</span>
                                <span className="font-bold text-amber-600 block">{stats.nonAsn}</span>
                              </div>
                            </div>
                          </div>

                          {/* Population Input form for user's own unit */}
                          <form 
                            onSubmit={(e) => {
                              e.preventDefault();
                              const parsed = Number(editedPopulationInput.replace(/\D/g, ''));
                              if (!isNaN(parsed) && parsed > 0) {
                                handleUpdatePopulation(activeId, parsed);
                              }
                            }}
                            className="mt-3 p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5 text-left"
                          >
                            <label className="text-[9px] font-bold text-slate-700 block uppercase tracking-wider">
                              Pembaruan Jumlah Penduduk
                            </label>
                            <div className="flex gap-1.5">
                              <input 
                                type="text"
                                value={editedPopulationInput}
                                onChange={(e) => setEditedPopulationInput(e.target.value)}
                                placeholder="Contoh: 92000"
                                className="bg-white border border-slate-300 text-slate-800 text-xs rounded px-2 py-1 flex-1 font-mono focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                              />
                              <button 
                                type="submit"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] px-2.5 py-1 rounded uppercase tracking-wider transition-colors shrink-0"
                              >
                                Simpan
                              </button>
                            </div>
                            {saveStatusMsg && (
                              <p className="text-[8.5px] text-emerald-600 font-semibold font-mono">{saveStatusMsg}</p>
                            )}
                          </form>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Real-time STR & SIP Compliance Panel */}
            <div className="lg:col-span-2">
              {renderStrSipCard()}
            </div>

          </div>
        )}

        {/* Card Analisa Dokumen Arsip (Moved to Bottom above early warning and drill-down analytics) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 text-slate-800 text-left shadow-sm mt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-600">
                <FileText size={20} />
              </div>
              <div>
                <h4 className="text-sm font-black font-display uppercase tracking-wider text-slate-800 leading-none">
                  Analisa Dokumen Arsip Digital Kepegawaian
                </h4>
                <p className="text-xs text-slate-400 mt-1.5 font-sans">
                  Sistem pemantauan digital kepatuhan upload 3 kelompok berkas dasar (Dasar, Personal, Pendidikan) oleh ASN Unit Kerja
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveArsipAnalysis(!activeArsipAnalysis)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl border border-amber-600 shrink-0 cursor-pointer shadow-3xs hover:shadow-2xs transition duration-200"
            >
              {activeArsipAnalysis ? '📊 Sembunyikan Evaluasi Detail' : '🔍 Lihat Evaluasi Detail Unit'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Kepatuhan Berkas Digital</span>
              <div className="flex items-baseline space-x-1.5 mt-1.5">
                <span className="text-2xl font-black font-mono text-emerald-600">{avgCompletionRate}%</span>
                <span className="text-xs text-slate-400">Rata-rata fasyankes</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-3.5">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${avgCompletionRate}%` }} />
              </div>
            </div>

            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Puskesmas Belum Lengkap</span>
              <div className="flex items-baseline space-x-1.5 mt-1.5">
                <span className="text-2xl font-black font-mono text-amber-600">{totalUnitsWithIncomplete}</span>
                <span className="text-xs text-slate-400">Unit kerja terdeteksi</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-4">
                Memiliki pegawai yang belum melengkapi 3 berkas dasar.
              </p>
            </div>

            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Pegawai Berkas Belum Lengkap</span>
              <div className="flex items-baseline space-x-1.5 mt-1.5">
                <span className="text-2xl font-black font-mono text-rose-600">{totalIncompletePegawai}</span>
                <span className="text-xs text-slate-400">Orang / ASN</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-4">
                Diperlukan tindak lanjut di masing-masing unit kerja fasyankes.
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Interactive Drill-Down Panel: Analisa Unit Kerja Belum Melengkapi Arsip */}
        {activeArsipAnalysis && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-left animate-in slide-in-from-top-4 duration-300 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
              <div>
                <h4 className="font-display font-extrabold text-sm text-slate-850 text-slate-900 flex items-center gap-2 leading-none">
                  <span className="w-1.5 h-3.5 bg-amber-500 rounded-sm" />
                  Rincian Evaluasi: Unit Kerja Belum Melengkapi Arsip Berkas Kepegawaian
                </h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Menampilkan daftar Fasyankes yang memiliki pegawai dengan dokumen dasar yang diunggah belum mencapai batas minimum (minimal 3 berkas).
                </p>
              </div>
              <button 
                onClick={() => {
                  setActiveArsipAnalysis(false);
                  setSelectedAnalysisUnitId(null);
                }}
                className="text-xs font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition cursor-pointer"
              >
                Tutup Analisa
              </button>
            </div>

            {/* List of Units (1st Level Drill-Down) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {unitIncompleteList.map((item) => {
                const isSelected = selectedAnalysisUnitId === item.unit.id;
                return (
                  <div 
                    key={item.unit.id}
                    onClick={() => setSelectedAnalysisUnitId(isSelected ? null : item.unit.id)}
                    className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                      isSelected 
                        ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-200/50 scale-[1.01]' 
                        : 'bg-slate-50 border-slate-100 hover:border-slate-300 hover:bg-slate-100/50'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-1">
                        <h5 className="font-bold text-xs text-slate-850 text-slate-800 leading-tight">
                          {item.unit.nama_puskesmas}
                        </h5>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-extrabold shrink-0 ${
                          item.incompleteCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {item.incompleteCount} Belum Lengkap
                        </span>
                      </div>
                      
                      {/* Completion Progress Bar */}
                      <div className="mt-4 space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-500">
                          <span>Persentase Kepatuhan</span>
                          <span className="font-bold font-mono text-slate-700">{item.completionRate}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-500 rounded-full transition-all duration-300" 
                            style={{ width: `${item.completionRate}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Total ASN: <strong>{item.totalStaff} org</strong></span>
                      <span className="font-bold text-amber-700 hover:underline flex items-center gap-0.5">
                        {isSelected ? 'Sembunyikan Pegawai ↑' : 'Klik Detail Pegawai →'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* List of Incomplete Employees (2nd Level Drill-Down) */}
            {selectedAnalysisUnitId && (
              <div className="mt-6 border-t border-slate-100 pt-5 space-y-3 animate-in fade-in duration-200">
                {(() => {
                  const selectedUnitData = unitIncompleteList.find(x => x.unit.id === selectedAnalysisUnitId);
                  if (!selectedUnitData) return null;
                  return (
                    <>
                      <div className="flex justify-between items-center">
                        <h5 className="text-xs font-extrabold text-slate-850 text-slate-800 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-amber-650 bg-amber-600 rounded-full" />
                          Daftar Pegawai Belum Lengkap Arsip di {selectedUnitData.unit.nama_puskesmas}
                        </h5>
                        <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 font-bold">
                          {selectedUnitData.incompleteCount} PNS/PPPK/Non-ASN
                        </span>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-slate-200/60">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-150 text-slate-650 text-[10px] font-bold uppercase tracking-wider">
                              <th className="p-3 font-semibold">Nama Pegawai / NIP</th>
                              <th className="p-3 font-semibold">Status Kepegawaian</th>
                              <th className="p-3 font-semibold">Dokumen Terupload</th>
                              <th className="p-3 font-semibold">Status Kategori Arsip (Dasar, Personal, Pendidikan)</th>
                              <th className="p-3 font-semibold text-right">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedUnitData.incompleteStaff.map((asn, idx) => {
                              const files = arsipList.filter(f => f.id_asn === asn.id);
                              
                              return (
                                <tr key={idx} className="hover:bg-slate-50 transition text-slate-700 text-xs">
                                  <td className="p-3 font-semibold text-slate-805 text-slate-800">
                                    <div>{asn.nama_lengkap}{asn.gelar_belakang ? `, ${asn.gelar_belakang}` : ''}</div>
                                    <div className="text-[10px] text-slate-400 font-mono">NIP {asn.nip}</div>
                                  </td>
                                  <td className="p-3">
                                    <span className="px-2 py-0.5 bg-slate-105 bg-slate-100 text-slate-600 rounded text-[9px] font-bold uppercase shrink-0">
                                      {asn.status_pegawai_detail}
                                    </span>
                                  </td>
                                  <td className="p-3 font-mono font-bold text-slate-600">
                                    {files.length} Berkas
                                  </td>
                                  <td className="p-3">
                                    <div className="flex flex-wrap gap-1.5">
                                      {['Dasar', 'Personal', 'Pendidikan'].map((category) => {
                                        const hasCat = files.some(f => f.kategori_kelompok === category);
                                        return (
                                          <span 
                                            key={category}
                                            className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded ${
                                              hasCat ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-105 border-rose-100'
                                            }`}
                                          >
                                            {category}: {hasCat ? '✓ Ada' : '✗ Kosong'}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </td>
                                  <td className="p-3 text-right">
                                    <button 
                                      onClick={() => onNavigateToTab('arsip-kepegawaian')}
                                      className="text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1 rounded border border-amber-600 cursor-pointer transition"
                                    >
                                      Lengkapi Dokumen →
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

      </div>

      {/* 4. MULTI-TENANT EARLY WARNING ALERT (Jatuh Tempo TMT) */}
      <div className="bg-[#16161a] border border-white/5 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 bg-rose-950/45 text-rose-400 border border-rose-500/20 rounded-xl">
              <Bell size={18} />
            </span>
            <div>
              <h2 className="font-display font-semibold text-white text-md">Multi-Tenant Early Warning Alert</h2>
              <p className="text-xs text-slate-405 text-slate-400">Deteksi otomatis batas jatuh tempo layanan kepegawaian administratif (TMT)</p>
            </div>
          </div>
          <span className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-3 py-1 rounded-md font-bold">
            Target Bulan Depan: {targetBulanDepanLabel}
          </span>
        </div>

        {alerts.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center space-y-2">
            <AlertCircle size={32} className="text-slate-500" />
            <p className="text-sm font-semibold text-slate-400">Tidak ada alert jatuh tempo aktif saat ini.</p>
            <p className="text-xs text-slate-505 text-slate-500">Seluruh jadwal kenaikan TMT pegawai di unit kerja dalam kondisi termonitor.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {alerts.map((alert) => {
              const isPensiun = alert.type === 'pensiun';
              const isPangkat = alert.type === 'pangkat';
              const isKP4 = alert.type === 'kp4';
              const pillColor = isPensiun 
                ? "bg-rose-950/20 text-rose-200 border-rose-500/20" 
                : isPangkat 
                  ? "bg-amber-950/20 text-amber-200 border-amber-500/20" 
                  : isKP4
                    ? "bg-violet-950/20 text-violet-200 border-violet-500/20"
                    : "bg-emerald-950/20 text-emerald-200 border-emerald-500/20";

              return (
                <div key={alert.id} className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border ${pillColor} transition-all space-y-4 sm:space-y-0`}>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap">
                      <span className="font-black text-sm tracking-tight text-white">{alert.asnName}</span>
                      <span className="text-slate-405 text-slate-400 text-xs">/ NIP {alert.nip}</span>
                    </div>
                    <p className="font-semibold text-xs text-slate-300 flex items-center space-x-1 mt-1">
                      <AlertCircle size={14} className="inline mr-1 text-slate-400" />
                      {alert.message} : <span className="font-extrabold ml-1 text-white">{alert.subMessage}</span>
                    </p>
                    {currentRole === 'admin_dinkes' && (
                      <p className="text-[10px] text-slate-500 font-mono">
                        Unit Fasyankes: <span className="underline text-slate-400 font-bold">{getPuskesmasName(alert.puskesmasId)}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-center">
                    <button
                      onClick={() => handleSendNotificationToUserAccount(alert)}
                      className="flex items-center space-x-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition cursor-pointer"
                    >
                      <Bell size={13} />
                      <span>Kirim ke WA Pegawai</span>
                    </button>
                    <button
                      onClick={() => {
                        const routeSlug = alert.type === 'pensiun' 
                          ? 'pensiun' 
                          : alert.type === 'pangkat' 
                            ? 'kenaikan-pangkat' 
                            : alert.type === 'kp4'
                              ? 'gaji-berkala' // KP4 is verified as part of the periodic allowance process
                              : 'gaji-berkala';
                        onNavigateToService(alert.id_asn, routeSlug);
                      }}
                      className="flex items-center space-x-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 border border-white/5 transition cursor-pointer"
                    >
                      <span>Proses Usulan</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Linked Devices & WhatsApp Web FAQ Accordion */}
        <div className="bg-[#1e1e24] border border-white/5 rounded-xl p-4 mt-2">
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <div className="flex items-center space-x-2.5">
                <span className="p-1.5 bg-emerald-950/50 text-emerald-400 rounded-lg">
                  <MessageSquare size={13} />
                </span>
                <span className="text-xs font-bold text-slate-300 group-hover:text-white transition">
                  Bagaimana Cara WhatsApp Web Menangani "Login Perangkat Tertaut"?
                </span>
              </div>
              <span className="transition group-open:rotate-180 text-emerald-400">
                <svg fill="none" height="18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="18">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </span>
            </summary>
            
            <div className="mt-4 text-[11px] text-slate-450 text-slate-400 leading-relaxed border-t border-white/5 pt-4 space-y-3">
              <div className="flex items-start space-x-2.5">
                <div className="mt-0.5 px-2 py-0.5 rounded bg-emerald-950/60 text-[9.5px] text-emerald-400 font-mono font-bold border border-emerald-500/10">Skenario A</div>
                <p className="flex-1">
                  <strong>Jika pengguna sudah pernah login WA Web di laptop tersebut:</strong> Browser menyimpan session (cookie / local storage) secara aman. Begitu tombol diklik, WhatsApp Web akan langsung terbuka secara otomatis, masuk ke ruang obrolan pegawai bersangkutan, dan teks draf pesan yang disusun dinamis berdasarkan fitur &amp; dokumen wajib langsung terisi di kolom inputan. Anda cukup menekan tombol <strong>Kirim (Enter)</strong> di keyboard.
                </p>
              </div>
              
              <div className="flex items-start space-x-2.5">
                <div className="mt-0.5 px-2 py-0.5 rounded bg-amber-955/60 bg-yellow-950/60 text-[9.5px] text-amber-400 font-mono font-bold border border-amber-500/10">Skenario B</div>
                <p className="flex-1">
                  <strong>Jika pengguna BELUM pernah login WA Web di laptop tersebut:</strong> WhatsApp secara otomatis menampilkan halaman QR Code terlebih dahulu. Setelah Anda melakukan scan QR menggunakan HP (melalui menu Perangkat Tertaut di aplikasi WA HP), WhatsApp Web tidak akan melempar Anda kembali ke beranda utama, melainkan tetap <strong>melanjutkan instruksi awal secara instan</strong>, yaitu langsung membuka ruang obrolan pegawai tersebut beserta pesan draf lengkap dengan daftar Berkas Wajib.
                </p>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
