const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

// Servis hesabı JSON'unu indirip data klasörüne koy: data/serviceAccountKey.json
const serviceAccount = require("./furkatech-4113c-firebase-adminsdk-fbsvc-60c6693998.json");

// Firebase Admin başlat
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

/**
 * JSON dosyasını oku ve Firestore'a yükle
 * @param {string} collectionName - Firestore koleksiyon adı
 * @param {string} filePath - JSON dosyası yolu
 */
async function importJson(collectionName, filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));

    // Eğer JSON tek bir array içeriyorsa -> döngüye sok
    if (Array.isArray(data)) {
      for (let i = 0; i < data.length; i++) {
        await db.collection(collectionName).doc(`${collectionName}_${i + 1}`).set(data[i]);
        console.log(`✅ ${collectionName} kaydı eklendi:`, data[i]);
      }
    } 
    // Eğer JSON object içeriyorsa -> direkt obje key’lerine göre yükle
    else if (typeof data === "object") {
      for (const key in data) {
        await db.collection(collectionName).doc(key).set(data[key]);
        console.log(`✅ ${collectionName} -> ${key} eklendi`);
      }
    }

  } catch (err) {
    console.error(`❌ ${collectionName} yüklenirken hata:`, err);
  }
}

async function setupFirestore() {
  try {
    console.log("🚀 Firebase Firestore'a bağlanıldı!");

    const dataDir = path.join(__dirname, "data");
    const files = fs.readdirSync(dataDir);

    // Tüm JSON dosyalarını sırayla işle
    for (const file of files) {
      if (file.endsWith(".json") && file !== "serviceAccountKey.json") {
        const collectionName = path.basename(file, ".json"); // dosya ismi -> koleksiyon adı
        const filePath = path.join(dataDir, file);

        console.log(`📂 ${collectionName} yükleniyor...`);
        await importJson(collectionName, filePath);
      }
    }

    console.log("🎉 Tüm JSON verileri Firestore'a başarıyla yüklendi!");
  } catch (error) {
    console.error("❌ Genel hata:", error);
  } finally {
    process.exit();
  }
}

setupFirestore();
