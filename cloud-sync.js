import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const RECORDS_KEY = "ecoSortRecords";
const WEEK_KEY = "ecoSortCurrentWeek";

let syncTimer = null;
let lastSaved = "";

function getLocalData() {
  return {
    records: JSON.parse(
      localStorage.getItem(RECORDS_KEY) || "[]"
    ),
    currentWeek: Math.max(
      1,
      parseInt(localStorage.getItem(WEEK_KEY), 10) || 1
    )
  };
}

async function saveCloud(user, data) {
  const reference = doc(
    db, "users", user.uid, "data", "ecoSort"
  );

  await setDoc(reference, data);
}

onAuthStateChanged(auth, async user => {
  clearInterval(syncTimer);
  syncTimer = null;
  lastSaved = "";

  if (!user) return;

  try {
    const reference = doc(
      db, "users", user.uid, "data", "ecoSort"
    );

    const snapshot = await getDoc(reference);
    const localData = getLocalData();

    if (snapshot.exists()) {
      const cloudData = snapshot.data();
      const records = cloudData.records || [];
      const week = Math.max(
        1,
        parseInt(cloudData.currentWeek, 10) || 1
      );

      const changed =
        JSON.stringify(localData.records) !== JSON.stringify(records) ||
        localData.currentWeek !== week;

      if (changed) {
        localStorage.setItem(
          RECORDS_KEY,
          JSON.stringify(records)
        );
        localStorage.setItem(WEEK_KEY, String(week));

        // Reload once to display the downloaded records.
        location.reload();
        return;
      }
    } else {
      // First sign-in: upload this device's existing records.
      await saveCloud(user, localData);
    }

    lastSaved = JSON.stringify(getLocalData());

    syncTimer = setInterval(async () => {
      if (auth.currentUser?.uid !== user.uid) return;

      const currentData = getLocalData();
      const serialized = JSON.stringify(currentData);

      if (serialized === lastSaved) return;

      try {
        await saveCloud(user, currentData);
        lastSaved = serialized;
      } catch (error) {
        console.error("EcoSort cloud save failed:", error);
      }
    }, 3000);

    console.log("EcoSort cloud sync ready.");
  } catch (error) {
    console.error("EcoSort cloud sync failed:", error);
  }
});
