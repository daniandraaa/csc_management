-- ============================================
-- CSC Management — Seed Data (Dummy Accounts)
-- Run AFTER schema-update.sql
-- ============================================

-- Clear existing data (optional, be careful in production)
-- DELETE FROM members;

-- ============================================
-- DUMMY MEMBERS (15 accounts)
-- ============================================

-- 1. BOE - Executive
INSERT INTO members (full_name, nim, email, phone, department, role, position) VALUES
('Andi Pratama', '1301210001', 'andi.pratama@csc.telkomuniversity.ac.id', '081234567801', 'Executive', 'BOE', 'Ketua Umum');

-- 2. Secretary - Executive
INSERT INTO members (full_name, nim, email, phone, department, role, position) VALUES
('Sari Dewi', '1301210002', 'sari.dewi@csc.telkomuniversity.ac.id', '081234567802', 'Executive', 'Secretary', 'Sekretaris Umum');

-- 3. C Level - Human Resource
INSERT INTO members (full_name, nim, email, phone, department, role, position) VALUES
('Budi Santoso', '1301210003', 'budi.santoso@csc.telkomuniversity.ac.id', '081234567803', 'Human Resource', 'C Level', 'Head of HR');

-- 4. C Level - Marketing
INSERT INTO members (full_name, nim, email, phone, department, role, position) VALUES
('Dina Putri', '1301210004', 'dina.putri@csc.telkomuniversity.ac.id', '081234567804', 'Marketing', 'C Level', 'Head of Marketing');

-- 5. C Level - Operating
INSERT INTO members (full_name, nim, email, phone, department, role, position) VALUES
('Eko Wijaya', '1301210005', 'eko.wijaya@csc.telkomuniversity.ac.id', '081234567805', 'Operating', 'C Level', 'Head of Operating');

-- 6. C Level - Financial
INSERT INTO members (full_name, nim, email, phone, department, role, position) VALUES
('Fira Anggraeni', '1301210006', 'fira.anggraeni@csc.telkomuniversity.ac.id', '081234567806', 'Financial', 'C Level', 'Head of Finance');

-- 7. C Level - Business
INSERT INTO members (full_name, nim, email, phone, department, role, position) VALUES
('Gilang Ramadhan', '1301210007', 'gilang.ramadhan@csc.telkomuniversity.ac.id', '081234567807', 'Business', 'C Level', 'Head of Business');

-- 8. Staff - Human Resource
INSERT INTO members (full_name, nim, email, phone, department, role, position) VALUES
('Hana Safitri', '1301210008', 'hana.safitri@csc.telkomuniversity.ac.id', '081234567808', 'Human Resource', 'Staff', 'Staff HR');

-- 9. Staff - Marketing
INSERT INTO members (full_name, nim, email, phone, department, role, position) VALUES
('Irham Maulana', '1301210009', 'irham.maulana@csc.telkomuniversity.ac.id', '081234567809', 'Marketing', 'Staff', 'Staff Marketing');

-- 10. Staff - Operating
INSERT INTO members (full_name, nim, email, phone, department, role, position) VALUES
('Jasmine Putri', '1301210010', 'jasmine.putri@csc.telkomuniversity.ac.id', '081234567810', 'Operating', 'Staff', 'Staff Operating');

-- 11. Staff - Financial
INSERT INTO members (full_name, nim, email, phone, department, role, position) VALUES
('Kevin Adrianto', '1301210011', 'kevin.adrianto@csc.telkomuniversity.ac.id', '081234567811', 'Financial', 'Staff', 'Staff Finance');

-- 12. Staff - Business
INSERT INTO members (full_name, nim, email, phone, department, role, position) VALUES
('Lina Wati', '1301210012', 'lina.wati@csc.telkomuniversity.ac.id', '081234567812', 'Business', 'Staff', 'Staff Business');

-- 13. Administration
INSERT INTO members (full_name, nim, email, phone, department, role, position) VALUES
('Maya Sari', '1301210013', 'maya.sari@csc.telkomuniversity.ac.id', '081234567813', 'Executive', 'Administration', 'Admin & Tata Usaha');

-- 14. Staff - Marketing (extra)
INSERT INTO members (full_name, nim, email, phone, department, role, position) VALUES
('Naufal Hidayat', '1301210014', 'naufal.hidayat@csc.telkomuniversity.ac.id', '081234567814', 'Marketing', 'Staff', 'Staff Desainer');

-- 15. Business Partner (external)
INSERT INTO members (full_name, nim, email, phone, department, role, position) VALUES
('PT Mitra Teknologi', NULL, 'contact@mitrateknologi.id', '02112345678', 'Business', 'Business Partner', 'Mitra Bisnis');

-- ============================================
-- SAMPLE HR DATA
-- ============================================

-- Performance Rankings (using subquery to get member IDs)
INSERT INTO performance_rankings (member_id, period, score, notes)
SELECT id, 'Q1 2026', 92.5, 'Sangat aktif dalam kegiatan organisasi'
FROM members WHERE nim = '1301210008';

INSERT INTO performance_rankings (member_id, period, score, notes)
SELECT id, 'Q1 2026', 88.0, 'Kontribusi baik di bidang marketing'
FROM members WHERE nim = '1301210009';

INSERT INTO performance_rankings (member_id, period, score, notes)
SELECT id, 'Q1 2026', 85.5, 'Kinerja stabil dan bertanggung jawab'
FROM members WHERE nim = '1301210010';

INSERT INTO performance_rankings (member_id, period, score, notes)
SELECT id, 'Q1 2026', 79.0, 'Perlu peningkatan komunikasi tim'
FROM members WHERE nim = '1301210011';

INSERT INTO performance_rankings (member_id, period, score, notes)
SELECT id, 'Q1 2026', 95.0, 'Outstanding leadership dan inisiatif'
FROM members WHERE nim = '1301210014';

-- Advocacy & Aspirations
INSERT INTO advocacy_aspirations (member_id, title, description, category, status)
SELECT id, 'Penambahan Peralatan Studio', 'Mohon penambahan ring light dan mic untuk kebutuhan konten', 'aspiration', 'pending'
FROM members WHERE nim = '1301210009';

INSERT INTO advocacy_aspirations (member_id, title, description, category, status)
SELECT id, 'Jadwal Rapat Lebih Fleksibel', 'Mengajukan agar rapat bisa dilakukan online untuk yang berhalangan', 'advocacy', 'in_review'
FROM members WHERE nim = '1301210010';

INSERT INTO advocacy_aspirations (member_id, title, description, category, status, response)
SELECT id, 'Pelatihan Public Speaking', 'Ingin mengadakan pelatihan public speaking untuk seluruh anggota', 'aspiration', 'approved', 'Disetujui, akan dijadwalkan bulan depan'
FROM members WHERE nim = '1301210008';

-- Counseling Requests
INSERT INTO counseling_requests (member_id, subject, description, preferred_date, status)
SELECT id, 'Manajemen Waktu', 'Butuh bantuan mengatur waktu antara kuliah dan organisasi', '2026-03-10', 'pending'
FROM members WHERE nim = '1301210011';

INSERT INTO counseling_requests (member_id, subject, description, preferred_date, status, scheduled_date)
SELECT id, 'Career Planning', 'Ingin diskusi tentang arah karir setelah lulus', '2026-03-15', 'scheduled', '2026-03-15'
FROM members WHERE nim = '1301210012';

-- Logbook Entries
INSERT INTO logbook_entries (member_id, date, title, description, category, hours_spent)
SELECT id, '2026-03-01', 'Desain Poster Workshop AI', 'Membuat desain poster untuk event Workshop AI CSC', 'Design', 3.0
FROM members WHERE nim = '1301210009';

INSERT INTO logbook_entries (member_id, date, title, description, category, hours_spent)
SELECT id, '2026-03-02', 'Rekap Data Anggota', 'Mengupdate database anggota dan memvalidasi data NIM', 'Administrative', 2.5
FROM members WHERE nim = '1301210008';

INSERT INTO logbook_entries (member_id, date, title, description, category, hours_spent)
SELECT id, '2026-03-01', 'Revisi Proposal Sponsor', 'Melakukan revisi proposal sponsor untuk kegiatan seminar', 'Business', 4.0
FROM members WHERE nim = '1301210012';

-- ============================================
-- SAMPLE PROGRAMS & TIMELINE
-- ============================================

-- Programs
INSERT INTO programs (name, description, objectives, start_date, end_date, status, budget)
VALUES
('Workshop AI & Machine Learning', 'Workshop mengenai AI dan ML untuk mahasiswa', 'Meningkatkan pemahaman tentang AI', '2026-03-15', '2026-03-16', 'planned', 5000000),
('Seminar Kewirausahaan', 'Seminar dengan pembicara dari startup lokal', 'Mendorong jiwa wirausaha', '2026-04-01', '2026-04-01', 'planned', 3000000),
('CSC Cup 2026', 'Kompetisi internal antar bidang dalam CSC', 'Mempererat hubungan antar anggota', '2026-05-10', '2026-05-12', 'planned', 8000000),
('Training Leadership', 'Pelatihan kepemimpinan untuk C Level dan Secretary', 'Mengembangkan kemampuan leadership', '2026-03-20', '2026-03-20', 'in_progress', 2000000),
('Open Recruitment CSC 2026', 'Penerimaan anggota baru CSC periode 2026', 'Menambah anggota baru yang berkualitas', '2026-02-01', '2026-02-28', 'completed', 1500000);

-- Timeline Entries
INSERT INTO timeline_entries (title, description, type, event_date, start_time, end_time, location, attendees_text, decisions)
VALUES
('Rapat Mingguan #8', 'Pembahasan progres program kerja Q1', 'meeting', '2026-03-03', '13:00', '15:00', 'Ruang Meeting CSC', 'Seluruh C Level dan BOE', 'Deadline proposal Workshop AI dipercepat'),
('Workshop AI & ML', 'Workshop intensif AI dan Machine Learning', 'activity', '2026-03-15', '09:00', '17:00', 'Aula Telkom University', 'Seluruh mahasiswa Telkom University', NULL),
('Evaluasi Program Q1', 'Evaluasi keseluruhan program kerja Q1 2026', 'meeting', '2026-03-25', '14:00', '16:00', 'Ruang Meeting CSC', 'BOE, C Level, Secretary', NULL),
('Pengumuman Pemenang CSC Cup', 'Pengumuman pemenang kompetisi CSC Cup 2026', 'announcement', '2026-05-12', NULL, NULL, NULL, 'Seluruh anggota CSC', NULL),
('Training Leadership', 'Pelatihan leadership untuk jajaran pimpinan', 'activity', '2026-03-20', '09:00', '16:00', 'Co-Working Space Lt.3', 'C Level dan Secretary', NULL),
('Rapat Koordinasi Marketing', 'Koordinasi content plan bulan April', 'meeting', '2026-03-28', '10:00', '12:00', 'Online via Zoom', 'Tim Marketing', 'Fokus pada campaign Ramadhan');

-- ============================================
-- SAMPLE EVENTS (for attendance)
-- ============================================

INSERT INTO events (title, description, event_date, start_time, end_time, location, type)
VALUES
('Rapat Mingguan #8', 'Pembahasan progres program kerja', '2026-03-03', '13:00', '15:00', 'Ruang Meeting CSC', 'meeting'),
('Workshop AI & ML', 'Workshop intensif', '2026-03-15', '09:00', '17:00', 'Aula Telkom University', 'training'),
('Training Leadership', 'Pelatihan leadership', '2026-03-20', '09:00', '16:00', 'Co-Working Space Lt.3', 'training');

-- ============================================
-- SAMPLE FINANCIAL DATA
-- ============================================

INSERT INTO reimbursements (member_id, title, description, amount, status)
SELECT id, 'Cetak Banner Workshop AI', 'Reimbursement biaya cetak banner 3x2m untuk Workshop AI', 150000, 'pending'
FROM members WHERE nim = '1301210009';

INSERT INTO reimbursements (member_id, title, description, amount, status)
SELECT id, 'Transportasi Meeting Sponsor', 'Biaya transportasi meeting dengan sponsor di Jakarta', 250000, 'approved'
FROM members WHERE nim = '1301210012';

INSERT INTO financial_transactions (type, category, description, amount, transaction_date)
VALUES
('income', 'Sponsor', 'Sponsor dari PT Mitra Teknologi untuk Workshop AI', 3000000, '2026-03-01'),
('expense', 'Operasional', 'Sewa venue Workshop AI', 1500000, '2026-03-02'),
('income', 'Dana Kampus', 'Alokasi dana dari universitas untuk Q1', 10000000, '2026-01-15'),
('expense', 'Perlengkapan', 'Pembelian alat tulis dan perlengkapan', 500000, '2026-02-20');

-- ============================================
-- SAMPLE BUSINESS DATA
-- ============================================

INSERT INTO business_partners (company_name, description, contact_person, contact_email, partnership_type, status, start_date)
VALUES
('PT Mitra Teknologi', 'Perusahaan software development', 'Rudi Hartono', 'rudi@mitrateknologi.id', 'Sponsor', 'active', '2026-01-01'),
('Startup Digital Nusantara', 'Startup edtech untuk Indonesia', 'Lia Permata', 'lia@digitalnusantara.id', 'Media Partner', 'active', '2026-02-01'),
('CV Kreatif Indonesia', 'Agency kreatif dan branding', 'Dedi Setiawan', 'dedi@kreatifindonesia.id', 'Vendor', 'prospective', NULL);

-- ============================================
-- SAMPLE MARKETING DATA
-- ============================================

INSERT INTO content_plans (title, platform, content_type, description, scheduled_date, status)
VALUES
('Teaser Workshop AI', 'Instagram', 'reel', 'Video teaser 30 detik untuk Workshop AI & ML', '2026-03-08', 'approved'),
('Poster Workshop AI', 'Instagram', 'post', 'Poster informasi pendaftaran Workshop AI', '2026-03-10', 'draft'),
('Recap Training Leadership', 'Instagram', 'story', 'Story highlight dari kegiatan training leadership', '2026-03-21', 'draft'),
('Article: Tips Manajemen Waktu', 'Medium', 'article', 'Artikel tips manajemen waktu untuk mahasiswa aktif organisasi', '2026-03-25', 'in_review');

INSERT INTO media_partners (name, type, contact_person, contact_email, status)
VALUES
('Tel-U Media', 'University Media', 'Admin Tel-U Media', 'media@telkomuniversity.ac.id', 'active'),
('Bandung Creative Hub', 'Community', 'Reza Akbar', 'reza@bandungcreative.id', 'active');

-- ============================================
-- SAMPLE DOCUMENTS
-- ============================================

INSERT INTO documents (document_number, title, type, sender, recipient, document_date, status, category)
VALUES
('CSC/III/2026/001', 'Surat Permohonan Venue Workshop', 'outgoing', 'CSC Telkom University', 'Bagian Sarana & Prasarana', '2026-03-01', 'sent', 'permohonan'),
('UNV/II/2026/045', 'Surat Undangan Seminar Nasional', 'incoming', 'Universitas Nasional', 'CSC Telkom University', '2026-02-28', 'read', 'undangan'),
('CSC/III/2026/002', 'Proposal Sponsorship Workshop AI', 'outgoing', 'CSC Telkom University', 'PT Mitra Teknologi', '2026-03-02', 'sent', 'proposal');

-- ============================================
-- SAMPLE ADMIN REVIEWS
-- ============================================

INSERT INTO admin_reviews (title, description, submitted_by, secretary_status, admin_status)
SELECT id, 'Review Proposal Workshop AI', 'Proposal kegiatan Workshop AI & ML yang perlu direview', id, 'approved', 'pending'
FROM members WHERE nim = '1301210005';

-- Done! All seed data inserted.
