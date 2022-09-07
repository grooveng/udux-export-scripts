const firebaseadmin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");
const fs = require("fs");
const moment = require("moment");
firebaseadmin.initializeApp({
  credential: firebaseadmin.credential.cert(serviceAccount),
  databaseURL: "https://udux-next.firebaseio.com",
});
const firebase = firebaseadmin.firestore();

firebase
  .collection("/albums")
  .where("cp", "==", "PA-DPIDA-2007040502-I")
  .limit(100)
  .get()
  .then((snapshot) => {
    console.log(snapshot.docs.length);
  });

async function paginateRequests() {
  let hasMoreDocs = true;
  let startAfter = null;
  let pageSize = 500;

  let totalDocuments = 0;
  const collectionName = "tracks";
  while (hasMoreDocs) {
    let query = firebase
      .collection(collectionName)
      .where("cp", "=", "PA-DPIDA-2007040502-I")
      .orderBy("created", "desc")
      .limit(pageSize);

    if (startAfter) {
      query = query.startAfter(startAfter);
    }

    const snapshot = await query.get();

    startAfter = snapshot.docs[snapshot.docs.length - 1];
    // console.log(snapshot.docs);
    totalDocuments += snapshot.docs.length;
    if (!startAfter) {
      hasMoreDocs = false;
    }
    let batch = firebase.batch();
    snapshot.docs.forEach((doc) => {
      const docRef = firebase.collection(collectionName).doc(doc.id);
      batch.update(docRef, { releasedata: new Date("2030-10-12").getTime() });
    });
    batch.commit().then(() => {
      console.log(`updated all documents inside ${collectionName}`);
    });
    console.log("Total Documents", totalDocuments);
  }

  return totalDocuments;
}
// firebase
//   .collection("albums")
//   .doc("000d2cd876edb8ec23347de9f7b57cfe")
//   .get()
//   .then((snapshot) => {
//     console.log(snapshot.docs);
//   });
paginateRequests().then((res) => console.log({ res }));
