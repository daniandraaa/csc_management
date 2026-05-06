-- ============================================
-- CSC Management — Complete Setup
-- Run this in Supabase SQL Editor
-- Adds password columns + all member data
-- ============================================

-- ============================================
-- 1. ADD PASSWORD COLUMNS (if not exist)
-- ============================================
ALTER TABLE members ADD COLUMN IF NOT EXISTS password_hash TEXT DEFAULT NULL;
ALTER TABLE members ADD COLUMN IF NOT EXISTS has_set_password BOOLEAN DEFAULT FALSE;

-- ============================================
-- 1b. ADD TIMELINE DATE RANGE COLUMNS
-- ============================================
ALTER TABLE timeline_entries ADD COLUMN IF NOT EXISTS end_date DATE DEFAULT NULL;
ALTER TABLE timeline_entries ADD COLUMN IF NOT EXISTS is_full_day BOOLEAN DEFAULT FALSE;

-- Update role constraint to include all roles
ALTER TABLE members DROP CONSTRAINT IF EXISTS members_role_check;
ALTER TABLE members ADD CONSTRAINT members_role_check 
    CHECK (role IN ('BOE', 'C Level', 'Secretary', 'Staff', 'Administration', 'Business Partner'));

-- ============================================
-- 2. ADD MEMBERS FOR EACH ROLE/DEPARTMENT
-- (Skip if already exist based on NIM)
-- ============================================

-- === EXECUTIVE ===

-- Secretary - Executive
INSERT INTO members (full_name, nim, email, phone, department, role, position)
SELECT 'Sari Dewi Lestari', '1301230002', 'sari.dewi@csc.telkomuniversity.ac.id', '081234567802', 'Executive', 'Secretary', 'Sekretaris Umum'
WHERE NOT EXISTS (SELECT 1 FROM members WHERE nim = '1301230002');

-- Administration - Executive
INSERT INTO members (full_name, nim, email, phone, department, role, position)
SELECT 'Maya Sari Putri', '1301230013', 'maya.sari@csc.telkomuniversity.ac.id', '081234567813', 'Executive', 'Administration', 'Admin & Tata Usaha'
WHERE NOT EXISTS (SELECT 1 FROM members WHERE nim = '1301230013');

-- === HUMAN RESOURCE ===

-- Staff HR 1
INSERT INTO members (full_name, nim, email, phone, department, role, position)
SELECT 'Hana Safitri', '1301230008', 'hana.safitri@csc.telkomuniversity.ac.id', '081234567808', 'Human Resource', 'Staff', 'Staff HR - Performance'
WHERE NOT EXISTS (SELECT 1 FROM members WHERE nim = '1301230008');

-- Staff HR 2
INSERT INTO members (full_name, nim, email, phone, department, role, position)
SELECT 'Rizky Aditya', '1301230016', 'rizky.aditya@csc.telkomuniversity.ac.id', '081234567816', 'Human Resource', 'Staff', 'Staff HR - Counseling'
WHERE NOT EXISTS (SELECT 1 FROM members WHERE nim = '1301230016');

-- Staff HR 3
INSERT INTO members (full_name, nim, email, phone, department, role, position)
SELECT 'Nurul Hidayah', '1301230017', 'nurul.hidayah@csc.telkomuniversity.ac.id', '081234567817', 'Human Resource', 'Staff', 'Staff HR - Advocacy'
WHERE NOT EXISTS (SELECT 1 FROM members WHERE nim = '1301230017');

-- === MARKETING ===

-- C Level - Marketing
INSERT INTO members (full_name, nim, email, phone, department, role, position)
SELECT 'Dina Putri Ramadhani', '1301230004', 'dina.putri@csc.telkomuniversity.ac.id', '081234567804', 'Marketing', 'C Level', 'Chief Marketing Officer'
WHERE NOT EXISTS (SELECT 1 FROM members WHERE nim = '1301230004');

-- Staff Marketing 1
INSERT INTO members (full_name, nim, email, phone, department, role, position)
SELECT 'Irham Maulana', '1301230009', 'irham.maulana@csc.telkomuniversity.ac.id', '081234567809', 'Marketing', 'Staff', 'Staff Content Creator'
WHERE NOT EXISTS (SELECT 1 FROM members WHERE nim = '1301230009');

-- Staff Marketing 2
INSERT INTO members (full_name, nim, email, phone, department, role, position)
SELECT 'Naufal Hidayat', '1301230014', 'naufal.hidayat@csc.telkomuniversity.ac.id', '081234567814', 'Marketing', 'Staff', 'Staff Desainer'
WHERE NOT EXISTS (SELECT 1 FROM members WHERE nim = '1301230014');

-- Staff Marketing 3
INSERT INTO members (full_name, nim, email, phone, department, role, position)
SELECT 'Amira Zahra', '1301230018', 'amira.zahra@csc.telkomuniversity.ac.id', '081234567818', 'Marketing', 'Staff', 'Staff Media Partner'
WHERE NOT EXISTS (SELECT 1 FROM members WHERE nim = '1301230018');

-- === BUSINESS ===

-- C Level - Business
INSERT INTO members (full_name, nim, email, phone, department, role, position)
SELECT 'Gilang Ramadhan', '1301230007', 'gilang.ramadhan@csc.telkomuniversity.ac.id', '081234567807', 'Business', 'C Level', 'Chief Business Officer'
WHERE NOT EXISTS (SELECT 1 FROM members WHERE nim = '1301230007');

-- Staff Business 1
INSERT INTO members (full_name, nim, email, phone, department, role, position)
SELECT 'Lina Wati Permata', '1301230012', 'lina.wati@csc.telkomuniversity.ac.id', '081234567812', 'Business', 'Staff', 'Staff Partnership'
WHERE NOT EXISTS (SELECT 1 FROM members WHERE nim = '1301230012');

-- Staff Business 2
INSERT INTO members (full_name, nim, email, phone, department, role, position)
SELECT 'Arif Setiawan', '1301230019', 'arif.setiawan@csc.telkomuniversity.ac.id', '081234567819', 'Business', 'Staff', 'Staff Business Development'
WHERE NOT EXISTS (SELECT 1 FROM members WHERE nim = '1301230019');

-- === OPERATING ===

-- C Level - Operating
INSERT INTO members (full_name, nim, email, phone, department, role, position)
SELECT 'Eko Wijaya Putra', '1301230005', 'eko.wijaya@csc.telkomuniversity.ac.id', '081234567805', 'Operating', 'C Level', 'Chief Operating Officer'
WHERE NOT EXISTS (SELECT 1 FROM members WHERE nim = '1301230005');

-- Staff Operating 1
INSERT INTO members (full_name, nim, email, phone, department, role, position)
SELECT 'Jasmine Putri Andini', '1301230010', 'jasmine.putri@csc.telkomuniversity.ac.id', '081234567810', 'Operating', 'Staff', 'Staff Program'
WHERE NOT EXISTS (SELECT 1 FROM members WHERE nim = '1301230010');

-- Staff Operating 2
INSERT INTO members (full_name, nim, email, phone, department, role, position)
SELECT 'Bayu Prakoso', '1301230020', 'bayu.prakoso@csc.telkomuniversity.ac.id', '081234567820', 'Operating', 'Staff', 'Staff KPI & Evaluasi'
WHERE NOT EXISTS (SELECT 1 FROM members WHERE nim = '1301230020');

-- Staff Operating 3
INSERT INTO members (full_name, nim, email, phone, department, role, position)
SELECT 'Dewi Anggraini', '1301230021', 'dewi.anggraini@csc.telkomuniversity.ac.id', '081234567821', 'Operating', 'Staff', 'Staff SOP'
WHERE NOT EXISTS (SELECT 1 FROM members WHERE nim = '1301230021');

-- === FINANCIAL ===

-- C Level - Financial
INSERT INTO members (full_name, nim, email, phone, department, role, position)
SELECT 'Fira Anggraeni', '1301230006', 'fira.anggraeni@csc.telkomuniversity.ac.id', '081234567806', 'Financial', 'C Level', 'Chief Financial Officer'
WHERE NOT EXISTS (SELECT 1 FROM members WHERE nim = '1301230006');

-- Staff Financial 1
INSERT INTO members (full_name, nim, email, phone, department, role, position)
SELECT 'Kevin Adrianto', '1301230011', 'kevin.adrianto@csc.telkomuniversity.ac.id', '081234567811', 'Financial', 'Staff', 'Staff Reimbursement'
WHERE NOT EXISTS (SELECT 1 FROM members WHERE nim = '1301230011');

-- Staff Financial 2
INSERT INTO members (full_name, nim, email, phone, department, role, position)
SELECT 'Putri Rahayu', '1301230022', 'putri.rahayu@csc.telkomuniversity.ac.id', '081234567822', 'Financial', 'Staff', 'Staff Keuangan'
WHERE NOT EXISTS (SELECT 1 FROM members WHERE nim = '1301230022');

-- ============================================
-- SUMMARY: Total members added
-- ============================================
-- Executive: Daniandra (BOE, existing), Fatah (C Level HR, existing), Sari (Secretary), Maya (Administration)
-- Human Resource: Fatah (C Level, existing), Hana (Staff), Rizky (Staff), Nurul (Staff)
-- Marketing: Dina (C Level), Irham (Staff), Naufal (Staff), Amira (Staff)
-- Business: Gilang (C Level), Lina (Staff), Arif (Staff)
-- Operating: Eko (C Level), Jasmine (Staff), Bayu (Staff), Dewi (Staff)
-- Financial: Fira (C Level), Kevin (Staff), Putri (Staff)
-- ============================================

-- Verify: count members by department and role
SELECT department, role, COUNT(*) as total 
FROM members 
GROUP BY department, role 
ORDER BY department, role;
