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
  .collection("/tracks")
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
  const collectionName = "playlists";
  while (hasMoreDocs) {
    const query = firebase
      .collection(collectionName)
      //   .where("cp", "=", "PA-DPIDA-2007040502-I")
      .orderBy("created", "desc")
      .limit(pageSize);

    if (startAfter) {
      query.startAfter(startAfter);
    }

    const snapshot = await query.get();

    startAfter = snapshot.docs[snapshot.docs.length - 1];
    // console.log(snapshot.docs.length);
    totalDocuments += snapshot.docs.length;
    if (!startAfter) {
      hasMoreDocs = false;
    }
    let batch = firebase.batch();
    await Promise.all(
      snapshot.docs.map(async (doc) => {
        const docRef = firebase.collection(collectionName).doc(doc.id);
        const updatedTracks = {};
        const docData = doc.data();
        const tracksBach = firebase.batch();
        let canUpdateTacks = false;
        const prs = Object.keys(docData.tracks || {}).map(async (key) => {
          const trackRef = await firebase.collection("tracks").doc(key).get();
          const track = trackRef.data();
          if (track) {
            if (track.cp === "PA-DPIDA-2007040502-I") {
              console.log(key, track.cp);

              // check the track release date
              if (track.releasedate < new Date("2030-10-12")) {
                const ref = firebase.collection("tracks").doc(trackRef.id);
                tracksBach.update(ref, {
                  releasedata: new Date("2030-10-12").getTime(),
                });
              }
            } else {
              // Not a sony track
              updatedTracks[key] = docData.tracks[key];
            }
          }
        });
        await Promise.all(prs);
        //   Update the track batch

        const value = await tracksBach.commit();
        // console.log(`updated all documents ${value.length}`);
        // console.log({
        //   update: Object.keys(updatedTracks).length,
        //   previous: Object.keys(docData.tracks || {}).length,
        // });

        //   Update the playlist batch
        batch.update(docRef, {
          tracks: updatedTracks,
          prevTracks: docData.tracks,
        });
      })
    );
    console.log("Total Documents", totalDocuments);

    batch.commit().then(() => {
      console.log(`updated all documents inside ${collectionName}`);
    });
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
