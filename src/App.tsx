/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Bell, 
  Layers, 
  FileText, 
  Users, 
  Sliders, 
  ShieldAlert, 
  RefreshCw,
  Search,
  CheckCircle,
  Database,
  Shield,
  Plus,
  Table,
  Upload,
  UserCheck,
  AlertCircle,
  FolderCheck,
  AlertTriangle,
  X,
  LogOut,
  Lock,
  User,
  Eye,
  EyeOff,
  Menu,
  Award,
  Briefcase,
  Clock,
  Baby,
  Calendar,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Link,
  MessageSquare
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { getDB, saveDB, initializeDB, getFallbackProfesiId } from './mockData';
import { 
  Puskesmas, 
  ASNProfile, 
  MasterFitur, 
  MasterDokumen, 
  UsulanLayanan, 
  RiwayatAngkaKredit, 
  MasterProfesiSDMK,
  StatusPegawaiDetail,
  JenisPegawai,
  JenisKelamin,
  KP4Anak
} from './types';

// Importing Custom Component Views
import DashboardOverview from './lib/components/DashboardOverview';
import LayananKepegawaian from './lib/components/LayananKepegawaian';
import LaporanSDMK from './lib/components/LaporanSDMK';
import DinkesManagement from './lib/components/DinkesManagement';
import ArsipKepegawaianView from './lib/components/ArsipKepegawaianView';
import DashboardKP4 from './lib/components/DashboardKP4';
import PemantauanASNView from './lib/components/PemantauanASNView';
import LoginView from './lib/components/LoginView';
import { pushClientDataToD1, pullCloudDataFromD1, testD1Connection } from './lib/cloudflare-d1';
import { formatDate, addYearsToDateString, normalizeIndonesianPhoneNumber } from './utils';

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

export const SUB_JENIS_JABATAN_MAP: Record<string, { label: string; ids: number[] }> = {
  'TENAGA_MEDIS': { label: 'Tenaga Medis (Dokter/drg)', ids: [2, 3] },
  'TENAGA_KEPERAWATAN': { label: 'Tenaga Keperawatan (Perawat)', ids: [1] },
  'TENAGA_KEBIDANAN': { label: 'Tenaga Kebidanan (Bidan)', ids: [4] },
  'TENAGA_KEFARMASIAN': { label: 'Tenaga Kefarmasian', ids: [5, 6] },
  'TENAGA_KESLING_PROMKES': { label: 'Tenaga Kes. Masyarakat & Sanitasi', ids: [7, 8] },
  'TENAGA_GIZI': { label: 'Tenaga Gizi', ids: [9] },
  'TENAGA_KETEKNISAN_MEDIS': { label: 'Tenaga Keteknisan Medis & Biomedis', ids: [10, 11, 12] },
  'TENAGA_ADMINISTRASI': { label: 'Tenaga Administrasi & Pendukung', ids: [13, 14, 15] },
};

const LIST_GOLONGAN_PNS = [
  "I/a", "I/b", "I/c", "I/d",
  "II/a", "II/b", "II/c", "II/d",
  "III/a", "III/b", "III/c", "III/d",
  "IV/a", "IV/b", "IV/c", "IV/d", "IV/e"
];

const getNextGolonganDescription = (golongan: string) => {
  const index = LIST_GOLONGAN_PNS.indexOf(golongan);
  if (index !== -1 && index < LIST_GOLONGAN_PNS.length - 1) {
    const nextGol = LIST_GOLONGAN_PNS[index + 1];
    const nextPangkat = GOLONGAN_TO_PANGKAT[nextGol];
    return `Kenaikan Pangkat ke ${nextGol} (${nextPangkat})`;
  }
  return '-';
};

export default function App() {
  const [dbState, setDbState] = useState(() => getDB());
  const [isLoadingDatabase, setIsLoadingDatabase] = useState(true);
  const [databaseStatus, setDatabaseStatus] = useState<string>('Memulai Sistem...');
  const [isPullingRef] = useState({ current: false });

  // Initial local initialization
  useEffect(() => {
    initializeDB();
  }, []);

  // Direct Startup fetching from Cloudflare D1 (sapa_pegawai: ad596f89-28c6-4266-ac02-90c60833b682)
  useEffect(() => {
    const fetchDirectlyOnStartup = async () => {
      try {
        setIsLoadingDatabase(true);
        setDatabaseStatus('Menghubungkan langsung ke database Cloudflare D1 (sapa_pegawai)...');
        const conn = await testD1Connection();
        if (!conn.success) {
          console.warn("Koneksi Cloudflare D1 belum siap:", conn.message);
          setDatabaseStatus('Gagal terhubung ke database Cloudflare D1 (sapa_pegawai). Harap periksa jaringan.');
          setIsLoadingDatabase(false);
          return;
        }

        setDatabaseStatus('Mengambil data riil dari Cloudflare D1 (sapa_pegawai)...');
        const res = await pullCloudDataFromD1();
        if (res.success && res.data) {
          // Pure real database state from Cloudflare D1
          setDbState(res.data);
          saveDB(res.data);
          setSuccessToast("⚡ Terkoneksi Cloudflare D1: Data riil aktif dimuat dari database sapa_pegawai!");
        } else {
          setDatabaseStatus('Gagal mengambil data dari Cloudflare D1.');
        }
      } catch (err: any) {
        console.warn("Gagal memuat database Cloudflare D1 pada startup:", err);
        setDatabaseStatus('Terjadi kesalahan memuat database dari Cloudflare D1.');
      } finally {
        setIsLoadingDatabase(false);
      }
    };
    fetchDirectlyOnStartup();
  }, []);

  // Fallback Polling & Tab Focus Synchronization with Cloudflare D1
  useEffect(() => {
    // 1. Sync on tab focus
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ [Sync on Focus] Pengguna kembali ke tab. Memperbarui data dari Cloudflare D1...');
        try {
          const res = await pullCloudDataFromD1();
          if (res.success && res.data) {
            setDbState(prev => {
              saveDB(res.data);
              return {
                ...prev,
                ...res.data
              };
            });
          }
        } catch (err) {
          console.warn("[Sync on Focus] Gagal memperbarui data dari Cloudflare D1:", err);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange);

    // 2. Periodic Polling every 20 seconds
    const intervalId = setInterval(async () => {
      try {
        const res = await pullCloudDataFromD1();
        if (res.success && res.data) {
          setDbState(prev => {
            let hasChanges = false;
            const updatedKeys: string[] = [];
            
            Object.keys(res.data).forEach(key => {
              if (JSON.stringify(prev[key]) !== JSON.stringify(res.data[key])) {
                hasChanges = true;
                updatedKeys.push(key);
              }
            });
            
            if (hasChanges) {
              console.log(`🔄 [Sync Polling] Menemukan perubahan data baru di Cloudflare D1: ${updatedKeys.join(', ')}. Memperbarui UI...`);
              saveDB(res.data);
              return {
                ...prev,
                ...res.data
              };
            }
            return prev;
          });
        }
      } catch (err) {
        // Silently continue in offline mode
      }
    }, 20000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, []);

  // Custom unified save and sync mechanism that updates memory and pushes directly to Cloudflare D1
  const saveAndSync = async (changedState: Partial<typeof dbState> & Record<string, any>) => {
    // 1. Persist locally to localStorage immediately (safety offline backup)
    saveDB(changedState);

    // 2. Update React component state atomically using a functional state updater
    setDbState(prev => {
      return { 
        ...prev, 
        ...changedState 
      };
    });

    // 3. Push updated records to Cloudflare D1 in the background
    const keysToSync = Object.keys(changedState);
    pushClientDataToD1(changedState, keysToSync)
      .then((res) => {
        if (res && res.success) {
          console.log(`✅ [Cloudflare D1 Sync] Berhasil menyinkronkan data: ${keysToSync.join(', ')}`);
        } else {
          console.log(`ℹ️ [Cloudflare D1 Sync]:`, res?.log);
        }
      })
      .catch(e => {
        console.warn("⚠️ Kesalahan saat sinkronisasi background Cloudflare D1:", e);
      });
  };

  const [activeTab, setActiveTab] = useState<string>('dasbor');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  // Default accordion sub-menus closed on initial load
  const [isPemantauanAsnOpen, setIsPemantauanAsnOpen] = useState<boolean>(false);
  const [pemantauanSubTab, setPemantauanSubTab] = useState<'pangkat' | 'jafung' | 'kgb' | 'pensiun'>('pangkat');
  
  // Layanan Kepegawaian Sub Navigation State - closed by default
  const [isLayananOpen, setIsLayananOpen] = useState<boolean>(false);
  const [layananSubTab, setLayananSubTab] = useState<'berjalan' | 'baru'>('berjalan');

  // Pengaturan (Administrasi) Sub Navigation State - closed by default
  const [isPengaturanOpen, setIsPengaturanOpen] = useState<boolean>(false);
  const [pengaturanSubTab, setPengaturanSubTab] = useState<'users' | 'documents' | 'features' | 'units' | 'whatsapp' | 'd1'>('users');

  // Helper for navigation tab click with mobile auto-close and closing all sub sidebars
  const handleNavClick = (tab: string) => {
    setActiveTab(tab);
    setNavAsnId(null);
    setNavSlug(null);
    setIsPemantauanAsnOpen(false);
    setIsLayananOpen(false);
    setIsPengaturanOpen(false);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const handlePemantauanNavClick = (subTab: 'pangkat' | 'jafung' | 'kgb' | 'pensiun' = 'pangkat') => {
    setActiveTab('pemantauan-asn');
    setPemantauanSubTab(subTab);
    setIsPemantauanAsnOpen(true);
    setIsLayananOpen(false);
    setIsPengaturanOpen(false);
    setNavAsnId(null);
    setNavSlug(null);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const handleLayananNavClick = (subTab: 'berjalan' | 'baru' = 'berjalan') => {
    setActiveTab('layanan-kepegawaian');
    setLayananSubTab(subTab);
    setIsLayananOpen(true);
    setIsPemantauanAsnOpen(false);
    setIsPengaturanOpen(false);
    setNavAsnId(null);
    setNavSlug(null);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  const handlePengaturanNavClick = (subTab: 'users' | 'documents' | 'features' | 'units' | 'whatsapp' | 'd1' = 'users') => {
    setActiveTab('manajemen-dinkes');
    setPengaturanSubTab(subTab);
    setIsPengaturanOpen(true);
    setIsPemantauanAsnOpen(false);
    setIsLayananOpen(false);
    setNavAsnId(null);
    setNavSlug(null);
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('simpeg_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch (_) {
      return null;
    }
  });

  // Multi-Tenant Acting User states
  const [currentRole, setCurrentRole] = useState<'admin_dinkes' | 'admin_puskesmas'>(() => {
    try {
      const saved = localStorage.getItem('simpeg_current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.role) return parsed.role;
      }
    } catch (_) {}
    return 'admin_dinkes';
  });
  const [selectedPuskesmasId, setSelectedPuskesmasId] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('simpeg_current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.id_puskesmas) return Number(parsed.id_puskesmas);
      }
    } catch (_) {}
    return 1; // e.g. Gerung
  });

  // Real dynamic counts for Pemantauan ASN based on active pegawai data
  const pemantauanCounts = useMemo(() => {
    const list = (dbState?.asnProfiles || []).filter(asn => {
      if (asn.status_kepegawaian === 'Pensiun') return false;
      if (currentRole !== 'admin_dinkes' && selectedPuskesmasId) {
        return asn.id_puskesmas === selectedPuskesmasId;
      }
      return true;
    });

    const pangkatCount = list.filter(asn => asn.status_pegawai_detail === 'PNS').length;
    const jafungCount = list.filter(asn => asn.jenis_pegawai === 'Jafung_Kesehatan' || Boolean(asn.jenjang_jafung) || (asn.pns_jenis_jabatan && asn.pns_jenis_jabatan.toLowerCase().includes('fungsional'))).length;
    const kgbCount = list.filter(asn => asn.status_pegawai_detail === 'PNS' || asn.status_pegawai_detail === 'PPPK_Penuh_Waktu' || asn.status_pegawai_detail === 'PPPK_Paruh_Waktu').length;
    const pensiunCount = list.length;

    return {
      pangkat: pangkatCount,
      jafung: jafungCount,
      kgb: kgbCount,
      pensiun: pensiunCount,
      total: pangkatCount + jafungCount + kgbCount + pensiunCount
    };
  }, [dbState?.asnProfiles, currentRole, selectedPuskesmasId]);

  // Renbut State
  const [renbutList, setRenbutList] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('renbut_data_list');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) return parsed;
      }
    } catch {}

    const startYear = 2023;
    const currentYearVal = new Date().getFullYear();
    const makeProj = (keb: number) => {
      const proj: Record<number, number> = {};
      for (let yr = startYear; yr <= currentYearVal; yr++) {
        const delta = yr - 2026;
        proj[yr] = Math.max(1, keb + Math.round(delta * 0.4));
      }
      return proj;
    };

    return [
      { id: '1', id_puskesmas: 1, jab_fungsional: 'PERAWAT', jenjang: 'Terampil', asn: 4, nonAsn: 3, kebutuhan: 9, kesenjangan: -2, keterangan: 'K', standarMinimal: 9, abkKebutuhan: 8.5, projection: makeProj(9) },
      { id: '2', id_puskesmas: 1, jab_fungsional: 'BIDAN', jenjang: 'Terampil', asn: 3, nonAsn: 2, kebutuhan: 6, kesenjangan: -1, keterangan: 'K', standarMinimal: 6, abkKebutuhan: 5.4, projection: makeProj(6) },
      { id: '3', id_puskesmas: 1, jab_fungsional: 'DOKTER', jenjang: 'Ahli Pertama', asn: 2, nonAsn: 1, kebutuhan: 3, kesenjangan: 0, keterangan: 'S', standarMinimal: 3, abkKebutuhan: 2.8, projection: makeProj(3) },
      
      { id: '4', id_puskesmas: 2, jab_fungsional: 'PERAWAT', jenjang: 'Terampil', asn: 5, nonAsn: 4, kebutuhan: 10, kesenjangan: -1, keterangan: 'K', standarMinimal: 10, abkKebutuhan: 9.5, projection: makeProj(10) },
      { id: '5', id_puskesmas: 2, jab_fungsional: 'BIDAN', jenjang: 'Terampil', asn: 4, nonAsn: 3, kebutuhan: 8, kesenjangan: -1, keterangan: 'K', standarMinimal: 8, abkKebutuhan: 7.6, projection: makeProj(8) },
      
      { id: '6', id_puskesmas: 3, jab_fungsional: 'PERAWAT', jenjang: 'Terampil', asn: 3, nonAsn: 2, kebutuhan: 7, kesenjangan: -2, keterangan: 'K', standarMinimal: 7, abkKebutuhan: 6.6, projection: makeProj(7) },
      { id: '7', id_puskesmas: 3, jab_fungsional: 'DOKTER', jenjang: 'Ahli Pertama', asn: 1, nonAsn: 1, kebutuhan: 2, kesenjangan: 0, keterangan: 'S', standarMinimal: 2, abkKebutuhan: 1.9, projection: makeProj(2) },
      
      { id: '8', id_puskesmas: 4, jab_fungsional: 'BIDAN', jenjang: 'Terampil', asn: 2, nonAsn: 2, kebutuhan: 5, kesenjangan: -1, keterangan: 'K', standarMinimal: 5, abkKebutuhan: 4.7, projection: makeProj(5) },
      { id: '9', id_puskesmas: 4, jab_fungsional: 'NUTRISIONIS', jenjang: 'Ahli Pertama', asn: 1, nonAsn: 0, kebutuhan: 2, kesenjangan: -1, keterangan: 'K', standarMinimal: 2, abkKebutuhan: 1.8, projection: makeProj(2) },
      
      { id: '10', id_puskesmas: 5, jab_fungsional: 'PERAWAT', jenjang: 'Terampil', asn: 2, nonAsn: 3, kebutuhan: 6, kesenjangan: -1, keterangan: 'K', standarMinimal: 6, abkKebutuhan: 5.7, projection: makeProj(6) },
      { id: '11', id_puskesmas: 5, jab_fungsional: 'BIDAN', jenjang: 'Terampil', asn: 3, nonAsn: 1, kebutuhan: 4, kesenjangan: 0, keterangan: 'S', standarMinimal: 4, abkKebutuhan: 3.8, projection: makeProj(4) },
    ];
  });

  const updateRenbutList = (newList: any[]) => {
    setRenbutList(newList);
    localStorage.setItem('renbut_data_list', JSON.stringify(newList));
  };
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState<boolean>(false);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);

  // Close notifications dropdown on clicking outside anywhere on screen
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!showNotificationsDropdown) return;
      const target = event.target as Node;
      if (
        notificationDropdownRef.current && 
        !notificationDropdownRef.current.contains(target) &&
        notificationButtonRef.current &&
        !notificationButtonRef.current.contains(target)
      ) {
        setShowNotificationsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotificationsDropdown]);

  // PWA & Notification API State & Logic
  const [notifPermission, setNotifPermission] = useState<string>(() => {
    try {
      if (typeof Notification !== 'undefined') {
        return Notification.permission;
      }
    } catch (_) {}
    return 'default';
  });

  // 1. Register Service Worker for PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          console.log('⚡ SAPA PWA Service Worker Registered:', reg.scope);
        })
        .catch(err => {
          console.warn('❌ SAPA PWA Service Worker failure:', err);
        });
    }
  }, []);

  // 2. Trigger native hardware/OS level notifications securely
  const triggerNativeNotification = (title: string, body: string) => {
    try {
      if (!('Notification' in window)) {
        console.warn("Device tidak mendukung Notification API.");
        return;
      }

      const showNotification = () => {
        try {
          // Android / iOS standalone PWA require notifications through the registered service worker
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then(reg => {
              if (reg.active) {
                reg.active.postMessage({
                  type: 'SHOW_NATIVE_NOTIFICATION',
                  payload: {
                    title,
                    body,
                    icon: '/icon.svg',
                    badge: '/icon.svg'
                  }
                });
              } else {
                try {
                  new Notification(title, { body, icon: '/icon.svg' });
                } catch (_) {}
              }
            }).catch(() => {
              try {
                new Notification(title, { body, icon: '/icon.svg' });
              } catch (_) {}
            });
          } else {
            try {
              new Notification(title, { body, icon: '/icon.svg' });
            } catch (_) {}
          }
        } catch (_) {}
      };

      if (Notification.permission === 'granted') {
        showNotification();
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          setNotifPermission(permission);
          if (permission === 'granted') {
            showNotification();
          }
        }).catch(() => {});
      }
    } catch (e) {
      console.warn("Notification API blocked or failed in sandbox iframe environment.", e);
    }
  };

  // 3. User permission requester
  const requestNotificationPermission = () => {
    try {
      if (!('Notification' in window)) {
        alert("Browser atau perangkat Anda tidak mendukung notifikasi sistem.");
        return;
      }
      Notification.requestPermission().then(permission => {
        setNotifPermission(permission);
        if (permission === 'granted') {
          triggerNativeNotification(
            "🔔 Notifikasi Sistem Aktif", 
            "Terima kasih! Anda sekarang akan menerima peringatan dinas dan usulan layanan SAPA secara real-time di perangkat ini."
          );
        } else if (permission === 'denied') {
          alert("Notifikasi telah diblokir. Harap aktifkan izin notifikasi pada pengaturan browser Anda.");
        }
      }).catch(() => {
        alert("Izin notifikasi diblokir oleh kebijakan keamanan browser Anda.");
      });
    } catch (e) {
      alert("Izin notifikasi diblokir oleh kebijakan keamanan browser Anda.");
    }
  };

  // 4. Watch for hot new incoming notifications securely
  const prevNotificationsCountRef = useRef<number>((dbState.notifications || []).length);
  const initialLoadRef = useRef<boolean>(true);

  useEffect(() => {
    const rawNotifs = dbState.notifications || [];
    
    if (initialLoadRef.current) {
      prevNotificationsCountRef.current = rawNotifs.length;
      initialLoadRef.current = false;
      return;
    }

    const prevCount = prevNotificationsCountRef.current;
    prevNotificationsCountRef.current = rawNotifs.length;

    // Trigger only when new items are added to the list
    if (rawNotifs.length > prevCount) {
      const newest = rawNotifs[0]; // because unshifted
      if (newest && !newest.isRead) {
        const isMatch = newest.targetRole === currentRole && 
          (currentRole === 'admin_dinkes' || newest.targetPuskesmasId === selectedPuskesmasId);

        if (isMatch) {
          triggerNativeNotification(newest.title, newest.message);
        }
      }
    }
  }, [dbState.notifications, currentRole, selectedPuskesmasId]);

  // Filter queries for Pegawai roster table
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterUnitFilter, setRosterUnitFilter] = useState<number | string>(() => {
    try {
      const saved = localStorage.getItem('simpeg_current_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.role === 'admin_dinkes') return 100;
      }
    } catch (_) {}
    return 'ALL';
  }); // defaults to 100 for admin_dinkes, 'ALL' for others
  const [rosterStatusFilter, setRosterStatusFilter] = useState<string>('ALL'); // 'ALL', 'PNS', etc.
  const [rosterSubJenisJabatanFilter, setRosterSubJenisJabatanFilter] = useState<string>('ALL');

  // Navigation parameters for deep links
  const [navAsnId, setNavAsnId] = useState<number | null>(null);
  const [navSlug, setNavSlug] = useState<string | null>(null);

  // Active editing employee state
  const [editingAsn, setEditingAsn] = useState<ASNProfile | null>(null);
  const [selectedProfileForDetail, setSelectedProfileForDetail] = useState<ASNProfile | null>(null);
  
  // Temporary child form states inside KP4/Model DK
  const [newChildName, setNewChildName] = useState('');
  const [newChildNik, setNewChildNik] = useState('');
  const [newChildDob, setNewChildDob] = useState('');
  const [newChildSchool, setNewChildSchool] = useState<'Tidak Sekolah' | 'Sekolah/Kuliah' | 'Bekerja' | 'Menikah'>('Sekolah/Kuliah');
  const [newChildSkks, setNewChildSkks] = useState(false);
  const [newChildSkksNo, setNewChildSkksNo] = useState('');
  const [newChildSkksDate, setNewChildSkksDate] = useState('');
  const [newChildClaimed, setNewChildClaimed] = useState(true);
  const [asnToDelete, setAsnToDelete] = useState<{ id: number; name: string } | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Auto-clear toast after 5 seconds
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => {
        setSuccessToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  // Toggle state for Adding employee modes in the Roster view
  const [showAddForm, setShowAddForm] = useState(false);
  const [addMode, setAddMode] = useState<'single' | 'excel'>('single');

  // Single Pegawai Input Fields state
  const [newNip, setNewNip] = useState('');
  const [newNama, setNewNama] = useState('');
  const [newGelar, setNewGelar] = useState('');
  const [newGender, setNewGender] = useState<JenisKelamin>('L');
  const [newStatusDetail, setNewStatusDetail] = useState<StatusPegawaiDetail>('PNS');
  const [newJenisPegawai, setNewJenisPegawai] = useState<JenisPegawai>('Jafung_Kesehatan');
  const [newProfesiId, setNewProfesiId] = useState<number>(1);
  const [newGolongan, setNewGolongan] = useState('III/a');
  const [newTanggalLahir, setNewTanggalLahir] = useState('1990-01-01');
  const [newUnitId, setNewUnitId] = useState<number>(1);
  const [newNomorWa, setNewNomorWa] = useState('+62');

  // === Detail Inputs for PNS ===
  const [newPangkatNama, setNewPangkatNama] = useState('Penata Muda');
  const [newPnsJenisKenaikanPangkat, setNewPnsJenisKenaikanPangkat] = useState('Pilihan (Jabatan Fungsional Tertentu)');
  const [newPnsMasaKerjaGolongan, setNewPnsMasaKerjaGolongan] = useState('04 tahun 02 bulan');
  const [newPnsTmtGolongan, setNewPnsTmtGolongan] = useState('2025-04-01');
  const [newPnsNoPertekBkn, setNewPnsNoPertekBkn] = useState('');
  const [newPnsTglPertekBkn, setNewPnsTglPertekBkn] = useState('');
  const [newPnsNoSk, setNewPnsNoSk] = useState('');
  const [newPnsTglSk, setNewPnsTglSk] = useState('');
  const [newPnsNamaJabatan, setNewPnsNamaJabatan] = useState('');
  const [newPnsJenisJabatan, setNewPnsJenisJabatan] = useState('Jabatan Fungsional');
  const [newPnsInstansiPembina, setNewPnsInstansiPembina] = useState('Badan Kepegawaian Negara');
  const [newPnsJenisMutasi, setNewPnsJenisMutasi] = useState('Mutasi Jabatan');
  const [newPnsTmtJabatan, setNewPnsTmtJabatan] = useState('');
  const [newPnsInstansiKerja, setNewPnsInstansiKerja] = useState('Pemerintah Kab. Lombok Barat');
  const [newPnsInstansiInduk, setNewPnsInstansiInduk] = useState('Pemerintah Kab. Lombok Barat');
  const [newPnsSatker, setNewPnsSatker] = useState('UPT Puskesmas Sedau');
  const [newPnsSatkerInduk, setNewPnsSatkerInduk] = useState('Dinas Kesehatan Kab. Lombok Barat');
  const [newPnsUnor, setNewPnsUnor] = useState('UPT Puskesmas Sedau');
  const [newPnsUnorInduk, setNewPnsUnorInduk] = useState('UPT Puskesmas Sedau');
  const [newPnsNoSkJabatan, setNewPnsNoSkJabatan] = useState('');
  const [newPnsTglSkJabatan, setNewPnsTglSkJabatan] = useState('');
  const [newTmtBerkalaTerakhir, setNewTmtBerkalaTerakhir] = useState('2025-01-01');

  // === Detail Inputs for PPPK (Penuh / Paruh Waktu) ===
  const [newPppkNi, setNewPppkNi] = useState('');
  const [newPppkNoPerjanjian, setNewPppkNoPerjanjian] = useState('');
  const [newPppkTglPerjanjian, setNewPppkTglPerjanjian] = useState('');
  const [newPppkTmtPerjanjianMulai, setNewPppkTmtPerjanjianMulai] = useState('25-Jan-2025');
  const [newPppkTmtPerjanjianSelesai, setNewPppkTmtPerjanjianSelesai] = useState('25-Jan-2030');
  const [newPppkTmtGolongan, setNewPppkTmtGolongan] = useState('');
  const [newPppkNoSk, setNewPppkNoSk] = useState('');
  const [newPppkTglSk, setNewPppkTglSk] = useState('');
  const [newPppkInstansiKerja, setNewPppkInstansiKerja] = useState('Pemerintah Kab. Lombok Barat');
  const [newPppkInstansiInduk, setNewPppkInstansiInduk] = useState('Pemerintah Kab. Lombok Barat');
  const [newPppkSatker, setNewPppkSatker] = useState('UPT Puskesmas Sedau');
  const [newPppkUnor, setNewPppkUnor] = useState('UPT Puskesmas Sedau');
  const [newPppkBknJabatan, setNewPppkBknJabatan] = useState('');
  const [newPppkBknGolongan, setNewPppkBknGolongan] = useState('IX');

  // === Detail Inputs for PKWT / Non-ASN ===
  const [newNik, setNewNik] = useState('');
  const [newPkwtTmtSk, setNewPkwtTmtSk] = useState('');
  const [newPkwtNoSkKontrak, setNewPkwtNoSkKontrak] = useState('');
  const [newPkwtTglSkKontrak, setNewPkwtTglSkKontrak] = useState('');
  const [newPkwtMasaKerja, setNewPkwtMasaKerja] = useState('');
  const [newPkwtPembiayaan, setNewPkwtPembiayaan] = useState<'APBD' | 'BLUD' | 'APBN'>('BLUD');
  const [newPkwtJabatan, setNewPkwtJabatan] = useState('');
  const [newSisaCuti, setNewSisaCuti] = useState(12);

  // === STR & SIP Fields ===
  const [newNoStr, setNewNoStr] = useState('');
  const [newTanggalTerbitStr, setNewTanggalTerbitStr] = useState('');
  const [newTanggalAkhirStr, setNewTanggalAkhirStr] = useState('');
  const [newIsStrSeumurHidup, setNewIsStrSeumurHidup] = useState(false);
  const [newNoSip, setNewNoSip] = useState('');
  const [newTanggalTerbitSip, setNewTanggalTerbitSip] = useState('');
  const [newTanggalAkhirSip, setNewTanggalAkhirSip] = useState('');

  // Auto-update Pangkat Nama & Jenis Kenaikan Pangkat for PNS when Golongan changes
  useEffect(() => {
    if (newStatusDetail === 'PNS') {
      const mappedPangkat = GOLONGAN_TO_PANGKAT[newGolongan];
      if (mappedPangkat) {
        setNewPangkatNama(mappedPangkat);
      }
      
      const golIndex = LIST_GOLONGAN_PNS.indexOf(newGolongan);
      const nextGolonganIdx = golIndex !== -1 && golIndex < LIST_GOLONGAN_PNS.length - 1 ? golIndex + 1 : -1;
      if (nextGolonganIdx !== -1) {
        const nextGolongan = LIST_GOLONGAN_PNS[nextGolonganIdx];
        const nextPangkat = GOLONGAN_TO_PANGKAT[nextGolongan];
        setNewPnsJenisKenaikanPangkat(`Kenaikan Pangkat ke ${nextGolongan} (${nextPangkat})`);
      } else {
        setNewPnsJenisKenaikanPangkat('-');
      }
    }
  }, [newGolongan, newStatusDetail]);

  const resetAddEmployeeForm = () => {
    setNewNip('');
    setNewNama('');
    setNewGelar('');
    setNewGender('L');
    setNewStatusDetail('PNS');
    setNewJenisPegawai('Jafung_Kesehatan');
    setNewProfesiId(1);
    setNewGolongan('III/a');
    setNewTanggalLahir('1990-01-01');
    setNewUnitId(currentRole === 'admin_puskesmas' ? (selectedPuskesmasId || 1) : 100);
    
    setNewPangkatNama('Penata Muda');
    setNewPnsJenisKenaikanPangkat('Pilihan (Jabatan Fungsional Tertentu)');
    setNewPnsMasaKerjaGolongan('04 tahun 02 bulan');
    setNewPnsTmtGolongan('2025-04-01');
    setNewPnsNoPertekBkn('');
    setNewPnsTglPertekBkn('');
    setNewPnsNoSk('');
    setNewPnsTglSk('');
    setNewPnsNamaJabatan('');
    setNewPnsJenisJabatan('Jabatan Fungsional');
    setNewPnsInstansiPembina('Badan Kepegawaian Negara');
    setNewPnsJenisMutasi('Mutasi Jabatan');
    setNewPnsTmtJabatan('');
    setNewPnsInstansiKerja('Pemerintah Kab. Lombok Barat');
    setNewPnsInstansiInduk('Pemerintah Kab. Lombok Barat');
    setNewPnsSatker('UPT Puskesmas Sedau');
    setNewPnsSatkerInduk('Dinas Kesehatan Kab. Lombok Barat');
    setNewPnsUnor('UPT Puskesmas Sedau');
    setNewPnsUnorInduk('UPT Puskesmas Sedau');
    setNewPnsNoSkJabatan('');
    setNewPnsTglSkJabatan('');
    setNewTmtBerkalaTerakhir('2025-01-01');

    setNewPppkNi('');
    setNewPppkNoPerjanjian('');
    setNewPppkTglPerjanjian('');
    setNewPppkTmtPerjanjianMulai('25-Jan-2025');
    setNewPppkTmtPerjanjianSelesai('25-Jan-2030');
    setNewPppkTmtGolongan('');
    setNewPppkNoSk('');
    setNewPppkTglSk('');
    setNewPppkInstansiKerja('Pemerintah Kab. Lombok Barat');
    setNewPppkInstansiInduk('Pemerintah Kab. Lombok Barat');
    setNewPppkSatker('UPT Puskesmas Sedau');
    setNewPppkUnor('UPT Puskesmas Sedau');
    setNewPppkBknJabatan('');
    setNewPppkBknGolongan('IX');

    setNewNik('');
    setNewPkwtTmtSk('');
    setNewPkwtNoSkKontrak('');
    setNewPkwtTglSkKontrak('');
    setNewPkwtMasaKerja('');
    setNewPkwtPembiayaan('BLUD');
    setNewPkwtJabatan('');
    setNewSisaCuti(12);
    setNewNomorWa('+62');

    setNewNoStr('');
    setNewTanggalTerbitStr('');
    setNewTanggalAkhirStr('');
    setNewIsStrSeumurHidup(false);
    setNewNoSip('');
    setNewTanggalTerbitSip('');
    setNewTanggalAkhirSip('');

    setExcelPasteText('');
    setExcelParsedPreview([]);
    setExcelImportMessage('');
    setShowAddForm(false);
  };

  // Automatically reset the add employee form on account/role/unit switch
  useEffect(() => {
    resetAddEmployeeForm();
  }, [currentRole, selectedPuskesmasId]);

  // Excel Paste state
  const [excelPasteText, setExcelPasteText] = useState('');
  const [excelParsedPreview, setExcelParsedPreview] = useState<ASNProfile[]>([]);
  const [excelImportMessage, setExcelImportMessage] = useState('');

  // Dynamic branding configurations - using public/icon.svg as requested
  const activeLogoUrl = '/icon.svg';
  const activeFaviconUrl = '/icon.svg';

  // Dynamically synchronize favicon url on body changes
  useEffect(() => {
    if (activeFaviconUrl) {
      try {
        let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.type = 'image/svg+xml';
        link.href = activeFaviconUrl;
      } catch (err) {
        console.log("No favicon bypass", err);
      }
    }
  }, [activeFaviconUrl]);

  // Helpers to persist modified local DB segments
  const updateProfiles = (updated: ASNProfile[]) => {
    saveAndSync({ asnProfiles: updated });
  };

  const handleDeleteEmployee = (id: number, name: string) => {
    setAsnToDelete({ id, name });
  };

  const handleUpdateEmployee = (updatedProfile: ASNProfile) => {
    const updated = dbState.asnProfiles.map(p => p.id === updatedProfile.id ? updatedProfile : p);
    updateProfiles(updated);
    setEditingAsn(null);
    setSuccessToast(`✓ Data pegawai "${updatedProfile.nama_lengkap}" berhasil diperbarui.`);
  };

  const updateUsulanLayanan = (updated: UsulanLayanan[]) => {
    // 1-Time Upload Copier System Framework: copy approved usulan files to main archival repository
    const previousUsulanList = dbState.usulanLayanan || [];
    const newlyCompletedUsulans = (updated || []).filter(u => {
      const prev = previousUsulanList.find(p => p.id === u.id);
      return u.status === 'Selesai' && (!prev || prev.status !== 'Selesai');
    });

    let currentArsip = [...(dbState.arsipKepegawaian || [])];
    let hasNewCopy = false;

    if (newlyCompletedUsulans.length > 0) {
      newlyCompletedUsulans.forEach(usulan => {
        const asn = dbState.asnProfiles.find(a => a.id === usulan.id_asn);
        if (!asn) return;

        const nextId = currentArsip.length > 0 ? Math.max(...currentArsip.map(a => a.id)) + 1 : 1;
        const feature = dbState.fitur.find(f => f.id === usulan.id_fitur);
        const featureName = feature ? feature.nama_fitur : "Layanan SAPA";

        let targetCategory: 'Dasar' | 'Mutasi' | 'Pendidikan' | 'Personal' | 'Kinerja' | 'PPPK_Khusus' | 'PKWT_Khusus' = 'Mutasi';
        if (feature?.slug === 'pencantuman-gelar' || feature?.slug === 'izin-belajar') {
          targetCategory = 'Pendidikan';
        } else if (feature?.slug === 'pensiun' || feature?.slug === 'cuti') {
          targetCategory = 'Personal';
        }

        // Auto-Copy SK file itself
        const isDuplicateSK = currentArsip.some(
          a => a.id_asn === usulan.id_asn && a.nama_berkas === `Surat Keputusan (SK) Final ${featureName}`
        );

        if (!isDuplicateSK) {
          currentArsip.push({
            id: nextId,
            id_asn: usulan.id_asn,
            nama_berkas: `Surat Keputusan (SK) Final ${featureName}`,
            kategori_kelompok: targetCategory,
            file_name: usulan.file_sk_final || `SK_${featureName.replace(/\s+/g, '_')}_Approved.pdf`,
            file_path: "AUTOCRAFT-SYSTEM-APPROVED-SK",
            uploaded_at: new Date().toISOString(),
            source: "Auto-Copy Usulan",
            notes: `Salinan Digital SK Pendukung keluaran UPT Puskesmas Sedau atas usulan #${usulan.id}.`
          });
          hasNewCopy = true;
        }

        // Copy matching documents
        const attachments = dbState.usulanDokumenFile.filter(f => f.id_usulan === usulan.id);
        attachments.forEach((attach) => {
          const matchedDocObj = dbState.dokumen.find(d => d.id === attach.id_dokumen);
          const docName = matchedDocObj ? matchedDocObj.nama_dokumen : "Dokumen Pendukung Usulan";
          
          const isDuplicateAttach = currentArsip.some(
            a => a.id_asn === usulan.id_asn && a.file_name === attach.file_name
          );

          if (!isDuplicateAttach) {
            const nextAttachId = currentArsip.length > 0 ? Math.max(...currentArsip.map(a => a.id)) + 1 : 1;
            
            let attachCat: 'Dasar' | 'Mutasi' | 'Pendidikan' | 'Personal' | 'Kinerja' | 'PPPK_Khusus' | 'PKWT_Khusus' = 'Dasar';
            const normDocName = docName.toLowerCase();
            if (normDocName.includes('skp') || normDocName.includes('prestasi')) {
              attachCat = 'Kinerja';
            } else if (normDocName.includes('pak') || normDocName.includes('angka kredit')) {
              attachCat = 'Kinerja';
            } else if (normDocName.includes('pangkat') || normDocName.includes('riwayat') || normDocName.includes('sk cpns') || normDocName.includes('sk pns')) {
              attachCat = 'Mutasi';
            } else if (normDocName.includes('ijazah') || normDocName.includes('str') || normDocName.includes('sertifikat')) {
              attachCat = 'Pendidikan';
            } else if (normDocName.includes('nikah') || normDocName.includes('keluarga') || normDocName.includes('ktp')) {
              attachCat = 'Personal';
            }

            currentArsip.push({
              id: nextAttachId,
              id_asn: usulan.id_asn,
              nama_berkas: `${docName} (Verifikasi Digital)`,
              kategori_kelompok: attachCat,
              file_name: attach.file_name,
              file_path: attach.file_path,
              uploaded_at: attach.uploaded_at || new Date().toISOString(),
              source: "Auto-Copy Usulan",
              notes: `Dokumen berkas usulan #${usulan.id} terpilih secara otomatis.`
            });
            hasNewCopy = true;
          }
        });
      });
    }

    // --- INTEGRATED IN-APP NOTIFICATION GENERATORS ---
    const newlySubmittedUsulans = (updated || []).filter(u => {
      const prev = previousUsulanList.find(p => p.id === u.id);
      return u.status === 'Menunggu Validasi' && (!prev || prev.status !== 'Menunggu Validasi');
    });

    let currentNotifications = [...(dbState.notifications || [])];
    let hasNewNotification = false;

    if (newlySubmittedUsulans.length > 0) {
      newlySubmittedUsulans.forEach((usulan, idx) => {
        const asn = dbState.asnProfiles.find(a => a.id === usulan.id_asn);
        const feature = dbState.fitur.find(f => f.id === usulan.id_fitur);
        const puskesmas = dbState.puskesmas.find(p => p.id === usulan.id_puskesmas_pengusul);

        const asnName = asn ? asn.nama_lengkap : "Pegawai";
        const featName = feature ? feature.nama_fitur : "Layanan";
        const puskesmasName = puskesmas ? puskesmas.nama_puskesmas : "Puskesmas Pengusul";

        const nextNotifId = currentNotifications.length > 0 ? Math.max(...currentNotifications.map(n => n.id)) + 1 : 1;
        
        // 1. Dinkes central notification
        currentNotifications.unshift({
          id: nextNotifId,
          sender: puskesmasName,
          time: new Date().toISOString(),
          title: "📥 Usulan Layanan Baru Masuk",
          message: `Usulan dari ${puskesmasName} untuk ${asnName} - Fitur: ${featName} berhasil diajukan dan sedang menunggu validasi Anda.`,
          targetRole: "admin_dinkes",
          targetPuskesmasId: null,
          isRead: false
        });

        // 2. Local unit notification (tampil di akun puskesmas masing-masing saat pengajuan)
        currentNotifications.unshift({
          id: nextNotifId + 1,
          sender: "Sistem SAPA",
          time: new Date().toISOString(),
          title: `📤 Pengajuan Layanan Terkirim: ${featName}`,
          message: `Anda baru saja mengajukan layanan ${featName} atas nama ${asnName} (${puskesmasName}). Berkas Anda sedang menunggu verifikasi/validasi Tim Kepegawaian UPT Puskesmas Sedau.`,
          targetRole: "admin_puskesmas",
          targetPuskesmasId: usulan.id_puskesmas_pengusul,
          isRead: false
        });

        hasNewNotification = true;
      });
    }

    // Listen for 'Perbaikan Berkas' changes
    const newlyRejectedUsulans = (updated || []).filter(u => {
      const prev = previousUsulanList.find(p => p.id === u.id);
      return u.status === 'Perbaikan Berkas' && (!prev || prev.status !== 'Perbaikan Berkas');
    });

    if (newlyRejectedUsulans.length > 0) {
      newlyRejectedUsulans.forEach(usulan => {
        const asn = dbState.asnProfiles.find(a => a.id === usulan.id_asn);
        const feature = dbState.fitur.find(f => f.id === usulan.id_fitur);
        
        const asnName = asn ? asn.nama_lengkap : "Pegawai";
        const featName = feature ? feature.nama_fitur : "Layanan";

        const nextNotifId = currentNotifications.length > 0 ? Math.max(...currentNotifications.map(n => n.id)) + 1 : 1;
        currentNotifications.unshift({
          id: nextNotifId,
          sender: "UPT Puskesmas Sedau",
          time: new Date().toISOString(),
          title: `⚠️ Perbaikan Berkas: ${featName}`,
          message: `Berkas usulan untuk ${asnName} dikembalikan oleh Tim Kepegawaian untuk diperbaiki. Catatan: "${usulan.catatan_perbaikan || 'Periksa kelengkapan dokumen yang diunggah.'}"`,
          targetRole: "admin_puskesmas",
          targetPuskesmasId: usulan.id_puskesmas_pengusul,
          isRead: false
        });
        hasNewNotification = true;
      });
    }

    // Listen for completion (Selesai status)
    if (newlyCompletedUsulans.length > 0) {
      newlyCompletedUsulans.forEach(usulan => {
        const asn = dbState.asnProfiles.find(a => a.id === usulan.id_asn);
        const feature = dbState.fitur.find(f => f.id === usulan.id_fitur);
        
        const asnName = asn ? asn.nama_lengkap : "Pegawai";
        const featName = feature ? feature.nama_fitur : "Layanan";

        const nextNotifId = currentNotifications.length > 0 ? Math.max(...currentNotifications.map(n => n.id)) + 1 : 1;
        currentNotifications.unshift({
          id: nextNotifId,
          sender: "UPT Puskesmas Sedau",
          time: new Date().toISOString(),
          title: `✅ Usulan Layanan Selesai: ${featName}`,
          message: `Berkas usulan ${featName} atas nama ${asnName} telah berhasil diproses oleh Tim Kepegawaian UPT Puskesmas Sedau dan Surat Keputusan (SK) digital siap diunduh.`,
          targetRole: "admin_puskesmas",
          targetPuskesmasId: usulan.id_puskesmas_pengusul,
          isRead: false
        });
        hasNewNotification = true;
      });
    }

    const nextStateParts: any = { 
      usulanLayanan: updated,
      ...(hasNewCopy ? { arsipKepegawaian: currentArsip } : {}),
      ...(hasNewNotification ? { notifications: currentNotifications } : {})
    };

    saveAndSync(nextStateParts);
  };

  const updateArsipKepegawaian = (updated: any[]) => {
    saveAndSync({ arsipKepegawaian: updated });
  };

  const updateNotifications = (updated: any[]) => {
    saveAndSync({ notifications: updated });
  };

  const updateUsulanDokumenFile = (updated: any[]) => {
    saveAndSync({ usulanDokumenFile: updated });
  };

  const updateRiwayatAk = (updated: RiwayatAngkaKredit[]) => {
    saveAndSync({ riwayatAk: updated });
  };

  const updateLaporanSdmk = (updated: any[]) => {
    saveAndSync({ laporanSdmk: updated });
  };

  const updateProfesiSdmk = (updated: any[]) => {
    saveAndSync({ profesiSdmk: updated });
  };

  // Reset database state back to original initial seeds helper
  const handleResetDatabase = () => {
    if (confirm("⚠️ Apakah Anda yakin ingin menyetel ulang database SAPA ke data bawaan awal? Seluruh riwayat usulan baru, user kustom, dan perubahan branding visual akan dikembalikan.")) {
      localStorage.clear();
      initializeDB();
      const fresh = getDB();
      setDbState(fresh);
      setCurrentUser(null); // Clear active user to return to login screen
      setActiveTab('dasbor');
      setSelectedPuskesmasId(1);
      setCurrentRole('admin_dinkes');
      alert("✓ Database berhasil disetel ulang!");
    }
  };

  const handleNavigateToServiceDirectly = (asnId: number, fiturslug: string) => {
    setNavAsnId(asnId);
    setNavSlug(fiturslug);
    setActiveTab('layanan-kepegawaian');
  };

  const getPuskesmasName = (id: number) => {
    return dbState.puskesmas.find(p => p.id === id)?.nama_puskesmas || `Unit #${id}`;
  };

  // Visibility filters for ASNs (Multi-Tenant boundary enforcement)
  const visibleAsnRoster = currentRole === 'admin_dinkes'
    ? dbState.asnProfiles // Dinkes sees EVERYTHING real-time across all clinics & dinkes itself
    : dbState.asnProfiles.filter(p => p.id_puskesmas === selectedPuskesmasId); // Puskesmas sees only their own!

  const filteredRoster = visibleAsnRoster.filter(p => {
    // 1) Search filter
    const term = rosterSearch.toLowerCase();
    const matchesSearch = p.nama_lengkap.toLowerCase().includes(term) || p.nip.includes(term) || (p.jenjang_jafung && p.jenjang_jafung.toLowerCase().includes(term));
    if (!matchesSearch) return false;

    // 2) Unit filter (only applicable for Dinkes Admin who sees multiple)
    if (currentRole === 'admin_dinkes' && rosterUnitFilter !== 'ALL') {
      if (p.id_puskesmas !== Number(rosterUnitFilter)) return false;
    }

    // 3) Employee Status filter
    if (rosterStatusFilter !== 'ALL') {
      if (p.status_pegawai_detail !== rosterStatusFilter) return false;
    }

    // 4) Sub-Jenis Jabatan SDMK Filter
    if (rosterSubJenisJabatanFilter !== 'ALL') {
      const profId = p.id_profesi || getFallbackProfesiId(p.nama_lengkap, p.gelar_belakang);
      const mappedGroup = SUB_JENIS_JABATAN_MAP[rosterSubJenisJabatanFilter];
      if (mappedGroup && !mappedGroup.ids.includes(profId)) {
        return false;
      }
    }

    return true;
  });

  // Handle adding employee manual form submission (Puskesmas or Dinkes)
  const handleAddEmployeeManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNik || newNik.length !== 16) {
      alert("Harap lengkapi 16 digit Nomor Induk Kependudukan (NIK) pegawai!");
      return;
    }
    if (!newNama) {
      alert("Harap lengkapi nama pegawai!");
      return;
    }
    if (newStatusDetail !== 'Non_ASN' && !newNip) {
      alert("Harap lengkapi NIP pegawai!");
      return;
    }

    // Assign unit kerja automatically depending on acting role tenancy
    const finalUnitId = currentRole === 'admin_puskesmas' ? (selectedPuskesmasId || 1) : newUnitId;

    const nextId = dbState.asnProfiles.length > 0 ? Math.max(...dbState.asnProfiles.map(u => u.id)) + 1 : 1;
    const newPegawai: ASNProfile = {
      id: nextId,
      nip: newStatusDetail === 'Non_ASN' ? newNik : newNip,
      nama_lengkap: newNama,
      gelar_belakang: newGelar || null,
      id_puskesmas: finalUnitId,
      tanggal_lahir: newTanggalLahir,
      golongan_ruang: newStatusDetail === 'Non_ASN' ? '-' : newGolongan,
      tmt_pangkat_terakhir: newStatusDetail === 'PNS' ? newPnsTmtGolongan : '2025-01-01',
      tmt_berkala_terakhir: newStatusDetail === 'PNS' ? newTmtBerkalaTerakhir : '2025-01-01',
      tmt_jabatan_terakhir: newStatusDetail === 'PNS' ? newPnsTmtJabatan : '2025-01-01',
      jenis_pegawai: newJenisPegawai,
      id_profesi: newProfesiId,
      jenjang_jafung: newJenisPegawai === 'Jafung_Kesehatan' ? 'Ahli Pertama' : null,
      ak_integrasi_2022: 0,
      sisa_cuti_tahunan: newStatusDetail === 'Non_ASN' ? 0 : newSisaCuti,
      status_kepegawaian: 'Aktif',
      jenis_kelamin: newGender,
      status_pegawai_detail: newStatusDetail,
      nomor_wa: newNomorWa,
      nik: newNik,

      // PNS Detailed Values
      pangkat_nama: newStatusDetail === 'PNS' ? newPangkatNama : undefined,
      pns_jenis_kenaikan_pangkat: newStatusDetail === 'PNS' ? newPnsJenisKenaikanPangkat : undefined,
      pns_masa_kerja_golongan: newStatusDetail === 'PNS' ? newPnsMasaKerjaGolongan : undefined,
      pns_tmt_golongan: newStatusDetail === 'PNS' ? newPnsTmtGolongan : undefined,
      pns_no_pertek_bkn: newStatusDetail === 'PNS' ? newPnsNoPertekBkn : undefined,
      pns_tgl_pertek_bkn: newStatusDetail === 'PNS' ? newPnsTglPertekBkn : undefined,
      pns_no_sk: newStatusDetail === 'PNS' ? newPnsNoSk : undefined,
      pns_tgl_sk: newStatusDetail === 'PNS' ? newPnsTglSk : undefined,
      pns_nama_jabatan: newStatusDetail === 'PNS' ? (newPnsNamaJabatan || newPnsNamaJabatan) : undefined,
      pns_jenis_jabatan: newStatusDetail === 'PNS' ? newPnsJenisJabatan : undefined,
      pns_jenis_mutasi: newStatusDetail === 'PNS' ? newPnsJenisMutasi : undefined,
      pns_tmt_jabatan: newStatusDetail === 'PNS' ? newPnsTmtJabatan : undefined,
      pns_instansi_kerja: newStatusDetail === 'PNS' ? newPnsInstansiKerja : undefined,
      pns_instansi_induk: newStatusDetail === 'PNS' ? newPnsInstansiInduk : undefined,
      pns_satker: newStatusDetail === 'PNS' ? newPnsSatker : undefined,
      pns_satker_induk: newStatusDetail === 'PNS' ? newPnsSatkerInduk : undefined,
      pns_unor: newStatusDetail === 'PNS' ? getPuskesmasName(finalUnitId) : undefined,
      pns_unor_induk: newStatusDetail === 'PNS' ? getPuskesmasName(finalUnitId) : undefined,
      pns_no_sk_jabatan: newStatusDetail === 'PNS' ? newPnsNoSkJabatan : undefined,
      pns_tgl_sk_jabatan: newStatusDetail === 'PNS' ? newPnsTglSkJabatan : undefined,
      pns_instansi_pembina: newStatusDetail === 'PNS' ? newPnsInstansiPembina : undefined,
 
      // PPPK Detailed Values (Penuh / Paruh)
      pppk_ni: (newStatusDetail === 'PPPK_Penuh_Waktu' || newStatusDetail === 'PPPK_Paruh_Waktu') ? newNip : undefined,
      pppk_no_perjanjian: (newStatusDetail === 'PPPK_Penuh_Waktu' || newStatusDetail === 'PPPK_Paruh_Waktu') ? newPppkNoPerjanjian : undefined,
      pppk_tgl_perjanjian: (newStatusDetail === 'PPPK_Penuh_Waktu' || newStatusDetail === 'PPPK_Paruh_Waktu') ? newPppkTglPerjanjian : undefined,
      pppk_tmt_perjanjian_mulai: (newStatusDetail === 'PPPK_Penuh_Waktu' || newStatusDetail === 'PPPK_Paruh_Waktu') ? newPppkTmtPerjanjianMulai : undefined,
      pppk_tmt_perjanjian_selesai: (newStatusDetail === 'PPPK_Penuh_Waktu' || newStatusDetail === 'PPPK_Paruh_Waktu') ? newPppkTmtPerjanjianSelesai : undefined,
      pppk_tmt_golongan: (newStatusDetail === 'PPPK_Penuh_Waktu' || newStatusDetail === 'PPPK_Paruh_Waktu') ? newPppkTmtGolongan : undefined,
      pppk_no_sk: (newStatusDetail === 'PPPK_Penuh_Waktu' || newStatusDetail === 'PPPK_Paruh_Waktu') ? newPppkNoSk : undefined,
      pppk_tgl_sk: (newStatusDetail === 'PPPK_Penuh_Waktu' || newStatusDetail === 'PPPK_Paruh_Waktu') ? newPppkTglSk : undefined,
      pppk_instansi_kerja: (newStatusDetail === 'PPPK_Penuh_Waktu' || newStatusDetail === 'PPPK_Paruh_Waktu') ? newPppkInstansiKerja : undefined,
      pppk_instansi_induk: (newStatusDetail === 'PPPK_Penuh_Waktu' || newStatusDetail === 'PPPK_Paruh_Waktu') ? newPppkInstansiInduk : undefined,
      pppk_satker: (newStatusDetail === 'PPPK_Penuh_Waktu' || newStatusDetail === 'PPPK_Paruh_Waktu') ? newPppkSatker : undefined,
      pppk_unor: (newStatusDetail === 'PPPK_Penuh_Waktu' || newStatusDetail === 'PPPK_Paruh_Waktu') ? getPuskesmasName(finalUnitId) : undefined,
      pppk_jabatan: (newStatusDetail === 'PPPK_Penuh_Waktu' || newStatusDetail === 'PPPK_Paruh_Waktu') ? newPppkBknJabatan : undefined,
      pppk_golongan: (newStatusDetail === 'PPPK_Penuh_Waktu' || newStatusDetail === 'PPPK_Paruh_Waktu') ? newPppkBknGolongan : undefined,
 
      // PKWT Detailed Values
      pkwt_tmt_sk: newStatusDetail === 'Non_ASN' ? newPkwtTmtSk : undefined,
      pkwt_no_sk_kontrak: newStatusDetail === 'Non_ASN' ? newPkwtNoSkKontrak : undefined,
      pkwt_tgl_sk_kontrak: newStatusDetail === 'Non_ASN' ? newPkwtTglSkKontrak : undefined,
      pkwt_masa_kerja: newStatusDetail === 'Non_ASN' ? newPkwtMasaKerja : undefined,
      pkwt_pembiayaan: newStatusDetail === 'Non_ASN' ? newPkwtPembiayaan : undefined,
      pkwt_jabatan: newStatusDetail === 'Non_ASN' ? newPkwtJabatan : undefined,
 
      // STR & SIP Fields
      no_str: newJenisPegawai === 'Jafung_Kesehatan' ? (newNoStr || undefined) : undefined,
      tanggal_terbit_str: newJenisPegawai === 'Jafung_Kesehatan' ? (newTanggalTerbitStr || undefined) : undefined,
      tanggal_akhir_str: newJenisPegawai === 'Jafung_Kesehatan' ? (newIsStrSeumurHidup ? 'Seumur Hidup' : (newTanggalAkhirStr || undefined)) : undefined,
      is_str_seumur_hidup: newJenisPegawai === 'Jafung_Kesehatan' ? newIsStrSeumurHidup : false,
      no_sip: newJenisPegawai === 'Jafung_Kesehatan' ? (newNoSip || undefined) : undefined,
      tanggal_terbit_sip: newJenisPegawai === 'Jafung_Kesehatan' ? (newTanggalTerbitSip || undefined) : undefined,
      tanggal_akhir_sip: newJenisPegawai === 'Jafung_Kesehatan' ? (newTanggalAkhirSip || undefined) : undefined
    };
 
    const nextList = [...dbState.asnProfiles, newPegawai];
    updateProfiles(nextList);
 
    // reset forms
    resetAddEmployeeForm();
    setShowAddForm(false);
    alert(`✓ Pegawai "${newNama}" (${newStatusDetail}) berhasil disimpan ke database unit ${getPuskesmasName(finalUnitId)}`);
  };

  // Trigger on-the-fly binary XLSX generation
  const downloadExcelTemplate = () => {
    try {
      const headers = [
        "NIP (Wajib untuk PNS/PPPK)",
        "NIK (Nomor Induk Kependudukan - Wajib 16 Digit)",
        "Nama Lengkap (Tanpa Gelar)",
        "Gelar Belakang (Misalnya: amd.kep, s.kep, dr)",
        "Jenis Kelamin (L/P)",
        "Status Pegawai (PNS / PPPK Penuh Waktu / PPPK Paruh Waktu / Non ASN)",
        "Rumpun Jabatan (Struktural / Jafung Kesehatan / Staf Umum)",
        "Rumpun Profesi SDMK (contoh: Perawat, Dokter, Bidan, Apoteker, Umum & Kepeg)",
        "Nomor WhatsApp Aktif (contoh: 81234567890)",
        "Golongan Ruang (contoh: III/a, Golongan IX, dll)",
        "Tanggal Lahir (Format: YYYY-MM-DD)",
        "Sisa Cuti Tahunan (contoh: 12)",
        "Nomor STR (Optional untuk Jafung Kesehatan)",
        "Tanggal Terbit STR (Format: YYYY-MM-DD. Optional)",
        "Tanggal Akhir STR (Format: YYYY-MM-DD atau Seumur Hidup. Optional)",
        "Nomor SIP (Optional untuk Jafung Kesehatan)",
        "Tanggal Terbit SIP (Format: YYYY-MM-DD. Optional)",
        "Tanggal Akhir SIP (Format: YYYY-MM-DD. Optional)"
      ];
      
      const sampleRows = [
        [
          "199005122020121004",
          "5201021205900004",
          "Wahyu Darizki",
          "dr.",
          "L",
          "PNS",
          "Jafung Kesehatan",
          "Dokter",
          "81234567890",
          "III/b",
          "1990-05-12",
          "12",
          "STR-123456",
          "2020-05-12",
          "Seumur Hidup",
          "SIP-654321",
          "2021-01-15",
          "2026-01-15"
        ],
        [
          "199508152023212009",
          "5201021508950002",
          "Siti Aminah",
          "Amd.Kep",
          "P",
          "PPPK Penuh Waktu",
          "Jafung Kesehatan",
          "Perawat",
          "81987654321",
          "Golongan IX",
          "1995-08-15",
          "12",
          "",
          "",
          "",
          "",
          "",
          ""
        ],
        [
          "",
          "5201020412990001",
          "Slamet Mulyadi",
          "",
          "L",
          "Non ASN",
          "Staf Umum",
          "Umum & Kepeg",
          "85338884422",
          "-",
          "1999-12-04",
          "0",
          "",
          "",
          "",
          "",
          "",
          ""
        ]
      ];

      const sheetData = [headers, ...sampleRows];
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      
      // Auto-fit column widths
      const wscols = headers.map(h => ({ wch: Math.max(h.length + 3, 14) }));
      ws['!cols'] = wscols;

      // Panduan Pengisian Sheet
      const guideHeaders = ["KANDUNGAN KOLOM", "ATURAN FORMAT / PILIHAN", "CONTOH VALID"];
      const guideRows = [
        ["NIP (Nomor Induk Pegawai)", "NIP 18 Digit untuk PNS/PPPK. Kosongkan jika Non-ASN.", "199005122020121004"],
        ["NIK (Nomor Induk Kependudukan)", "Wajib 16 digit angka kependudukan KTP.", "5201020412990001"],
        ["Nama Lengkap", "Tulis nama lengkap karyawan tanpa gelar belakang.", "Romi Hidayat"],
        ["Gelar Belakang", "Tulis gelar akademik / profesi (Dipisah koma jika lebih dari satu).", "S.Kep, Ners"],
        ["Jenis Kelamin", "Huruf 'L' untuk Laki-Laki, atau 'P' untuk Perempuan.", "L"],
        ["Status Pegawai", "PILIHAN VALID: PNS / PPPK Penuh Waktu / PPPK Paruh Waktu / Non ASN", "PNS / PPPK Penuh Waktu"],
        ["Rumpun Jabatan", "PILIHAN VALID: Struktural / Jafung Kesehatan / Staf Umum", "Jafung Kesehatan"],
        ["Rumpun Profesi SDMK", "PILIHAN VALID: Perawat / Dokter / Dokter Gigi / Bidan / Apoteker / Tenaga Teknik Kefarmasian / Promkes & Ilmu Perilaku / Sanitarian / Nutrisionis / Ahli Teknologi Lab Medik / Rekam Medis / Terapis Gigi & Mulut / Umum & Kepeg / Tenaga Adm. Keuangan / Tenaga Sistem Informasi Kes.", "Dokter"],
        ["Nomor WhatsApp Aktif", "Nomor ponsel aktif WA (angka saja tanpa lambang + , contoh: 81234567890).", "81234567890"],
        ["Golongan Ruang", "PNS: III/a, III/b, IV/a. PPPK: Golongan IX, Golongan VII. Non-ASN: isi '-' saja.", "III/b"],
        ["Tanggal Lahir", "Harus berformat YYYY-MM-DD (Tahun-Bulan-Tanggal) sesuai standar.", "1992-06-25"],
        ["Sisa Cuti Tahunan", "Isi angka sisa cuti (0 s/d 30). Pegawai Non ASN wajib diisi 0.", "12"],
        ["Nomor STR", "Nomor Surat Tanda Registrasi jika ada (Opsional).", "STR-987654"],
        ["Tanggal Terbit STR", "Format YYYY-MM-DD jika ada STR.", "2021-03-22"],
        ["Tanggal Akhir STR", "Format YYYY-MM-DD atau 'Seumur Hidup' jika ada STR.", "Seumur Hidup"],
        ["Nomor SIP", "Nomor Surat Izin Praktik jika ada (Opsional).", "SIP-123/2026"],
        ["Tanggal Terbit SIP", "Format YYYY-MM-DD jika ada SIP.", "2021-04-12"],
        ["Tanggal Akhir SIP", "Format YYYY-MM-DD jika ada SIP.", "2026-04-12"]
      ];

      const wsGuide = XLSX.utils.aoa_to_sheet([["PANDUAN ALUR IMPORT DATA PEGAWAI - SAPA PEGAWAI UPT PUSKESMAS SEDAU"], [], ...[guideHeaders, ...guideRows]]);
      wsGuide['!cols'] = [{ wch: 30 }, { wch: 65 }, { wch: 25 }];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet Template Pegawai");
      XLSX.utils.book_append_sheet(wb, wsGuide, "Petunjuk Pengisian");

      XLSX.writeFile(wb, "Template_SAPA_Pegawai_UPT_Puskesmas_Sedau.xlsx");
      alert("✓ Template Excel (.xlsx) sukses diunduh! Silakan isi lalu unggah kembali.");
    } catch (err: any) {
      console.error(err);
      alert("Terjadi kesalahan meluncurkan unduhan: " + err.message);
    }
  };

  // Parses an uploaded XLSX file using library
  const handleExcelFileSelectXlsx = (file: File) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data) return;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const rawRows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
          
          if (rawRows.length > 1) {
            // Filter header row (usually contains headers)
            const firstCol = String(rawRows[0]?.[0] || "").toLowerCase();
            const startIdx = (firstCol.includes("nip") || firstCol.includes("identitas") || firstCol.includes("nama")) ? 1 : 0;
            
            const dataRows = rawRows.slice(startIdx).filter(r => r && r.length > 0 && r[0] !== undefined && String(r[0]).trim() !== "");
            
            const targetUnit = currentRole === 'admin_puskesmas' ? (selectedPuskesmasId || 1) : newUnitId;
            const parsed: ASNProfile[] = [];
            
            dataRows.forEach((row, index) => {
              const nipVal = row[0] ? String(row[0]).trim() : '';
              const nikVal = row[1] ? String(row[1]).trim().replace(/\D/g, '') : '';
              const nama_lengkap = row[2] ? String(row[2]).trim() : `Staf Excel ${index + 1}`;
              const gelar_belakang = row[3] ? String(row[3]).trim() : null;
              
              const sexValue = String(row[4] || "").trim().toUpperCase();
              const jenis_kelamin = (sexValue.startsWith('L') || sexValue.includes('LAKI')) ? 'L' : 'P';
              
              const statusVal = String(row[5] || "").trim().toUpperCase();
              let status_pegawai_detail: StatusPegawaiDetail = 'PNS';
              if (statusVal.includes('PENUH') || statusVal.includes('P3K_PN') || statusVal.includes('PPPK PENUH')) {
                status_pegawai_detail = 'PPPK_Penuh_Waktu';
              } else if (statusVal.includes('PARUH') || statusVal.includes('P3K_PW') || statusVal.includes('PPPK PARUH')) {
                status_pegawai_detail = 'PPPK_Paruh_Waktu';
              } else if (statusVal.includes('NON') || statusVal.includes('PKWT') || statusVal.includes('KONTRAK') || statusVal.includes('NON ASN')) {
                status_pegawai_detail = 'Non_ASN';
              }
              
              const nip = (status_pegawai_detail === 'Non_ASN' ? nikVal : nipVal) || `GEN-${Date.now()}-${index}`;

              const rumpunVal = String(row[6] || "").trim().toUpperCase();
              let jenis_pegawai: JenisPegawai = 'Jafung_Kesehatan';
              if (rumpunVal.includes('STRUK')) {
                jenis_pegawai = 'Struktural';
              } else if (rumpunVal.includes('UMUM') || rumpunVal.includes('STAF')) {
                jenis_pegawai = 'Staf_Umum';
              }

              const profesiStr = String(row[7] || "").trim().toLowerCase();
              const foundProfesi = dbState.profesiSdmk.find(p => p.nama_profesi.toLowerCase().includes(profesiStr) || profesiStr.includes(p.nama_profesi.toLowerCase()));
              const id_profesi = foundProfesi ? foundProfesi.id : 1;

              let rawWa = row[8] ? String(row[8]).trim() : '';
              const nomor_wa = normalizeIndonesianPhoneNumber(rawWa, true) || '+628123456781';
              
              const golongan_ruang = status_pegawai_detail === 'Non_ASN' ? '-' : (row[9] ? String(row[9]).trim() : 'III/a');
              const tanggal_lahir = row[10] ? String(row[10]).trim() : '1991-05-15';
              const sisa_cuti_tahunan = status_pegawai_detail === 'Non_ASN' ? 0 : (row[11] !== undefined ? Math.max(0, parseInt(row[11]) || 0) : 12);
              
              const no_str = row[12] ? String(row[12]).trim() : undefined;
              const tanggal_terbit_str = row[13] ? String(row[13]).trim() : undefined;
              const tanggal_akhir_str = row[14] ? String(row[14]).trim() : undefined;
              const is_str_seumur_hidup = String(tanggal_akhir_str || "").toLowerCase().includes("seumur") || String(tanggal_akhir_str || "").toLowerCase().includes("hidup");

              const no_sip = row[15] ? String(row[15]).trim() : undefined;
              const tanggal_terbit_sip = row[16] ? String(row[16]).trim() : undefined;
              const tanggal_akhir_sip = row[17] ? String(row[17]).trim() : undefined;

              parsed.push({
                id: Date.now() + index,
                nip,
                nama_lengkap,
                gelar_belakang,
                id_puskesmas: targetUnit,
                tanggal_lahir,
                golongan_ruang,
                tmt_pangkat_terakhir: '2025-01-01',
                tmt_berkala_terakhir: '2025-01-01',
                tmt_jabatan_terakhir: '2025-01-01',
                jenis_pegawai,
                id_profesi,
                jenjang_jafung: jenis_pegawai === 'Jafung_Kesehatan' ? 'Ahli Pertama' : null,
                ak_integrasi_2022: 0,
                sisa_cuti_tahunan,
                status_kepegawaian: 'Aktif',
                jenis_kelamin,
                status_pegawai_detail,
                nomor_wa,
                nik: nikVal,
                pppk_ni: status_pegawai_detail.startsWith('PPPK') ? nip : undefined,
                no_str,
                tanggal_terbit_str,
                tanggal_akhir_str,
                is_str_seumur_hidup,
                no_sip,
                tanggal_terbit_sip,
                tanggal_akhir_sip
              });
            });
            
            setExcelParsedPreview(parsed);
            setExcelImportMessage(`✓ Berhasil mendeteksi ${parsed.length} baris data dari file Excel (.xlsx) siap diimpor.`);
          } else {
            alert("Format baris data Excel kosong!");
          }
        } catch (err: any) {
          alert("Error membaca spreadsheet: " + err.message);
        }
      };
      reader.readAsBinaryString(file);
    } catch (err: any) {
      alert("Gagal membaca file: " + err.message);
    }
  };

  // Parse Excel Clipboard text on value entry
  const handleExcelPasteChange = (text: string) => {
    setExcelPasteText(text);
    if (!text.trim()) {
      setExcelParsedPreview([]);
      setExcelImportMessage('');
      return;
    }

    const rows = text.split('\n').map(row => row.trim()).filter(row => row.length > 0);
    const parsed: ASNProfile[] = [];
    
    // Auto-detect the unit penempatan target
    const targetUnit = currentRole === 'admin_puskesmas' ? (selectedPuskesmasId || 1) : newUnitId;

    rows.forEach((row, index) => {
      // Split by tab (Excel standard paste format) or separators
      let cols = row.split('\t');
      if (cols.length < 3) cols = row.split(';');
      if (cols.length < 3) cols = row.split(',');

      // If this is the header row, skip it
      if (cols[0] && (cols[0].toLowerCase().includes('nip') || cols[0].toLowerCase().includes('identitas') || cols[1]?.toLowerCase().includes('nama lengkap'))) {
        return;
      }

      if (cols.length >= 2) {
        const nipVal = cols[0]?.trim() || '';
        const nikVal = cols[1]?.trim()?.replace(/\D/g, '') || '';
        const nama_lengkap = cols[2]?.trim() || `Staf Excel ${index + 1}`;
        const gelar_belakang = cols[3]?.trim() || null;
        
        let genCol = cols[4]?.trim()?.toUpperCase() || 'L';
        const jenis_kelamin = (genCol.startsWith('L') || genCol.includes('LAKI')) ? 'L' : 'P';
        
        let statusCol = cols[5]?.trim() || 'PNS';
        let status_pegawai_detail: StatusPegawaiDetail = 'PNS';
        if (statusCol.toLowerCase().includes('penuh') || statusCol.toUpperCase().includes('PPPK_PENUH') || statusCol.toUpperCase().includes('PPPK PENUH')) {
          status_pegawai_detail = 'PPPK_Penuh_Waktu';
        } else if (statusCol.toLowerCase().includes('paruh') || statusCol.toUpperCase().includes('PPPK_PARUH') || statusCol.toUpperCase().includes('PPPK PARUH')) {
          status_pegawai_detail = 'PPPK_Paruh_Waktu';
        } else if (statusCol.toLowerCase().includes('non') || statusCol.toLowerCase().includes('pkwt') || statusCol.toLowerCase().includes('kontrak') || statusCol.toLowerCase().includes('non asn')) {
          status_pegawai_detail = 'Non_ASN';
        }

        const nip = (status_pegawai_detail === 'Non_ASN' ? nikVal : nipVal) || `GEN-${Date.now()}-${index}`;

        let jenisCol = cols[6]?.trim() || 'Jafung_Kesehatan';
        let jenis_pegawai: JenisPegawai = 'Jafung_Kesehatan';
        if (jenisCol.toLowerCase().includes('struk')) {
          jenis_pegawai = 'Struktural';
        } else if (jenisCol.toLowerCase().includes('umum') || jenisCol.toLowerCase().includes('staf')) {
          jenis_pegawai = 'Staf_Umum';
        }

        const profesiStr = cols[7]?.trim()?.toLowerCase() || '';
        const foundProfesi = dbState.profesiSdmk.find(p => p.nama_profesi.toLowerCase().includes(profesiStr) || profesiStr.includes(p.nama_profesi.toLowerCase()));
        const id_profesi = foundProfesi ? foundProfesi.id : 1;

        let rawWa = cols[8]?.trim() || '';
        if (!rawWa.startsWith('+62')) {
          rawWa = rawWa.replace(/\D/g, '');
          if (rawWa.startsWith('62')) {
            rawWa = '+' + rawWa;
          } else if (rawWa.startsWith('0')) {
            rawWa = '+62' + rawWa.substring(1);
          } else if (rawWa) {
            rawWa = '+62' + rawWa;
          } else {
            rawWa = '+62';
          }
        }
        const nomor_wa = rawWa;

        const golongan_ruang = status_pegawai_detail === 'Non_ASN' ? '-' : (cols[9]?.trim() || 'III/a');
        const tanggal_lahir = cols[10]?.trim() || '1991-05-15';
        const sisa_cuti_tahunan = status_pegawai_detail === 'Non_ASN' ? 0 : (parseInt(cols[11]?.trim() || '12') || 12);

        const no_str = cols[12]?.trim() || undefined;
        const tanggal_terbit_str = cols[13]?.trim() || undefined;
        const tanggal_akhir_str = cols[14]?.trim() || undefined;
        const is_str_seumur_hidup = String(tanggal_akhir_str || "").toLowerCase().includes("seumur") || String(tanggal_akhir_str || "").toLowerCase().includes("hidup");

        const no_sip = cols[15]?.trim() || undefined;
        const tanggal_terbit_sip = cols[16]?.trim() || undefined;
        const tanggal_akhir_sip = cols[17]?.trim() || undefined;

        parsed.push({
          id: Date.now() + index, // temporary id
          nip,
          nama_lengkap,
          gelar_belakang,
          id_puskesmas: targetUnit,
          tanggal_lahir,
          golongan_ruang,
          tmt_pangkat_terakhir: '2025-01-01',
          tmt_berkala_terakhir: '2025-01-01',
          tmt_jabatan_terakhir: '2025-01-01',
          jenis_pegawai,
          id_profesi,
          jenjang_jafung: jenis_pegawai === 'Jafung_Kesehatan' ? 'Ahli Pertama' : null,
          ak_integrasi_2022: 0,
          sisa_cuti_tahunan,
          status_kepegawaian: 'Aktif',
          jenis_kelamin,
          status_pegawai_detail,
          nomor_wa,
          nik: nikVal,
          pppk_ni: status_pegawai_detail.startsWith('PPPK') ? nip : undefined,
          no_str,
          tanggal_terbit_str,
          tanggal_akhir_str,
          is_str_seumur_hidup,
          no_sip,
          tanggal_terbit_sip,
          tanggal_akhir_sip,
        });
      }
    });

    setExcelParsedPreview(parsed);
    setExcelImportMessage(`✓ Berhasil mendeteksi ${parsed.length} baris data clipboard Excel siap diimpor.`);
  };

  // Perform bulk merge action
  const handleSaveBulkExcelImport = () => {
    if (excelParsedPreview.length === 0) return;

    // Allocate valid sequential IDs
    let currentMaxId = dbState.asnProfiles.length > 0 ? Math.max(...dbState.asnProfiles.map(u => u.id)) : 10;
    const finalAsns = excelParsedPreview.map((item, idx) => ({
      ...item,
      id: currentMaxId + 1 + idx
    }));

    const nextList = [...dbState.asnProfiles, ...finalAsns];
    updateProfiles(nextList);

    setExcelPasteText('');
    setExcelParsedPreview([]);
    setExcelImportMessage('');
    setShowAddForm(false);
    alert(`✨ Sukses! ${finalAsns.length} data pegawai baru berhasil diimpor & disimpan ke database SAPA pegawai UPT Puskesmas Sedau.`);
  };

  // --- IN-APP NOTIFICATION CENTER CONTROL LOGIC ---
  const actingNotifications = (dbState.notifications || []).filter(n => {
    if (currentRole === 'admin_dinkes') {
      return n.targetRole === 'admin_dinkes';
    } else {
      return n.targetRole === 'admin_puskesmas' && n.targetPuskesmasId === selectedPuskesmasId;
    }
  });

  const unreadCount = actingNotifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = (id: number) => {
    const updated = (dbState.notifications || []).map(n => {
      if (n.id === id) {
        return { ...n, isRead: true };
      }
      return n;
    });
    updateNotifications(updated);
  };

  const handleMarkAllAsRead = () => {
    const updated = (dbState.notifications || []).map(n => {
      const matchRole = currentRole === 'admin_dinkes' 
        ? n.targetRole === 'admin_dinkes' 
        : (n.targetRole === 'admin_puskesmas' && n.targetPuskesmasId === selectedPuskesmasId);
      if (matchRole) {
        return { ...n, isRead: true };
      }
      return n;
    });
    updateNotifications(updated);
    alert("✓ Semua notifikasi instan bertanda telah dibaca!");
  };

  if (isLoadingDatabase) {
    return (
      <div id="loading-database-view" className="min-h-screen bg-[#0f1115] flex flex-col items-center justify-center text-white font-sans p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="relative flex justify-center">
            <div className="h-16 w-16 rounded-full border-4 border-amber-500/20 border-t-amber-500 animate-spin" />
            <Database size={24} className="text-amber-400 absolute top-5 animate-bounce" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold font-display tracking-wide uppercase">Sistem SAPA pegawai UPT Puskesmas Sedau</h3>
            <p className="text-xs text-slate-400 font-mono">{databaseStatus}</p>
          </div>
          <div className="p-4 bg-slate-950/80 border border-white/5 rounded-2xl">
            <p className="text-[10px] text-amber-400 font-mono text-center">Menghubungkan langsung ke cloud database Cloudflare D1 (sapa_pegawai)...</p>
          </div>
        </div>
      </div>
    );
  }

  // Display beautiful login page if not authenticated
  if (!currentUser) {
    return (
      <>
        <LoginView
          dbState={dbState}
          onLogin={(user) => {
            setCurrentUser(user);
            localStorage.setItem('simpeg_current_user', JSON.stringify(user));
            setCurrentRole(user.role);
            setSelectedPuskesmasId(user.id_puskesmas || 1);
            if (user.role === 'admin_dinkes') {
              setRosterUnitFilter(100);
            } else {
              setRosterUnitFilter('ALL');
            }
            setSuccessToast(`Selamat datang kembali, ${user.nama_lengkap}!`);
          }}
          onReset={handleResetDatabase}
        />
        {/* Render Success Toast if present on Login screen */}
        {successToast && (
          <div className="fixed bottom-5 right-5 z-80 bg-white border-l-4 border-emerald-500 text-slate-800 p-4 rounded-xl shadow-2xl flex items-center justify-between border border-slate-100 max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center space-x-2.5">
              <span className="text-emerald-500 font-extrabold text-sm">&#10003;</span>
              <p className="text-xs font-semibold leading-relaxed">
                {successToast}
              </p>
            </div>
            <button onClick={() => setSuccessToast(null)} className="text-slate-400 hover:text-slate-800 text-xs font-bold pl-2 cursor-pointer">&times;</button>
          </div>
        )}
      </>
    );
  }

  return (
    <div id="simpeg-rootbox" className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      
      {/* Top Professional Header Bar */}
      <header className="bg-white/95 backdrop-blur-md border-b border-emerald-100/80 sticky top-0 z-40 shadow-xs transition-all w-full">
        <div className="w-full px-3 sm:px-6 md:px-8 py-2.5 sm:py-3 flex flex-wrap md:flex-nowrap items-center justify-between gap-3 sm:gap-4">
          
          {/* Logo Brand with custom dynamic logo config & responsive typography */}
          <div className="flex items-center space-x-3 min-w-0 flex-1 sm:flex-initial">
            {/* Mobile Sidebar Hamburger Toggle Button directly integrated into Header */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(prev => !prev)}
              className="lg:hidden p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100 transition-colors cursor-pointer shrink-0"
              title={isSidebarOpen ? "Tutup Sidebar Navigasi" : "Buka Sidebar Navigasi"}
              aria-label="Toggle Menu Navigasi"
            >
              <Menu size={18} />
            </button>

            <div className="p-1 sm:p-1.5 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-amber-50/40 rounded-xl sm:rounded-2xl border border-emerald-200/70 shrink-0 shadow-xs flex items-center justify-center">
              <img 
                src={activeLogoUrl} 
                alt="Brand logo" 
                className="h-9 w-9 sm:h-11 sm:w-11 object-contain drop-shadow-xs"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.onerror = null;
                  target.src = '/icon.svg';
                }}
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-sm font-display font-extrabold text-slate-900 uppercase tracking-wide flex items-center gap-1.5 flex-wrap leading-tight">
                <span className="truncate bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 bg-clip-text text-transparent">
                  SAPA pegawai UPT Puskesmas Sedau
                </span>
                <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-300/80 px-2 py-0.5 rounded-full uppercase tracking-wider shadow-2xs shrink-0">
                  Lobar
                </span>
              </h1>
              <p className="text-[9px] sm:text-[10px] text-slate-500 font-medium truncate mt-0.5 max-w-[280px] sm:max-w-md lg:max-w-xl">
                Sistem Arsip, Pemberitahuan, & Analisis Kepegawaian UPT Puskesmas Sedau Kab. Lombok Barat
              </p>
            </div>
          </div>

          {/* Right Header Panel with active user profile & In-App Notifications */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto relative">
            
            {currentUser && (
              <div 
                id="user-profile-badge-card" 
                className="border border-emerald-700/40 px-2 sm:px-3 py-1.5 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 shadow-sm"
              >
                <div className="flex items-center space-x-2">
                  <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl bg-gradient-to-tr from-emerald-400 to-teal-300 font-black text-slate-950 flex items-center justify-center text-xs sm:text-sm uppercase shadow-xs shrink-0 border border-emerald-200/50">
                    <span className="text-slate-950 font-black" style={{ color: '#022c22' }}>
                      {currentUser.nama_lengkap ? currentUser.nama_lengkap.charAt(0) : 'U'}
                    </span>
                  </div>
                  <div className="text-left leading-tight hidden sm:block max-w-[130px] md:max-w-[180px] lg:max-w-[220px]">
                    <p className="text-[11px] sm:text-[12px] font-black text-white truncate" style={{ color: '#ffffff' }} title={currentUser.nama_lengkap}>
                      {currentUser.nama_lengkap}
                    </p>
                    <p className="text-[9px] sm:text-[9.5px] font-bold text-amber-300 font-mono mt-0.5 truncate" style={{ color: '#fde047' }}>
                      {currentUser.role === 'admin_dinkes' ? 'Admin Utama (UPT Puskesmas Sedau)' : getPuskesmasName(currentUser.id_puskesmas)}
                    </p>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  onClick={() => {
                    setCurrentUser(null);
                    localStorage.removeItem('simpeg_current_user');
                    setCurrentRole('admin_dinkes');
                    setSelectedPuskesmasId(1);
                    setActiveTab('dasbor');
                    setSuccessToast("Anda telah keluar dari sistem.");
                  }}
                  className="px-2 sm:px-2.5 py-1.5 bg-white/20 hover:bg-rose-600 text-white rounded-lg sm:rounded-xl text-[9.5px] sm:text-[10px] font-bold transition-all flex items-center space-x-1 sm:space-x-1.5 border border-white/20 hover:border-rose-500 cursor-pointer shadow-2xs"
                  title="Keluar dari Akun"
                >
                  <LogOut size={12} className="shrink-0 text-white" />
                  <span className="hidden xs:inline text-white font-bold" style={{ color: '#ffffff' }}>Keluar</span>
                </button>
              </div>
            )}

            {/* In-App Notification Center Icon & dropdown */}
            <div className="relative">
              <button
                ref={notificationButtonRef}
                onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                className={`relative p-2 sm:p-2.5 rounded-xl sm:rounded-2xl border transition-all flex items-center justify-center cursor-pointer shadow-xs ${
                  showNotificationsDropdown 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-400/20' 
                    : 'bg-white border-slate-200 text-slate-600 hover:text-emerald-800 hover:border-emerald-300 hover:bg-emerald-50/50'
                }`}
                title="Pusat Notifikasi SAPA"
                id="header-notification-bell-btn"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span id="unread-count-badge" className="absolute -top-1 -right-1 h-4 w-4 sm:h-4.5 sm:w-4.5 bg-rose-500 font-extrabold text-[8.5px] sm:text-[9px] text-white flex items-center justify-center rounded-full animate-bounce shadow-xs ring-2 ring-white">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotificationsDropdown && (
                <div 
                  ref={notificationDropdownRef}
                  id="notification-center-dropdown" 
                  className="absolute right-0 mt-3.5 w-80 sm:w-[360px] bg-white border border-slate-200 rounded-2xl shadow-xl z-55 overflow-hidden animate-in fade-in slide-in-from-top-3 duration-200"
                >
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                        <Bell size={13} className="text-teal-600" />
                        <span>Pusat Notifikasi ({unreadCount} baru)</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium">Acting: {currentRole === 'admin_dinkes' ? 'UPT Puskesmas Sedau' : getPuskesmasName(selectedPuskesmasId)}</p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer opacity-80"
                      >
                        Tandai Semua Dibaca
                      </button>
                    )}
                  </div>

                  {/* Dynamic PWA Notification Permission Controller Panel */}
                  <div className="px-4 py-2.5 bg-gradient-to-r from-teal-50 to-emerald-50 border-b border-teal-100/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <span className="flex h-2 w-2 relative">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${notifPermission === 'granted' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${notifPermission === 'granted' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                      </span>
                      <span className="text-[10px] font-semibold text-slate-700">
                        {notifPermission === 'granted' ? 'Notifikasi HP & Desktop: Aktif' : 'Notifikasi HP & Desktop: Nonaktif'}
                      </span>
                    </div>
                    {notifPermission !== 'granted' ? (
                      <button
                        onClick={requestNotificationPermission}
                        className="px-2 py-1 bg-teal-700 hover:bg-teal-800 text-white font-extrabold rounded text-[9px] uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                      >
                        Aktifkan Sekarang 🔔
                      </button>
                    ) : (
                      <button
                        onClick={() => triggerNativeNotification("🎉 Tes Notifikasi Berhasil!", "Ini adalah tes simulasi notifikasi PWA langsung di perangkat mobile dan desktop Anda.")}
                        className="px-2 py-1 bg-[#16161a] hover:bg-black text-slate-300 hover:text-white font-bold rounded text-[9px] transition-all cursor-pointer border border-white/5"
                      >
                        Uji Notifikasi ⚡
                      </button>
                    )}
                  </div>

                  <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100">
                    {actingNotifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        <Bell size={20} className="mx-auto mb-2 opacity-25 text-slate-500 animate-pulse" />
                        <p className="text-xs">Belum ada notifikasi baru untuk unit Anda.</p>
                      </div>
                    ) : (
                      actingNotifications.map((n) => (
                        <div
                          key={n.id}
                          className={`p-3.5 text-xs transition duration-150 flex gap-2.5 ${n.isRead ? 'bg-white hover:bg-slate-50' : 'bg-teal-50/40 hover:bg-teal-100/30'}`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {n.title.includes('Selesai') || n.title.includes('✅') ? (
                              <span className="h-2 w-2 rounded-full bg-emerald-500 inline-block block mt-1 animate-ping" />
                            ) : n.title.includes('⚠️') || n.title.includes('Perbaikan') ? (
                              <span className="h-2 w-2 rounded-full bg-amber-500 inline-block block mt-1 animate-pulse" />
                            ) : (
                              <span className="h-2 w-2 rounded-full bg-indigo-500 inline-block block mt-1" />
                            )}
                          </div>
                          
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-[#0f172a] text-[11px] leading-tight block">{n.title}</span>
                              <span className="text-[9px] text-slate-400 font-medium font-mono">
                                {new Date(n.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11.5px] text-slate-500 leading-normal font-medium">{n.message}</p>
                            
                            <div className="flex items-center justify-between pt-1 text-[9px] text-slate-400">
                              <span>Pengirim: <b className="text-slate-600">{n.sender}</b></span>
                              {!n.isRead && (
                                <button
                                  onClick={() => handleMarkAsRead(n.id)}
                                  className="font-bold text-teal-600 hover:text-teal-800 hover:underline cursor-pointer"
                                >
                                  Tandai Dibaca
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </header>

      {/* Primary Workspace Interface Partition */}
      <div className="flex-1 flex flex-col lg:flex-row bg-[#f8fafc] relative">
        
        {/* Mobile Backdrop Overlay when sidebar is open */}
        {isSidebarOpen && (
          <div 
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-200 cursor-pointer"
            aria-hidden="true"
          />
        )}

        {/* Collapsible Left Dark Sidebar Panel with Burger inside Sidebar */}
        <aside 
          className={`
            fixed inset-y-0 left-0 z-50 bg-slate-900 border-r border-slate-800 flex flex-col space-y-5 overflow-y-auto shadow-2xl transition-all duration-300 ease-in-out
            lg:static lg:z-auto lg:h-[calc(100vh-65px)] lg:sticky lg:top-[65px] lg:shadow-lg
            ${isSidebarOpen 
              ? 'translate-x-0 w-72 p-5' 
              : '-translate-x-full lg:translate-x-0 lg:w-16 lg:p-3 w-72 p-5'}
          `}
        >
          {/* Header of Sidebar with Burger Toggle */}
          <div className={`flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'} pb-3 border-b border-slate-300/70`}>
            {isSidebarOpen && (
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
                <p className="text-[11px] font-black uppercase tracking-widest text-black" style={{ color: '#000000' }}>
                  Menu Navigasi
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsSidebarOpen(prev => !prev)}
              className="p-1.5 rounded-lg text-slate-600 hover:text-black hover:bg-slate-200/60 transition-colors border border-slate-300/60 cursor-pointer flex items-center justify-center"
              title={isSidebarOpen ? "Kecilkan Sidebar" : "Lebarkan Sidebar"}
              aria-label={isSidebarOpen ? "Tutup Sidebar Navigasi" : "Buka Sidebar Navigasi"}
            >
              <Menu size={18} className="text-emerald-700" />
            </button>
          </div>

          <div className="space-y-1.5 font-medium flex-grow">
            {/* 1. Dashboard */}
            <button
              onClick={() => handleNavClick('dasbor')}
              title="Dashboard"
              className={`w-full ${isSidebarOpen ? 'text-left px-3.5 py-2.5 space-x-3' : 'justify-center py-2.5'} rounded-xl text-xs flex items-center transition duration-150 cursor-pointer ${
                activeTab === 'dasbor' 
                  ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-300 shadow-xs' 
                  : 'text-slate-700 hover:text-black hover:bg-slate-200/60'
              }`}
            >
              <Bell size={16} className={activeTab === 'dasbor' ? 'text-emerald-700' : 'text-slate-500'} />
              {isSidebarOpen && <span>Dashboard</span>}
            </button>

            {/* 2. Data Pegawai */}
            <button
              onClick={() => handleNavClick('roster-asn')}
              title="Data Pegawai"
              className={`w-full ${isSidebarOpen ? 'text-left px-3.5 py-2.5 space-x-3' : 'justify-center py-2.5'} rounded-xl text-xs flex items-center transition duration-150 cursor-pointer ${
                activeTab === 'roster-asn' 
                  ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-300 shadow-xs' 
                  : 'text-slate-700 hover:text-black hover:bg-slate-200/60'
              }`}
            >
              <Users size={16} className={activeTab === 'roster-asn' ? 'text-emerald-700' : 'text-slate-500'} />
              {isSidebarOpen && <span>Data Pegawai</span>}
            </button>

            {/* 3. Pemantauan ASN */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  if (!isSidebarOpen) {
                    setIsSidebarOpen(true);
                  }
                  if (activeTab !== 'pemantauan-asn') {
                    handlePemantauanNavClick('pangkat');
                  } else {
                    setIsPemantauanAsnOpen(prev => !prev);
                  }
                }}
                title="Pemantauan ASN"
                className={`w-full ${isSidebarOpen ? 'text-left px-3 py-2.5 space-x-2.5' : 'justify-center py-2.5'} rounded-xl text-xs flex items-center transition duration-150 cursor-pointer ${
                  activeTab === 'pemantauan-asn' 
                    ? 'bg-teal-50 text-teal-950 font-bold border border-teal-300 shadow-xs' 
                    : 'text-slate-700 hover:text-black hover:bg-slate-200/60'
                }`}
              >
                <Calendar size={16} className={activeTab === 'pemantauan-asn' ? 'text-teal-700' : 'text-slate-500'} />
                {isSidebarOpen ? (
                  <>
                    <span className="flex-1 text-left font-semibold">Pemantauan ASN</span>
                    <span className="bg-teal-700 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-xs">
                      {pemantauanCounts.total}
                    </span>
                    {isPemantauanAsnOpen ? (
                      <ChevronUp size={15} className="text-teal-800 ml-1" />
                    ) : (
                      <ChevronDown size={15} className="text-slate-500 ml-1" />
                    )}
                  </>
                ) : (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-teal-600 ring-2 ring-slate-100" />
                )}
              </button>

              {/* Sub-menu accordion: 4 Core Modules per KemenPAN-RB */}
              {isSidebarOpen && isPemantauanAsnOpen && (
                <div className="ml-3 pl-3 border-l-2 border-teal-500/40 space-y-1 pt-1 pb-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  {/* Sub-tab 1: Kenaikan Pangkat (PNS) */}
                  <button
                    type="button"
                    onClick={() => handlePemantauanNavClick('pangkat')}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-[11px] flex items-center justify-between transition cursor-pointer ${
                      activeTab === 'pemantauan-asn' && pemantauanSubTab === 'pangkat'
                        ? 'bg-teal-100 text-teal-950 font-bold border border-teal-300 shadow-xs'
                        : 'text-slate-700 hover:text-black hover:bg-slate-200/50'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Award size={14} className={activeTab === 'pemantauan-asn' && pemantauanSubTab === 'pangkat' ? 'text-teal-700' : 'text-slate-500'} />
                      <span className="truncate">Kenaikan Pangkat (PNS)</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-700 text-white ml-1">
                      {pemantauanCounts.pangkat}
                    </span>
                  </button>

                  {/* Sub-tab 2: Jabatan Fungsional (Jafung) */}
                  <button
                    type="button"
                    onClick={() => handlePemantauanNavClick('jafung')}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-[11px] flex items-center justify-between transition cursor-pointer ${
                      activeTab === 'pemantauan-asn' && pemantauanSubTab === 'jafung'
                        ? 'bg-teal-100 text-teal-950 font-bold border border-teal-300 shadow-xs'
                        : 'text-slate-700 hover:text-black hover:bg-slate-200/50'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Briefcase size={14} className={activeTab === 'pemantauan-asn' && pemantauanSubTab === 'jafung' ? 'text-teal-700' : 'text-slate-500'} />
                      <span className="truncate">Jabatan Fungsional (Jafung)</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-800 ml-1">
                      {pemantauanCounts.jafung}
                    </span>
                  </button>

                  {/* Sub-tab 3: KGB Gaji Berkala */}
                  <button
                    type="button"
                    onClick={() => handlePemantauanNavClick('kgb')}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-[11px] flex items-center justify-between transition cursor-pointer ${
                      activeTab === 'pemantauan-asn' && pemantauanSubTab === 'kgb'
                        ? 'bg-teal-100 text-teal-950 font-bold border border-teal-300 shadow-xs'
                        : 'text-slate-700 hover:text-black hover:bg-slate-200/50'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Clock size={14} className={activeTab === 'pemantauan-asn' && pemantauanSubTab === 'kgb' ? 'text-teal-700' : 'text-slate-500'} />
                      <span className="truncate">KGB Gaji Berkala</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-800 ml-1">
                      {pemantauanCounts.kgb}
                    </span>
                  </button>

                  {/* Sub-tab 4: BUP & Pensiun */}
                  <button
                    type="button"
                    onClick={() => handlePemantauanNavClick('pensiun')}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-[11px] flex items-center justify-between transition cursor-pointer ${
                      activeTab === 'pemantauan-asn' && pemantauanSubTab === 'pensiun'
                        ? 'bg-teal-100 text-teal-950 font-bold border border-teal-300 shadow-xs'
                        : 'text-slate-700 hover:text-black hover:bg-slate-200/50'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <AlertTriangle size={14} className={activeTab === 'pemantauan-asn' && pemantauanSubTab === 'pensiun' ? 'text-teal-700' : 'text-slate-500'} />
                      <span className="truncate">BUP & Pensiun</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-800 ml-1">
                      {pemantauanCounts.pensiun}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* 4. Layanan Kepegawaian (Collapsible with Sub-items: Usulan Berjalan & Usulan Baru) */}
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => {
                  if (activeTab !== 'layanan-kepegawaian') {
                    handleLayananNavClick('berjalan');
                    setIsLayananOpen(true);
                  } else {
                    setIsLayananOpen(prev => !prev);
                  }
                }}
                title="Layanan Kepegawaian"
                className={`w-full ${isSidebarOpen ? 'text-left px-3.5 py-2.5 space-x-3' : 'justify-center py-2.5 relative'} rounded-xl text-xs flex items-center transition duration-150 cursor-pointer ${
                  activeTab === 'layanan-kepegawaian' 
                    ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-300 shadow-xs' 
                    : 'text-slate-700 hover:text-black hover:bg-slate-200/60'
                }`}
              >
                <FileText size={16} className={activeTab === 'layanan-kepegawaian' ? 'text-emerald-700' : 'text-slate-500'} />
                {isSidebarOpen ? (
                  <div className="flex-1 flex justify-between items-center">
                    <span>Layanan Kepegawaian</span>
                    <div className="flex items-center space-x-1.5">
                      {(() => {
                        const filteredList = dbState.usulanLayanan.filter(u => {
                          const matchesStatus = u.status === 'Menunggu Validasi';
                          if (!matchesStatus) return false;
                          if (currentRole !== 'admin_dinkes') {
                            return u.id_puskesmas_pengusul === selectedPuskesmasId;
                          }
                          return true;
                        });
                        return filteredList.length > 0 ? (
                          <span className="bg-amber-500 text-slate-950 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                            {filteredList.length}
                          </span>
                        ) : null;
                      })()}
                      <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${isLayananOpen ? 'rotate-180 text-emerald-700' : ''}`} />
                    </div>
                  </div>
                ) : (
                  (() => {
                    const filteredList = dbState.usulanLayanan.filter(u => {
                      const matchesStatus = u.status === 'Menunggu Validasi';
                      if (!matchesStatus) return false;
                      if (currentRole !== 'admin_dinkes') {
                        return u.id_puskesmas_pengusul === selectedPuskesmasId;
                      }
                      return true;
                    });
                    return filteredList.length > 0 ? (
                      <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-slate-100" />
                    ) : null;
                  })()
                )}
              </button>

              {/* Sub-menu items for Layanan Kepegawaian */}
              {isSidebarOpen && isLayananOpen && (
                <div className="pl-6 pr-1 space-y-1 pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                  {/* Sub-tab 1: Lacak Dokumen Aktif / Usulan Berjalan */}
                  <button
                    type="button"
                    onClick={() => handleLayananNavClick('berjalan')}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-[11px] flex items-center justify-between transition cursor-pointer ${
                      activeTab === 'layanan-kepegawaian' && layananSubTab === 'berjalan'
                        ? 'bg-emerald-100 text-emerald-950 font-bold border border-emerald-300 shadow-xs'
                        : 'text-slate-700 hover:text-black hover:bg-slate-200/50'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <FileCheck size={14} className={activeTab === 'layanan-kepegawaian' && layananSubTab === 'berjalan' ? 'text-emerald-700' : 'text-slate-500'} />
                      <span className="truncate">Lacak Dokumen Aktif</span>
                    </div>
                  </button>

                  {/* Sub-tab 2: Buat Usulan Baru */}
                  <button
                    type="button"
                    onClick={() => handleLayananNavClick('baru')}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-[11px] flex items-center justify-between transition cursor-pointer ${
                      activeTab === 'layanan-kepegawaian' && layananSubTab === 'baru'
                        ? 'bg-emerald-100 text-emerald-950 font-bold border border-emerald-300 shadow-xs'
                        : 'text-slate-700 hover:text-black hover:bg-slate-200/50'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <Plus size={14} className={activeTab === 'layanan-kepegawaian' && layananSubTab === 'baru' ? 'text-emerald-700' : 'text-slate-500'} />
                      <span className="truncate">Buat Usulan Baru</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* 5. Laporan SDMK */}
            <button
              onClick={() => handleNavClick('keadaan-sdmk')}
              title="Laporan SDMK"
              className={`w-full ${isSidebarOpen ? 'text-left px-3.5 py-2.5 space-x-3' : 'justify-center py-2.5'} rounded-xl text-xs flex items-center transition duration-150 cursor-pointer ${
                activeTab === 'keadaan-sdmk' 
                  ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-300 shadow-xs' 
                  : 'text-slate-700 hover:text-black hover:bg-slate-200/60'
              }`}
            >
              <Layers size={16} className={activeTab === 'keadaan-sdmk' ? 'text-emerald-700' : 'text-slate-500'} />
              {isSidebarOpen && <span>Laporan SDMK</span>}
            </button>

            {/* 6. Analisa KP4 */}
            <button
              onClick={() => handleNavClick('analisa-kp4')}
              title="Analisa KP4 & Model DK"
              className={`w-full ${isSidebarOpen ? 'text-left px-3.5 py-2.5 space-x-3' : 'justify-center py-2.5 relative'} rounded-xl text-xs flex items-center transition duration-150 cursor-pointer ${
                activeTab === 'analisa-kp4' 
                  ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-300 shadow-xs' 
                  : 'text-slate-700 hover:text-black hover:bg-slate-200/60'
              }`}
            >
              <Users size={16} className={activeTab === 'analisa-kp4' ? 'text-rose-600' : 'text-slate-500'} />
              {isSidebarOpen ? (
                <div className="flex-1 flex justify-between items-center">
                  <span>Analisa KP4 &amp; Model DK</span>
                  {(() => {
                    const warningsCount = (dbState?.asnProfiles || []).filter(asn => {
                      if (asn.status_pegawai_detail === 'Non_ASN') return false;
                      if (currentRole !== 'admin_dinkes' && asn.id_puskesmas !== selectedPuskesmasId) {
                        return false;
                      }
                      if (asn.kp4_status_pernikahan === 'Kawin' && asn.kp4_pasangan_asn && asn.kp4_pasangan_tunjangan_diklaim) {
                        return true;
                      }
                      if (asn.kp4_tahun_validasi && asn.kp4_tahun_validasi !== 2026) {
                        return true;
                      }
                      try {
                        const list = JSON.parse(asn.kp4_daftar_anak || '[]');
                        const claimedCount = list.filter((c: any) => c.tunjangan_diklaim).length;
                        if (claimedCount > 2) return true;
                        
                        const hasChildIssue = list.some((child: any) => {
                          if (!child.tunjangan_diklaim) return false;
                          let age = 0;
                          if (child.tanggal_lahir) {
                            age = 2026 - new Date(child.tanggal_lahir).getFullYear();
                          }
                          const ageTooHigh = age > 25;
                          const statusIneligible = child.status_sekolah === 'Bekerja' || child.status_sekolah === 'Menikah';
                          const needsSkks = age >= 21 && age <= 25;
                          const skksMissing = needsSkks && (!child.has_skks || child.status_sekolah !== 'Sekolah/Kuliah');
                          return ageTooHigh || statusIneligible || skksMissing;
                        });
                        if (hasChildIssue) return true;
                      } catch(e) {}
                      return false;
                    }).length;

                    return warningsCount > 0 ? (
                      <span className="bg-rose-500/10 text-rose-700 text-[10px] px-1.5 py-0.5 border border-rose-500/20 rounded-full font-bold animate-pulse">
                        {warningsCount}
                      </span>
                    ) : null;
                  })()}
                </div>
              ) : (
                (() => {
                  const warningsCount = (dbState?.asnProfiles || []).filter(asn => {
                    if (asn.status_pegawai_detail === 'Non_ASN') return false;
                    if (currentRole !== 'admin_dinkes' && asn.id_puskesmas !== selectedPuskesmasId) return false;
                    if (asn.kp4_status_pernikahan === 'Kawin' && asn.kp4_pasangan_asn && asn.kp4_pasangan_tunjangan_diklaim) return true;
                    if (asn.kp4_tahun_validasi && asn.kp4_tahun_validasi !== 2026) return true;
                    try {
                      const list = JSON.parse(asn.kp4_daftar_anak || '[]');
                      if (list.filter((c: any) => c.tunjangan_diklaim).length > 2) return true;
                    } catch(e) {}
                    return false;
                  }).length;
                  return warningsCount > 0 ? (
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-slate-100 animate-pulse" />
                  ) : null;
                })()
              )}
            </button>

            {/* 7. Arsip Digital Pegawai */}
            <button
              onClick={() => handleNavClick('arsip-kepegawaian')}
              title="Arsip Digital"
              className={`w-full ${isSidebarOpen ? 'text-left px-3.5 py-2.5 space-x-3' : 'justify-center py-2.5 relative'} rounded-xl text-xs flex items-center transition duration-150 cursor-pointer ${
                activeTab === 'arsip-kepegawaian' 
                  ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-300 shadow-xs' 
                  : 'text-slate-700 hover:text-black hover:bg-slate-200/60'
              }`}
            >
              <FolderCheck size={16} className={activeTab === 'arsip-kepegawaian' ? 'text-emerald-700' : 'text-slate-500'} />
              {isSidebarOpen ? (
                <div className="flex-1 flex justify-between items-center">
                  <span>Arsip Digital</span>
                  {(() => {
                    const expiringCount = (dbState.arsipKepegawaian || []).filter(file => {
                      const asn = dbState.asnProfiles.find(a => a.id === file.id_asn);
                      if (!asn) return false;
                      if (currentRole !== 'admin_dinkes' && asn.id_puskesmas !== selectedPuskesmasId) return false;
                      if (file.str_expired_date) {
                        const expDate = new Date(file.str_expired_date);
                        const today = new Date();
                        const timeDiff = expDate.getTime() - today.getTime();
                        return Math.ceil(timeDiff / (1000 * 3600 * 24)) <= 60;
                      }
                      return false;
                    }).length;
                    return expiringCount > 0 ? (
                      <span className="bg-amber-500/10 text-amber-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold border border-amber-500/20 animate-pulse" title="STR Pegawai segera kadaluarsa & butuh perpanjangan">
                        {expiringCount} STR
                      </span>
                    ) : null;
                  })()}
                </div>
              ) : (
                (() => {
                  const expiringCount = (dbState.arsipKepegawaian || []).filter(file => {
                    const asn = dbState.asnProfiles.find(a => a.id === file.id_asn);
                    if (!asn) return false;
                    if (currentRole !== 'admin_dinkes' && asn.id_puskesmas !== selectedPuskesmasId) return false;
                    if (file.str_expired_date) {
                      const expDate = new Date(file.str_expired_date);
                      const today = new Date();
                      return Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 3600 * 24)) <= 60;
                    }
                    return false;
                  }).length;
                  return expiringCount > 0 ? (
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-slate-100 animate-pulse" />
                  ) : null;
                })()
              )}
            </button>

            {/* 8. Pengaturan / Administrasi & Branding (Collapsible with Sub-items) */}
            {currentRole === 'admin_dinkes' && (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    if (activeTab !== 'manajemen-dinkes') {
                      handlePengaturanNavClick('users');
                      setIsPengaturanOpen(true);
                    } else {
                      setIsPengaturanOpen(prev => !prev);
                    }
                  }}
                  title="Pengaturan"
                  className={`w-full ${isSidebarOpen ? 'text-left px-3.5 py-2.5 space-x-3' : 'justify-center py-2.5'} rounded-xl text-xs flex items-center transition duration-150 cursor-pointer ${
                    activeTab === 'manajemen-dinkes' 
                      ? 'bg-emerald-50 text-emerald-950 font-bold border border-emerald-300 shadow-xs' 
                      : 'text-slate-700 hover:text-black hover:bg-slate-200/60'
                  }`}
                >
                  <Shield size={16} className={activeTab === 'manajemen-dinkes' ? 'text-emerald-700' : 'text-slate-500'} />
                  {isSidebarOpen && (
                    <div className="flex-1 flex justify-between items-center">
                      <span className="font-bold">Pengaturan</span>
                      <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${isPengaturanOpen ? 'rotate-180 text-emerald-700' : ''}`} />
                    </div>
                  )}
                </button>

                {/* Sub-menu items for Pengaturan */}
                {isSidebarOpen && isPengaturanOpen && (
                  <div className="pl-6 pr-1 space-y-1 pt-1 animate-in fade-in slide-in-from-top-1 duration-150">
                    <button
                      type="button"
                      onClick={() => handlePengaturanNavClick('users')}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-[11px] flex items-center space-x-2 transition cursor-pointer ${
                        activeTab === 'manajemen-dinkes' && pengaturanSubTab === 'users'
                          ? 'bg-emerald-100 text-emerald-950 font-bold border border-emerald-300 shadow-xs'
                          : 'text-slate-700 hover:text-black hover:bg-slate-200/50'
                      }`}
                    >
                      <Users size={13} className={activeTab === 'manajemen-dinkes' && pengaturanSubTab === 'users' ? 'text-emerald-700' : 'text-slate-500'} />
                      <span className="truncate">Manajemen Pengguna</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePengaturanNavClick('documents')}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-[11px] flex items-center space-x-2 transition cursor-pointer ${
                        activeTab === 'manajemen-dinkes' && pengaturanSubTab === 'documents'
                          ? 'bg-emerald-100 text-emerald-950 font-bold border border-emerald-300 shadow-xs'
                          : 'text-slate-700 hover:text-black hover:bg-slate-200/50'
                      }`}
                    >
                      <FileText size={13} className={activeTab === 'manajemen-dinkes' && pengaturanSubTab === 'documents' ? 'text-emerald-700' : 'text-slate-500'} />
                      <span className="truncate">Dokumen &amp; Layanan</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePengaturanNavClick('features')}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-[11px] flex items-center space-x-2 transition cursor-pointer ${
                        activeTab === 'manajemen-dinkes' && pengaturanSubTab === 'features'
                          ? 'bg-emerald-100 text-emerald-950 font-bold border border-emerald-300 shadow-xs'
                          : 'text-slate-700 hover:text-black hover:bg-slate-200/50'
                      }`}
                    >
                      <Sliders size={13} className={activeTab === 'manajemen-dinkes' && pengaturanSubTab === 'features' ? 'text-emerald-700' : 'text-slate-500'} />
                      <span className="truncate">Manajemen Fitur</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePengaturanNavClick('units')}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-[11px] flex items-center space-x-2 transition cursor-pointer ${
                        activeTab === 'manajemen-dinkes' && pengaturanSubTab === 'units'
                          ? 'bg-emerald-100 text-emerald-950 font-bold border border-emerald-300 shadow-xs'
                          : 'text-slate-700 hover:text-black hover:bg-slate-200/50'
                      }`}
                    >
                      <Link size={13} className={activeTab === 'manajemen-dinkes' && pengaturanSubTab === 'units' ? 'text-emerald-700' : 'text-slate-500'} />
                      <span className="truncate">Unit Kerja (Puskesmas)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePengaturanNavClick('whatsapp')}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-[11px] flex items-center space-x-2 transition cursor-pointer ${
                        activeTab === 'manajemen-dinkes' && pengaturanSubTab === 'whatsapp'
                          ? 'bg-emerald-100 text-emerald-950 font-bold border border-emerald-300 shadow-xs'
                          : 'text-slate-700 hover:text-black hover:bg-slate-200/50'
                      }`}
                    >
                      <MessageSquare size={13} className={activeTab === 'manajemen-dinkes' && pengaturanSubTab === 'whatsapp' ? 'text-emerald-700' : 'text-slate-500'} />
                      <span className="truncate">WhatsApp Gateway</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePengaturanNavClick('d1')}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-[11px] flex items-center space-x-2 transition cursor-pointer ${
                        activeTab === 'manajemen-dinkes' && pengaturanSubTab === 'd1'
                          ? 'bg-amber-100 text-amber-950 font-bold border border-amber-300 shadow-xs'
                          : 'text-slate-700 hover:text-black hover:bg-slate-200/50'
                      }`}
                    >
                      <Database size={13} className={activeTab === 'manajemen-dinkes' && pengaturanSubTab === 'd1' ? 'text-amber-600' : 'text-slate-500'} />
                      <span className="truncate font-mono">Cloudflare D1 Live</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Dynamic Display Panel / Light Contrasting Body Area */}
        <main className="flex-grow p-4 sm:p-6 lg:p-8 space-y-6 overflow-y-auto bg-[#f8fafc] w-full transition-all">
          
          {/* Active View Router Switchboard */}
          {activeTab === 'dasbor' && (
            <DashboardOverview
              currentRole={currentRole}
              selectedPuskesmasId={selectedPuskesmasId}
              puskesmasList={dbState.puskesmas}
              asnProfiles={dbState.asnProfiles}
              usulanLayanan={dbState.usulanLayanan}
              arsipList={dbState.arsipKepegawaian || []}
              onNavigateToService={handleNavigateToServiceDirectly}
              onNavigateToTab={(tab) => setActiveTab(tab)}
              onNavigateToPemantauan={(subTab) => handlePemantauanNavClick(subTab)}
              notifications={dbState.notifications || []}
              onUpdateNotifications={updateNotifications}
              onSaveAndSync={saveAndSync}
              renbutList={renbutList}
              onUpdateRenbutList={updateRenbutList}
            />
          )}

          {/* Pemantauan ASN */}
          {activeTab === 'pemantauan-asn' && (
            <PemantauanASNView
              currentRole={currentRole}
              selectedPuskesmasId={selectedPuskesmasId}
              puskesmasList={dbState.puskesmas}
              asnProfiles={dbState.asnProfiles}
              initialSubTab={pemantauanSubTab}
              onUpdateAsnProfiles={updateProfiles}
              onNavigateToService={handleNavigateToServiceDirectly}
            />
          )}

          {activeTab === 'layanan-kepegawaian' && (
            <LayananKepegawaian
              currentRole={currentRole}
              selectedPuskesmasId={selectedPuskesmasId}
              puskesmasList={dbState.puskesmas}
              asnProfiles={dbState.asnProfiles}
              usulanLayanan={dbState.usulanLayanan}
              masterFitur={dbState.fitur}
              masterDokumen={dbState.dokumen}
              syaratFiturMap={dbState.syaratFiturMap}
              usulanDokumenFile={dbState.usulanDokumenFile}
              riwayatAk={dbState.riwayatAk}
              usersList={dbState.users}
              initialSubTab={layananSubTab}
              onUpdateAsnProfiles={updateProfiles}
              onUpdateUsulanLayanan={updateUsulanLayanan}
              onUpdateUsulanDokumenFile={updateUsulanDokumenFile}
              onUpdateRiwayatAk={updateRiwayatAk}
              initiallySelectedAsnId={navAsnId}
              initiallySelectedSlug={navSlug}
            />
          )}

          {activeTab === 'keadaan-sdmk' && (
            <LaporanSDMK
              currentRole={currentRole}
              selectedPuskesmasId={selectedPuskesmasId}
              puskesmasList={dbState.puskesmas}
              asnProfiles={dbState.asnProfiles}
              profesiSdmk={dbState.profesiSdmk}
              laporanSdmk={dbState.laporanSdmk}
              onUpdateLaporanSdmk={updateLaporanSdmk}
              onUpdateProfesiSdmk={updateProfesiSdmk}
              onUpdateAsnProfiles={updateProfiles}
              renbutList={renbutList}
              onUpdateRenbutList={updateRenbutList}
            />
          )}

          {activeTab === 'arsip-kepegawaian' && (
            <ArsipKepegawaianView
              currentRole={currentRole}
              selectedPuskesmasId={selectedPuskesmasId}
              puskesmasList={dbState.puskesmas}
              asnProfiles={dbState.asnProfiles}
              arsipList={dbState.arsipKepegawaian || []}
              onUpdateArsipList={updateArsipKepegawaian}
              onUpdateAsnProfiles={updateProfiles}
            />
          )}

          {activeTab === 'analisa-kp4' && (
            <DashboardKP4
              currentRole={currentRole}
              selectedPuskesmasId={selectedPuskesmasId}
              puskesmasList={dbState.puskesmas}
              asnProfiles={dbState.asnProfiles}
              onEditEmployee={(emp) => setEditingAsn(emp)}
            />
          )}

          {activeTab === 'manajemen-dinkes' && currentRole === 'admin_dinkes' && (
            <DinkesManagement
              puskesmasList={dbState.puskesmas}
              featuresList={dbState.fitur}
              documentsList={dbState.dokumen}
              syaratFiturMap={dbState.syaratFiturMap}
              usersList={dbState.users}
              logoUrl={activeLogoUrl}
              faviconUrl={activeFaviconUrl}
              initialTab={pengaturanSubTab}
              onUpdateFeaturesList={(updated) => {
                saveAndSync({ fitur: updated });
              }}
              onUpdateDocumentsList={(updated) => {
                saveAndSync({ dokumen: updated });
              }}
              onUpdateSyaratFiturMap={(updated) => {
                saveAndSync({ syaratFiturMap: updated });
              }}
              onUpdateUsersList={(updated) => {
                saveAndSync({ users: updated });
              }}
              onUpdateBranding={(logo, favicon) => {
                saveAndSync({ logoUrl: logo, faviconUrl: favicon });
              }}
              onUpdatePuskesmasList={(updated) => {
                saveAndSync({ puskesmas: updated });
              }}
              dbState={dbState}
              onUpdateDbState={(updatedState) => {
                setDbState(updatedState);
                saveDB(updatedState);
              }}
            />
          )}

          {/* ======================= VIEW: DIREKTORI PEGAWAI (RENAMED PASN) ======================= */}
          {activeTab === 'roster-asn' && (
            <div className="bg-[#16161a] border border-white/5 p-6 rounded-xl space-y-4 animate-in fade-in duration-200">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div>
                  <h2 className="text-xl font-display font-bold text-white">
                    Direktori Pegawai
                  </h2>
                  <p className="text-xs text-slate-400">
                    Pegawai (ASN (PNS, PPPK Penuh Waktu, PPPK Paruh Waktu), PKWT/Non-ASN) Lombok Barat
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Both roles can add, but Puskesmas is highlighted to submit pegawai database */}
                  <button
                    onClick={() => {
                      setShowAddForm(!showAddForm);
                      setNewUnitId(currentRole === 'admin_puskesmas' ? (selectedPuskesmasId || 1) : 100);
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition"
                  >
                    <Plus size={14} />
                    <span>{showAddForm ? 'Tutup Form' : 'Tambah Pegawai'}</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Employee Registration Form (Manual Single or Excel Smart Copy Paste) */}
              {showAddForm && (
                <div className="bg-[#0f0f12] p-5 border border-white/5 rounded-2xl space-y-4 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between border-b border-white/5 pb-3">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                      <Plus className="text-emerald-500" size={15} />
                      <span>Form Pendaftaran Pegawai Baru</span>
                    </h3>

                    {/* Choose Add Method */}
                    <div className="flex bg-slate-900 p-0.5 rounded-lg text-[10px] font-bold border border-white/5">
                      <button 
                        onClick={() => setAddMode('single')} 
                        className={`px-2.5 py-1 rounded transition ${addMode === 'single' ? 'bg-[#16161a] text-white' : 'text-slate-500'}`}
                      >
                        Input Manual
                      </button>
                      <button 
                        onClick={() => setAddMode('excel')} 
                        className={`px-2.5 py-1 rounded transition ${addMode === 'excel' ? 'bg-[#16161a] text-white' : 'text-slate-500'}`}
                      >
                        Salin dari Excel
                      </button>
                    </div>
                  </div>

                  {/* FORM OPTION 1: SINGLE DATA ENTRY */}
                  {addMode === 'single' && (
                    <form onSubmit={handleAddEmployeeManual} className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium">
                      
                      <div className="space-y-1.5 font-semibold">
                        <label className="text-slate-400">
                          {newStatusDetail === 'Non_ASN' ? 'Nomor Induk Pegawai (NIP - TERKUNCI UNTUK NON-ASN)' : 'Nomor Induk Pegawai (NIP)'}
                        </label>
                        <input
                          type="text"
                          required={newStatusDetail !== 'Non_ASN'}
                          disabled={newStatusDetail === 'Non_ASN'}
                          placeholder={newStatusDetail === 'Non_ASN' ? "Non-ASN Tidak Memiliki NIP (Gunakan NIK)" : "Contoh: 19900215..."}
                          value={newStatusDetail === 'Non_ASN' ? '' : newNip}
                          onChange={(e) => {
                            if (newStatusDetail !== 'Non_ASN') {
                              setNewNip(e.target.value);
                              setNewPppkNi(e.target.value);
                            }
                          }}
                          className={`w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500 ${newStatusDetail === 'Non_ASN' ? 'opacity-50 cursor-not-allowed bg-[#16161a]/60 text-slate-500' : ''}`}
                        />
                      </div>

                      <div className="space-y-1.5 font-semibold">
                        <label className="text-slate-400">
                          Nomor Induk Kependudukan (NIK) <span className="text-rose-505 text-rose-500 font-bold">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={16}
                          placeholder="NIK 16 Digit..."
                          value={newNik}
                          onChange={(e) => {
                            const val = e.target.value.replace(/\D/g, ''); // numeric only
                            setNewNik(val);
                          }}
                          className={`w-full p-2 border bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500 font-mono ${(!newNik || newNik.length !== 16) ? 'border-amber-500/40 ring-1 ring-amber-500/10' : 'border-white/5'}`}
                        />
                        {(!newNik || newNik.length !== 16) && (
                          <p className="text-[10px] text-amber-500">NIK wajib 16 digit angka ({newNik?.length || 0}/16)</p>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-400">Nama Lengkap</label>
                        <input
                          type="text"
                          required
                          placeholder="Nama lengkap..."
                          value={newNama}
                          onChange={(e) => setNewNama(e.target.value)}
                          className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-400">Gelar Belakang (Opsional)</label>
                        <input
                          type="text"
                          placeholder="A.Md.Kep, S.Tr.Keb, dsb..."
                          value={newGelar}
                          onChange={(e) => setNewGelar(e.target.value)}
                          className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-400">Jenis Golongan & ASN status</label>
                        <select
                          value={newStatusDetail}
                          onChange={(e) => setNewStatusDetail(e.target.value as StatusPegawaiDetail)}
                          className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="PNS">Pegawai Negeri Sipil (PNS)</option>
                          <option value="PPPK_Penuh_Waktu">PPPK Penuh Waktu</option>
                          <option value="PPPK_Paruh_Waktu">PPPK Paruh Waktu</option>
                          <option value="Non_ASN">PKWT / Non-ASN</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-400">Kategori Jabatan (Rumpun)</label>
                        <select
                          value={newJenisPegawai}
                          onChange={(e) => setNewJenisPegawai(e.target.value as JenisPegawai)}
                          className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="Jafung_Kesehatan">Pejabat Fungsional Kesehatan (Jafung)</option>
                          <option value="Struktural">Pejabat Struktural</option>
                          <option value="Staf_Umum">Staf Umum / Administrasi</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-400 font-semibold flex items-center gap-1">
                          Nomor WhatsApp Aktif <span className="text-rose-500 font-bold">*</span>
                        </label>
                        <div className="flex rounded-lg overflow-hidden border border-white/5 bg-[#16161a]">
                          <span className="inline-flex items-center px-3 bg-slate-850 text-slate-400 border-r border-white/5 font-mono text-xs select-none">
                            +62
                          </span>
                          <input
                            type="text"
                            required
                            placeholder="81234567890"
                            value={newNomorWa.startsWith('+62') ? newNomorWa.substring(3) : newNomorWa}
                            onChange={(e) => {
                              const normalized = normalizeIndonesianPhoneNumber(e.target.value, true);
                              setNewNomorWa(normalized);
                            }}
                            className="flex-1 p-2 bg-[#16161a] text-white outline-none focus:ring-1 focus:ring-emerald-500 text-sm font-semibold font-mono"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 font-mono">Format terkunci +62 (wajib terisi angka aktif)</p>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-emerald-400 font-bold">Rumpun Profesi Kesehatan (SDMK)</label>
                        <select
                          value={newProfesiId}
                          onChange={(e) => setNewProfesiId(parseInt(e.target.value))}
                          className="w-full p-2 border border-emerald-500/30 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500 font-bold"
                        >
                          {dbState.profesiSdmk.map(p => (
                            <option key={p.id} value={p.id}>{p.nama_profesi}</option>
                          ))}
                        </select>
                      </div>

                      {newStatusDetail !== 'Non_ASN' && (
                        <div className="space-y-1.5 animate-in fade-in duration-200">
                          <label className="text-slate-400">Golongan Ruang <span className="text-[10px] text-teal-400 font-normal block mt-0.5">(bisa lebih cepat apabila AK tercukupi)</span></label>
                          <select
                            value={newGolongan}
                            onChange={(e) => setNewGolongan(e.target.value)}
                            className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500"
                          >
                            <optgroup label="Golongan PNS">
                              <option value="I/a">I/a - Juru Muda</option>
                              <option value="I/b">I/b - Juru Muda Tk. I</option>
                              <option value="I/c">I/c - Juru</option>
                              <option value="I/d">I/d - Juru Tk. I</option>
                              <option value="II/a">II/a - Pengatur Muda</option>
                              <option value="II/b">II/b - Pengatur Muda Tk. I</option>
                              <option value="II/c">II/c - Pengatur</option>
                              <option value="II/d">II/d - Pengatur Tk. I</option>
                              <option value="III/a">III/a - Penata Muda</option>
                              <option value="III/b">III/b - Penata Muda Tk. I</option>
                              <option value="III/c">III/c - Penata</option>
                              <option value="III/d">III/d - Penata Tk. I</option>
                              <option value="IV/a">IV/a - Pembina</option>
                              <option value="IV/b">IV/b - Pembina Tk. I</option>
                              <option value="IV/c">IV/c - Pembina Utama Muda</option>
                              <option value="IV/d">IV/d - Pembina Utama Madya</option>
                              <option value="IV/e">IV/e - Pembina Utama</option>
                            </optgroup>
                            <optgroup label="Golongan PPPK">
                              <option value="Golongan I">Golongan I</option>
                              <option value="Golongan II">Golongan II</option>
                              <option value="Golongan III">Golongan III</option>
                              <option value="Golongan IV">Golongan IV</option>
                              <option value="Golongan V">Golongan V</option>
                              <option value="Golongan VI">Golongan VI</option>
                              <option value="Golongan VII">Golongan VII</option>
                              <option value="Golongan VIII">Golongan VIII</option>
                              <option value="Golongan IX">Golongan IX</option>
                              <option value="Golongan X">Golongan X</option>
                              <option value="Golongan XI">Golongan XI</option>
                              <option value="Golongan XII">Golongan XII</option>
                              <option value="Golongan XIII">Golongan XIII</option>
                              <option value="Golongan XIV">Golongan XIV</option>
                              <option value="Golongan XV">Golongan XV</option>
                              <option value="Golongan XVI">Golongan XVI</option>
                              <option value="Golongan XVII">Golongan XVII</option>
                            </optgroup>
                          </select>
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-slate-400">Jenis Kelamin</label>
                        <select
                          value={newGender}
                          onChange={(e) => setNewGender(e.target.value as JenisKelamin)}
                          className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500"
                        >
                          <option value="L">Laki-Laki (L)</option>
                          <option value="P">Perempuan (P)</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-400">Tanggal Lahir</label>
                        <input
                          type="date"
                          required
                          value={newTanggalLahir}
                          onChange={(e) => setNewTanggalLahir(e.target.value)}
                          className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                        />
                      </div>

                      {newStatusDetail !== 'Non_ASN' && (
                        <div className="space-y-1.5 animate-in fade-in duration-200">
                          <label className="text-slate-400">Sisa Cuti Tahunan (Hari)</label>
                          <input
                            type="number"
                            required
                            min={0}
                            max={30}
                            value={newSisaCuti}
                            onChange={(e) => setNewSisaCuti(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500"
                            placeholder="contoh: 12"
                          />
                        </div>
                      )}

                      {/* Display Unit placement selector only if Admin Dinkes is adding, as Puskesmas maps to active tenant */}
                      <div className="space-y-1.5">
                        <label className="text-slate-400">Unit Penempatan Kerja</label>
                        {currentRole === 'admin_dinkes' ? (
                          <select
                            value={newUnitId}
                            onChange={(e) => {
                              const uid = Number(e.target.value);
                              setNewUnitId(uid);
                              const psk = dbState.puskesmas.find(p => p.id === uid);
                              if (psk) {
                                setNewPnsUnor(psk.nama_puskesmas);
                                setNewPnsUnorInduk(psk.nama_puskesmas);
                                setNewPppkUnor(psk.nama_puskesmas);
                              }
                            }}
                            className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg text-emerald-400 font-semibold"
                          >
                            {dbState.puskesmas.map(p => (
                              <option key={p.id} value={p.id}>{p.nama_puskesmas}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="w-full p-2 bg-emerald-950/20 border border-emerald-500/20 rounded-lg text-slate-300 font-bold">
                            {getPuskesmasName(selectedPuskesmasId)} (Terkunci Otomatis)
                          </div>
                        )}
                      </div>

                      {/* ================= STR & SIP PROFILE FIELDS ================= */}
                      {newJenisPegawai === 'Jafung_Kesehatan' && (
                        <div className="md:col-span-3 border-t border-white/5 pt-4 mt-2 space-y-4">
                          <div className="bg-emerald-950/20 border border-emerald-500/10 p-3 rounded-lg">
                            <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                              Informasi STR &amp; SIP (Surat Tanda Registrasi &amp; Surat Izin Praktik)
                            </span>
                            <p className="text-[10.5px] text-slate-400 mt-1 leading-relaxed">
                              Lengkapi data nomor registrasi, tanggal terbit, dan tanggal kadaluarsa STR serta SIP tenaga kesehatan bersangkutan.
                            </p>
                          </div>
  
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* STR Fields Card */}
                            <div className="p-4 bg-slate-900/45 border border-white/5 rounded-xl space-y-3">
                              <h4 className="text-xs font-bold text-emerald-400">Arsip STR (Surat Tanda Registrasi)</h4>
                              
                              <div className="space-y-1.5">
                                <label className="text-slate-400 font-semibold block">Nomor STR</label>
                                <input
                                  type="text"
                                  placeholder="Contoh: STR-1234567-89"
                                  value={newNoStr}
                                  onChange={(e) => setNewNoStr(e.target.value)}
                                  className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500"
                                />
                              </div>
  
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1.5">
                                  <label className="text-slate-400 font-semibold block">Tanggal Terbit STR</label>
                                  <input
                                    type="date"
                                    value={newTanggalTerbitStr}
                                    onChange={(e) => setNewTanggalTerbitStr(e.target.value)}
                                    className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg text-xs"
                                  />
                                </div>
  
                                <div className="space-y-1.5">
                                  <div className="flex justify-between items-center mb-0.5">
                                    <label className="text-slate-400 font-semibold text-[11px]">Tanggal Akhir STR</label>
                                    <label className="flex items-center space-x-1 cursor-pointer text-emerald-400 select-none">
                                      <input
                                        type="checkbox"
                                        checked={newIsStrSeumurHidup}
                                        onChange={(e) => {
                                          setNewIsStrSeumurHidup(e.target.checked);
                                          if (e.target.checked) setNewTanggalAkhirStr('');
                                        }}
                                        className="accent-emerald-500 rounded scale-90"
                                      />
                                      <span className="text-[10px] font-bold">Seumur Hidup</span>
                                    </label>
                                  </div>
                                  <input
                                    type="date"
                                    disabled={newIsStrSeumurHidup}
                                    value={newTanggalAkhirStr}
                                    onChange={(e) => setNewTanggalAkhirStr(e.target.value)}
                                    className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg disabled:opacity-40 text-xs"
                                  />
                                </div>
                              </div>
                            </div>
  
                            {/* SIP Fields Card */}
                            <div className="p-4 bg-slate-900/45 border border-white/5 rounded-xl space-y-3">
                              <h4 className="text-xs font-bold text-teal-400">Arsip SIP (Surat Izin Praktik)</h4>
                              
                              <div className="space-y-1.5">
                                <label className="text-slate-400 font-semibold block">Nomor SIP</label>
                                <input
                                  type="text"
                                  placeholder="Contoh: SIP/503/452/DKS/2026"
                                  value={newNoSip}
                                  onChange={(e) => setNewNoSip(e.target.value)}
                                  className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500"
                                />
                              </div>
  
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1.5">
                                  <label className="text-slate-400 font-semibold block">Tanggal Terbit SIP</label>
                                  <input
                                    type="date"
                                    value={newTanggalTerbitSip}
                                    onChange={(e) => setNewTanggalTerbitSip(e.target.value)}
                                    className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg text-xs"
                                  />
                                </div>
  
                                <div className="space-y-1.5">
                                  <label className="text-slate-400 font-semibold block">Tanggal Akhir SIP</label>
                                  <input
                                    type="date"
                                    value={newTanggalAkhirSip}
                                    onChange={(e) => setNewTanggalAkhirSip(e.target.value)}
                                    className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg text-xs"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ================= CONDITION 1: PNS PROFILE FIELDS ================= */}
                      {newStatusDetail === 'PNS' && (
                        <div className="md:col-span-3 border-t border-white/5 pt-4 mt-2 space-y-4">
                          <div className="bg-emerald-950/20 border border-emerald-500/10 p-3 rounded-lg">
                            <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                              Bidang Informasi Kepegawaian PNS (Regulasi BKN)
                            </span>
                            <p className="text-[10.5px] text-slate-400 mt-1 leading-relaxed">
                              Sesuai regulasi Badan Kepegawaian Negara, lengkapilah status kenaikan pangkat, TMT, pertek, dan nomenklatur instansi pembina pegawai di bawah ini.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-slate-400">Pangkat Nama (e.g. Pembina Tkt. I) <span className="text-[10px] text-teal-400 font-normal block mt-0.5">(bisa lebih cepat apabila AK tercukupi)</span></label>
                              <input
                                type="text"
                                value={newPangkatNama}
                                onChange={(e) => setNewPangkatNama(e.target.value)}
                                disabled={newJenisPegawai === 'Jafung_Kesehatan'}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500 disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-[#16161a]/50 text-emerald-400 font-semibold"
                                placeholder="Pembina Tingkat I"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Jenis Kenaikan Pangkat <span className="text-[10px] text-teal-400 font-normal block mt-0.5">(Otomatis 1 Tingkat Lebih Tinggi)</span></label>
                              <input
                                type="text"
                                value={newPnsJenisKenaikanPangkat}
                                onChange={(e) => setNewPnsJenisKenaikanPangkat(e.target.value)}
                                disabled={newJenisPegawai === 'Jafung_Kesehatan'}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500 disabled:opacity-75 disabled:cursor-not-allowed disabled:bg-[#16161a]/50 text-emerald-400 font-semibold"
                                placeholder="Pilihan (Fungsional Tertentu)"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Masa Kerja Golongan</label>
                              <input
                                type="text"
                                value={newPnsMasaKerjaGolongan}
                                onChange={(e) => setNewPnsMasaKerjaGolongan(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500"
                                placeholder="Contoh: 28 tahun 1 bulan"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">TMT Golongan</label>
                              <input
                                type="date"
                                value={newPnsTmtGolongan}
                                onChange={(e) => setNewPnsTmtGolongan(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">No. Pertimbangan Teknis BKN</label>
                              <input
                                type="text"
                                value={newPnsNoPertekBkn}
                                onChange={(e) => setNewPnsNoPertekBkn(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg font-mono focus:ring-1 focus:ring-emerald-500"
                                placeholder="KG-25201000113"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Tgl. Pertimbangan Teknis BKN</label>
                              <input
                                type="date"
                                value={newPnsTglPertekBkn}
                                onChange={(e) => setNewPnsTglPertekBkn(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Nomor SK Pangkat</label>
                              <input
                                type="text"
                                value={newPnsNoSk}
                                onChange={(e) => setNewPnsNoSk(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg font-mono focus:ring-1 focus:ring-emerald-500"
                                placeholder="800.1.3.2/1246/BKD/2025"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Tanggal SK Pangkat</label>
                              <input
                                type="date"
                                value={newPnsTglSk}
                                onChange={(e) => setNewPnsTglSk(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Nama Jabatan Penuh</label>
                              <input
                                type="text"
                                value={newPnsNamaJabatan}
                                onChange={(e) => setNewPnsNamaJabatan(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg focus:ring-1 focus:ring-emerald-500"
                                placeholder="Perawat Ahli Madya, Bidan Utama, dsb..."
                              />
                            </div>

                            {newJenisPegawai === 'Jafung_Kesehatan' ? (
                              <>
                                <div className="space-y-1.5">
                                  <label className="text-slate-400">Jenis Jabatan</label>
                                  <select
                                    value={newPnsJenisJabatan}
                                    onChange={(e) => setNewPnsJenisJabatan(e.target.value)}
                                    className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                                  >
                                    <option value="Jabatan Fungsional">Jabatan Fungsional</option>
                                    <option value="Jabatan Struktural">Jabatan Struktural</option>
                                    <option value="Fungsional Umum">Fungsional Umum</option>
                                  </select>
                                </div>

                                <div className="space-y-1.5">
                                  <label className="text-slate-400">TMT Jabatan</label>
                                  <input
                                    type="date"
                                    value={newPnsTmtJabatan}
                                    onChange={(e) => setNewPnsTmtJabatan(e.target.value)}
                                    className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                                  />
                                </div>

                                <div className="space-y-1.5">
                                  <label className="text-slate-400">Nomor SK Jabatan</label>
                                  <input
                                    type="text"
                                    value={newPnsNoSkJabatan}
                                    onChange={(e) => setNewPnsNoSkJabatan(e.target.value)}
                                    className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg font-mono"
                                    placeholder="821.16/264/BKD-PSDM/2022"
                                  />
                                </div>

                                <div className="space-y-1.5">
                                  <label className="text-slate-400">Tanggal SK Jabatan</label>
                                  <input
                                    type="date"
                                    value={newPnsTglSkJabatan}
                                    onChange={(e) => setNewPnsTglSkJabatan(e.target.value)}
                                    className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                                  />
                                </div>
                              </>
                            ) : (
                              <div className="space-y-1.5">
                                <label className="text-slate-400">Nomenklatur Instansi Pembina Pegawai</label>
                                <input
                                  type="text"
                                  value={newPnsInstansiPembina}
                                  onChange={(e) => setNewPnsInstansiPembina(e.target.value)}
                                  className="w-full p-2 border border-emerald-500/35 bg-[#16161a] text-emerald-400 font-semibold rounded-lg focus:ring-1 focus:ring-emerald-500"
                                  placeholder="Contoh: Badan Kepegawaian Negara (BKN)"
                                />
                              </div>
                            )}

                            <div className="space-y-1.5">
                              <label className="text-slate-400">TMT Gaji Berkala (Berikutnya/Terakhir)</label>
                              <input
                                type="date"
                                value={newTmtBerkalaTerakhir}
                                onChange={(e) => setNewTmtBerkalaTerakhir(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg text-amber-400 font-semibold"
                              />
                            </div>

                             <div className="space-y-1.5">
                              <label className="text-slate-400">Instansi Kerja <span className="text-[9px] text-emerald-500 font-mono font-bold">(KUNCI REGULASI)</span></label>
                              <input
                                type="text"
                                value={newPnsInstansiKerja}
                                onChange={(e) => setNewPnsInstansiKerja(e.target.value)}
                                disabled={true}
                                title="Instansi Kerja dikunci otomatis (Pemerintah Kab. Lombok Barat)"
                                className="w-full p-2 border border-white/5 bg-[#16161a]/60 text-slate-400 rounded-lg cursor-not-allowed opacity-75 font-medium"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Satuan Kerja (Satker) Induk <span className="text-[9px] text-emerald-500 font-mono font-bold">(KUNCI REGULASI)</span></label>
                              <input
                                type="text"
                                value={newPnsSatkerInduk}
                                onChange={(e) => setNewPnsSatkerInduk(e.target.value)}
                                disabled={true}
                                title="Satuan Kerja Induk dikunci otomatis (Dinas Kesehatan Kab. Lombok Barat)"
                                className="w-full p-2 border border-white/5 bg-[#16161a]/60 text-slate-400 rounded-lg cursor-not-allowed opacity-75 font-medium"
                              />
                            </div>

                            <div className="space-y-1.5 font-semibold">
                              <label className="text-slate-400">
                                Unit Organisasi Kerja (Unor)
                                <span className="text-[9px] text-teal-400 font-mono font-bold ml-1.5">(OTOMATIS SESUAI UNIT TERPILIH)</span>
                              </label>
                              <input
                                type="text"
                                value={getPuskesmasName(currentRole === 'admin_dinkes' ? newUnitId : (selectedPuskesmasId || 1))}
                                disabled={true}
                                className="w-full p-2 border border-white/5 bg-[#16161a]/60 text-slate-400 rounded-lg cursor-not-allowed opacity-75 font-semibold"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ================= CONDITION 2: PPPK PROFILE FIELDS ================= */}
                      {(newStatusDetail === 'PPPK_Penuh_Waktu' || newStatusDetail === 'PPPK_Paruh_Waktu') && (
                        <div className="md:col-span-3 border-t border-white/5 pt-4 mt-2 space-y-4">
                          <div className="bg-emerald-950/20 border border-emerald-500/10 p-3 rounded-lg">
                            <span className="text-[10px] uppercase font-bold text-teal-400 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-teal-400 inline-block"></span>
                              Bidang Informasi PPPK {newStatusDetail === 'PPPK_Penuh_Waktu' ? 'Penuh Waktu' : 'Paruh Waktu'}
                            </span>
                            <p className="text-[10.5px] text-slate-400 mt-1 leading-relaxed">
                              Lengkapi data kepegawaian PPPK sesuai dengan kontrak BKN terdaftar (Nomor Induk PPPK, tanggal mulai-selesai perjanjian kerja).
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5 font-semibold">
                              <label className="text-slate-400">Nomor Induk PPPK (NI PPPK) <span className="text-[10px] text-teal-400 font-normal block mt-0.5">(Sesuai NIP di atas - Terkunci Otomatis)</span></label>
                              <input
                                type="text"
                                disabled={true}
                                value={newNip}
                                className="w-full p-2 border border-white/5 bg-[#16161a]/60 text-slate-400 rounded-lg font-mono cursor-not-allowed opacity-75"
                                placeholder="Diambil otomatis dari NIP di atas..."
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Nomor SK Perjanjian Kerja</label>
                              <input
                                type="text"
                                value={newPppkNoPerjanjian}
                                onChange={(e) => setNewPppkNoPerjanjian(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg font-mono"
                                placeholder="800.1/1412/BKD-PPPK/2024"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Tanggal Perjanjian Kerja</label>
                              <input
                                type="date"
                                value={newPppkTglPerjanjian}
                                onChange={(e) => setNewPppkTglPerjanjian(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Tanggal Mulai Perjanjian (Kontrak)</label>
                              <input
                                type="date"
                                value={newPppkTmtPerjanjianMulai}
                                onChange={(e) => setNewPppkTmtPerjanjianMulai(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Tanggal Selesai Perjanjian (Kontrak)</label>
                              <input
                                type="date"
                                value={newPppkTmtPerjanjianSelesai}
                                onChange={(e) => setNewPppkTmtPerjanjianSelesai(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg text-rose-400 font-semibold"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">TMT Golongan PPPK</label>
                              <input
                                type="date"
                                value={newPppkTmtGolongan}
                                onChange={(e) => setNewPppkTmtGolongan(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Nomor SK PPPK</label>
                              <input
                                type="text"
                                value={newPppkNoSk}
                                onChange={(e) => setNewPppkNoSk(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg font-mono"
                                placeholder="800/125/BKD/2024"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Tanggal SK PPPK</label>
                              <input
                                type="date"
                                value={newPppkTglSk}
                                onChange={(e) => setNewPppkTglSk(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Jabatan PPPK Terdaftar</label>
                              <input
                                type="text"
                                value={newPppkBknJabatan}
                                onChange={(e) => setNewPppkBknJabatan(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                                placeholder="e.g. Ahli Pratama - Bidan"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Golongan PPPK (e.g. IX, VII)</label>
                              <input
                                type="text"
                                value={newPppkBknGolongan}
                                onChange={(e) => setNewPppkBknGolongan(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg text-center"
                                placeholder="IX"
                              />
                            </div>

                            <div className="space-y-1.5 font-semibold">
                              <label className="text-slate-400">
                                Unit Organisasi Terdaftar
                                <span className="text-[9px] text-teal-400 font-mono font-bold ml-1.5">(OTOMATIS SESUAI UNIT TERPILIH)</span>
                              </label>
                              <input
                                type="text"
                                value={getPuskesmasName(currentRole === 'admin_dinkes' ? newUnitId : (selectedPuskesmasId || 1))}
                                disabled={true}
                                className="w-full p-2 border border-white/5 bg-[#16161a]/60 text-slate-400 rounded-lg cursor-not-allowed opacity-75 font-semibold"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ================= CONDITION 3: PKWT / NON-ASN FIELDS ================= */}
                      {newStatusDetail === 'Non_ASN' && (
                        <div className="md:col-span-3 border-t border-white/5 pt-4 mt-2 space-y-4">
                          <div className="bg-amber-950/20 border border-amber-500/10 p-3 rounded-lg">
                            <span className="text-[10px] uppercase font-bold text-amber-450 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                              Bidang Informasi PKWT & Non-ASN (Kontrak Kerja/Jasa Pelayanan)
                            </span>
                            <p className="text-[10.5px] text-slate-400 mt-1 leading-relaxed">
                              Lengkapi NIK Kependudukan, masa kerja aktif, no SK penugasan dinkes / puskesmas, serta sumber pembiayaan bulanan tenaga kerja.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-slate-400">Nomor SK Kontrak PKWT</label>
                              <input
                                type="text"
                                value={newPkwtNoSkKontrak}
                                onChange={(e) => setNewPkwtNoSkKontrak(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg font-mono"
                                placeholder="SK-KONTRAK/902/DINKES/2024"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Tanggal SK Kontrak</label>
                              <input
                                type="date"
                                value={newPkwtTglSkKontrak}
                                onChange={(e) => setNewPkwtTglSkKontrak(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">TMT Mulai Kontrak (TMT SK)</label>
                              <input
                                type="date"
                                value={newPkwtTmtSk}
                                onChange={(e) => setNewPkwtTmtSk(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Masa Kerja Penugasan</label>
                              <input
                                type="text"
                                value={newPkwtMasaKerja}
                                onChange={(e) => setNewPkwtMasaKerja(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                                placeholder="e.g. 2 Tahun 4 Bulan"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-slate-400">Sumber Pembiayaan Jasa</label>
                              <select
                                value={newPkwtPembiayaan}
                                onChange={(e) => setNewPkwtPembiayaan(e.target.value as any)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg text-amber-400 font-bold"
                              >
                                <option value="APBD">Anggaran Pendapatan Belanja Daerah (APBD)</option>
                                <option value="BLUD">Dana Operasional Puskesmas (BLUD)</option>
                                <option value="APBN">Dana Alokasi Khusus (APBN / BOK)</option>
                              </select>
                            </div>

                            <div className="space-y-1.5 md:col-span-2">
                              <label className="text-slate-400">Jabatan Penugasan / Jasa Pelayanan</label>
                              <input
                                type="text"
                                value={newPkwtJabatan}
                                onChange={(e) => setNewPkwtJabatan(e.target.value)}
                                className="w-full p-2 border border-white/5 bg-[#16161a] text-white rounded-lg"
                                placeholder="Contoh: Tenaga Promosi Kesehatan / Driver Ambulance Kontrak..."
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="md:col-span-3 pt-3 flex justify-end">
                        <button
                          type="submit"
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition"
                        >
                          Simpan Pegawai Ke Database
                        </button>
                      </div>

                    </form>
                  )}

                  {/* FORM OPTION 2: BULK EXCEL SMART PASTE */}
                    {addMode === 'excel' && (
                     <div className="space-y-4">
                       {/* Tutorial & Download Section */}
                       <div className="bg-[#16161a] border border-emerald-500/10 p-5 rounded-2xl space-y-4">
                         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-3">
                           <div>
                             <h4 className="font-bold text-white text-sm flex items-center gap-2">
                               <Table className="text-emerald-400" size={18} />
                               Layanan Impor Pintar Excel (.xlsx) / Salin-Tempel
                             </h4>
                             <p className="text-xs text-slate-400 mt-0.5">
                               Unduh template resmi kami, lengkapi data Anda, lalu unggah kembali file Excel atau salin datanya langsung ke sistem.
                             </p>
                           </div>
                           <button
                             type="button"
                             onClick={downloadExcelTemplate}
                             className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs transition flex items-center gap-1.5 cursor-pointer self-start sm:self-center shrink-0"
                           >
                             📥 Unduh Template Excel (.xlsx)
                           </button>
                         </div>

                         {/* Step-by-step Tutorial */}
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                           <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-1.5">
                             <div className="w-5 h-5 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center font-bold font-mono text-[10px]">
                               1
                             </div>
                             <p className="font-bold text-white">Unduh &amp; Buka Template</p>
                             <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                               Klik tombol hijau di atas untuk mengunduh berkas <code className="text-emerald-400">Template_SAPA_Pegawai_UPT_Puskesmas_Sedau.xlsx</code>. Buka menggunakan Excel atau WPS.
                             </p>
                           </div>

                           <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-1.5">
                             <div className="w-5 h-5 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center font-bold font-mono text-[10px]">
                               2
                             </div>
                             <p className="font-bold text-white">Isi Sesuai Format Aplikasi</p>
                             <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                               Masukkan data pegawai sesuai tutorial di lembar kedua Excel. Pastikan <strong>Status Pegawai</strong> dan <strong>Rumpun Jabatan</strong> sesuai pilihan valid di aplikasi.
                             </p>
                           </div>

                           <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-1.5">
                             <div className="w-5 h-5 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center font-bold font-mono text-[10px]">
                               3
                             </div>
                             <p className="font-bold text-white">Upload atau Tempel Data</p>
                             <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                               Seret berkas <code className="text-emerald-400">.xlsx</code> Anda ke area dropzone di bawah, ATAU salin baris data di Excel lalu tempelkan di kotak teks yang disediakan.
                             </p>
                           </div>
                         </div>

                         {/* Column Rules Guideline Alert Banner */}
                         <div className="bg-emerald-950/20 border border-emerald-500/20 p-3 rounded-lg text-[11px] space-y-1">
                           <p className="font-bold text-emerald-400 flex items-center gap-1">
                             <AlertCircle size={12} />
                             Ketentuan Penting Agar Data Terbaca Sistem Silakan Diperhatikan:
                           </p>
                           <ul className="list-disc pl-4 text-slate-300 space-y-1 leading-relaxed font-sans">
                             <li><strong>NIP / Identitas</strong>: Harus diisi NIP 18 digit untuk PNS/PPPK atau nomor KTP (NIK) untuk Pegawai Non ASN.</li>
                             <li><strong>Status Pegawai</strong>: Hanya isi dengan <code className="bg-black/30 px-1 py-0.5 rounded text-teal-400">PNS</code>, <code className="bg-black/30 px-1 py-0.5 rounded text-teal-400">PPPK Penuh Waktu</code>, <code className="bg-black/30 px-1 py-0.5 rounded text-teal-400">PPPK Paruh Waktu</code>, atau <code className="bg-black/30 px-1 py-0.5 rounded text-teal-400">Non ASN</code>.</li>
                             <li><strong>Rumpun Jabatan</strong>: Hanya isi dengan <code className="bg-black/30 px-1 py-0.5 rounded text-teal-400">Struktural</code>, <code className="bg-black/30 px-1 py-0.5 rounded text-teal-400">Jafung Kesehatan</code>, atau <code className="bg-black/30 px-1 py-0.5 rounded text-teal-400">Staf Umum</code>.</li>
                             <li><strong>Format Tanggal Lahir</strong>: Wajib berformat <code className="bg-black/30 px-1 py-0.5 rounded text-amber-400 font-mono">YYYY-MM-DD</code> (contoh: 1993-04-20).</li>
                           </ul>
                         </div>
                       </div>

                       {/* Target Unit Organization display/locking */}
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-[#16161a] border border-white/5 rounded-xl gap-2 text-xs">
                         <div className="space-y-0.5">
                           <p className="font-bold text-slate-300">Unit Penempatan Kerja</p>
                           <p className="text-[10px] text-slate-500">Mendistribusikan / memasangkan direktori pegawai hasil impor secara murni.</p>
                         </div>
                         {currentRole === 'admin_dinkes' ? (
                           <select
                             value={newUnitId}
                             onChange={(e) => {
                               const nextUnitId = Number(e.target.value);
                               setNewUnitId(nextUnitId);
                               handleExcelPasteChange(excelPasteText);
                             }}
                             className="p-1 px-3.5 border border-white/10 rounded-lg font-bold text-xs bg-black/40 text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                           >
                             {dbState.puskesmas.map(p => (
                               <option key={p.id} value={p.id}>{p.nama_puskesmas}</option>
                             ))}
                           </select>
                         ) : (
                           <div className="px-3 py-1.5 bg-emerald-950/40 border border-emerald-500/20 rounded-lg text-emerald-400 font-bold text-[11px]">
                             {getPuskesmasName(selectedPuskesmasId || 1)} (Mengikat Sesuai Akun Unit Anda)
                           </div>
                         )}
                       </div>

                       {/* Excel File Upload Drag-and-Drop Area */}
                       <div className="p-5 border-2 border-dashed border-white/10 hover:border-emerald-500/50 rounded-xl bg-[#16161a]/40 text-center space-y-2 group transition-all duration-200">
                         <input
                           type="file"
                           id="excel-file-upload-picker"
                           accept=".xlsx,.xls,.csv"
                           className="hidden"
                           onChange={(e) => {
                             const file = e.target.files?.[0];
                             if (file) {
                               handleExcelFileSelectXlsx(file);
                             }
                           }}
                         />
                         <label htmlFor="excel-file-upload-picker" className="cursor-pointer block space-y-1.5">
                           <div className="mx-auto w-10 h-10 rounded-full bg-emerald-950/40 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                             📊
                           </div>
                           <p className="text-xs text-slate-300 font-medium group-hover:text-emerald-400 transition-colors">
                             Seret &amp; Letakkan berkas template di sini, atau <strong className="text-emerald-400 underline">Pilih Berkas Excel (.xlsx, .xls)</strong>
                           </p>
                           <p className="text-[10px] text-slate-500">Aplikasi akan mengurai kolom spreadsheet secara otomatis dan instan</p>
                         </label>
                       </div>

                       {/* Copy-Paste area */}
                       <div className="space-y-1.5 font-sans">
                         <div className="flex justify-between items-center text-xs">
                           <label className="font-bold text-slate-400">Atau Tempel Baris Spreadsheet Excel Di Sini:</label>
                           <span className="text-[10px] text-slate-500">Mendeteksi format salin sel excel otomatis</span>
                         </div>
                         <textarea
                           rows={5}
                           value={excelPasteText}
                           onChange={(e) => handleExcelPasteChange(e.target.value)}
                           placeholder="NIP / Identitas [Tab] Nama Lengkap [Tab] Gelar Belakang [Tab] Jenis Kelamin [Tab] Status Pegawai [Tab] Rumpun Jabatan [Tab] Golongan Ruang [Tab] Tanggal Lahir [Tab] Sisa Cuti"
                           className="w-full p-2.5 bg-black/30 text-white border border-white/5 rounded-xl font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                         />
                         {excelImportMessage && (
                           <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg mt-1 font-sans">
                             {excelImportMessage}
                           </div>
                         )}
                       </div>

                       {/* Render Parsed list preview */}
                       {excelParsedPreview.length > 0 && (
                         <div className="space-y-2">
                           <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Pratinjau Hasil Pembacaan ({excelParsedPreview.length} baris):</p>
                           <div className="max-h-52 overflow-y-auto border border-white/5 rounded-xl text-[11px]">
                             <table className="w-full text-left">
                               <thead className="bg-[#16161a] text-slate-400 font-sans">
                                 <tr>
                                   <th className="p-2">NIP / Identitas</th>
                                   <th className="p-2">Nama Lengkap &amp; Gelar</th>
                                   <th className="p-2">Gender</th>
                                   <th className="p-2">Status &amp; Rumpun</th>
                                   <th className="p-2">Golongan</th>
                                   <th className="p-2">Lahir</th>
                                   <th className="p-2">Unit Penempatan</th>
                                 </tr>
                               </thead>
                               <tbody className="divide-y divide-white/5 bg-black/20 text-slate-300">
                                 {excelParsedPreview.map((x, i) => (
                                   <tr key={i} className="hover:bg-white/[0.02]">
                                     <td className="p-2 font-mono text-[10px] text-slate-400">{x.nip}</td>
                                     <td className="p-2 font-bold text-white">
                                       {x.nama_lengkap}{x.gelar_belakang ? `, ${x.gelar_belakang}` : ''}
                                     </td>
                                     <td className="p-2">{x.jenis_kelamin === 'L' ? 'L' : 'P'}</td>
                                     <td className="p-2">
                                       <div className="flex flex-col gap-0.5">
                                         <span className="px-1.5 py-0.5 rounded text-[9px] bg-teal-950/45 text-teal-400 font-mono w-max">
                                           {x.status_pegawai_detail}
                                         </span>
                                         <span className="text-[9px] text-slate-400">
                                           {x.jenis_pegawai}
                                         </span>
                                       </div>
                                     </td>
                                     <td className="p-2 font-mono font-bold text-teal-400">{x.golongan_ruang}</td>
                                     <td className="p-2 font-mono text-slate-400">{x.tanggal_lahir}</td>
                                     <td className="p-2 font-medium text-slate-300">{getPuskesmasName(x.id_puskesmas)}</td>
                                   </tr>
                                 ))}
                               </tbody>
                             </table>
                           </div>

                           <div className="flex justify-end pt-2">
                             <button
                               onClick={handleSaveBulkExcelImport}
                               className="px-6 py-2 bg-emerald-650 hover:bg-emerald-700 text-white font-bold rounded-lg transition text-xs font-sans shadow-lg shadow-emerald-950/50"
                             >
                               Selesaikan &amp; Simpan {excelParsedPreview.length} Pegawai
                             </button>
                           </div>
                         </div>
                       )}
                     </div>
                   )}

                </div>
              )}

              {/* Roster Table Filter Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#0f0f12] p-4 border border-white/5 rounded-xl text-xs">
                
                <div className="flex flex-wrap items-center gap-3">
                  
                  {/* Select Status filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold block">Status Kepegawaian</label>
                    <select
                      value={rosterStatusFilter}
                      onChange={(e) => setRosterStatusFilter(e.target.value)}
                      className="p-2 border border-slate-300 bg-white text-black rounded-lg focus:outline-none font-semibold"
                    >
                      <option value="ALL">Semua Jenis Status</option>
                      <option value="PNS">Pegawai Negeri Sipil (PNS)</option>
                      <option value="PPPK_Penuh_Waktu">PPPK Penuh Waktu</option>
                      <option value="PPPK_Paruh_Waktu">PPPK Paruh Waktu</option>
                      <option value="Non_ASN">PKWT / Non-ASN</option>
                    </select>
                  </div>

                  {/* Sub-Jenis Jabatan (SDMK) Filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-500 uppercase font-bold block">Sub-Jenis Jabatan (SDMK)</label>
                    <select
                      value={rosterSubJenisJabatanFilter}
                      onChange={(e) => setRosterSubJenisJabatanFilter(e.target.value)}
                      className="p-2 border border-slate-300 bg-white text-black rounded-lg focus:outline-none font-semibold"
                    >
                      <option value="ALL">Semua Sub-Jenis Jabatan</option>
                      <option value="TENAGA_MEDIS">Tenaga Medis (Dokter/drg)</option>
                      <option value="TENAGA_KEPERAWATAN">Tenaga Keperawatan (Perawat)</option>
                      <option value="TENAGA_KEBIDANAN">Tenaga Kebidanan (Bidan)</option>
                      <option value="TENAGA_KEFARMASIAN">Tenaga Kefarmasian (Apoteker/TTK)</option>
                      <option value="TENAGA_KESLING_PROMKES">Tenaga Kes. Masyarakat &amp; Sanitasi</option>
                      <option value="TENAGA_GIZI">Tenaga Gizi</option>
                      <option value="TENAGA_KETEKNISAN_MEDIS">Tenaga Keteknisan Medis &amp; Biomedis</option>
                      <option value="TENAGA_ADMINISTRASI">Tenaga Administrasi &amp; Pendukung</option>
                    </select>
                  </div>

                  {/* Dinkes Center only - Filter Unit Kerja */}
                  {currentRole === 'admin_dinkes' && (
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-bold block">Pilih Unit Kerja</label>
                      <select
                        value={rosterUnitFilter}
                        onChange={(e) => {
                          const val = e.target.value;
                          setRosterUnitFilter(val === 'ALL' ? 'ALL' : Number(val));
                        }}
                        className="p-2 border border-slate-300 bg-white text-black rounded-lg focus:outline-none font-bold"
                      >
                        <option value={100}>UPT Puskesmas Sedau</option>
                        <option value="ALL">Semua Unit Kerja (UPT Puskesmas Sedau)</option>
                        {dbState.puskesmas.filter(pk => pk.id !== 100).map(pk => (
                          <option key={pk.id} value={pk.id}>{pk.nama_puskesmas}</option>
                        ))}
                      </select>
                    </div>
                  )}

                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase font-bold block">Cari Pegawai (NIP/Nama)</label>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Cari nama, NIP, jafung..."
                      value={rosterSearch}
                      onChange={(e) => setRosterSearch(e.target.value)}
                      className="pl-8 pr-4 py-1.5 border border-white/5 bg-[#16161a] text-white rounded-xl text-xs w-60 focus:ring-1 focus:ring-emerald-500 focus:outline-none block"
                    />
                  </div>
                </div>

              </div>

              {/* Pegawai Database Table */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-sm">
                <table className="w-full text-left text-xs text-slate-800 border-collapse min-w-[1200px] bg-white">
                  <thead className="bg-slate-50 text-[10px] text-slate-600 uppercase font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-3 text-slate-700 w-12 text-center">NO</th>
                      <th className="p-3 text-slate-700">NAMA PEGAWAI / IDENTITAS</th>
                      <th className="p-3 font-bold text-slate-700">GOLONGAN STATUS</th>
                      <th className="p-3 text-slate-700">GENDER</th>
                      <th className="p-3 text-slate-700">JABATAN RUMPUN</th>
                      <th className="p-3 text-slate-700">UNIT PENEMPATAN</th>
                      <th className="p-3 text-emerald-800 font-bold">TMT GOLONGAN / PANGKAT</th>
                      <th className="p-3 text-cyan-800 font-bold">TMT JABATAN (JAFUNG)</th>
                      <th className="p-3 text-amber-800 font-bold">TMT GAJI BERKALA (KGB)</th>
                      <th className="p-3 border-r border-slate-200 text-slate-700">SISA CUTI TAHUNAN</th>
                      <th className="p-3 text-center text-slate-700">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredRoster.map((asn, idx) => {
                      const displayStatus = asn.status_pegawai_detail === 'PNS' 
                        ? 'PNS' 
                        : asn.status_pegawai_detail === 'PPPK_Penuh_Waktu' 
                          ? 'PPPK Penuh Waktu' 
                          : asn.status_pegawai_detail === 'PPPK_Paruh_Waktu' 
                            ? 'PPPK Paruh Waktu' 
                            : 'PKWT / Non-ASN';

                      // TMT calculations
                      const tmtPangkatLama = asn.status_pegawai_detail === 'PNS' 
                        ? (asn.pns_tmt_golongan || asn.tmt_pangkat_terakhir) 
                        : asn.status_pegawai_detail.startsWith('PPPK')
                          ? (asn.pppk_tmt_golongan || asn.tmt_pangkat_terakhir)
                          : (asn.pkwt_tmt_sk || asn.tmt_pangkat_terakhir || '-');
                      
                      const tmtPangkatBaru = (tmtPangkatLama && tmtPangkatLama !== '-') 
                        ? addYearsToDateString(tmtPangkatLama, 4) 
                        : '-';

                      const isJafung = asn.jenis_pegawai === 'Jafung_Kesehatan';
                      const tmtJafungTerakhir = asn.status_pegawai_detail === 'PNS' 
                        ? (asn.pns_tmt_jabatan || asn.tmt_jabatan_terakhir) 
                        : asn.tmt_jabatan_terakhir || '-';

                      // Under Permenpan RB 1/2023, promotion minimum tenure is 3 years
                      const tmtJafungSelanjutnya = (isJafung && tmtJafungTerakhir && tmtJafungTerakhir !== '-') 
                        ? addYearsToDateString(tmtJafungTerakhir, 3) 
                        : '-';

                      const tmtBerkalaTerakhir = asn.tmt_berkala_terakhir || '-';
                      const tmtBerkalaSelanjutnya = (tmtBerkalaTerakhir && tmtBerkalaTerakhir !== '-') 
                        ? addYearsToDateString(tmtBerkalaTerakhir, 2) 
                        : '-';

                      return (
                        <tr key={asn.id} className="hover:bg-slate-50/80 transition text-slate-900 border-b border-slate-100">
                          <td className="p-3 text-center text-slate-400 font-mono font-bold w-12 border-r border-slate-100">
                            {idx + 1}
                          </td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => setSelectedProfileForDetail(asn)}
                              className="text-left font-extrabold text-[#1e293b] hover:text-indigo-600 hover:underline text-[12px] cursor-pointer transition focus:outline-none block"
                              title="Klik untuk melihat detail profil lengkap pegawai"
                            >
                              {asn.nama_lengkap}{asn.gelar_belakang ? `, ${asn.gelar_belakang}` : ''}
                            </button>
                            <div className="text-[10.5px] text-black font-mono mt-0.5 font-bold">NIP {asn.nip}</div>
                            {asn.nomor_wa && (
                              <div className="text-[10px] text-emerald-800 font-mono mt-0.5 font-bold flex items-center gap-1 leading-none">
                                <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                WA: {asn.nomor_wa}
                              </div>
                            )}
                            {(asn.no_str || asn.no_sip) && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {asn.no_str && (
                                  <span className="text-[9px] bg-emerald-50 text-emerald-800 border border-emerald-200 rounded px-1.5 py-0.5 font-bold block" title={`STR Expiry: ${asn.tanggal_akhir_str}`}>
                                    STR: {asn.no_str} {asn.tanggal_akhir_str === 'Seumur Hidup' ? '♾️ Seumur Hidup' : `(s.d. ${formatDate(asn.tanggal_akhir_str || '')})`}
                                  </span>
                                )}
                                {asn.no_sip && (
                                  <span className="text-[9px] bg-teal-50 text-teal-800 border border-teal-200 rounded px-1.5 py-0.5 font-bold block" title={`SIP Expiry: ${asn.tanggal_akhir_sip}`}>
                                    SIP: {asn.no_sip} (s.d. {formatDate(asn.tanggal_akhir_sip || '')})
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col space-y-1">
                              <span className="w-fit bg-slate-100 text-slate-900 border border-slate-250 px-2 py-0.5 rounded font-mono font-black text-[10px]">
                                {asn.golongan_ruang}
                              </span>
                              <span className={`w-fit text-[9.5px] font-black ${asn.status_pegawai_detail === 'PNS' ? 'text-indigo-850' : 'text-teal-850'}`}>
                                {displayStatus}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 font-extrabold text-slate-900">
                            {asn.jenis_kelamin === 'L' ? 'Laki-Laki' : 'Perempuan'}
                          </td>
                          <td className="p-3 text-slate-800">
                            <div className="font-extrabold text-slate-950">{asn.jenis_pegawai.replace("_", " ")}</div>
                            <p className="text-[10px] text-slate-800 mt-0.5 font-bold">{asn.jenjang_jafung || 'Struktural/Staf'}</p>
                          </td>
                          <td className="p-3 font-black text-emerald-800">
                            {getPuskesmasName(asn.id_puskesmas)}
                          </td>
                          
                          {/* 1. TMT GOLONGAN / PANGKAT LAMA & BARU */}
                          <td className="p-3">
                            {asn.status_pegawai_detail !== 'Non_ASN' && tmtPangkatLama && tmtPangkatLama !== '-' ? (
                              <div className="flex flex-col space-y-0.5 text-[11px] leading-tight text-black">
                                <span className="text-black text-[10px] font-bold">Lama: <strong className="text-black font-black font-mono">{formatDate(tmtPangkatLama)}</strong></span>
                                <span className="text-black text-[10px] font-bold">Baru: <strong className="text-black font-black font-mono inline-block" title="Otomatis +4 Tahun">{formatDate(tmtPangkatBaru)}</strong></span>
                              </div>
                            ) : (
                              <span className="text-black font-mono">-</span>
                            )}
                          </td>

                          {/* 2. TMT JABATAN (JAFUNG) TERAKHIR & SELANJUTNYA */}
                          <td className="p-3">
                            {asn.status_pegawai_detail !== 'Non_ASN' && isJafung && tmtJafungTerakhir && tmtJafungTerakhir !== '-' ? (
                              <div className="flex flex-col space-y-0.5 text-[11px] leading-tight text-black">
                                <span className="text-black text-[10px] font-bold">Terakhir: <strong className="text-black font-black font-mono">{formatDate(tmtJafungTerakhir)}</strong></span>
                                <span className="text-black text-[10px] font-bold" title="Min. Syarat Tenure Promosi PermenpanRB 1/2023 (+3 Tahun)">Berikutnya: <strong className="text-black font-black font-mono">{formatDate(tmtJafungSelanjutnya)}</strong></span>
                              </div>
                            ) : (
                              <span className="text-black font-mono" title="Bukan Pejabat Fungsional Kesehatan">-</span>
                            )}
                          </td>

                          {/* 3. TMT BERKALA (KGB) TERAKHIR & SELANJUTNYA */}
                          <td className="p-3">
                            {asn.status_pegawai_detail !== 'Non_ASN' && tmtBerkalaTerakhir && tmtBerkalaTerakhir !== '-' ? (
                              <div className="flex flex-col space-y-0.5 text-[11px] leading-tight text-black">
                                <span className="text-black text-[10px] font-bold">Lama: <strong className="text-black font-black font-mono">{formatDate(tmtBerkalaTerakhir)}</strong></span>
                                <span className="text-black text-[10px] font-bold">Baru: <strong className="text-black font-black font-mono" title="Otomatis KGB +2 Tahun">{formatDate(tmtBerkalaSelanjutnya)}</strong></span>
                              </div>
                            ) : (
                              <span className="text-black font-mono">-</span>
                            )}
                          </td>

                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${asn.sisa_cuti_tahunan > 4 ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-805 border border-amber-200'}`}>
                              {asn.sisa_cuti_tahunan} Hari
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {(currentRole === 'admin_dinkes' || asn.id_puskesmas === selectedPuskesmasId) ? (
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingAsn(asn)}
                                  className="px-2 py-0.5 bg-teal-905 hover:bg-teal-900 border border-teal-700/50 text-teal-200 rounded text-[9.5px] font-bold transition cursor-pointer"
                                  title="Edit data profil pegawai"
                                >
                                  Ubah
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteEmployee(asn.id, asn.nama_lengkap)}
                                  className="px-2 py-0.5 bg-rose-950 hover:bg-rose-900 border border-rose-800/50 text-rose-300 rounded text-[9.5px] font-bold transition cursor-pointer"
                                  title="Hapus pegawai dari unit"
                                >
                                  Hapus
                                </button>
                              </div>
                            ) : (
                              <span className="text-[9px] text-slate-600 block italic">Terbatas</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {filteredRoster.length === 0 && (
                      <tr>
                        <td colSpan={10} className="p-8 text-center text-slate-500 italic">Data Roster Pegawai tidak ditemukan. Silakan tambahkan baru di atas atau ubah filter pencarian.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>

       {/* ======================= MODAL: EDIT EMPLOYEE PROFILE (CRUD) ======================= */}
      {editingAsn && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl max-w-4xl w-full p-6 animate-in fade-in zoom-in-95 duration-200 my-4 flex flex-col max-h-[92vh]">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4 shrink-0">
              <div className="text-left">
                <h4 className="font-bold text-slate-900 font-display text-sm uppercase tracking-wide text-left">Edit Data Pegawai Lombok Barat</h4>
                <p className="text-xs text-slate-500 text-left">Silakan mutakhirkan records kepegawaian bagi #{editingAsn.id}</p>
              </div>
              <button 
                type="button"
                onClick={() => setEditingAsn(null)} 
                className="text-slate-400 hover:text-slate-800 p-1.5 hover:bg-slate-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                let finalAsn = { ...editingAsn };
                if (finalAsn.status_pegawai_detail === 'PNS') {
                  finalAsn.pangkat_nama = GOLONGAN_TO_PANGKAT[finalAsn.golongan_ruang] || finalAsn.pangkat_nama;
                  finalAsn.pns_jenis_kenaikan_pangkat = getNextGolonganDescription(finalAsn.golongan_ruang);
                  finalAsn.pns_tmt_golongan = finalAsn.tmt_pangkat_terakhir;
                  finalAsn.pns_tmt_jabatan = finalAsn.tmt_jabatan_terakhir;
                }
                handleUpdateEmployee(finalAsn);
              }}
              className="text-xs text-slate-700 text-left flex flex-col overflow-hidden"
            >
              <div className="overflow-y-auto pr-2 space-y-6 max-h-[65vh] md:max-h-[70vh]">
                
                {/* I. DATA DASAR PEGAWAI */}
                <div>
                  <h5 className="font-bold text-emerald-800 text-[10.5px] uppercase tracking-wider mb-3 border-b border-slate-150 pb-1">I. Data Dasar Pegawai</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-slate-600 font-semibold block mb-1">Nama Lengkap</label>
                      <input
                        type="text" required
                        value={editingAsn.nama_lengkap}
                        onChange={(e) => setEditingAsn({ ...editingAsn, nama_lengkap: e.target.value })}
                        className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-600 font-semibold block mb-1">NIP (Nomor Induk Pegawai)</label>
                      <input
                        type="text" required
                        value={editingAsn.nip}
                        onChange={(e) => setEditingAsn({ ...editingAsn, nip: e.target.value })}
                        className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-600 font-semibold block mb-1">NIK (Nomor Induk Kependudukan) <span className="text-rose-500 font-bold">*</span></label>
                      <input
                        type="text" required
                        maxLength={16}
                        placeholder="NIK 16 Digit"
                        value={editingAsn.nik || ''}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, ''); // numeric only
                          setEditingAsn({ ...editingAsn, nik: val });
                        }}
                        className={`w-full p-2 border bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs ${(!editingAsn.nik || editingAsn.nik.length !== 16) ? 'border-amber-300 ring-1 ring-amber-100' : 'border-slate-300'}`}
                      />
                      {(!editingAsn.nik || editingAsn.nik.length !== 16) && (
                        <p className="text-[10px] text-amber-600 font-semibold">NIK harus berupa 16 digit angka ({editingAsn.nik?.length || 0}/16)</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-600 font-semibold block mb-1 font-sans">Gelar Belakang (Optional)</label>
                      <input
                        type="text"
                        value={editingAsn.gelar_belakang || ''}
                        onChange={(e) => setEditingAsn({ ...editingAsn, gelar_belakang: e.target.value || null })}
                        className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-600 font-semibold block mb-1">
                        No. WhatsApp Aktif <span className="text-rose-500 font-bold">*</span>
                      </label>
                      <div className="flex rounded-lg overflow-hidden border border-slate-300 bg-white">
                        <span className="inline-flex items-center px-3 bg-slate-100 text-slate-500 border-r border-slate-300 font-mono text-xs select-none">
                          +62
                        </span>
                        <input
                          type="text"
                          required
                          placeholder="81234567890"
                          value={editingAsn.nomor_wa && editingAsn.nomor_wa.startsWith('+62') ? editingAsn.nomor_wa.substring(3) : (editingAsn.nomor_wa || '').replace(/^\+?6?2?/, '')}
                          onChange={(e) => {
                            const normalized = normalizeIndonesianPhoneNumber(e.target.value, true);
                            setEditingAsn({ ...editingAsn, nomor_wa: normalized });
                          }}
                          className="flex-1 p-2 bg-white text-slate-900 outline-none focus:ring-1 focus:ring-teal-500 text-sm font-semibold font-mono"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono">Format terkunci +62 (wajib terisi angka aktif)</p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-600 font-semibold block mb-1">Jenis Kelamin</label>
                      <select
                        value={editingAsn.jenis_kelamin}
                        onChange={(e) => setEditingAsn({ ...editingAsn, jenis_kelamin: e.target.value as JenisKelamin })}
                        className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                      >
                        <option value="L">Laki-Laki</option>
                        <option value="P">Perempuan</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-600 font-semibold block mb-1">Tanggal Lahir</label>
                      <input
                        type="date" required
                        value={editingAsn.tanggal_lahir}
                        onChange={(e) => setEditingAsn({ ...editingAsn, tanggal_lahir: e.target.value })}
                        className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-600 font-semibold block mb-1">Status Detail Kepegawaian</label>
                      <select
                        value={editingAsn.status_pegawai_detail}
                        onChange={(e) => setEditingAsn({ ...editingAsn, status_pegawai_detail: e.target.value as StatusPegawaiDetail })}
                        className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                      >
                        <option value="PNS">PNS (Pegawai Negeri Sipil)</option>
                        <option value="PPPK_Penuh_Waktu">PPPK Penuh Waktu</option>
                        <option value="PPPK_Paruh_Waktu">PPPK Paruh Waktu</option>
                        <option value="Non_ASN">Non-ASN / PKWT</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-600 font-semibold block mb-1">Unit Kerja Penempatan</label>
                      <select
                        value={editingAsn.id_puskesmas}
                        onChange={(e) => setEditingAsn({ ...editingAsn, id_puskesmas: parseInt(e.target.value) })}
                        disabled={currentRole === 'admin_puskesmas'}
                        className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg disabled:opacity-50 disabled:bg-slate-100 disabled:cursor-not-allowed focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                      >
                        {dbState.puskesmas.map(pk => (
                          <option key={pk.id} value={pk.id}>{pk.nama_puskesmas}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-600 font-semibold block mb-1">Rumpun Jabatan</label>
                      <select
                        value={editingAsn.jenis_pegawai}
                        onChange={(e) => setEditingAsn({ ...editingAsn, jenis_pegawai: e.target.value as JenisPegawai })}
                        className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                      >
                        <option value="Jafung_Kesehatan">Jabatan Fungsional (Jafung Kesehatan)</option>
                        <option value="Struktural">Pejabat Struktural</option>
                        <option value="Staf_Umum">Staf Administrasi / Umum</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-emerald-800 font-semibold block mb-1">Profesi Kesehatan (SDMK)</label>
                      <select
                        value={editingAsn.id_profesi || 1}
                        onChange={(e) => setEditingAsn({ ...editingAsn, id_profesi: parseInt(e.target.value) })}
                        className="w-full p-2 border border-emerald-300 bg-emerald-50/30 text-emerald-950 rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition font-bold shadow-xs"
                      >
                        {dbState.profesiSdmk.map(p => (
                          <option key={p.id} value={p.id}>{p.nama_profesi}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-slate-600 font-semibold block mb-1">Jenjang Jafung <span className="text-[10px] text-teal-600 font-normal block mt-0.5">(bisa lebih cepat apabila AK tercukupi)</span></label>
                      <select
                        value={editingAsn.jenjang_jafung || 'Ahli Pertama'}
                        onChange={(e) => setEditingAsn({ ...editingAsn, jenjang_jafung: e.target.value })}
                        className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                      >
                        <option value="Terampil">Terampil</option>
                        <option value="Mahir">Mahir</option>
                        <option value="Penyelia">Penyelia</option>
                        <option value="Ahli Pertama">Ahli Pertama</option>
                        <option value="Ahli Muda">Ahli Muda</option>
                        <option value="Ahli Madya">Ahli Madya</option>
                      </select>
                    </div>

                    {editingAsn.status_pegawai_detail !== 'Non_ASN' && (
                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Golongan Ruang <span className="text-[10px] text-teal-600 font-normal block mt-0.5">(bisa lebih cepat apabila AK tercukupi)</span></label>
                        <select
                          value={editingAsn.golongan_ruang}
                          onChange={(e) => setEditingAsn({ ...editingAsn, golongan_ruang: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        >
                          <optgroup label="Golongan PNS">
                            {LIST_GOLONGAN_PNS.map(g => (
                              <option key={g} value={g}>{g} - {GOLONGAN_TO_PANGKAT[g]}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Golongan PPPK">
                            {Array.from({ length: 17 }, (_, i) => `Golongan ${i + 1}`).map(g => (
                              <option key={g} value={g}>{g}</option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-slate-600 font-semibold block mb-1">Sisa Cuti Tahunan (Hari)</label>
                      <input
                        type="number" required
                        value={editingAsn.sisa_cuti_tahunan}
                        onChange={(e) => setEditingAsn({ ...editingAsn, sisa_cuti_tahunan: parseInt(e.target.value) || 0 })}
                        disabled={currentRole !== 'admin_dinkes'}
                        className={`w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg ${currentRole !== 'admin_dinkes' ? 'opacity-60 cursor-not-allowed bg-slate-50 text-slate-500 border-slate-200' : 'focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none'}`}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-emerald-800 font-semibold block mb-1">TMT Pangkat Terakhir / Lama</label>
                      <input
                        type="date" required
                        value={editingAsn.tmt_pangkat_terakhir}
                        onChange={(e) => setEditingAsn({ ...editingAsn, tmt_pangkat_terakhir: e.target.value })}
                        className="w-full p-2 border border-emerald-300 bg-emerald-50/20 text-emerald-950 font-bold rounded-lg focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition font-medium shadow-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-cyan-800 font-semibold block mb-1">TMT Jabatan Terakhir</label>
                      <input
                        type="date" required
                        value={editingAsn.tmt_jabatan_terakhir}
                        onChange={(e) => setEditingAsn({ ...editingAsn, tmt_jabatan_terakhir: e.target.value })}
                        className="w-full p-2 border border-cyan-300 bg-cyan-50/20 text-cyan-950 font-bold rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition font-medium shadow-xs"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-amber-800 font-semibold block mb-1">TMT Gaji Berkala Terakhir</label>
                      <input
                        type="date" required
                        value={editingAsn.tmt_berkala_terakhir}
                        onChange={(e) => setEditingAsn({ ...editingAsn, tmt_berkala_terakhir: e.target.value })}
                        className="w-full p-2 border border-amber-300 bg-amber-50/20 text-amber-950 font-bold rounded-lg focus:ring-1 focus:ring-amber-500 focus:border-amber-500 outline-none transition font-medium shadow-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* II. DETAIL SPESIFIK STATUS KEPEGAWAIAN */}
                {editingAsn.status_pegawai_detail === 'PNS' && (
                  <div className="border-t border-slate-200 pt-5 space-y-4 animate-in fade-in duration-200">
                    <h5 className="font-bold text-indigo-800 text-[10.5px] uppercase tracking-wider border-b border-indigo-100 pb-1">II. Informasi PNS (Regulasi BKN)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Pangkat Nama <span className="text-[10px] text-teal-600 font-normal block mt-0.5">(bisa lebih cepat apabila AK tercukupi)</span></label>
                        <input
                          type="text"
                          disabled={editingAsn.jenis_pegawai === 'Jafung_Kesehatan'}
                          value={editingAsn.pangkat_nama || GOLONGAN_TO_PANGKAT[editingAsn.golongan_ruang] || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pangkat_nama: e.target.value })}
                          className={`w-full p-2 border rounded-lg font-bold transition font-medium shadow-xs ${
                            editingAsn.jenis_pegawai === 'Jafung_Kesehatan'
                              ? 'border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed shadow-inner'
                              : 'border-slate-300 bg-white text-slate-900 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none'
                          }`}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Jenis Kenaikan Pangkat <span className="text-[10px] text-teal-600 font-normal block mt-0.5">(Gunakan Pilihan / Reguler)</span></label>
                        <input
                          type="text"
                          disabled={editingAsn.jenis_pegawai === 'Jafung_Kesehatan'}
                          value={editingAsn.pns_jenis_kenaikan_pangkat || getNextGolonganDescription(editingAsn.golongan_ruang)}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pns_jenis_kenaikan_pangkat: e.target.value })}
                          className={`w-full p-2 border rounded-lg font-bold transition font-medium shadow-xs ${
                            editingAsn.jenis_pegawai === 'Jafung_Kesehatan'
                              ? 'border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed shadow-inner'
                              : 'border-slate-300 bg-white text-slate-900 focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none'
                          }`}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Masa Kerja Golongan</label>
                        <input
                          type="text"
                          value={editingAsn.pns_masa_kerja_golongan || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pns_masa_kerja_golongan: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                          placeholder="Contoh: 05 tahun 02 bulan"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">No. Pertimbangan Teknis BKN</label>
                        <input
                          type="text"
                          value={editingAsn.pns_no_pertek_bkn || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pns_no_pertek_bkn: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Tgl Pertimbangan Teknis BKN</label>
                        <input
                          type="date"
                          value={editingAsn.pns_tgl_pertek_bkn || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pns_tgl_pertek_bkn: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Nomor SK Pangkat</label>
                        <input
                          type="text"
                          value={editingAsn.pns_no_sk || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pns_no_sk: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Tanggal SK Pangkat</label>
                        <input
                          type="date"
                          value={editingAsn.pns_tgl_sk || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pns_tgl_sk: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Nama Jabatan Penuh</label>
                        <input
                          type="text"
                          value={editingAsn.pns_nama_jabatan || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pns_nama_jabatan: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                          placeholder="e.g. Perawat Ahli Pertama"
                        />
                      </div>

                      {editingAsn.jenis_pegawai === 'Jafung_Kesehatan' ? (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-slate-600 font-semibold block mb-1">Jenis Jabatan</label>
                            <select
                              value={editingAsn.pns_jenis_jabatan || 'Jabatan Fungsional'}
                              onChange={(e) => setEditingAsn({ ...editingAsn, pns_jenis_jabatan: e.target.value })}
                              className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                            >
                              <option value="Jabatan Fungsional">Jabatan Fungsional</option>
                              <option value="Struktural">Struktural</option>
                              <option value="Umum">Umum</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-slate-600 font-semibold block mb-1">Nomor SK Jabatan</label>
                            <input
                              type="text"
                              value={editingAsn.pns_no_sk_jabatan || ''}
                              onChange={(e) => setEditingAsn({ ...editingAsn, pns_no_sk_jabatan: e.target.value })}
                              className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-slate-600 font-semibold block mb-1">Tanggal SK Jabatan</label>
                            <input
                              type="date"
                              value={editingAsn.pns_tgl_sk_jabatan || ''}
                              onChange={(e) => setEditingAsn({ ...editingAsn, pns_tgl_sk_jabatan: e.target.value })}
                              className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="space-y-1.5">
                          <label className="text-slate-600 font-semibold block mb-1">Nomenklatur Instansi Pembina Pegawai</label>
                          <input
                            type="text"
                            value={editingAsn.pns_instansi_pembina || ''}
                            onChange={(e) => setEditingAsn({ ...editingAsn, pns_instansi_pembina: e.target.value })}
                            className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                            placeholder="Contoh: Badan Kepegawaian Negara (BKN)"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(editingAsn.status_pegawai_detail === 'PPPK_Penuh_Waktu' || editingAsn.status_pegawai_detail === 'PPPK_Paruh_Waktu') && (
                  <div className="border-t border-slate-200 pt-5 space-y-4 animate-in fade-in duration-200">
                    <h5 className="font-bold text-emerald-800 text-[10.5px] uppercase tracking-wider border-b border-emerald-100 pb-1">II. Informasi PPPK</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Nomor Induk PPPK (NI PPPK)</label>
                        <input
                          type="text"
                          value={editingAsn.pppk_ni || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pppk_ni: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Nomor Perjanjian Kerja</label>
                        <input
                          type="text"
                          value={editingAsn.pppk_no_perjanjian || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pppk_no_perjanjian: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Tanggal Perjanjian Kerja</label>
                        <input
                          type="date"
                          value={editingAsn.pppk_tgl_perjanjian || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pppk_tgl_perjanjian: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Tanggal Mulai Perjanjian</label>
                        <input
                          type="date"
                          value={editingAsn.pppk_tmt_perjanjian_mulai || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pppk_tmt_perjanjian_mulai: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Tanggal Selesai Perjanjian</label>
                        <input
                          type="date"
                          value={editingAsn.pppk_tmt_perjanjian_selesai || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pppk_tmt_perjanjian_selesai: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">TMT Golongan PPPK</label>
                        <input
                          type="date"
                          value={editingAsn.pppk_tmt_golongan || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pppk_tmt_golongan: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Nomor SK PPPK</label>
                        <input
                          type="text"
                          value={editingAsn.pppk_no_sk || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pppk_no_sk: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Tanggal SK PPPK</label>
                        <input
                          type="date"
                          value={editingAsn.pppk_tgl_sk || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pppk_tgl_sk: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Jabatan Terdaftar</label>
                        <input
                          type="text"
                          value={editingAsn.pppk_jabatan || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pppk_jabatan: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {editingAsn.status_pegawai_detail === 'Non_ASN' && (
                  <div className="border-t border-slate-200 pt-5 space-y-4 animate-in fade-in duration-200">
                    <h5 className="font-bold text-amber-800 text-[10.5px] uppercase tracking-wider border-b border-amber-100 pb-1">II. Informasi PKWT &amp; Non-ASN</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-slate-400 font-semibold block mb-1">Nomor NIK KTP <span className="text-[10px] text-slate-400 font-normal font-sans">(Input di Data Dasar)</span></label>
                        <input
                          type="text" disabled
                          value={editingAsn.nik || ''}
                          className="w-full p-2 border border-slate-200 bg-slate-50 text-slate-500 rounded-lg outline-none font-medium text-xs cursor-not-allowed"
                          placeholder="Terisi otomatis dari Data Dasar"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Nomor SK Kontrak / Tugas</label>
                        <input
                          type="text"
                          value={editingAsn.pkwt_no_sk_kontrak || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pkwt_no_sk_kontrak: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Tanggal SK Kontrak</label>
                        <input
                          type="date"
                          value={editingAsn.pkwt_tgl_sk_kontrak || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pkwt_tgl_sk_kontrak: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">TMT Mulai Kontrak</label>
                        <input
                          type="date"
                          value={editingAsn.pkwt_tmt_sk || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pkwt_tmt_sk: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Masa Kerja Penugasan</label>
                        <input
                          type="text"
                          value={editingAsn.pkwt_masa_kerja || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pkwt_masa_kerja: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                          placeholder="e.g. 02 tahun 00 bulan"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Sumber Pembiayaan Jasa</label>
                        <select
                          value={editingAsn.pkwt_pembiayaan || 'BLUD'}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pkwt_pembiayaan: e.target.value as 'APBD' | 'BLUD' | 'APBN' })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        >
                          <option value="APBD">APBD Lombok Barat</option>
                          <option value="BLUD">BLUD Unit Puskesmas</option>
                          <option value="APBN">APBN Pusat</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-slate-600 font-semibold block mb-1">Jabatan Pelayanan</label>
                        <input
                          type="text"
                          value={editingAsn.pkwt_jabatan || ''}
                          onChange={(e) => setEditingAsn({ ...editingAsn, pkwt_jabatan: e.target.value })}
                          className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* III. ARSIP MANDATORI STR & SIP KESEHATAN */}
                {editingAsn.jenis_pegawai === 'Jafung_Kesehatan' && (
                  <div className="border-t border-slate-200 pt-5">
                    <h5 className="font-bold text-slate-800 text-[10.5px] uppercase tracking-wider mb-2 border-b border-slate-200 pb-1 mb-4">III. Arsip Mandatori STR &amp; SIP Kesehatan</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* STR */}
                      <div className="p-4 bg-slate-50 border border-slate-200 shadow-sm rounded-xl space-y-3">
                        <h4 className="text-xs font-bold text-emerald-800 border-b border-slate-200 pb-1">Arsip STR (Surat Tanda Registrasi)</h4>
                        <div className="space-y-1">
                          <label className="text-slate-500 font-semibold mb-0.5 text-[10px]">Nomor STR</label>
                          <input
                            type="text"
                            value={editingAsn.no_str || ''}
                            onChange={(e) => setEditingAsn({ ...editingAsn, no_str: e.target.value })}
                            className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-slate-500 font-semibold mb-0.5 text-[10px]">Tgl Terbit STR</label>
                            <input
                              type="date"
                              value={editingAsn.tanggal_terbit_str || ''}
                              onChange={(e) => setEditingAsn({ ...editingAsn, tanggal_terbit_str: e.target.value })}
                              className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between items-center mb-0.5">
                              <label className="text-slate-500 font-semibold mb-0.5 text-[10px]">Tgl Akhir STR</label>
                              <label className="flex items-center space-x-1 cursor-pointer text-emerald-700 select-none">
                                <input
                                  type="checkbox"
                                  checked={editingAsn.is_str_seumur_hidup || false}
                                  onChange={(e) => {
                                    const isChecked = e.target.checked;
                                    setEditingAsn({
                                      ...editingAsn,
                                      is_str_seumur_hidup: isChecked,
                                      tanggal_akhir_str: isChecked ? 'Seumur Hidup' : ''
                                    });
                                  }}
                                  className="accent-emerald-600 rounded scale-90"
                                />
                                <span className="text-[9px] font-bold">Seumur Hidup</span>
                              </label>
                            </div>
                            <input
                              type="date"
                              disabled={editingAsn.is_str_seumur_hidup || false}
                              value={editingAsn.is_str_seumur_hidup ? '' : (editingAsn.tanggal_akhir_str || '')}
                              onChange={(e) => setEditingAsn({ ...editingAsn, tanggal_akhir_str: e.target.value })}
                              className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg disabled:opacity-40 text-xs focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* SIP */}
                      <div className="p-4 bg-slate-50 border border-slate-200 shadow-sm rounded-xl space-y-3">
                        <h4 className="text-xs font-bold text-teal-800 border-b border-slate-200 pb-1">Arsip SIP (Surat Izin Praktik)</h4>
                        <div className="space-y-1">
                          <label className="text-slate-500 font-semibold mb-0.5 text-[10px]">Nomor SIP</label>
                          <input
                            type="text"
                            value={editingAsn.no_sip || ''}
                            onChange={(e) => setEditingAsn({ ...editingAsn, no_sip: e.target.value })}
                            className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-slate-500 font-semibold mb-0.5 text-[10px]">Tgl Terbit SIP</label>
                            <input
                              type="date"
                              value={editingAsn.tanggal_terbit_sip || ''}
                              onChange={(e) => setEditingAsn({ ...editingAsn, tanggal_terbit_sip: e.target.value })}
                              className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-slate-500 font-semibold mb-0.5 text-[10px]">Tgl Akhir SIP</label>
                            <input
                              type="date"
                              value={editingAsn.tanggal_akhir_sip || ''}
                              onChange={(e) => setEditingAsn({ ...editingAsn, tanggal_akhir_sip: e.target.value })}
                              className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg text-xs focus:ring-1 focus:ring-teal-500 focus:border-teal-500 outline-none transition font-medium shadow-xs"
                            />
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* IV. DATA KP4 & MODEL DK (TUNJANGAN KELUARGA ASN) */}
                {editingAsn.status_pegawai_detail !== 'Non_ASN' && (
                  <div className="border-t border-slate-200 pt-5 space-y-5 animate-in fade-in duration-200">
                    <div className="flex justify-between items-center border-b border-rose-100 pb-1.5 flex-wrap gap-2">
                      <h5 className="font-bold text-rose-800 text-[10.5px] uppercase tracking-wider">
                        IV. Data KP4 &amp; Model DK (Tunjangan Keluarga ASN)
                      </h5>
                      <span className="text-[9px] font-sans font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full inline-flex items-center space-x-1">
                        <span>🛡️ Proteksi Temuan BPK Aktif</span>
                      </span>
                    </div>

                    <p className="text-[10.5px] text-slate-500 font-sans leading-relaxed">
                      Lengkapi data KP4 (Daftar Keluarga) tahunan untuk menentukan besaran tunjangan suami/istri (10%) dan tunjangan anak (2% per anak, maks 2 anak). Sistem ini dilengkapi model validasi otomatis sesuai <strong>PP 7/1977, PP 51/1992, dan Surat Edaran BKN</strong> untuk mendeteksi dini data tidak valid sebelum menjadi temuan administratif BPK.
                    </p>

                    <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 space-y-4">
                      {/* Sub-A: Status Perkawinan & Pasangan */}
                      <div className="space-y-3">
                        <h6 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center space-x-1 border-b border-slate-200 pb-1">
                          <span>A. Status Perkawinan &amp; Pasangan</span>
                        </h6>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-slate-600 font-semibold block text-[11px]">Status Pernikahan</label>
                            <select
                              value={editingAsn.kp4_status_pernikahan || 'Belum Kawin'}
                              onChange={(e) => {
                                const status = e.target.value as any;
                                setEditingAsn({ 
                                  ...editingAsn, 
                                  kp4_status_pernikahan: status,
                                  ...(status === 'Belum Kawin' || status === 'Cerai Hidup' || status === 'Cerai Mati' ? {
                                    kp4_nama_pasangan: '',
                                    kp4_nik_pasangan: '',
                                    kp4_pasangan_asn: false,
                                    kp4_pasangan_nip: '',
                                    kp4_pasangan_kerja_instansi: '',
                                    kp4_pasangan_tunjangan_diklaim: false
                                  } : {})
                                });
                              }}
                              className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-teal-500"
                            >
                              <option value="Belum Kawin">Belum Kawin (Lajang)</option>
                              <option value="Kawin">Kawin (Menikah Aktif)</option>
                              <option value="Cerai Hidup">Cerai Hidup (Duda/Janda Hukum)</option>
                              <option value="Cerai Mati">Cerai Hidup / Mati (Menikgal Dunia)</option>
                            </select>
                          </div>

                          {(editingAsn.kp4_status_pernikahan === 'Kawin') && (
                            <>
                              <div className="space-y-1">
                                <label className="text-slate-600 font-semibold block text-[11px]">Nama Pasangan (Suami/Istri)</label>
                                <input
                                  type="text"
                                  value={editingAsn.kp4_nama_pasangan || ''}
                                  onChange={(e) => setEditingAsn({ ...editingAsn, kp4_nama_pasangan: e.target.value })}
                                  className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg text-xs"
                                  placeholder="Nama Lengkap Pasangan"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-slate-600 font-semibold block text-[11px]">NIK Pasangan</label>
                                <input
                                  type="text"
                                  maxLength={16}
                                  value={editingAsn.kp4_nik_pasangan || ''}
                                  onChange={(e) => setEditingAsn({ ...editingAsn, kp4_nik_pasangan: e.target.value.replace(/\D/g, '') })}
                                  className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg text-xs font-mono"
                                  placeholder="16 Digit NIK"
                                />
                              </div>
                            </>
                          )}
                        </div>

                        {(editingAsn.kp4_status_pernikahan === 'Kawin') && (
                          <div className="p-3 bg-slate-100/50 border border-slate-200/80 rounded-lg space-y-3 mt-2">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editingAsn.kp4_pasangan_asn || false}
                                  onChange={(e) => setEditingAsn({ 
                                    ...editingAsn, 
                                    kp4_pasangan_asn: e.target.checked,
                                    ...(!e.target.checked ? { kp4_pasangan_nip: '', kp4_pasangan_kerja_instansi: '' } : {})
                                  })}
                                  className="accent-teal-700"
                                />
                                <span>Pasangan adalah ASN (PNS / PPPK / TNI / POLRI / BUMN)</span>
                              </label>

                              <label className="flex items-center space-x-2 text-xs font-semibold text-rose-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={editingAsn.kp4_pasangan_tunjangan_diklaim || false}
                                  onChange={(e) => setEditingAsn({ ...editingAsn, kp4_pasangan_tunjangan_diklaim: e.target.checked })}
                                  className="accent-rose-700"
                                />
                                <span className="font-bold underline">Klaim Tunjangan Suami/Istri? (10%)</span>
                              </label>
                            </div>

                            {/* BPK Check: Pasangan ASN + Klaim Pasangan */}
                            {editingAsn.kp4_pasangan_asn && editingAsn.kp4_pasangan_tunjangan_diklaim && (
                              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-[11px] font-sans flex items-start space-x-2 leading-relaxed">
                                <span className="text-sm mt-0.5">⚠️</span>
                                <div>
                                  <p className="font-extrabold text-amber-900 uppercase">RESIKO TEMUAN BPK (POTENSI DOUBLE-FUNDING)</p>
                                  <p className="font-medium">Sesuai UU APBN &amp; PP 51/1992, apabila suami &amp; istri sama-sama berstatus ASN/pegawai negara, tunjangan suami/istri hanya boleh dibayarkan kepada salah satu pihak yang gajinya lebih tinggi. Klaim ganda akan didata sebagai <strong>kerugian daerah wajib setor balik</strong> oleh BPK.</p>
                                </div>
                              </div>
                            )}

                            {editingAsn.kp4_pasangan_asn && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                <div className="space-y-1">
                                  <label className="text-slate-500 font-semibold block text-[10.5px]">NIP Pasangan ASN</label>
                                  <input
                                    type="text"
                                    value={editingAsn.kp4_pasangan_nip || ''}
                                    onChange={(e) => setEditingAsn({ ...editingAsn, kp4_pasangan_nip: e.target.value })}
                                    className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg text-xs font-mono"
                                    placeholder="NIP Pasangan"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-slate-500 font-semibold block text-[10.5px]">Instansi / Tempat Kerja</label>
                                  <input
                                    type="text"
                                    value={editingAsn.kp4_pasangan_kerja_instansi || ''}
                                    onChange={(e) => setEditingAsn({ ...editingAsn, kp4_pasangan_kerja_instansi: e.target.value })}
                                    className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg text-xs"
                                    placeholder="e.g. RSUD Tripat / Puskesmas lain"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Sub-B: Daftar Anak Tertanggung */}
                      <div className="space-y-3 border-t border-slate-200 pt-3">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                          <h6 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider">
                            B. Anak Kandung / Angkat Tertanggung Tunjangan (Maks 2 Anak)
                          </h6>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Tunjangan: {(() => {
                              try {
                                const arr = JSON.parse(editingAsn.kp4_daftar_anak || '[]');
                                return arr.filter((child: any) => child.tunjangan_diklaim).length;
                              } catch(e) { return 0; }
                            })()}/2 Anak Diklaim
                          </span>
                        </div>

                        {/* List Anak yang Sudah Ada */}
                        <div className="space-y-2">
                          {(() => {
                            let list: KP4Anak[] = [];
                            try {
                              list = JSON.parse(editingAsn.kp4_daftar_anak || '[]');
                            } catch(e) { list = []; }

                            if (list.length === 0) {
                              return <p className="text-xs text-slate-400 italic py-2 text-center bg-slate-100 rounded-lg border border-dashed border-slate-200">Belum ada data anak di daftar KP4. Gunakan formulir di bawah untuk menambahkan.</p>;
                            }

                            // Count how many children are claimed
                            const claimedCount = list.filter(c => c.tunjangan_diklaim).length;

                            return (
                              <div className="space-y-2">
                                {claimedCount > 2 && (
                                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[10.5px] font-medium flex items-center space-x-1.5 leading-relaxed">
                                    <span>⚠️</span>
                                    <span><strong>ATURAN BPK (TEMUAN POTENSIAL):</strong> Jumlah anak yang dituntut tunjungan melebihi batas regulasi <strong>(Max 2 Anak)</strong> sesuai PP 51/1992. Hal ini sering menjadi temuan khusus BPK. Silakan nonaktifkan centang tunjangan pada beberapa anak.</span>
                                  </div>
                                )}

                                <div className="overflow-x-auto rounded-lg border border-slate-200">
                                  <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                      <tr className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                                        <th className="p-2">Nama &amp; NIK</th>
                                        <th className="p-2">Tgl Lahir / Umur</th>
                                        <th className="p-2">Status Sekolah / SKKS</th>
                                        <th className="p-2">Status Tunjangan</th>
                                        <th className="p-2 text-center w-12">Hapus</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 bg-white">
                                      {list.map((child) => {
                                        // Calculate Age
                                        let age = 0;
                                        if (child.tanggal_lahir) {
                                          const bYear = new Date(child.tanggal_lahir).getFullYear();
                                          age = 2026 - bYear; // Using fixed 2026 current year for precision
                                        }

                                        // BPK checks for this child
                                        const ageTooHigh = age > 25;
                                        const statusIneligible = child.status_sekolah === 'Bekerja' || child.status_sekolah === 'Menikah';
                                        const needsSkks = age >= 21 && age <= 25;
                                        const skksMissing = needsSkks && (!child.has_skks || child.status_sekolah !== 'Sekolah/Kuliah');

                                        const anyBpkIssue = (child.tunjangan_diklaim) && (ageTooHigh || statusIneligible || skksMissing);

                                        return (
                                          <tr key={child.id} className={`hover:bg-slate-50 transition ${anyBpkIssue ? 'bg-amber-50/40' : ''}`}>
                                            <td className="p-2">
                                              <p className="font-bold text-slate-900">{child.nama}</p>
                                              <p className="text-[10px] font-mono text-slate-500">NIK: {child.nik}</p>
                                            </td>
                                            <td className="p-2 whitespace-nowrap">
                                              <p className="font-semibold">{child.tanggal_lahir}</p>
                                              <p className={`text-[10px] font-bold ${ageTooHigh ? 'text-rose-600' : 'text-slate-600'}`}>
                                                Umur: {age} Tahun {ageTooHigh && ' (Batas Max 25)'}
                                              </p>
                                            </td>
                                            <td className="p-2">
                                              <span className="font-semibold block">{child.status_sekolah}</span>
                                              {needsSkks ? (
                                                child.has_skks ? (
                                                  <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-150">✓ SKKS: {child.skks_nomor || '-'}</span>
                                                ) : (
                                                  <span className="text-[9.5px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-150">⚠️ SKKS Kuliah Absen</span>
                                                )
                                              ) : (
                                                <span className="text-[10px] text-slate-400">Tidak wajib SKKS (&lt;21 Th)</span>
                                              )}
                                            </td>
                                            <td className="p-2">
                                              <div className="flex flex-col space-y-1">
                                                <label className="flex items-center space-x-1.5 text-[10.5px] font-semibold text-slate-700 cursor-pointer">
                                                  <input
                                                    type="checkbox"
                                                    checked={child.tunjangan_diklaim}
                                                    disabled={ageTooHigh || statusIneligible}
                                                    onChange={(e) => {
                                                      const updatedList = list.map(c => c.id === child.id ? { ...c, tunjangan_diklaim: e.target.checked } : c);
                                                      setEditingAsn({ ...editingAsn, kp4_daftar_anak: JSON.stringify(updatedList) });
                                                    }}
                                                    className="accent-rose-700"
                                                  />
                                                  <span className={child.tunjangan_diklaim ? 'text-rose-700 font-bold' : 'text-slate-400'}>
                                                    {child.tunjangan_diklaim ? '✓ Dituntut Tunjangan' : 'Tidak Dituntut'}
                                                  </span>
                                                </label>

                                                {/* BPK Warning Indicators */}
                                                {child.tunjangan_diklaim && (
                                                  <>
                                                    {ageTooHigh && (
                                                      <span className="text-[9px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded border border-red-200 block w-fit">🔴 TEMUAN BPK: &gt; 25 Th dilarang tunjangan</span>
                                                    )}
                                                    {statusIneligible && (
                                                      <span className="text-[9px] font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded border border-red-200 block w-fit">🔴 TEMUAN BPK: Menikah/Bekerja dilarang tunjangan</span>
                                                    )}
                                                    {skksMissing && (
                                                      <span className="text-[9px] font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-200 block w-fit">⚠️ TEMUAN BPK: Usia kuliah + wajib SKKS</span>
                                                    )}
                                                  </>
                                                )}
                                              </div>
                                            </td>
                                            <td className="p-2 text-center">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  const filtered = list.filter(c => c.id !== child.id);
                                                  setEditingAsn({ ...editingAsn, kp4_daftar_anak: JSON.stringify(filtered) });
                                                }}
                                                className="text-slate-400 hover:text-rose-600 transition cursor-pointer p-1"
                                                title="Hapus Anak"
                                              >
                                                🗑️
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Inline Form Add Child */}
                        <div className="bg-white border border-slate-200 p-3.5 rounded-xl space-y-3.5 mt-2 shadow-xs">
                          <p className="text-[10.5px] font-bold text-slate-700 flex items-center space-x-1.5">
                            <span className="bg-teal-50 border border-teal-200 h-5 w-5 rounded-full flex items-center justify-center text-teal-800 text-[10px]">＋</span>
                            <span>Tambah Anak Baru ke KP4</span>
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="space-y-0.5">
                              <label className="text-[10px] text-slate-500 font-bold">Nama Anak</label>
                              <input
                                type="text"
                                value={newChildName || ''}
                                onChange={(e) => setNewChildName(e.target.value)}
                                className="w-full p-2 border border-slate-300 text-slate-800 bg-slate-50/50 rounded-lg text-xs"
                                placeholder="Nama Lengkap Anak"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[10px] text-slate-500 font-bold">NIK Anak (16 Digit)</label>
                              <input
                                type="text"
                                maxLength={16}
                                value={newChildNik || ''}
                                onChange={(e) => setNewChildNik(e.target.value.replace(/\D/g, ''))}
                                className="w-full p-2 border border-slate-300 text-slate-800 bg-slate-50/50 rounded-lg text-xs font-mono"
                                placeholder="NIK"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[10px] text-slate-500 font-bold">Tanggal Lahir</label>
                              <input
                                type="date"
                                value={newChildDob || ''}
                                onChange={(e) => setNewChildDob(e.target.value)}
                                className="w-full p-2 border border-slate-300 text-slate-800 bg-slate-50/50 rounded-lg text-xs"
                              />
                            </div>
                            <div className="space-y-0.5">
                              <label className="text-[10px] text-slate-500 font-bold">Status Hubungan/Sekolah</label>
                              <select
                                value={newChildSchool}
                                onChange={(e) => setNewChildSchool(e.target.value as any)}
                                className="w-full p-2 border border-slate-300 text-slate-800 bg-slate-50/50 rounded-lg text-xs"
                              >
                                <option value="Sekolah/Kuliah">Sekolah / Kuliah</option>
                                <option value="Tidak Sekolah">Tidak Sekolah (Msh Balita)</option>
                                <option value="Bekerja">Sudah Bekerja</option>
                                <option value="Menikah">Sudah Menikah</option>
                              </select>
                            </div>
                          </div>

                          {/* Conditional SKKS Fields */}
                          {newChildSchool === 'Sekolah/Kuliah' && (
                            <div className="p-3 bg-teal-50/30 border border-teal-100 rounded-lg space-y-3.5">
                              <label className="flex items-center space-x-2 text-xs font-semibold text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newChildSkks}
                                  onChange={(e) => setNewChildSkks(e.target.checked)}
                                  className="accent-teal-700"
                                />
                                <span className="text-teal-950">Memiliki Surat Keterangan Kuliah/Sekolah (SKKS) Aktif</span>
                              </label>

                              {newChildSkks && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-5">
                                  <div className="space-y-0.5">
                                    <label className="text-[10px] text-teal-800 font-bold">Nomor SKKS</label>
                                    <input
                                      type="text"
                                      value={newChildSkksNo || ''}
                                      onChange={(e) => setNewChildSkksNo(e.target.value)}
                                      className="w-full p-1.5 border border-teal-200 text-slate-800 bg-white rounded-md text-xs font-mono"
                                      placeholder="e.g. 523/UN18/DT/2026"
                                    />
                                  </div>
                                  <div className="space-y-0.5">
                                    <label className="text-[10px] text-teal-800 font-bold">Tanggal Terbit SKKS</label>
                                    <input
                                      type="date"
                                      value={newChildSkksDate || ''}
                                      onChange={(e) => setNewChildSkksDate(e.target.value)}
                                      className="w-full p-1.5 border border-teal-200 text-slate-800 bg-white rounded-md text-xs"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex justify-between items-center bg-slate-55 p-2 rounded-lg">
                            <label className="flex items-center space-x-1.5 text-xs font-bold text-rose-700 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newChildClaimed}
                                disabled={newChildSchool === 'Bekerja' || newChildSchool === 'Menikah'}
                                onChange={(e) => setNewChildClaimed(e.target.checked)}
                                className="accent-rose-700 font-bold"
                              />
                              <span>Centang untuk klaim hak tunjangan untuk anak ini</span>
                            </label>

                            <button
                              type="button"
                              onClick={() => {
                                if (!newChildName) {
                                  alert('Nama anak mohon diisi');
                                  return;
                                }
                                if (newChildNik.length !== 16) {
                                  alert('NIK anak wajib 16 digit angka');
                                  return;
                                }
                                if (!newChildDob) {
                                  alert('Tanggal lahir anak wajib ditentukan');
                                  return;
                                }

                                let list: KP4Anak[] = [];
                                try {
                                  list = JSON.parse(editingAsn.kp4_daftar_anak || '[]');
                                } catch(e) { list = []; }

                                const newlyAdded: KP4Anak = {
                                  id: list.length > 0 ? Math.max(...list.map(c => c.id)) + 1 : 1,
                                  nama: newChildName,
                                  nik: newChildNik,
                                  tanggal_lahir: newChildDob,
                                  status_sekolah: newChildSchool,
                                  has_skks: newChildSkks,
                                  skks_nomor: newChildSkks ? newChildSkksNo : undefined,
                                  skks_tanggal_terbit: newChildSkks ? newChildSkksDate : undefined,
                                  tunjangan_diklaim: newChildClaimed && newChildSchool !== 'Bekerja' && newChildSchool !== 'Menikah'
                                };

                                const newList = [...list, newlyAdded];
                                setEditingAsn({
                                  ...editingAsn,
                                  kp4_daftar_anak: JSON.stringify(newList)
                                });

                                // Clear forms
                                setNewChildName('');
                                setNewChildNik('');
                                setNewChildDob('');
                                setNewChildSchool('Sekolah/Kuliah');
                                setNewChildSkks(false);
                                setNewChildSkksNo('');
                                setNewChildSkksDate('');
                                setNewChildClaimed(true);
                              }}
                              className="px-4 py-1.5 bg-teal-800 hover:bg-teal-900 border border-teal-950 text-white font-bold rounded-lg text-[11px] transition cursor-pointer"
                            >
                              Sematkan Anak
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Sub-C: Periode Berkas & Scan KP4 */}
                      <div className="space-y-3 border-t border-slate-200 pt-3">
                        <h6 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center space-x-1 border-b border-slate-200 pb-1">
                          <span>C. Tanggal Pengesahan Tahunan &amp; Scan KP4</span>
                        </h6>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-slate-600 font-semibold block text-[11px]">Tahun Validasi KP4</label>
                            <select
                              value={editingAsn.kp4_tahun_validasi || 2026}
                              onChange={(e) => setEditingAsn({ ...editingAsn, kp4_tahun_validasi: parseInt(e.target.value) })}
                              className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg text-xs font-semibold"
                            >
                              <option value="2026">Tahun Anggaran 2026 (Tahun Berjalan)</option>
                              <option value="2025">Tahun Anggaran 2025 (Arsip Lama)</option>
                              <option value="2024">Tahun Anggaran 2024 (Arsip Kedaluwarsa)</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-slate-600 font-semibold block text-[11px]">Tanggal Tandatangan KP4</label>
                            <input
                              type="date"
                              value={editingAsn.kp4_tanggal_validasi || ''}
                              onChange={(e) => setEditingAsn({ ...editingAsn, kp4_tanggal_validasi: e.target.value })}
                              className="w-full p-2 border border-slate-300 bg-white text-slate-900 rounded-lg text-xs"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-slate-600 font-semibold block text-[11px]">Scan Fisik Formulir KP4 (PDF/Gambar)</label>
                            <div className="flex items-center space-x-2">
                              <input
                                type="file"
                                id="kp4_file_picker"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setEditingAsn({
                                      ...editingAsn,
                                      kp4_berkas_file_name: file.name,
                                      kp4_berkas_file_path: 'data:application/pdf;base64,sample'
                                    });
                                  }
                                }}
                              />
                              <label
                                htmlFor="kp4_file_picker"
                                className="px-3 py-2 border border-slate-300 hover:bg-slate-50 bg-white rounded-lg text-xs font-bold text-slate-700 cursor-pointer flex-1 text-center transition"
                              >
                                {editingAsn.kp4_berkas_file_name ? `✓ ${editingAsn.kp4_berkas_file_name}` : 'Pilih Berkas Scan'}
                              </label>
                              {editingAsn.kp4_berkas_file_name && (
                                <button
                                  type="button"
                                  onClick={() => setEditingAsn({ ...editingAsn, kp4_berkas_file_name: undefined, kp4_berkas_file_path: undefined })}
                                  className="text-rose-600 hover:bg-rose-50 px-2.5 py-2 border border-rose-200 rounded-lg text-xs font-bold"
                                >
                                  Reset
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* BPK Check: Tahun Validasi Out-of-date */}
                        {editingAsn.kp4_tahun_validasi && editingAsn.kp4_tahun_validasi !== 2026 && (
                          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-[11px] font-sans flex items-start space-x-2 leading-relaxed mt-2 animate-pulse">
                            <span className="text-sm mt-0.5">🚨</span>
                            <div>
                              <p className="font-extrabold text-rose-900 uppercase">TEMUAN BPK: KP4 BELUM DIPERBARUI TAHUN BERJALAN</p>
                              <p className="font-medium">Instruksi Dirjen Anggaran BKN menerangkan formulir KP4/Model DK wajib disetor kembali setiap tahun anggaran (January - February). Dokumen tahun {editingAsn.kp4_tahun_validasi} dikategorikan sebagai berkas kedaluwarsa oleh auditor BPK.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

              </div>

              <div className="flex justify-end items-center space-x-3 mt-6 pt-4 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingAsn(null)}
                  className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold shadow-md transition cursor-pointer font-bold"
                >
                  Simpan Profil Pegawai
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================= MODAL: DETAIL PEGAWAI ======================= */}
      {selectedProfileForDetail && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-4xl w-full my-8 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            
            {/* Header ID Card Section */}
            <div className="relative bg-gradient-to-r from-emerald-50 via-teal-50/50 to-slate-50 p-6 md:p-8 border-b border-slate-200 text-slate-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center space-x-4">
                <div className="h-14 w-14 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 font-bold text-xl uppercase shadow-sm">
                  {selectedProfileForDetail.nama_lengkap.charAt(0)}
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg md:text-xl font-bold font-display text-slate-900">
                      {selectedProfileForDetail.nama_lengkap}
                      {selectedProfileForDetail.gelar_belakang ? `, ${selectedProfileForDetail.gelar_belakang}` : ''}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${
                      selectedProfileForDetail.status_pegawai_detail === 'PNS' 
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                        : selectedProfileForDetail.status_pegawai_detail === 'PPPK_Penuh_Waktu'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : selectedProfileForDetail.status_pegawai_detail === 'PPPK_Paruh_Waktu'
                            ? 'bg-teal-50 text-teal-700 border border-teal-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {selectedProfileForDetail.status_pegawai_detail === 'PNS' 
                        ? 'PNS' 
                        : selectedProfileForDetail.status_pegawai_detail === 'PPPK_Penuh_Waktu' 
                          ? 'PPPK Penuh Waktu' 
                          : selectedProfileForDetail.status_pegawai_detail === 'PPPK_Paruh_Waktu' 
                            ? 'PPPK Paruh Waktu' 
                            : 'PKWT / Non-ASN'}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-600">
                    {selectedProfileForDetail.status_pegawai_detail.startsWith('PPPK') ? (
                      selectedProfileForDetail.pppk_ni ? `NI PPPK. ${selectedProfileForDetail.pppk_ni}` : 'NI PPPK Belum Diisi'
                    ) : selectedProfileForDetail.status_pegawai_detail === 'PNS' ? (
                      `NIP. ${selectedProfileForDetail.nip}`
                    ) : (
                      selectedProfileForDetail.nik ? `NIK. ${selectedProfileForDetail.nik}` : 'NIK Belum Diisi'
                    )}
                  </div>
                  <div className="mt-1">
                    <p className="text-xs text-emerald-800 font-semibold bg-emerald-50/70 border border-emerald-100/80 px-2.5 py-1 rounded-lg w-fit">
                      Unit Penempatan: {getPuskesmasName(selectedProfileForDetail.id_puskesmas)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Close Button Top Right */}
              <button 
                onClick={() => setSelectedProfileForDetail(null)}
                className="absolute top-4 right-4 md:static text-slate-400 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                title="Tutup detail"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable details container */}
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto max-h-[60vh] bg-white text-slate-800">
              
              {/* Bento Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                
                {/* Section 1: Identitas Personal */}
                <div className="bg-slate-50 border border-slate-200 shadow-sm rounded-xl p-4 space-y-3.5">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1.5 flex items-center space-x-1.55">
                    <Users size={13} className="text-emerald-600" />
                    <span>Identitas Personal</span>
                  </h4>
                  <div className="space-y-2.5">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Tempat / Tanggal Lahir</span>
                      <span className="text-xs font-semibold text-slate-900">{selectedProfileForDetail.tanggal_lahir ? formatDate(selectedProfileForDetail.tanggal_lahir) : '-'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Jenis Kelamin</span>
                      <span className="text-xs font-semibold text-slate-900">{selectedProfileForDetail.jenis_kelamin === 'L' ? 'Laki-Laki' : 'Perempuan'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Status Kepegawaian</span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-lg w-fit flex items-center space-x-1 mt-0.5">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping mr-1"></span>
                        <span>{selectedProfileForDetail.status_kepegawaian.replace('_', ' ')}</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">No. WhatsApp Aktif</span>
                      {selectedProfileForDetail.nomor_wa ? (
                        <div className="flex items-center space-x-1 mt-0.5">
                          <span className="text-xs font-bold text-slate-900 bg-emerald-55 border border-slate-200 px-2 py-0.5 rounded font-mono">
                            {selectedProfileForDetail.nomor_wa}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">Belum diinput</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 2: Posisi & Rumpun Jabatan */}
                <div className="bg-slate-50 border border-slate-200 shadow-sm rounded-xl p-4 space-y-3.5">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1.5 flex items-center space-x-1.5">
                    <CheckCircle size={13} className="text-teal-600" />
                    <span>Jabatan & Penugasan</span>
                  </h4>
                  <div className="space-y-2.5">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Rumpun Pegawai</span>
                      <span className="text-xs font-semibold text-slate-900">{selectedProfileForDetail.jenis_pegawai.replace('_', ' ')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Jenjang Jafung / Peran</span>
                      <span className="text-xs font-semibold text-slate-900">{selectedProfileForDetail.jenjang_jafung || 'Struktural / Staf'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Golongan & Ruang (Pangkat)</span>
                      <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 border border-slate-250 px-2.5 py-0.5 rounded w-fit inline-block">{selectedProfileForDetail.golongan_ruang || '-'}</span>
                    </div>
                    {selectedProfileForDetail.jenis_pegawai === 'Jafung_Kesehatan' && (
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Angka Kredit Integrasi (2022)</span>
                        <span className="text-xs font-mono font-bold text-slate-900">{selectedProfileForDetail.ak_integrasi_2022 || 0} pt</span>
                      </div>
                    )}
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Sisa Jatah Cuti Tahunan</span>
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-150 w-fit inline-block">{selectedProfileForDetail.sisa_cuti_tahunan || 0} Hari</span>
                    </div>
                  </div>
                </div>

                {/* Section 3: Legalitas STR & SIP */}
                <div className="bg-slate-50 border border-slate-200 shadow-sm rounded-xl p-4 space-y-3.5 col-span-1 md:col-span-2 lg:col-span-1">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-1.5 flex items-center space-x-1.5">
                    <FolderCheck size={13} className="text-blue-600" />
                    <span>Legalitas Tenaga Kesehatan</span>
                  </h4>
                  <div className="space-y-3.5">
                    
                    {/* STR */}
                    <div className="border-l-2 border-emerald-500/55 pl-2.5 space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Surat Tanda Registrasi (STR)</span>
                      {selectedProfileForDetail.no_str ? (
                        <>
                          <span className="text-xs font-mono font-extrabold text-slate-950 block bg-white border border-slate-200 px-2 py-1 rounded">No: {selectedProfileForDetail.no_str}</span>
                          <span className="text-[10.5px] text-slate-600 block">
                            Masa Berlaku: {selectedProfileForDetail.is_str_seumur_hidup || selectedProfileForDetail.tanggal_akhir_str === 'Seumur Hidup' ? (
                              <strong className="text-sky-700 font-sans font-bold">♾️ Seumur Hidup</strong>
                            ) : (
                              <span className="text-slate-600 font-medium">s.d. {formatDate(selectedProfileForDetail.tanggal_akhir_str || '')}</span>
                            )}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-rose-700 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded font-bold block w-fit">⚠️ Belum memiliki STR</span>
                      )}
                    </div>

                    {/* SIP */}
                    <div className="border-l-2 border-teal-500/55 pl-2.5 space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Surat Izin Praktik (SIP)</span>
                      {selectedProfileForDetail.no_sip ? (
                        <>
                          <span className="text-xs font-mono font-extrabold text-slate-950 block bg-white border border-slate-200 px-2 py-1 rounded">No: {selectedProfileForDetail.no_sip}</span>
                          <span className="text-[10.5px] text-slate-600 block">
                            Masa Berlaku: s.d. <span className="font-medium text-slate-700">{formatDate(selectedProfileForDetail.tanggal_akhir_sip || '')}</span>
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-rose-700 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded font-bold block w-fit">⚠️ Belum memiliki SIP</span>
                      )}
                    </div>

                  </div>
                </div>

              </div>

              {/* Contextual Card: PNS, PPPK, or PKWT Specific Details */}
              <div className="w-full">
                {selectedProfileForDetail.status_pegawai_detail === 'PNS' && (
                  <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 md:p-6 space-y-4">
                    <h4 className="text-xs font-bold text-indigo-800 uppercase tracking-wider flex items-center space-x-2 border-b border-indigo-100 pb-2">
                      <Shield size={14} className="text-indigo-600" />
                      <span>Berkas Administrasi PNS (Pegawai Negeri Sipil)</span>
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-xs font-medium">
                      <div>
                        <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide block pb-0.5">Nama Pangkat</span>
                        <span className="text-slate-900 font-bold text-xs">{selectedProfileForDetail.pangkat_nama || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide block pb-0.5">TMT Pangkat Terakhir</span>
                        <span className="text-slate-900 font-mono text-xs">{selectedProfileForDetail.pns_tmt_golongan ? formatDate(selectedProfileForDetail.pns_tmt_golongan) : formatDate(selectedProfileForDetail.tmt_pangkat_terakhir)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide block pb-0.5">Masa Kerja Golongan (MKG)</span>
                        <span className="text-slate-900 text-xs">{selectedProfileForDetail.pns_masa_kerja_golongan || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide block pb-0.5">Jenis Kenaikan Pangkat Terakhir</span>
                        <span className="text-slate-900 text-xs">{selectedProfileForDetail.pns_jenis_kenaikan_pangkat || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide block pb-0.5">Nomor Pertek BKN</span>
                        <span className="text-slate-900 font-mono text-xs">{selectedProfileForDetail.pns_no_pertek_bkn || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide block pb-0.5">Tanggal Pertek BKN</span>
                        <span className="text-slate-900 text-xs">{selectedProfileForDetail.pns_tgl_pertek_bkn ? formatDate(selectedProfileForDetail.pns_tgl_pertek_bkn) : '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide block pb-0.5">Nomor SK Pangkat (Terakhir)</span>
                        <span className="text-slate-900 font-mono text-xs">{selectedProfileForDetail.pns_no_sk || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide block pb-0.5">Tanggal SK Pangkat</span>
                        <span className="text-slate-900 text-xs">{selectedProfileForDetail.pns_tgl_sk ? formatDate(selectedProfileForDetail.pns_tgl_sk) : '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide block pb-0.5">Nama Jabatan</span>
                        <span className="text-slate-900 font-bold text-xs">{selectedProfileForDetail.pns_nama_jabatan || '-'}</span>
                      </div>
                      {selectedProfileForDetail.jenis_pegawai === 'Jafung_Kesehatan' ? (
                        <>
                          <div>
                            <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide block pb-0.5">Jenis Jabatan</span>
                            <span className="text-slate-900 text-xs">{selectedProfileForDetail.pns_jenis_jabatan || '-'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide block pb-0.5">Nomor SK Jabatan</span>
                            <span className="text-slate-900 font-mono text-xs">{selectedProfileForDetail.pns_no_sk_jabatan || '-'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide block pb-0.5">Tanggal SK Jabatan</span>
                            <span className="text-slate-900 text-xs">{selectedProfileForDetail.pns_tgl_sk_jabatan ? formatDate(selectedProfileForDetail.pns_tgl_sk_jabatan) : '-'}</span>
                          </div>
                        </>
                      ) : (
                        <div>
                          <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wide block pb-0.5">Nomenklatur Instansi Pembina Pegawai</span>
                          <span className="text-slate-900 font-bold text-xs">{selectedProfileForDetail.pns_instansi_pembina || 'Badan Kepegawaian Negara / Kementerian Kesehatan'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedProfileForDetail.status_pegawai_detail.startsWith('PPPK') && (
                  <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 md:p-6 space-y-4 font-sans">
                    <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center space-x-2 border-b border-emerald-100 pb-2">
                      <Shield size={14} className="text-emerald-600" />
                      <span>Berkas Perjanjian Kerja PPPK ({selectedProfileForDetail.status_pegawai_detail === 'PPPK_Penuh_Waktu' ? 'Penuh Waktu' : 'Paruh Waktu'})</span>
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-xs font-medium">
                      <div>
                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide block pb-0.5">Nomor Induk PPPK (NI PPPK)</span>
                        <span className="text-slate-900 font-mono font-bold text-xs">{selectedProfileForDetail.pppk_ni || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide block pb-0.5">Nomor Perjanjian Kontrak</span>
                        <span className="text-slate-900 font-mono text-xs">{selectedProfileForDetail.pppk_no_perjanjian || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide block pb-0.5">Tanggal Perjanjian</span>
                        <span className="text-slate-900 text-xs">{selectedProfileForDetail.pppk_tgl_perjanjian ? formatDate(selectedProfileForDetail.pppk_tgl_perjanjian) : '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide block pb-0.5">Masa Kontrak Berlaku</span>
                        <span className="text-emerald-700 font-bold text-xs">
                          {selectedProfileForDetail.pppk_tmt_perjanjian_mulai ? formatDate(selectedProfileForDetail.pppk_tmt_perjanjian_mulai) : '-'} s.d. {selectedProfileForDetail.pppk_tmt_perjanjian_selesai ? formatDate(selectedProfileForDetail.pppk_tmt_perjanjian_selesai) : '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide block pb-0.5">TMT Golongan Terakhir</span>
                        <span className="text-slate-900 font-mono text-xs">{selectedProfileForDetail.pppk_tmt_golongan ? formatDate(selectedProfileForDetail.pppk_tmt_golongan) : '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide block pb-0.5">Nomor SK Pengangkatan PPPK</span>
                        <span className="text-slate-900 font-mono text-xs">{selectedProfileForDetail.pppk_no_sk || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide block pb-0.5">Tanggal SK Pengangkatan</span>
                        <span className="text-slate-900 text-xs">{selectedProfileForDetail.pppk_tgl_sk ? formatDate(selectedProfileForDetail.pppk_tgl_sk) : '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide block pb-0.5">Jabatan Ditugaskan</span>
                        <span className="text-slate-900 font-bold text-xs">{selectedProfileForDetail.pppk_jabatan || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide block pb-0.5">Golongan</span>
                        <span className="text-emerald-800 font-mono font-bold bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded w-fit block mt-1 text-xs">{selectedProfileForDetail.pppk_golongan || '-'}</span>
                      </div>
                      {selectedProfileForDetail.status_pegawai_detail === 'PPPK_Paruh_Waktu' && (
                        <>
                          <div>
                            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide block pb-0.5">Target Jam Kerja/Minggu</span>
                            <span className="text-slate-900 font-bold text-xs">{selectedProfileForDetail.pppw_jumlah_jam_kerja_per_minggu || '-'} Jam</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wide block pb-0.5">Surat Kesepakatan Jadwal</span>
                            <span className="text-emerald-700 font-bold italic text-xs">{selectedProfileForDetail.pppw_surat_kesepakatan_file ? '✓ Terunggah' : 'Belum Terunggah'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {selectedProfileForDetail.status_pegawai_detail === 'Non_ASN' && (
                  <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5 md:p-6 space-y-4">
                    <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center space-x-2 border-b border-amber-100 pb-2">
                      <Shield size={14} className="text-amber-600" />
                      <span>Administrasi Pegawai Kontrak Daerah / PKWT (Non-ASN)</span>
                    </h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4 text-xs font-medium">
                      <div>
                        <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wide block pb-0.5">Nomor Induk Kependudukan (NIK)</span>
                        <span className="text-slate-900 font-mono font-bold text-xs">{selectedProfileForDetail.nik || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wide block pb-0.5">Nomor SK Kontrak / Tugas</span>
                        <span className="text-slate-900 font-mono text-xs">{selectedProfileForDetail.pkwt_no_sk_kontrak || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wide block pb-0.5">Tanggal SK Kontrak</span>
                        <span className="text-slate-900 text-xs">{selectedProfileForDetail.pkwt_tgl_sk_kontrak ? formatDate(selectedProfileForDetail.pkwt_tgl_sk_kontrak) : '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wide block pb-0.5">TMT Mulai Kontrak</span>
                        <span className="text-slate-900 font-mono text-xs">{selectedProfileForDetail.pkwt_tmt_sk ? formatDate(selectedProfileForDetail.pkwt_tmt_sk) : '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wide block pb-0.5">Masa Kerja PKWT</span>
                        <span className="text-slate-900 text-xs">{selectedProfileForDetail.pkwt_masa_kerja || '-'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wide block pb-0.5">Sumber Anggaran Gaji</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold w-fit block mt-1 uppercase ${
                          selectedProfileForDetail.pkwt_pembiayaan === 'APBD'
                            ? 'bg-red-50 text-red-700 border border-red-100'
                            : selectedProfileForDetail.pkwt_pembiayaan === 'BLUD'
                              ? 'bg-blue-50 text-blue-700 border border-blue-100'
                              : 'bg-green-50 text-green-700 border border-green-100'
                        }`}>
                          {selectedProfileForDetail.pkwt_pembiayaan || 'Lainnya'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-700 font-bold uppercase tracking-wide block pb-0.5">Deskripsi Jabatan Tugas</span>
                        <span className="text-slate-900 font-bold text-xs">{selectedProfileForDetail.pkwt_jabatan || '-'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* V. DATA INDIKATOR KP4 / MODEL DK (TUNJANGAN KELUARGA ASN) SUMMARY */}
                {selectedProfileForDetail.status_pegawai_detail !== 'Non_ASN' && (
                  <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-5 md:p-6 space-y-4">
                    <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center justify-between border-b border-rose-100 pb-2">
                      <div className="flex items-center space-x-2">
                        <Users size={14} className="text-rose-600" />
                        <span>Tunjangan Keluarga Berdasarkan Berkas KP4 / Model DK ASN</span>
                      </div>
                      <span className="font-mono text-[9px] bg-rose-500/10 text-rose-700 px-2 py-0.5 rounded border border-rose-500/20 font-bold">
                        Tahun Validasi: {selectedProfileForDetail.kp4_tahun_validasi || 'Belum Validasi'}
                      </span>
                    </h4>

                    {/* Husband/Wife section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="p-3 bg-white/70 border border-slate-200/60 rounded-xl space-y-2">
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Tunjangan Suami / Istri (10%)</span>
                        {selectedProfileForDetail.kp4_status_pernikahan === 'Kawin' ? (
                          <div className="space-y-1">
                            <p className="text-xs text-slate-900 font-bold">Nama Pasangan: <span className="text-teal-700">{selectedProfileForDetail.kp4_nama_pasangan || '-'}</span></p>
                            <p className="text-[10px] text-slate-500 font-mono">NIK: {selectedProfileForDetail.kp4_nik_pasangan || '-'}</p>
                            <p className="text-[10px] text-slate-500 font-medium">
                              Pasangan ASN: {selectedProfileForDetail.kp4_pasangan_asn ? `Ya (NIP. ${selectedProfileForDetail.kp4_pasangan_nip || '-'}, Instansi: ${selectedProfileForDetail.kp4_pasangan_kerja_instansi || '-'})` : 'Bukan ASN'}
                            </p>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold block w-fit ${
                              selectedProfileForDetail.kp4_pasangan_tunjangan_diklaim 
                                ? 'bg-emerald-500/10 text-emerald-700' 
                                : 'bg-slate-500/10 text-slate-500'
                            }`}>
                              Status Klaim: {selectedProfileForDetail.kp4_pasangan_tunjangan_diklaim ? '✓ Klaim Tunjangan Suami/Istri' : '✗ Tidak Diklaim'}
                            </span>

                            {/* BPK Violation Warning */}
                            {selectedProfileForDetail.kp4_pasangan_asn && selectedProfileForDetail.kp4_pasangan_tunjangan_diklaim && (
                              <div className="mt-2 p-2 bg-red-100/80 border border-red-200 rounded text-[10px] text-red-900 font-medium space-y-1">
                                <p className="font-extrabold flex items-center space-x-1 uppercase text-[9px]">
                                  <span>⚠️</span> <span>POTENSI TEMUAN GANDA (BPK)</span>
                                </p>
                                <p className="leading-relaxed">Pasangan sesama ASN dilaporkan bertunjangan ganda. Sesuai regulasi satu tunjangan wajib dicabut.</p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-slate-500 italic">Status perkawinan terdata: {selectedProfileForDetail.kp4_status_pernikahan || 'Belum Kawin'}. Tidak ada klaim tunjangan suami/istri.</p>
                        )}
                      </div>

                      {/* Scan Physical Proof Section */}
                      <div className="p-3 bg-white/70 border border-slate-200/60 rounded-xl flex flex-col justify-between">
                        <div className="space-y-1">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Dokumen Scan Fisik KP4</span>
                          {selectedProfileForDetail.kp4_berkas_file_name ? (
                            <div className="space-y-1">
                              <p className="text-xs text-slate-800 font-semibold truncate">✓ {selectedProfileForDetail.kp4_berkas_file_name}</p>
                              <p className="text-[10px] text-slate-500">Formulir ttd basah disahkan Kepala Puskesmas / Pejabat dinkes.</p>
                            </div>
                          ) : (
                            <p className="text-[11px] text-rose-600 font-medium">⚠️ Berkas fisik scan KP4 belum diunggah.</p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-medium">
                          <p>Tanggal Pengesahan: {selectedProfileForDetail.kp4_tanggal_validasi ? formatDate(selectedProfileForDetail.kp4_tanggal_validasi) : 'Belum Ditentukan'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Children allowance check */}
                    <div className="p-3 bg-white/70 border border-slate-200/60 rounded-xl space-y-3 text-xs">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Daftar Anak Tertanggung KP4 (Tunjangan 2% per Anak, Maks 2 Anak)</span>
                      
                      {(() => {
                        let childrenList: any[] = [];
                        try {
                          childrenList = JSON.parse(selectedProfileForDetail.kp4_daftar_anak || '[]');
                        } catch(e) {}

                        if (childrenList.length === 0) {
                          return <p className="text-slate-500 italic py-2 text-center bg-slate-100 rounded">Tidak ada anak yang terdaftar di daftar KP4.</p>;
                        }

                        const claimedCount = childrenList.filter(c => c.tunjangan_diklaim).length;

                        return (
                          <div className="space-y-2">
                            {claimedCount > 2 && (
                              <div className="p-2 bg-red-100/80 border border-red-200 rounded text-[10px] text-red-900 font-semibold uppercase flex items-center space-x-1">
                                <span>⚠️</span>
                                <span>MELEBIHI BATAS MAKSIMAL: PP 51/1992 melarang klaim lebih dari 2 anak. Kelebihan {claimedCount - 2} anak.</span>
                              </div>
                            )}

                            <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto pr-1">
                              {childrenList.map((child: any, idx: number) => {
                                let age = 0;
                                if (child.tanggal_lahir) {
                                  age = 2026 - new Date(child.tanggal_lahir).getFullYear();
                                }

                                const needsSkks = age >= 21 && age <= 25;
                                const isOverage = age > 25;
                                const invalidStatus = child.status_sekolah === 'Bekerja' || child.status_sekolah === 'Menikah';

                                return (
                                  <div key={idx} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="space-y-1">
                                      <div className="flex items-center space-x-2">
                                        <p className="font-bold text-slate-900 text-xs">{child.nama}</p>
                                        <span className="text-[10px] text-slate-500 font-mono">({age} Tahun)</span>
                                        <span className={`px-1.5 py-0.2 rounded text-[9.5px] font-bold ${
                                          child.tunjangan_diklaim 
                                            ? 'bg-indigo-50/100 text-indigo-700 border border-indigo-200' 
                                            : 'bg-slate-150 text-slate-400'
                                        }`}>
                                          {child.tunjangan_diklaim ? 'Claim Tunjangan' : 'No Claim'}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-slate-500 font-mono">NIK: {child.nik || '-'}</p>
                                      <p className="text-[10px] text-slate-500">
                                        Status Sekolah/Kerja: <span className="font-semibold text-slate-800">{child.status_sekolah || '-'}</span>
                                      </p>
                                      {needsSkks && (
                                        <p className="text-[10px] font-medium">
                                          SKKS Aktif Kuliah: {child.has_skks ? <span className="text-emerald-600 font-bold">✓ Terlampir</span> : <span className="text-rose-600 font-bold">⚠️ Belum Terlampir</span>}
                                        </p>
                                      )}
                                    </div>

                                    {/* Warnings list on each child */}
                                    {child.tunjangan_diklaim && (isOverage || invalidStatus || (needsSkks && !child.has_skks)) && (
                                      <div className="p-1 px-2.5 bg-rose-100 border border-rose-200 rounded text-[9.5px] text-rose-900 font-medium max-w-xs space-y-0.5">
                                        <p className="font-bold uppercase text-[8.5px]">Risiko Temuan:</p>
                                        {isOverage && <p>• Umur melebihi batas absolut 25 tahun.</p>}
                                        {invalidStatus && <p>• Berstatus {child.status_sekolah} (gugur hak tunjangan).</p>}
                                        {needsSkks && !child.has_skks && <p>• Surat Keterangan Kuliah (SKKS) wajib ada.</p>}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                  </div>
                )}

              </div>

            </div>

            {/* Footer Actions */}
            <div className="bg-slate-100 px-6 py-5 border-t border-slate-200 flex flex-col sm:flex-row justify-end items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedProfileForDetail(null)}
                className="w-full sm:w-auto px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Tutup Detail
              </button>
              
              {/* Authorized Edit Button */}
              {(currentRole === 'admin_dinkes' || selectedProfileForDetail.id_puskesmas === selectedPuskesmasId) && (
                <button
                  type="button"
                  onClick={() => {
                    const profileToEdit = { ...selectedProfileForDetail };
                    setSelectedProfileForDetail(null);
                    setEditingAsn(profileToEdit);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-teal-700 hover:bg-teal-600 text-white rounded-xl text-xs font-bold transition cursor-pointer flex items-center justify-center space-x-1.5 font-bold"
                >
                  <Sliders size={13} />
                  <span>Ubah Data Pegawai</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ======================= MODAL: CONFIRM DELETE EMPLOYEE ======================= */}
      {asnToDelete && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-50 text-yellow-600 mb-4 border border-yellow-200 animate-pulse">
              <AlertTriangle size={24} />
            </div>
            <h4 className="font-bold text-slate-900 font-display text-base uppercase tracking-wide">Konfirmasi Hapus Pegawai</h4>
            
            <div className="bg-yellow-50/70 border border-yellow-200 rounded-xl p-4 my-3 text-left">
              <p className="text-xs text-slate-800 font-sans leading-relaxed">
                Apakah Anda yakin ingin menghapus nama pegawai <strong className="text-yellow-600 font-bold font-sans">"{asnToDelete.name}"</strong> secara permanen dari database Kabupaten Lombok Barat?
              </p>
              <p className="text-[10px] text-yellow-850 bg-yellow-100 border border-yellow-300/60 p-2 rounded-lg mt-2 font-semibold leading-normal font-sans">
                Tindakan ini tidak dapat dibatalkan. Seluruh records riwayat, berkas, dan profil pegawai akan dihapus permanen.
              </p>
            </div>

            <div className="mt-6 flex space-x-3 justify-center">
              <button
                type="button"
                onClick={() => setAsnToDelete(null)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = asnToDelete.id;
                  const name = asnToDelete.name;
                  const updated = dbState.asnProfiles.filter(p => p.id !== id);
                  updateProfiles(updated);
                  
                  // Also delete directly from Cloudflare D1
                  try {
                    await fetch('/api/d1/delete', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ table: 'asn_profiles', id })
                    });
                  } catch (e) {
                    console.warn("Direct D1 delete call failed, background sync will reconcile:", e);
                  }

                  setAsnToDelete(null);
                  setSuccessToast(`✓ Pegawai "${name}" berhasil dihapus.`);
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

      {/* Sticky / Freeze Footer Copyright matching Header elegance */}
      <footer className="sticky bottom-0 z-30 bg-white/95 backdrop-blur-md border-t border-emerald-100/80 py-2 sm:py-2.5 px-4 text-center text-xs shadow-xs transition-all w-full">
        <p className="text-[11px] sm:text-xs font-bold text-slate-800">
          © 2026 Pemerintah Kabupaten Lombok Barat • UPT Puskesmas Sedau
        </p>
        <p className="text-[9.5px] sm:text-[10px] text-slate-500 font-medium truncate mt-0.5">
          SAPA pegawai UPT Puskesmas Sedau v1.0.0 (Sistem Arsip, Pemberitahuan, &amp; Analisis Kepegawaian UPT Puskesmas Sedau Kab. Lombok Barat) • Decision Support System &amp; Digital Management Platform
        </p>
      </footer>

    </div>
  );
}
