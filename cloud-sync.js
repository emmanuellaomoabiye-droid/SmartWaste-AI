import { auth, db } from "./firebase.js";

import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

const RECORDS_KEY = "ecoSortRecords";
const WEEK_KEY = "ecoSortCurrentWeek";

let syncStarted = false;
let syncTimer = null;
let lastSavedData = "";

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

async function saveToCloud(user, data) {
  const reference = doc(
    db,
    "users",
    user.uid,
    "data",
    "ecoSort"
  );

  await setDoc(reference, data);
}

onAuthStateChangedSafe();

function onAuthStateChangedSafe() {
  import("https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js")
    .then(({ onAuthStateChanged }) => {
      onAuthStateChanged(auth, async user => {
        clearInterval(syncTimer);
        syncTimer = null;
        syncStarted = false;
        lastSavedData = "";

        if (!user) return;

        try {
          const reference = doc(
            db,
            "users",
            user.uid,
            "data",
            "ecoSort"
          );

          const snapshot = await getDoc(reference);

          if (snapshot.exists()) {
            const cloudData = snapshot.data();

            localStorage.setItem(
              RECORDS_KEY,
              JSON.stringify(cloudData.records || [])
            );

            localStorage.setItem(
              WEEK_KEY,
              String(cloudData.currentWeek || 1)
            );

            lastSavedData = JSON.stringify(getLocalData());

            // Refresh the dashboard to display downloaded records.
            location.reload();
            return;
          }

          // First sign-in: preserve and upload this device's records.
          const localData = getLocalData();

          await saveToCloud(user, localData);

          lastSavedData = JSON.stringify(localData);
          syncStarted = true;

          syncTimer = setInterval(async () => {
            if (!syncStarted || auth.currentUser?.uid !== user.uid) {
              return;
            }

            const currentData = getLocalData();
            const serialized = JSON.stringify(currentData);

            if (serialized === lastSavedData) return;

            try {
              await saveToCloud(user, currentData);
              lastSavedData = serialized;
            } catch (error) {
              console.error("EcoSort cloud save failed:", error);
            }
          }, 2000);

        } catch (error) {
          console.error("EcoSort cloud sync failed:", error);
          alert(
            "Cloud sync failed. Your local records are still available. Please try again."
          );
        }
      });
    })
    .catch(error => {
      console.error("Firebase authentication error:", error);
    });
}
