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
    }
}

function toggleMenu() {
    if (isMobile()) {
        if (sidebar.classList.contains('open')) {
            closeMenu();
        } else {
            sidebar.style.width = "250px";
            sidebar.classList.add('open');
            menuOverlay.style.display = "block";
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
    const activeView = document.getElementById(screenId);
    activeView.classList.add('active');
    if (screenId === 'home-screen') {
        loadContent();
    }
}

function showScreenInternal(screenId) {
    window.scrollTo(0, 0);
    views.forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');
    currentScreen = screenId;
    if (screenId === 'home-screen') {
        backButton.style.display = 'none';
    } else {
        backButton.style.display = 'flex';
    }
}

function goBack() {
    if (navigationHistory.length > 1) {
        navigationHistory.pop();
        const previousScreenId = navigationHistory[navigationHistory.length - 1];
        showScreenInternal(previousScreenId);
    }
    if (navigationHistory.length === 1 && navigationHistory[0] === 'home-screen') {
        backButton.style.display = 'none';
    }
}

function handleProfileClick() {
    showScreen('info-screen');
}

function closeModalOnOutsideClick() {}

function initializeApp() {
    if (!isMobile()) {
        sidebar.style.width = "250px";
        sidebar.classList.add('open');
    }
    if (!document.querySelector('.main-content.active')) {
        showScreen('home-screen');
    }
    sidebar.addEventListener('click', (event) => {
        if (sidebar.classList.contains('open')) {
            event.stopPropagation();
        }
    });
    if (loginText) {
        loginText.textContent = 'Usuario Invitado';
    }
    if (sidebarProfileSection) {
        sidebarProfileSection.onclick = () => showScreen('info-screen');
    }
    if (profileIcon) {
        profileIcon.style.display = 'block';
    }
    if (profilePhoto) {
        profilePhoto.style.display = 'none';
    }
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
                            <a href="${item.fileURL.replace('=s300', '')}" target="_blank" style="color: white; font-size: 2em;"><i class="fas fa-play-circle"></i></a>
                        </div>`;
    } else {
        mediaElement = `<img class="card-media" src="${fileURL}" alt="${item.title}" onclick="window.open('${item.fileURL.replace('=s300', '')}', '_blank')">`;
    }
    
    const tagsHTML = Array.isArray(item.tags) ? item.tags.map(tag => `<span class="tag-button" onclick="filterContent('${tag}')">${tag}</span>`).join('') : '';
    const date = item.timestamp ? new Date(item.timestamp).toLocaleDateString() : 'Desconocida';
    const defaultAuthorPhoto = 'https://via.placeholder.com/25/EA7900/FFFFFF?text=A';
    
    card.innerHTML = `
        ${mediaElement}
        <div class="card-details">
            <h3>${item.title}</h3>
            <p>${item.description}</p>
            <div class="card-tags">${tagsHTML}</div>
            <div class="card-footer">
                <div class="card-author">
                    <img class="author-photo" src="${item.authorPhotoURL || defaultAuthorPhoto}" alt="Foto de autor">
                    <span>${item.authorName}</span>
                </div>
                <span><i class="far fa-clock"></i> ${date}</span>
            </div>
        </div>
    `;
    return card;
}

async function loadContent() {
    contentGallery.innerHTML = '';
    loadingMessage.style.display = 'block';
    try {
        const response = await fetch(APPS_SCRIPT_URL);
        const files = await response.json();
        loadingMessage.style.display = 'none';
        allContentData = files;
        if (files.length === 0) {
            contentGallery.innerHTML = '<p style="color: #999; width: 100%; text-align: center;">Aún no hay contenido indexado. ¡Sube algo!</p>';
            return;
        }
        allContentData.forEach((item) => {
            const cardElement = renderContentCard(item);
            contentGallery.appendChild(cardElement);
        });
    } catch (error) {
        console.error("Error al cargar el contenido: ", error);
        loadingMessage.textContent = 'Error al cargar el contenido. Revisa el código y despliegue del Apps Script.';
        loadingMessage.style.color = '#f44336';
    }
}

function filterContent(tagToFilter) {
    const searchInput = document.getElementById('searchInput');
    let queryValue = '';
    if (searchInput) {
        queryValue = searchInput.value;
    }
    const query = (tagToFilter || queryValue || '').toLowerCase().trim();
    contentGallery.innerHTML = '';
    const filteredData = allContentData.filter(item => {
        if (!query) return true;
        const titleMatch = item.title.toLowerCase().includes(query);
        const descMatch = item.description.toLowerCase().includes(query);
        const authorMatch = item.authorName.toLowerCase().includes(query);
        const tagsMatch = item.tags && item.tags.some(tag => tag.toLowerCase().includes(query));
        return titleMatch || descMatch || authorMatch || tagsMatch;
    });
    if (filteredData.length === 0) {
         contentGallery.innerHTML = `<p style="color: #999; width: 100%; text-align: center;">No se encontraron resultados para "${query}".</p>`;
    } else {
         filteredData.forEach((item) => {
            const cardElement = renderContentCard(item);
            contentGallery.appendChild(cardElement);
        });
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);
document.addEventListener('DOMContentLoaded', () => showScreen('home-screen'));

window.addEventListener('resize', () => {
     if (window.innerWidth >= 900) {
         sidebar.style.width = "250px";
         sidebar.classList.add('open');
         menuOverlay.style.display = "none";
     } else {
          if (sidebar.classList.contains('open')) {
             closeMenu();
          }
     }
});

window.showScreen = showScreen;
window.goBack = goBack;
window.toggleMenu = toggleMenu;
window.handleProfileClick = handleProfileClick;
window.closeModalOnOutsideClick = closeModalOnOutsideClick; 
window.filterContent = filterContent;
