const sidebar = document.getElementById("mySidebar");
const menuOverlay = document.getElementById("menuOverlay");
const loginText = document.getElementById('loginText');
const profilePhoto = document.getElementById('profilePhoto');
const profileIcon = document.getElementById('profileIcon');
const sidebarProfileSection = document.getElementById('sidebarProfileSection');
const views = document.querySelectorAll('.main-content');
const backButton = document.querySelector('.back-button');
const contentGallery = document.getElementById('contentGallery');
const loadingMessage = document.getElementById('loadingMessage');

// ¡IMPORTANTE! Asegúrate de definir tu URL de Google Apps Script aquí si no la tienes en otro archivo
const APPS_SCRIPT_URL = "TU_URL_DE_APPS_SCRIPT_AQUI"; 

let allContentData = [];
let navigationHistory = ['home-screen'];
let currentScreen = 'home-screen';

function isMobile() {
    return window.innerWidth < 900;
}

function closeMenu() {
    if (isMobile()) {
        sidebar.style.width = "0";
        sidebar.classList.remove('open');
        menuOverlay.style.display = "none";
        // Sincroniza el checkbox animado para que vuelva a su posición original
        const checkbox = document.getElementById('sidebarCheckbox');
        if (checkbox) checkbox.checked = false;
    }
}

function toggleMenu() {
    if (isMobile()) {
        const checkbox = document.getElementById('sidebarCheckbox');
        
        if (sidebar.classList.contains('open')) {
            closeMenu();
        } else {
            sidebar.style.width = "250px";
            sidebar.classList.add('open');
            menuOverlay.style.display = "block";
            // Asegura que el checkbox se marque visualmente si se abrió el menú
            if (checkbox) checkbox.checked = true;
        }
    }
}

function showScreen(screenId) {
    if (isMobile()) {
        closeMenu();
    }
    window.scrollTo(0, 0);
    if (screenId !== currentScreen) {
        if (navigationHistory[navigationHistory.length - 1] !== screenId) {
            navigationHistory.push(screenId);
        }
        currentScreen = screenId;
    }
    if (screenId === 'home-screen') {
        backButton.style.display = 'none';
        navigationHistory = ['home-screen'];
    } else {
        backButton.style.display = 'flex';
    }
    views.forEach(view => {
        view.classList.remove('active');
    });
    
    const targetView = document.getElementById(screenId);
    if (targetView) {
        targetView.classList.add('active');
    }
    
    if (screenId === 'home-screen') {
        loadContent();
    }
}

function showScreenInternal(screenId) {
    window.scrollTo(0, 0);
    views.forEach(view => {
        view.classList.remove('active');
    });
    const targetView = document.getElementById(screenId);
    if (targetView) {
        targetView.classList.add('active');
    }
    currentScreen = screenId;
    backButton.style.display = (screenId === 'home-screen') ? 'none' : 'flex';
}

function goBack() {
    if (navigationHistory.length > 1) {
        navigationHistory.pop();
        const previousScreenId = navigationHistory[navigationHistory.length - 1];
        showScreenInternal(previousScreenId);
    }
}

function handleProfileClick() {
    showScreen('info-screen');
}

function initializeApp() {
    if (!isMobile()) {
        sidebar.style.width = "250px";
        sidebar.classList.add('open');
    } else {
        // En móviles inicia cerrado por defecto
        closeMenu(); 
    }
    if (!document.querySelector('.main-content.active')) {
        showScreen('home-screen');
    }
    sidebar.addEventListener('click', (event) => {
        if (sidebar.classList.contains('open')) {
            event.stopPropagation();
        }
    });
    if (loginText) loginText.textContent = 'Usuario Invitado';
    if (sidebarProfileSection) sidebarProfileSection.onclick = () => showScreen('info-screen');
    if (profileIcon) profileIcon.style.display = 'block';
    if (profilePhoto) profilePhoto.style.display = 'none';
}

function renderContentCard(item) {
    const card = document.createElement('div');
    card.className = 'content-card';
    const fileURL = item.fileURL || '';
    let mediaElement;
    const isVideo = item.fileType && item.fileType.startsWith('video/');
    const defaultPreview = `https://via.placeholder.com/300x250/333/ccc?text=${isVideo ? 'Video' : 'Media'}`;
    if (isVideo) {
        mediaElement = `<div class="card-media" style="background-image: url('${defaultPreview}'); display: flex; align-items: center; justify-content: center;">
                            <a href="${fileURL.replace('=s300', '')}" target="_blank" style="color: white; font-size: 2em;"><i class="fas fa-play-circle"></i></a>
                        </div>`;
    } else {
        mediaElement = `<img class="card-media" src="${fileURL}" alt="${item.title || 'Media'}" onclick="window.open('${fileURL.replace('=s300', '')}', '_blank')">`;
    }
    const tagsHTML = Array.isArray(item.tags) ? item.tags.map(tag => `<span class="tag-button" onclick="filterContent('${tag}')">${tag}</span>`).join('') : '';
    const date = item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'Desconocida';
    const defaultAuthorPhoto = 'https://via.placeholder.com/25/EA7900/FFFFFF?text=A';
    card.innerHTML = `
        ${mediaElement}
        <div class="card-details">
            <h3>${item.title || 'Sin título'}</h3>
            <p>${item.description || ''}</p>
            <div class="card-tags">${tagsHTML}</div>
            <div class="card-footer">
                <div class="card-author">
                    <img class="author-photo" src="${item.authorPhotoURL || defaultAuthorPhoto}" alt="Foto de autor">
                    <span>${item.authorName || 'Anónimo'}</span>
                </div>
                <span><i class="far fa-clock"></i> ${date}</span>
            </div>
        </div>
    `;
    return card;
}

async function loadContent() {
    if (!contentGallery || !loadingMessage) return;
    contentGallery.innerHTML = '';
    loadingMessage.style.display = 'block';
    loadingMessage.textContent = 'Cargando contenido...';
    loadingMessage.style.color = '#ccc';
    
    // Si no has cambiado la URL de ejemplo, evita hacer la petición errónea
    if (APPS_SCRIPT_URL === "TU_URL_DE_APPS_SCRIPT_AQUI") {
        loadingMessage.textContent = 'Configura la URL de tu API en script.js';
        return;
    }

    try {
        const response = await fetch(APPS_SCRIPT_URL);
        const files = await response.json();
        loadingMessage.style.display = 'none';
        allContentData = files;
        if (files.length === 0) {
            contentGallery.innerHTML = '<p style="color: #999; width: 100%; text-align: center;">Aún no hay contenido indexado.</p>';
            return;
        }
        allContentData.forEach((item) => {
            contentGallery.appendChild(renderContentCard(item));
        });
    } catch (error) {
        loadingMessage.textContent = 'Error al cargar el contenido.';
        loadingMessage.style.color = '#f44336';
    }
}

function filterContent(tagToFilter) {
    if (!contentGallery) return;
    const searchInput = document.getElementById('searchInput');
    const query = (tagToFilter || (searchInput ? searchInput.value : '') || '').toLowerCase().trim();
    contentGallery.innerHTML = '';
    const filteredData = allContentData.filter(item => {
        if (!query) return true;
        return (item.title && item.title.toLowerCase().includes(query)) || 
               (item.description && item.description.toLowerCase().includes(query)) || 
               (item.authorName && item.authorName.toLowerCase().includes(query)) || 
               (item.tags && item.tags.some(tag => tag.toLowerCase().includes(query)));
    });
    if (filteredData.length === 0) {
         contentGallery.innerHTML = `<p style="color: #999; width: 100%; text-align: center;">Sin resultados.</p>`;
    } else {
         filteredData.forEach((item) => {
            contentGallery.appendChild(renderContentCard(item));
        });
    }
}

// Inicialización única al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    showScreen('home-screen');
});

window.addEventListener('resize', () => {
     if (window.innerWidth >= 900) {
         sidebar.style.width = "250px";
         sidebar.classList.add('open');
         menuOverlay.style.display = "none";
     } else {
         closeMenu();
     }
});


window.addEventListener('popstate', () => {
    if (currentScreen !== 'home-screen') {
        goBack();
    } else {
        history.pushState(null, null, window.location.href);
    }
});
history.replaceState(null, null, window.location.href);

// Declaraciones Globales para compatibilidad en el HTML
window.showScreen = showScreen;
window.goBack = goBack;
window.toggleMenu = toggleMenu;
window.handleProfileClick = handleProfileClick;
window.filterContent = filterContent;
