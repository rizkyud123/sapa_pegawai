-- database_updates.sql
-- Pembaruan Skema Basis Data (PostgreSQL) untuk Rencana Kebutuhan (Renbut) Kemenkes & Pengawasan STR/SIP SatuSehat

-- 1. Tabel Rencana Kebutuhan (Renbut) Nakes Standar Kemenkes
CREATE TABLE IF NOT EXISTS public.renbut_kemenkes (
    id SERIAL PRIMARY KEY,
    id_puskesmas INT REFERENCES public.puskesmas(id) ON DELETE CASCADE,
    jab_fungsional VARCHAR(100) NOT NULL,
    jenjang VARCHAR(100) NOT NULL,
    asn INT DEFAULT 0,
    non_asn INT DEFAULT 0,
    kebutuhan INT DEFAULT 0,
    kesenjangan INT DEFAULT 0,
    keterangan VARCHAR(5) DEFAULT 'K', -- 'K' untuk Kurang, 'S' untuk Sesuai/Terpenuhi
    standar_minimal INT DEFAULT 0,
    abk_kebutuhan NUMERIC(6,2) DEFAULT 0.00,
    projection_data JSONB, -- Menyimpan data deret tahun proyeksi, misal: {"2023": 8, "2024": 9, "2025": 10, "2026": 10}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index b-tree untuk query pencarian cepat dari UI
CREATE INDEX IF NOT EXISTS idx_renbut_puskesmas ON public.renbut_kemenkes(id_puskesmas);
CREATE INDEX IF NOT EXISTS idx_renbut_jab_jenjang ON public.renbut_kemenkes(jab_fungsional, jenjang);

-- 2. Tabel Pengawasan Real-Time Compliance STR / SIP
CREATE TABLE IF NOT EXISTS public.compliance_satusehat (
    id SERIAL PRIMARY KEY,
    nip VARCHAR(50) NOT NULL,
    nama_lengkap VARCHAR(255) NOT NULL,
    id_puskesmas INT REFERENCES public.puskesmas(id) ON DELETE SET NULL,
    document_type VARCHAR(10) CHECK (document_type IN ('STR', 'SIP')),
    document_number VARCHAR(100) NOT NULL,
    tanggal_akhir DATE,
    is_seumur_hidup BOOLEAN DEFAULT FALSE,
    status_compliance VARCHAR(20) DEFAULT 'ACTIVE', -- 'ACTIVE', 'NEAR_EXPIRY', 'EXPIRED', 'MISSING'
    last_sync_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger otomatis untuk memperbarui waktu perubahan updated_at
CREATE OR REPLACE FUNCTION update_renbut_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_update_renbut_timestamp
BEFORE UPDATE ON public.renbut_kemenkes
FOR EACH ROW
EXECUTE FUNCTION update_renbut_timestamp();

-- 3. Penyesuaian Kolom Untuk NIK dan Nomor WhatsApp Pegawai (asn_profiles)
-- Jalankan perintah ini jika Anda perlu menambahkan kolom NIK dan Nomor WhatsApp ke tabel asn_profiles Supabase / PostgreSQL Anda:
ALTER TABLE public.asn_profiles ADD COLUMN IF NOT EXISTS nik VARCHAR(50);
ALTER TABLE public.asn_profiles ADD COLUMN IF NOT EXISTS nomor_wa VARCHAR(50);
