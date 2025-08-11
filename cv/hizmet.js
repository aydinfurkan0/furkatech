// Utility Functions
/**
 * Simple debounce function for performance optimization
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Smooth scroll to element with offset for fixed header
 */
function scrollToElement(target, offset = 80) {
    const element = document.querySelector(target);
    if (element) {
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    }
}

/**
 * Email validation regex
 */
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Phone validation regex (Turkish format)
 */
const phoneRegex = /^(\+90|0)?[5][0-9]{9}$/;

// Navigation & Header
class Navigation {
    constructor() {
        this.header = document.querySelector('.header');
        this.navToggle = document.getElementById('nav-toggle');
        this.navMenu = document.getElementById('nav-menu');
        this.navLinks = document.querySelectorAll('.nav__link');
        
        this.init();
    }
    
    init() {
        this.setupScrollEffect();
        this.setupMobileMenu();
        this.setupSmoothScrolling();
        this.setupActiveSection();
    }
    
    setupScrollEffect() {
        const handleScroll = debounce(() => {
            if (window.scrollY > 50) {
                this.header.classList.add('header--scrolled');
            } else {
                this.header.classList.remove('header--scrolled');
            }
        }, 10);
        
        window.addEventListener('scroll', handleScroll);
    }
    
    setupMobileMenu() {
        if (this.navToggle) {
            this.navToggle.addEventListener('click', () => {
                this.toggleMobileMenu();
            });
        }
        
        this.navLinks.forEach(link => {
            link.addEventListener('click', () => {
                this.closeMobileMenu();
            });
        });
        
        document.addEventListener('click', (e) => {
            if (!this.navMenu.contains(e.target) && !this.navToggle.contains(e.target)) {
                this.closeMobileMenu();
            }
        });
    }
    
    toggleMobileMenu() {
        this.navMenu.classList.toggle('nav__menu--open');
        this.navToggle.setAttribute(
            'aria-expanded', 
            this.navMenu.classList.contains('nav__menu--open').toString()
        );
        
        const icon = this.navToggle.querySelector('use');
        if (icon) {
            const isOpen = this.navMenu.classList.contains('nav__menu--open');
            icon.setAttribute('xlink:href', isOpen ? '#icon-close' : '#icon-menu');
        }
    }
    
    closeMobileMenu() {
        this.navMenu.classList.remove('nav__menu--open');
        this.navToggle.setAttribute('aria-expanded', 'false');
        
        const icon = this.navToggle.querySelector('use');
        if (icon) {
            icon.setAttribute('xlink:href', '#icon-menu');
        }
    }
    
    setupSmoothScrolling() {
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href.startsWith('#')) {
                    e.preventDefault();
                    scrollToElement(href);
                }
            });
        });
    }
    
    setupActiveSection() {
        const sections = document.querySelectorAll('section[id]');
        
        const handleScroll = debounce(() => {
            let current = '';
            
            sections.forEach(section => {
                const sectionTop = section.getBoundingClientRect().top;
                if (sectionTop <= 100) {
                    current = section.getAttribute('id');
                }
            });
            
            this.navLinks.forEach(link => {
                link.classList.remove('nav__link--active');
                if (link.getAttribute('href') === `#${current}`) {
                    link.classList.add('nav__link--active');
                }
            });
        }, 100);
        
        window.addEventListener('scroll', handleScroll);
    }
}

// Modals
class ModalManager {
    constructor() {
        this.modals = new Map();
        this.init();
    }
    
    init() {
        this.registerModal('quote', document.getElementById('quote-modal'));
        this.registerModal('demo', document.getElementById('demo-modal'));
        this.registerModal('service', document.getElementById('service-modal'));
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
    }
    
    registerModal(name, element) {
        if (element) {
            this.modals.set(name, element);
        }
    }
    
    openModal(name) {
        const modal = this.modals.get(name);
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            const firstInput = modal.querySelector('input, textarea, select, button');
            if (firstInput) {
                setTimeout(() => firstInput.focus(), 100);
            }
        }
    }
    
    closeModal(name) {
        const modal = this.modals.get(name);
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }
    
    closeAllModals() {
        this.modals.forEach((modal, name) => {
            this.closeModal(name);
        });
    }
}

// Service Details
class ServiceDetails {
    constructor() {
        this.serviceContent = {
            erp: {
                title: 'ERP Çözümleri',
                content: `
                    <h3>Entegre İşletme Yönetimi</h3>
                    <p>Modern ERP sistemimiz ile tüm iş süreçlerinizi tek platformda yönetin.</p>
                    <h4>Temel Modüller</h4>
                    <ul>
                        <li><strong>Stok Yönetimi:</strong> Gerçek zamanlı stok takibi, otomatik sipariş bildirimleri</li>
                        <li><strong>Üretim Planlama:</strong> Kapasite planlama, iş emri takibi</li>
                        <li><strong>Finans:</strong> Muhasebe entegrasyonu, maliyet analizi</li>
                        <li><strong>İnsan Kaynakları:</strong> Personel yönetimi, bordro sistemi</li>
                        <li><strong>CRM:</strong> Müşteri ilişkileri yönetimi</li>
                    </ul>
                    <h4>Özellikler</h4>
                    <ul>
                        <li>Bulut tabanlı veya kurumsal sunucu seçenekleri</li>
                        <li>Mobil uygulama desteği</li>
                        <li>Özelleştirilebilir raporlama</li>
                        <li>API entegrasyonları</li>
                        <li>7/24 teknik destek</li>
                    </ul>
                    <div style="margin-top: 2rem;">
                        <button class="btn btn--primary" onclick="openModal('demo')">Demo Talep Et</button>
                        <button class="btn btn--outline" onclick="openModal('quote')">Teklif Al</button>
                    </div>
                `
            },
            web: {
                title: 'Web Yazılım Geliştirme',
                content: `
                    <h3>Özel Web Uygulamaları</h3>
                    <p>İhtiyaçlarınıza özel, ölçeklenebilir ve güvenli web uygulamaları geliştiriyoruz.</p>
                    <h4>Teknolojiler</h4>
                    <ul>
                        <li><strong>Frontend:</strong> React, Vue.js, Angular</li>
                        <li><strong>Backend:</strong> Node.js, Python, PHP</li>
                        <li><strong>Veritabanı:</strong> PostgreSQL, MySQL, MongoDB</li>
                        <li><strong>Cloud:</strong> AWS, Google Cloud, Azure</li>
                    </ul>
                    <h4>Hizmetlerimiz</h4>
                    <ul>
                        <li>E-ticaret platformları</li>
                        <li>Kurumsal web uygulamaları</li>
                        <li>API geliştirme ve entegrasyon</li>
                        <li>Mobil uyumlu responsive tasarım</li>
                        <li>Güvenlik testleri ve optimizasyon</li>
                    </ul>
                    <h4>Süreç</h4>
                    <ol>
                        <li>İhtiyaç analizi ve proje planlama</li>
                        <li>UI/UX tasarım</li>
                        <li>Geliştirme ve test</li>
                        <li>Canlıya alma ve eğitim</li>
                        <li>Sürekli destek ve bakım</li>
                    </ol>
                    <div style="margin-top: 2rem;">
                        <button class="btn btn--primary" onclick="openModal('quote')">Proje Teklifi Al</button>
                    </div>
                `
            },
            seo: {
                title: 'Google SEO Hizmetleri',
                content: `
                    <h3>Arama Motoru Optimizasyonu</h3>
                    <p>Google'da üst sıralarda yer alarak organik trafiğinizi artırın.</p>
                    <h4>SEO Hizmetlerimiz</h4>
                    <ul>
                        <li><strong>Teknik SEO:</strong> Site hızı, mobil uyumluluk, yapısal veri</li>
                        <li><strong>İçerik SEO:</strong> Anahtar kelime araştırması, içerik optimizasyonu</li>
                        <li><strong>Link Building:</strong> Kaliteli backlink kazanımı</li>
                        <li><strong>Yerel SEO:</strong> Google My Business optimizasyonu</li>
                    </ul>
                    <h4>SEO Süreci</h4>
                    <ol>
                        <li><strong>Site Analizi:</strong> Mevcut durumun detaylı incelenmesi</li>
                        <li><strong>Anahtar Kelime Araştırması:</strong> En değerli terimlerin belirlenmesi</li>
                        <li><strong>Teknik Optimizasyon:</strong> Site altyapısının iyileştirilmesi</li>
                        <li><strong>İçerik Stratejisi:</strong> SEO uyumlu içerik planlaması</li>
                        <li><strong>İzleme ve Raporlama:</strong> Düzenli performans takibi</li>
                    </ol>
                    <h4>Beklenen Sonuçlar</h4>
                    <ul>
                        <li>3-6 ay içinde sıralamada iyileşme</li>
                        <li>Organik trafikte %100-300 artış</li>
                        <li>Dönüşüm oranında artış</li>
                        <li>Marka bilinirliğinde artış</li>
                    </ul>
                    <div style="margin-top: 2rem;">
                        <button class="btn btn--primary" onclick="openModal('quote')">SEO Analizi Talep Et</button>
                    </div>
                `
            },
            maps: {
                title: 'Google Haritalar Optimizasyonu',
                content: `
                    <h3>Yerel Arama Görünürlüğü</h3>
                    <p>Google haritalarda üst sıralarda yer alarak yerel müşterilerinize ulaşın.</p>
                    <h4>Hizmetlerimiz</h4>
                    <ul>
                        <li><strong>Google Business Profile:</strong> Kurulum ve optimizasyon</li>
                        <li><strong>Kategori Optimizasyonu:</strong> Doğru kategorilerde yer alma</li>
                        <li><strong>Fotoğraf Yönetimi:</strong> Kaliteli görsel içerik</li>
                        <li><strong>Yorum Yönetimi:</strong> Müşteri yorumlarına yanıt</li>
                        <li><strong>Yerel Citation:</strong> Yerel dizinlerde yer alma</li>
                    </ul>
                    <h4>Optimizasyon Süreci</h4>
                    <ol>
                        <li>Google Business Profile doğrulama</li>
                        <li>İşletme bilgilerinin eksiksiz doldurulması</li>
                        <li>Kategori ve hizmet alanlarının belirlenmesi</li>
                        <li>Görsel içerik optimizasyonu</li>
                        <li>Düzenli güncelleme ve yönetim</li>
                    </ol>
                    <h4>Beklenen Faydalar</h4>
                    <ul>
                        <li>Yerel aramalarda üst sıralarda yer alma</li>
                        <li>Mağaza ziyaretlerinde artış</li>
                        <li>Telefon aramalarında artış</li>
                        <li>Online görünürlükte iyileşme</li>
                        <li>Müşteri güveninin artması</li>
                    </ul>
                    <div style="margin-top: 2rem;">
                        <button class="btn btn--primary" onclick="openModal('quote')">Harita Optimizasyonu Talep Et</button>
                    </div>
                `
            },
            ranking: {
                title: 'Google Arama Sıralaması',
                content: `
                    <h3>Arama Sonuçlarında Üst Sıralar</h3>
                    <p>Hedef anahtar kelimelerinizde Google'da ilk sayfada yer alın.</p>
                    <h4>Strateji Yaklaşımımız</h4>
                    <ul>
                        <li><strong>Rekabet Analizi:</strong> Rakiplerinizin güçlü/zayıf yönleri</li>
                        <li><strong>Anahtar Kelime Stratejisi:</strong> Yüksek değerli terimlere odaklanma</li>
                        <li><strong>İçerik Kalitesi:</strong> Kullanıcı odaklı değerli içerik</li>
                        <li><strong>Teknik Mükemmellik:</strong> Hızlı ve optimize site</li>
                        <li><strong>Authority Building:</strong> Domain otoritesi güçlendirme</li>
                    </ul>
                    <h4>Çalışma Metodumuz</h4>
                    <ol>
                        <li><strong>Başlangıç Analizi:</strong> Mevcut durum tespiti</li>
                        <li><strong>Hedef Belirleme:</strong> Ulaşılabilir ve ölçülebilir hedefler</li>
                        <li><strong>Strateji Geliştirme:</strong> Özel sıralama stratejisi</li>
                        <li><strong>Uygulama:</strong> Planın sistematik uygulanması</li>
                        <li><strong>Takip ve Optimizasyon:</strong> Sürekli iyileştirme</li>
                    </ol>
                    <h4>Performans Metrikleri</h4>
                    <ul>
                        <li>Anahtar kelime sıralamalarında iyileşme</li>
                        <li>Organik trafik artışı</li>
                        <li>Click-through rate (CTR) iyileşmesi</li>
                        <li>Dönüşüm oranında artış</li>
                        <li>SERP görünürlük oranı</li>
                    </ul>
                    <div style="margin-top: 2rem;">
                        <button class="btn btn--primary" onclick="openModal('quote')">Sıralama Analizi İste</button>
                    </div>
                `
            }
        };
    }
    
    openServiceModal(service) {
        const content = this.serviceContent[service];
        if (content) {
            const modalContent = document.getElementById('service-modal-content');
            modalContent.innerHTML = `
                <h2>${content.title}</h2>
                ${content.content}
            `;
            modalManager.openModal('service');
        }
    }
    
    closeServiceModal() {
        modalManager.closeModal('service');
    }
}

// Testimonials Slider
class TestimonialSlider {
    constructor() {
        this.slider = document.getElementById('testimonials-slider');
        this.testimonials = document.querySelectorAll('.testimonial');
        this.currentIndex = 0;
        this.autoPlayInterval = null;
        
        if (this.testimonials.length > 0) {
            this.init();
        }
    }
    
    init() {
        this.startAutoPlay();
        this.setupKeyboardNavigation();
    }
    
    showTestimonial(index) {
        this.testimonials.forEach((testimonial, i) => {
            testimonial.classList.toggle('active', i === index);
        });
        this.currentIndex = index;
    }
    
    nextTestimonial() {
        const nextIndex = (this.currentIndex + 1) % this.testimonials.length;
        this.showTestimonial(nextIndex);
    }
    
    previousTestimonial() {
        const prevIndex = (this.currentIndex - 1 + this.testimonials.length) % this.testimonials.length;
        this.showTestimonial(prevIndex);
    }
    
    startAutoPlay() {
        this.autoPlayInterval = setInterval(() => {
            this.nextTestimonial();
        }, 5000);
    }
    
    stopAutoPlay() {
        if (this.autoPlayInterval) {
            clearInterval(this.autoPlayInterval);
            this.autoPlayInterval = null;
        }
    }
    
    setupKeyboardNavigation() {
        if (this.slider) {
            this.slider.setAttribute('tabindex', '0'); // Make slider focusable
            this.slider.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowLeft') {
                    this.previousTestimonial();
                    this.stopAutoPlay();
                } else if (e.key === 'ArrowRight') {
                    this.nextTestimonial();
                    this.stopAutoPlay();
                }
            });
        }
    }
}

// FAQ Accordion
class FAQAccordion {
    constructor() {
        this.faqItems = document.querySelectorAll('.faq-item__question');
        this.init();
    }
    
    init() {
        this.faqItems.forEach(question => {
            question.addEventListener('click', () => {
                this.toggleFaq(question);
            });
        });
    }
    
    toggleFaq(questionElement) {
        const isExpanded = questionElement.getAttribute('aria-expanded') === 'true';
        const answer = questionElement.nextElementSibling;
        
        this.faqItems.forEach(item => {
            if (item !== questionElement) {
                item.setAttribute('aria-expanded', 'false');
                item.nextElementSibling.classList.remove('active');
                item.nextElementSibling.style.maxHeight = '0';
            }
        });
        
        questionElement.setAttribute('aria-expanded', !isExpanded);
        answer.classList.toggle('active');
        answer.style.maxHeight = isExpanded ? '0' : `${answer.scrollHeight}px`;
    }
}

// Form Validation & Submission
class FormManager {
    constructor() {
        this.forms = {
            contact: document.getElementById('contact-form'),
            quote: document.getElementById('quote-form'),
            demo: document.getElementById('demo-form')
        };
        this.init();
    }
    
    init() {
        Object.entries(this.forms).forEach(([name, form]) => {
            if (form) {
                this.setupForm(form, name);
            }
        });
    }
    
    setupForm(form, formName) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmission(form, formName);
        });
        
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateField(input);
            });
            
            input.addEventListener('input', () => {
                this.clearFieldError(input);
            });
        });
    }
    
    validateField(field) {
        const value = field.value.trim();
        const type = field.type;
        const required = field.hasAttribute('required');
        let isValid = true;
        let errorMessage = '';
        
        if (required && !value) {
            isValid = false;
            errorMessage = 'Bu alan zorunludur.';
        }
        
        if (type === 'email' && value && !emailRegex.test(value)) {
            isValid = false;
            errorMessage = 'Geçerli bir e-posta adresi girin.';
        }
        
        if (type === 'tel' && value && !phoneRegex.test(value)) {
            isValid = false;
            errorMessage = 'Geçerli bir telefon numarası girin (örn: 05XXXXXXXXX).';
        }
        
        this.setFieldValidation(field, isValid, errorMessage);
        return isValid;
    }
    
    setFieldValidation(field, isValid, errorMessage) {
        const formGroup = field.closest('.form__group');
        let errorElement = formGroup.querySelector('.form__error');
        
        if (!errorElement) {
            errorElement = document.createElement('div');
            errorElement.className = 'form__error';
            formGroup.appendChild(errorElement);
        }
        
        if (isValid) {
            field.classList.remove('form__input--error');
            errorElement.textContent = '';
            errorElement.style.display = 'none';
        } else {
            field.classList.add('form__input--error');
            errorElement.textContent = errorMessage;
            errorElement.style.display = 'block';
        }
    }
    
    clearFieldError(field) {
        field.classList.remove('form__input--error');
        const formGroup = field.closest('.form__group');
        const errorElement = formGroup.querySelector('.form__error');
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }
    
    validateForm(form) {
        const fields = form.querySelectorAll('input[required], textarea[required], select[required]');
        let isFormValid = true;
        
        fields.forEach(field => {
            if (!this.validateField(field)) {
                isFormValid = false;
            }
        });
        
        const kvkkCheckbox = form.querySelector('#kvkk');
        if (kvkkCheckbox && !kvkkCheckbox.checked) {
            isFormValid = false;
            this.showFormMessage(form, 'KVKK aydınlatma metnini kabul etmeniz gerekmektedir.', 'error');
        }
        
        return isFormValid;
    }
    
    async handleFormSubmission(form, formName) {
        if (!this.validateForm(form)) {
            return;
        }
        
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        
        submitButton.disabled = true;
        submitButton.textContent = 'Gönderiliyor...';
        
        try {
            await this.simulateFormSubmission(form, formName);
            
            this.showFormMessage(form, 'Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.', 'success');
            form.reset();
            
            if (formName !== 'contact') {
                setTimeout(() => {
                    modalManager.closeModal(formName);
                }, 2000);
            }
        } catch (error) {
            this.showFormMessage(form, 'Mesaj gönderilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalText;
        }
    }
    
    async simulateFormSubmission(form, formName) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        console.log(`Form submitted (${formName}):`, data);
        return { success: true };
    }
    
    showFormMessage(form, message, type) {
        const messageElement = form.querySelector('.form__message');
        if (messageElement) {
            messageElement.textContent = message;
            messageElement.className = `form__message form__message--${type}`;
            messageElement.style.display = 'block';
            
            if (type === 'success') {
                setTimeout(() => {
                    messageElement.style.display = 'none';
                }, 5000);
            }
        }
    }
}

// Scroll Animations
class ScrollAnimations {
    constructor() {
        this.observer = null;
        this.init();
    }
    
    init() {
        if ('IntersectionObserver' in window) {
            this.setupIntersectionObserver();
        } else {
            this.fallbackAnimation();
        }
    }
    
    setupIntersectionObserver() {
        const options = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateElement(entry.target);
                    this.observer.unobserve(entry.target);
                }
            });
        }, options);
        
        const animatedElements = document.querySelectorAll('[data-aos]');
        animatedElements.forEach(el => {
            this.observer.observe(el);
        });
    }
    
    animateElement(element) {
        const delay = element.getAttribute('data-aos-delay') || 0;
        
        setTimeout(() => {
            element.classList.add('aos-animate');
        }, parseInt(delay));
    }
    
    fallbackAnimation() {
        const animatedElements = document.querySelectorAll('[data-aos]');
        animatedElements.forEach(el => {
            el.classList.add('aos-animate');
        });
    }
}

// Cookie Consent
class CookieConsent {
    constructor() {
        this.cookieBar = document.getElementById('cookie-consent');
        this.storageKey = 'furkatech_cookie_consent';
        this.init();
    }
    
    init() {
        if (!this.hasConsent()) {
            this.showCookieBar();
        }
    }
    
    hasConsent() {
        return localStorage.getItem(this.storageKey) !== null;
    }
    
    showCookieBar() {
        if (this.cookieBar) {
            setTimeout(() => {
                this.cookieBar.classList.add('active');
            }, 2000);
        }
    }
    
    acceptCookies() {
        localStorage.setItem(this.storageKey, 'accepted');
        this.hideCookieBar();
        this.initializeTracking();
    }
    
    rejectCookies() {
        localStorage.setItem(this.storageKey, 'rejected');
        this.hideCookieBar();
    }
    
    hideCookieBar() {
        if (this.cookieBar) {
            this.cookieBar.classList.remove('active');
        }
    }
    
    initializeTracking() {
        console.log('Analytics initialized (cookies accepted)');
    }
}

// Performance Monitoring
class PerformanceMonitor {
    constructor() {
        this.init();
    }
    
    init() {
        if ('PerformanceObserver' in window) {
            this.monitorWebVitals();
        }
        
        this.monitorPageLoad();
    }
    
    monitorWebVitals() {
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            console.log('LCP:', lastEntry.startTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            entries.forEach(entry => {
                console.log('FID:', entry.processingStart - entry.startTime);
            });
        }).observe({ entryTypes: ['first-input'] });
        
        let clsValue = 0;
        new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
                if (!entry.hadRecentInput) {
                    clsValue += entry.value;
                }
            }
            console.log('CLS:', clsValue);
        }).observe({ entryTypes: ['layout-shift'] });
    }
    
    monitorPageLoad() {
        window.addEventListener('load', () => {
            const perfData = performance.getEntriesByType('navigation')[0];
            console.log('Page Load Time:', perfData.loadEventEnd - perfData.fetchStart);
        });
    }
}

// Global Functions
function openModal(modalName) {
    modalManager.openModal(modalName);
}

function closeModal(modalName) {
    modalManager.closeModal(modalName);
}

function openServiceModal(service) {
    serviceDetails.openServiceModal(service);
}

function closeServiceModal() {
    serviceDetails.closeServiceModal();
}

function nextTestimonial() {
    testimonialSlider.nextTestimonial();
    testimonialSlider.stopAutoPlay();
}

function previousTestimonial() {
    testimonialSlider.previousTestimonial();
    testimonialSlider.stopAutoPlay();
}

function acceptCookies() {
    cookieConsent.acceptCookies();
}

function rejectCookies() {
    cookieConsent.rejectCookies();
}

// Initialize Classes
document.addEventListener('DOMContentLoaded', () => {
    modalManager = new ModalManager();
    serviceDetails = new ServiceDetails();
    testimonialSlider = new TestimonialSlider();
    cookieConsent = new CookieConsent();
    new Navigation();
    new FAQAccordion();
    new FormManager();
    new ScrollAnimations();
    new PerformanceMonitor();
});