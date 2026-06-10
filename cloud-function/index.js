/**
 * Cloud Functions — zálohy Realtime Database do PRIVÁTNÍHO Firebase Storage.
 *
 * Dvě naplánované funkce (gen1, region europe-west1, čas Europe/Prague):
 *   1) backupDatabaseDaily    — každý den ve 3:00 (pojistka po celý měsíc)
 *   2) backupDatabaseUzaverka — KAŽDÉ 2 HODINY ve dnech 7.–14. (čas uzávěrky)
 *
 * Každá záloha = celá DB jako JSON do zalohy/db-<datum>_<hod>-<min>.json
 * + přepíše zalohy/db-latest.json. Repo s Pages je veřejné → NIKDY nezálohovat do repa.
 * Vyžaduje Blaze plán.  Deploy:  firebase deploy --only functions
 */
const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
admin.initializeApp();

// Nový styl Storage bucketu (viz reference/cloud-function.md – bucket naming gotcha):
const BUCKET = 'odbytova-fakturace.firebasestorage.app';

async function doBackup() {
  const data = (await admin.database().ref('/').once('value')).val() || {};
  const json = JSON.stringify(data);
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  const stamp = d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate())
              + '_' + p(d.getUTCHours()) + '-' + p(d.getUTCMinutes()) + 'UTC';
  const bucket = admin.storage().bucket(BUCKET);
  const opts = { contentType: 'application/json', resumable: false };
  await bucket.file('zalohy/db-' + stamp + '.json').save(json, opts);
  await bucket.file('zalohy/db-latest.json').save(json, opts);
  console.log('Záloha DB OK: ' + stamp + ' (' + json.length + ' B)');
  return null;
}

// Denní záloha — každý den 3:00.
exports.backupDatabaseDaily = functions.region('europe-west1')
  .pubsub.schedule('0 3 * * *').timeZone('Europe/Prague').onRun(doBackup);

// Záloha každé 2 hodiny během uzávěrky (dny 7.–14. v měsíci, v 0,2,4…22 h).
exports.backupDatabaseUzaverka = functions.region('europe-west1')
  .pubsub.schedule('0 */2 7-14 * *').timeZone('Europe/Prague').onRun(doBackup);
