const firebaseadmin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");
const fs = require("fs");
const moment = require("moment");
firebaseadmin.initializeApp({
  credential: firebaseadmin.credential.cert(serviceAccount),
  databaseURL: "https://udux-next.firebaseio.com",
});
const firebase = firebaseadmin.firestore();
const albumCache = {};
const trackCache = {};

const countryCodeToZip = (code) => "234";

const generateReport = async (start, end, count, data, type = "weekly") => {
  const providerKey = "PVW1";
  const clientKey = "2222";

  const startDateStr = moment(start).format("YYYYMMDD");
  const endDateStr = moment(end).format("YYYYMMDD");

  const currency = "USD";
  const sep = "#*#";

  const distrubutionTypeKey = 20;
  const transactionTypeKey = 10;
  const grossUnits = 1;
  const returnedUnits = 0;
  let totalStandardSales = 0;
  let totalMarketShare = 0;
  const totalGrossUnits = "0"; // Sum of Gross Units where Sales Type Key = SA
  const totalUnits = "0"; //  total number of plays

  let totalQuantityPromo = 0;
  let totalReturnedUnits = 0;

  let totalQuantityPremiumIntroductoryPromo = 0;
  let totalQuantityPremiumService = 0;
  let totalQuantityFreeTrial14Days = 0;
  let totalQuantityFreeTrial30Days = 0;
  let totalComplimentaryAccounts = 0;

  let otherProvidersTotalQuantityPremiumIntroductoryPromo = 0;
  let otherProvidersTotalQuantityPremiumService = 0;
  let otherProvidersTotalQuantityFreeTrial14Days = 0;
  let otherProvidersTotalQuantityFreeTrial30Days = 0;
  let otherProvidersTotalComplimentaryAccounts = 0;

  const header = `A${sep}${providerKey}${sep}${startDateStr}${sep}${endDateStr}${sep}0${sep}UTC+0100`;
  let body = `${header}`;

  const countryKey = "NG";
  for (let i = 0; i < data.length; i++) {
    const stat = data[i];
    const isFreemium = ["Freemium", "unsubscribed"].includes(stat.plan.name)
      ? "0.0000000000"
      : "0.0000300000";
    let vendorName = isFreemium
      ? "Groove - Free Trials upto 30 days"
      : "Groove - Premium Service Introductory Offer";
    let vendorKey = isFreemium ? "PWF9" : "PWF7";
    if (stat.cp == "PA-DPIDA-2007040502-I") {
      const salesTypeKey = "SA";
      const wpu = ["Freemium", "unsubscribed"].includes(stat.plan.name)
        ? "0.0000000000"
        : "0.0000300000";
      const rpu = ["Freemium", "unsubscribed"].includes(stat.plan.name)
        ? "0.0000000000"
        : "0.0003000000";

      let track = trackCache[stat.targetID];
      if (!track) {
        const snapshot = await firebase
          .collection(`/tracks`)
          .doc(stat.targetID)
          .get();
        track = snapshot.data();
        trackCache[stat.targetID] = { ...track };
      }
      const vat = "0.0000000000";
      const copyrightIndicator = "Y";
      const mediaKey = "MPL";

      const productType = "11"; // 11 - single audio track, 15 - snippet of an audio track(90 seconds),
      if (track.direct_contributors && stat.user) {
        let album = albumCache[track.album];
        if (!album) {
          const snapshot = await firebase
            .collection(`/albums`)
            .doc(track.album)
            .get();
          album = snapshot.data();
          albumCache[track.album] = { ...album };
        }

        const transDateStr = moment(stat.created).format("YYYYMMDD");

        const detail = `\nN${sep}${providerKey}${sep}${clientKey}${sep}${startDateStr}${sep}${endDateStr}${sep}${vendorName}${sep}${vendorKey}${sep}${countryKey}${sep}${salesTypeKey}${sep}${
          stat.targetID
        }${sep}${track.upc}${sep}${track.order}${sep}${track.upc}${sep}${
          track.grid
        }${sep} ${productType}${sep}${grossUnits}${sep}${returnedUnits}${sep}${wpu}${sep}${currency}${sep}${wpu}${sep}${rpu}${sep}${currency}${sep}${vat}${sep}${currency}${sep}${copyrightIndicator}${sep}${distrubutionTypeKey}${sep}${transactionTypeKey}${sep}${
          track.direct_contributors[0].PartyName.FullName
        }${sep}${album.name}${sep}${track.name}${sep}${mediaKey}${sep}${sep}${
          stat.owner
        }${sep}${
          stat.user?.dob ? moment(stat.user.dob).format("YYYYMMDD") : ""
        }${sep}${stat.user?.gender || ""}${sep}${countryCodeToZip(
          stat.country
        )}${sep}${stat.created}${sep}${transDateStr}`;
        body = `${body}${detail}`;
        totalStandardSales += 1;
        totalMarketShare += 1;
        if (isFreemium) {
          totalQuantityFreeTrial14Days += 1;
        } else {
          totalQuantityPremiumIntroductoryPromo += 1;
        }
      }
    } else {
      if (isFreemium) {
        otherProvidersTotalQuantityFreeTrial14Days += 1;
      } else {
        otherProvidersTotalQuantityPremiumIntroductoryPromo += 1;
      }
    }
  }
  const premiumMarketShare =
    totalQuantityPremiumService && otherProvidersTotalQuantityPremiumService
      ? parseFloat(
          (totalQuantityPremiumService /
            (totalQuantityPremiumService +
              otherProvidersTotalQuantityPremiumService)) *
            100
        ).toFixed(2)
      : "0.00";
  let marketShare = `\nM${sep}${providerKey}${sep}${clientKey}${sep}${startDateStr}${sep}${endDateStr}${sep}${"Groove - Premium Service"}${sep}${totalQuantityPremiumService}${sep}${premiumMarketShare}`;

  const introductoryOfferMarketShare =
    totalQuantityPremiumService &&
    otherProvidersTotalQuantityPremiumIntroductoryPromo
      ? parseFloat(
          (totalQuantityPremiumIntroductoryPromo /
            (otherProvidersTotalQuantityPremiumIntroductoryPromo +
              totalQuantityPremiumIntroductoryPromo)) *
            100
        ).toFixed(2)
      : "0.00";
  marketShare = `${marketShare}\nM${sep}${providerKey}${sep}${clientKey}${sep}${startDateStr}${sep}${endDateStr}${sep}${"Groove - Premium Service Introductory Offer"}${sep}${"PWF1"}${sep}${countryKey}${sep}${totalQuantityPremiumIntroductoryPromo}${sep}${introductoryOfferMarketShare}`;

  const fourteenDaysTrialMarketShare =
    totalQuantityFreeTrial14Days && otherProvidersTotalQuantityFreeTrial14Days
      ? parseFloat(
          (totalQuantityFreeTrial14Days /
            (totalQuantityFreeTrial14Days +
              otherProvidersTotalQuantityFreeTrial14Days)) *
            100
        ).toFixed(2)
      : "0.00";
  marketShare = `${marketShare}\nM${sep}${providerKey}${sep}${clientKey}${sep}${startDateStr}${sep}${endDateStr}${sep}${"Groove - Free Trials Upto 14 days"}${sep}${"PWF7"}${sep}${countryKey}${sep}${totalQuantityFreeTrial14Days}${sep}${fourteenDaysTrialMarketShare}`;

  const total30daysmarketshare =
    totalQuantityFreeTrial30Days && otherProvidersTotalQuantityFreeTrial30Days
      ? parseFloat(
          (totalQuantityFreeTrial30Days /
            (totalQuantityFreeTrial30Days +
              otherProvidersTotalQuantityFreeTrial30Days)) *
            100
        ).toFixed(2)
      : "0.00";
  marketShare = `${marketShare}\nM${sep}${providerKey}${sep}${clientKey}${sep}${startDateStr}${sep}${endDateStr}${"Groove - Free Trials Upto 30 days"}${sep}${"PWF8"}${sep}${countryKey}${sep}${totalQuantityFreeTrial30Days}${sep}${total30daysmarketshare}`;

  const complementMarketShare =
    totalComplimentaryAccounts && otherProvidersTotalComplimentaryAccounts
      ? parseFloat(
          (totalComplimentaryAccounts /
            (totalComplimentaryAccounts +
              otherProvidersTotalComplimentaryAccounts)) *
            100
        ).toFixed(2)
      : "0.00";
  marketShare = `${marketShare}\nM${sep}${providerKey}${sep}${clientKey}${sep}${startDateStr}${sep}${endDateStr}${sep}${"Groove-Complimentary Accounts"}${sep}${"PWF9"}${sep}${countryKey}${sep}${totalComplimentaryAccounts}${sep}${complementMarketShare}`;

  const aggregateMarketShare = parseFloat(
    parseFloat(complementMarketShare) +
      parseFloat(total30daysmarketshare) +
      parseFloat(fourteenDaysTrialMarketShare) +
      parseFloat(introductoryOfferMarketShare) +
      parseFloat(premiumMarketShare)
  ).toFixed(2);

  const footer = `\nZ${sep}${providerKey}${sep}${startDateStr}${sep}${endDateStr}${sep}${totalStandardSales}${sep}${aggregateMarketShare}${sep}${totalGrossUnits}${sep}${totalUnits}${sep}${totalQuantityPremiumIntroductoryPromo}${sep}${totalQuantityPromo}${sep}${totalReturnedUnits}`;
  body = `${body}${marketShare}${footer}`;
  fs.writeFile(
    `./report-output/weekly/PVW1_W_${startDateStr}-${endDateStr}.txt`,
    body,
    (err) => {
      if (err) {
        console.log(err);
      }
    }
  );
};

const fetchAndStoreWeeklyFiles = async (start, end, count) => {
  const cachedUsers = {};
  const cachedCP = {};
  const snapshot = await firebase
    .collection("/statistics")
    .where("created", ">=", start)
    .where("created", "<=", end)
    // .where("cp", "=", ) // Just for sony
    .where("name", "=", "play_track")
    .get();

  const docs = snapshot.docs.map((doc) => doc.data());
  console.log("Processing %s batch with %s total stats", count, docs.length);
  for (let i = 0; i < docs.length; i++) {
    console.log(
      "Processing %s item of %s batch with %s total stats",
      i + 1,
      count,
      docs.length
    );

    const stat = docs[i];
    if (cachedUsers[stat.owner]) {
      stat.user = cachedUsers[stat.owner];
    } else {
      const snapshot = await firebase.collection(`/user`).doc(stat.owner).get();
      stat.userId = String(stat.owner);
      stat.user = snapshot.data();
      cachedUsers[stat.owner] = { ...stat.user };
    }
    // if (stat.cp) {
    //   if (cachedCP[stat.cp]) {
    //     stat.cpData = cachedCP[stat.cp];
    //   } else {
    //     const cp = await firebase.collection(`/cp`).doc(stat.cp).get();
    //     stat.cpData = cp.data();
    //     cachedCP[stat.cp] = { ...stat.cpData };
    //   }
    // }
    await generateReport(start, end, count, docs);
  }
};

// let current = 1640995200000;
// mm/dd/yyyy
let current = new Date("01/07/2022 00:00 am").getTime();
const week = 1000 * 60 * 60 * 24 * 7;
let count = 0;
const today = Date.now();

while (today >= current) {
  fetchAndStoreWeeklyFiles(current, current + week, count).then(() => {});
  current += week;
  count += 1;
}
