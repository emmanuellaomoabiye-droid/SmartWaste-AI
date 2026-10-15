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

