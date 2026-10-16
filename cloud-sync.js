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

let busy = false;
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

function cloudRef(user) {
  return doc(db, "users", user.uid, "data", "ecoSort");
}


async function saveCloud(user) {
  if (busy || auth.currentUser?.uid !== user.uid) return;

  busy = true;

  try {
    const data = getLocalData();
    const reference = cloudRef(user);
    const snapshot = await getDoc(reference);

    if (data.records.length === 0 && snapshot.exists()) {
      const cloudData = snapshot.data();

      if (Array.isArray(cloudData.records) && cloudData.records.length > 0) {
        localStorage.setItem(
          RECORDS_KEY,
          JSON.stringify(cloudData.records)
        );
        localStorage.setItem(
          WEEK_KEY,
          String(cloudData.currentWeek || 1)
        );

        window.dispatchEvent(new Event("ecoSortCloudLoaded"));
        return;
      }
    }

    await setDoc(reference, data);
    lastSaved = JSON.stringify(data);
  } catch (error) {
    console.error("EcoSort cloud save failed:", error);
  } finally {
    busy = false;
  }
}

  

onAuthStateChanged(auth, async user => {
  if (!user) {
    lastSaved = "";
    return;
  }

  try {
    const reference = cloudRef(user);
    const snapshot = await getDoc(reference);

    if (!snapshot.exists()) {
      await saveCloud(user);
    } else {
      const cloudData = snapshot.data();

      // Keep this device's records unless the local list is empty.
      const localData = getLocalData();

      if (
        localData.records.length === 0 &&
        Array.isArray(cloudData.records) &&
        cloudData.records.length > 0
      ) {
        localStorage.setItem(
          RECORDS_KEY,
          JSON.stringify(cloudData.records)
        );

        localStorage.setItem(
          WEEK_KEY,
          String(cloudData.currentWeek || 1)
        );

        // No page reload; the dashboard remains stable.
        window.dispatchEvent(new Event("ecoSortCloudLoaded"));
      } else {
        await saveCloud(user);
      }
    }

    window.addEventListener("ecoSortLocalSaved", () => {
      saveCloud(user);
    });

    lastSaved = JSON.stringify(getLocalData());
  } catch (error) {
    console.error("EcoSort cloud sync failed:", error);
  }
});
