import { collection, addDoc, getDocs } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { db, secondaryAuth } from './src/config/firebase.js';

const APP_ID = 'bumi-adipura-8ed0a';
const DEFAULT_PASSWORD = 'admin123';

const RW_ACCOUNT = {
  email: 'admin.rw@bumiadipura.com',
  password: DEFAULT_PASSWORD,
  name: 'Super Admin RW',
  role: 'RW'
};


function generateAdminAccounts() {
  return [RW_ACCOUNT];
}


async function createAuthUser(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth, 
      email, 
      password
    );
    return { success: true, uid: userCredential.user.uid };
  } catch (error) {
    // User might already exist
    if (error.code === 'auth/email-already-in-use') {
      return { success: false, error: 'Email already exists in Authentication' };
    }
    return { success: false, error: error.message };
  }
}


async function saveToFirestore(adminData) {
  const adminRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'admin_accounts');
  
  const firestoreData = {
    uid: adminData.uid,
    email: adminData.email,
    name: adminData.name,
    role: adminData.role,
    createdAt: new Date().toISOString()
  };


  if (adminData.role === 'RT') {
    firestoreData.rtNumber = adminData.rtNumber;
  }

  await addDoc(adminRef, firestoreData);
}


async function seedAdminAccounts() {
  try {
    // Check if collection already has data
    const adminRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'admin_accounts');
    const snapshot = await getDocs(adminRef);
    
    if (!snapshot.empty) {
      console.log(`⚠️  Collection already has ${snapshot.size} document(s).`);
      console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Generate and process account
    const account = RW_ACCOUNT;
    console.log(`Creating admin account: ${account.name}...`);

    // Step 1: Create user in Firebase Authentication
    const authResult = await createAuthUser(account.email, account.password);
    
    if (!authResult.success) {
      console.error(`❌ Failed: ${authResult.error}`);
      return;
    }

    // Step 2: Save metadata to Firestore
    await saveToFirestore({
      uid: authResult.uid,
      email: account.email,
      name: account.name,
      role: account.role
    });

    console.log(`✅ Success!\n`);
    console.log('Login Credentials:');
    console.log(`  Email: ${account.email}`);
    console.log(`  Password: ${DEFAULT_PASSWORD}`);
    console.log(`  UID: ${authResult.uid}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Check Firebase credentials and permissions.');
  }

  process.exit(0);
}

// Run seeding
console.log('🔥 Bumi Adipura - Admin Seeder\n');
seedAdminAccounts();
