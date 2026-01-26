import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db, APP_ID } from '../config';

/**
 * Seed database with dummy data if collections are empty
 * Used for demo/development purposes
 */
export const seedDatabase = async () => {
    // 1. Residents
    const residentsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'residents');
    const resSnap = await getDocs(residentsRef);
    if (resSnap.empty) {
        const dummyResidents = [
            { name: "Andi Agus Salim", unit: "A1/18", phone: "081234567890", job: "Dosen", status: "Tetap", family: [{name: "Siti", relation: "Istri"}, {name: "Budi", relation: "Anak"}], cluster: "Cluster A", createdAt: new Date().toISOString() },
            { name: "Budi Santoso", unit: "A2/05", phone: "081298765432", job: "Wiraswasta", status: "Tetap", family: [{name: "Ani", relation: "Istri"}], cluster: "Cluster A", createdAt: new Date().toISOString() },
            { name: "Citra Dewi", unit: "B1/12", phone: "081345678901", job: "Dokter", status: "Kontrak", family: [], cluster: "Cluster B", createdAt: new Date().toISOString() },
            { name: "Doni Pratama", unit: "C3/09", phone: "081456789012", job: "Karyawan Swasta", status: "Tetap", family: [{name: "Eka", relation: "Istri"}, {name: "Fajar", relation: "Anak"}], cluster: "Cluster C", createdAt: new Date().toISOString() },
            { name: "Eko Yulianto", unit: "A1/20", phone: "081567890123", job: "PNS", status: "Tetap", family: [{name: "Rina", relation: "Istri"}], cluster: "Cluster A", createdAt: new Date().toISOString() }
        ];
        dummyResidents.forEach(async (r) => await addDoc(residentsRef, r));
        console.log("Seeded Residents");
    }

    // 2. Transactions
    const transRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'transactions');
    const transSnap = await getDocs(transRef);
    if (transSnap.empty) {
        const dummyTrans = [
            { type: "Pemasukan", category: "IPL", amount: 2500000, description: "IPL Cluster A - Jan 2025", date: "2025-01-05", scope: "RW", createdBy: "Admin RW", createdAt: new Date().toISOString() },
            { type: "Pengeluaran", category: "Operasional", amount: 1500000, description: "Gaji Keamanan (3 Org)", date: "2025-01-02", scope: "RW", createdBy: "Admin RW", createdAt: new Date().toISOString() },
            { type: "Pemasukan", category: "Sumbangan", amount: 500000, description: "Sumbangan 17an Warga", date: "2024-08-10", scope: "RT01", createdBy: "Ketua RT 01", createdAt: new Date().toISOString() },
            { type: "Pengeluaran", category: "Perbaikan", amount: 300000, description: "Ganti Lampu Jalan Blok A", date: "2025-01-10", scope: "RT01", createdBy: "Ketua RT 01", createdAt: new Date().toISOString() }
        ];
        dummyTrans.forEach(async (t) => await addDoc(transRef, t));
        console.log("Seeded Transactions");
    }

    // 3. Events
    const eventsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'events');
    const eventsSnap = await getDocs(eventsRef);
    if (eventsSnap.empty) {
        const dummyEvents = [
            { title: 'Posyandu Balita', date: '15 Jan 2025', location: 'Balai RW', category: 'Kesehatan' },
            { title: 'Pengajian Rutin', date: '20 Jan 2025', location: 'Masjid Al Kahfi', category: 'Keagamaan' },
            { title: 'Kerja Bakti', date: '25 Jan 2025', location: 'Lingkungan RT 06', category: 'Lingkungan' },
            { title: 'Rapat Pengurus', date: '01 Feb 2025', location: 'Rumah Pak RW', category: 'Umum' }
        ];
        dummyEvents.forEach(async (e) => await addDoc(eventsRef, e));
        console.log("Seeded Events");
    }

    // 4. News
    const newsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'news');
    const newsSnap = await getDocs(newsRef);
    if (newsSnap.empty) {
        const dummyNews = [
            { title: "Jadwal Pengambilan Sampah Baru", content: "Mulai bulan depan, pengambilan sampah akan dilakukan setiap hari Senin dan Kamis pagi.", date: "10 Jan 2025", cat: "Pengumuman", sender: "Pengurus RW", color: "bg-blue-100 text-blue-700", createdAt: new Date().toISOString() },
            { title: "Waspada Demam Berdarah", content: "Mohon warga rutin menguras bak mandi dan menutup tempat penampungan air.", date: "12 Jan 2025", cat: "Kesehatan", sender: "Puskesmas", color: "bg-red-100 text-red-700", createdAt: new Date().toISOString() }
        ];
        dummyNews.forEach(async (n) => await addDoc(newsRef, n));
        console.log("Seeded News");
    }

    // 5. Reports
    const reportsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'reports');
    const repSnap = await getDocs(reportsRef);
    if (repSnap.empty) {
        const dummyReports = [
            { category: 'Keamanan', description: 'Ada orang mencurigakan di sekitar taman blok A jam 2 malam.', status: 'OPEN', createdAt: new Date().toISOString(), userId: 'dummy_user_1', userName: 'Budi Santoso', userUnit: 'A2/05' },
            { category: 'Kebersihan', description: 'Sampah di tong sampah umum sudah penuh belum diangkut.', status: 'IN_PROGRESS', createdAt: new Date(Date.now() - 86400000).toISOString(), userId: 'dummy_user_2', userName: 'Citra Dewi', userUnit: 'B1/12' },
            { category: 'Infrastruktur', description: 'Lampu PJU di jalan utama mati.', status: 'DONE', createdAt: new Date(Date.now() - 172800000).toISOString(), userId: 'dummy_user_3', userName: 'Doni Pratama', userUnit: 'C3/09' }
        ];
        dummyReports.forEach(async (r) => await addDoc(reportsRef, r));
        console.log("Seeded Reports");
    }

    // 6. Posts (Forum)
    const postsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'posts');
    const postSnap = await getDocs(postsRef);
    if (postSnap.empty) {
        const dummyPosts = [
            { content: "Info tukang galon yang masih buka jam segini dong?", author: "Andi Agus", createdAt: new Date().toISOString(), likes: 2 },
            { content: "Ada yang nemu kucing warna oranye di sekitar blok B?", author: "Citra Dewi", createdAt: new Date(Date.now() - 3600000).toISOString(), likes: 5 },
            { content: "Terima kasih bapak-bapak yang sudah bantu kerja bakti tadi pagi.", author: "Pak RT 01", createdAt: new Date(Date.now() - 7200000).toISOString(), likes: 10 }
        ];
        dummyPosts.forEach(async (p) => await addDoc(postsRef, p));
        console.log("Seeded Posts");
    }
};
