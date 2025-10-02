const admin = require('firebase-admin');
const serviceAccount = require('./furkatechaidat-firebase-adminsdk-fbsvc-0862f363ca.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: "furkatechaidat.firebasestorage.app"
});

const db = admin.firestore();
const storage = admin.storage();

const defaultData = {
  users: {
    'furkan': {
      password: 'furkan',
      name: 'Admin',
      role: 'admin'
    }
  },
  buildings: [
    {
      id: 'building-1',
      name: 'A Blok',
      apartments: [
        {
          id: 'apt-1',
          no: '101',
          owner: 'Ahmet Yılmaz',
          phone: '0532 123 45 67',
          iban: 'TR00 0000 0000 0000 0000 0000 01',
          plate: '34 ABC 123',
          parking: 'A-01',
          payments: {}
        },
        {
          id: 'apt-2',
          no: '102',
          owner: 'Mehmet Demir',
          phone: '0533 234 56 78',
          iban: 'TR00 0000 0000 0000 0000 0000 02',
          plate: '34 XYZ 456',
          parking: 'A-02',
          payments: {}
        }
      ]
    },
    {
      id: 'building-2',
      name: 'B Blok',
      apartments: [
        {
          id: 'apt-3',
          no: '201',
          owner: 'Ayşe Kaya',
          phone: '0534 345 67 89',
          iban: 'TR00 0000 0000 0000 0000 0000 03',
          plate: '06 DEF 789',
          parking: 'B-01',
          payments: {}
        }
      ]
    }
  ],
  announcements: [
    {
      id: 1,
      title: 'Site Toplantısı',
      content: 'Site sakinleri toplantımız 15 Ekim Cumartesi saat 14:00\'da site yönetim ofisinde yapılacaktır. Katılımınızı rica ederiz.',
      date: '2025-09-28'
    },
    {
      id: 2,
      title: 'Asansör Bakımı',
      content: 'A Blok asansörü 5 Ekim tarihinde bakıma alınacaktır. Lütfen o gün için önleminizi alınız.',
      date: '2025-09-25'
    }
  ],
  settings: {
    months: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
    baseDues: 600
  }
};

async function initializeDatabase() {
  try {
    console.log('Firestore veritabanı başlatılıyor...');

    const usersDoc = await db.collection('system').doc('users').get();
    if (!usersDoc.exists) {
      await db.collection('system').doc('users').set(defaultData.users);
      console.log('✓ Kullanıcılar eklendi');
    } else {
      console.log('✓ Kullanıcılar zaten mevcut');
    }

    const buildingsDoc = await db.collection('system').doc('buildings').get();
    if (!buildingsDoc.exists) {
      await db.collection('system').doc('buildings').set({ data: defaultData.buildings });
      console.log('✓ Apartmanlar eklendi');
    } else {
      console.log('✓ Apartmanlar zaten mevcut');
    }

    const announcementsDoc = await db.collection('system').doc('announcements').get();
    if (!announcementsDoc.exists) {
      await db.collection('system').doc('announcements').set({ data: defaultData.announcements });
      console.log('✓ Duyurular eklendi');
    } else {
      console.log('✓ Duyurular zaten mevcut');
    }

    const receiptsCollection = await db.collection('pendingReceipts').get();
    if (receiptsCollection.empty) {
      console.log('✓ Dekontlar koleksiyonu hazır');
    } else {
      console.log('✓ Dekontlar koleksiyonu zaten mevcut');
    }

    const settingsDoc = await db.collection('system').doc('settings').get();
    if (!settingsDoc.exists) {
      await db.collection('system').doc('settings').set(defaultData.settings);
      console.log('✓ Ayarlar eklendi');
    } else {
      console.log('✓ Ayarlar zaten mevcut');
    }

    console.log('\n✅ Firestore veritabanı başarıyla kuruldu!');
    console.log('\nKullanılabilir giriş bilgileri:');
    console.log('Kullanıcı adı: furkan');
    console.log('Şifre: furkan');
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    process.exit();
  }
}

async function resetDatabase() {
  try {
    console.log('⚠️  Veritabanı sıfırlanıyor...');
    
    const systemDocs = await db.collection('system').listDocuments();
    for (const doc of systemDocs) {
      await doc.delete();
    }
    console.log('✓ System koleksiyonu silindi');

    const receiptDocs = await db.collection('pendingReceipts').listDocuments();
    for (const doc of receiptDocs) {
      await doc.delete();
    }
    console.log('✓ PendingReceipts koleksiyonu silindi');
    
    await initializeDatabase();
    
  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

async function viewData() {
  try {
    console.log('📊 Veritabanı verileri:\n');
    
    const systemSnapshot = await db.collection('system').get();
    const data = {};
    
    systemSnapshot.forEach(doc => {
      data[doc.id] = doc.data();
    });
    
    console.log(JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    process.exit();
  }
}

const command = process.argv[2];

switch(command) {
  case 'init':
    initializeDatabase();
    break;
  case 'reset':
    resetDatabase();
    break;
  case 'view':
    viewData();
    break;
  default:
    console.log('Kullanım:');
    console.log('  node firebase-setup.js init   - Veritabanını başlat');
    console.log('  node firebase-setup.js reset  - Veritabanını sıfırla ve yeniden başlat');
    console.log('  node firebase-setup.js view   - Veritabanındaki verileri görüntüle');
    process.exit();
}