#!/usr/bin/env node

console.log('\n🔍 Checking Firebase Realtime Database Configuration\n');

// Check environment variables
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');

if (!fs.existsSync(envPath)) {
  console.log('❌ .env.local file not found!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const lines = envContent.split('\n');

let foundDatabaseURL = false;
let databaseURL = '';

console.log('📋 Environment Variables:\n');

lines.forEach(line => {
  if (line.includes('NEXT_PUBLIC_FIREBASE_DATABASE_URL')) {
    foundDatabaseURL = true;
    databaseURL = line.split('=')[1];
    console.log(`✅ ${line}`);
  } else if (line.startsWith('NEXT_PUBLIC_FIREBASE_')) {
    console.log(`   ${line}`);
  }
});

console.log('\n');

if (!foundDatabaseURL) {
  console.log('❌ NEXT_PUBLIC_FIREBASE_DATABASE_URL not found in .env.local');
  console.log('\n📝 Add this line to .env.local:');
  console.log('NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://studio-7778498060-d5b43-default-rtdb.firebaseio.com/');
  process.exit(1);
}

if (databaseURL !== 'https://studio-7778498060-d5b43-default-rtdb.firebaseio.com/') {
  console.log(`⚠️  Database URL might be incorrect:`);
  console.log(`   Found: ${databaseURL}`);
  console.log(`   Expected: https://studio-7778498060-d5b43-default-rtdb.firebaseio.com/`);
  console.log('');
}

// Check if files exist
console.log('📁 File Checks:\n');

const filesToCheck = [
  'src/firebase/config.ts',
  'src/firebase/provider.tsx',
  'src/firebase/client-provider.tsx',
  'src/firebase/use-realtime-db.ts',
  'src/components/dashboard/members/new-member-form.tsx'
];

filesToCheck.forEach(file => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`${exists ? '✅' : '❌'} ${file}`);
});

console.log('\n');

// Check if provider includes realtimeDb
const providerPath = path.join(__dirname, 'src/firebase/provider.tsx');
const providerContent = fs.readFileSync(providerPath, 'utf8');

if (providerContent.includes('realtimeDb: Database')) {
  console.log('✅ Provider includes realtimeDb in types');
} else {
  console.log('❌ Provider missing realtimeDb in types');
}

if (providerContent.includes('realtimeDb,') && providerContent.includes('}: FirebaseProviderProps')) {
  console.log('✅ Provider accepts realtimeDb prop');
} else {
  console.log('❌ Provider not accepting realtimeDb prop');
}

console.log('\n');

// Check client provider
const clientProviderPath = path.join(__dirname, 'src/firebase/client-provider.tsx');
const clientProviderContent = fs.readFileSync(clientProviderPath, 'utf8');

if (clientProviderContent.includes('realtimeDb={firebaseServices.realtimeDb}')) {
  console.log('✅ Client provider passes realtimeDb');
} else {
  console.log('❌ Client provider not passing realtimeDb');
}

console.log('\n');

console.log('🎯 Next Steps:\n');
console.log('1. Restart your dev server: npm run dev');
console.log('2. Open: test-realtime-db-connection.html in your browser');
console.log('3. Click "Test Connection" and "Write Test Data"');
console.log('4. Check Firebase Console → Realtime Database\n');

console.log('✨ Configuration check complete!\n');
