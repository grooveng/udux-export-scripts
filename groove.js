const firebaseadmin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

firebaseadmin.initializeApp({
  credential: firebaseadmin.credential.cert(serviceAccount),
  databaseURL: "https://udux-next.firebaseio.com",
});

const firebase = firebaseadmin.firestore();

let current = 1640995200000;
const day = 1000 * 60 * 60 * 24;
const today = Date.now();
let count = 0;
const dates = {};

while (today >= current) {
  dates[current] = {
    date: new Date(current),
    data: firebase
      .collection("/albums")
      .where("created", ">=", current)
      .where("created", "<=", current + day)
      .get(),
  };
  current += day;
  count += 1;
}
const fs = require("fs");
let csv = "sn, date, items";
dateKeys = Object.keys(dates).sort();

for (let i = 0; i < dateKeys.length; i++) {
  const dateKey = dateKeys[i];
  const dateItem = dates[dateKey];
  dateItem.data.then((snapshot) => {
    const docs = snapshot.docs.map((doc) => doc.data());
    dateItem.data = docs;
    csv = `${csv}\n${i + 1}, ${dateItem.date}, ${docs.length}`;
    fs.writeFile(`./output/000.csv`, csv, (err) => {
      if (err) {
        console.log(err);
      }
    });
    fs.writeFile(`./output/${i + 1}.json`, JSON.stringify(docs), (err) => {
      if (err) {
        console.log(err);
      }
    });
  });
}
