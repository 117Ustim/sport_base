/**
 * Backfill exerciseId в exerciseHistory по базе упражнений конкретного клиента.
 *
 * Usage:
 * node scripts/backfill-exercise-history-ids.js [--clientId=<CLIENT_ID>] [--apply]
 *
 * Default режим: dry-run (без записи в Firestore).
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, orderBy, writeBatch } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  apiKey: "AIzaSyBwS75y3d4T5xPtNYSkh0L2KPKlq-N4Wf4",
  authDomain: "calendar-new-599f8.firebaseapp.com",
  projectId: "calendar-new-599f8",
  storageBucket: "calendar-new-599f8.firebasestorage.app",
  messagingSenderId: "810978067130",
  appId: "1:810978067130:web:195217eefa0c9f269eb883",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const FIRESTORE_BATCH_LIMIT = 450;

const normalizeExerciseName = (name) =>
  String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const resolveExerciseId = (entry = {}) => {
  const rawId = entry.exerciseId || entry.exercise_id;
  if (rawId === null || rawId === undefined) {
    return '';
  }
  return String(rawId).trim();
};

const parseArgs = () => {
  const args = process.argv.slice(2);
  const parsed = {
    clientId: '',
    apply: false,
  };

  args.forEach((arg) => {
    if (arg.startsWith('--clientId=')) {
      parsed.clientId = arg.split('=').slice(1).join('=').trim();
    }
    if (arg === '--apply') {
      parsed.apply = true;
    }
  });

  return parsed;
};

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

async function loginAsAdmin() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('Missing ADMIN_EMAIL or ADMIN_PASSWORD env vars');
  }

  await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
}

async function pickAnyClientId() {
  const clientsRef = collection(db, 'clients');
  const snapshot = await getDocs(clientsRef);

  if (snapshot.empty) {
    throw new Error('No clients found in Firestore');
  }

  const clients = snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data() || {};
    const profile = data.profile || {};
    return {
      id: docSnapshot.id,
      isActive: profile.isActive !== false,
      createdAt: String(profile.createdAt || ''),
    };
  });

  const activeClient = clients
    .filter(client => client.isActive)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];

  return activeClient ? activeClient.id : clients[0].id;
}

async function loadClientExercises(clientId) {
  const exercisesRef = collection(db, 'clientBases', clientId, 'exercises');
  const snapshot = await getDocs(exercisesRef);

  const exerciseIdsByName = new Map();
  snapshot.docs.forEach((docSnapshot) => {
    const data = docSnapshot.data();
    const nameKey = normalizeExerciseName(data.name);
    if (!nameKey) {
      return;
    }

    const existingIds = exerciseIdsByName.get(nameKey) || [];
    if (!existingIds.includes(docSnapshot.id)) {
      existingIds.push(docSnapshot.id);
    }
    exerciseIdsByName.set(nameKey, existingIds);
  });

  return exerciseIdsByName;
}

async function loadGlobalExercises() {
  const globalRef = collection(db, 'exercises');
  const snapshot = await getDocs(globalRef);

  const exerciseIdsByName = new Map();
  snapshot.docs.forEach((docSnapshot) => {
    const data = docSnapshot.data();
    const nameKey = normalizeExerciseName(data.name);
    if (!nameKey) {
      return;
    }

    const existingIds = exerciseIdsByName.get(nameKey) || [];
    if (!existingIds.includes(docSnapshot.id)) {
      existingIds.push(docSnapshot.id);
    }
    exerciseIdsByName.set(nameKey, existingIds);
  });

  return exerciseIdsByName;
}

async function loadClientHistory(clientId) {
  const historyRef = collection(db, 'exerciseHistory');
  const q = query(
    historyRef,
    where('clientId', '==', clientId),
    orderBy('timestamp', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs;
}

async function main() {
  const { clientId: inputClientId, apply } = parseArgs();
  await loginAsAdmin();
  const clientId = inputClientId || await pickAnyClientId();

  console.log(`🚀 Starting exerciseHistory backfill for client: ${clientId}`);
  console.log(`Mode: ${apply ? 'APPLY (write changes)' : 'DRY-RUN (no writes)'}`);

  const exerciseIdsByName = await loadClientExercises(clientId);
  const globalExerciseIdsByName = await loadGlobalExercises();
  const historyDocs = await loadClientHistory(clientId);

  const entriesToUpdate = [];
  let alreadyFilled = 0;
  let unresolvedNoName = 0;
  let unresolvedAmbiguous = 0;
  let unresolvedNoMatch = 0;
  let matchedByClientBase = 0;
  let matchedByGlobalFallback = 0;

  historyDocs.forEach((docSnapshot) => {
    const data = docSnapshot.data();
    if (resolveExerciseId(data)) {
      alreadyFilled++;
      return;
    }

    const nameKey = normalizeExerciseName(data.exerciseName);
    if (!nameKey) {
      unresolvedNoName++;
      return;
    }

    const clientMatchedIds = exerciseIdsByName.get(nameKey) || [];
    if (clientMatchedIds.length === 1) {
      entriesToUpdate.push({
        ref: docSnapshot.ref,
        docId: docSnapshot.id,
        exerciseName: data.exerciseName,
        exerciseId: clientMatchedIds[0],
        source: 'clientBase',
      });
      matchedByClientBase++;
      return;
    }

    const globalMatchedIds = globalExerciseIdsByName.get(nameKey) || [];
    if (globalMatchedIds.length === 1) {
      entriesToUpdate.push({
        ref: docSnapshot.ref,
        docId: docSnapshot.id,
        exerciseName: data.exerciseName,
        exerciseId: globalMatchedIds[0],
        source: 'globalFallback',
      });
      matchedByGlobalFallback++;
      return;
    }

    const hasAmbiguous = clientMatchedIds.length > 1 || globalMatchedIds.length > 1;
    if (hasAmbiguous) {
      unresolvedAmbiguous++;
      return;
    }

    unresolvedNoMatch++;
  });

  console.log('');
  console.log('📊 Summary');
  console.log(`Total history records: ${historyDocs.length}`);
  console.log(`Already have exerciseId: ${alreadyFilled}`);
  console.log(`Will be updated: ${entriesToUpdate.length}`);
  console.log(`Matched by client base: ${matchedByClientBase}`);
  console.log(`Matched by global fallback: ${matchedByGlobalFallback}`);
  console.log(`Unresolved (no name): ${unresolvedNoName}`);
  console.log(`Unresolved (ambiguous name): ${unresolvedAmbiguous}`);
  console.log(`Unresolved (no matching exercise): ${unresolvedNoMatch}`);

  if (entriesToUpdate.length > 0) {
    console.log('');
    console.log('🧩 Preview updates (first 10):');
    entriesToUpdate.slice(0, 10).forEach((entry) => {
      console.log(`- ${entry.docId}: "${entry.exerciseName}" -> ${entry.exerciseId} [${entry.source}]`);
    });
  }

  if (!apply || entriesToUpdate.length === 0) {
    console.log('');
    console.log(apply ? '✅ Nothing to update.' : 'ℹ️ Dry-run complete. Add --apply to write updates.');
    process.exit(0);
  }

  let committed = 0;
  for (let index = 0; index < entriesToUpdate.length; index += FIRESTORE_BATCH_LIMIT) {
    const currentBatch = entriesToUpdate.slice(index, index + FIRESTORE_BATCH_LIMIT);
    const batch = writeBatch(db);

    currentBatch.forEach((entry) => {
      batch.update(entry.ref, {
        exerciseId: entry.exerciseId,
        backfilledAt: new Date().toISOString(),
      });
    });

    await batch.commit();
    committed += currentBatch.length;
    console.log(`✅ Updated: ${committed}/${entriesToUpdate.length}`);
  }

  console.log('');
  console.log('✅ Backfill completed successfully.');
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Backfill failed:', error.message);
  process.exit(1);
});
