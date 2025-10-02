import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject, listAll, getMetadata } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyD1uWRQiTnvQQot_nv6mtMorBMstgLa9sk",
    authDomain: "furkatechaidat.firebaseapp.com",
    projectId: "furkatechaidat",
    storageBucket: "furkatechaidat.firebasestorage.app",
    messagingSenderId: "543478939749",
    appId: "1:543478939749:web:b94f4f4d05ce25e7a8c68c",
    measurementId: "G-PM36ZWVX98"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

let currentUser = null;
let selectedBuildingForDues = null;
let selectedMonthData = null;
let selectedReceiptId = null;

const dataStore = {
    users: {},
    buildings: [],
    announcements: [],
    pendingReceipts: [],
    months: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
    baseDues: 600
};

async function loadDataFromFirebase() {
    try {
        const usersDoc = await getDoc(doc(db, 'system', 'users'));
        if (usersDoc.exists()) {
            dataStore.users = usersDoc.data();
        }

        const buildingsDoc = await getDoc(doc(db, 'system', 'buildings'));
        if (buildingsDoc.exists()) {
            dataStore.buildings = buildingsDoc.data().data || [];
        }

        const announcementsDoc = await getDoc(doc(db, 'system', 'announcements'));
        if (announcementsDoc.exists()) {
            dataStore.announcements = announcementsDoc.data().data || [];
        }

        const receiptsSnapshot = await getDocs(collection(db, 'pendingReceipts'));
        dataStore.pendingReceipts = [];
        receiptsSnapshot.forEach(docSnapshot => {
            dataStore.pendingReceipts.push({ ...docSnapshot.data(), docId: docSnapshot.id });
        });

        const settingsDoc = await getDoc(doc(db, 'system', 'settings'));
        if (settingsDoc.exists()) {
            const settings = settingsDoc.data();
            dataStore.months = settings.months || dataStore.months;
            dataStore.baseDues = settings.baseDues || dataStore.baseDues;
        }

        setupRealtimeListeners();
    } catch (error) {
        console.error('Firebase veri yükleme hatası:', error);
        alert('Veriler yüklenirken bir hata oluştu!');
    }
}

async function saveToFirebase(path, data) {
    try {
        await setDoc(doc(db, 'system', path), path === 'users' ? data : { data: data });
        return true;
    } catch (error) {
        console.error('Firebase kaydetme hatası:', error);
        alert('Veri kaydedilirken bir hata oluştu!');
        return false;
    }
}

async function initializePayments() {
    const paidMonths = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz'];
    let needsUpdate = false;

    dataStore.buildings.forEach(building => {
        building.apartments.forEach(apt => {
            if (!apt.payments || Object.keys(apt.payments).length === 0) {
                apt.payments = {};
                dataStore.months.forEach(month => {
                    apt.payments[month] = {
                        paid: paidMonths.includes(month),
                        amount: dataStore.baseDues,
                        date: null,
                        receipt: null
                    };
                });
                needsUpdate = true;
            }
        });
    });

    if (needsUpdate) {
        await saveToFirebase('buildings', dataStore.buildings);
    }
}

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    await loadDataFromFirebase();

    if (dataStore.users[username] && dataStore.users[username].password === password) {
        currentUser = { ...dataStore.users[username], username };
        login();
    } else {
        alert('Kullanıcı adı veya şifre hatalı!');
    }
});

async function login() {
    await initializePayments();
    document.getElementById('loginPage').style.display = 'none';
    document.getElementById('dashboard').classList.add('active');
    document.getElementById('currentUserName').textContent = currentUser.name;
    document.getElementById('currentUserRole').textContent = currentUser.role === 'admin' ? 'Yönetici' : 'Daire Sakini';

    if (currentUser.role === 'admin') {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
    }

    loadHomePage();
}

function logout() {
    currentUser = null;
    selectedBuildingForDues = null;
    document.getElementById('dashboard').classList.remove('active');
    document.getElementById('loginPage').style.display = 'flex';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.querySelectorAll('.admin-only').forEach(el => el.classList.add('hidden'));
    
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById('homePage').classList.add('active');
}

function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.classList.add('active');

    const pageMap = {
        'home': 'homePage',
        'dues': 'duesPage',
        'profile': 'profilePage',
        'buildings': 'buildingsPage',
        'announcements': 'announcementsPage',
        'payments': 'paymentsPage',
        'admin': 'adminPage'
    };

    document.getElementById(pageMap[pageId]).classList.add('active');

    switch(pageId) {
        case 'home':
            loadHomePage();
            break;
        case 'dues':
            loadDuesPage();
            break;
        case 'profile':
            loadProfilePage();
            break;
        case 'buildings':
            loadBuildingsPage();
            break;
        case 'announcements':
            loadAnnouncementsPage();
            break;
        case 'payments':
            loadPaymentsPage();
            break;
        case 'admin':
            loadAdminPage();
            break;
    }
}

function loadHomePage() {
    if (!currentUser) {
        return;
    }

    const statsGrid = document.getElementById('homeStats');
    const announcementsList = document.getElementById('announcementsList');

    if (currentUser.role === 'admin' || currentUser.role === 'manager') {
        let totalApartments = 0;
        let totalPaid = 0;
        let totalUnpaid = 0;

        dataStore.buildings.forEach(building => {
            building.apartments.forEach(apt => {
                totalApartments++;
                const currentMonth = dataStore.months[new Date().getMonth()];
                if (apt.payments[currentMonth] && apt.payments[currentMonth].paid) {
                    totalPaid++;
                } else {
                    totalUnpaid++;
                }
            });
        });

        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-building"></i>
                </div>
                <div class="stat-info">
                    <div class="stat-label">Toplam Apartman</div>
                    <div class="stat-value">${dataStore.buildings.length}</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-door-open"></i>
                </div>
                <div class="stat-info">
                    <div class="stat-label">Toplam Daire</div>
                    <div class="stat-value">${totalApartments}</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="stat-info">
                    <div class="stat-label">Ödeme Yapan</div>
                    <div class="stat-value">${totalPaid}</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <div class="stat-info">
                    <div class="stat-label">Ödeme Yapmayan</div>
                    <div class="stat-value">${totalUnpaid}</div>
                </div>
            </div>
        `;
    } else {
        let userApartment = null;
        
        dataStore.buildings.forEach(building => {
            building.apartments.forEach(apt => {
                if (dataStore.users[currentUser.username] && dataStore.users[currentUser.username].apartmentId === apt.id) {
                    userApartment = apt;
                }
            });
        });

        if (userApartment) {
            let paidCount = 0;
            let unpaidCount = 0;
            let totalDebt = 0;

            dataStore.months.forEach(month => {
                if (userApartment.payments[month].paid) {
                    paidCount++;
                } else {
                    unpaidCount++;
                    totalDebt += userApartment.payments[month].amount;
                }
            });

            statsGrid.innerHTML = `
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-label">Ödenen Aidatlar</div>
                        <div class="stat-value">${paidCount}/12</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-exclamation-circle"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-label">Bekleyen Ödemeler</div>
                        <div class="stat-value">${unpaidCount}</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-money-bill-wave"></i>
                    </div>
                    <div class="stat-info">
                        <div class="stat-label">Toplam Borç</div>
                        <div class="stat-value">${totalDebt}₺</div>
                    </div>
                </div>
            `;
        }
    }

    announcementsList.innerHTML = '';
    dataStore.announcements.slice(0, 5).forEach(ann => {
        announcementsList.innerHTML += `
            <div class="announcement-item">
                <div class="announcement-header">
                    <div class="announcement-title">${ann.title}</div>
                    <div class="announcement-date">
                        <i class="fas fa-calendar"></i> ${ann.date}
                    </div>
                </div>
                <div class="announcement-content">${ann.content}</div>
            </div>
        `;
    });
}



function loadDuesPage() {
    if (currentUser.role === 'admin') {
        const buildingGrid = document.getElementById('buildingSelectGrid');
        buildingGrid.innerHTML = '';

        dataStore.buildings.forEach(building => {
            buildingGrid.innerHTML += `
                <div class="apartment-card" onclick="selectBuildingForDues('${building.id}')">
                    <div class="apartment-icon">
                        <i class="fas fa-building"></i>
                    </div>
                    <div class="apartment-name">${building.name}</div>
                    <div class="apartment-info">
                        <i class="fas fa-door-open"></i>
                        ${building.apartments.length} Daire
                    </div>
                </div>
            `;
        });

        document.getElementById('monthsGrid').innerHTML = '';
    } else {
        document.querySelector('#duesPage .admin-only').classList.add('hidden');
        loadMonthsForResident();
    }
}

function selectBuildingForDues(buildingId) {
    selectedBuildingForDues = buildingId;
    const building = dataStore.buildings.find(b => b.id === buildingId);
    
    document.getElementById('duesSubtitle').textContent = `${building.name} - Aylık aidat ödemelerini takip edin`;
    
    loadMonthsForBuilding(buildingId);
}

function loadMonthsForBuilding(buildingId) {
    const building = dataStore.buildings.find(b => b.id === buildingId);
    const monthsGrid = document.getElementById('monthsGrid');
    
    monthsGrid.innerHTML = '<div class="card"><div class="card-header"><h3 class="card-title"><i class="fas fa-calendar-alt"></i> Aylar</h3></div><div class="payment-grid" id="monthsPaymentGrid"></div></div>';
    
    const paymentGrid = document.getElementById('monthsPaymentGrid');
    paymentGrid.innerHTML = '';

    dataStore.months.forEach(month => {
        let paidCount = 0;
        let totalCount = building.apartments.length;

        building.apartments.forEach(apt => {
            if (apt.payments[month].paid) {
                paidCount++;
            }
        });

        const isPaid = paidCount === totalCount;
        const statusClass = isPaid ? 'paid' : 'unpaid';

        paymentGrid.innerHTML += `
            <div class="month-card ${statusClass}" onclick="showMonthDetails('${buildingId}', '${month}')">
                <div class="month-name">${month}</div>
                <div class="month-status">
                    <i class="fas ${isPaid ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                    ${paidCount}/${totalCount} Ödendi
                </div>
            </div>
        `;
    });
}

function loadMonthsForResident() {
    let userApartment = null;
    
    dataStore.buildings.forEach(building => {
        building.apartments.forEach(apt => {
            if (dataStore.users[currentUser.username] && dataStore.users[currentUser.username].apartmentId === apt.id) {
                userApartment = apt;
            }
        });
    });

    if (!userApartment) return;

    const monthsGrid = document.getElementById('monthsGrid');
    monthsGrid.innerHTML = '<div class="card"><div class="card-header"><h3 class="card-title"><i class="fas fa-calendar-alt"></i> Aylık Ödemelerim</h3></div><div class="payment-grid" id="monthsPaymentGrid"></div></div>';
    
    const paymentGrid = document.getElementById('monthsPaymentGrid');
    paymentGrid.innerHTML = '';

    dataStore.months.forEach(month => {
        const payment = userApartment.payments[month];
        const statusClass = payment.paid ? 'paid' : 'unpaid';

        paymentGrid.innerHTML += `
            <div class="month-card ${statusClass}" ${!payment.paid ? `onclick="openUploadReceiptModal('${month}', ${payment.amount})"` : ''}>
                <div class="month-name">${month}</div>
                <div class="month-status">
                    <i class="fas ${payment.paid ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
                    ${payment.paid ? 'Ödendi' : payment.amount + '₺'}
                </div>
            </div>
        `;
    });
}

function showMonthDetails(buildingId, month) {
    const building = dataStore.buildings.find(b => b.id === buildingId);
    const unpaidApartments = building.apartments.filter(apt => !apt.payments[month].paid);

    document.getElementById('unpaidModalMonth').textContent = month;
    document.getElementById('unpaidModalBuilding').textContent = building.name;

    const tbody = document.getElementById('unpaidApartmentsTable');
    tbody.innerHTML = '';

    if (unpaidApartments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-gray);"><i class="fas fa-check-circle"></i> Tüm daireler ödeme yapmış!</td></tr>';
    } else {
        unpaidApartments.forEach(apt => {
            tbody.innerHTML += `
                <tr onclick="viewApartmentDetail('${buildingId}', '${apt.id}')" style="cursor: pointer;">
                    <td><strong>${apt.no}</strong></td>
                    <td>${apt.owner}</td>
                    <td>${apt.phone}</td>
                    <td><span class="badge badge-danger"><i class="fas fa-times"></i> Ödenmedi</span></td>
                </tr>
            `;
        });
    }

    openModal('monthUnpaidModal');
}

function loadProfilePage() {
    if (currentUser.role === 'admin') {
        document.getElementById('profileName').value = currentUser.name;
        document.getElementById('profileApartment').value = 'Yönetim';
        document.getElementById('profilePhone').value = '-';
        document.getElementById('profileIban').value = '-';
        document.getElementById('profilePlate').value = '-';
        document.getElementById('profileParking').value = '-';
    } else {
        let userApartment = null;
        let userBuilding = null;
        
        dataStore.buildings.forEach(building => {
            building.apartments.forEach(apt => {
                if (dataStore.users[currentUser.username].apartmentId === apt.id) {
                    userApartment = apt;
                    userBuilding = building;
                }
            });
        });

        if (userApartment) {
            document.getElementById('profileName').value = userApartment.owner;
            document.getElementById('profileApartment').value = `${userBuilding.name} - ${userApartment.no}`;
            document.getElementById('profilePhone').value = userApartment.phone;
            document.getElementById('profileIban').value = userApartment.iban;
            document.getElementById('profilePlate').value = userApartment.plate;
            document.getElementById('profileParking').value = userApartment.parking;
        }
    }
}

function loadBuildingsPage() {
    const grid = document.getElementById('buildingsGrid');
    grid.innerHTML = '';

    dataStore.buildings.forEach(building => {
        grid.innerHTML += `
            <div class="apartment-card" onclick="viewBuildingDetail('${building.id}')">
                <div class="apartment-icon">
                    <i class="fas fa-city"></i>
                </div>
                <div class="apartment-name">${building.name}</div>
                <div class="apartment-info">
                    <i class="fas fa-door-open"></i>
                    ${building.apartments.length} Daire
                </div>
                <div style="display: flex; gap: 10px; margin-top: 15px; width: 100%;">
                    <button class="btn-icon btn-success btn-sm" style="flex: 1;" onclick="event.stopPropagation(); openAddApartmentModal('${building.id}')">
                        <i class="fas fa-plus"></i>
                        Daire Ekle
                    </button>
                    <button class="btn-icon btn-danger btn-sm" style="flex: 1;" onclick="event.stopPropagation(); deleteBuilding('${building.id}')">
                        <i class="fas fa-trash"></i>
                        Sil
                    </button>
                </div>
            </div>
        `;
    });
}

async function deleteBuilding(buildingId) {
    const building = dataStore.buildings.find(b => b.id === buildingId);
    
    if (building.apartments.length > 0) {
        if (!confirm(`${building.name} içinde ${building.apartments.length} daire var. Silmek istediğinizden emin misiniz? Tüm daireler ve veriler silinecek!`)) {
            return;
        }
    } else {
        if (!confirm(`${building.name} apartmanını silmek istediğinizden emin misiniz?`)) {
            return;
        }
    }
    
    dataStore.buildings = dataStore.buildings.filter(b => b.id !== buildingId);
    
    if (await saveToFirebase('buildings', dataStore.buildings)) {
        alert('Apartman başarıyla silindi!');
        loadBuildingsPage();
        loadHomePage();
    }
}

function viewBuildingDetail(buildingId) {
    const building = dataStore.buildings.find(b => b.id === buildingId);
    
    let content = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">
                    <i class="fas fa-building"></i>
                    ${building.name} - Daireler
                </h3>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th><i class="fas fa-door-open"></i> Daire</th>
                            <th><i class="fas fa-user"></i> Malik/Kiracı</th>
                            <th><i class="fas fa-phone"></i> Telefon</th>
                            <th><i class="fas fa-chart-bar"></i> Ödeme Durumu</th>
                            <th><i class="fas fa-cog"></i> İşlemler</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    building.apartments.forEach(apt => {
        let paidCount = 0;
        dataStore.months.forEach(month => {
            if (apt.payments[month].paid) paidCount++;
        });

        content += `
            <tr>
                <td><strong>${apt.no}</strong></td>
                <td>${apt.owner}</td>
                <td>${apt.phone}</td>
                <td>
                    <span class="badge ${paidCount === 12 ? 'badge-success' : paidCount >= 6 ? 'badge-warning' : 'badge-danger'}">
                        <i class="fas fa-chart-pie"></i>
                        ${paidCount}/12 Ay
                    </span>
                </td>
                <td>
                    <button class="btn-icon btn-info btn-sm" onclick="viewApartmentDetail('${buildingId}', '${apt.id}')" style="margin-right: 5px;">
                        <i class="fas fa-eye"></i>
                        Detay
                    </button>
                    <button class="btn-icon btn-danger btn-sm" onclick="deleteApartment('${buildingId}', '${apt.id}')">
                        <i class="fas fa-trash"></i>
                        Sil
                    </button>
                </td>
            </tr>
        `;
    });

    content += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById('apartmentDetailContent').innerHTML = content;
    openModal('apartmentDetailModal');
}


async function deleteApartment(buildingId, apartmentId) {
    const building = dataStore.buildings.find(b => b.id === buildingId);
    const apartment = building.apartments.find(a => a.id === apartmentId);
    
    if (!confirm(`${apartment.owner} - Daire ${apartment.no} silinecek. Emin misiniz?`)) {
        return;
    }
    
    building.apartments = building.apartments.filter(a => a.id !== apartmentId);
    
    for (const [username, user] of Object.entries(dataStore.users)) {
        if (user.apartmentId === apartmentId) {
            delete dataStore.users[username];
        }
    }
    
    if (await saveToFirebase('buildings', dataStore.buildings)) {
        await saveToFirebase('users', dataStore.users);
        alert('Daire başarıyla silindi!');
        closeModal('apartmentDetailModal');
        loadBuildingsPage();
        loadHomePage();
    }
}

function viewApartmentDetail(buildingId, apartmentId) {
    const building = dataStore.buildings.find(b => b.id === buildingId);
    const apartment = building.apartments.find(a => a.id === apartmentId);

    let content = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">
                    <i class="fas fa-door-open"></i>
                    ${building.name} - Daire ${apartment.no}
                </h3>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px;">
                <div>
                    <p style="font-size: 13px; color: var(--text-gray); margin-bottom: 5px;"><i class="fas fa-user"></i> Malik/Kiracı</p>
                    <p style="font-weight: 600;">${apartment.owner}</p>
                </div>
                <div>
                    <p style="font-size: 13px; color: var(--text-gray); margin-bottom: 5px;"><i class="fas fa-phone"></i> Telefon</p>
                    <p style="font-weight: 600;">${apartment.phone}</p>
                </div>
                <div>
                    <p style="font-size: 13px; color: var(--text-gray); margin-bottom: 5px;"><i class="fas fa-credit-card"></i> IBAN</p>
                    <p style="font-weight: 600;">${apartment.iban}</p>
                </div>
                <div>
                    <p style="font-size: 13px; color: var(--text-gray); margin-bottom: 5px;"><i class="fas fa-car"></i> Plaka</p>
                    <p style="font-weight: 600;">${apartment.plate}</p>
                </div>
                <div>
                    <p style="font-size: 13px; color: var(--text-gray); margin-bottom: 5px;"><i class="fas fa-parking"></i> Otopark</p>
                    <p style="font-weight: 600;">${apartment.parking}</p>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h3 class="card-title">
                    <i class="fas fa-calendar-check"></i>
                    Ödeme Geçmişi
                </h3>
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th><i class="fas fa-calendar"></i> Ay</th>
                            <th><i class="fas fa-money-bill"></i> Tutar</th>
                            <th><i class="fas fa-info-circle"></i> Durum</th>
                            <th><i class="fas fa-clock"></i> Ödeme Tarihi</th>
                            <th><i class="fas fa-file-invoice"></i> Dekont</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    dataStore.months.forEach(month => {
        const payment = apartment.payments[month];
        content += `
            <tr>
                <td><strong>${month}</strong></td>
                <td>${payment.amount}₺</td>
                <td>
                    <span class="badge ${payment.paid ? 'badge-success' : 'badge-danger'}">
                        <i class="fas ${payment.paid ? 'fa-check' : 'fa-times'}"></i>
                        ${payment.paid ? 'Ödendi' : 'Ödenmedi'}
                    </span>
                </td>
                <td>${payment.date || '-'}</td>
                <td>
                    ${payment.receipt ? `<button class="btn-icon btn-info btn-sm" onclick="viewReceiptPreview('${buildingId}', '${apartmentId}', '${month}')"><i class="fas fa-eye"></i> Görüntüle</button>` : '-'}
                </td>
            </tr>
        `;
    });

    content += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    document.getElementById('apartmentDetailContent').innerHTML = content;
    openModal('apartmentDetailModal');
}

function loadAnnouncementsPage() {
    const list = document.getElementById('announcementsManageList');
    list.innerHTML = '';

    dataStore.announcements.forEach(ann => {
        list.innerHTML += `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title">${ann.title}</h3>
                    <button class="btn-icon btn-danger btn-sm" onclick="deleteAnnouncement(${ann.id})">
                        <i class="fas fa-trash"></i>
                        Sil
                    </button>
                </div>
                <p style="color: var(--text-gray); font-size: 13px; margin-bottom: 15px;">
                    <i class="fas fa-calendar"></i> ${ann.date}
                </p>
                <p style="line-height: 1.6;">${ann.content}</p>
            </div>
        `;
    });
}

function loadPaymentsPage() {
    const tbody = document.getElementById('pendingReceiptsTable');
    const thead = document.querySelector('#pendingReceiptsTable').parentElement.querySelector('thead');
    
    // Tablo başlığını güncelle
    if (thead) {
        thead.innerHTML = `
            <tr>
                <th>Ad Soyad</th>
                <th>Apartman</th>
                <th>Daire No</th>
                <th>Ay</th>
                <th>Tutar</th>
                <th>Tarih</th>
                <th>İşlem</th>
            </tr>
        `;
    }

    tbody.innerHTML = '';

    if (dataStore.pendingReceipts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-gray); padding: 30px;"><i class="fas fa-check-circle" style="font-size: 48px; display: block; margin-bottom: 15px;"></i>Bekleyen dekont bulunmamaktadır.</td></tr>';
    } else {
        dataStore.pendingReceipts.forEach(receipt => {
            const building = dataStore.buildings.find(b => b.id === receipt.buildingId);
            const buildingName = building ? building.name : 'Bilinmiyor';
            const apartment = building ? building.apartments.find(a => a.id === receipt.apartmentId) : null;
            const ownerName = apartment ? apartment.owner : 'Bilinmiyor';
            tbody.innerHTML += `
                <tr>
                    <td>${ownerName}</td>
                    <td>${buildingName}</td>
                    <td>${receipt.apartmentNo}</td>
                    <td>${receipt.month}</td>
                    <td>${receipt.amount}₺</td>
                    <td>${receipt.date}</td>
                    <td>
                        <button class="btn-icon btn-info btn-sm" onclick="viewPendingReceipt('${receipt.docId}')">
                            <i class="fas fa-eye"></i>
                            İncele
                        </button>
                    </td>
                </tr>
            `;
        });
    }
}

function loadUsersPage() {
    const tbody = document.getElementById('usersTable');
    tbody.innerHTML = '';

    for (const [username, user] of Object.entries(dataStore.users)) {
        let apartmentInfo = '-';
        let buildingName = '-';
        let roleText = 'Yönetici';
        let roleBadge = 'badge-danger';
        let roleIcon = 'fa-user-shield';

        if (user.role === 'admin') {
            roleText = 'Admin';
            roleBadge = 'badge-danger';
            roleIcon = 'fa-crown';
        } else if (user.role === 'manager') {
            roleText = 'Yönetici';
            roleBadge = 'badge-warning';
            roleIcon = 'fa-user-tie';
        } else {
            roleText = 'Daire Sakini';
            roleBadge = 'badge-info';
            roleIcon = 'fa-user';

            dataStore.buildings.forEach(building => {
                building.apartments.forEach(apt => {
                    if (user.apartmentId === apt.id) {
                        apartmentInfo = apt.no;
                        buildingName = building.name;
                    }
                });
            });
        }

        tbody.innerHTML += `
            <tr>
                <td>${user.name}</td>
                <td>${buildingName}</td>
                <td>${apartmentInfo}</td>
                <td>${user.phone || '-'}</td>
                <td><span class="badge ${roleBadge}"><i class="fas ${roleIcon}"></i> ${roleText}</span></td>
                <td>
                    ${user.role !== 'admin' ? `<button class="btn-icon btn-danger btn-sm" onclick="deleteUser('${username}')"><i class="fas fa-trash"></i> Sil</button>` : '-'}
                </td>
            </tr>
        `;
    }
}


function toggleApartmentFields() {
    const role = document.getElementById('userRole').value;
    const apartmentFields = document.getElementById('apartmentFields');
    
    if (role === 'manager') {
        apartmentFields.style.display = 'none';
        document.getElementById('userBuilding').value = '';
        document.getElementById('userApartment').value = '';
    } else {
        apartmentFields.style.display = 'block';
    }
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    
    if (modalId === 'addUserModal') {
        const buildingSelect = document.getElementById('userBuilding');
        buildingSelect.innerHTML = '<option value="">Apartman Seçin</option>';
        dataStore.buildings.forEach(building => {
            buildingSelect.innerHTML += `<option value="${building.id}">${building.name}</option>`;
        });
        document.getElementById('userApartment').innerHTML = '<option value="">Önce apartman seçin</option>';
        toggleApartmentFields();
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function openAddApartmentModal(buildingId) {
    document.getElementById('selectedBuildingId').value = buildingId;
    openModal('addApartmentModal');
}

function openUploadReceiptModal(month, amount) {
    document.getElementById('uploadReceiptMonth').textContent = month;
    document.getElementById('uploadReceiptAmount').textContent = amount;
    selectedMonthData = { month, amount };
    openModal('uploadReceiptModal');
}

async function addBuilding() {
    const name = document.getElementById('buildingName').value;
    const flats = document.getElementById('buildingFlats').value;

    if (!name) {
        alert('Lütfen apartman adını giriniz!');
        return;
    }

    const newBuilding = {
        id: 'building-' + Date.now(),
        name: name,
        apartments: []
    };

    dataStore.buildings.push(newBuilding);
    
    if (await saveToFirebase('buildings', dataStore.buildings)) {
        alert('Apartman başarıyla eklendi!');
        closeModal('addBuildingModal');
        document.getElementById('buildingName').value = '';
        document.getElementById('buildingFlats').value = '';
        loadBuildingsPage();
    }
}

async function addApartment() {
    const buildingId = document.getElementById('selectedBuildingId').value;
    const no = document.getElementById('apartmentNo').value;
    const owner = document.getElementById('apartmentOwner').value;
    const phone = document.getElementById('apartmentPhone').value;
    const iban = document.getElementById('apartmentIban').value;
    const plate = document.getElementById('apartmentPlate').value;
    const parking = document.getElementById('apartmentParking').value;

    if (!no || !owner) {
        alert('Lütfen daire no ve malik/kiracı adını giriniz!');
        return;
    }

    const building = dataStore.buildings.find(b => b.id === buildingId);
    const newApartment = {
        id: 'apt-' + Date.now(),
        no: no,
        owner: owner,
        phone: phone,
        iban: iban,
        plate: plate,
        parking: parking,
        payments: {}
    };

    dataStore.months.forEach(month => {
        newApartment.payments[month] = {
            paid: false,
            amount: dataStore.baseDues,
            date: null,
            receipt: null
        };
    });

    building.apartments.push(newApartment);
    
    if (await saveToFirebase('buildings', dataStore.buildings)) {
        alert('Daire başarıyla eklendi!');
        closeModal('addApartmentModal');
        clearApartmentForm();
        loadBuildingsPage();
    }
}

function clearApartmentForm() {
    document.getElementById('apartmentNo').value = '';
    document.getElementById('apartmentOwner').value = '';
    document.getElementById('apartmentPhone').value = '';
    document.getElementById('apartmentIban').value = '';
    document.getElementById('apartmentPlate').value = '';
    document.getElementById('apartmentParking').value = '';
}

async function addAnnouncement() {
    const title = document.getElementById('announcementTitle').value;
    const content = document.getElementById('announcementContent').value;

    if (!title || !content) {
        alert('Lütfen tüm alanları doldurunuz!');
        return;
    }

    const newAnnouncement = {
        id: Date.now(),
        title: title,
        content: content,
        date: new Date().toISOString().split('T')[0]
    };

    dataStore.announcements.unshift(newAnnouncement);
    
    if (await saveToFirebase('announcements', dataStore.announcements)) {
        alert('Duyuru başarıyla yayınlandı!');
        closeModal('addAnnouncementModal');
        document.getElementById('announcementTitle').value = '';
        document.getElementById('announcementContent').value = '';
        loadAnnouncementsPage();
        loadHomePage();
    }
}

async function deleteAnnouncement(id) {
    if (confirm('Duyuruyu silmek istediğinizden emin misiniz?')) {
        dataStore.announcements = dataStore.announcements.filter(a => a.id !== id);
        if (await saveToFirebase('announcements', dataStore.announcements)) {
            loadAnnouncementsPage();
            loadHomePage();
        }
    }
}

function loadBuildingApartments() {
    const buildingId = document.getElementById('userBuilding').value;
    const apartmentSelect = document.getElementById('userApartment');

    if (!buildingId) {
        apartmentSelect.innerHTML = '<option value="">Önce apartman seçin</option>';
        return;
    }

    const building = dataStore.buildings.find(b => b.id === buildingId);
    apartmentSelect.innerHTML = '<option value="">Daire seçin</option>';

    building.apartments.forEach(apt => {
        apartmentSelect.innerHTML += `<option value="${apt.id}">${apt.no} - ${apt.owner}</option>`;
    });
}

async function addUser() {
    const role = document.getElementById('userRole').value;
    const username = document.getElementById('newUsername').value;
    const password = document.getElementById('newPassword').value;
    const fullName = document.getElementById('userName').value;

    if (!username || !password || !fullName) {
        alert('Lütfen kullanıcı adı, şifre ve ad soyad giriniz!');
        return;
    }

    if (dataStore.users[username]) {
        alert('Bu kullanıcı adı zaten kullanılıyor!');
        return;
    }

    let newUser = {
        password: password,
        name: fullName,
        role: role
    };

    if (role === 'resident') {
        const buildingId = document.getElementById('userBuilding').value;
        const apartmentId = document.getElementById('userApartment').value;

        if (!apartmentId || !buildingId) {
            alert('Lütfen apartman ve daire seçiniz!');
            return;
        }

        const building = dataStore.buildings.find(b => b.id === buildingId);
        const apartment = building.apartments.find(a => a.id === apartmentId);

        newUser.apartmentId = apartmentId;
        newUser.phone = apartment.phone;
    }

    dataStore.users[username] = newUser;

    if (await saveToFirebase('users', dataStore.users)) {
        alert('Kullanıcı başarıyla eklendi!');
        closeModal('addUserModal');
        document.getElementById('newUsername').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('userName').value = '';
        document.getElementById('userRole').value = 'resident';
        document.getElementById('userBuilding').value = '';
        document.getElementById('userApartment').innerHTML = '<option value="">Önce apartman seçin</option>';
        toggleApartmentFields();
        loadUsersPage();
    }
}


async function deleteUser(username) {
    const user = dataStore.users[username];
    
    if (!confirm(`${user.name} (${username}) kullanıcısını silmek istediğinizden emin misiniz?`)) {
        return;
    }
    
    delete dataStore.users[username];
    
    if (await saveToFirebase('users', dataStore.users)) {
        alert('Kullanıcı başarıyla silindi!');
        loadUsersPage();
    }
}

function requestTransfer() {
    const info = document.getElementById('transferInfo').value;
    
    if (!info.trim()) {
        alert('Lütfen yeni malik/kiracı bilgisini giriniz!');
        return;
    }

    alert('Devir talebiniz yönetime iletildi. En kısa sürede size dönüş yapılacaktır.');
    document.getElementById('transferInfo').value = '';
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('filePreview');

    if (file) {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.innerHTML = `
                    <div class="receipt-preview">
                        <p style="color: var(--text-gray); margin-bottom: 10px;">
                            <i class="fas fa-file-image"></i> ${file.name}
                        </p>
                        <img src="${e.target.result}" alt="Dekont önizleme" style="max-width: 100%; max-height: 300px; border-radius: 8px; border: 2px solid var(--border);">
                    </div>
                `;
            };
            reader.readAsDataURL(file);
        } else if (file.type === 'application/pdf') {
            preview.innerHTML = `
                <div class="receipt-preview" style="text-align: center;">
                    <i class="fas fa-file-pdf" style="font-size: 48px; color: #e74c3c;"></i>
                    <p style="margin-top: 10px; font-weight: 600;">${file.name}</p>
                    <p style="font-size: 12px; color: var(--text-gray); margin-top: 5px;">
                        PDF dosyası yüklemeye hazır
                    </p>
                </div>
            `;
        } else {
            preview.innerHTML = `
                <div class="receipt-preview" style="text-align: center;">
                    <i class="fas fa-file" style="font-size: 48px; color: var(--secondary);"></i>
                    <p style="margin-top: 10px; font-weight: 600;">${file.name}</p>
                </div>
            `;
        }
    }
}

async function uploadReceipt() {
    const file = document.getElementById('receiptFile').files[0];

    if (!file) {
        alert('Lütfen dekont dosyasını seçiniz!');
        return;
    }

    if (file.size > 2 * 1024 * 1024) {
        alert('Dosya boyutu 2MB\'dan küçük olmalıdır!');
        return;
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
        alert('Sadece resim (JPG, PNG, GIF) veya PDF dosyası yükleyebilirsiniz!');
        return;
    }

    if (currentUser.role === 'resident') {
        let userApartment = null;
        let userBuildingId = null;

        dataStore.buildings.forEach(building => {
            building.apartments.forEach(apt => {
                if (dataStore.users[currentUser.username].apartmentId === apt.id) {
                    userApartment = apt;
                    userBuildingId = building.id;
                }
            });
        });

        if (userApartment) {
            try {
                const timestamp = Date.now();
                const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
                const fileName = `receipts/${timestamp}_${sanitizedFileName}`;
                const fileRef = storageRef(storage, fileName);
                
                const metadata = {
                    contentType: file.type,
                    customMetadata: {
                        'uploadedBy': userApartment.owner, // Değişiklik: currentUser.username yerine userApartment.owner kullanıldı
                        'apartmentId': userApartment.id
                    }
                };

                await uploadBytes(fileRef, file, metadata);
                const downloadURL = await getDownloadURL(fileRef);

                const receipt = {
                    id: timestamp,
                    buildingId: userBuildingId,
                    apartmentId: userApartment.id,
                    apartmentNo: userApartment.no,
                    month: selectedMonthData.month,
                    amount: selectedMonthData.amount,
                    date: new Date().toISOString().split('T')[0],
                    fileName: file.name,
                    fileData: downloadURL
                };

                const docRef = await addDoc(collection(db, 'pendingReceipts'), receipt);
                receipt.docId = docRef.id;
                dataStore.pendingReceipts.push(receipt);
                
                alert('Dekont başarıyla yüklendi! Yönetici onayı bekleniyor.');
                closeModal('uploadReceiptModal');
                document.getElementById('receiptFile').value = '';
                document.getElementById('filePreview').innerHTML = '';
                loadDuesPage();
            } catch (error) {
                console.error('Dekont yükleme hatası:', error);
                alert('Dekont yüklenirken bir hata oluştu: ' + error.message);
            }
        }
    }
}

function viewPendingReceipt(docId) {
    const receipt = dataStore.pendingReceipts.find(r => r.docId === docId);
    selectedReceiptId = docId;

    if (!receipt) return;

    const building = dataStore.buildings.find(b => b.id === receipt.buildingId);
    const apartment = building.apartments.find(a => a.id === receipt.apartmentId);

    const isPDF = receipt.fileName.toLowerCase().endsWith('.pdf');

    const content = `
        <div class="card" style="margin-bottom: 20px;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                <div>
                    <p style="font-size: 13px; color: var(--text-gray); margin-bottom: 5px;">
                        <i class="fas fa-user"></i> Ad Soyad
                    </p>
                    <p style="font-weight: 600;">${apartment.owner}</p>
                </div>
                <div>
                    <p style="font-size: 13px; color: var(--text-gray); margin-bottom: 5px;">
                        <i class="fas fa-building"></i> Apartman
                    </p>
                    <p style="font-weight: 600;">${building.name}</p>
                </div>
                <div>
                    <p style="font-size: 13px; color: var(--text-gray); margin-bottom: 5px;">
                        <i class="fas fa-door-open"></i> Daire
                    </p>
                    <p style="font-weight: 600;">${apartment.no}</p>
                </div>
                <div>
                    <p style="font-size: 13px; color: var(--text-gray); margin-bottom: 5px;">
                        <i class="fas fa-calendar"></i> Ay
                    </p>
                    <p style="font-weight: 600;">${receipt.month}</p>
                </div>
                <div>
                    <p style="font-size: 13px; color: var(--text-gray); margin-bottom: 5px;">
                        <i class="fas fa-money-bill"></i> Tutar
                    </p>
                    <p style="font-weight: 600;">${receipt.amount}₺</p>
                </div>
                <div>
                    <p style="font-size: 13px; color: var(--text-gray); margin-bottom: 5px;">
                        <i class="fas fa-clock"></i> Tarih
                    </p>
                    <p style="font-weight: 600;">${receipt.date}</p>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <h3 class="card-title">
                    <i class="fas fa-file-invoice"></i>
                    Dekont Önizleme
                </h3>
                <button class="btn-icon btn-info btn-sm" onclick="window.open('${receipt.fileData}', '_blank')" style="margin-left: auto;">
                    <i class="fas fa-external-link-alt"></i>
                    Yeni Sekmede Aç
                </button>
            </div>
            <div class="receipt-preview" style="text-align: center; padding: 20px;">
                ${isPDF ? 
                    `<div style="cursor: pointer;" onclick="window.open('${receipt.fileData}', '_blank')">
                        <i class="fas fa-file-pdf" style="font-size: 64px; color: #e74c3c; margin-bottom: 15px;"></i>
                        <p style="font-weight: 600;">${receipt.fileName}</p>
                        <p style="font-size: 13px; color: var(--text-gray); margin-top: 10px;">
                            PDF dosyasını görüntülemek için tıklayın
                        </p>
                    </div>` 
                    : 
                    `<img src="${receipt.fileData}" alt="Dekont" style="max-width: 100%; max-height: 500px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); cursor: pointer;" onclick="window.open('${receipt.fileData}', '_blank')">`
                }
            </div>
        </div>
    `;

    document.getElementById('receiptPreviewContent').innerHTML = content;
    document.querySelector('#viewReceiptModal .modal-footer').style.display = 'flex';
    openModal('viewReceiptModal');
}
async function approveReceipt() {
    const receipt = dataStore.pendingReceipts.find(r => r.docId === selectedReceiptId);
    
    if (!receipt) return;

    const building = dataStore.buildings.find(b => b.id === receipt.buildingId);
    const apartment = building.apartments.find(a => a.id === receipt.apartmentId);

    apartment.payments[receipt.month].paid = true;
    apartment.payments[receipt.month].date = receipt.date;
    apartment.payments[receipt.month].receipt = receipt.fileName;
    apartment.payments[receipt.month].receiptUrl = receipt.fileData;

    await saveToFirebase('buildings', dataStore.buildings);
    await deleteDoc(doc(db, 'pendingReceipts', selectedReceiptId));

    alert('Dekont onaylandı!');
    closeModal('viewReceiptModal');
}

async function rejectReceipt() {
    if (confirm('Dekontu reddetmek istediğinizden emin misiniz?')) {
        dataStore.pendingReceipts = dataStore.pendingReceipts.filter(r => r.docId !== selectedReceiptId);
        
        await deleteDoc(doc(db, 'pendingReceipts', selectedReceiptId));
        
        alert('Dekont reddedildi!');
        closeModal('viewReceiptModal');
        loadPaymentsPage();
    }
}

function viewReceiptPreview(buildingId, apartmentId, month) {
    const building = dataStore.buildings.find(b => b.id === buildingId);
    const apartment = building.apartments.find(a => a.id === apartmentId);
    const payment = apartment.payments[month];

    if (!payment.receiptUrl) {
        alert('Dekont dosyası bulunamadı!');
        return;
    }

    const isPDF = payment.receipt && payment.receipt.toLowerCase().endsWith('.pdf');

    const content = `
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">
                    <i class="fas fa-info-circle"></i>
                    Ödeme Bilgileri
                </h3>
                <button class="btn-icon btn-info btn-sm" onclick="window.open('${payment.receiptUrl}', '_blank')" style="margin-left: auto;">
                    <i class="fas fa-external-link-alt"></i>
                    Yeni Sekmede Aç
                </button>
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                <div>
                    <p style="font-size: 13px; color: var(--text-gray); margin-bottom: 5px;">
                        <i class="fas fa-calendar"></i> Ay
                    </p>
                    <p style="font-weight: 600;">${month}</p>
                </div>
                <div>
                    <p style="font-size: 13px; color: var(--text-gray); margin-bottom: 5px;">
                        <i class="fas fa-money-bill"></i> Tutar
                    </p>
                    <p style="font-weight: 600;">${payment.amount}₺</p>
                </div>
                <div>
                    <p style="font-size: 13px; color: var(--text-gray); margin-bottom: 5px;">
                        <i class="fas fa-clock"></i> Ödeme Tarihi
                    </p>
                    <p style="font-weight: 600;">${payment.date}</p>
                </div>
                <div>
                    <p style="font-size: 13px; color: var(--text-gray); margin-bottom: 5px;">
                        <i class="fas fa-check-circle"></i> Durum
                    </p>
                    <p style="font-weight: 600; color: var(--success);">Onaylandı</p>
                </div>
            </div>
        </div>

        <div class="card" style="margin-top: 20px;">
            <div class="card-header">
                <h3 class="card-title">
                    <i class="fas fa-file-invoice"></i>
                    Dekont Önizleme
                </h3>
            </div>
            <div style="text-align: center; padding: 20px;">
                ${isPDF ? 
                    `<div style="cursor: pointer;" onclick="window.open('${payment.receiptUrl}', '_blank')">
                        <i class="fas fa-file-pdf" style="font-size: 64px; color: #e74c3c; margin-bottom: 15px;"></i>
                        <p style="font-weight: 600;">${payment.receipt}</p>
                        <p style="font-size: 13px; color: var(--text-gray); margin-top: 10px;">
                            PDF dosyasını görüntülemek için tıklayın
                        </p>
                    </div>` 
                    : 
                    `<img src="${payment.receiptUrl}" alt="Dekont" style="max-width: 100%; max-height: 500px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); cursor: pointer;" onclick="window.open('${payment.receiptUrl}', '_blank')">`
                }
            </div>
        </div>
    `;

    document.getElementById('receiptPreviewContent').innerHTML = content;
    document.querySelector('#viewReceiptModal .modal-footer').style.display = 'none';
    openModal('viewReceiptModal');
}


window.addEventListener('load', function() {
    const buildingSelect = document.getElementById('userBuilding');
    buildingSelect.innerHTML = '<option value="">Apartman Seçin</option>';
});

window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
        document.querySelector('#viewReceiptModal .modal-footer').style.display = 'flex';
    }
});


window.addEventListener('load', async function() {
    await loadDataFromFirebase();
    
    const buildingSelect = document.getElementById('userBuilding');
    buildingSelect.innerHTML = '<option value="">Apartman Seçin</option>';
    dataStore.buildings.forEach(building => {
        buildingSelect.innerHTML += `<option value="${building.id}">${building.name}</option>`;
    });
});

function loadAdminPage() {
    loadUsersPage();
    
    const downloadBuildingSelect = document.getElementById('downloadBuilding');
    downloadBuildingSelect.innerHTML = '<option value="">Apartman Seçin</option>';
    dataStore.buildings.forEach(building => {
        downloadBuildingSelect.innerHTML += `<option value="${building.id}">${building.name}</option>`;
    });

    const deleteMonthSelect = document.getElementById('deleteMonth');
    deleteMonthSelect.innerHTML = '<option value="">Ay Seçin</option>';
    dataStore.months.forEach(month => {
        deleteMonthSelect.innerHTML += `<option value="${month}">${month}</option>`;
    });

    // Depolama kullanımını yükle
    loadStorageUsage();
}

function loadDownloadMonths() {
    const buildingId = document.getElementById('downloadBuilding').value;
    const monthSelect = document.getElementById('downloadMonth');

    if (!buildingId) {
        monthSelect.innerHTML = '<option value="">Önce apartman seçin</option>';
        return;
    }

    monthSelect.innerHTML = '<option value="">Ay Seçin</option>';
    dataStore.months.forEach(month => {
        monthSelect.innerHTML += `<option value="${month}">${month}</option>`;
    });
}

async function downloadReceipts() {
    const buildingId = document.getElementById('downloadBuilding').value;
    const month = document.getElementById('downloadMonth').value;

    if (!buildingId || !month) {
        alert('Lütfen apartman ve ay seçiniz!');
        return;
    }

    // Güncel verileri çek
    try {
        const receiptsSnapshot = await getDocs(collection(db, 'pendingReceipts'));
        dataStore.pendingReceipts = [];
        receiptsSnapshot.forEach(docSnapshot => {
            dataStore.pendingReceipts.push({ ...docSnapshot.data(), docId: docSnapshot.id });
        });

        const buildingsDoc = await getDoc(doc(db, 'system', 'buildings'));
        if (buildingsDoc.exists()) {
            dataStore.buildings = buildingsDoc.data().data || [];
        }
    } catch (error) {
        console.error('Veriler güncellenirken hata:', error);
        alert('Veriler yüklenirken hata oluştu!');
        return;
    }

    const building = dataStore.buildings.find(b => b.id === buildingId);
    
    if (typeof JSZip === 'undefined') {
        alert('JSZip kütüphanesi yüklü değil! Lütfen sayfayı yenileyin.');
        return;
    }
    
    const zip = new JSZip();
    let fileCount = 0;
    const errors = [];

    try {
        console.log('Apartman:', building.name);
        console.log('Ay:', month);

        // 1. Onaylanmış dekontları ekle
        for (const apt of building.apartments) {
            const payment = apt.payments[month];
            
            if (payment && payment.paid && payment.receiptUrl) {
                try {
                    console.log(`Daire ${apt.no} onaylı dekont indiriliyor...`);
                    
                    // URL'den dosya yolunu çıkar
                    const urlParts = payment.receiptUrl.split('/o/');
                    if (urlParts.length > 1) {
                        const fileName = urlParts[1].split('?')[0];
                        const decodedFileName = decodeURIComponent(fileName);
                        
                        // Firebase Storage SDK kullanarak indir
                        const fileRef = storageRef(storage, decodedFileName);
                        const url = await getDownloadURL(fileRef);
                        
                        // Blob olarak indir
                        const xhr = new XMLHttpRequest();
                        const blob = await new Promise((resolve, reject) => {
                            xhr.responseType = 'blob';
                            xhr.onload = () => resolve(xhr.response);
                            xhr.onerror = () => reject(new Error('İndirme hatası'));
                            xhr.open('GET', url);
                            xhr.send();
                        });
                        
                        const extension = payment.receipt ? payment.receipt.split('.').pop() : 'pdf';
                        zip.file(`Daire_${apt.no}_${month}_ONAYLANDI.${extension}`, blob);
                        fileCount++;
                        console.log(`✓ Daire ${apt.no} eklendi`);
                    }
                } catch (error) {
                    console.error(`✗ Daire ${apt.no} onaylı dekont hatası:`, error);
                    errors.push(`Daire ${apt.no} (Onaylı): ${error.message}`);
                }
            }
        }

        // 2. Bekleyen dekontları ekle
        const pendingForBuilding = dataStore.pendingReceipts.filter(
            r => r.buildingId === buildingId && r.month === month
        );
        
        console.log('Bu apartman için bekleyen dekontlar:', pendingForBuilding.length);

        for (const receipt of pendingForBuilding) {
            try {
                console.log(`Daire ${receipt.apartmentNo} bekleyen dekont indiriliyor...`);
                
                // URL'den dosya yolunu çıkar
                const urlParts = receipt.fileData.split('/o/');
                if (urlParts.length > 1) {
                    const fileName = urlParts[1].split('?')[0];
                    const decodedFileName = decodeURIComponent(fileName);
                    
                    // Firebase Storage SDK kullanarak indir
                    const fileRef = storageRef(storage, decodedFileName);
                    const url = await getDownloadURL(fileRef);
                    
                    // Blob olarak indir
                    const xhr = new XMLHttpRequest();
                    const blob = await new Promise((resolve, reject) => {
                        xhr.responseType = 'blob';
                        xhr.onload = () => resolve(xhr.response);
                        xhr.onerror = () => reject(new Error('İndirme hatası'));
                        xhr.open('GET', url);
                        xhr.send();
                    });
                    
                    const extension = receipt.fileName ? receipt.fileName.split('.').pop() : 'pdf';
                    zip.file(`Daire_${receipt.apartmentNo}_${month}_BEKLIYOR.${extension}`, blob);
                    fileCount++;
                    console.log(`✓ Daire ${receipt.apartmentNo} eklendi`);
                }
            } catch (error) {
                console.error(`✗ Daire ${receipt.apartmentNo} bekleyen dekont hatası:`, error);
                errors.push(`Daire ${receipt.apartmentNo} (Bekleyen): ${error.message}`);
            }
        }

        if (fileCount === 0) {
            alert(`Bu ay için indirilecek dekont bulunamadı!\n\nApartman: ${building.name}\nAy: ${month}\n\nBekleyen dekontlar: ${pendingForBuilding.length}\nOnaylanmış: ${building.apartments.filter(apt => apt.payments[month]?.paid).length}`);
            return;
        }

        const content = await zip.generateAsync({type: 'blob'});
        const url = window.URL.createObjectURL(content);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${building.name}_${month}_Dekontlar.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        let successMsg = `${fileCount} adet dekont başarıyla indirildi!`;
        if (errors.length > 0) {
            successMsg += `\n\n${errors.length} dosya indirilemedi:\n${errors.join('\n')}`;
        }
        alert(successMsg);
    } catch (error) {
        console.error('Dekont indirme hatası:', error);
        alert('Dekontlar indirilirken bir hata oluştu: ' + error.message);
    }
}
async function deleteStorageByMonth() {
    const month = document.getElementById('deleteMonth').value;

    if (!month) {
        alert('Lütfen ay seçiniz!');
        return;
    }

    // Önce kaç dosya silineceğini göster
    let totalCount = 0;
    
    // Bekleyen dekontları say
    const pendingToDelete = dataStore.pendingReceipts.filter(r => r.month === month);
    totalCount += pendingToDelete.length;
    
    // Onaylanmış dekontları say
    for (const building of dataStore.buildings) {
        for (const apt of building.apartments) {
            const payment = apt.payments[month];
            if (payment && payment.paid && payment.receiptUrl) {
                totalCount++;
            }
        }
    }

    if (totalCount === 0) {
        alert(`${month} ayına ait hiç dekont bulunamadı!\n\nKontrol edildi:\n- Bekleyen dekontlar: 0\n- Onaylanmış dekontlar: 0`);
        return;
    }

    if (!confirm(`${month} ayına ait ${totalCount} adet dekont Firebase Storage'dan silinecek.\n\n- Bekleyen: ${pendingToDelete.length}\n- Onaylı: ${totalCount - pendingToDelete.length}\n\nBu işlem GERİ ALINAMAZ! Emin misiniz?`)) {
        return;
    }

    try {
        let deletedCount = 0;
        let errorCount = 0;

        // 1. Bekleyen dekontları sil (pendingReceipts)
        for (const receipt of pendingToDelete) {
            try {
                const urlParts = receipt.fileData.split('/o/');
                if (urlParts.length > 1) {
                    const fileName = urlParts[1].split('?')[0];
                    const decodedFileName = decodeURIComponent(fileName);
                    const fileRef = storageRef(storage, decodedFileName);
                    await deleteObject(fileRef);
                    deletedCount++;
                    
                    // Firestore dokümanını da sil
                    await deleteDoc(doc(db, 'pendingReceipts', receipt.docId));
                }
            } catch (error) {
                console.error(`Bekleyen dekont silinemedi:`, error);
                errorCount++;
            }
        }

        // 2. Onaylanmış dekontları sil (buildings içindeki)
        for (const building of dataStore.buildings) {
            for (const apt of building.apartments) {
                const payment = apt.payments[month];
                if (payment && payment.paid && payment.receiptUrl) {
                    try {
                        const urlParts = payment.receiptUrl.split('/o/');
                        if (urlParts.length > 1) {
                            const fileName = urlParts[1].split('?')[0];
                            const decodedFileName = decodeURIComponent(fileName);
                            const fileRef = storageRef(storage, decodedFileName);
                            await deleteObject(fileRef);
                            
                            // Ödeme durumunu koru ama dekont bilgilerini temizle
                            payment.receipt = null;
                            payment.receiptUrl = null;
                            deletedCount++;
                        }
                    } catch (error) {
                        console.error(`Onaylı dekont silinemedi (${building.name} - Daire ${apt.no}):`, error);
                        errorCount++;
                    }
                }
            }
        }

        // Buildings dokümanını güncelle
        await saveToFirebase('buildings', dataStore.buildings);

        alert(`✓ Silme işlemi tamamlandı!\n\n- Başarılı: ${deletedCount} dosya\n- Hata: ${errorCount} dosya`);
        
        // Sayfaları yenile
        loadAdminPage();
        loadPaymentsPage();
        
    } catch (error) {
        console.error('Storage silme hatası:', error);
        alert('Dekontlar silinirken bir hata oluştu: ' + error.message);
    }
}
function setupRealtimeListeners() {
    onSnapshot(doc(db, 'system', 'users'), (docSnapshot) => {
        if (docSnapshot.exists()) {
            dataStore.users = docSnapshot.data();
            if (currentUser && document.getElementById('usersTable')) {
                loadUsersPage();
            }
        }
    });

    onSnapshot(doc(db, 'system', 'buildings'), (docSnapshot) => {
        if (docSnapshot.exists()) {
            dataStore.buildings = docSnapshot.data().data || [];
            if (currentUser) {
                loadHomePage();
                if (document.getElementById('buildingsGrid')) {
                    loadBuildingsPage();
                }
            }
        }
    });

    onSnapshot(doc(db, 'system', 'announcements'), (docSnapshot) => {
        if (docSnapshot.exists()) {
            dataStore.announcements = docSnapshot.data().data || [];
            if (currentUser) {
                loadHomePage();
                if (document.getElementById('announcementsManageList')) {
                    loadAnnouncementsPage();
                }
            }
        }
    });

    onSnapshot(collection(db, 'pendingReceipts'), (snapshot) => {
        dataStore.pendingReceipts = [];
        snapshot.forEach(docSnapshot => {
            dataStore.pendingReceipts.push({ ...docSnapshot.data(), docId: docSnapshot.id });
        });
        if (currentUser && document.getElementById('pendingReceiptsTable')) {
            loadPaymentsPage();
        }
    });

    onSnapshot(doc(db, 'system', 'settings'), (docSnapshot) => {
        if (docSnapshot.exists()) {
            const settings = docSnapshot.data();
            dataStore.months = settings.months || dataStore.months;
            dataStore.baseDues = settings.baseDues || dataStore.baseDues;
        }
    });
}

async function loadStorageUsage() {
    try {
        // Firestore kullanımını hesapla
        let firestoreTotalSize = 0;
        let firestoreDocCount = 0;

        // Users
        try {
            const usersDoc = await getDoc(doc(db, 'system', 'users'));
            if (usersDoc.exists()) {
                const usersData = usersDoc.data();
                firestoreDocCount += Object.keys(usersData).length;
                firestoreTotalSize += new TextEncoder().encode(JSON.stringify(usersData)).length;
            }
        } catch (error) {
            console.error('Users verisi alınamadı:', error);
        }

        // Buildings
        try {
            const buildingsDoc = await getDoc(doc(db, 'system', 'buildings'));
            if (buildingsDoc.exists()) {
                const buildingsData = buildingsDoc.data().data || [];
                firestoreDocCount += buildingsData.length;
                firestoreTotalSize += new TextEncoder().encode(JSON.stringify(buildingsData)).length;
            }
        } catch (error) {
            console.error('Buildings verisi alınamadı:', error);
        }

        // Announcements
        try {
            const announcementsDoc = await getDoc(doc(db, 'system', 'announcements'));
            if (announcementsDoc.exists()) {
                const announcementsData = announcementsDoc.data().data || [];
                firestoreDocCount += announcementsData.length;
                firestoreTotalSize += new TextEncoder().encode(JSON.stringify(announcementsData)).length;
            }
        } catch (error) {
            console.error('Announcements verisi alınamadı:', error);
        }

        // Pending Receipts
        try {
            const receiptsSnapshot = await getDocs(collection(db, 'pendingReceipts'));
            firestoreDocCount += receiptsSnapshot.size;
            receiptsSnapshot.forEach(docSnapshot => {
                firestoreTotalSize += new TextEncoder().encode(JSON.stringify(docSnapshot.data())).length;
            });
        } catch (error) {
            console.error('Pending Receipts verisi alınamadı:', error);
        }

        // Settings
        try {
            const settingsDoc = await getDoc(doc(db, 'system', 'settings'));
            if (settingsDoc.exists()) {
                firestoreTotalSize += new TextEncoder().encode(JSON.stringify(settingsDoc.data())).length;
            }
        } catch (error) {
            console.error('Settings verisi alınamadı:', error);
        }

        const firestoreSizeGB = (firestoreTotalSize / (1024 * 1024 * 1024)).toFixed(2);
        const firestoreSizeMB = (firestoreTotalSize / (1024 * 1024)).toFixed(2);

        // Storage kullanımını hesapla
        let storageTotalSize = 0;
        let storageFileCount = 0;
        try {
            const listResult = await listAll(storageRef(storage, 'receipts/'));
            storageFileCount += listResult.items.length;
            for (const itemRef of listResult.items) {
                try {
                    const metadata = await getMetadata(itemRef);
                    storageTotalSize += metadata.size || 0;
                } catch (error) {
                    console.error(`Dosya metadata alınamadı (${itemRef.name}):`, error);
                }
            }
        } catch (error) {
            console.error('Storage dosyaları alınamadı:', error);
        }

        const storageSizeGB = (storageTotalSize / (1024 * 1024 * 1024)).toFixed(2);
        const storageSizeMB = (storageTotalSize / (1024 * 1024)).toFixed(2);

        // Dinamik tablo oluştur
        let usageContainer = document.getElementById('storageUsageContainer');
        if (!usageContainer) {
            usageContainer = document.createElement('div');
            usageContainer.id = 'storageUsageContainer';
            document.getElementById('adminPage').appendChild(usageContainer);
        }

        usageContainer.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title"><i class="fas fa-database"></i> Veri Yönetimi - Depolama Kullanımı</h3>
                </div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Servis</th>
                                <th>İçerik Sayısı</th>
                                <th>Depolama Boyutu</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><strong>Firestore Depolama</strong></td>
                                <td>${firestoreDocCount} Doküman</td>
                                <td>${firestoreSizeGB} GB (${firestoreSizeMB} MB)</td>
                            </tr>
                            <tr>
                                <td><strong>Storage Depolama</strong></td>
                                <td>${storageFileCount} Dosya</td>
                                <td>${storageSizeGB} GB (${storageSizeMB} MB)</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Depolama kullanım hatası:', error);
        let usageContainer = document.getElementById('storageUsageContainer');
        if (!usageContainer) {
            usageContainer = document.createElement('div');
            usageContainer.id = 'storageUsageContainer';
            document.getElementById('adminPage').appendChild(usageContainer);
        }
        let errorMessage = 'Veri yüklenemedi!';
        if (error.code === 'permission-denied') {
            errorMessage = 'Yetki hatası: Firebase erişim izni eksik!';
        } else if (error.code === 'unavailable') {
            errorMessage = 'Firebase servisi kullanılamıyor!';
        } else if (error.code === 'not-found') {
            errorMessage = 'Veriler bulunamadı!';
        }
        usageContainer.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h3 class="card-title"><i class="fas fa-database"></i> Veri Yönetimi - Depolama Kullanımı</h3>
                </div>
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Servis</th>
                                <th>İçerik Sayısı</th>
                                <th>Depolama Boyutu</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colspan="3" style="text-align: center; color: red;">${errorMessage}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
}

window.showPage = showPage;
window.logout = logout;
window.selectBuildingForDues = selectBuildingForDues;
window.showMonthDetails = showMonthDetails;
window.viewBuildingDetail = viewBuildingDetail;
window.viewApartmentDetail = viewApartmentDetail;
window.openAddApartmentModal = openAddApartmentModal;
window.openUploadReceiptModal = openUploadReceiptModal;
window.openModal = openModal;
window.closeModal = closeModal;
window.addBuilding = addBuilding;
window.addApartment = addApartment;
window.clearApartmentForm = clearApartmentForm;
window.addAnnouncement = addAnnouncement;
window.deleteAnnouncement = deleteAnnouncement;
window.loadBuildingApartments = loadBuildingApartments;
window.addUser = addUser;
window.requestTransfer = requestTransfer;
window.handleFileSelect = handleFileSelect;
window.uploadReceipt = uploadReceipt;
window.viewPendingReceipt = viewPendingReceipt;
window.approveReceipt = approveReceipt;
window.rejectReceipt = rejectReceipt;
window.viewReceiptPreview = viewReceiptPreview;
window.deleteBuilding = deleteBuilding;
window.deleteApartment = deleteApartment;
window.toggleApartmentFields = toggleApartmentFields;
window.deleteUser = deleteUser;
window.loadAdminPage = loadAdminPage;
window.loadDownloadMonths = loadDownloadMonths;
window.downloadReceipts = downloadReceipts;
window.deleteStorageByMonth = deleteStorageByMonth;