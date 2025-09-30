// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAi6hBayzGbVa0cM2G7g3IuM-DxbSoLc8A",
  authDomain: "furkatech-4113c.firebaseapp.com",
  projectId: "furkatech-4113c",
  storageBucket: "furkatech-4113c.firebasestorage.app",
  messagingSenderId: "1047454361288",
  appId: "1:1047454361288:web:4b6e37406fb84c9fbae7fd",
  measurementId: "G-BBHQ9W64JL"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Global Variables
let currentUser = null;
let allPayments = [];
let allProjects = [];
let allTasks = [];
let allCustomers = [];
let allInvoices = [];
let dashboardChart = null;
let revenueChart = null;
let invoiceChart = null;
let allUsers = [];


// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const mainApp = document.getElementById('mainApp');
const loadingSpinner = document.getElementById('loadingSpinner');

// Splash Screen Animation
function showSplashScreen() {
    const splash = document.createElement('div');
    splash.id = 'splashScreen';
    splash.innerHTML = `
        <div class="splash-content">
            <div class="splash-logo-container">
                <img src="img/logo/500x200.png" alt="Furkatech Logo" class="splash-logo">
            </div>
            
            <div class="splash-loader"></div>
        </div>
    `;
    splash.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(135deg, #172d4c 0%, rgba(23, 45, 76, 0.95) 100%);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;
    document.body.appendChild(splash);
    
    setTimeout(() => {
        splash.style.opacity = '0';
        splash.style.transition = 'opacity 0.7s ease';
        setTimeout(() => {
            splash.remove();
        }, 1000);
    }, 4000);
}

// Proje bütçe güncelleme fonksiyonu
window.updateProjectBudget = function(projectId) {
    const project = allProjects.find(p => p.id === projectId);
    if (!project) return;
    
    let modal = document.getElementById('budgetUpdateModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'budgetUpdateModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 400px;">
            <div class="modal-header">
                <h2>Bütçe Güncelle</h2>
                <button class="close-modal" onclick="closeModal('budgetUpdateModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form id="budgetUpdateForm" class="modal-form">
                <div class="form-group">
                    <label>Mevcut Bütçe</label>
                    <input type="text" value="₺${project.budget.toLocaleString('tr-TR')}" disabled style="background: var(--gray-light);">
                </div>
                <div class="form-group">
                    <label>Yeni Bütçe</label>
                    <input type="number" id="newBudget" placeholder="Yeni bütçe tutarı" required>
                </div>
                <div class="form-group">
                    <label>Güncelleme Nedeni</label>
                    <textarea id="budgetReason" placeholder="Bütçe değişikliği nedeni" required></textarea>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeModal('budgetUpdateModal')">İptal</button>
                    <button type="submit" class="btn btn-primary">Güncelle</button>
                </div>
            </form>
        </div>
    `;
    
    document.getElementById('budgetUpdateForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading();
        
        const newBudget = parseFloat(document.getElementById('newBudget').value);
        const reason = document.getElementById('budgetReason').value;
        
        try {
            await db.collection('projects').doc(projectId).update({
                currentBudget: newBudget,
                budgetHistory: firebase.firestore.FieldValue.arrayUnion({
                    oldBudget: project.budget,
                    newBudget: newBudget,
                    reason: reason,
                    updatedAt: new Date(),
                    updatedBy: currentUser.displayName || currentUser.username
                }),
                budgetUpdatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showNotification('Bütçe güncellendi');
            closeModal('budgetUpdateModal');
            closeModal('projectDetailModal');
            loadProjects();
        } catch (error) {
            showNotification('Güncelleme hatası', 'error');
        } finally {
            hideLoading();
        }
    });
    
    openModal('budgetUpdateModal');
}

// Proje düzenleme fonksiyonu
window.editProject = function(projectId) {
    const project = allProjects.find(p => p.id === projectId);
    if (!project) return;
    
    let modal = document.getElementById('editProjectModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'editProjectModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Proje Düzenle</h2>
                <button class="close-modal" onclick="closeModal('editProjectModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form id="editProjectForm" class="modal-form">
                <div class="form-group">
                    <label>Proje Adı</label>
                    <input type="text" id="editProjectName" value="${project.name}" required>
                </div>
                <div class="form-group">
                    <label>Müşteri</label>
                    <input type="text" id="editProjectClient" value="${project.client}" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Başlangıç</label>
                        <input type="date" id="editProjectStartDate" value="${project.startDate}" required>
                    </div>
                    <div class="form-group">
                        <label>Bitiş</label>
                        <input type="date" id="editProjectEndDate" value="${project.endDate}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>İlerleme (%)</label>
                        <input type="number" id="editProjectProgress" value="${project.progress}" min="0" max="100" required>
                    </div>
                    <div class="form-group">
                        <label>Durum</label>
                        <select id="editProjectStatus">
                            <option value="active" ${project.status === 'active' ? 'selected' : ''}>Aktif</option>
                            <option value="completed" ${project.status === 'completed' ? 'selected' : ''}>Tamamlandı</option>
                            <option value="cancelled" ${project.status === 'cancelled' ? 'selected' : ''}>İptal</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeModal('editProjectModal')">İptal</button>
                    <button type="submit" class="btn btn-primary">Güncelle</button>
                </div>
            </form>
        </div>
    `;
    
    document.getElementById('editProjectForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading();
        
        try {
            await db.collection('projects').doc(projectId).update({
                name: document.getElementById('editProjectName').value,
                client: document.getElementById('editProjectClient').value,
                startDate: document.getElementById('editProjectStartDate').value,
                endDate: document.getElementById('editProjectEndDate').value,
                progress: parseInt(document.getElementById('editProjectProgress').value),
                status: document.getElementById('editProjectStatus').value,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showNotification('Proje güncellendi');
            closeModal('editProjectModal');
            closeModal('projectDetailModal');
            loadProjects();
        } catch (error) {
            showNotification('Güncelleme hatası', 'error');
        } finally {
            hideLoading();
        }
    });
    
    openModal('editProjectModal');
}

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    showSplashScreen();
    setTimeout(() => {
        checkAuth();
        initializeEventListeners();
        createNotificationCenter();
    }, 500);
});

// Auth Check
function checkAuth() {
    // Session storage kullan (sayfa kapatıldığında temizlenir)
    const userSession = sessionStorage.getItem('currentUser');
    if (userSession) {
        currentUser = JSON.parse(userSession);
        showMainApp();
    } else {
        showLoginScreen();
    }
}

// Show/Hide Screens
function showLoginScreen() {
    loginScreen.style.display = 'flex';
    mainApp.style.display = 'none';
}

function showMainApp() {
    loginScreen.style.display = 'none';
    mainApp.style.display = 'block';
    
    // Kullanıcı avatar yerine ikon ekle
    const userAvatar = document.querySelector('.user-avatar');
    if (userAvatar && userAvatar.tagName === 'IMG') {
        userAvatar.outerHTML = '<div class="user-avatar"><i class="fas fa-user"></i></div>';
    }
    
    document.getElementById('userDisplayName').textContent = currentUser.displayName || currentUser.username;
    
    // Admin panel'i hemen ekle
    if (currentUser && currentUser.role === 'admin') {
        createAdminSection();
    }
    
    loadDashboardData();
    initializeNavigation();
}

// Loading
function showLoading() {
    loadingSpinner.style.display = 'flex';
}

function hideLoading() {
    setTimeout(() => {
        loadingSpinner.style.display = 'none';
    }, 300);
}

// Notification System - DÜZELTME
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    const icon = notification.querySelector('i');
    
    notificationText.textContent = message;
    
    // Önce tüm class'ları temizle
    notification.className = 'notification';
    
    // Tip'e göre ikon değiştir
    if (type === 'error') {
        icon.className = 'fas fa-exclamation-circle';
        notification.classList.add('error');
    } else {
        icon.className = 'fas fa-check-circle';
        notification.classList.add('success');
    }
    
    // Show class'ını ekle
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // 3 saniye sonra kaldır
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Event Listeners
function initializeEventListeners() {
    // Login Form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Mobile Menu Toggle
    const menuToggle = document.querySelector('.menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            const sidebar = document.querySelector('.sidebar');
            sidebar.classList.toggle('active');
            
            // Overlay ekle/kaldır
            let overlay = document.querySelector('.sidebar-overlay');
            if (sidebar.classList.contains('active')) {
                if (!overlay) {
                    overlay = document.createElement('div');
                    overlay.className = 'sidebar-overlay';
                    overlay.style.cssText = `
                        position: fixed;
                        top: 0;
                        left: 0;
                        right: 0;
                        bottom: 0;
                        background: rgba(0, 0, 0, 0.5);
                        z-index: 99;
                        display: block;
                    `;
                    document.body.appendChild(overlay);
                    overlay.addEventListener('click', () => {
                        sidebar.classList.remove('active');
                        overlay.remove();
                    });
                }
            } else {
                if (overlay) overlay.remove();
            }
        });
    }
    
    // Sidebar close button ekle
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && !sidebar.querySelector('.sidebar-close')) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'sidebar-close';
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.style.cssText = `
            display: none;
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.1);
            border: none;
            color: white;
            width: 35px;
            height: 35px;
            border-radius: 50%;
            cursor: pointer;
            z-index: 10;
        `;
        closeBtn.addEventListener('click', () => {
            sidebar.classList.remove('active');
            document.querySelector('.sidebar-overlay')?.remove();
        });
        sidebar.insertBefore(closeBtn, sidebar.firstChild);
    }
    
    // User Profile Dropdown
    const userProfile = document.querySelector('.user-profile');
    if (userProfile) {
    userProfile.style.cursor = 'pointer';
    userProfile.addEventListener('click', (e) => {
        e.stopPropagation();
        
        let dropdown = document.querySelector('.user-dropdown');
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.className = 'user-dropdown';
            dropdown.innerHTML = `
                <div class="dropdown-item" onclick="openProfileModal()">
                    <i class="fas fa-user"></i>
                    <span>Profil</span>
                </div>
                <div class="dropdown-item" onclick="openSettingsModal()">
                    <i class="fas fa-cog"></i>
                    <span>Ayarlar</span>
                </div>
                <div class="dropdown-divider"></div>
                <div class="dropdown-item" onclick="handleLogout()">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>Çıkış Yap</span>
                </div>
            `;
            dropdown.style.cssText = `
                position: absolute;
                top: 100%;
                right: 0;
                background: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                min-width: 180px;
                margin-top: 10px;
                z-index: 1000;
                display: block;
            `;
            userProfile.style.position = 'relative';
            userProfile.appendChild(dropdown);
            
            setTimeout(() => {
                document.addEventListener('click', function closeDropdown() {
                    dropdown.remove();
                    document.removeEventListener('click', closeDropdown);
                });
            }, 10);
        } else {
            dropdown.remove();
        }
    });
}
    // Form submissions
    document.getElementById('paymentForm')?.addEventListener('submit', handlePaymentSubmit);
    document.getElementById('projectForm')?.addEventListener('submit', handleProjectSubmit);
    document.getElementById('taskForm')?.addEventListener('submit', handleTaskSubmit);
    document.getElementById('customerForm')?.addEventListener('submit', handleCustomerSubmit);
    document.getElementById('invoiceForm')?.addEventListener('submit', handleInvoiceSubmit);
    document.getElementById('proposalForm')?.addEventListener('submit', handleProposalSubmit);
}



// Profil Modal (Sade ve temel bilgiler)
window.openProfileModal = function() {
    let modal = document.getElementById('profileModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'profileModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-user"></i> Profil Bilgileri</h2>
                <button class="close-modal" onclick="closeModal('profileModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form id="profileForm" class="modal-form">
                <div class="form-group">
                    <label>Kullanıcı Adı</label>
                    <input type="text" id="profileUsername" value="${currentUser.username}" readonly>
                    <small>Kullanıcı adı değiştirilemez.</small>
                </div>
                <div class="form-group">
                    <label>Görünen Ad</label>
                    <input type="text" id="profileDisplayName" value="${currentUser.displayName || ''}" required>
                </div>
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="profileEmail" value="${currentUser.email || ''}" required>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeModal('profileModal')">İptal</button>
                    <button type="submit" class="btn btn-primary">Kaydet</button>
                </div>
            </form>
        </div>
    `;
    
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading();
        
        try {
            await db.collection('users').doc(currentUser.id).update({
                displayName: document.getElementById('profileDisplayName').value,
                email: document.getElementById('profileEmail').value,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            currentUser.displayName = document.getElementById('profileDisplayName').value;
            currentUser.email = document.getElementById('profileEmail').value;
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            document.getElementById('userDisplayName').textContent = currentUser.displayName || currentUser.username;
            showNotification('Profil güncellendi');
            closeModal('profileModal');
        } catch (error) {
            showNotification('Güncelleme hatası: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    });
    
    openModal('profileModal');
}

// Ayarlar Modal (Şifre değiştirme, tema, bildirim, dil)
window.openSettingsModal = function() {
    let modal = document.getElementById('settingsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'settingsModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2><i class="fas fa-cog"></i> Kullanıcı Ayarları</h2>
                <button class="close-modal" onclick="closeModal('settingsModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form id="settingsForm" class="modal-form">
                <div class="form-group">
                    <label>Şifre Değiştir</label>
                    <input type="password" id="currentPassword" placeholder="Mevcut Şifre" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Yeni Şifre</label>
                        <input type="password" id="newPassword" placeholder="Yeni Şifre" required>
                    </div>
                    <div class="form-group">
                        <label>Yeni Şifre (Tekrar)</label>
                        <input type="password" id="confirmNewPassword" placeholder="Yeni Şifre Tekrar" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Tema</label>
                    <select id="settingsTheme">
                        <option value="light" ${currentUser.preferences?.theme === 'light' ? 'selected' : ''}>Açık</option>
                        <option value="dark" ${currentUser.preferences?.theme === 'dark' ? 'selected' : ''}>Koyu</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Bildirim Tercihi</label>
                    <select id="settingsNotifications">
                        <option value="all" ${currentUser.preferences?.notifications === 'all' ? 'selected' : ''}>Tüm Bildirimler</option>
                        <option value="important" ${currentUser.preferences?.notifications === 'important' ? 'selected' : ''}>Sadece Önemliler</option>
                        <option value="none" ${currentUser.preferences?.notifications === 'none' ? 'selected' : ''}>Hiçbiri</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Dil</label>
                    <select id="settingsLanguage">
                        <option value="tr" ${currentUser.preferences?.language === 'tr' ? 'selected' : ''}>Türkçe</option>
                        <option value="en" ${currentUser.preferences?.language === 'en' ? 'selected' : ''}>English</option>
                    </select>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeModal('settingsModal')">İptal</button>
                    <button type="submit" class="btn btn-primary">Kaydet</button>
                </div>
            </form>
        </div>
    `;
    
    document.getElementById('settingsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading();
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;
        
        try {
            // Şifre doğrulama ve güncelleme
            if (currentPassword || newPassword || confirmNewPassword) {
                if (newPassword !== confirmNewPassword) {
                    showNotification('Yeni şifreler eşleşmiyor', 'error');
                    hideLoading();
                    return;
                }
                
                // Firebase Authentication ile şifre kontrolü
                const user = firebase.auth().currentUser;
                const credential = firebase.auth.EmailAuthProvider.credential(
                    currentUser.email,
                    currentPassword
                );
                
                try {
                    await user.reauthenticateWithCredential(credential);
                    await user.updatePassword(newPassword);
                    
                    // Firestore'da şifre güncelleme (güvenlik için hashed olabilir, ama burada sadece bilgi güncelleniyor)
                    await db.collection('users').doc(currentUser.id).update({
                        password: newPassword, // Not: Gerçek uygulamada şifre hash'lenmeli
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } catch (authError) {
                    showNotification('Mevcut şifre yanlış veya oturum hatası', 'error');
                    hideLoading();
                    return;
                }
            }
            
            // Diğer ayarları güncelle
            const preferences = {
                theme: document.getElementById('settingsTheme').value,
                notifications: document.getElementById('settingsNotifications').value,
                language: document.getElementById('settingsLanguage').value
            };
            
            await db.collection('users').doc(currentUser.id).update({
                preferences,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            currentUser.preferences = preferences;
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Tema uygulamasını güncelle
            if (preferences.theme === 'dark') {
                document.body.classList.add('dark-mode');
            } else {
                document.body.classList.remove('dark-mode');
            }
            
            showNotification('Ayarlar güncellendi');
            closeModal('settingsModal');
        } catch (error) {
            showNotification('Güncelleme hatası: ' + error.message, 'error');
        } finally {
            hideLoading();
        }
    });
    
    openModal('settingsModal');
}


// Login Handler
async function handleLogin(e) {
    e.preventDefault();
    showLoading();
    
    const username = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    try {
        const usersRef = db.collection('users');
        const query = usersRef.where('username', '==', username).where('password', '==', password);
        const snapshot = await query.get();
        
        if (!snapshot.empty) {
            const userData = snapshot.docs[0].data();
            currentUser = {
                id: snapshot.docs[0].id,
                ...userData
            };
            
            // sessionStorage kullan (localStorage yerine)
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            showNotification('Giriş başarılı!');
            showMainApp();
        } else {
            showNotification('Kullanıcı adı veya şifre hatalı!', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Giriş yapılırken bir hata oluştu!', 'error');
    } finally {
        hideLoading();
    }
}


// Sayfa kapatma ve yenileme olaylarını dinle
window.addEventListener('beforeunload', function() {
    // Sayfa kapatılırken session'ı temizle
    sessionStorage.removeItem('currentUser');
});

// Sekme değişimi kontrolü
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Sekme gizlendiğinde session'ı temizle
        sessionStorage.removeItem('currentUser');
    }
});
// Logout Handler
function handleLogout() {
    sessionStorage.removeItem('currentUser');
    currentUser = null;
    showLoginScreen();
    showNotification('Çıkış yapıldı');
}

// Navigation - SMOOTH TRANSITION
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-section]');
    
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Get current and target sections
            const currentSection = document.querySelector('.content-section.active');
            const targetSectionId = item.dataset.section;
            const targetSection = document.getElementById(targetSectionId);
            
            if (!targetSection || currentSection === targetSection) return;
            
            // Update nav items
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Smooth transition
            currentSection.style.opacity = '0.5';
            currentSection.style.pointerEvents = 'none';
            
            setTimeout(() => {
                currentSection.classList.remove('active');
                targetSection.classList.add('active');
                targetSection.style.opacity = '0';
                
                // Update page title
                document.querySelector('.page-title').textContent = item.querySelector('span').textContent;
                
                // Load section data
                loadSectionData(targetSectionId).then(() => {
                    targetSection.style.opacity = '1';
                    currentSection.style.opacity = '1';
                    currentSection.style.pointerEvents = 'auto';
                });
            }, 200);
            
            // Mobile: close sidebar
            if (window.innerWidth <= 768) {
                document.querySelector('.sidebar').classList.remove('active');
                document.querySelector('.sidebar-overlay')?.remove();
            }
        });
    });
}

async function loadSectionData(sectionId) {
    const showLoadingForSection = false;
    
    if (showLoadingForSection) showLoading();
    
    try {
        switch(sectionId) {
            case 'dashboard':
                await loadDashboardData();
                break;
            case 'payments':
                await loadPayments();
                break;
            case 'projects':
                await loadProjects();
                break;
            case 'tasks':
                await loadTasks();
                break;
            case 'customers':
                await loadCustomers();
                break;
            case 'invoices':
                await loadInvoices();
                break;
            case 'reports':
                await loadReports();
                break;
            case 'settings':
                await loadSettings(); // await eklendi
                break;
            case 'admin':
                await loadUsers();
                break;
            case 'proposals':
                await loadProposals();
                break;
        }
    } catch (error) {
        console.error('Section load error:', error);
    } finally {
        if (showLoadingForSection) hideLoading();
    }
}

// Dashboard Data with Chart
async function loadDashboardData() {
    try {
        const [payments, projects, customers, tasks] = await Promise.all([
            db.collection('payments').get(),
            db.collection('projects').get(),
            db.collection('customers').get(),
            db.collection('tasks').get()
        ]);
        
        const totalRevenue = payments.docs.reduce((sum, doc) => {
            const payment = doc.data();
            return payment.status === 'paid' ? sum + (payment.amount || 0) : sum;
        }, 0);
        
        const activeProjects = projects.docs.filter(doc => 
            doc.data().status === 'active'
        ).length;
        
        const completedTasks = tasks.docs.filter(doc => 
            doc.data().status === 'completed'
        ).length;
        
        const totalTasks = tasks.docs.length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        updateDashboardStats({
            revenue: totalRevenue,
            projects: activeProjects,
            customers: customers.docs.length,
            completion: completionRate
        });
        
        loadRecentTransactions();
        
        // Create chart if Chart.js is loaded
        if (typeof Chart !== 'undefined') {
            createDashboardChart(payments.docs);
        }
        
    } catch (error) {
        console.error('Dashboard load error:', error);
        showNotification('Veriler yüklenirken hata oluştu', 'error');
    }
}

// Update Dashboard Stats
function updateDashboardStats(stats) {
    const statCards = document.querySelectorAll('.stat-card');
    
    if (statCards[0]) {
        statCards[0].querySelector('.stat-value').textContent = `₺${stats.revenue.toLocaleString('tr-TR')}`;
    }
    if (statCards[1]) {
        statCards[1].querySelector('.stat-value').textContent = stats.projects;
    }
    if (statCards[2]) {
        statCards[2].querySelector('.stat-value').textContent = stats.customers;
    }
    if (statCards[3]) {
        statCards[3].querySelector('.stat-value').textContent = `${stats.completion}%`;
    }
}

// Dashboard Chart
function createDashboardChart(payments) {
    let canvas = document.getElementById('dashboardChart');
    if (!canvas) {
        const chartContainer = document.createElement('div');
        chartContainer.className = 'chart-container';
        chartContainer.innerHTML = '<canvas id="dashboardChart" style="max-height: 300px;"></canvas>';
        
        const dashboardSection = document.getElementById('dashboard');
        const tableContainer = dashboardSection.querySelector('.data-table-container');
        dashboardSection.insertBefore(chartContainer, tableContainer);
        
        canvas = document.getElementById('dashboardChart');
    }
    
    if (dashboardChart) {
        dashboardChart.destroy();
    }
    
    const monthlyData = getMonthlyRevenueData(payments);
    
    const ctx = canvas.getContext('2d');
    dashboardChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: monthlyData.labels,
            datasets: [{
                label: 'Aylık Gelir',
                data: monthlyData.values,
                backgroundColor: 'rgba(0, 254, 251, 0.6)',
                borderColor: 'rgba(0, 254, 251, 1)',
                borderWidth: 2,
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₺' + value.toLocaleString('tr-TR');
                        }
                    }
                }
            }
        }
    });
}

// Load Recent Transactions
async function loadRecentTransactions() {
    try {
        const snapshot = await db.collection('payments')
            .orderBy('createdAt', 'desc')
            .limit(5)
            .get();
        
        const tbody = document.querySelector('#dashboard .data-table tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Henüz işlem yok</td></tr>';
            return;
        }
        
        snapshot.forEach(doc => {
            const payment = doc.data();
            const row = `
                <tr>
                    <td>#${doc.id.substring(0, 6)}</td>
                    <td>${payment.customer || 'N/A'}</td>
                    <td>${payment.project || 'Genel'}</td>
                    <td>₺${(payment.amount || 0).toLocaleString('tr-TR')}</td>
                    <td><span class="status ${payment.status}">${getStatusText(payment.status)}</span></td>
                    <td>${formatDate(payment.createdAt)}</td>
                    <td>
                        <button class="btn-action" onclick="editPayment('${doc.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action" onclick="deletePayment('${doc.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (error) {
        console.error('Recent transactions error:', error);
    }
}

async function loadPayments() {
    try {
        const snapshot = await db.collection('payments').orderBy('createdAt', 'desc').get();
        const tbody = document.getElementById('paymentsTable');
        
        tbody.innerHTML = '';
        allPayments = [];
        
        snapshot.forEach(doc => {
            const payment = { id: doc.id, ...doc.data() };
            allPayments.push(payment);
            
            const row = `
                <tr>
                    <td>#${payment.id.substring(0, 6)}</td>
                    <td>
                        ${payment.customerName}
                        <br><small style="color: var(--gray-dark);"><i class="fas fa-project-diagram"></i> ${payment.projectName}</small>
                    </td>
                    <td>₺${payment.amount.toLocaleString('tr-TR')}</td>
                    <td>${formatDate(payment.paymentDate)}</td>
                    <td><span class="status paid">Ödendi</span></td>
                    <td>
                        <button class="btn-action" onclick="deletePayment('${payment.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (error) {
        console.error('Load payments error:', error);
        showNotification('Ödemeler yüklenirken hata oluştu', 'error');
    }
}
// Taksit detaylarını göster
window.showInstallmentDetails = function(paymentId) {
    const payment = allPayments.find(p => p.id === paymentId);
    if (!payment || !payment.installments) return;
    
    let modal = document.getElementById('installmentDetailsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'installmentDetailsModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    const totalPaid = payment.installments.filter(inst => inst.status === 'paid').reduce((sum, inst) => sum + inst.amount, 0);
    const totalAmount = payment.installments.reduce((sum, inst) => sum + inst.amount, 0);
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2>Taksit Detayları - ${payment.customer}</h2>
                <button class="close-modal" onclick="closeModal('installmentDetailsModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="padding: 25px;">
                <div style="background: linear-gradient(135deg, rgba(0,254,251,0.1), rgba(0,254,251,0.05)); padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; text-align: center;">
                        <div>
                            <strong>Toplam Tutar</strong>
                            <p style="font-size: 20px; color: var(--primary-color);">₺${totalAmount.toLocaleString('tr-TR')}</p>
                        </div>
                        <div>
                            <strong>Ödenen</strong>
                            <p style="font-size: 20px; color: #10b981;">₺${totalPaid.toLocaleString('tr-TR')}</p>
                        </div>
                        <div>
                            <strong>Kalan</strong>
                            <p style="font-size: 20px; color: #f59e0b;">₺${(totalAmount - totalPaid).toLocaleString('tr-TR')}</p>
                        </div>
                    </div>
                </div>
                
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Taksit No</th>
                            <th>Vade Tarihi</th>
                            <th>Tutar</th>
                            <th>Durum</th>
                            <th>İşlem</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payment.installments.map((inst, index) => `
                            <tr>
                                <td>${index + 1}. Taksit</td>
                                <td>${formatDate(inst.date)}</td>
                                <td>₺${inst.amount.toLocaleString('tr-TR')}</td>
                                <td>
                                    <span class="status ${inst.status === 'paid' ? 'paid' : 'unpaid'}">
                                        ${inst.status === 'paid' ? 'Ödendi' : 'Bekliyor'}
                                    </span>
                                </td>
                                <td>
                                    ${inst.status === 'unpaid' ? 
                                        `<button class="btn btn-sm btn-primary" onclick="markInstallmentAsPaid('${paymentId}', ${index})">
                                            <i class="fas fa-check"></i> Ödendi İşaretle
                                        </button>` : 
                                        `<span style="color: #10b981;"><i class="fas fa-check-circle"></i> ${formatDate(inst.paidDate)}</span>`
                                    }
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    openModal('installmentDetailsModal');
}

async function handlePaymentSubmit(e) {
    e.preventDefault();
    showLoading();
    
    const formData = new FormData(e.target);
    const customerId = formData.get('customerId');
    const projectId = formData.get('projectId');
    
    // Müşteri ve proje bilgilerini al
    const customer = allCustomers.find(c => c.id === customerId);
    const project = allProjects.find(p => p.id === projectId);
    
    if (!customer || !project) {
        showNotification('Müşteri veya proje seçimi geçersiz', 'error');
        hideLoading();
        return;
    }
    
    const payment = {
        customerId: customerId,
        customerName: customer.name,
        projectId: projectId,
        projectName: project.name,
        amount: parseFloat(formData.get('amount')),
        paymentDate: formData.get('paymentDate'),
        description: formData.get('description') || '',
        status: 'paid', // Ödeme yapıldı
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: currentUser.id
    };
    
    try {
        await db.collection('payments').add(payment);
        showNotification('Ödeme başarıyla kaydedildi');
        closeModal('paymentModal');
        e.target.reset();
        loadPayments();
    } catch (error) {
        console.error('Payment add error:', error);
        showNotification('Ödeme kaydedilirken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}

async function updatePaymentModal() {
    const paymentModal = document.getElementById('paymentModal');
    if (!paymentModal) return;
    
    const form = paymentModal.querySelector('form');
    
    // Eğer zaten eklenmiş dropdown varsa, tekrar ekleme
    if (form.querySelector('select[name="customerId"]')) return;
    
    // Müşterileri ve projeleri yükle
    await Promise.all([loadCustomers(), loadProjects()]);
    
    // Formu yeniden oluştur
    form.innerHTML = `
        <div class="form-group">
            <label>Müşteri Seç *</label>
            <select name="customerId" id="paymentCustomerSelect" onchange="updatePaymentProjects(this.value)" required>
                <option value="">Müşteri Seçin</option>
                ${allCustomers.map(customer => 
                    `<option value="${customer.id}" data-name="${customer.name}">${customer.name} - ${customer.company}</option>`
                ).join('')}
            </select>
        </div>
        
        <div class="form-group" id="paymentProjectContainer" style="display: none;">
            <label>Proje Seç *</label>
            <select name="projectId" id="paymentProjectSelect" required>
                <option value="">Önce müşteri seçin</option>
            </select>
        </div>
        
        <div class="form-row">
            <div class="form-group">
                <label>Ödeme Tarihi *</label>
                <input type="date" name="paymentDate" required>
            </div>
            <div class="form-group">
                <label>Ödeme Tutarı *</label>
                <input type="number" name="amount" step="0.01" placeholder="0.00" required>
            </div>
        </div>
        
        <div class="form-group">
            <label>Açıklama</label>
            <textarea name="description" placeholder="Ödeme ile ilgili not..."></textarea>
        </div>
        
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="closeModal('paymentModal')">İptal</button>
            <button type="submit" class="btn btn-primary">Ödeme Kaydet</button>
        </div>
    `;
}

// Müşteri seçilince projeleri yükle
window.updatePaymentProjects = function(customerId) {
    const projectContainer = document.getElementById('paymentProjectContainer');
    const projectSelect = document.getElementById('paymentProjectSelect');
    
    if (!customerId) {
        projectContainer.style.display = 'none';
        projectSelect.innerHTML = '<option value="">Önce müşteri seçin</option>';
        return;
    }
    
    // Seçilen müşteriye ait projeleri filtrele
    const customerProjects = allProjects.filter(project => 
        project.customerId === customerId
    );
    
    if (customerProjects.length > 0) {
        projectSelect.innerHTML = `
            <option value="">Proje Seçin</option>
            ${customerProjects.map(project => 
                `<option value="${project.id}" data-name="${project.name}">
                    ${project.name} (Bütçe: ₺${(project.currentBudget || project.budget || 0).toLocaleString('tr-TR')})
                </option>`
            ).join('')}
        `;
        projectContainer.style.display = 'block';
    } else {
        projectSelect.innerHTML = '<option value="">Bu müşterinin projesi yok</option>';
        projectContainer.style.display = 'block';
    }
}


// Müşteri seçilince projeleri yükle
window.updateCustomerNameAndProjects = function(select) {
    const customerId = select.value;
    const customerName = select.selectedOptions[0]?.dataset.name || '';
    
    // Müşteri adını input'a yaz
    const customerInput = document.querySelector('#paymentModal input[name="customer"]');
    if (customerInput) {
        customerInput.value = customerName;
    }
    
    // Proje container'ı al
    const projectContainer = document.getElementById('paymentProjectContainer');
    const projectSelect = document.getElementById('paymentProjectSelect');
    
    if (!customerId) {
        // Müşteri seçilmediyse projeleri gizle
        projectContainer.style.display = 'none';
        projectSelect.innerHTML = '<option value="">Proje Seçin (Opsiyonel)</option>';
        return;
    }
    
    // Seçilen müşteriye ait projeleri filtrele
    const customerProjects = allProjects.filter(project => 
        project.customerId === customerId || 
        project.client === customerName
    );
    
    if (customerProjects.length > 0) {
        // Projeleri dropdown'a ekle
        projectSelect.innerHTML = `
            <option value="">Proje Seçin (Opsiyonel)</option>
            ${customerProjects.map(project => 
                `<option value="${project.id}" data-name="${project.name}">
                    ${project.name} - ₺${(project.budget || 0).toLocaleString('tr-TR')}
                </option>`
            ).join('')}
        `;
        projectContainer.style.display = 'block';
    } else {
        // Proje yoksa gizle
        projectContainer.style.display = 'none';
        projectSelect.innerHTML = '<option value="">Proje Seçin (Opsiyonel)</option>';
    }
}

// Müşteri adını güncelle
window.updateCustomerName = function(select) {
    const customerName = select.selectedOptions[0]?.dataset.name || '';
    const customerInput = document.querySelector('#paymentModal input[name="customer"]');
    if (customerInput) {
        customerInput.value = customerName;
        customerInput.readOnly = select.value !== '';
    }
}

window.generateInstallmentFields = function(count) {
    const container = document.getElementById('installmentFields');
    if (!container) return;
    
    container.innerHTML = '';
    
    const amountInput = document.querySelector('#paymentModal input[name="amount"]');
    
    if (count == 0) {
        // Tek ödeme - tutar alanını göster
        if (amountInput && amountInput.parentElement) {
            amountInput.parentElement.style.display = 'block';
        }
        return;
    }
    
    // Taksitli ödeme - tutar alanını gizle ama değeri koru
    if (amountInput) {
        amountInput.parentElement.style.display = 'none';
    }
    
    const installmentCount = parseInt(count);
    const totalAmount = parseFloat(amountInput?.value || 0);
    const installmentAmount = totalAmount > 0 ? (totalAmount / installmentCount).toFixed(2) : '';
    
    let fieldsHTML = '<div style="border: 1px solid var(--gray-light); padding: 15px; border-radius: 8px; margin-top: 15px;">';
    fieldsHTML += '<h4 style="margin-bottom: 15px;">Taksit Detayları</h4>';
    
    // Toplam tutarı göster
    if (totalAmount > 0) {
        fieldsHTML += `
            <div style="background: rgba(0,254,251,0.1); padding: 10px; border-radius: 6px; margin-bottom: 15px; text-align: center;">
                <strong>Toplam Tutar: ₺${totalAmount.toLocaleString('tr-TR')}</strong>
            </div>
        `;
    }
    
    for (let i = 1; i <= installmentCount; i++) {
        const defaultDate = new Date();
        defaultDate.setMonth(defaultDate.getMonth() + (i - 1));
        const dateStr = defaultDate.toISOString().split('T')[0];
        
        fieldsHTML += `
            <div class="form-row" style="margin-bottom: 10px;">
                <div class="form-group">
                    <label>${i}. Taksit Tarihi</label>
                    <input type="date" name="installmentDate[]" value="${dateStr}" required>
                </div>
                <div class="form-group">
                    <label>${i}. Taksit Tutarı</label>
                    <input type="number" name="installmentAmount[]" value="${installmentAmount}" step="0.01" required 
                           oninput="updateTotalFromInstallments()">
                </div>
            </div>
        `;
    }
    
    fieldsHTML += '</div>';
    container.innerHTML = fieldsHTML;
}

// Taksit tutarları değiştiğinde toplam tutarı güncelle
window.updateTotalFromInstallments = function() {
    const installmentAmounts = document.querySelectorAll('input[name="installmentAmount[]"]');
    let total = 0;
    
    installmentAmounts.forEach(input => {
        const value = parseFloat(input.value) || 0;
        total += value;
    });
    
    const amountInput = document.querySelector('#paymentModal input[name="amount"]');
    if (amountInput) {
        amountInput.value = total.toFixed(2);
    }
}

window.togglePaymentStatus = async function(paymentId) {
    const payment = allPayments.find(p => p.id === paymentId);
    if (!payment) return;
    
    const newStatus = payment.status === 'paid' ? 'unpaid' : 'paid';
    
    try {
        await db.collection('payments').doc(paymentId).update({
            status: newStatus,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showNotification('Ödeme durumu güncellendi');
        loadPayments();
    } catch (error) {
        console.error('Toggle payment status error:', error);
        showNotification('Durum güncellenirken hata oluştu', 'error');
    }
}

window.deletePayment = async function(paymentId) {
    if (!confirm('Bu ödemeyi silmek istediğinizden emin misiniz?')) return;
    
    showLoading();
    try {
        await db.collection('payments').doc(paymentId).delete();
        showNotification('Ödeme silindi');
        loadPayments();
    } catch (error) {
        console.error('Delete payment error:', error);
        showNotification('Ödeme silinirken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}

// Projects Management
async function loadProjects() {
    try {
        const snapshot = await db.collection('projects').orderBy('createdAt', 'desc').get();
        const container = document.querySelector('.project-cards');
        
        container.innerHTML = '';
        allProjects = [];
        
        snapshot.forEach(doc => {
            const project = { id: doc.id, ...doc.data() };
            allProjects.push(project);
            
            const progress = project.progress || 0;
            const card = `
                <div class="project-card" style="position: relative;">
                    <div onclick="showProjectDetails('${project.id}')" style="cursor: pointer;">
                        <div class="project-header">
                            <h3>${project.name}</h3>
                            <span class="status ${project.status}">${getStatusText(project.status)}</span>
                        </div>
                        <p class="project-client">
                            <i class="fas fa-user"></i> ${project.client}
                        </p>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <p class="progress-text">${progress}% tamamlandı</p>
                        <div class="project-footer">
                            <span><i class="fas fa-calendar"></i> ${formatDate(project.startDate)}</span>
                            <span><i class="fas fa-money-bill"></i> ₺${(project.budget || 0).toLocaleString('tr-TR')}</span>
                        </div>
                    </div>
                    <div style="position: absolute; top: 10px; right: 10px; display: flex; gap: 5px;">
                        <button class="btn-action" onclick="event.stopPropagation(); editProject('${project.id}')" title="Düzenle">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action" onclick="event.stopPropagation(); deleteProject('${project.id}')" title="Sil" style="background: #ef4444;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            container.innerHTML += card;
        });
    } catch (error) {
        console.error('Load projects error:', error);
        showNotification('Projeler yüklenirken hata oluştu', 'error');
    }
}

window.deleteProject = async function(projectId) {
    if (!confirm('Bu projeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return;
    
    showLoading();
    try {
        await db.collection('projects').doc(projectId).delete();
        showNotification('Proje başarıyla silindi');
        loadProjects();
    } catch (error) {
        console.error('Delete project error:', error);
        showNotification('Proje silinirken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}


async function handleProjectSubmit(e) {
    e.preventDefault();
    showLoading();
    
    const formData = new FormData(e.target);
    const project = {
        name: formData.get('name'),
        client: formData.get('client'),
        customerId: formData.get('customerId') || null, // Müşteri ID'sini kaydet
        startDate: formData.get('startDate'),
        endDate: formData.get('endDate'),
        budget: parseFloat(formData.get('budget')),
        currentBudget: parseFloat(formData.get('budget')), // Başlangıç bütçesi
        status: 'active',
        progress: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: currentUser.id
    };
    
    try {
        await db.collection('projects').add(project);
        showNotification('Proje başarıyla eklendi');
        closeModal('projectModal');
        e.target.reset();
        loadProjects();
    } catch (error) {
        console.error('Project add error:', error);
        showNotification('Proje eklenirken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}

window.addEventListener('DOMContentLoaded', function() {
    const originalOpenModal = window.openModal;
    
    window.openModal = async function(modalId) {
        originalOpenModal(modalId);
        
        // Modal açıldığında ilgili güncelleme fonksiyonunu çağır
        // await kullanarak verilerin yüklenmesini bekle
        if (modalId === 'projectModal') {
            await updateProjectModal();
        } else if (modalId === 'taskModal') {
            await updateTaskModal();
        } else if (modalId === 'paymentModal') {
            await updatePaymentModal();
        } else if (modalId === 'invoiceModal') {
            await updateInvoiceModal();
        }
    };
});
async function updateProjectModal() {
    const projectModal = document.getElementById('projectModal');
    if (!projectModal) return;
    
    const form = projectModal.querySelector('form');
    const clientInput = form.querySelector('input[name="client"]');
    
    // Eğer zaten eklenmişse tekrar ekleme
    if (form.querySelector('select[name="customerId"]')) return;
    
    // Önce müşterileri yükle (anlık veri için)
    await loadCustomers();
    
    const customerSelect = document.createElement('div');
    customerSelect.className = 'form-group';
    customerSelect.innerHTML = `
        <label>Müşteri Seç</label>
        <select name="customerId" onchange="updateProjectClientName(this)">
            <option value="">Müşteri Seçin veya Manuel Girin</option>
            ${allCustomers.map(customer => 
                `<option value="${customer.id}" data-name="${customer.name}">${customer.name} - ${customer.company}</option>`
            ).join('')}
        </select>
    `;
    
    clientInput.parentElement.before(customerSelect);
}

// Proje için müşteri adını güncelle
window.updateProjectClientName = function(select) {
    const clientName = select.selectedOptions[0]?.dataset.name || '';
    const clientInput = document.querySelector('#projectModal input[name="client"]');
    if (clientInput) {
        clientInput.value = clientName;
        clientInput.readOnly = select.value !== '';
    }
}

// Tasks Management - 3 Durum + Tamamlananlar Ayrı
async function loadTasks() {
    try {
        const snapshot = await db.collection('tasks')
            .orderBy('createdAt', 'desc')
            .get();
        
        const columns = {
            todo: document.querySelector('.kanban-column:nth-child(1)'),
            inprogress: document.querySelector('.kanban-column:nth-child(2)'),
            testing: document.querySelector('.kanban-column:nth-child(3)')
        };
        
        Object.values(columns).forEach(col => {
            if (col) {
                const title = col.querySelector('h3');
                col.innerHTML = '';
                col.appendChild(title);
            }
        });
        
        allTasks = [];
        
        snapshot.forEach(doc => {
            const task = { id: doc.id, ...doc.data() };
            
            // Tamamlanmış görevleri gösterme
            if (task.status === 'completed') {
                return;
            }
            
            allTasks.push(task);
            
            const taskCard = `
                <div class="task-card" draggable="true" data-task-id="${task.id}">
                    <div onclick="showTaskDetails('${task.id}')" style="cursor: pointer;">
                        <h4>${task.title}</h4>
                        <p>${task.description || 'Açıklama yok'}</p>
                        ${task.projectName ? `<p style="font-size: 11px; color: #64748b;"><i class="fas fa-project-diagram"></i> ${task.projectName}</p>` : ''}
                        <div class="task-meta">
                            <span class="priority ${task.priority}">${getPriorityText(task.priority)}</span>
                            <span class="assignee">${getInitials(task.assignee)}</span>
                        </div>
                    </div>
                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0; display: flex; gap: 5px;">
                        ${task.status === 'testing' && (currentUser.role === 'admin' || currentUser.role === 'manager') ? `
                            <button class="btn btn-sm" style="flex: 1; padding: 6px; font-size: 12px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer;" 
                                    onclick="event.stopPropagation(); completeTask('${task.id}')">
                                <i class="fas fa-check-double"></i> Onayla
                            </button>
                        ` : ''}
                        <button class="btn-action" onclick="event.stopPropagation(); deleteTask('${task.id}')" 
                                style="background: #ef4444; color: white;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
            
            if (columns[task.status]) {
                columns[task.status].innerHTML += taskCard;
            }
        });
        
        initializeDragAndDrop();
        
    } catch (error) {
        console.error('Load tasks error:', error);
        showNotification('Görevler yüklenirken hata oluştu', 'error');
    }
}
// Geliştirilmiş Görev Detay Modal
window.showTaskDetails = function(taskId) {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;
    
    let modal = document.getElementById('taskDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'taskDetailModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    // Admin veya manager kontrolü
    const canComplete = (currentUser.role === 'admin' || currentUser.role === 'manager') && task.status === 'testing';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header" style="background: linear-gradient(135deg, var(--primary-color), rgba(23,45,76,0.9));">
                <h2 style="color: white;"><i class="fas fa-tasks"></i> Görev Detayları</h2>
                <button class="close-modal" style="color: white;" onclick="closeModal('taskDetailModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="padding: 30px;">
                <div id="taskDetailView">
                    <div style="background: var(--gray-light); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                        <h3 style="color: var(--primary-color); margin-bottom: 20px; font-size: 24px;">
                            ${task.title}
                        </h3>
                        
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                            <div style="background: white; padding: 15px; border-radius: 8px;">
                                <label style="color: var(--gray-dark); font-size: 12px;">Atanan Kişi</label>
                                <p style="margin: 5px 0; font-weight: 600;">${task.assignee}</p>
                            </div>
                            
                            <div style="background: white; padding: 15px; border-radius: 8px;">
                                <label style="color: var(--gray-dark); font-size: 12px;">Öncelik</label>
                                <p style="margin: 5px 0;">
                                    <span class="priority ${task.priority}">${getPriorityText(task.priority)}</span>
                                </p>
                            </div>
                            
                            <div style="background: white; padding: 15px; border-radius: 8px;">
                                <label style="color: var(--gray-dark); font-size: 12px;">Durum</label>
                                <p style="margin: 5px 0;">
                                    <span class="status ${task.status}">${getStatusText(task.status)}</span>
                                </p>
                            </div>
                            
                            <div style="background: white; padding: 15px; border-radius: 8px;">
                                <label style="color: var(--gray-dark); font-size: 12px;">Oluşturma Tarihi</label>
                                <p style="margin: 5px 0; font-weight: 600;">${formatDate(task.createdAt)}</p>
                            </div>
                        </div>
                        
                        ${task.projectName ? `
                            <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 20px;">
                                <label style="color: var(--gray-dark); font-size: 12px;">Bağlı Proje</label>
                                <p style="margin: 5px 0; font-weight: 600;">
                                    <i class="fas fa-project-diagram"></i> ${task.projectName}
                                </p>
                            </div>
                        ` : ''}
                        
                        <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 20px;">
                            <label style="color: var(--gray-dark); font-size: 12px;">Açıklama</label>
                            <p style="margin: 10px 0; line-height: 1.6;">
                                ${task.description || 'Açıklama bulunmuyor'}
                            </p>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                        ${canComplete ? `
                            <button class="btn" style="background: #10b981; color: white;" onclick="completeTask('${task.id}')">
                                <i class="fas fa-check-double"></i> Tamamlandı Onayla
                            </button>
                        ` : ''}
                        <button class="btn btn-primary" onclick="toggleTaskEdit('${task.id}')">
                            <i class="fas fa-edit"></i> Düzenle
                        </button>
                        <button class="btn btn-secondary" onclick="closeModal('taskDetailModal')">
                            <i class="fas fa-times"></i> Kapat
                        </button>
                    </div>
                </div>
                
                <div id="taskEditView" style="display: none;"></div>
            </div>
        </div>
    `;
    
    openModal('taskDetailModal');
}

async function handleTaskSubmit(e) {
    e.preventDefault();
    showLoading();
    
    const formData = new FormData(e.target);
    const task = {
        title: formData.get('title'),
        assignee: formData.get('assignee'),
        priority: formData.get('priority'),
        description: formData.get('description'),
        projectId: formData.get('projectId') || null,
        projectName: formData.get('projectId') ? 
            allProjects.find(p => p.id === formData.get('projectId'))?.name || 'Bilinmeyen Proje' : null,
        status: 'todo',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: currentUser.id
    };
    
    try {
        await db.collection('tasks').add(task);
        showNotification('Görev başarıyla eklendi');
        closeModal('taskModal');
        e.target.reset();
        loadTasks();
    } catch (error) {
        console.error('Task add error:', error);
        showNotification('Görev eklenirken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}

async function updateTaskModal() {
    const taskModal = document.getElementById('taskModal');
    if (!taskModal) return;
    
    const form = taskModal.querySelector('form');
    
    // Eğer zaten eklenmişse tekrar ekleme
    if (form.querySelector('select[name="projectId"]') && form.querySelector('select[name="assignee"]')) return;
    
    // Paralel olarak hem projeleri hem kullanıcıları yükle
    await Promise.all([loadProjects(), loadUsers()]);
    
    // Proje dropdown'ı ekle
    if (!form.querySelector('select[name="projectId"]')) {
        const projectSelect = document.createElement('div');
        projectSelect.className = 'form-group';
        projectSelect.innerHTML = `
            <label>Proje</label>
            <select name="projectId">
                <option value="">Proje Seçin (Opsiyonel)</option>
                ${allProjects.map(project => 
                    `<option value="${project.id}">${project.name} - ${project.client}</option>`
                ).join('')}
            </select>
        `;
        
        const priorityGroup = form.querySelector('select[name="priority"]').closest('.form-group');
        priorityGroup.insertAdjacentHTML('afterend', projectSelect.outerHTML);
    }
    
    // Atanan kişi dropdown'ı ekle (mevcut input'u değiştir)
    const assigneeInput = form.querySelector('input[name="assignee"]');
    if (assigneeInput && !form.querySelector('select[name="assignee"]')) {
        const assigneeSelect = document.createElement('select');
        assigneeSelect.name = 'assignee';
        assigneeSelect.required = true;
        assigneeSelect.innerHTML = `
            <option value="">Kullanıcı Seçin</option>
            ${allUsers.map(user => 
                `<option value="${user.displayName || user.username}">${user.displayName || user.username} (${user.role})</option>`
            ).join('')}
        `;
        
        // Mevcut input'u select ile değiştir
        assigneeInput.replaceWith(assigneeSelect);
    }
}
function initializeDragAndDrop() {
    const cards = document.querySelectorAll('.task-card');
    const columns = document.querySelectorAll('.kanban-column');
    
    cards.forEach(card => {
        card.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('taskId', e.target.dataset.taskId);
            e.target.classList.add('dragging');
        });
        
        card.addEventListener('dragend', (e) => {
            e.target.classList.remove('dragging');
        });
    });
    
    columns.forEach(column => {
        column.addEventListener('dragover', (e) => {
            e.preventDefault();
            column.classList.add('drag-over');
        });
        
        column.addEventListener('dragleave', () => {
            column.classList.remove('drag-over');
        });
        
        column.addEventListener('drop', async (e) => {
            e.preventDefault();
            column.classList.remove('drag-over');
            
            const taskId = e.dataTransfer.getData('taskId');
            const columnTitle = column.querySelector('h3').textContent;
            
            let newStatus;
            if (columnTitle === 'Yapılacak') newStatus = 'todo';
            else if (columnTitle === 'Devam Eden') newStatus = 'inprogress';
            else if (columnTitle === 'Test Bekleyen') newStatus = 'testing';
            
            if (!newStatus) return;
            
            try {
                await db.collection('tasks').doc(taskId).update({
                    status: newStatus,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                loadTasks();
            } catch (error) {
                console.error('Task update error:', error);
                showNotification('Görev güncellenirken hata oluştu', 'error');
            }
        });
    });
}



// Tamamlanan Görevler Sayfasını Göster
window.showCompletedTasksPage = function() {
    // Ana navigation'ı güncelle
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    
    // Tüm section'ları gizle
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Page title'ı güncelle
    document.querySelector('.page-title').textContent = 'Tamamlanan Görevler';
    
    // Dinamik section oluştur veya göster
    let completedSection = document.getElementById('completed-tasks-dynamic');
    if (!completedSection) {
        completedSection = document.createElement('section');
        completedSection.id = 'completed-tasks-dynamic';
        completedSection.className = 'content-section';
        document.querySelector('.main-content').appendChild(completedSection);
    }
    
    completedSection.classList.add('active');
    
    // İçeriği yükle
    loadCompletedTasksPage();
}

async function loadCompletedTasksPage() {
    const section = document.getElementById('completed-tasks-dynamic');
    
    // Loading göster
    section.innerHTML = `
        <div style="text-align: center; padding: 50px;">
            <div class="spinner"></div>
            <p>Yükleniyor...</p>
        </div>
    `;
    
    try {
        // Önce kullanıcıları yükle
        await loadUsers();
        
        const snapshot = await db.collection('tasks')
            .where('status', '==', 'completed')
            .get();
        
        // Görevleri array'e al ve sırala
        const tasks = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            tasks.push({ 
                id: doc.id, 
                ...data,
                completedAtDate: data.completedAt ? 
                    (data.completedAt.toDate ? data.completedAt.toDate() : new Date(data.completedAt)) 
                    : new Date(0)
            });
        });
        
        // Tarihe göre sırala (en yeni en başta)
        tasks.sort((a, b) => b.completedAtDate - a.completedAtDate);
        
        // Benzersiz proje listesi
        const uniqueProjects = [...new Set(tasks.map(t => t.projectName).filter(Boolean))];
        
        // Sayfa içeriğini oluştur
        section.innerHTML = `
            <div class="section-header">
                <h2><i class="fas fa-check-circle"></i> Tamamlanan Görevler</h2>
                <div style="display: flex; gap: 10px;">
                    <button class="btn btn-secondary" onclick="clearCompletedFilters()">
                        <i class="fas fa-times"></i> Filtreleri Temizle
                    </button>
                    <button class="btn btn-primary" onclick="exportCompletedTasks()">
                        <i class="fas fa-download"></i> Excel İndir
                    </button>
                </div>
            </div>
            
            <div class="stats-container" style="margin-bottom: 30px;">
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #10b981, #059669);">
                        <i class="fas fa-check-double"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Toplam Tamamlanan</h3>
                        <p class="stat-value">${tasks.length}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #3b82f6, #2563eb);">
                        <i class="fas fa-calendar-check"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Bu Ay Tamamlanan</h3>
                        <p class="stat-value">${getThisMonthCount(tasks)}</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon" style="background: linear-gradient(135deg, #f59e0b, #d97706);">
                        <i class="fas fa-project-diagram"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Aktif Projeler</h3>
                        <p class="stat-value">${uniqueProjects.length}</p>
                    </div>
                </div>
            </div>
            
            <div class="filter-bar" style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 20px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: var(--gray-dark);">
                            <i class="fas fa-search"></i> Görev Ara
                        </label>
                        <input type="text" id="searchCompletedTask" placeholder="Görev başlığı..." 
                               oninput="filterCompletedTasks()" 
                               style="width: 100%; padding: 10px 15px; border: 1px solid #e2e8f0; border-radius: 6px;">
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: var(--gray-dark);">
                            <i class="fas fa-calendar"></i> Tarih
                        </label>
                        <input type="date" id="filterCompletedDate" 
                               onchange="filterCompletedTasks()" 
                               style="width: 100%; padding: 10px 15px; border: 1px solid #e2e8f0; border-radius: 6px;">
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: var(--gray-dark);">
                            <i class="fas fa-folder"></i> Proje Ara
                        </label>
                        <input type="text" id="filterCompletedProject" 
                               placeholder="Proje adı yazın..." 
                               oninput="filterCompletedTasks()"
                               style="width: 100%; padding: 10px 15px; border: 1px solid #e2e8f0; border-radius: 6px;">
                    </div>
                    
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 500; color: var(--gray-dark);">
                            <i class="fas fa-user"></i> Atanan Kişi
                        </label>
                        <select id="filterCompletedAssignee" 
                                onchange="filterCompletedTasks()" 
                                style="width: 100%; padding: 10px 15px; border: 1px solid #e2e8f0; border-radius: 6px;">
                            <option value="">Tüm Kullanıcılar</option>
                            ${allUsers.map(user => 
                                `<option value="${user.displayName || user.username}">${user.displayName || user.username} (${user.role})</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
            </div>
            
            <div class="data-table-container">
                ${tasks.length === 0 ? `
                    <div style="text-align: center; padding: 60px 20px; color: var(--gray-dark);">
                        <i class="fas fa-inbox" style="font-size: 64px; color: var(--gray-medium); margin-bottom: 20px; display: block;"></i>
                        <h3 style="margin-bottom: 10px;">Henüz tamamlanmış görev yok</h3>
                        <p>Görevler tamamlandığında burada görünecek.</p>
                    </div>
                ` : `
                    <table class="data-table" id="completedTasksTable">
                        <thead>
                            <tr>
                                <th style="width: 30%;">Görev</th>
                                <th style="width: 15%;">Atanan</th>
                                <th style="width: 15%;">Proje</th>
                                <th style="width: 10%;">Öncelik</th>
                                <th style="width: 12%;">Tamamlanma</th>
                                <th style="width: 13%;">Onaylayan</th>
                                <th style="width: 5%; text-align: center;">İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${tasks.map(task => `
                                <tr class="completed-task-row" 
                                    data-task-id="${task.id}" 
                                    data-title="${(task.title || '').toLowerCase()}"
                                    data-project="${(task.projectName || '').toLowerCase()}" 
                                    data-assignee="${task.assignee || ''}"
                                    data-date="${formatDate(task.completedAt)}">
                                    <td>
                                        <strong style="color: var(--primary-color); cursor: pointer;" 
                                                onclick="viewCompletedTaskDetail('${task.id}')">
                                            ${task.title}
                                        </strong>
                                        ${task.description ? `<br><small style="color: var(--gray-dark);">${task.description.substring(0, 50)}${task.description.length > 50 ? '...' : ''}</small>` : ''}
                                    </td>
                                    <td>
                                        <div style="display: flex; align-items: center; gap: 8px;">
                                            <span class="assignee" style="font-size: 12px;">${getInitials(task.assignee)}</span>
                                            ${task.assignee}
                                        </div>
                                    </td>
                                    <td>${task.projectName ? `<i class="fas fa-project-diagram"></i> ${task.projectName}` : '-'}</td>
                                    <td><span class="priority ${task.priority}">${getPriorityText(task.priority)}</span></td>
                                    <td><i class="fas fa-calendar-check"></i> ${formatDate(task.completedAt)}</td>
                                    <td><i class="fas fa-user-check"></i> ${task.completedBy || '-'}</td>
                                    <td style="text-align: center;">
                                        <button class="btn-action" onclick="viewCompletedTaskDetail('${task.id}')" title="Detay">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        <button class="btn-action" onclick="deleteCompletedTask('${task.id}')" title="Sil" style="background: #ef4444; color: white;">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    
                    <div style="margin-top: 20px; padding: 15px; background: var(--gray-light); border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <span>Toplam <strong id="visibleTaskCount">${tasks.length}</strong> görev gösteriliyor</span>
                        <button class="btn btn-secondary" onclick="printCompletedTasks()">
                            <i class="fas fa-print"></i> Yazdır
                        </button>
                    </div>
                `}
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading completed tasks:', error);
        section.innerHTML = `
            <div style="text-align: center; padding: 50px; color: var(--danger);">
                <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 20px;"></i>
                <h3>Görevler yüklenirken hata oluştu</h3>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="loadCompletedTasksPage()">
                    <i class="fas fa-redo"></i> Tekrar Dene
                </button>
            </div>
        `;
    }
}

// Bu ay tamamlanan görev sayısı
function getThisMonthCount(tasks) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return tasks.filter(task => {
        const taskDate = task.completedAtDate;
        return taskDate.getMonth() === currentMonth && taskDate.getFullYear() === currentYear;
    }).length;
}

window.filterCompletedTasks = function() {
    const searchText = document.getElementById('searchCompletedTask')?.value.toLowerCase() || '';
    const filterDate = document.getElementById('filterCompletedDate')?.value || '';
    const filterProject = document.getElementById('filterCompletedProject')?.value.toLowerCase() || '';
    const filterAssignee = document.getElementById('filterCompletedAssignee')?.value || '';
    
    const rows = document.querySelectorAll('.completed-task-row');
    let visibleCount = 0;
    
    rows.forEach(row => {
        const title = row.dataset.title;
        const date = row.dataset.date;
        const project = row.dataset.project;
        const assignee = row.dataset.assignee;
        
        let show = true;
        
        // Görev başlığı filtresi
        if (searchText && !title.includes(searchText)) show = false;
        
        // Tarih filtresi
        if (filterDate && date !== formatDate(new Date(filterDate))) show = false;
        
        // Proje filtresi - elle yazılanı içeriyorsa göster
        if (filterProject && !project.includes(filterProject)) show = false;
        
        // Atanan kişi filtresi
        if (filterAssignee && assignee !== filterAssignee) show = false;
        
        row.style.display = show ? '' : 'none';
        if (show) visibleCount++;
    });
    
    const countElement = document.getElementById('visibleTaskCount');
    if (countElement) {
        countElement.textContent = visibleCount;
    }
}

// Filtreleri temizle
window.clearCompletedFilters = function() {
    document.getElementById('searchCompletedTask').value = '';
    document.getElementById('filterCompletedDate').value = '';
    document.getElementById('filterCompletedProject').value = '';
    document.getElementById('filterCompletedAssignee').value = '';
    filterCompletedTasks();
    showNotification('Filtreler temizlendi');
}

// Tamamlanmış görev detayını göster
window.viewCompletedTaskDetail = async function(taskId) {
    showLoading();
    try {
        const doc = await db.collection('tasks').doc(taskId).get();
        const task = { id: doc.id, ...doc.data() };
        
        let modal = document.getElementById('completedTaskDetailModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'completedTaskDetailModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header" style="background: linear-gradient(135deg, #10b981, #059669); color: white;">
                    <h2><i class="fas fa-check-double"></i> Tamamlanmış Görev</h2>
                    <button class="close-modal" style="color: white;" onclick="closeModal('completedTaskDetailModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body" style="padding: 30px;">
                    <h3 style="color: var(--primary-color); margin-bottom: 20px; font-size: 24px;">${task.title}</h3>
                    
                    <div style="display: grid; gap: 15px;">
                        <div style="background: var(--gray-light); padding: 20px; border-radius: 8px;">
                            <strong style="color: var(--gray-dark);">Açıklama:</strong>
                            <p style="margin-top: 10px; line-height: 1.6;">${task.description || 'Açıklama yok'}</p>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                            <div style="background: var(--gray-light); padding: 15px; border-radius: 8px;">
                                <strong style="color: var(--gray-dark);">Atanan Kişi:</strong>
                                <p style="margin-top: 5px; font-weight: 600;">${task.assignee}</p>
                            </div>
                            <div style="background: var(--gray-light); padding: 15px; border-radius: 8px;">
                                <strong style="color: var(--gray-dark);">Öncelik:</strong>
                                <p style="margin-top: 5px;"><span class="priority ${task.priority}">${getPriorityText(task.priority)}</span></p>
                            </div>
                        </div>
                        
                        ${task.projectName ? `
                            <div style="background: var(--gray-light); padding: 15px; border-radius: 8px;">
                                <strong style="color: var(--gray-dark);">Proje:</strong>
                                <p style="margin-top: 5px; font-weight: 600;">
                                    <i class="fas fa-project-diagram"></i> ${task.projectName}
                                </p>
                            </div>
                        ` : ''}
                        
                        <div style="background: linear-gradient(135deg, #d1fae5, #a7f3d0); padding: 20px; border-radius: 8px; border-left: 4px solid #10b981;">
                            <strong style="color: #065f46;"><i class="fas fa-check-circle"></i> Tamamlanma Bilgileri</strong>
                            <div style="margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                <div>
                                    <p style="color: #065f46; margin: 5px 0;">
                                        <i class="fas fa-calendar-check"></i> Tarih: 
                                        <strong>${formatDate(task.completedAt)}</strong>
                                    </p>
                                </div>
                                <div>
                                    <p style="color: #065f46; margin: 5px 0;">
                                        <i class="fas fa-user-check"></i> Onaylayan: 
                                        <strong>${task.completedBy || 'Bilinmiyor'}</strong>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px;">
                        <button class="btn btn-secondary" onclick="closeModal('completedTaskDetailModal')">
                            <i class="fas fa-times"></i> Kapat
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        openModal('completedTaskDetailModal');
    } catch (error) {
        console.error('Error loading task:', error);
        showNotification('Görev yüklenirken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}

// Tamamlanmış görevi sil
window.deleteCompletedTask = async function(taskId) {
    if (!confirm('Bu tamamlanmış görevi kalıcı olarak silmek istediğinizden emin misiniz?')) return;
    
    showLoading();
    try {
        await db.collection('tasks').doc(taskId).delete();
        showNotification('Görev başarıyla silindi');
        loadCompletedTasksPage(); // Sayfayı yeniden yükle
    } catch (error) {
        console.error('Delete task error:', error);
        showNotification('Görev silinirken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}

// Excel export
window.exportCompletedTasks = function() {
    showNotification('Excel export özelliği yakında eklenecek', 'info');
}

// Yazdır
window.printCompletedTasks = function() {
    window.print();
}

// Tamamlanan Görevler Modal - Index gerektirmeyen versiyon
window.openCompletedTasksModal = function() {
    let modal = document.getElementById('completedTasksModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'completedTasksModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    showLoading();
    
    // Tüm tamamlanmış görevleri al, sonra client-side sırala
    db.collection('tasks')
        .where('status', '==', 'completed')
        .get()
        .then(snapshot => {
            // Görevleri array'e al ve tarihine göre sırala
            const tasks = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                tasks.push({ 
                    id: doc.id, 
                    ...data,
                    // completedAt'i Date objesine çevir
                    completedAtDate: data.completedAt ? 
                        (data.completedAt.toDate ? data.completedAt.toDate() : new Date(data.completedAt)) 
                        : new Date(0)
                });
            });
            
            // Client-side'da tarihe göre sırala (en yeni en başta)
            tasks.sort((a, b) => b.completedAtDate - a.completedAtDate);
            
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 900px;">
                    <div class="modal-header">
                        <h2><i class="fas fa-check-circle"></i> Tamamlanan Görevler</h2>
                        <button class="close-modal" onclick="closeModal('completedTasksModal')">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body" style="padding: 20px;">
                        <div class="filter-bar" style="margin-bottom: 20px;">
                            <div class="filter-group">
                                <input type="text" id="searchCompletedTask" placeholder="Görev ara..." style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 6px; width: 200px;">
                                <input type="date" id="filterCompletedDate" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 6px;">
                                <select id="filterCompletedProject" style="padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 6px;">
                                    <option value="">Tüm Projeler</option>
                                    ${[...new Set(tasks.map(t => t.projectName).filter(Boolean))].map(project => 
                                        `<option value="${project}">${project}</option>`
                                    ).join('')}
                                </select>
                                <button class="btn btn-secondary" onclick="filterCompletedTasks()">
                                    <i class="fas fa-filter"></i> Filtrele
                                </button>
                            </div>
                        </div>
                        
                        <div id="completedTasksList">
                            ${tasks.length === 0 ? `
                                <p style="text-align: center; padding: 40px; color: var(--gray-dark);">
                                    <i class="fas fa-inbox" style="font-size: 48px; display: block; margin-bottom: 10px;"></i>
                                    Henüz tamamlanmış görev yok
                                </p>
                            ` : `
                                <table class="data-table">
                                    <thead>
                                        <tr>
                                            <th>Görev</th>
                                            <th>Atanan</th>
                                            <th>Proje</th>
                                            <th>Tamamlanma</th>
                                            <th>Onaylayan</th>
                                            <th>İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${tasks.map(task => `
                                            <tr data-task-id="${task.id}" data-project="${task.projectName || ''}" data-date="${formatDate(task.completedAt)}">
                                                <td style="font-weight: 600;">${task.title}</td>
                                                <td>${task.assignee}</td>
                                                <td>${task.projectName || '-'}</td>
                                                <td>${formatDate(task.completedAt)}</td>
                                                <td>${task.completedBy || '-'}</td>
                                                <td>
                                                    <button class="btn-action" onclick="viewCompletedTask('${task.id}')">
                                                        <i class="fas fa-eye"></i>
                                                    </button>
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            `}
                        </div>
                    </div>
                </div>
            `;
            
            hideLoading();
            openModal('completedTasksModal');
        })
        .catch(error => {
            console.error('Error loading completed tasks:', error);
            showNotification('Tamamlanan görevler yüklenirken hata oluştu', 'error');
            hideLoading();
        });
}

// Tamamlanan görevleri filtrele
window.filterCompletedTasks = function() {
    const searchText = document.getElementById('searchCompletedTask').value.toLowerCase();
    const filterDate = document.getElementById('filterCompletedDate').value;
    const filterProject = document.getElementById('filterCompletedProject').value;
    
    const rows = document.querySelectorAll('#completedTasksList tbody tr');
    
    rows.forEach(row => {
        const title = row.querySelector('td:first-child').textContent.toLowerCase();
        const date = row.dataset.date;
        const project = row.dataset.project;
        
        let show = true;
        
        if (searchText && !title.includes(searchText)) show = false;
        if (filterDate && date !== formatDate(new Date(filterDate))) show = false;
        if (filterProject && project !== filterProject) show = false;
        
        row.style.display = show ? '' : 'none';
    });
}

// Tamamlanan görev detayını göster
window.viewCompletedTask = async function(taskId) {
    showLoading();
    try {
        const doc = await db.collection('tasks').doc(taskId).get();
        const task = { id: doc.id, ...doc.data() };
        
        let detailModal = document.getElementById('completedTaskDetailModal');
        if (!detailModal) {
            detailModal = document.createElement('div');
            detailModal.id = 'completedTaskDetailModal';
            detailModal.className = 'modal';
            document.body.appendChild(detailModal);
        }
        
        detailModal.innerHTML = `
            <div class="modal-content" style="max-width: 600px;">
                <div class="modal-header" style="background: #10b981; color: white;">
                    <h2><i class="fas fa-check-double"></i> Tamamlanmış Görev</h2>
                    <button class="close-modal" style="color: white;" onclick="closeModal('completedTaskDetailModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body" style="padding: 30px;">
                    <h3 style="color: var(--primary-color); margin-bottom: 20px;">${task.title}</h3>
                    
                    <div style="display: grid; gap: 15px;">
                        <div style="background: var(--gray-light); padding: 15px; border-radius: 8px;">
                            <strong>Açıklama:</strong>
                            <p>${task.description || 'Açıklama yok'}</p>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div style="background: var(--gray-light); padding: 15px; border-radius: 8px;">
                                <strong>Atanan Kişi:</strong>
                                <p>${task.assignee}</p>
                            </div>
                            <div style="background: var(--gray-light); padding: 15px; border-radius: 8px;">
                                <strong>Öncelik:</strong>
                                <p><span class="priority ${task.priority}">${getPriorityText(task.priority)}</span></p>
                            </div>
                        </div>
                        
                        ${task.projectName ? `
                            <div style="background: var(--gray-light); padding: 15px; border-radius: 8px;">
                                <strong>Proje:</strong>
                                <p><i class="fas fa-project-diagram"></i> ${task.projectName}</p>
                            </div>
                        ` : ''}
                        
                        <div style="background: #d1fae5; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
                            <strong>Tamamlanma Bilgileri:</strong>
                            <p>Tarih: ${formatDate(task.completedAt)}</p>
                            <p>Onaylayan: ${task.completedBy || 'Bilinmiyor'}</p>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px;">
                        <button class="btn btn-secondary" onclick="closeModal('completedTaskDetailModal')">
                            <i class="fas fa-times"></i> Kapat
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        openModal('completedTaskDetailModal');
    } catch (error) {
        console.error('Error loading task:', error);
        showNotification('Görev yüklenirken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}

// Customers Management - UPDATED
async function loadCustomers() {
    try {
        const snapshot = await db.collection('customers').orderBy('createdAt', 'desc').get();
        const tbody = document.getElementById('customersTable');
        
        tbody.innerHTML = '';
        allCustomers = [];
        
        snapshot.forEach(doc => {
            const customer = { id: doc.id, ...doc.data() };
            allCustomers.push(customer);
            
            const row = `
                <tr>
                    <td>#${customer.id.substring(0, 6)}</td>
                    <td>${customer.name}</td>
                    <td>${customer.company}</td>
                    <td>${customer.email}</td>
                    <td>${customer.phone}</td>
                    <td><span class="status active">Aktif</span></td>
                    <td>
                        <button class="btn-action" onclick="editCustomer('${customer.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action" onclick="deleteCustomer('${customer.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (error) {
        console.error('Load customers error:', error);
        showNotification('Müşteriler yüklenirken hata oluştu', 'error');
    }
}

async function handleCustomerSubmit(e) {
    e.preventDefault();
    showLoading();
    
    const formData = new FormData(e.target);
    const customer = {
        name: formData.get('name'),
        company: formData.get('company'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        website: formData.get('website'),
        address: formData.get('address'),
        notes: formData.get('notes'),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: currentUser.id
    };
    
    try {
        await db.collection('customers').add(customer);
        showNotification('Müşteri başarıyla eklendi');
        closeModal('customerModal');
        e.target.reset();
        loadCustomers();
    } catch (error) {
        console.error('Customer add error:', error);
        showNotification('Müşteri eklenirken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}

window.deleteCustomer = async function(customerId) {
    if (!confirm('Bu müşteriyi silmek istediğinizden emin misiniz?')) return;
    
    showLoading();
    try {
        await db.collection('customers').doc(customerId).delete();
        showNotification('Müşteri silindi');
        loadCustomers();
    } catch (error) {
        console.error('Delete customer error:', error);
        showNotification('Müşteri silinirken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}

// Invoices Management with Chart
async function loadInvoices() {
    try {
        const snapshot = await db.collection('invoices').orderBy('createdAt', 'desc').get();
        const tbody = document.getElementById('invoicesTable');

        tbody.innerHTML = '';
        allInvoices = [];

        let totalInvoiced = 0;
        let totalCollected = 0;
        let totalPending = 0;

        snapshot.forEach(doc => {
            const data = doc.data() || {};
            const invoice = {
                id: doc.id,
                customer: data.customer || 'N/A',
                amount: Number(data.amount) || 0,
                tax: Number(data.tax ?? data.vat ?? 0), // hem tax hem vat destekle
                invoiceDate: data.invoiceDate || data.date || null,
                dueDate: data.dueDate || null,
                status: data.status || 'pending',
                notes: data.notes || '',
                total: Number(data.total) || null
            };

            allInvoices.push(invoice);

            const totalAmount = invoice.total || (invoice.amount + (invoice.amount * invoice.tax / 100));
            totalInvoiced += totalAmount;

            if (invoice.status === 'paid') {
                totalCollected += totalAmount;
            } else {
                totalPending += totalAmount;
            }

            const row = `
                <tr>
                    <td>#${invoice.id.substring(0, 6)}</td>
                    <td>${invoice.customer}</td>
                    <td>₺${totalAmount.toLocaleString('tr-TR')}</td>
                    <td>${formatDate(invoice.invoiceDate)}</td>
                    <td>${formatDate(invoice.dueDate)}</td>
                    <td><span class="status ${invoice.status}">${getStatusText(invoice.status)}</span></td>
                    <td>
                        <button class="btn-action" onclick="editInvoice('${invoice.id}')"><i class="fas fa-edit"></i></button>
                        <button class="btn-action" onclick="printInvoice('${invoice.id}')"><i class="fas fa-print"></i></button>
                        <button class="btn-action" onclick="deleteInvoice('${invoice.id}')"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });

        // İstatistikleri güncelle
        document.querySelector('.invoice-stat:nth-child(1) h4').textContent = `₺${totalInvoiced.toLocaleString('tr-TR')}`;
        document.querySelector('.invoice-stat:nth-child(2) h4').textContent = `₺${totalCollected.toLocaleString('tr-TR')}`;
        document.querySelector('.invoice-stat:nth-child(3) h4').textContent = `₺${totalPending.toLocaleString('tr-TR')}`;

        // Grafik oluştur
        if (typeof Chart !== 'undefined') {
            createInvoiceChart(allInvoices);
        }

    } catch (error) {
        console.error('Load invoices error:', error);
        showNotification('Faturalar yüklenirken hata oluştu', 'error');
    }
}




function createInvoiceChart(invoices) {
    let canvas = document.getElementById('invoiceChart');
    if (!canvas) {
        const chartContainer = document.createElement('div');
        chartContainer.className = 'chart-container';
        chartContainer.innerHTML = '<canvas id="invoiceChart" style="max-height: 300px;"></canvas>';
        
        const invoiceSection = document.getElementById('invoices');
        const statsContainer = invoiceSection.querySelector('.invoice-stats');
        invoiceSection.insertBefore(chartContainer, statsContainer.nextSibling);
        
        canvas = document.getElementById('invoiceChart');
    }
    
    if (invoiceChart) {
        invoiceChart.destroy();
    }
    
    let paid = 0, pending = 0, overdue = 0;
    
    invoices.forEach(invoice => {
        const amount = invoice.amount + (invoice.amount * invoice.tax / 100);
        if (invoice.status === 'paid') {
            paid += amount;
        } else if (new Date(invoice.dueDate) < new Date()) {
            overdue += amount;
        } else {
            pending += amount;
        }
    });
    
    const ctx = canvas.getContext('2d');
    invoiceChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Ödendi', 'Bekliyor', 'Gecikmiş'],
            datasets: [{
                data: [paid, pending, overdue],
                backgroundColor: [
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.label + ': ₺' + context.parsed.toLocaleString('tr-TR');
                        }
                    }
                }
            }
        }
    });
}

// handleInvoiceSubmit fonksiyonunu güncelle
async function handleInvoiceSubmit(e) {
    e.preventDefault();
    showLoading();
    
    const formData = new FormData(e.target);
    const invoice = {
        customer: formData.get('customer'),
        customerId: formData.get('customerId') || null,
        amount: parseFloat(formData.get('amount')),
        tax: parseFloat(formData.get('tax')),
        invoiceDate: formData.get('invoiceDate'),
        dueDate: formData.get('dueDate'),
        status: 'pending',
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: currentUser.id
    };
    
    try {
        await db.collection('invoices').add(invoice);
        showNotification('Fatura başarıyla oluşturuldu');
        closeModal('invoiceModal');
        e.target.reset();
        loadInvoices();
    } catch (error) {
        console.error('Invoice add error:', error);
        showNotification('Fatura oluşturulurken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}

async function updateInvoiceModal() {
    const invoiceModal = document.getElementById('invoiceModal');
    if (!invoiceModal) return;
    
    const form = invoiceModal.querySelector('form');
    const customerInput = form.querySelector('input[name="customer"]');
    
    // Eğer zaten eklenmişse tekrar ekleme
    if (form.querySelector('select[name="customerId"]')) return;
    
    // Müşterileri yükle (anlık veri)
    await loadCustomers();
    
    const customerSelect = document.createElement('div');
    customerSelect.className = 'form-group';
    customerSelect.innerHTML = `
        <label>Müşteri Seç</label>
        <select name="customerId" onchange="updateInvoiceCustomerName(this)">
            <option value="">Müşteri Seçin veya Manuel Girin</option>
            ${allCustomers.map(customer => 
                `<option value="${customer.id}" data-name="${customer.name}">${customer.name} - ${customer.company}</option>`
            ).join('')}
        </select>
    `;
    
    customerInput.parentElement.before(customerSelect);
}
// Fatura için müşteri adını güncelle
window.updateInvoiceCustomerName = function(select) {
    const customerName = select.selectedOptions[0]?.dataset.name || '';
    const customerInput = document.querySelector('#invoiceModal input[name="customer"]');
    if (customerInput) {
        customerInput.value = customerName;
        customerInput.readOnly = select.value !== '';
    }
}

window.deleteInvoice = async function(invoiceId) {
    if (!confirm('Bu faturayı silmek istediğinizden emin misiniz?')) return;
    
    showLoading();
    try {
        await db.collection('invoices').doc(invoiceId).delete();
        showNotification('Fatura silindi');
        loadInvoices();
    } catch (error) {
        console.error('Delete invoice error:', error);
        showNotification('Fatura silinirken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}

window.printInvoice = function(invoiceId) {
    const invoice = allInvoices.find(i => i.id === invoiceId);
    if (!invoice) return;
    
    window.print();
    showNotification('Fatura yazdırma işlemi başlatıldı');
}

// Reports with Charts - DEVAM BURADA
async function loadReports() {
    try {
        const [payments, projects, customers, tasks] = await Promise.all([
            db.collection('payments').get(),
            db.collection('projects').get(),
            db.collection('customers').get(),
            db.collection('tasks').get()
        ]);
        
        const monthlyRevenue = calculateMonthlyRevenue(payments.docs);
        const projectEfficiency = calculateProjectEfficiency(projects.docs, tasks.docs);
        const customerSatisfaction = 4.5;
        
        // Update report cards
        document.querySelector('.report-card:nth-child(1) .report-value').textContent = 
            `₺${monthlyRevenue.current.toLocaleString('tr-TR')}`;
        document.querySelector('.report-card:nth-child(1) .report-change').textContent = 
            `${monthlyRevenue.change > 0 ? '+' : ''}${monthlyRevenue.change}% geçen aya göre`;
            
        document.querySelector('.report-card:nth-child(2) .report-value').textContent = `${projectEfficiency}%`;
        document.querySelector('.report-card:nth-child(2) .report-change').textContent = 'Son 30 gün';
        
        document.querySelector('.report-card:nth-child(3) .report-value').textContent = `${customerSatisfaction}/5`;
        document.querySelector('.report-card:nth-child(3) .report-change').textContent = 'Müşteri değerlendirmesi';
        
        if (typeof Chart !== 'undefined') {
            createRevenueChart(payments.docs);
        }
        
    } catch (error) {
        console.error('Load reports error:', error);
        showNotification('Raporlar yüklenirken hata oluştu', 'error');
    }
}

function calculateMonthlyRevenue(payments) {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    let currentRevenue = 0;
    let lastRevenue = 0;
    
    payments.forEach(doc => {
        const payment = doc.data();
        if (payment.status === 'paid' && payment.createdAt) {
            let date;
            
            if (payment.createdAt.toDate) {
                date = payment.createdAt.toDate();
            } else if (typeof payment.createdAt === 'string') {
                date = new Date(payment.createdAt);
            } else {
                date = new Date();
            }
            
            if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
                currentRevenue += payment.amount || 0;
            } else if (date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear) {
                lastRevenue += payment.amount || 0;
            }
        }
    });
    
    const change = lastRevenue > 0 ? Math.round(((currentRevenue - lastRevenue) / lastRevenue) * 100) : 0;
    
    return { current: currentRevenue, last: lastRevenue, change };
}

function calculateProjectEfficiency(projects, tasks) {
    let totalCompleted = 0;
    let totalProjects = projects.length;
    
    projects.forEach(projectDoc => {
        const project = projectDoc.data();
        if (project.status === 'completed') {
            totalCompleted++;
        }
    });
    
    return totalProjects > 0 ? Math.round((totalCompleted / totalProjects) * 100) : 0;
}

function createRevenueChart(payments) {
    const canvas = document.getElementById('revenueChart');
    if (!canvas) return;
    
    if (revenueChart) {
        revenueChart.destroy();
    }
    
    const monthlyData = getMonthlyRevenueData(payments);
    
    const ctx = canvas.getContext('2d');
    revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: monthlyData.labels,
            datasets: [{
                label: 'Aylık Gelir',
                data: monthlyData.values,
                borderColor: '#00fefb',
                backgroundColor: 'rgba(0, 254, 251, 0.1)',
                borderWidth: 3,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '₺' + value.toLocaleString('tr-TR');
                        }
                    }
                }
            }
        }
    });
}

function getMonthlyRevenueData(payments) {
    const months = [];
    const revenues = [];
    const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    
    for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        
        const month = date.getMonth();
        const year = date.getFullYear();
        months.push(monthNames[month] + ' ' + year);
        
        let monthRevenue = 0;
        payments.forEach(doc => {
            const payment = doc.data();
            if (payment.status === 'paid' && payment.createdAt) {
                let paymentDate;
                
                if (payment.createdAt.toDate) {
                    paymentDate = payment.createdAt.toDate();
                } else if (typeof payment.createdAt === 'string') {
                    paymentDate = new Date(payment.createdAt);
                } else {
                    paymentDate = new Date();
                }
                
                if (paymentDate.getMonth() === month && paymentDate.getFullYear() === year) {
                    monthRevenue += payment.amount || 0;
                }
            }
        });
        
        revenues.push(monthRevenue);
    }
    
    return { labels: months, values: revenues };
}

// Settings - Şirket Bilgileri Yükleme ve Kaydetme
async function loadSettings() {
    try {
        // Mevcut ayarları yükle
        const doc = await db.collection('settings').doc('company').get();
        
        if (doc.exists) {
            const settings = doc.data();
            const form = document.querySelector('.settings-form');
            
            if (form) {
                form.querySelector('input[type="text"]').value = settings.companyName || '';
                form.querySelector('input[type="email"]').value = settings.email || '';
                form.querySelector('input[type="tel"]').value = settings.phone || '';
                form.querySelector('textarea').value = settings.address || '';
            }
        }
        
        // Form submit handler ekle (sadece bir kez)
        const settingsForm = document.querySelector('.settings-form');
        if (settingsForm && !settingsForm.dataset.listenerAdded) {
            settingsForm.dataset.listenerAdded = 'true';
            settingsForm.addEventListener('submit', handleSettingsSubmit);
        }
        
    } catch (error) {
        console.error('Settings load error:', error);
        showNotification('Ayarlar yüklenirken hata oluştu', 'error');
    }
}

// Ayarlar form submit handler
async function handleSettingsSubmit(e) {
    e.preventDefault();
    showLoading();
    
    const formData = new FormData(e.target);
    const settings = {
        companyName: formData.get('companyName') || e.target.querySelector('input[type="text"]').value,
        email: formData.get('email') || e.target.querySelector('input[type="email"]').value,
        phone: formData.get('phone') || e.target.querySelector('input[type="tel"]').value,
        address: formData.get('address') || e.target.querySelector('textarea').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: currentUser.id
    };
    
    try {
        await db.collection('settings').doc('company').set(settings, { merge: true });
        showNotification('Ayarlar başarıyla kaydedildi');
    } catch (error) {
        console.error('Settings save error:', error);
        showNotification('Ayarlar kaydedilirken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}
// Admin Panel - FIXED
function createAdminSection() {
    // Check if already exists
    if (document.getElementById('admin')) return;
    
    const navMenu = document.querySelector('.nav-menu');
    
    // Check if admin nav already exists
    let adminNavItem = document.querySelector('[data-section="admin"]');
    if (!adminNavItem) {
        adminNavItem = document.createElement('a');
        adminNavItem.href = '#';
        adminNavItem.className = 'nav-item';
        adminNavItem.dataset.section = 'admin';
        adminNavItem.innerHTML = `
            <i class="fas fa-user-shield"></i>
            <span>Yönetim</span>
        `;
        navMenu.appendChild(adminNavItem);
    }
    
    // Create admin section
    const mainContent = document.querySelector('.main-content');
    if (!document.getElementById('admin')) {
        const adminSection = document.createElement('section');
        adminSection.id = 'admin';
        adminSection.className = 'content-section';
        adminSection.innerHTML = `
            <div class="section-header">
                <h2>Kullanıcı Yönetimi</h2>
                <button class="btn btn-primary" onclick="openModal('userModal')">
                    <i class="fas fa-user-plus"></i> Yeni Kullanıcı
                </button>
            </div>
            <div class="data-table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Kullanıcı Adı</th>
                            <th>Ad Soyad</th>
                            <th>Rol</th>
                            <th>Durum</th>
                            <th>İşlemler</th>
                        </tr>
                    </thead>
                    <tbody id="usersTable"></tbody>
                </table>
            </div>
        `;
        mainContent.appendChild(adminSection);
    }
    
    // Create user modal if not exists
    if (!document.getElementById('userModal')) {
        const userModal = document.createElement('div');
        userModal.id = 'userModal';
        userModal.className = 'modal';
        userModal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Yeni Kullanıcı Ekle</h2>
                    <button class="close-modal" onclick="closeModal('userModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="userForm" class="modal-form">
                    <div class="form-group">
                        <label>Kullanıcı Adı</label>
                        <input type="text" name="username" placeholder="kullaniciadi123" required pattern="[a-zA-Z0-9]+" title="Sadece harf ve sayı">
                    </div>
                    <div class="form-group">
                        <label>Ad Soyad</label>
                        <input type="text" name="displayName" placeholder="Ad Soyad" required>
                    </div>
                    <div class="form-group">
                        <label>Şifre</label>
                        <input type="password" name="password" placeholder="Min 6 karakter" required minlength="6">
                    </div>
                    <div class="form-group">
                        <label>Rol</label>
                        <select name="role" required>
                            <option value="user">Kullanıcı</option>
                            <option value="admin">Yönetici</option>
                        </select>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeModal('userModal')">İptal</button>
                        <button type="submit" class="btn btn-primary">Kaydet</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(userModal);
        
        document.getElementById('userForm').addEventListener('submit', handleUserSubmit);
    }
    
    // Re-initialize navigation
    initializeNavigation();
}

async function loadUsers() {
    try {
        const snapshot = await db.collection('users').get();
        const tbody = document.getElementById('usersTable');
        
        tbody.innerHTML = '';
        
        snapshot.forEach(doc => {
            const user = { id: doc.id, ...doc.data() };
            
            const row = `
                <tr>
                    <td>#${user.id.substring(0, 6)}</td>
                    <td>${user.username}</td>
                    <td>${user.displayName || 'N/A'}</td>
                    <td><span class="status ${user.role === 'admin' ? 'active' : 'pending'}">${user.role}</span></td>
                    <td><span class="status active">Aktif</span></td>
                    <td>
                        <button class="btn-action" onclick="editUser('${user.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action" onclick="deleteUser('${user.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (error) {
        console.error('Load users error:', error);
        showNotification('Kullanıcılar yüklenirken hata oluştu', 'error');
    }
}

async function handleUserSubmit(e) {
    e.preventDefault();
    showLoading();
    
    const formData = new FormData(e.target);
    const user = {
        username: formData.get('username').toLowerCase(),
        displayName: formData.get('displayName'),
        password: formData.get('password'),
        role: formData.get('role'),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: currentUser.id
    };
    
    try {
        const existingUser = await db.collection('users').where('username', '==', user.username).get();
        
        if (!existingUser.empty) {
            showNotification('Bu kullanıcı adı zaten kullanılıyor', 'error');
            hideLoading();
            return;
        }
        
        await db.collection('users').add(user);
        showNotification('Kullanıcı başarıyla eklendi');
        closeModal('userModal');
        e.target.reset();
        loadUsers();
    } catch (error) {
        console.error('User add error:', error);
        showNotification('Kullanıcı eklenirken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}

window.deleteUser = async function(userId) {
    if (userId === currentUser.id) {
        showNotification('Kendinizi silemezsiniz', 'error');
        return;
    }
    
    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz?')) return;
    
    showLoading();
    try {
        await db.collection('users').doc(userId).delete();
        showNotification('Kullanıcı silindi');
        loadUsers();
    } catch (error) {
        console.error('Delete user error:', error);
        showNotification('Kullanıcı silinirken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}

// Helper Functions
function formatDate(date) {
    if (!date) return 'Tarih yok';
    
    try {
        if (typeof date === 'string') {
            const d = new Date(date);
            return isNaN(d.getTime()) ? 'Geçersiz tarih' : d.toLocaleDateString('tr-TR');
        }
        
        if (date.toDate) {
            return date.toDate().toLocaleDateString('tr-TR');
        }
        
        const newDate = new Date(date);
        return isNaN(newDate.getTime()) ? 'Geçersiz tarih' : newDate.toLocaleDateString('tr-TR');
    } catch (error) {
        console.error('Date format error:', error);
        return 'Hatalı tarih';
    }
}

function getStatusText(status) {
    const statusMap = {
        'active': 'Aktif',
        'completed': 'Tamamlandı',
        'pending': 'Bekliyor',
        'cancelled': 'İptal',
        'paid': 'Ödendi',
        'unpaid': 'Ödenmedi',
        'todo': 'Yapılacak',
        'inprogress': 'Devam Ediyor',
        'testing': 'Test Bekleyen'
    };
    return statusMap[status] || status;
}

function getPriorityText(priority) {
    const priorityMap = {
        'high': 'Yüksek',
        'medium': 'Orta',
        'low': 'Düşük'
    };
    return priorityMap[priority] || priority;
}

function getInitials(name) {
    if (!name) return 'NA';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.add('active');
    
    // Özel modal işlemleri
    if (modalId === 'paymentModal') {
        const form = modal.querySelector('form');
        if (!modal.dataset.initialized) {
            form.reset();
            const installmentFields = document.getElementById('installmentFields');
            if (installmentFields) {
                installmentFields.innerHTML = '';
            }
            const installmentSelect = document.getElementById('installmentCountSelect');
            if (installmentSelect) {
                installmentSelect.value = '0';
            }
            modal.dataset.initialized = 'true';
        }
    }
    
    // BURAYA EKLE
    if (modalId === 'proposalModal') {
        updateProposalModal();
    }
    
    // Modal içeriğine tıklama olayını engelle
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            e.stopPropagation();
        }
    });
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    // Modal'ı kapat
    modal.classList.remove('active');
    
    // Payment modal için özel temizlik
    if (modalId === 'paymentModal') {
        // İnit flag'ını kaldır, bir sonraki açılışta tekrar çalışsın
        delete modal.dataset.initialized;
        
        // Formu temizle
        const form = modal.querySelector('form');
        if (form) {
            form.reset();
        }
        
        // Taksit alanlarını temizle
        const installmentFields = document.getElementById('installmentFields');
        if (installmentFields) {
            installmentFields.innerHTML = '';
        }
    }
    
    // Modal dışı tıklama olayını kaldır
    modal.removeEventListener('click', () => {});
}

// Close modal on backdrop click
document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});

// Make functions globally accessible
window.editPayment = function(id) {
    showNotification('Düzenleme özelliği yakında eklenecek');
}

window.editCustomer = function(id) {
    showNotification('Düzenleme özelliği yakında eklenecek');
}

// Kullanıcı Düzenleme Modal
window.editUser = function(id) {
    const user = allUsers.find(u => u.id === id);
    if (!user) return;
    
    let modal = document.getElementById('editUserModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'editUserModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Kullanıcı Düzenle</h2>
                <button class="close-modal" onclick="closeModal('editUserModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form id="editUserForm" class="modal-form">
                <div class="form-group">
                    <label>Kullanıcı Adı</label>
                    <input type="text" id="editUserUsername" value="${user.username}" required>
                </div>
                <div class="form-group">
                    <label>Ad Soyad</label>
                    <input type="text" id="editUserDisplayName" value="${user.displayName || ''}" required>
                </div>
                <div class="form-group">
                    <label>Yeni Şifre (Boş bırakılırsa değişmez)</label>
                    <input type="password" id="editUserPassword" placeholder="Yeni şifre">
                </div>
                <div class="form-group">
                    <label>Rol</label>
                    <select id="editUserRole">
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>Kullanıcı</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Yönetici</option>
                    </select>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeModal('editUserModal')">İptal</button>
                    <button type="submit" class="btn btn-primary">Güncelle</button>
                </div>
            </form>
        </div>
    `;
    
    document.getElementById('editUserForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading();
        
        const updateData = {
            username: document.getElementById('editUserUsername').value,
           displayName: document.getElementById('editUserDisplayName').value,
            role: document.getElementById('editUserRole').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const newPassword = document.getElementById('editUserPassword').value;
        if (newPassword) {
            updateData.password = newPassword;
        }
        
        try {
            await db.collection('users').doc(id).update(updateData);
            showNotification('Kullanıcı güncellendi');
            closeModal('editUserModal');
            loadUsers();
        } catch (error) {
            showNotification('Güncelleme hatası', 'error');
        } finally {
            hideLoading();
        }
    });
    
    openModal('editUserModal');
}

// loadUsers fonksiyonuna allUsers array'i ekle
async function loadUsers() {
    try {
        const snapshot = await db.collection('users').get();
        const tbody = document.getElementById('usersTable');
        
        tbody.innerHTML = '';
        allUsers = []; // Global değişkene ekle
        
        snapshot.forEach(doc => {
            const user = { id: doc.id, ...doc.data() };
            allUsers.push(user); // Array'e ekle
            
            const row = `
                <tr>
                    <td>#${user.id.substring(0, 6)}</td>
                    <td>${user.username}</td>
                    <td>${user.displayName || 'N/A'}</td>
                    <td><span class="status ${user.role === 'admin' ? 'active' : 'pending'}">${user.role}</span></td>
                    <td><span class="status active">Aktif</span></td>
                    <td>
                        <button class="btn-action" onclick="editUser('${user.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action" onclick="deleteUser('${user.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (error) {
        console.error('Load users error:', error);
        showNotification('Kullanıcılar yüklenirken hata oluştu', 'error');
    }
}

// Bildirimler Modal ve Sistem
let notifications = [];

function createNotificationCenter() {
    // Header'daki notification button'a event ekle
    const notificationBtn = document.querySelector('.notification-btn');
    if (notificationBtn) {
        notificationBtn.addEventListener('click', showNotificationCenter);
    }
}

function showNotificationCenter() {
    let modal = document.getElementById('notificationModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'notificationModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    // Son bildirimleri göster
    const recentNotifications = [
        { type: 'payment', message: 'Yeni ödeme eklendi', time: 'Az önce', icon: 'fa-credit-card' },
        { type: 'task', message: 'Görev tamamlandı', time: '5 dk önce', icon: 'fa-check-circle' },
        { type: 'project', message: 'Proje güncellendi', time: '1 saat önce', icon: 'fa-project-diagram' },
        { type: 'invoice', message: 'Fatura ödendi', time: '2 saat önce', icon: 'fa-file-invoice' }
    ];
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2><i class="fas fa-bell"></i> Bildirimler</h2>
                <button class="close-modal" onclick="closeModal('notificationModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="padding: 0;">
                <div style="max-height: 400px; overflow-y: auto;">
                    ${recentNotifications.map(notif => `
                        <div style="padding: 15px 20px; border-bottom: 1px solid var(--gray-light); display: flex; align-items: center; gap: 15px; cursor: pointer; transition: background 0.2s;" 
                             onmouseover="this.style.background='var(--gray-light)'" 
                             onmouseout="this.style.background='transparent'">
                            <div style="width: 40px; height: 40px; background: linear-gradient(135deg, var(--accent-color), rgba(0,254,251,0.5)); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                <i class="fas ${notif.icon}" style="color: var(--primary-color);"></i>
                            </div>
                            <div style="flex: 1;">
                                <p style="margin: 0; font-weight: 500;">${notif.message}</p>
                                <small style="color: var(--gray-dark);">${notif.time}</small>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div style="padding: 15px 20px; text-align: center; background: var(--gray-light);">
                    <button class="btn btn-secondary" onclick="clearNotifications()">
                        <i class="fas fa-trash"></i> Tümünü Temizle
                    </button>
                </div>
            </div>
        </div>
    `;
    
    openModal('notificationModal');
}

window.clearNotifications = function() {
    notifications = [];
    document.querySelector('.notification-btn .badge').textContent = '0';
    closeModal('notificationModal');
    showNotification('Bildirimler temizlendi');
}

// Initialize the app
console.log('FurkaTech İş Yönetimi Sistemi başlatıldı');

// Add Chart.js defaults
if (typeof Chart !== 'undefined') {
    Chart.defaults.font.family = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    Chart.defaults.color = '#64748b';
}

// Ödeme Düzenleme Modal - HTML'e ekle (paymentModal'dan sonra)
const editPaymentModal = document.createElement('div');
editPaymentModal.id = 'editPaymentModal';
editPaymentModal.className = 'modal';
editPaymentModal.innerHTML = `
    <div class="modal-content">
        <div class="modal-header">
            <h2>Ödeme Düzenle</h2>
            <button class="close-modal" onclick="closeModal('editPaymentModal')">
                <i class="fas fa-times"></i>
            </button>
        </div>
        <form id="editPaymentForm" class="modal-form">
            <input type="hidden" id="editPaymentId">
            <div class="form-group">
                <label>Müşteri</label>
                <input type="text" name="customer" id="editPaymentCustomer" required>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Tutar</label>
                    <input type="number" name="amount" id="editPaymentAmount" required>
                </div>
                <div class="form-group">
                    <label>Vade Tarihi</label>
                    <input type="date" name="dueDate" id="editPaymentDueDate" required>
                </div>
            </div>
            <div class="form-group">
                <label>Durum</label>
                <select name="status" id="editPaymentStatus">
                    <option value="paid">Ödendi</option>
                    <option value="unpaid">Ödenmedi</option>
                </select>
            </div>
            <div class="form-group">
                <label>Açıklama</label>
                <textarea name="description" id="editPaymentDescription"></textarea>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal('editPaymentModal')">İptal</button>
                <button type="submit" class="btn btn-primary">Güncelle</button>
            </div>
        </form>
    </div>
`;
document.body.appendChild(editPaymentModal);

// Ödeme Düzenleme Fonksiyonu
window.editPayment = function(id) {
    const payment = allPayments.find(p => p.id === id);
    if (!payment) return;
    
    // Müşterileri yükle
    loadCustomers().then(() => {
        let modal = document.getElementById('editPaymentModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'editPaymentModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Ödeme Düzenle</h2>
                    <button class="close-modal" onclick="closeModal('editPaymentModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="editPaymentForm" class="modal-form">
                    <input type="hidden" id="editPaymentId" value="${id}">
                    
                    <div class="form-group">
                        <label>Müşteri Seç</label>
                        <select id="editPaymentCustomerId" onchange="updateEditCustomerName(this)">
                            <option value="">Müşteri Seçin veya Manuel Girin</option>
                            ${allCustomers.map(customer => 
                                `<option value="${customer.id}" data-name="${customer.name}" 
                                ${payment.customerId === customer.id ? 'selected' : ''}>
                                ${customer.name} - ${customer.company}</option>`
                            ).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Müşteri</label>
                        <input type="text" id="editPaymentCustomer" value="${payment.customer}" required>
                    </div>
                    
                    ${payment.hasInstallments && payment.installments ? `
                        <div class="form-group">
                            <label>Taksit Durumu</label>
                            <div style="border: 1px solid var(--gray-light); padding: 15px; border-radius: 8px;">
                                ${payment.installments.map((inst, index) => `
                                    <div class="form-row" style="margin-bottom: 10px;">
                                        <div class="form-group">
                                            <label>${index + 1}. Taksit Tarihi</label>
                                            <input type="date" id="editInstDate_${index}" value="${inst.date}" required>
                                        </div>
                                        <div class="form-group">
                                            <label>${index + 1}. Taksit Tutarı</label>
                                            <input type="number" id="editInstAmount_${index}" value="${inst.amount}" step="0.01" required>
                                        </div>
                                        <div class="form-group">
                                            <label>Durum</label>
                                            <select id="editInstStatus_${index}">
                                                <option value="unpaid" ${inst.status === 'unpaid' ? 'selected' : ''}>Ödenmedi</option>
                                                <option value="paid" ${inst.status === 'paid' ? 'selected' : ''}>Ödendi</option>
                                            </select>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : `
                        <div class="form-row">
                            <div class="form-group">
                                <label>Tutar</label>
                                <input type="number" id="editPaymentAmount" value="${payment.amount}" required>
                            </div>
                            <div class="form-group">
                                <label>Vade Tarihi</label>
                                <input type="date" id="editPaymentDueDate" value="${payment.dueDate}" required>
                            </div>
                        </div>
                    `}
                    
                    <div class="form-group">
                        <label>Durum</label>
                        <select id="editPaymentStatus">
                            <option value="paid" ${payment.status === 'paid' ? 'selected' : ''}>Ödendi</option>
                            <option value="unpaid" ${payment.status === 'unpaid' ? 'selected' : ''}>Ödenmedi</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label>Açıklama</label>
                        <textarea id="editPaymentDescription">${payment.description || ''}</textarea>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="closeModal('editPaymentModal')">İptal</button>
                        <button type="submit" class="btn btn-primary">Güncelle</button>
                    </div>
                </form>
            </div>
        `;
        
        document.getElementById('editPaymentForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            showLoading();
            
            const paymentId = document.getElementById('editPaymentId').value;
            let updateData = {
                customer: document.getElementById('editPaymentCustomer').value,
                customerId: document.getElementById('editPaymentCustomerId').value || null,
                status: document.getElementById('editPaymentStatus').value,
                description: document.getElementById('editPaymentDescription').value,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            if (payment.hasInstallments && payment.installments) {
                // Taksitleri güncelle
                const updatedInstallments = payment.installments.map((inst, index) => ({
                    date: document.getElementById(`editInstDate_${index}`).value,
                    amount: parseFloat(document.getElementById(`editInstAmount_${index}`).value),
                    status: document.getElementById(`editInstStatus_${index}`).value,
                    paidDate: document.getElementById(`editInstStatus_${index}`).value === 'paid' ? new Date() : null
                }));
                
                updateData.installments = updatedInstallments;
                updateData.amount = updatedInstallments.reduce((sum, inst) => sum + inst.amount, 0);
                
                // Tüm taksitler ödendiyse ana durumu güncelle
                const allPaid = updatedInstallments.every(inst => inst.status === 'paid');
                if (allPaid) {
                    updateData.status = 'paid';
                }
            } else {
                updateData.amount = parseFloat(document.getElementById('editPaymentAmount').value);
                updateData.dueDate = document.getElementById('editPaymentDueDate').value;
            }
            
            try {
                await db.collection('payments').doc(paymentId).update(updateData);
                showNotification('Ödeme güncellendi');
                closeModal('editPaymentModal');
                loadPayments();
            } catch (error) {
                showNotification('Güncelleme hatası', 'error');
            } finally {
                hideLoading();
            }
        });
        
        openModal('editPaymentModal');
    });
}

// Düzenlemede müşteri adını güncelle
window.updateEditCustomerName = function(select) {
    const customerName = select.selectedOptions[0]?.dataset.name || '';
    const customerInput = document.getElementById('editPaymentCustomer');
    if (customerInput) {
        customerInput.value = customerName;
        customerInput.readOnly = select.value !== '';
    }
}

// Form Submit Handler
document.getElementById('editPaymentForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    showLoading();
    
    const paymentId = document.getElementById('editPaymentId').value;
    const formData = new FormData(e.target);
    
    try {
        await db.collection('payments').doc(paymentId).update({
            customer: formData.get('customer'),
            amount: parseFloat(formData.get('amount')),
            dueDate: formData.get('dueDate'),
            status: formData.get('status'),
            description: formData.get('description'),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification('Ödeme güncellendi');
        closeModal('editPaymentModal');
        loadPayments();
    } catch (error) {
        showNotification('Güncelleme hatası', 'error');
    } finally {
        hideLoading();
    }
});

window.showProjectDetails = async function(projectId) {
    if (!projectId) return;
    
    const project = allProjects ? allProjects.find(p => p && p.id === projectId) : null;
    if (!project) {
        showNotification('Proje bulunamadı', 'error');
        return;
    }
    
    showLoading();
    
    // Bu projeye ait ödemeleri getir
    const paymentsSnapshot = await db.collection('payments')
        .where('projectId', '==', projectId)
        .orderBy('paymentDate', 'desc')
        .get();
    
    const projectPayments = [];
    let totalPaid = 0;
    
    paymentsSnapshot.forEach(doc => {
        const payment = { id: doc.id, ...doc.data() };
        projectPayments.push(payment);
        totalPaid += payment.amount || 0;
    });
    
    hideLoading();
    
    let modal = document.getElementById('projectDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'projectDetailModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    const projectName = project.name || 'İsimsiz Proje';
    const projectClient = project.client || 'Belirtilmemiş';
    const projectStatus = project.status || 'unknown';
    const projectStartDate = project.startDate || null;
    const projectEndDate = project.endDate || null;
    const projectBudget = project.budget || 0;
    const projectCurrentBudget = project.currentBudget || projectBudget;
    const projectProgress = project.progress || 0;
    const remainingBudget = projectCurrentBudget - totalPaid;
    
    // Ödeme listesi HTML
    let paymentsHTML = '';
    if (projectPayments.length > 0) {
        paymentsHTML = `
            <div style="margin-top: 20px; padding: 20px; background: white; border-radius: 8px;">
                <h4 style="margin-bottom: 15px; color: var(--primary-color);">
                    <i class="fas fa-money-bill-wave"></i> Ödeme Geçmişi
                </h4>
                <div style="max-height: 300px; overflow-y: auto;">
                    ${projectPayments.map(payment => `
                        <div style="padding: 15px; background: var(--gray-light); border-radius: 6px; margin-bottom: 10px; border-left: 4px solid #10b981;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <strong style="color: #10b981; font-size: 18px;">₺${payment.amount.toLocaleString('tr-TR')}</strong>
                                    <p style="margin: 5px 0 0 0; color: var(--gray-dark); font-size: 12px;">
                                        <i class="fas fa-calendar"></i> ${formatDate(payment.paymentDate)}
                                    </p>
                                    ${payment.description ? `
                                        <p style="margin: 5px 0 0 0; font-size: 13px;">${payment.description}</p>
                                    ` : ''}
                                </div>
                                <button class="btn-action" onclick="deletePayment('${payment.id}')" style="background: #ef4444;">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } else {
        paymentsHTML = `
            <div style="margin-top: 20px; padding: 20px; background: var(--gray-light); border-radius: 8px; text-align: center;">
                <i class="fas fa-info-circle" style="font-size: 32px; color: var(--gray-dark); margin-bottom: 10px;"></i>
                <p style="color: var(--gray-dark);">Henüz ödeme yapılmamış</p>
            </div>
        `;
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header">
                <h2>Proje Detayları</h2>
                <button class="close-modal" onclick="closeModal('projectDetailModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="padding: 25px;">
                <div style="display: grid; gap: 20px;">
                    <div style="background: var(--gray-light); padding: 20px; border-radius: 8px;">
                        <h3 style="color: var(--primary-color); margin-bottom: 15px;">
                            <i class="fas fa-project-diagram"></i> ${projectName}
                        </h3>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div>
                                <strong>Müşteri:</strong>
                                <p>${projectClient}</p>
                            </div>
                            <div>
                                <strong>Durum:</strong>
                                <p><span class="status ${projectStatus}">${getStatusText(projectStatus)}</span></p>
                            </div>
                            <div>
                                <strong>Başlangıç:</strong>
                                <p>${formatDate(projectStartDate)}</p>
                            </div>
                            <div>
                                <strong>Bitiş:</strong>
                                <p>${formatDate(projectEndDate)}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div style="background: linear-gradient(135deg, rgba(0,254,251,0.1), rgba(0,254,251,0.05)); padding: 20px; border-radius: 8px;">
                        <h4 style="margin-bottom: 15px;">Bütçe Durumu</h4>
                        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                            <div style="text-align: center;">
                                <strong style="color: var(--primary-color);">Toplam Bütçe</strong>
                                <p style="font-size: 20px; color: var(--primary-color); margin: 5px 0;">₺${projectCurrentBudget.toLocaleString('tr-TR')}</p>
                            </div>
                            <div style="text-align: center;">
                                <strong style="color: #10b981;">Ödenen</strong>
                                <p style="font-size: 20px; color: #10b981; margin: 5px 0;">₺${totalPaid.toLocaleString('tr-TR')}</p>
                            </div>
                            <div style="text-align: center;">
                                <strong style="color: ${remainingBudget < 0 ? '#ef4444' : '#f59e0b'};">Kalan</strong>
                                <p style="font-size: 20px; color: ${remainingBudget < 0 ? '#ef4444' : '#f59e0b'}; margin: 5px 0;">₺${remainingBudget.toLocaleString('tr-TR')}</p>
                            </div>
                        </div>
                    </div>
                    
                    ${paymentsHTML}
                    
                    <div>
                        <div class="progress-bar" style="height: 30px; background: var(--gray-light);">
                            <div class="progress-fill" style="width: ${projectProgress}%; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
                                ${projectProgress}%
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button class="btn btn-danger" onclick="deleteProject('${projectId}')">
                            <i class="fas fa-trash"></i> Sil
                        </button>
                        <button class="btn btn-secondary" onclick="editProject('${projectId}')">
                            <i class="fas fa-edit"></i> Düzenle
                        </button>
                        <button class="btn btn-primary" onclick="updateProjectBudget('${projectId}')">
                            <i class="fas fa-money-bill"></i> Bütçe Güncelle
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    openModal('projectDetailModal');
};
// Proje Silme Fonksiyonu - projectDetailModal'ı da kapatacak şekilde güncellendi
window.deleteProject = async function(projectId) {
    if (!confirm('Bu projeyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return;
    
    showLoading();
    try {
        await db.collection('projects').doc(projectId).delete();
        showNotification('Proje başarıyla silindi');
        closeModal('projectDetailModal'); // Detay modalını kapat
        loadProjects(); // Projeleri yeniden yükle
    } catch (error) {
        console.error('Delete project error:', error);
        showNotification('Proje silinirken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}

// loadProjects fonksiyonu - kartların üzerindeki butonları kaldırıyoruz
async function loadProjects() {
    try {
        const snapshot = await db.collection('projects').orderBy('createdAt', 'desc').get();
        const container = document.querySelector('.project-cards');
        
        container.innerHTML = '';
        allProjects = [];
        
        snapshot.forEach(doc => {
            const project = { id: doc.id, ...doc.data() };
            allProjects.push(project);
            
            const progress = project.progress || 0;
            const card = `
                <div class="project-card" onclick="showProjectDetails('${project.id}')" style="cursor: pointer;">
                    <div class="project-header">
                        <h3>${project.name}</h3>
                        <span class="status ${project.status}">${getStatusText(project.status)}</span>
                    </div>
                    <p class="project-client">
                        <i class="fas fa-user"></i> ${project.client}
                    </p>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <p class="progress-text">${progress}% tamamlandı</p>
                    <div class="project-footer">
                        <span><i class="fas fa-calendar"></i> ${formatDate(project.startDate)}</span>
                        <span><i class="fas fa-money-bill"></i> ₺${(project.budget || 0).toLocaleString('tr-TR')}</span>
                    </div>
                </div>
            `;
            container.innerHTML += card;
        });
    } catch (error) {
        console.error('Load projects error:', error);
        showNotification('Projeler yüklenirken hata oluştu', 'error');
    }
}

// Geliştirilmiş Görev Detay Modal
window.showTaskDetails = function(taskId) {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;
    
    let modal = document.getElementById('taskDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'taskDetailModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    const isEditMode = false;
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header" style="background: linear-gradient(135deg, var(--primary-color), rgba(23,45,76,0.9));">
                <h2 style="color: white;"><i class="fas fa-tasks"></i> Görev Detayları</h2>
                <button class="close-modal" style="color: white;" onclick="closeModal('taskDetailModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="padding: 30px;">
                <div id="taskDetailView">
                    <div style="background: var(--gray-light); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                        <h3 style="color: var(--primary-color); margin-bottom: 20px; font-size: 24px;">
                            ${task.title}
                        </h3>
                        
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                            <div style="background: white; padding: 15px; border-radius: 8px;">
                                <label style="color: var(--gray-dark); font-size: 12px;">Atanan Kişi</label>
                                <p style="margin: 5px 0; font-weight: 600;">${task.assignee}</p>
                            </div>
                            
                            <div style="background: white; padding: 15px; border-radius: 8px;">
                                <label style="color: var(--gray-dark); font-size: 12px;">Öncelik</label>
                                <p style="margin: 5px 0;">
                                    <span class="priority ${task.priority}">${getPriorityText(task.priority)}</span>
                                </p>
                            </div>
                            
                            <div style="background: white; padding: 15px; border-radius: 8px;">
                                <label style="color: var(--gray-dark); font-size: 12px;">Durum</label>
                                <p style="margin: 5px 0;">
                                    <span class="status ${task.status}">${getStatusText(task.status)}</span>
                                </p>
                            </div>
                            
                            <div style="background: white; padding: 15px; border-radius: 8px;">
                                <label style="color: var(--gray-dark); font-size: 12px;">Oluşturma Tarihi</label>
                                <p style="margin: 5px 0; font-weight: 600;">${formatDate(task.createdAt)}</p>
                            </div>
                        </div>
                        
                        <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 20px;">
                            <label style="color: var(--gray-dark); font-size: 12px;">Açıklama</label>
                            <p style="margin: 10px 0; line-height: 1.6;">
                                ${task.description || 'Açıklama bulunmuyor'}
                            </p>
                        </div>
                        
                        ${task.checklist ? `
                            <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 20px;">
                                <label style="color: var(--gray-dark); font-size: 12px;">Yapılacaklar Listesi</label>
                                <ul style="margin: 10px 0; padding-left: 20px;">
                                    ${task.checklist.map(item => `
                                        <li style="margin: 5px 0;">
                                            <input type="checkbox" ${item.done ? 'checked' : ''} disabled> ${item.text}
                                        </li>
                                    `).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button class="btn btn-primary" onclick="toggleTaskEdit('${task.id}')">
                            <i class="fas fa-edit"></i> Düzenle
                        </button>
                        <button class="btn btn-secondary" onclick="closeModal('taskDetailModal')">
                            <i class="fas fa-times"></i> Kapat
                        </button>
                    </div>
                </div>
                
                <div id="taskEditView" style="display: none;">
                    <!-- Düzenleme formu buraya gelecek -->
                </div>
            </div>
        </div>
    `;
    
    openModal('taskDetailModal');
}


// Görev düzenleme toggle
window.toggleTaskEdit = function(taskId) {
    const task = allTasks.find(t => t.id === taskId);
    const detailView = document.getElementById('taskDetailView');
    const editView = document.getElementById('taskEditView');
    
    if (editView.style.display === 'none') {
        detailView.style.display = 'none';
        editView.style.display = 'block';
        editView.innerHTML = `
            <form id="editTaskForm">
                <div class="form-group">
                    <label>Başlık</label>
                    <input type="text" id="editTaskTitle" value="${task.title}" required>
                </div>
                <div class="form-group">
                    <label>Açıklama</label>
                    <textarea id="editTaskDescription">${task.description || ''}</textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Atanan</label>
                        <input type="text" id="editTaskAssignee" value="${task.assignee}" required>
                    </div>
                    <div class="form-group">
                        <label>Öncelik</label>
                        <select id="editTaskPriority">
                            <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Düşük</option>
                            <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Orta</option>
                            <option value="high" ${task.priority === 'high' ? 'selected' : ''}>Yüksek</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Durum</label>
                    <select id="editTaskStatus">
                        <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>Yapılacak</option>
                        <option value="inprogress" ${task.status === 'inprogress' ? 'selected' : ''}>Devam Ediyor</option>
                        <option value="testing" ${task.status === 'testing' ? 'selected' : ''}>Test Bekleyen</option>
                    </select>
                </div>
                <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
                    <button type="submit" class="btn btn-primary">Kaydet</button>
                    <button type="button" class="btn btn-secondary" onclick="toggleTaskEdit('${taskId}')">İptal</button>
                </div>
            </form>
        `;
        
        document.getElementById('editTaskForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await updateTask(taskId);
        });
    } else {
        detailView.style.display = 'block';
        editView.style.display = 'none';
    }
}
// Görev güncelleme
async function updateTask(taskId) {
    showLoading();
    try {
        await db.collection('tasks').doc(taskId).update({
            title: document.getElementById('editTaskTitle').value,
            description: document.getElementById('editTaskDescription').value,
            assignee: document.getElementById('editTaskAssignee').value,
            priority: document.getElementById('editTaskPriority').value,
            status: document.getElementById('editTaskStatus').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification('Görev güncellendi');
        closeModal('taskDetailModal');
        loadTasks();
    } catch (error) {
        showNotification('Güncelleme hatası', 'error');
    } finally {
        hideLoading();
    }
}

// Geliştirilmiş Görev Detay Modal
window.showTaskDetails = function(taskId) {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;
    
    let modal = document.getElementById('taskDetailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'taskDetailModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    const isEditMode = false;
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header" style="background: linear-gradient(135deg, var(--primary-color), rgba(23,45,76,0.9));">
                <h2 style="color: white;"><i class="fas fa-tasks"></i> Görev Detayları</h2>
                <button class="close-modal" style="color: white;" onclick="closeModal('taskDetailModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="padding: 30px;">
                <div id="taskDetailView">
                    <div style="background: var(--gray-light); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                        <h3 style="color: var(--primary-color); margin-bottom: 20px; font-size: 24px;">
                            ${task.title}
                        </h3>
                        
                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                            <div style="background: white; padding: 15px; border-radius: 8px;">
                                <label style="color: var(--gray-dark); font-size: 12px;">Atanan Kişi</label>
                                <p style="margin: 5px 0; font-weight: 600;">${task.assignee}</p>
                            </div>
                            
                            <div style="background: white; padding: 15px; border-radius: 8px;">
                                <label style="color: var(--gray-dark); font-size: 12px;">Öncelik</label>
                                <p style="margin: 5px 0;">
                                    <span class="priority ${task.priority}">${getPriorityText(task.priority)}</span>
                                </p>
                            </div>
                            
                            <div style="background: white; padding: 15px; border-radius: 8px;">
                                <label style="color: var(--gray-dark); font-size: 12px;">Durum</label>
                                <p style="margin: 5px 0;">
                                    <span class="status ${task.status}">${getStatusText(task.status)}</span>
                                </p>
                            </div>
                            
                            <div style="background: white; padding: 15px; border-radius: 8px;">
                                <label style="color: var(--gray-dark); font-size: 12px;">Oluşturma Tarihi</label>
                                <p style="margin: 5px 0; font-weight: 600;">${formatDate(task.createdAt)}</p>
                            </div>
                        </div>
                        
                        <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 20px;">
                            <label style="color: var(--gray-dark); font-size: 12px;">Açıklama</label>
                            <p style="margin: 10px 0; line-height: 1.6;">
                                ${task.description || 'Açıklama bulunmuyor'}
                            </p>
                        </div>
                        
                        ${task.checklist ? `
                            <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 20px;">
                                <label style="color: var(--gray-dark); font-size: 12px;">Yapılacaklar Listesi</label>
                                <ul style="margin: 10px 0; padding-left: 20px;">
                                    ${task.checklist.map(item => `
                                        <li style="margin: 5px 0;">
                                            <input type="checkbox" ${item.done ? 'checked' : ''} disabled> ${item.text}
                                        </li>
                                    `).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: center;">
                        <button class="btn btn-primary" onclick="toggleTaskEdit('${task.id}')">
                            <i class="fas fa-edit"></i> Düzenle
                        </button>
                        <button class="btn btn-secondary" onclick="closeModal('taskDetailModal')">
                            <i class="fas fa-times"></i> Kapat
                        </button>
                    </div>
                </div>
                
                <div id="taskEditView" style="display: none;">
                    <!-- Düzenleme formu buraya gelecek -->
                </div>
            </div>
        </div>
    `;
    
    openModal('taskDetailModal');
}

// Görev düzenleme toggle
window.toggleTaskEdit = function(taskId) {
    const task = allTasks.find(t => t.id === taskId);
    const detailView = document.getElementById('taskDetailView');
    const editView = document.getElementById('taskEditView');
    
    if (editView.style.display === 'none') {
        detailView.style.display = 'none';
        editView.style.display = 'block';
        editView.innerHTML = `
            <form id="editTaskForm">
                <div class="form-group">
                    <label>Başlık</label>
                    <input type="text" id="editTaskTitle" value="${task.title}" required>
                </div>
                <div class="form-group">
                    <label>Açıklama</label>
                    <textarea id="editTaskDescription">${task.description || ''}</textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Atanan</label>
                        <input type="text" id="editTaskAssignee" value="${task.assignee}" required>
                    </div>
                    <div class="form-group">
                        <label>Öncelik</label>
                        <select id="editTaskPriority">
                            <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Düşük</option>
                            <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Orta</option>
                            <option value="high" ${task.priority === 'high' ? 'selected' : ''}>Yüksek</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Durum</label>
                    <select id="editTaskStatus">
                        <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>Yapılacak</option>
                        <option value="inprogress" ${task.status === 'inprogress' ? 'selected' : ''}>Devam Ediyor</option>
                        <option value="completed" ${task.status === 'completed' ? 'selected' : ''}>Tamamlandı</option>
                    </select>
                </div>
                <div style="display: flex; gap: 10px; justify-content: center; margin-top: 20px;">
                    <button type="submit" class="btn btn-primary">Kaydet</button>
                    <button type="button" class="btn btn-secondary" onclick="toggleTaskEdit('${taskId}')">İptal</button>
                </div>
            </form>
        `;
        
        document.getElementById('editTaskForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await updateTask(taskId);
        });
    } else {
        detailView.style.display = 'block';
        editView.style.display = 'none';
    }
}

// Görev güncelleme
async function updateTask(taskId) {
    showLoading();
    try {
        await db.collection('tasks').doc(taskId).update({
            title: document.getElementById('editTaskTitle').value,
            description: document.getElementById('editTaskDescription').value,
            assignee: document.getElementById('editTaskAssignee').value,
            priority: document.getElementById('editTaskPriority').value,
            status: document.getElementById('editTaskStatus').value,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        showNotification('Görev güncellendi');
        closeModal('taskDetailModal');
        loadTasks();
    } catch (error) {
        showNotification('Güncelleme hatası', 'error');
    } finally {
        hideLoading();
    }
}

// Müşteri Düzenleme Modal
window.editCustomer = function(id) {
    const customer = allCustomers.find(c => c.id === id);
    if (!customer) {
        showNotification('Müşteri bulunamadı', 'error');
        return;
    }
    
    let modal = document.getElementById('editCustomerModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'editCustomerModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Müşteri Düzenle</h2>
                <button class="close-modal" onclick="closeModal('editCustomerModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form id="editCustomerForm" class="modal-form">
                <div class="form-row">
                    <div class="form-group">
                        <label>Ad Soyad</label>
                        <input type="text" id="editCustomerName" value="${customer.name || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Şirket</label>
                        <input type="text" id="editCustomerCompany" value="${customer.company || ''}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" id="editCustomerEmail" value="${customer.email || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Telefon</label>
                        <input type="tel" id="editCustomerPhone" value="${customer.phone || ''}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Web Sitesi</label>
                    <input type="url" id="editCustomerWebsite" value="${customer.website || ''}">
                </div>
                <div class="form-group">
                    <label>Adres</label>
                    <textarea id="editCustomerAddress">${customer.address || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Notlar</label>
                    <textarea id="editCustomerNotes">${customer.notes || ''}</textarea>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeModal('editCustomerModal')">İptal</button>
                    <button type="submit" class="btn btn-primary">Güncelle</button>
                </div>
            </form>
        </div>
    `;
    
    // Form event listener ekle
    const form = document.getElementById('editCustomerForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading();
        
        try {
            await db.collection('customers').doc(id).update({
                name: document.getElementById('editCustomerName').value,
                company: document.getElementById('editCustomerCompany').value,
                email: document.getElementById('editCustomerEmail').value,
                phone: document.getElementById('editCustomerPhone').value,
                website: document.getElementById('editCustomerWebsite').value,
                address: document.getElementById('editCustomerAddress').value,
                notes: document.getElementById('editCustomerNotes').value,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showNotification('Müşteri güncellendi');
            closeModal('editCustomerModal');
            loadCustomers();
        } catch (error) {
            console.error('Customer update error:', error);
            showNotification('Güncelleme hatası', 'error');
        } finally {
            hideLoading();
        }
    });
    
    openModal('editCustomerModal');
}

// Fatura Düzenleme Modal
window.editInvoice = function(id) {
    const invoice = allInvoices.find(i => i.id === id);
    if (!invoice) return;
    
    let modal = document.getElementById('editInvoiceModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'editInvoiceModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Fatura Düzenle</h2>
                <button class="close-modal" onclick="closeModal('editInvoiceModal')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form id="editInvoiceForm" class="modal-form">
                <div class="form-group">
                    <label>Müşteri</label>
                    <input type="text" id="editInvoiceCustomer" value="${invoice.customer}" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Tutar</label>
                        <input type="number" id="editInvoiceAmount" value="${invoice.amount}" required>
                    </div>
                    <div class="form-group">
                        <label>KDV (%)</label>
                        <select id="editInvoiceTax">
                            <option value="20" ${invoice.tax == 20 ? 'selected' : ''}>20</option>
                            <option value="10" ${invoice.tax == 10 ? 'selected' : ''}>10</option>
                            <option value="1" ${invoice.tax == 1 ? 'selected' : ''}>1</option>
                            <option value="0" ${invoice.tax == 0 ? 'selected' : ''}>0</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Fatura Tarihi</label>
                        <input type="date" id="editInvoiceDate" value="${invoice.invoiceDate}" required>
                    </div>
                    <div class="form-group">
                        <label>Vade Tarihi</label>
                        <input type="date" id="editInvoiceDueDate" value="${invoice.dueDate}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Durum</label>
                    <select id="editInvoiceStatus">
                        <option value="pending" ${invoice.status === 'pending' ? 'selected' : ''}>Bekliyor</option>
                        <option value="paid" ${invoice.status === 'paid' ? 'selected' : ''}>Ödendi</option>
                        <option value="cancelled" ${invoice.status === 'cancelled' ? 'selected' : ''}>İptal</option>
                    </select>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="closeModal('editInvoiceModal')">İptal</button>
                    <button type="submit" class="btn btn-primary">Güncelle</button>
                </div>
            </form>
        </div>
    `;
    
    document.getElementById('editInvoiceForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading();
        
        try {
            await db.collection('invoices').doc(id).update({
                customer: document.getElementById('editInvoiceCustomer').value,
                amount: parseFloat(document.getElementById('editInvoiceAmount').value),
                tax: parseFloat(document.getElementById('editInvoiceTax').value),
                invoiceDate: document.getElementById('editInvoiceDate').value,
                dueDate: document.getElementById('editInvoiceDueDate').value,
                status: document.getElementById('editInvoiceStatus').value,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            showNotification('Fatura güncellendi');
            closeModal('editInvoiceModal');
            loadInvoices();
        } catch (error) {
            showNotification('Güncelleme hatası', 'error');
        } finally {
            hideLoading();
        }
    });
    
    openModal('editInvoiceModal');
}


// Görevi tamamla - Sadece admin ve manager
window.completeTask = async function(taskId) {
    if (currentUser.role !== 'admin' && currentUser.role !== 'manager') {
        showNotification('Bu işlem için yetkiniz yok', 'error');
        return;
    }
    
    if (!confirm('Bu görevi tamamlanmış olarak onaylamak istediğinizden emin misiniz?')) return;
    
    showLoading();
    try {
        await db.collection('tasks').doc(taskId).update({
            status: 'completed',
            completedAt: firebase.firestore.FieldValue.serverTimestamp(),
            completedBy: currentUser.displayName || currentUser.username
        });
        
        showNotification('Görev tamamlandı olarak işaretlendi');
        closeModal('taskDetailModal');
        loadTasks();
    } catch (error) {
        console.error('Complete task error:', error);
        showNotification('Görev tamamlanırken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}

// Görevi sil
window.deleteTask = async function(taskId) {
    if (!confirm('Bu görevi kalıcı olarak silmek istediğinizden emin misiniz?')) return;
    
    showLoading();
    try {
        await db.collection('tasks').doc(taskId).delete();
        showNotification('Görev silindi');
        loadTasks();
    } catch (error) {
        console.error('Delete task error:', error);
        showNotification('Görev silinirken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}



// Global değişken ekle
let allProposals = [];

// Teklif satırı ekle
window.addProposalItem = function() {
    const container = document.getElementById('proposalItems');
    const newItem = document.createElement('div');
    newItem.className = 'proposal-item';
    newItem.style.cssText = 'display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 10px; margin-bottom: 10px; align-items: end;';
    newItem.innerHTML = `
        <div class="form-group" style="margin: 0;">
            <input type="text" name="itemDescription[]" placeholder="Hizmet açıklaması" required>
        </div>
        <div class="form-group" style="margin: 0;">
            <input type="number" name="itemQuantity[]" value="1" min="1" required onchange="calculateProposalTotal()">
        </div>
        <div class="form-group" style="margin: 0;">
            <input type="number" name="itemPrice[]" placeholder="0.00" step="0.01" required onchange="calculateProposalTotal()">
        </div>
        <button type="button" class="btn-action" onclick="removeProposalItem(this)" style="background: #ef4444; height: 40px;">
            <i class="fas fa-trash"></i>
        </button>
    `;
    container.appendChild(newItem);
}

// Teklif satırı sil
window.removeProposalItem = function(btn) {
    const items = document.querySelectorAll('.proposal-item');
    if (items.length > 1) {
        btn.closest('.proposal-item').remove();
        calculateProposalTotal();
    } else {
        showNotification('En az bir hizmet kalemi olmalı', 'error');
    }
}

// Toplam hesapla
window.calculateProposalTotal = function() {
    const quantities = document.querySelectorAll('input[name="itemQuantity[]"]');
    const prices = document.querySelectorAll('input[name="itemPrice[]"]');
    
    let subtotal = 0;
    quantities.forEach((qty, index) => {
        const quantity = parseFloat(qty.value) || 0;
        const price = parseFloat(prices[index].value) || 0;
        subtotal += quantity * price;
    });
    
    const tax = subtotal * 0.20; // %20 KDV
    const total = subtotal + tax;
    
    document.getElementById('proposalSubtotal').textContent = `₺${subtotal.toLocaleString('tr-TR', {minimumFractionDigits: 2})}`;
    document.getElementById('proposalTax').textContent = `₺${tax.toLocaleString('tr-TR', {minimumFractionDigits: 2})}`;
    document.getElementById('proposalTotal').textContent = `₺${total.toLocaleString('tr-TR', {minimumFractionDigits: 2})}`;
}

async function updateProposalModal() {
    await loadCustomers(); // Müşterileri firestore'dan çekiyor
    
    const select = document.getElementById('proposalCustomerSelect');
    if (select) {
        select.innerHTML = `
            <option value="">Müşteri Seçin</option>
            ${allCustomers.map(customer => 
                `<option value="${customer.id}" data-name="${customer.name}" data-company="${customer.company}" data-email="${customer.email}">
                    ${customer.name} - ${customer.company}
                </option>`
            ).join('')}
        `;
    }
    
    // Bugünden 30 gün sonra default geçerlilik
    const validInput = document.querySelector('input[name="validUntil"]');
    if (validInput) {
        const date = new Date();
        date.setDate(date.getDate() + 30);
        validInput.value = date.toISOString().split('T')[0];
    }
}

async function loadProposals() {
    try {
        const snapshot = await db.collection('proposals').orderBy('createdAt', 'desc').get();
        const tbody = document.getElementById('proposalsTable');
        
        tbody.innerHTML = '';
        allProposals = [];
        
        snapshot.forEach(doc => {
            const proposal = { id: doc.id, ...doc.data() };
            allProposals.push(proposal);
            
            const statusClass = proposal.status === 'accepted' ? 'paid' : 
                                proposal.status === 'rejected' ? 'cancelled' : 'pending';
            
            const row = `
                <tr>
                    <td>#${proposal.proposalNumber || doc.id.substring(0, 6)}</td>
                    <td>${proposal.customerName}</td>
                    <td>₺${proposal.total.toLocaleString('tr-TR')}</td>
                    <td>${formatDate(proposal.createdAt)}</td>
                    <td>${formatDate(proposal.validUntil)}</td>
                    <td><span class="status ${statusClass}">${getProposalStatusText(proposal.status)}</span></td>
                    <td>
                        <button class="btn-action" onclick="viewProposal('${proposal.id}')" title="Görüntüle">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-action" onclick="createRevision('${proposal.id}')" title="Revizyon Hazırla" style="background: #f59e0b;">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action" onclick="downloadProposalPDF('${proposal.id}')" title="PDF İndir">
                            <i class="fas fa-file-pdf"></i>
                        </button>
                        <button class="btn-action" onclick="convertToProject('${proposal.id}')" title="Projeye Dönüştür">
                            <i class="fas fa-project-diagram"></i>
                        </button>
                        <button class="btn-action" onclick="deleteProposal('${proposal.id}')" style="background: #ef4444;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
            tbody.innerHTML += row;
        });
    } catch (error) {
        console.error('Load proposals error:', error);
        showNotification('Teklifler yüklenirken hata oluştu', 'error');
    }
}

async function handleProposalSubmit(e) {
    e.preventDefault();
    showLoading();
    
    try {
        const formData = new FormData(e.target);
        
        // Müşteri bilgilerini al
        const clientId = document.getElementById('proposalClientId').value;
        const clientName = document.getElementById('proposalClientName').value;
        const clientEmail = document.getElementById('proposalClientEmail').value;
        const clientPhone = document.getElementById('proposalClientPhone').value;
        
        // Validasyon
        if (!clientId || !clientName) {
            showNotification('Lütfen bir müşteri seçin', 'error');
            hideLoading();
            return;
        }
        
        // Hizmet kalemlerini topla
        const items = [];
        const descriptions = document.getElementsByName('itemDescription[]');
        const quantities = document.getElementsByName('itemQuantity[]');
        const prices = document.getElementsByName('itemPrice[]');
        
        for (let i = 0; i < descriptions.length; i++) {
            if (descriptions[i].value.trim()) {
                const qty = parseInt(quantities[i].value) || 1;
                const price = parseFloat(prices[i].value) || 0;
                items.push({
                    description: descriptions[i].value.trim(),
                    quantity: qty,
                    unitPrice: price,
                    total: qty * price
                });
            }
        }
        
        if (items.length === 0) {
            showNotification('En az bir hizmet kalemi ekleyin', 'error');
            hideLoading();
            return;
        }
        
        // Hesaplamalar
        const subtotal = items.reduce((sum, item) => sum + item.total, 0);
        const tax = subtotal * 0.20;
        const total = subtotal + tax;
        
        // Sıralı teklif numarası oluştur
        const proposalNumber = await generateProposalNumber(); // BURASI DEĞİŞTİ
        
        // Teklif objesi
        const proposal = {
            proposalNumber: proposalNumber,
            customerId: clientId,
            customerName: clientName,
            customerEmail: clientEmail,
            customerPhone: clientPhone,
            customerCompany: '',
            items: items,
            subtotal: subtotal,
            tax: tax,
            total: total,
            validUntil: formData.get('validUntil'),
            paymentTerms: formData.get('paymentTerms') || '',
            notes: formData.get('notes') || '',
            status: 'pending',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.id
        };
        
        // Firestore'a kaydet
        await db.collection('proposals').add(proposal);
        
        showNotification('Teklif başarıyla oluşturuldu');
        closeModal('proposalModal');
        
        // Formu temizle
        e.target.reset();
        document.getElementById('proposalClientId').value = '';
        document.getElementById('proposalClientName').value = '';
        document.getElementById('proposalClientEmail').value = '';
        document.getElementById('proposalClientPhone').value = '';
        
        // Toplamları sıfırla
        document.getElementById('proposalSubtotal').textContent = '₺0.00';
        document.getElementById('proposalTax').textContent = '₺0.00';
        document.getElementById('proposalTotal').textContent = '₺0.00';
        
        // Teklif listesini yenile
        await loadProposals();
        
    } catch (error) {
        console.error('Teklif kaydetme hatası:', error);
        showNotification('Teklif kaydedilemedi: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}


/**
 * Teklif detayını gösterir ve revizyonları listeler
 * @param {string} proposalId - Teklif ID'si
 */
window.viewProposal = async function(proposalId) {
    showLoading();
    
    try {
        const doc = await db.collection('proposals').doc(proposalId).get();
        const proposal = { id: doc.id, ...doc.data() };
        
        // Şirket ayarlarını yükle
        const settingsDoc = await db.collection('settings').doc('company').get();
        const companySettings = settingsDoc.exists ? settingsDoc.data() : {};
        
        // Revizyonları kontrol et
        const revisionsSnapshot = await db.collection('proposals')
            .where('originalProposalId', '==', proposalId)
            .orderBy('createdAt', 'desc')
            .get();
        
        // Eğer bu bir revizyon ise, orijinal teklifi ve diğer revizyonları bul
        let allRevisions = [];
        let originalProposalId = proposal.originalProposalId || proposalId;
        
        if (proposal.originalProposalId) {
            // Bu bir revizyon, orijinali ve tüm revizyonları getir
            const allRevisionsSnapshot = await db.collection('proposals')
                .where('originalProposalId', '==', proposal.originalProposalId)
                .orderBy('createdAt', 'asc')
                .get();
            
            allRevisionsSnapshot.forEach(doc => {
                allRevisions.push({ id: doc.id, ...doc.data() });
            });
            
            // Orijinal teklifi de ekle
            const origDoc = await db.collection('proposals').doc(proposal.originalProposalId).get();
            if (origDoc.exists) {
                allRevisions.unshift({ id: origDoc.id, ...origDoc.data() });
            }
        } else {
            // Bu orijinal teklif, sadece revizyonları ekle
            revisionsSnapshot.forEach(doc => {
                allRevisions.push({ id: doc.id, ...doc.data() });
            });
        }
        
        let revisionsHTML = '';
        if (allRevisions.length > 0) {
            revisionsHTML = `
                <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                    <strong style="font-size: 16px; color: #92400e;">
                        <i class="fas fa-code-branch"></i> 
                        ${proposal.originalProposalId ? 'Bu teklifin diğer versiyonları' : `Bu teklifin ${allRevisions.length} revizyonu var`}
                    </strong>
                    <div style="margin-top: 15px; display: grid; gap: 10px;">
                        ${allRevisions.map((rev, index) => {
                            const isCurrentProposal = rev.id === proposalId;
                            return `
                                <div style="
                                    padding: 12px 15px; 
                                    background: ${isCurrentProposal ? '#fef3c7' : 'white'}; 
                                    border-radius: 6px; 
                                    display: flex; 
                                    justify-content: space-between; 
                                    align-items: center;
                                    border: 2px solid ${isCurrentProposal ? '#f59e0b' : '#e5e7eb'};
                                ">
                                    <div>
                                        <strong style="color: ${isCurrentProposal ? '#92400e' : '#374151'};">
                                            ${rev.proposalNumber}
                                            ${isCurrentProposal ? ' <span style="font-size: 11px; background: #f59e0b; color: white; padding: 2px 8px; border-radius: 12px;">Görüntülenen</span>' : ''}
                                        </strong>
                                        <span style="margin-left: 15px; color: #6b7280;">₺${rev.total.toLocaleString('tr-TR')}</span>
                                        <span style="margin-left: 10px; font-size: 12px; color: #9ca3af;">${formatDate(rev.createdAt)}</span>
                                    </div>
                                    ${!isCurrentProposal ? `
                                        <button class="btn btn-sm btn-secondary" onclick="viewProposal('${rev.id}')" style="padding: 6px 12px; font-size: 13px;">
                                            <i class="fas fa-eye"></i> Görüntüle
                                        </button>
                                    ` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }
        
        hideLoading();
        
        let modal = document.getElementById('viewProposalModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'viewProposalModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }
        
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header" style="background: linear-gradient(135deg, var(--primary-color), rgba(23,45,76,0.9));">
                    <h2 style="color: white;">
                        <i class="fas fa-file-contract"></i> Teklif Önizleme
                        ${proposal.revisionNumber ? ` - Revizyon ${proposal.revisionNumber}` : ''}
                    </h2>
                    <button class="close-modal" style="color: white;" onclick="closeModal('viewProposalModal')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body" style="padding: 0;">
                    ${revisionsHTML}
                    
                    <!-- Yazdırılacak Alan -->
                    <div id="printableProposal" style="padding: 40px; background: white;">
                        <!-- Üst Başlık -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid var(--primary-color);">
                            <div>
                                <img src="img/logo/500x200.png" alt="FurkaTech" style="max-width: 180px; margin-bottom: 15px;">
                                <p style="margin: 5px 0; font-size: 13px; line-height: 1.6;">
                                    ${companySettings.companyName || 'FurkaTech'}<br>
                                    ${companySettings.address || ''}<br>
                                    ${companySettings.phone || ''}<br>
                                    ${companySettings.email || ''}
                                </p>
                            </div>
                            <div style="text-align: right;">
                                <h1 style="color: var(--primary-color); font-size: 32px; margin: 0 0 10px 0;">
                                    TEKLİF ${proposal.revisionNumber ? `REVİZYON ${proposal.revisionNumber}` : ''}
                                </h1>
                                <div style="background: var(--gray-light); padding: 15px; border-radius: 8px; text-align: left; display: inline-block; min-width: 250px;">
                                    <p style="margin: 5px 0;"><strong>Teklif No:</strong> ${proposal.proposalNumber}</p>
                                    <p style="margin: 5px 0;"><strong>Tarih:</strong> ${formatDate(proposal.createdAt)}</p>
                                    <p style="margin: 5px 0;"><strong>Geçerlilik:</strong> ${formatDate(proposal.validUntil)}</p>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Müşteri Bilgileri -->
                        <div style="margin-bottom: 30px;">
                            <h3 style="color: var(--primary-color); margin-bottom: 15px; border-bottom: 2px solid var(--accent-color); padding-bottom: 8px;">
                                <i class="fas fa-user"></i> MÜŞTERİ BİLGİLERİ
                            </h3>
                            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid var(--accent-color);">
                                <p style="margin: 5px 0; font-size: 16px;"><strong>${proposal.customerName}</strong></p>
                                ${proposal.customerCompany ? `<p style="margin: 5px 0;">${proposal.customerCompany}</p>` : ''}
                                ${proposal.customerEmail ? `<p style="margin: 5px 0;">${proposal.customerEmail}</p>` : ''}
                                ${proposal.customerPhone ? `<p style="margin: 5px 0;">${proposal.customerPhone}</p>` : ''}
                            </div>
                        </div>
                        
                        <!-- Hizmet Kalemleri -->
                        <div style="margin-bottom: 30px;">
                            <h3 style="color: var(--primary-color); margin-bottom: 15px; border-bottom: 2px solid var(--accent-color); padding-bottom: 8px;">
                                <i class="fas fa-list"></i> HİZMET KALEMLERİ
                            </h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <thead>
                                    <tr style="background: var(--primary-color); color: white;">
                                        <th style="padding: 12px; text-align: left; border: 1px solid #ddd;">Hizmet Açıklaması</th>
                                        <th style="padding: 12px; text-align: center; border: 1px solid #ddd; width: 80px;">Adet</th>
                                        <th style="padding: 12px; text-align: right; border: 1px solid #ddd; width: 120px;">Birim Fiyat</th>
                                        <th style="padding: 12px; text-align: right; border: 1px solid #ddd; width: 120px;">Toplam</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${proposal.items.map((item, index) => `
                                        <tr style="background: ${index % 2 === 0 ? 'white' : '#f8f9fa'};">
                                            <td style="padding: 12px; border: 1px solid #ddd;">${item.description}</td>
                                            <td style="padding: 12px; text-align: center; border: 1px solid #ddd;">${item.quantity}</td>
                                            <td style="padding: 12px; text-align: right; border: 1px solid #ddd;">₺${item.unitPrice.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</td>
                                            <td style="padding: 12px; text-align: right; border: 1px solid #ddd; font-weight: 600;">₺${item.total.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                        
                        <!-- Toplam Hesaplama -->
                        <div style="margin-bottom: 30px;">
                            <div style="max-width: 400px; margin-left: auto;">
                                <div style="display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #ddd;">
                                    <span>Ara Toplam:</span>
                                    <strong>₺${proposal.subtotal.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 10px; border-bottom: 1px solid #ddd;">
                                    <span>KDV (%20):</span>
                                    <strong>₺${proposal.tax.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</strong>
                                </div>
                                <div style="display: flex; justify-content: space-between; padding: 15px; background: linear-gradient(135deg, rgba(0,254,251,0.2), rgba(0,254,251,0.1)); border-radius: 8px; margin-top: 10px;">
                                    <span style="font-size: 18px; font-weight: bold;">GENEL TOPLAM:</span>
                                    <strong style="font-size: 22px; color: var(--accent-color);">₺${proposal.total.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</strong>
                                </div>
                            </div>
                        </div>
                        
                        ${proposal.paymentTerms ? `
                            <div style="margin-bottom: 30px;">
                                <h3 style="color: var(--primary-color); margin-bottom: 15px; border-bottom: 2px solid var(--accent-color); padding-bottom: 8px;">
                                    <i class="fas fa-credit-card"></i> ÖDEME KOŞULLARI
                                </h3>
                                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981;">
                                    <p style="margin: 0; line-height: 1.8; white-space: pre-wrap;">${proposal.paymentTerms}</p>
                                </div>
                            </div>
                        ` : ''}
                        
                        ${proposal.notes ? `
                            <div style="margin-bottom: 30px;">
                                <h3 style="color: var(--primary-color); margin-bottom: 15px; border-bottom: 2px solid var(--accent-color); padding-bottom: 8px;">
                                    <i class="fas fa-sticky-note"></i> NOTLAR
                                </h3>
                                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
                                    <p style="margin: 0; line-height: 1.8; white-space: pre-wrap;">${proposal.notes}</p>
                                </div>
                            </div>
                        ` : ''}
                        
                        <!-- Alt Bilgi -->
                        <div style="margin-top: 50px; padding-top: 20px; border-top: 2px solid var(--gray-light); text-align: center; color: var(--gray-dark); font-size: 12px;">
                            <p style="margin: 5px 0;">Bu teklif ${formatDate(proposal.validUntil)} tarihine kadar geçerlidir.</p>
                            <p style="margin: 5px 0;">Herhangi bir sorunuz için bizimle iletişime geçebilirsiniz.</p>
                            <p style="margin: 15px 0 5px 0;"><strong>${companySettings.companyName || 'FurkaTech'}</strong></p>
                        </div>
                    </div>
                    
                    <!-- Alt Butonlar -->
                    <div class="no-print" style="padding: 20px; background: var(--gray-light); border-top: 1px solid var(--gray-medium); display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                        ${proposal.status === 'pending' ? `
                            <button class="btn" style="background: #10b981;" onclick="updateProposalStatus('${proposal.id}', 'accepted')">
                                <i class="fas fa-check"></i> Kabul Edildi
                            </button>
                            <button class="btn" style="background: #ef4444;" onclick="updateProposalStatus('${proposal.id}', 'rejected')">
                                <i class="fas fa-times"></i> Reddedildi
                            </button>
                        ` : `
                            <div style="width: 100%; text-align: center; padding: 15px; background: ${proposal.status === 'accepted' ? '#d1fae5' : '#fee2e2'}; border-radius: 8px;">
                                <strong style="color: ${proposal.status === 'accepted' ? '#065f46' : '#991b1b'}; font-size: 16px;">
                                    ${proposal.status === 'accepted' ? '✓ Teklif Kabul Edildi' : '✗ Teklif Reddedildi'}
                                </strong>
                            </div>
                        `}
                        <button class="btn" style="background: #f59e0b;" onclick="createRevision('${originalProposalId}')">
                            <i class="fas fa-edit"></i> Yeni Revizyon
                        </button>
                        <button class="btn btn-primary" onclick="printProposal()">
                            <i class="fas fa-print"></i> Yazdır
                        </button>
                        <button class="btn btn-secondary" onclick="closeModal('viewProposalModal')">
                            <i class="fas fa-times"></i> Kapat
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        openModal('viewProposalModal');
        
    } catch (error) {
        console.error('Teklif görüntüleme hatası:', error);
        showNotification('Teklif görüntülenemedi', 'error');
        hideLoading();
    }
}

// Teklif yazdırma fonksiyonu
window.printProposal = function() {
    const printContent = document.getElementById('printableProposal');
    const originalContent = document.body.innerHTML;
    
    // Sadece teklifi göster
    document.body.innerHTML = printContent.outerHTML;
    
    // Yazdır
    window.print();
    
    // Sayfayı geri yükle
    document.body.innerHTML = originalContent;
    
    // Event listener'ları yeniden yükle
    initializeEventListeners();
    loadProposals();
}

// Teklif durumu güncelle
window.updateProposalStatus = async function(proposalId, status) {
    showLoading();
    try {
        await db.collection('proposals').doc(proposalId).update({
            status: status,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showNotification(`Teklif ${status === 'accepted' ? 'kabul edildi' : 'reddedildi'}`);
        closeModal('viewProposalModal');
        loadProposals();
    } catch (error) {
        showNotification('Durum güncellenirken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}

// Teklifi projeye dönüştür
window.convertToProject = async function(proposalId) {
    if (!confirm('Bu teklifi projeye dönüştürmek istediğinizden emin misiniz?')) return;
    
    showLoading();
    const doc = await db.collection('proposals').doc(proposalId).get();
    const proposal = { id: doc.id, ...doc.data() };
    
    const project = {
        name: `${proposal.customerCompany} - Proje`,
        client: proposal.customerName,
        customerId: proposal.customerId,
        budget: proposal.total,
        currentBudget: proposal.total,
        startDate: new Date().toISOString().split('T')[0],
        endDate: '', // Kullanıcı sonra ekler
        status: 'active',
        progress: 0,
        createdFromProposal: proposalId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: currentUser.id
    };
    
    try {
        await db.collection('projects').add(project);
        await db.collection('proposals').doc(proposalId).update({
            status: 'accepted',
            convertedToProject: true
        });
        showNotification('Teklif projeye dönüştürüldü');
        loadProposals();
        loadProjects();
    } catch (error) {
        showNotification('Dönüştürme hatası', 'error');
    } finally {
        hideLoading();
    }
}

// PDF indirme (basit yazdırma)
window.downloadProposalPDF = function(proposalId) {
    viewProposal(proposalId).then(() => {
        setTimeout(() => window.print(), 500);
    });
}

// Teklif sil
window.deleteProposal = async function(proposalId) {
    if (!confirm('Bu teklifi silmek istediğinizden emin misiniz?')) return;
    
    showLoading();
    try {
        await db.collection('proposals').doc(proposalId).delete();
        showNotification('Teklif silindi');
        loadProposals();
    } catch (error) {
        showNotification('Silme hatası', 'error');
    } finally {
        hideLoading();
    }
}

// Helper fonksiyon
function getProposalStatusText(status) {
    const statusMap = {
        'pending': 'Bekliyor',
        'accepted': 'Kabul Edildi',
        'rejected': 'Reddedildi'
    };
    return statusMap[status] || status;
}

function openClientSelectionModal() {
    const modal = document.getElementById('clientSelectionModal');
    const clientList = document.getElementById('clientListForSelection');
    
    // Liste içeriğini temizle
    clientList.innerHTML = '';
    
    // Firestore'dan müşterileri çek
    db.collection('customers').get().then((snapshot) => {
        if (snapshot.empty) {
            clientList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: var(--gray-dark);">
                    <i class="fas fa-users" style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;"></i>
                    <p style="font-size: 16px; margin-bottom: 10px;">Henüz müşteri eklenmemiş.</p>
                    <p style="font-size: 12px;">Yeni müşteri eklemek için aşağıdaki butona tıklayın.</p>
                </div>
            `;
        } else {
            // Müşterileri listele
            snapshot.forEach((doc) => {
                const client = doc.data();
                const clientCard = document.createElement('div');
                clientCard.className = 'client-selection-card';
                
                // Güvenli veri işleme (tek tırnak problemini çözmek için)
                const safeName = (client.name || '').replace(/'/g, "\\'");
                const safeEmail = (client.email || '').replace(/'/g, "\\'");
                const safePhone = (client.phone || '').replace(/'/g, "\\'");
                const safeCompany = (client.company || '').replace(/'/g, "\\'");
                
                clientCard.innerHTML = `
                    <div class="client-selection-info">
                        <div class="client-avatar-small">${client.name.charAt(0).toUpperCase()}</div>
                        <div class="client-details">
                            <h4>${client.name}</h4>
                            <p><i class="fas fa-building"></i> ${client.company || 'Şirket bilgisi yok'}</p>
                            <p><i class="fas fa-envelope"></i> ${client.email}</p>
                            <p><i class="fas fa-phone"></i> ${client.phone}</p>
                        </div>
                    </div>
                    <button class="btn btn-primary btn-sm" 
                            data-client-id="${doc.id}"
                            data-client-name="${safeName}"
                            data-client-email="${safeEmail}"
                            data-client-phone="${safePhone}"
                            data-client-company="${safeCompany}"
                            onclick="selectClientFromButton(this)">
                        <i class="fas fa-check"></i> Seç
                    </button>
                `;
                clientList.appendChild(clientCard);
            });
        }
        
        // Modalı göster
        modal.classList.add('active');
        
    }).catch((error) => {
        console.error('Müşteriler yüklenirken hata:', error);
        showNotification('error', 'Müşteriler yüklenemedi');
    });
}


/**
 * Button'dan müşteri bilgilerini alıp seçer - DÜZELTİLMİŞ VERSİYON
 * @param {HTMLElement} button - Tıklanan buton elementi
 */
function selectClientFromButton(button) {
    const clientId = button.getAttribute('data-client-id');
    const clientName = button.getAttribute('data-client-name');
    const clientEmail = button.getAttribute('data-client-email');
    const clientPhone = button.getAttribute('data-client-phone');
    const clientCompany = button.getAttribute('data-client-company');
    
    // Form alanlarını doldur
    document.getElementById('proposalClientName').value = clientName;
    document.getElementById('proposalClientId').value = clientId;
    document.getElementById('proposalClientEmail').value = clientEmail;
    document.getElementById('proposalClientPhone').value = clientPhone;
    
    // Başarı bildirimi
    showNotification('success', `${clientName} seçildi`);
    
    // Modalı kapat
    closeClientSelectionModal();
}



/**
@param {string} clientId -
 */
function selectClient(clientId) {
    // Müşteri verilerini çek
    const clients = JSON.parse(localStorage.getItem('clients') || '[]');
    const selectedClient = clients.find(c => c.id === clientId);
    
    if (selectedClient) {
        // Formdaki müşteri bilgilerini doldur
        document.getElementById('proposalClient').value = selectedClient.name;
        document.getElementById('proposalClientEmail').value = selectedClient.email;
        document.getElementById('proposalClientPhone').value = selectedClient.phone;
        document.getElementById('proposalClientAddress').value = selectedClient.address || '';
        
        // Seçilen müşteri ID'sini sakla (ihtiyaç olursa)
        document.getElementById('proposalClient').setAttribute('data-client-id', clientId);
        
        // Başarı bildirimi göster
        showNotification('success', `${selectedClient.name} müşterisi seçildi`);
        
        // Modalı kapat
        closeClientSelectionModal();
    }
}


function closeClientSelectionModal() {
    const modal = document.getElementById('clientSelectionModal');
    modal.classList.remove('active');
}



function addNewClientFromSelection() {
    // Müşteri seçim modalını kapat
    closeClientSelectionModal();
    
    // Teklif modalını kapat
    closeModal('proposalModal');
    
    // Müşteriler sekmesini aktif et
    // Önce tüm sekmeleri ve nav itemları pasif yap
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Customers bölümünü aktif et
    document.getElementById('customers').classList.add('active');
    document.querySelector('[data-section="customers"]').classList.add('active');
    
    // Sayfa başlığını güncelle
    document.querySelector('.page-title').textContent = 'Müşteriler';
    
    // Kısa gecikme sonrası müşteri modalını aç
    setTimeout(() => {
        openModal('customerModal');
        showNotification('info', 'Yeni müşteri bilgilerini girin');
    }, 300);
}

function filterClients() {
    const searchInput = document.getElementById('clientSearchInput');
    const searchTerm = searchInput.value.toLowerCase().trim();
    const clientCards = document.querySelectorAll('.client-selection-card');
    
    clientCards.forEach(card => {
        const clientName = card.querySelector('h4').textContent.toLowerCase();
        const clientEmail = card.querySelector('.client-details p:nth-child(2)').textContent.toLowerCase();
        const clientPhone = card.querySelector('.client-details p:nth-child(3)').textContent.toLowerCase();
        
        // Arama terimine göre filtrele
        if (clientName.includes(searchTerm) || 
            clientEmail.includes(searchTerm) || 
            clientPhone.includes(searchTerm)) {
            card.style.display = 'flex';
        } else {
            card.style.display = 'none';
        }
    });
    
    // Hiç sonuç yoksa bilgi göster
    const visibleCards = Array.from(clientCards).filter(card => card.style.display !== 'none');
    const clientList = document.getElementById('clientListForSelection');
    
    // Önceki "sonuç yok" mesajını temizle
    const noResultMsg = clientList.querySelector('.no-result-message');
    if (noResultMsg) {
        noResultMsg.remove();
    }
    
    if (visibleCards.length === 0 && searchTerm !== '') {
        const noResultDiv = document.createElement('div');
        noResultDiv.className = 'no-result-message';
        noResultDiv.style.cssText = 'text-align: center; padding: 40px; color: var(--gray-dark);';
        noResultDiv.innerHTML = `
            <i class="fas fa-search" style="font-size: 48px; margin-bottom: 15px; opacity: 0.3;"></i>
            <p>Aradığınız kriterlere uygun müşteri bulunamadı.</p>
            <p style="font-size: 12px; margin-top: 10px;">"${searchTerm}" için sonuç yok.</p>
        `;
        clientList.appendChild(noResultDiv);
    }
}


/**
 * Mevcut tekliften revizyon oluşturur
 * @param {string} originalProposalId - Orijinal teklif ID'si
 */
window.createRevision = async function(originalProposalId) {
    showLoading();
    
    try {
        // Orijinal teklifi getir
        const doc = await db.collection('proposals').doc(originalProposalId).get();
        
        if (!doc.exists) {
            showNotification('Teklif bulunamadı', 'error');
            hideLoading();
            return;
        }
        
        const originalProposal = { id: doc.id, ...doc.data() };
        
        // Revizyon sayısını hesapla
        const revisionSnapshot = await db.collection('proposals')
            .where('originalProposalId', '==', originalProposalId)
            .get();
        const revisionNumber = revisionSnapshot.size + 1;
        
        hideLoading();
        
        // Önce view modalını kapat (eğer açıksa)
        closeModal('viewProposalModal');
        
        // Teklif modalını aç
        openModal('proposalModal');
        
        // Kısa gecikme ile form alanlarını doldur
        setTimeout(() => {
            // Müşteri bilgilerini doldur
            document.getElementById('proposalClientId').value = originalProposal.customerId || '';
            document.getElementById('proposalClientName').value = originalProposal.customerName || '';
            document.getElementById('proposalClientEmail').value = originalProposal.customerEmail || '';
            document.getElementById('proposalClientPhone').value = originalProposal.customerPhone || '';
            
            // Geçerlilik tarihini güncelle (30 gün sonra)
            const validDate = new Date();
            validDate.setDate(validDate.getDate() + 30);
            document.querySelector('input[name="validUntil"]').value = validDate.toISOString().split('T')[0];
            
            // Ödeme koşulları
            const paymentTermsTextarea = document.querySelector('textarea[name="paymentTerms"]');
            if (paymentTermsTextarea) {
                paymentTermsTextarea.value = originalProposal.paymentTerms || '';
            }
            
            // Notları güncelle (revizyon bilgisiyle)
            const notesTextarea = document.querySelector('textarea[name="notes"]');
            if (notesTextarea) {
                notesTextarea.value = `REVİZYON ${revisionNumber} - Orijinal Teklif: ${originalProposal.proposalNumber}\n\n${originalProposal.notes || ''}`;
            }
            
            // Hizmet kalemlerini temizle
            const itemsContainer = document.getElementById('proposalItems');
            itemsContainer.innerHTML = '';
            
            // Orijinal kalemleri ekle
            if (originalProposal.items && originalProposal.items.length > 0) {
                originalProposal.items.forEach(item => {
                    const newItem = document.createElement('div');
                    newItem.className = 'proposal-item';
                    newItem.style.cssText = 'display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 10px; margin-bottom: 10px; align-items: end;';
                    newItem.innerHTML = `
                        <div class="form-group" style="margin: 0;">
                            <input type="text" name="itemDescription[]" value="${item.description || ''}" required>
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <input type="number" name="itemQuantity[]" value="${item.quantity || 1}" min="1" required onchange="calculateProposalTotal()">
                        </div>
                        <div class="form-group" style="margin: 0;">
                            <input type="number" name="itemPrice[]" value="${item.unitPrice || item.price || 0}" step="0.01" required onchange="calculateProposalTotal()">
                        </div>
                        <button type="button" class="btn-action" onclick="removeProposalItem(this)" style="background: #ef4444; height: 40px;">
                            <i class="fas fa-trash"></i>
                        </button>
                    `;
                    itemsContainer.appendChild(newItem);
                });
            }
            
            // Toplamları hesapla
            calculateProposalTotal();
            
            // Form submit'i güncelle (revizyon için)
            const form = document.getElementById('proposalForm');
            
            // Eski event listener'ı kaldır
            const newForm = form.cloneNode(true);
            form.parentNode.replaceChild(newForm, form);
            
            // Yeni event listener ekle
            document.getElementById('proposalForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                showLoading();
                
                try {
                    const formData = new FormData(e.target);
                    
                    // Müşteri bilgileri
                    const clientId = document.getElementById('proposalClientId').value;
                    const clientName = document.getElementById('proposalClientName').value;
                    
                    if (!clientId || !clientName) {
                        showNotification('Lütfen bir müşteri seçin', 'error');
                        hideLoading();
                        return;
                    }
                    
                    // Hizmet kalemleri
                    const items = [];
                    const descriptions = document.getElementsByName('itemDescription[]');
                    const quantities = document.getElementsByName('itemQuantity[]');
                    const prices = document.getElementsByName('itemPrice[]');
                    
                    for (let i = 0; i < descriptions.length; i++) {
                        if (descriptions[i].value.trim()) {
                            const qty = parseInt(quantities[i].value) || 1;
                            const price = parseFloat(prices[i].value) || 0;
                            items.push({
                                description: descriptions[i].value.trim(),
                                quantity: qty,
                                unitPrice: price,
                                total: qty * price
                            });
                        }
                    }
                    
                    if (items.length === 0) {
                        showNotification('En az bir hizmet kalemi ekleyin', 'error');
                        hideLoading();
                        return;
                    }
                    
                    // Hesaplamalar
                    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
                    const tax = subtotal * 0.20;
                    const total = subtotal + tax;
                    
                    // Revizyon teklifi oluştur
                    const revisionProposal = {
                        proposalNumber: `${originalProposal.proposalNumber}-R${revisionNumber}`,
                        originalProposalId: originalProposalId,
                        revisionNumber: revisionNumber,
                        customerId: clientId,
                        customerName: clientName,
                        customerEmail: document.getElementById('proposalClientEmail').value,
                        customerPhone: document.getElementById('proposalClientPhone').value,
                        customerCompany: originalProposal.customerCompany || '',
                        items: items,
                        subtotal: subtotal,
                        tax: tax,
                        total: total,
                        validUntil: formData.get('validUntil'),
                        paymentTerms: formData.get('paymentTerms') || '',
                        notes: formData.get('notes') || '',
                        status: 'pending',
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        createdBy: currentUser.id
                    };
                    
                    // Firestore'a kaydet
                    await db.collection('proposals').add(revisionProposal);
                    
                    showNotification(`Revizyon ${revisionNumber} başarıyla oluşturuldu`);
                    closeModal('proposalModal');
                    
                    // Formu temizle
                    e.target.reset();
                    document.getElementById('proposalClientId').value = '';
                    document.getElementById('proposalClientName').value = '';
                    document.getElementById('proposalClientEmail').value = '';
                    document.getElementById('proposalClientPhone').value = '';
                    
                    // Toplamları sıfırla
                    document.getElementById('proposalSubtotal').textContent = '₺0.00';
                    document.getElementById('proposalTax').textContent = '₺0.00';
                    document.getElementById('proposalTotal').textContent = '₺0.00';
                    
                    // Event listener'ı normal haline döndür
                    const normalForm = document.getElementById('proposalForm');
                    const resetForm = normalForm.cloneNode(true);
                    normalForm.parentNode.replaceChild(resetForm, normalForm);
                    document.getElementById('proposalForm').addEventListener('submit', handleProposalSubmit);
                    
                    // Teklif listesini yenile
                    await loadProposals();
                    
                } catch (error) {
                    console.error('Revizyon kaydetme hatası:', error);
                    showNotification('Revizyon kaydedilemedi: ' + error.message, 'error');
                } finally {
                    hideLoading();
                }
            });
            
            showNotification(`Revizyon ${revisionNumber} hazırlanıyor...`);
        }, 400);
        
    } catch (error) {
        console.error('Revizyon hazırlama hatası:', error);
        showNotification('Revizyon hazırlanamadı: ' + error.message, 'error');
        hideLoading();
    }
}

/**
 * Sıralı teklif numarası oluşturur
 * @returns {Promise<string>} - FZA-TKL-0001 formatında numara
 */
async function generateProposalNumber() {
    try {
        // Son teklifi al (en yüksek numarayı bulmak için)
        const snapshot = await db.collection('proposals')
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();
        
        let nextNumber = 1;
        
        if (!snapshot.empty) {
            const lastProposal = snapshot.docs[0].data();
            const lastNumber = lastProposal.proposalNumber;
            
            // Numarayı parse et (FZA-TKL-0001 -> 0001)
            if (lastNumber && lastNumber.includes('FZA-TKL-')) {
                const match = lastNumber.match(/FZA-TKL-(\d+)/);
                if (match && match[1]) {
                    nextNumber = parseInt(match[1]) + 1;
                }
            }
        }
        
        // 4 haneli formata çevir (1 -> 0001)
        const paddedNumber = nextNumber.toString().padStart(4, '0');
        
        return `FZA-TKL-${paddedNumber}`;
        
    } catch (error) {
        console.error('Teklif numarası oluşturma hatası:', error);
        // Hata durumunda timestamp kullan
        return 'FZA-TKL-' + Date.now();
    }
}