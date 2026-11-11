/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Settings, 
  HelpCircle, 
  FileCheck, 
  Download, 
  AlertTriangle, 
  Printer, 
  Calendar,
  Layers,
  Sparkles,
  X,
  Plus,
  Trash2,
  Edit,
  Upload,
  Database
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  Puskesmas, 
  ASNProfile, 
  MasterProfesiSDMK, 
  LaporanSDMKBulanan 
} from '../../types';
import { getFallbackProfesiId } from '../../mockData';

interface LaporanSDMKProps {
  currentRole: 'admin_dinkes' | 'admin_puskesmas';
  selectedPuskesmasId: number | null;
  puskesmasList: Puskesmas[];
  asnProfiles: ASNProfile[];
  profesiSdmk: MasterProfesiSDMK[];
  laporanSdmk: LaporanSDMKBulanan[];
  onUpdateLaporanSdmk: (updated: LaporanSDMKBulanan[]) => void;
  onUpdateProfesiSdmk?: (updated: MasterProfesiSDMK[]) => void;
  onUpdateAsnProfiles?: (updated: ASNProfile[]) => void;
  renbutList: any[];
  onUpdateRenbutList: (updatedList: any[]) => void;
}

export default function LaporanSDMK({
  currentRole,
  selectedPuskesmasId,
  puskesmasList,
  asnProfiles,
  profesiSdmk,
  laporanSdmk,
  onUpdateLaporanSdmk,
  onUpdateProfesiSdmk,
  onUpdateAsnProfiles,
  renbutList,
  onUpdateRenbutList
}: LaporanSDMKProps) {

  const [filterBulan, setFilterBulan] = useState<number>(6); // Juni
  const [filterTahun, setFilterTahun] = useState<number>(2026);
  const [activePuskesmasForReport, setActivePuskesmasForReport] = useState<number>(
    currentRole === 'admin_dinkes' ? 0 : (selectedPuskesmasId || 1)
  );
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [filterProfesi, setFilterProfesi] = useState<string>('semua');

  const [renbutImportLogs, setRenbutImportLogs] = useState<string>('');
  const [dragOverUploader, setDragOverUploader] = useState<boolean>(false);

  const makeDynamicProjection = (keb: number) => {
    const proj: Record<number, number> = {};
    const startYear = 2023;
    const currentYearVal = new Date().getFullYear();
    for (let yr = startYear; yr <= currentYearVal; yr++) {
      const delta = yr - 2026;
      proj[yr] = Math.max(1, keb + Math.round(delta * 0.4));
    }
    return proj;
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
                id: `import-${idx}-${Date.now()}`,
                id_puskesmas: selectedPuskesmasId || 1, // unit uploading the data
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
            const remaining = renbutList.filter(x => x.id_puskesmas !== (selectedPuskesmasId || 1));
            const updated = [...remaining, ...parsedItems];
            onUpdateRenbutList(updated);
            setRenbutImportLogs(`✓ Berhasil memetakan ${parsedItems.length} data Renbut Kemenkes dari Excel untuk unit Anda!`);
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
              id: `line-${idx}-${Date.now()}`,
              id_puskesmas: selectedPuskesmasId || 1, // unit uploading the data
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
          const remaining = renbutList.filter(x => x.id_puskesmas !== (selectedPuskesmasId || 1));
          const updated = [...remaining, ...parsedItems];
          onUpdateRenbutList(updated);
          setRenbutImportLogs(`✓ Berhasil memetakan ${parsedItems.length} Jabatan Pasca Unggah PDF untuk unit Anda!`);
        } else {
          setRenbutImportLogs(`✓ File terunggah namun tidak ada pengenalan judul nakes standar. Silakan gunakan template terstruktur.`);
        }
      };
      reader.readAsText(file);
    }
  };

  // Synchronize state when admin switches tenant roles
  useEffect(() => {
    setActivePuskesmasForReport(currentRole === 'admin_dinkes' ? 0 : (selectedPuskesmasId || 1));
  }, [currentRole, selectedPuskesmasId]);

  // States & handlers for Master Profesi SDMK CRUD
  const [showManageProfesi, setShowManageProfesi] = useState(false);
  const [newProfesiName, setNewProfesiName] = useState('');
  const [editingProfesiId, setEditingProfesiId] = useState<number | null>(null);
  const [editingProfesiName, setEditingProfesiName] = useState('');
  const [profesiToDelete, setProfesiToDelete] = useState<MasterProfesiSDMK | null>(null);

  const handleCreateProfesi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfesiName.trim()) return;
    if (onUpdateProfesiSdmk) {
      const nextId = profesiSdmk.length > 0 ? Math.max(...profesiSdmk.map(p => p.id)) + 1 : 1;
      const createdItem = { id: nextId, nama_profesi: newProfesiName.trim() };
      const updated = [...profesiSdmk, createdItem];
      onUpdateProfesiSdmk(updated);
      setNewProfesiName('');
      alert(`✓ Rumpun profesi "${createdItem.nama_profesi}" berhasil ditambahkan ke database!`);
    } else {
      alert("Sistem database profesi tidak dapat diakses.");
    }
  };

  const handleUpdateProfesi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfesiName.trim() || editingProfesiId === null) return;
    if (onUpdateProfesiSdmk) {
      const updated = profesiSdmk.map(p => p.id === editingProfesiId ? { ...p, nama_profesi: editingProfesiName.trim() } : p);
      onUpdateProfesiSdmk(updated);
      setEditingProfesiId(null);
      setEditingProfesiName('');
      alert(`✓ Nama rumpun profesi berhasil diubah.`);
    }
  };

  const handleConfirmDeleteProfesi = () => {
    if (!profesiToDelete) return;
    if (onUpdateProfesiSdmk) {
      const updated = profesiSdmk.filter(p => p.id !== profesiToDelete.id);
      onUpdateProfesiSdmk(updated);
      alert(`✓ Rumpun profesi "${profesiToDelete.nama_profesi}" telah dihapus.`);
    }
    setProfesiToDelete(null);
  };

  // Buffer input for editing - now synchronized with employee profiles
  const getInitialTableMatrixRef = (): Record<number, Record<string, number>> => {
    const matrix: Record<number, Record<string, number>> = {};
    const activeStaffInPK = activePuskesmasForReport === 0
      ? asnProfiles.filter(p => p.status_kepegawaian === 'Aktif')
      : asnProfiles.filter(p => p.id_puskesmas === activePuskesmasForReport && p.status_kepegawaian === 'Aktif');

    profesiSdmk.forEach(prof => {
      const dbMatches = activeStaffInPK.filter(p => (p.id_profesi || getFallbackProfesiId(p.nama_lengkap, p.gelar_belakang)) === prof.id);

      let pns_l = 0, pns_p = 0;
      let p3k_pn_l = 0, p3k_pn_p = 0;
      let p3k_pw_l = 0, p3k_pw_p = 0;
      let non_asn_l = 0, non_asn_p = 0;

      dbMatches.forEach(p => {
        if (p.status_pegawai_detail === 'PNS') {
          if (p.jenis_kelamin === 'L') pns_l++; else pns_p++;
        } else if (p.status_pegawai_detail === 'PPPK_Penuh_Waktu') {
          if (p.jenis_kelamin === 'L') p3k_pn_l++; else p3k_pn_p++;
        } else if (p.status_pegawai_detail === 'PPPK_Paruh_Waktu') {
          if (p.jenis_kelamin === 'L') p3k_pw_l++; else p3k_pw_p++;
        } else {
          if (p.jenis_kelamin === 'L') non_asn_l++; else non_asn_p++;
        }
      });

      matrix[prof.id] = {
        pns_l,
        pns_p,
        p3k_pn_l,
        p3k_pn_p,
        p3k_pw_l,
        p3k_pw_p,
        non_asn_l,
        non_asn_p
      };
    });
    return matrix;
  };

  const [inputMatrix, setInputMatrix] = useState<Record<number, Record<string, number>>>(getInitialTableMatrixRef());

  // Trigger loading initial dataset if filter parameters change
  React.useEffect(() => {
    setInputMatrix(getInitialTableMatrixRef());
    setCachedValidation(null);
  }, [filterBulan, filterTahun, activePuskesmasForReport, LaporanSDMK, laporanSdmk, profesiSdmk, asnProfiles]);

  const handleInputChange = (profId: number, field: string, val: string) => {
    const num = parseInt(val) || 0;
    setInputMatrix(prev => ({
      ...prev,
      [profId]: {
        ...prev[profId],
        [field]: num
      }
    }));
  };

  const handleSaveReport = () => {
    // Generate bulk entries to update laporanSdmk database
    const nextArr = laporanSdmk.filter(
      l => !(l.id_puskesmas === activePuskesmasForReport && 
             l.periode_bulan === filterBulan && 
             l.periode_tahun === filterTahun)
    );

    let startId = laporanSdmk.length > 0 ? Math.max(...laporanSdmk.map(l => l.id)) + 1 : 1;
    
    const newReports: LaporanSDMKBulanan[] = Object.entries(inputMatrix).map(([profIdStr, data]: [string, any]) => ({
      id: startId++,
      id_puskesmas: activePuskesmasForReport,
      periode_bulan: filterBulan,
      periode_tahun: filterTahun,
      id_profesi: parseInt(profIdStr),
      pns_l: data.pns_l,
      pns_p: data.pns_p,
      p3k_pn_l: data.p3k_pn_l,
      p3k_pn_p: data.p3k_pn_p,
      p3k_pw_l: data.p3k_pw_l,
      p3k_pw_p: data.p3k_pw_p,
      non_asn_l: data.non_asn_l,
      non_asn_p: data.non_asn_p
    }));

    onUpdateLaporanSdmk([...nextArr, ...newReports]);
    alert("🟢 Berhasil menyimpan data matriks Lapbul Keadaan SDMK Kabupaten Lombok Barat untuk masa periode terpilih!");
    runMatrixCrossCheckAudit();
  };

  // Cross check validation: Match input total numbers against actual counts in database!
  const [cachedValidation, setCachedValidation] = useState<{
    totalReported: number;
    totalDatabase: number;
    discrepancies: { profName: string; field: string; entered: number; actual: number }[];
  } | null>(null);

  const runMatrixCrossCheckAudit = () => {
    const discrepancies: { profName: string; field: string; entered: number; actual: number }[] = [];
    
    // Look up active profiles in this Puskesmas or all if viewing Semua Unit Kerja
    const activeStaffInPK = activePuskesmasForReport === 0
      ? asnProfiles.filter(p => p.status_kepegawaian === 'Aktif')
      : asnProfiles.filter(p => p.id_puskesmas === activePuskesmasForReport && p.status_kepegawaian === 'Aktif');

    let totalReported = 0;
    let totalDatabase = activeStaffInPK.length;

    // We check matches across the clinical professions based on their designated id_profesi!
    profesiSdmk.forEach(prof => {
      const profName = prof.nama_profesi;
      const data: any = inputMatrix[prof.id] || { pns_l: 0, pns_p: 0, p3k_pn_l: 0, p3k_pn_p: 0, p3k_pw_l: 0, p3k_pw_p: 0, non_asn_l: 0, non_asn_p: 0 };

      // sum of row fields entered
      const rowEntered = Object.values(data).reduce((a: any, b: any) => a + b, 0) as number;
      totalReported += rowEntered;

      // Filter active profiles representing this clinical subgroup by id_profesi and fallback matching name/gelar
      const dbMatches = activeStaffInPK.filter(p => (p.id_profesi || getFallbackProfesiId(p.nama_lengkap, p.gelar_belakang)) === prof.id);

      const actualDbCount = dbMatches.length;

      if (rowEntered !== actualDbCount && actualDbCount > 0) {
        discrepancies.push({
          profName,
          field: "Total Baris Rumpun",
          entered: rowEntered,
          actual: actualDbCount
        });
      }
    });

    setCachedValidation({
      totalReported,
      totalDatabase,
      discrepancies
    });
  };

  const getPuskesmasName = (id: number) => {
    if (id === 0) return "Semua Unit Kerja (UPT Puskesmas Sedau)";
    return puskesmasList.find(p => p.id === id)?.nama_puskesmas || `Puskesmas #${id}`;
  };

  // Pre-fill fields automatically from main profiles DB (The Auto-Magic Helper!)
  const handleAutoAutofillFromDb = () => {
    const loadedMatrix: Record<number, Record<string, number>> = {};
    const activeStaffInPK = activePuskesmasForReport === 0
      ? asnProfiles.filter(p => p.status_kepegawaian === 'Aktif')
      : asnProfiles.filter(p => p.id_puskesmas === activePuskesmasForReport && p.status_kepegawaian === 'Aktif');

    profesiSdmk.forEach(prof => {
      // Filter active staff matching the exact id_profesi or fallback matching name/gelar
      const dbMatches = activeStaffInPK.filter(p => (p.id_profesi || getFallbackProfesiId(p.nama_lengkap, p.gelar_belakang)) === prof.id);

      // Split matches by gender and statuses
      let pns_l = 0, pns_p = 0;
      let p3k_pn_l = 0, p3k_pn_p = 0;
      let p3k_pw_l = 0, p3k_pw_p = 0;
      let non_asn_l = 0, non_asn_p = 0;

      dbMatches.forEach(p => {
        if (p.status_pegawai_detail === 'PNS') {
          if (p.jenis_kelamin === 'L') pns_l++; else pns_p++;
        } else if (p.status_pegawai_detail === 'PPPK_Penuh_Waktu') {
          if (p.jenis_kelamin === 'L') p3k_pn_l++; else p3k_pn_p++;
        } else if (p.status_pegawai_detail === 'PPPK_Paruh_Waktu') {
          if (p.jenis_kelamin === 'L') p3k_pw_l++; else p3k_pw_p++;
        } else {
          if (p.jenis_kelamin === 'L') non_asn_l++; else non_asn_p++;
        }
      });

      loadedMatrix[prof.id] = {
        pns_l, pns_p, p3k_pn_l, p3k_pn_p, p3k_pw_l, p3k_pw_p, non_asn_l, non_asn_p
      };
    });

    setInputMatrix(loadedMatrix);
    alert("✨ Autofill Berhasil! Nilai matriks ditarik real-time dari data biografi pegawai SIMPEG sejalan dengan profesi terdaftar.");
  };

  // Dinkes Global / Unit aggregate stats based on actual active employee profiles (realita)
  const getKabupatenSum = () => {
    const activeStaffInPK = activePuskesmasForReport === 0
      ? asnProfiles.filter(p => p.status_kepegawaian === 'Aktif')
      : asnProfiles.filter(p => p.id_puskesmas === activePuskesmasForReport && p.status_kepegawaian === 'Aktif');

    let pns = 0, pppkPenuh = 0, pppkParuh = 0, nonAsn = 0;
    activeStaffInPK.forEach(p => {
      if (p.status_pegawai_detail === 'PNS') {
        pns++;
      } else if (p.status_pegawai_detail === 'PPPK_Penuh_Waktu') {
        pppkPenuh++;
      } else if (p.status_pegawai_detail === 'PPPK_Paruh_Waktu') {
        pppkParuh++;
      } else {
        nonAsn++;
      }
    });
    return { pns, pppkPenuh, pppkParuh, nonAsn, total: pns + pppkPenuh + pppkParuh + nonAsn };
  };

  const kabStats = getKabupatenSum();

  const visibleProfesiSdmk = filterProfesi === 'semua'
    ? profesiSdmk
    : profesiSdmk.filter(p => p.nama_profesi === filterProfesi);

  const getBulanName = (b: number) => {
    const names = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    return names[b - 1] || "Juni";
  };

  const handleExportExcelDirectly = () => {
    const headerTitle = `LAPORAN KEADAAN TENAGA KESEHATAN (SDMK) BULANAN`;
    const subtitle = `UPT Puskesmas Sedau Kabupaten Lombok Barat - Periode ${getBulanName(filterBulan).toUpperCase()} ${filterTahun}`;
    const locationText = `Lokasi / Fasyankes: ${getPuskesmasName(activePuskesmasForReport)}`;

    let tableRowsHtml = "";
    let totPnsL = 0, totPnsP = 0, totP3kPnL = 0, totP3kPnP = 0, totP3kPwL = 0, totP3kPwP = 0, totNonAsnL = 0, totNonAsnP = 0;

    visibleProfesiSdmk.forEach((p, index) => {
      const data = inputMatrix[p.id] || { pns_l: 0, pns_p: 0, p3k_pn_l: 0, p3k_pn_p: 0, p3k_pw_l: 0, p3k_pw_p: 0, non_asn_l: 0, non_asn_p: 0 };
      totPnsL += data.pns_l;
      totPnsP += data.pns_p;
      totP3kPnL += data.p3k_pn_l;
      totP3kPnP += data.p3k_pn_p;
      totP3kPwL += data.p3k_pw_l;
      totP3kPwP += data.p3k_pw_p;
      totNonAsnL += data.non_asn_l;
      totNonAsnP += data.non_asn_p;

      const rowTotal = Object.values(data).reduce((a: any, b: any) => (a as number) + (b as number), 0);
      tableRowsHtml += `
        <tr style="height: 24px;">
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; background-color: #f8fafc; font-weight: bold; font-family: sans-serif;">${index + 1}</td>
          <td style="font-weight: bold; border: 1px solid #cbd5e1; padding: 6px; text-align: left; background-color: #f8fafc; font-family: sans-serif;">${p.nama_profesi}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-family: monospace;">${data.pns_l}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-family: monospace;">${data.pns_p}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-family: monospace;">${data.p3k_pn_l}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-family: monospace;">${data.p3k_pn_p}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-family: monospace;">${data.p3k_pw_l}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-family: monospace;">${data.p3k_pw_p}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-family: monospace;">${data.non_asn_l}</td>
          <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-family: monospace;">${data.non_asn_p}</td>
          <td style="font-weight: bold; background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-family: monospace;">${rowTotal}</td>
        </tr>
      `;
    });

    // Add total footer row
    const colTotalAll = totPnsL + totPnsP + totP3kPnL + totP3kPnP + totP3kPwL + totP3kPwP + totNonAsnL + totNonAsnP;
    tableRowsHtml += `
      <tr style="height: 28px; background-color: #f1f5f9; font-weight: bold; text-align: center;">
        <td colspan="2" style="border: 1.5px solid #475569; padding: 8px; text-align: right; text-transform: uppercase;">Total Rekapitulasi</td>
        <td style="border: 1.5px solid #475569; padding: 8px; color: #1e3a8a; background-color: #e0e7ff;">${totPnsL}</td>
        <td style="border: 1.5px solid #475569; padding: 8px; color: #1e3a8a; background-color: #e0e7ff;">${totPnsP}</td>
        <td style="border: 1.5px solid #475569; padding: 8px; color: #065f46; background-color: #d1fae5;">${totP3kPnL}</td>
        <td style="border: 1.5px solid #475569; padding: 8px; color: #065f46; background-color: #d1fae5;">${totP3kPnP}</td>
        <td style="border: 1.5px solid #475569; padding: 8px; color: #0f766e; background-color: #ccfbf1;">${totP3kPwL}</td>
        <td style="border: 1.5px solid #475569; padding: 8px; color: #0f766e; background-color: #ccfbf1;">${totP3kPwP}</td>
        <td style="border: 1.5px solid #475569; padding: 8px; color: #92400e; background-color: #fef3c7;">${totNonAsnL}</td>
        <td style="border: 1.5px solid #475569; padding: 8px; color: #92400e; background-color: #fef3c7;">${totNonAsnP}</td>
        <td style="border: 1.5px solid #475569; padding: 8px; background-color: #e2e8f0; font-weight: 900;">${colTotalAll}</td>
      </tr>
    `;

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>SDMK Rekapitulasi</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background-color: #ffffff; }
          .title-main { font-size: 16px; font-weight: bold; text-align: center; color: #0f172a; }
          .title-sub { font-size: 11px; text-align: center; color: #475569; }
          table { border-collapse: collapse; margin-top: 20px; width: 100%; border: 1.5px solid #475569; }
          th { background-color: #0d9488; color: #ffffff; font-weight: bold; border: 1px solid #94a3b8; padding: 8px; font-size: 11px; text-align: center; }
          .sub-th { background-color: #0f766e; color: #ffffff; font-weight: bold; border: 1px solid #94a3b8; text-align: center; }
          td { border: 1px solid #cbd5e1; padding: 6px; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="title-main" style="text-align: center; font-weight: bold; font-size: 14px; margin-top: 15px;">${headerTitle}</div>
        <div class="title-sub" style="text-align: center; font-size: 11px; color: #475569;">${subtitle}</div>
        <div class="title-sub" style="text-align: center; font-weight: bold; font-size: 11px; margin-bottom: 20px;">${locationText}</div>
        
        <table border="1" style="border-collapse: collapse; width: 100%; border: 1px solid #475569;">
          <thead>
            <tr style="height: 28px; background-color: #0d9488; color: #ffffff;">
              <th rowspan="2" style="background-color: #0f766e; color: #ffffff; text-align: center; padding: 8px; font-weight: bold; border: 1px solid #475569; width: 40px;">No</th>
              <th rowspan="2" style="background-color: #0f766e; color: #ffffff; text-align: left; padding: 8px; font-weight: bold; border: 1px solid #475569;">RUMPUN PROFESI KESEHATAN</th>
              <th colspan="2" style="background-color: #0d9488; color: #ffffff; font-weight: bold; border: 1px solid #475569; text-align: center;">PNS</th>
              <th colspan="2" style="background-color: #0d9488; color: #ffffff; font-weight: bold; border: 1px solid #475569; text-align: center;">PPPK Penuh Waktu</th>
              <th colspan="2" style="background-color: #0d9488; color: #ffffff; font-weight: bold; border: 1px solid #475569; text-align: center;">PPPK Paruh Waktu</th>
              <th colspan="2" style="background-color: #0d9488; color: #ffffff; font-weight: bold; border: 1px solid #475569; text-align: center;">PKWT</th>
              <th rowspan="2" style="background-color: #0f766e; color: #ffffff; text-align: center; padding: 8px; font-weight: bold; border: 1px solid #475569;">TOTAL</th>
            </tr>
            <tr style="height: 22px; background-color: #0f766e; color: #ffffff;">
              <th class="sub-th" style="border: 1px solid #475569; text-align: center;">L</th>
              <th class="sub-th" style="border: 1px solid #475569; text-align: center;">P</th>
              <th class="sub-th" style="border: 1px solid #475569; text-align: center;">L</th>
              <th class="sub-th" style="border: 1px solid #475569; text-align: center;">P</th>
              <th class="sub-th" style="border: 1px solid #475569; text-align: center;">L</th>
              <th class="sub-th" style="border: 1px solid #475569; text-align: center;">P</th>
              <th class="sub-th" style="border: 1px solid #475569; text-align: center;">L</th>
              <th class="sub-th" style="border: 1px solid #475569; text-align: center;">P</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>


      </body>
      </html>
    `;

    const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DINKES_LOBAR_SDMK_REKAP_${getBulanName(filterBulan).toUpperCase()}_${filterTahun}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert(`✓ Sukses mengunduh file spreadsheet Excel Kedinasan: DINKES_LOBAR_SDMK_REKAP_${getBulanName(filterBulan).toUpperCase()}_${filterTahun}.xls`);
  };

  return (
    <div className="space-y-6">
      
      {/* 2 Filter bar */}
      <div className="bg-white border border-slate-205 p-5 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Calendar className="text-emerald-500" size={24} />
          <div>
            <h3 className="font-display font-semibold text-slate-800 text-sm">Periode Pelaporan & Lokasi</h3>
            <p className="text-[11px] text-slate-500">Atur filter rekapitulasi data SDMK Kabupaten</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Select Month */}
          <select 
            value={filterBulan} 
            onChange={(e) => setFilterBulan(parseInt(e.target.value))}
            className="p-1.5 border border-slate-200 bg-white text-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          >
            {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
              <option key={m} value={m} className="bg-white text-slate-800">{getBulanName(m)}</option>
            ))}
          </select>

          {/* Select Year */}
          <select 
            value={filterTahun} 
            onChange={(e) => setFilterTahun(parseInt(e.target.value))}
            className="p-1.5 border border-slate-200 bg-white text-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          >
            <option value={2026} className="bg-white text-slate-800">2026</option>
            <option value={2027} className="bg-white text-slate-800">2027</option>
          </select>

          {/* Select Jenis Ketenagaan (SDMK) Filter */}
          <select
            value={filterProfesi}
            onChange={(e) => setFilterProfesi(e.target.value)}
            className="p-1.5 border border-slate-200 bg-white text-slate-800 rounded-lg text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none font-semibold text-emerald-600"
          >
            <option value="semua">Semua Ketenagaan (SDMK)</option>
            {profesiSdmk.map(prof => (
              <option key={prof.id} value={prof.nama_profesi} className="text-slate-850 bg-white">{prof.nama_profesi}</option>
            ))}
          </select>

          {/* Select Puskesmas location if Admin Dinkes */}
          {currentRole === 'admin_dinkes' ? (
            <select
              value={activePuskesmasForReport}
              onChange={(e) => setActivePuskesmasForReport(parseInt(e.target.value))}
              className="p-1.5 border border-emerald-500/30 rounded-lg text-xs bg-white text-emerald-600 font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            >
              <option value={0} className="bg-white text-slate-800 font-bold">Semua Unit Kerja (UPT Puskesmas Sedau)</option>
              {puskesmasList.map(pk => (
                <option key={pk.id} value={pk.id} className="bg-white text-slate-800">{pk.nama_puskesmas}</option>
              ))}
            </select>
          ) : (
            <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-250 px-3 py-1 rounded-lg font-bold">
              {getPuskesmasName(activePuskesmasForReport)}
            </span>
          )}
        </div>
      </div>

      {/* DINKES GLOBAL DASHBOARD SUMMARY - TOTAL KABUPATEN TERINTEGRASI */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-white space-y-4 shadow-sm animate-in fade-in duration-200">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-[#0ea5e9] font-extrabold">Total Kabupaten Terintegrasi</p>
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2 mt-1">
            <h2 className="text-3xl font-black font-display text-white">
              {kabStats.total} <span className="text-sm font-light text-slate-300">Pegawai</span>
            </h2>
            <div className="text-left sm:text-right">
              <span className="text-xs text-emerald-400 font-extrabold bg-emerald-950/80 px-2.5 py-1 rounded-md border border-emerald-800/40 inline-block">
                {activePuskesmasForReport === 0 ? "UPT Puskesmas Sedau (Semua Unit)" : getPuskesmasName(activePuskesmasForReport)}
              </span>
              <p className="text-[10px] text-slate-400 font-mono mt-1">Periode: {getBulanName(filterBulan)} {filterTahun}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-800">
          {/* Golongan PNS */}
          <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 space-y-1">
            <p className="text-[10px] text-slate-400 uppercase font-semibold">Golongan PNS</p>
            <p className="text-2xl font-extrabold text-white">{kabStats.pns} Pegawai</p>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden mt-2.5">
              <div className="h-full bg-indigo-500" style={{ width: `${kabStats.total > 0 ? (kabStats.pns / kabStats.total) * 100 : 0}%` }}></div>
            </div>
          </div>

          {/* PPPK Penuh Waktu */}
          <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 space-y-1">
            <p className="text-[10px] text-slate-400 uppercase font-semibold text-slate-300">PPPK Penuh Waktu</p>
            <p className="text-2xl font-extrabold text-white">{kabStats.pppkPenuh} Pegawai</p>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden mt-2.5">
              <div className="h-full bg-emerald-500" style={{ width: `${kabStats.total > 0 ? (kabStats.pppkPenuh / kabStats.total) * 100 : 0}%` }}></div>
            </div>
          </div>

          {/* PPPK Paruh Waktu */}
          <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 space-y-1">
            <p className="text-[10px] text-slate-400 uppercase font-semibold text-slate-300">PPPK Paruh Waktu</p>
            <p className="text-2xl font-extrabold text-white">{kabStats.pppkParuh} Pegawai</p>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden mt-2.5">
              <div className="h-full bg-teal-500" style={{ width: `${kabStats.total > 0 ? (kabStats.pppkParuh / kabStats.total) * 100 : 0}%` }}></div>
            </div>
          </div>

          {/* Non-ASN Daerah */}
          <div className="bg-slate-950/40 p-4 rounded-xl border border-white/5 space-y-1">
            <p className="text-[10px] text-slate-400 uppercase font-semibold text-slate-300">Non-ASN Daerah</p>
            <p className="text-2xl font-extrabold text-white">{kabStats.nonAsn} Pegawai</p>
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden mt-2.5">
              <div className="h-full bg-amber-500" style={{ width: `${kabStats.total > 0 ? (kabStats.nonAsn / kabStats.total) * 100 : 0}%` }}></div>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 font-mono italic text-center pt-1">
          *Uraian data di atas disesuaikan dengan keadaan dan kondisi unit kerja yang dipilih.
        </p>
      </div>

      {/* MATRIX FORM & CROSS-CHECK ENGINE */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-2">
            <Layers className="text-slate-500" size={18} />
            <div>
              <h3 className="font-display font-semibold text-slate-800 text-sm">Matriks Form Keadaan SDMK Bulanan</h3>
              <p className="text-[11px] text-slate-500">15 Rumpun Profesi Kesehatan Standar Kemenkes RI stratified Gender & Status</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-center">
            {currentRole === 'admin_puskesmas' && (
              <div className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-250 flex items-center space-x-1 shadow-xs">
                <Sparkles size={13} className="text-emerald-600 shrink-0" />
                <span>Terintegrasi Database SAPA</span>
              </div>
            )}

            {currentRole === 'admin_dinkes' && (
              <button 
                onClick={() => setShowManageProfesi(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-750 border border-emerald-200 hover:bg-emerald-100 transition flex items-center space-x-1 cursor-pointer"
              >
                <Plus size={13} />
                <span>Kelola Rumpun Profesi</span>
              </button>
            )}

            <button 
              onClick={handleExportExcelDirectly}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 border border-slate-205 hover:bg-slate-200 text-slate-700 transition flex items-center space-x-1 cursor-pointer"
            >
              <Download size={13} />
              <span>Ekspor Excel</span>
            </button>
          </div>
        </div>

        {/* The Matrix Table */}
        <div className="overflow-auto max-h-[420px] border border-slate-200 rounded-xl bg-white">
          <table className="w-full min-w-[950px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-[10px]/normal text-slate-600 uppercase font-bold text-center border-b border-slate-200">
                <th rowSpan={2} className="p-3 text-center border-r border-slate-200 text-slate-700 w-12">NO</th>
                <th rowSpan={2} className="p-3 text-left border-r border-slate-200 text-slate-700">RUMPUN PROFESI KESEHATAN (15)</th>
                <th colSpan={2} className="p-2 border-b border-r border-slate-200 bg-indigo-50 text-indigo-800 font-sans">1. PNS</th>
                <th colSpan={2} className="p-2 border-b border-r border-slate-200 bg-emerald-50 text-emerald-850 font-sans">2. PPPK Penuh Waktu</th>
                <th colSpan={2} className="p-2 border-b border-r border-slate-200 bg-teal-50 text-teal-850 font-sans">3. PPPK Paruh Waktu</th>
                <th colSpan={2} className="p-2 border-b bg-amber-50 text-amber-850 font-sans">4. PKWT</th>
              </tr>
              <tr className="bg-slate-50 text-[10px] text-slate-500 uppercase font-bold text-center border-b border-slate-200">
                <th className="p-2 bg-indigo-50/50 text-indigo-600 border-r border-slate-200">L</th>
                <th className="p-2 bg-indigo-50/50 text-indigo-600 border-r border-slate-200">P</th>
                <th className="p-2 bg-emerald-50/50 text-emerald-600 border-r border-slate-200">L</th>
                <th className="p-2 bg-emerald-50/50 text-emerald-600 border-r border-slate-200">P</th>
                <th className="p-2 bg-teal-50/50 text-teal-600 border-r border-slate-200">L</th>
                <th className="p-2 bg-teal-50/50 text-teal-600 border-r border-slate-200">P</th>
                <th className="p-2 bg-amber-50/50 text-amber-600 border-r border-slate-200">L</th>
                <th className="p-2 bg-amber-50/50 text-amber-600">P</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
              {visibleProfesiSdmk.map((prof, idx) => {
                const rowInputs = inputMatrix[prof.id] || {
                  pns_l: 0, pns_p: 0, p3k_pn_l: 0, p3k_pn_p: 0, p3k_pw_l: 0, p3k_pw_p: 0, non_asn_l: 0, non_asn_p: 0
                };

                return (
                  <tr key={prof.id} className="hover:bg-slate-50 text-center border-b border-slate-205">
                    <td className="p-3 text-center font-mono font-bold text-slate-400 border-r border-slate-205 w-12 bg-slate-50/50">
                      {idx + 1}
                    </td>
                    <td className="p-3 text-left font-bold text-slate-800 border-r border-slate-205 bg-slate-50/50">
                      {prof.nama_profesi}
                    </td>

                    {/* PNS Counts */}
                    <td className="p-2 border-r border-slate-205 bg-indigo-50/10 text-center font-mono font-bold text-slate-800 text-xs text-indigo-950">
                      {rowInputs.pns_l}
                    </td>
                    <td className="p-2 border-r border-slate-205 bg-indigo-50/10 text-center font-mono font-bold text-slate-800 text-xs text-indigo-950">
                      {rowInputs.pns_p}
                    </td>

                    {/* PPPK PN Counts */}
                    <td className="p-2 border-r border-slate-205 bg-emerald-50/10 text-center font-mono font-bold text-slate-800 text-xs text-emerald-950">
                      {rowInputs.p3k_pn_l}
                    </td>
                    <td className="p-2 border-r border-slate-205 bg-emerald-50/10 text-center font-mono font-bold text-slate-800 text-xs text-emerald-950">
                      {rowInputs.p3k_pn_p}
                    </td>

                    {/* PPPK PW Counts */}
                    <td className="p-2 border-r border-slate-205 bg-teal-50/10 text-center font-mono font-bold text-slate-800 text-xs text-teal-950">
                      {rowInputs.p3k_pw_l}
                    </td>
                    <td className="p-2 border-r border-slate-205 bg-teal-50/10 text-center font-mono font-bold text-slate-800 text-xs text-teal-950">
                      {rowInputs.p3k_pw_p}
                    </td>

                    {/* Non PNS Counts */}
                    <td className="p-2 border-r border-slate-205 bg-amber-50/10 text-center font-mono font-bold text-slate-800 text-xs text-amber-955">
                      {rowInputs.non_asn_l}
                    </td>
                    <td className="p-2 bg-amber-50/10 text-center font-mono font-bold text-slate-800 text-xs text-amber-955">
                      {rowInputs.non_asn_p}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Validation Audits crosscheck trigger & saving action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-150">
          <div className="space-y-1">
            <p className="text-xs font-bold text-emerald-900 flex items-center space-x-1">
              <span className="inline-block h-2 w-2 bg-emerald-500 rounded-full shrink-0 animate-pulse mr-2" />
              <span>Sistem Sinkronisasi Lintas Database Aktif (Live Sync)</span>
            </p>
            <p className="text-[10px] text-emerald-700 font-medium">
              Seluruh data matriks SDMK dilock dan disinkronkan langsung dari profil riil kepegawaian aktif secara real-time. Manual input dinonaktifkan untuk menjaga validitas dokumen.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white flex items-center space-x-1.5 shadow-sm">
              <FileCheck size={14} />
              <span>Matriks Terkunci & Sinkron 100%</span>
            </div>
          </div>
        </div>

        {/* Audit logging results box */}
        {cachedValidation && (
          <div className="border border-indigo-100 rounded-xl p-4 bg-indigo-50/50 space-y-3">
            <div className="flex justify-between items-center border-b border-indigo-100 pb-2">
              <span className="text-xs font-bold text-indigo-800 uppercase">Hasil Audit Cross-Check Laporan Bulanan</span>
              <span className={`text-[10px]/normal font-mono font-bold px-2 py-0.5 rounded ${cachedValidation.discrepancies.length === 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                {cachedValidation.discrepancies.length === 0 ? 'STATUS: SINKRON 100%' : 'STATUS: DITEMUKAN ANOMALI!'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-medium text-slate-600">
              <div>
                <p>Total data Personil terinput di Matriks: <strong className="text-slate-800">{cachedValidation.totalReported} Org</strong></p>
              </div>
              <div>
                <p>Total Pegawai aktif nyata di Profil Induk DB SAPA: <strong className="text-slate-800">{cachedValidation.totalDatabase} Org</strong></p>
              </div>
            </div>

            {cachedValidation.discrepancies.length > 0 ? (
              <div className="space-y-1.5">
                <p className="text-[10px] text-rose-600 font-bold flex items-center">
                  <AlertTriangle size={12} className="inline mr-1" />
                  Peringatan ketidakcocokan jumlah personil terdeteksi di rumpun berikut:
                </p>
                <div className="max-h-24 overflow-y-auto space-y-1">
                  {cachedValidation.discrepancies.map((d, i) => (
                    <div key={i} className="bg-white border border-slate-200 p-2 rounded-lg text-[10px] text-slate-700 flex justify-between items-center">
                      <span>Rumpun <strong>{d.profName}</strong> {d.field}</span>
                      <span>Input Form: <strong className="text-rose-600">{d.entered}</strong> vs Nyata Profil DB: <strong className="text-emerald-700">{d.actual}</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-emerald-700 font-semibold">✓ Seluruh angka matriks sinkron sempurna dengan list biografi ASN aktif di unit {getPuskesmasName(activePuskesmasForReport)}.</p>
            )}
          </div>
        )}
      </div>

      {/* TARIKAN DATA RENBUT KEMENKES UPLOADER REMOVED */}

      {/* 3 Simulating Kedinasan Print Preview (Modal) */}
      {isExporting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-4xl w-full p-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
              <div>
                <h4 className="font-semibold text-slate-800 font-display">Simulasi Ekspor Dokumen Resmi Kedinasan</h4>
                <p className="text-xs text-slate-500">Preview Layout cetak instansi Daerah Lombok Barat</p>
              </div>
              <button onClick={() => setIsExporting(false)} className="text-slate-400 hover:text-slate-600 transition cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {/* Official Signed Letter Paper Layout */}
            <div id="print-officer-sdmk-paper" className="bg-white border border-slate-300 p-8 text-slate-900 rounded-2xl font-sans space-y-6 text-sm text-center relative max-w-4xl mx-auto shadow-xl">
              <div className="absolute right-4 top-4 font-mono text-[10px] border-2 border-slate-300 p-1 rounded no-print">
                SAPA PEGAWAI v1.0
              </div>

              {/* Kop Surat */}
              <div className="border-b-4 border-double border-slate-900 pb-4 block">
                <h2 className="text-lg font-bold uppercase tracking-wide leading-tight">Pemerintah Kabupaten Lombok Barat</h2>
                <h1 className="text-xl font-black uppercase tracking-wider leading-snug text-slate-900">UPT Puskesmas Sedau</h1>
                <p className="text-xs font-sans not-italic text-slate-500 mt-1">
                  Jl. Raya Sedau, Kec. Narmada - Lombok Barat, NTB.
                </p>
              </div>

              {/* Title letter */}
              <div className="space-y-1 font-sans mt-4">
                <h3 className="font-extrabold underline uppercase text-sm tracking-wide text-slate-900">Laporan Keadaan Tenaga Kesehatan (SDMK) Bulanan</h3>
                <p className="text-xs text-slate-500 font-mono">Nomor: 800 / 121.SDMK / PKM-SEDAU / 2026</p>
              </div>

              <div className="text-left font-sans text-xs space-y-2 leading-relaxed text-slate-700">
                <p>
                  Berdasarkan hasil sinkronisasi data seketika biografi induk kepegawaian SAPA pegawai UPT Puskesmas Sedau Kabupaten Lombok Barat, berikut adalah rincian data sebaran seluruh rumpun profesi tenaga kesehatan di Unit Kerja <strong>{getPuskesmasName(activePuskesmasForReport)}</strong> untuk Periode Laporan <strong>{getBulanName(filterBulan)} {filterTahun}</strong>:
                </p>
              </div>

              {/* Beautiful, exact modern replica table in print preview */}
              <div className="overflow-x-auto border border-slate-300 rounded-xl bg-white">
                <table className="w-full text-center text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-[10px] text-slate-600 uppercase font-bold text-center border-b border-slate-300">
                      <th rowSpan={2} className="p-2 border-r border-slate-300 text-slate-700 w-10">NO</th>
                      <th rowSpan={2} className="p-2 text-left border-r border-slate-300 text-slate-700">RUMPUN PROFESI KESEHATAN (15)</th>
                      <th colSpan={2} className="p-1.5 border-r border-slate-300 bg-indigo-50/70 text-indigo-900 font-bold">1. PNS</th>
                      <th colSpan={2} className="p-1.5 border-r border-slate-300 bg-emerald-50/70 text-emerald-950 font-bold">2. PPPK Penuh Waktu</th>
                      <th colSpan={2} className="p-1.5 border-r border-slate-300 bg-teal-50/70 text-teal-950 font-bold">3. PPPK Paruh Waktu</th>
                      <th colSpan={2} className="p-1.5 border-r border-slate-300 bg-amber-50/70 text-amber-955 font-bold">4. PKWT</th>
                      <th rowSpan={2} className="p-2 text-center text-slate-800 w-16 bg-slate-100 font-black">TOTAL</th>
                    </tr>
                    <tr className="bg-slate-50 text-[9px] text-slate-500 uppercase font-bold text-center border-b border-slate-300">
                      <th className="p-1 bg-indigo-50/40 text-indigo-700 border-r border-slate-300">L</th>
                      <th className="p-1 bg-indigo-50/40 text-indigo-700 border-r border-slate-300">P</th>
                      <th className="p-1 bg-emerald-50/40 text-emerald-700 border-r border-slate-300">L</th>
                      <th className="p-1 bg-emerald-50/40 text-emerald-700 border-r border-slate-300">P</th>
                      <th className="p-1 bg-teal-50/40 text-teal-700 border-r border-slate-300">L</th>
                      <th className="p-1 bg-teal-50/40 text-teal-700 border-r border-slate-300">P</th>
                      <th className="p-1 bg-amber-50/40 text-amber-700 border-r border-slate-300">L</th>
                      <th className="p-1 bg-amber-50/40 text-amber-700 border-r border-slate-300 font-sans">P</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {visibleProfesiSdmk.map((p, idx) => {
                      const data = inputMatrix[p.id] || { pns_l:0, pns_p:0, p3k_pn_l:0, p3k_pn_p:0, p3k_pw_l:0, p3k_pw_p:0, non_asn_l:0, non_asn_p:0 };
                      const rowTotal = Object.values(data).reduce((a: any, b: any) => (a as number) + (b as number), 0);
                      return (
                        <tr key={p.id} className="text-center font-mono text-[10px] hover:bg-slate-50 transition duration-100">
                          <td className="border-r border-slate-300 p-1.5 font-sans font-bold text-slate-400 bg-slate-50/30">{idx + 1}</td>
                          <td className="border-r border-slate-300 p-1.5 text-left font-sans font-extrabold text-slate-800 bg-slate-50/30">{p.nama_profesi}</td>
                          <td className="border-r border-slate-300 p-1.5 text-slate-800 font-semibold bg-indigo-50/5">{data.pns_l}</td>
                          <td className="border-r border-slate-300 p-1.5 text-slate-800 font-semibold bg-indigo-50/5">{data.pns_p}</td>
                          <td className="border-r border-slate-300 p-1.5 text-slate-800 font-semibold bg-emerald-50/5">{data.p3k_pn_l}</td>
                          <td className="border-r border-slate-300 p-1.5 text-slate-800 font-semibold bg-emerald-50/5">{data.p3k_pn_p}</td>
                          <td className="border-r border-slate-300 p-1.5 text-slate-800 font-semibold bg-teal-50/5">{data.p3k_pw_l}</td>
                          <td className="border-r border-slate-300 p-1.5 text-slate-800 font-semibold bg-teal-50/5">{data.p3k_pw_p}</td>
                          <td className="border-r border-slate-300 p-1.5 text-slate-800 font-semibold bg-amber-50/5">{data.non_asn_l}</td>
                          <td className="border-r border-slate-300 p-1.5 text-slate-800 font-semibold bg-amber-50/5">{data.non_asn_p}</td>
                          <td className="p-1.5 bg-slate-100 font-sans font-black text-slate-900">{rowTotal}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    {(() => {
                      const tPnsL = visibleProfesiSdmk.reduce((acc, p) => acc + (inputMatrix[p.id]?.pns_l || 0), 0);
                      const tPnsP = visibleProfesiSdmk.reduce((acc, p) => acc + (inputMatrix[p.id]?.pns_p || 0), 0);
                      const tP3kPnL = visibleProfesiSdmk.reduce((acc, p) => acc + (inputMatrix[p.id]?.p3k_pn_l || 0), 0);
                      const tP3kPnP = visibleProfesiSdmk.reduce((acc, p) => acc + (inputMatrix[p.id]?.p3k_pn_p || 0), 0);
                      const tP3kPwL = visibleProfesiSdmk.reduce((acc, p) => acc + (inputMatrix[p.id]?.p3k_pw_l || 0), 0);
                      const tP3kPwP = visibleProfesiSdmk.reduce((acc, p) => acc + (inputMatrix[p.id]?.p3k_pw_p || 0), 0);
                      const tNonAsnL = visibleProfesiSdmk.reduce((acc, p) => acc + (inputMatrix[p.id]?.non_asn_l || 0), 0);
                      const tNonAsnP = visibleProfesiSdmk.reduce((acc, p) => acc + (inputMatrix[p.id]?.non_asn_p || 0), 0);
                      const tAll = tPnsL + tPnsP + tP3kPnL + tP3kPnP + tP3kPwL + tP3kPwP + tNonAsnL + tNonAsnP;
                      return (
                        <tr className="bg-slate-100 font-sans font-black text-center text-[10px] border-t-2 border-slate-300">
                          <td colSpan={2} className="border-r border-slate-300 p-2 text-right uppercase text-slate-700">Total Rekapitulasi</td>
                          <td className="border-r border-slate-300 p-2 font-mono text-indigo-900 bg-indigo-50/80">{tPnsL}</td>
                          <td className="border-r border-slate-300 p-2 font-mono text-indigo-900 bg-indigo-50/80">{tPnsP}</td>
                          <td className="border-r border-slate-300 p-2 font-mono text-emerald-900 bg-emerald-50/80">{tP3kPnL}</td>
                          <td className="border-r border-slate-300 p-2 font-mono text-emerald-900 bg-emerald-50/80">{tP3kPnP}</td>
                          <td className="border-r border-slate-300 p-2 font-mono text-teal-900 bg-teal-50/80">{tP3kPwL}</td>
                          <td className="border-r border-slate-300 p-2 font-mono text-teal-900 bg-teal-50/80">{tP3kPwP}</td>
                          <td className="border-r border-slate-300 p-2 font-mono text-amber-955 bg-amber-50/80">{tNonAsnL}</td>
                          <td className="border-r border-slate-300 p-2 font-mono text-amber-955 bg-amber-50/80">{tNonAsnP}</td>
                          <td className="p-2 bg-slate-200 text-slate-900">{tAll}</td>
                        </tr>
                      );
                    })()}
                  </tfoot>
                </table>
              </div>

              {/* Tanda tangan */}
              <div className="flex justify-end text-left font-sans text-xs pt-8">
                <div className="space-y-16">
                  <div>
                    <p>Sedau, {new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p className="font-bold">Kepala UPT Puskesmas Sedau,</p>
                  </div>
                  <div>
                    <p className="font-bold underline text-slate-900">M. SULAIMAN, S.KM., M.PH</p>
                    <p className="text-slate-500 font-mono text-[10px]">NIP. 19741005 199903 1 004</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated Action */}
            <div className="flex items-center justify-end space-x-2 mt-6 border-t border-slate-200 pt-4 no-print">
              <button
                onClick={() => setIsExporting(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Tutup Preview
              </button>

              <button
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition flex items-center space-x-1 cursor-pointer"
              >
                <Printer size={13} />
                <span>Cetak PDF Laporan</span>
              </button>

              <button
                onClick={() => {
                  const headerTitle = `LAPORAN KEADAAN TENAGA KESEHATAN (SDMK) BULANAN`;
                  const subtitle = `UPT Puskesmas Sedau Kabupaten Lombok Barat - Periode ${getBulanName(filterBulan).toUpperCase()} ${filterTahun}`;
                  const locationText = `Lokasi / Fasyankes: ${getPuskesmasName(activePuskesmasForReport)}`;

                  let tableRowsHtml = "";
                  let totPnsL = 0, totPnsP = 0, totP3kPnL = 0, totP3kPnP = 0, totP3kPwL = 0, totP3kPwP = 0, totNonAsnL = 0, totNonAsnP = 0;

                  visibleProfesiSdmk.forEach((p, index) => {
                    const data = inputMatrix[p.id] || { pns_l:0, pns_p:0, p3k_pn_l:0, p3k_pn_p:0, p3k_pw_l:0, p3k_pw_p:0, non_asn_l:0, non_asn_p:0 };
                    totPnsL += data.pns_l;
                    totPnsP += data.pns_p;
                    totP3kPnL += data.p3k_pn_l;
                    totP3kPnP += data.p3k_pn_p;
                    totP3kPwL += data.p3k_pw_l;
                    totP3kPwP += data.p3k_pw_p;
                    totNonAsnL += data.non_asn_l;
                    totNonAsnP += data.non_asn_p;

                    const rowTotal = Object.values(data).reduce((a: any, b: any) => (a as number) + (b as number), 0);
                    tableRowsHtml += `
                      <tr style="height: 24px;">
                        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; background-color: #f8fafc; font-weight: bold; font-family: sans-serif;">${index + 1}</td>
                        <td style="font-weight: bold; border: 1px solid #cbd5e1; padding: 6px; text-align: left; background-color: #f8fafc; font-family: sans-serif;">${p.nama_profesi}</td>
                        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-family: monospace;">${data.pns_l}</td>
                        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-family: monospace;">${data.pns_p}</td>
                        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-family: monospace;">${data.p3k_pn_l}</td>
                        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-family: monospace;">${data.p3k_pn_p}</td>
                        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-family: monospace;">${data.p3k_pw_l}</td>
                        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-family: monospace;">${data.p3k_pw_p}</td>
                        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-family: monospace;">${data.non_asn_l}</td>
                        <td style="border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-family: monospace;">${data.non_asn_p}</td>
                        <td style="font-weight: bold; background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px; text-align: center; font-family: monospace;">${rowTotal}</td>
                      </tr>
                    `;
                  });

                  // Add total footer row
                  const colTotalAll = totPnsL + totPnsP + totP3kPnL + totP3kPnP + totP3kPwL + totP3kPwP + totNonAsnL + totNonAsnP;
                  tableRowsHtml += `
                    <tr style="height: 28px; background-color: #f1f5f9; font-weight: bold; text-align: center;">
                      <td colspan="2" style="border: 1.5px solid #475569; padding: 8px; text-align: right; text-transform: uppercase;">Total Rekapitulasi</td>
                      <td style="border: 1.5px solid #475569; padding: 8px; color: #1e3a8a; background-color: #e0e7ff;">${totPnsL}</td>
                      <td style="border: 1.5px solid #475569; padding: 8px; color: #1e3a8a; background-color: #e0e7ff;">${totPnsP}</td>
                      <td style="border: 1.5px solid #475569; padding: 8px; color: #065f46; background-color: #d1fae5;">${totP3kPnL}</td>
                      <td style="border: 1.5px solid #475569; padding: 8px; color: #065f46; background-color: #d1fae5;">${totP3kPnP}</td>
                      <td style="border: 1.5px solid #475569; padding: 8px; color: #0f766e; background-color: #ccfbf1;">${totP3kPwL}</td>
                      <td style="border: 1.5px solid #475569; padding: 8px; color: #0f766e; background-color: #ccfbf1;">${totP3kPwP}</td>
                      <td style="border: 1.5px solid #475569; padding: 8px; color: #92400e; background-color: #fef3c7;">${totNonAsnL}</td>
                      <td style="border: 1.5px solid #475569; padding: 8px; color: #92400e; background-color: #fef3c7;">${totNonAsnP}</td>
                      <td style="border: 1.5px solid #475569; padding: 8px; background-color: #e2e8f0; font-weight: 900;">${colTotalAll}</td>
                    </tr>
                  `;

                  const excelHtml = `
                    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
                    <head>
                      <!--[if gte mso 9]>
                      <xml>
                        <x:ExcelWorkbook>
                          <x:ExcelWorksheets>
                            <x:ExcelWorksheet>
                              <x:Name>SDMK Rekapitulasi</x:Name>
                              <x:WorksheetOptions>
                                <x:DisplayGridlines/>
                              </x:WorksheetOptions>
                            </x:ExcelWorksheet>
                          </x:ExcelWorksheets>
                        </x:ExcelWorkbook>
                      </xml>
                      <![endif]-->
                      <style>
                        body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background-color: #ffffff; }
                        .title-main { font-size: 16px; font-weight: bold; text-align: center; color: #0f172a; }
                        .title-sub { font-size: 11px; text-align: center; color: #475569; }
                        table { border-collapse: collapse; margin-top: 20px; width: 100%; border: 1.5px solid #475569; }
                        th { background-color: #0d9488; color: #ffffff; font-weight: bold; border: 1px solid #94a3b8; padding: 8px; font-size: 11px; text-align: center; }
                        .sub-th { background-color: #0f766e; color: #ffffff; font-weight: bold; border: 1px solid #94a3b8; text-align: center; }
                        td { border: 1px solid #cbd5e1; padding: 6px; font-size: 11px; }
                      </style>
                    </head>
                    <body>
                      <table style="border: none; margin-bottom: 20px;">
                        <tr style="border: none;">
                          <td colspan="11" style="border: none; text-align: center; font-size: 15px; font-weight: bold; color: #0d9488;">
                            PEMERINTAH KABUPATEN LOMBOK BARAT
                          </td>
                        </tr>
                        <tr style="border: none;">
                          <td colspan="11" style="border: none; text-align: center; font-size: 16px; font-weight: bold; color: #1e293b;">
                            DINAS KESEHATAN, PENGENDALIAN PENDUDUK DAN KELUARGA BERENCANA
                          </td>
                        </tr>
                        <tr style="border: none;">
                          <td colspan="11" style="border: none; text-align: center; font-size: 10px; color: #64748b; font-style: italic;">
                            Jl. Ki Hajar Dewantara No. 10, Gerung - Lombok Barat, NTB. Kode Pos 83311
                          </td>
                        </tr>
                        <tr style="border: none;"><td colspan="11" style="border: none; border-bottom: 3px double #000000; height: 10px;"></td></tr>
                      </table>

                      <div class="title-main" style="text-align: center; font-weight: bold; font-size: 14px; margin-top: 15px;">${headerTitle}</div>
                      <div class="title-sub" style="text-align: center; font-size: 11px; color: #475569;">${subtitle}</div>
                      <div class="title-sub" style="text-align: center; font-weight: bold; font-size: 11px; margin-bottom: 20px;">${locationText}</div>
                      
                      <table border="1" style="border-collapse: collapse; width: 100%; border: 1px solid #475569;">
                        <thead>
                          <tr style="height: 28px; background-color: #0d9488; color: #ffffff;">
                            <th rowspan="2" style="background-color: #0f766e; color: #ffffff; text-align: center; padding: 8px; font-weight: bold; border: 1px solid #475569; width: 40px;">No</th>
                            <th rowspan="2" style="background-color: #0f766e; color: #ffffff; text-align: left; padding: 8px; font-weight: bold; border: 1px solid #475569;">RUMPUN PROFESI KESEHATAN</th>
                            <th colspan="2" style="background-color: #0d9488; color: #ffffff; font-weight: bold; border: 1px solid #475569; text-align: center;">PNS</th>
                            <th colspan="2" style="background-color: #0d9488; color: #ffffff; font-weight: bold; border: 1px solid #475569; text-align: center;">PPPK Penuh Waktu</th>
                            <th colspan="2" style="background-color: #0d9488; color: #ffffff; font-weight: bold; border: 1px solid #475569; text-align: center;">PPPK Paruh Waktu</th>
                            <th colspan="2" style="background-color: #0d9488; color: #ffffff; font-weight: bold; border: 1px solid #475569; text-align: center;">PKWT</th>
                            <th rowspan="2" style="background-color: #0f766e; color: #ffffff; text-align: center; padding: 8px; font-weight: bold; border: 1px solid #475569;">TOTAL</th>
                          </tr>
                          <tr style="height: 22px; background-color: #0f766e; color: #ffffff;">
                            <th class="sub-th" style="border: 1px solid #475569; text-align: center;">L</th>
                            <th class="sub-th" style="border: 1px solid #475569; text-align: center;">P</th>
                            <th class="sub-th" style="border: 1px solid #475569; text-align: center;">L</th>
                            <th class="sub-th" style="border: 1px solid #475569; text-align: center;">P</th>
                            <th class="sub-th" style="border: 1px solid #475569; text-align: center;">L</th>
                            <th class="sub-th" style="border: 1px solid #475569; text-align: center;">P</th>
                            <th class="sub-th" style="border: 1px solid #475569; text-align: center;">L</th>
                            <th class="sub-th" style="border: 1px solid #475569; text-align: center;">P</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${tableRowsHtml}
                        </tbody>
                      </table>

                      <br/><br/>
                      <table style="border: none; width: 100%;">
                        <tr style="border: none;">
                          <td colspan="7" style="border: none;"></td>
                          <td colspan="4" style="border: none; text-align: left; font-size: 11px;">
                            Sedau, ${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}<br/>
                            <strong>Kepala UPT Puskesmas Sedau,</strong>
                            <br/><br/><br/><br/>
                            <strong><u>dr. Wahyu Darizki</u></strong><br/>
                            NIP. 19800412 200501 1 003
                          </td>
                        </tr>
                      </table>
                    </body>
                    </html>
                  `;

                  const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `PUSKESMAS_SEDAU_SDMK_REKAP_${getBulanName(filterBulan).toUpperCase()}_${filterTahun}.xls`;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  
                  alert(`✓ Sukses mengunduh file spreadsheet Excel Kepegawaian: PUSKESMAS_SEDAU_SDMK_REKAP_${getBulanName(filterBulan).toUpperCase()}_${filterTahun}.xls`);
                  setIsExporting(false);
                }}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition flex items-center space-x-1 cursor-pointer"
              >
                <Download size={13} />
                <span>Download Excel Kedinasan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= MODAL: KELOLA RUMPUN PROFESI KESEHATAN (CRUD) ======================= */}
      {showManageProfesi && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white text-slate-800 border border-slate-300 rounded-2xl shadow-2xl max-w-xl w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3 mb-4">
              <div>
                <h4 className="font-bold text-slate-900 font-display text-sm uppercase tracking-wide flex items-center space-x-1.5 text-left">
                  <Settings className="text-emerald-500" size={17} />
                  <span>Kelola Master Rumpun Profesi Kesehatan</span>
                </h4>
                <p className="text-[11px] text-slate-500 text-left">Tambah, ubah, dan hapus rumpun profesi kesehatan UPT Puskesmas Sedau Lombok Barat</p>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setShowManageProfesi(false);
                  setEditingProfesiId(null);
                }} 
                className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-100 rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* FORM 1: TAMBAH BARU */}
            {editingProfesiId === null ? (
              <form onSubmit={handleCreateProfesi} className="bg-slate-50 border border-slate-200 p-3 rounded-xl mb-4 space-y-2 text-left">
                <span className="font-bold text-[10px] text-emerald-600 uppercase tracking-widest block font-sans">Tambah Rumpun Baru</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Apoteker Spesialis, Perawat Gigi"
                    value={newProfesiName}
                    onChange={(e) => setNewProfesiName(e.target.value)}
                    className="flex-1 p-2 border border-slate-200 rounded-lg text-xs bg-white text-slate-800 focus:ring-1 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                  >
                    <Plus size={13} />
                    <span>Tambah</span>
                  </button>
                </div>
              </form>
            ) : (
              /* FORM 2: EDIT EXISTING */
              <form onSubmit={handleUpdateProfesi} className="bg-amber-50 border border-amber-200 p-3 rounded-xl mb-4 space-y-2 text-left animate-in slide-in-from-top-1">
                <span className="font-bold text-[10px] text-amber-700 uppercase tracking-widest block font-sans">Edit Rumpun Profesi</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={editingProfesiName}
                    onChange={(e) => setEditingProfesiName(e.target.value)}
                    className="flex-1 p-2 border border-amber-300 rounded-lg text-xs bg-white text-slate-800 focus:ring-1 focus:ring-amber-500 font-bold"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Simpan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingProfesiId(null);
                      setEditingProfesiName('');
                    }}
                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              </form>
            )}

            {/* LIST OF PROFESSIONS */}
            <div className="space-y-1 text-left">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Daftar Rumpun saat ini ({profesiSdmk.length})</span>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl max-h-[220px] overflow-y-auto">
                {profesiSdmk.map((p, idx) => (
                  <div key={p.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50 bg-white transition first:rounded-t-xl last:rounded-b-xl">
                    <div className="flex items-center space-x-2 font-medium">
                      <span className="text-[10px] font-mono text-slate-400 w-5 text-right">{idx + 1}.</span>
                      <span className="text-slate-800 font-bold">{p.nama_profesi}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProfesiId(p.id);
                          setEditingProfesiName(p.nama_profesi);
                        }}
                        className="p-1 hover:bg-slate-100 text-teal-600 hover:text-teal-850 rounded transition cursor-pointer"
                        title="Edit nama rumpun profesi"
                      >
                        <Edit size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setProfesiToDelete(p)}
                        className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-750 rounded transition cursor-pointer"
                        title="Hapus rumpun profesi"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end items-center mt-6 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowManageProfesi(false);
                  setEditingProfesiId(null);
                }}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-lg text-xs font-bold transition cursor-pointer"
              >
                Selesai & Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================= MODAL: KONFIRMASI HAPUS RUMPUN PROFESI ======================= */}
      {profesiToDelete && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-[60] backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-rose-50 text-rose-600 rounded-full">
                <Trash2 size={24} />
              </div>
              <div>
                <h4 className="font-bold font-display text-sm uppercase tracking-wide text-slate-900">Hapus Rumpun Profesi</h4>
                <p className="text-[10px] text-slate-400 font-mono">DINKES KAB. LOMBOK BARAT</p>
              </div>
            </div>
            
            <div className="bg-rose-50/70 border border-rose-200/55 rounded-xl p-4 my-3 text-left">
              <p className="text-xs text-slate-800 leading-relaxed">
                Apakah Anda yakin ingin menghapus rumpun profesi <strong className="text-rose-600">"{profesiToDelete.nama_profesi}"</strong> secara permanen?
              </p>
              <p className="text-[10px] text-rose-800 bg-rose-100 p-2 rounded-lg border border-rose-300/40 mt-3 font-semibold leading-normal">
                Tindakan ini akan mempengaruhi rekapitulasi pelaporan di semua Puskesmas. Data tidak dapat dikembalikan.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 mt-5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setProfesiToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProfesi}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Ya, Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
