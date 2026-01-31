/**
 * SEEDER SCRIPT: Create Dummy Resident Data
 * 
 * Usage (Browser Console):
 * 1. Login to admin panel
 * 2. Open browser console (F12)
 * 3. Copy paste the code at bottom
 * 4. Press Enter
 * 
 * This will create 2 sample residents for RT 01 to test IPL billing
 */

import { collection, addDoc } from 'firebase/firestore';
import { db, APP_ID } from '../src/config/firebase.js';

const DUMMY_RESIDENTS = [
  // RT 01 - 2 Residents Only
  {
    name: "Budi Santoso",
    unit: "A-01",
    rt: "01",
    phone: "08123456001",
    job: "Wiraswasta",
    status: "Tetap",
    family: [
      { name: "Siti Aminah", relation: "Istri" },
      { name: "Ahmad Budi", relation: "Anak" }
    ]
  },
  {
    name: "Ani Wijaya",
    unit: "A-02",
    rt: "01",
    phone: "08123456002",
    job: "Guru/Dosen",
    status: "Tetap",
    family: [
      { name: "Hendra Wijaya", relation: "Suami" },
      { name: "Rizky Wijaya", relation: "Anak" }
    ]
  }
];

export async function seedResidents() {
  try {
    console.log('🌱 Starting resident seeder...');
    console.log('Creating 2 residents for RT 01...\n');
    
    const residentsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'residents');
    let count = 0;
    
    for (const resident of DUMMY_RESIDENTS) {
      const finalUnit = `${resident.unit} (RT ${resident.rt})`;
      
      await addDoc(residentsRef, {
        ...resident,
        unit: finalUnit,
        createdAt: new Date().toISOString(),
        isDummy: true // Flag for easy cleanup
      });
      
      count++;
      console.log(`✅ Created: ${resident.name} - ${finalUnit}`);
    }
    
    console.log(`\n🎉 Successfully created ${count} dummy residents!`);
    console.log(`\nRT 01: 2 residents (Budi Santoso, Ani Wijaya)`);
    console.log(`\n📋 Next: Generate IPL billing from RW account!`);
    
    return { success: true, count };
  } catch (error) {
    console.error('❌ Error seeding residents:', error);
    return { success: false, error: error.message };
  }
}

// For cleanup
export async function clearDummyResidents() {
  try {
    const { getDocs, query, where, deleteDoc, doc } = await import('firebase/firestore');
    
    const residentsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'residents');
    const q = query(residentsRef, where('isDummy', '==', true));
    const snapshot = await getDocs(q);
    
    let count = 0;
    for (const docSnap of snapshot.docs) {
      await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'residents', docSnap.id));
      count++;
    }
    
    console.log(`🗑️ Deleted ${count} dummy residents`);
    return { success: true, count };
  } catch (error) {
    console.error('❌ Error clearing dummy residents:', error);
    return { success: false, error: error.message };
  }
}

// Auto-execute if run directly
if (typeof window !== 'undefined') {
  console.log('📋 Residents Seeder Ready!');
  console.log('📊 Will create: 2 residents for RT 01');
  console.log('\n💡 Run: seedResidents() to create dummy data');
  console.log('🗑️  Run: clearDummyResidents() to remove dummy data');
}
