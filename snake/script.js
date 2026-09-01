const firebaseConfig = {
    apiKey: "AIzaSyBw4Gpq94uUunO5tmuKyJAH6mmMEqvP1j4",
    authDomain: "gatosauriocrackworl.com",
    databaseURL: "https://bikot-worl-default-rtdb.firebaseio.com",
    projectId: "bikot-worl",
    storageBucket: "bikot-worl.firebasestorage.app",
    messagingSenderId: "197140262797",
    appId: "1:197140262797:web:4a03ac108230694ea9d7c4"
};

let auth;
let db;
let FieldValue;
let leaderboardCol;
let usernamesCol;
let isFirebaseConnected = false;

try {
    firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    FieldValue = firebase.firestore.FieldValue;
    leaderboardCol = db.collection('leaderboard_snake_game');
    usernamesCol = db.collection('usernames'); 
    isFirebaseConnected = true;
} catch (e) {
    auth = { 
        currentUser: null, 
        onAuthStateChanged: (callback) => callback(null),
        signOut: () => Promise.resolve(),
        setPersistence: () => Promise.resolve() 
    };
    db = null;
    FieldValue = { serverTimestamp: () => new Date() }; 
    leaderboardCol = null;
    usernamesCol = null;
    window.signInWithGoogle = () => alert("La conexión para iniciar sesión no está disponible.");
    window.logout = () => alert("No hay sesión para cerrar.");
    window.saveUserRecord = (score, speed) => { 
        showNotification(false);
        return { success: false, message: "Sin conexión." };
    };
    window.updateSessionUI = (userEmail) => {
        const statusElement = document.getElementById('sessionStatus');
        statusElement.textContent = `Sesión: Desconectada (Offline)`;
        statusElement.style.color = '#F44336';
        document.getElementById('mainLoginButton').style.display = 'block';
        document.getElementById('mainLogoutButton').style.display = 'none';
    };
    window.updateSessionUI(null);
}

if (isFirebaseConnected) {
    window.saveUserRecord = async function (score, speedLevel) {
        const user = auth.currentUser;
        if (!user) {
            return { success: false, message: "Debes iniciar sesión para guardar tu récord." };
        }
        const uid = user.uid;
        const username = await getAliasFromUID(uid); 
        const leaderboardDocRef = leaderboardCol.doc(uid); 
        const leaderboardDoc = await leaderboardDocRef.get();
        const currentHighscore = leaderboardDoc.exists ? (leaderboardDoc.data().score || 0) : 0;
        
        if (score < currentHighscore) { 
            showNotification(false);
            return { success: false, message: "El puntaje no superó el récord actual." };
        }
        
        const recordData = {
            uid: uid,
            username: username, 
            score: score,
            speed: speedLevel,
            timestamp: FieldValue.serverTimestamp()
        };
        
        try {
            await leaderboardDocRef.set(recordData, { merge: true }); 
            await usernamesCol.doc(uid).update({ snakeHighscore: score });
            showNotification(true); 
            return { success: true };
        } catch (error) {
            showNotification(false); 
            return { success: false, message: "Error interno al guardar el récord." };
        }
    }
}

const CLASIFICACION_URL = "https://gatosauriocrackworl.com/snake/Records?from=game";

function openAuthModal() {
    document.getElementById('authModal').style.display = 'flex';
    document.getElementById('authMessage').textContent = ''; 
}

function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
}

function displayAuthMessage(message, isError) {
    const authMessage = document.getElementById('authMessage');
    authMessage.textContent = message;
    authMessage.style.color = isError ? '#F44336' : '#4CAF50';
}

async function signInWithGoogle() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    try {
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        await initializeUserRecord(user);
        closeAuthModal();
        showNotification(true);
        alert(`¡Éxito! Bienvenido/a, ${user.displayName || user.email.split('@')[0]}. Ahora tus récords se enviarán.`); 
    } catch (error) {
        let errorMessage = 'Error al iniciar sesión con Google. Inténtalo de nuevo.';
        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = 'La ventana de inicio de sesión fue cerrada.';
        } else if (error.code === 'auth/cancelled-popup-request') {
            errorMessage = 'La cancelación fue cancelada.';
        }
        displayAuthMessage(errorMessage, true);
    }
}

async function initializeUserRecord(user) {
    const userDocRef = usernamesCol.doc(user.uid);
    const doc = await userDocRef.get();
    if (!doc.exists) {
        const initialDisplayName = user.displayName || user.email.split('@')[0];
        await userDocRef.set({
            uid: user.uid,
            displayName: initialDisplayName,
            email: user.email,
            photoURL: user.photoURL || null,
            createdAt: FieldValue.serverTimestamp(),
            snakeHighscore: 0, 
        }, { merge: true });
    }
}

function logout() {
    auth.signOut()
    .then(() => {
        updateSessionUI(null);
        document.getElementById('authModal').style.display = 'none';
        alert("¡Sesión cerrada correctamente!");
    }).catch((error) => {
            alert("Error al cerrar sesión.");
    });
}

async function getAliasFromUID(uid) {
    if (!isFirebaseConnected) return "Usuario Offline";
    try {
        const doc = await usernamesCol.doc(uid).get();
        if (doc.exists && doc.data().displayName) {
            return doc.data().displayName;
        }
        const user = auth.currentUser; 
        return (user.displayName || user.email.split('@')[0]) || "Usuario Desconocido"; 
    } catch(e) {
        return "Error al cargar alias";
    }
}

async function sendRecordToServer(score, speed) {
    const result = await window.saveUserRecord(score, speed);
}

const canvas = document.getElementById('gameCanvas');
canvas.width = 375; 
canvas.height = 375; 
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const startModal = document.getElementById('startModal');
const gameOverModal = document.getElementById('gameOverModal');
const pauseButton = document.getElementById('pauseButton');
const pauseModal = document.getElementById('pauseModal');
const resumeButton = document.getElementById('resumeButton');
const exitButton = document.getElementById('exitButton'); 
const finalScoreValueElement = document.getElementById('finalScoreValue');
const finalHighScoreValueElement = document.getElementById('finalHighScoreValue');
const playAgainBtn = document.getElementById('playAgainBtn');
const sessionStatusElement = document.getElementById('sessionStatus');
const notificationIcon = document.getElementById('notification-icon');
const mainLoginButton = document.getElementById('mainLoginButton');
const mainLogoutButton = document.getElementById('mainLogoutButton');
const infoModal = document.getElementById('infoModal');
const btnInformacion = document.getElementById('btnInformacion');
const closeInfoBtn = document.getElementById('closeInfoBtn');

let currentUser = null; 
let gameSpeedName = 'Normal (Medio)'; 
const tileCount = 25; 
const gridSize = canvas.width / tileCount; 
let snake = [{ x: 12, y: 12 }]; 
let food = { x: 5, y: 5 }; 
let velocityX = 0;
let velocityY = 0;
let score = 0;
let gameSpeed = 100; 
let intervalId;
let gameRunning = false;
let gamePaused = false; 
const directionQueue = []; 
let currentDirection = 'ArrowRight'; 

function openInfoModal() {
    infoModal.style.display = 'flex';
}

function closeInfoModal() {
    infoModal.style.display = 'none';
}

function loadHighScore() {
    const high = localStorage.getItem('snakeHighScore') || 0;
    highScoreElement.textContent = `Mejor: ${high}`;
    return parseInt(high);
}

function saveHighScore(newScore) {
    const currentHigh = loadHighScore();
    if (newScore > currentHigh) {
        localStorage.setItem('snakeHighScore', newScore);
        highScoreElement.textContent = `Mejor: ${newScore}`;
    }
}

let notificationTimeout;
function showNotification(isSuccess) {
    clearTimeout(notificationTimeout);
    notificationIcon.style.display = 'none';
    notificationIcon.classList.remove('success', 'error', 'show-animation');
    if (isSuccess) {
        notificationIcon.innerHTML = '✔';
        notificationIcon.classList.add('success');
    } else {
        notificationIcon.innerHTML = '✖';
        notificationIcon.classList.add('error');
    }
    notificationIcon.style.display = 'flex';
    setTimeout(() => {
        notificationIcon.classList.add('show-animation');
    }, 50); 
    notificationTimeout = setTimeout(() => {
        notificationIcon.style.display = 'none';
    }, 2500);
}

async function updateSessionUI(userEmail) {
    if (userEmail) {
        const uid = auth.currentUser.uid;
        const username = await getAliasFromUID(uid);
        currentUser = username;
        sessionStatusElement.textContent = `Sesión: ${currentUser} (Activa)`;
        sessionStatusElement.style.color = 'lightgreen';
        mainLoginButton.style.display = 'none';
        mainLogoutButton.style.display = 'block';
    } else {
        currentUser = null;
        sessionStatusElement.textContent = `Sesión: No iniciada`;
        sessionStatusElement.style.color = 'var(--color-naranja-claro)';
        mainLoginButton.style.display = 'block';
        mainLogoutButton.style.display = 'none';
    }
}

if (auth.onAuthStateChanged) { 
    auth.onAuthStateChanged((user) => {
        updateSessionUI(user ? user.email : null);
    });
}

function placeFood() {
    let newFoodPos;
    do {
        newFoodPos = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
    } while (snake.some(part => part.x === newFoodPos.x && part.y === newFoodPos.y));
    food = newFoodPos;
}

function updateVelocity() {
    if (directionQueue.length > 0) {
        const nextKey = directionQueue.shift(); 
        switch (nextKey) {
            case 'ArrowUp':
                if (currentDirection !== 'ArrowDown') { velocityX = 0; velocityY = -1; currentDirection = 'ArrowUp'; }
                break;
            case 'ArrowDown':
                if (currentDirection !== 'ArrowUp') { velocityX = 0; velocityY = 1; currentDirection = 'ArrowDown'; }
                break;
            case 'ArrowLeft':
                if (currentDirection !== 'ArrowRight') { velocityX = -1; velocityY = 0; currentDirection = 'ArrowLeft'; }
                break;
            case 'ArrowRight':
                if (currentDirection !== 'ArrowLeft') { velocityX = 1; velocityY = 0; currentDirection = 'ArrowRight'; }
                break;
        }
    }
}

function gameLoop() {
    if (!gameRunning || gamePaused) return; 
    updateVelocity(); 
    const head = { x: snake[0].x + velocityX, y: snake[0].y + velocityY };
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount || snake.slice(1).some(part => part.x === head.x && part.y === head.y)) {
        gameOver();
        return;
    }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) { 
        score += 1;
        scoreElement.textContent = `Puntuación: ${score}`;
        placeFood();
    } else {
        snake.pop();
    }
    drawGame();
}

function drawGame() {
    ctx.fillStyle = '#3b4252';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'; 
    ctx.lineWidth = 1;
    for (let i = 0; i < tileCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(canvas.width, i * gridSize);
        ctx.stroke();
    }
    ctx.fillStyle = '#ffb86c';
    ctx.beginPath();
    ctx.arc(food.x * gridSize + gridSize / 2, food.y * gridSize + gridSize / 2, gridSize / 2 * 0.7, 0, Math.PI * 2);
    ctx.fill();
    snake.forEach((part, index) => {
        ctx.fillStyle = '#EA7900';
        ctx.strokeStyle = '#282c34';
        ctx.lineWidth = 2; 
        const x = part.x * gridSize;
        const y = part.y * gridSize;
        const radius = gridSize / 4; 
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + gridSize - radius, y);
        ctx.quadraticCurveTo(x + gridSize, y, x + gridSize, y + radius);
        ctx.lineTo(x + gridSize, y + gridSize - radius);
        ctx.quadraticCurveTo(x + gridSize, y + gridSize, x + gridSize - radius, y + gridSize);
        ctx.lineTo(x + radius, y + gridSize);
        ctx.quadraticCurveTo(x, y + gridSize, x, y + gridSize - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        if (index === 0) {
            ctx.fillStyle = 'white';
            const eyeSize = gridSize * 0.15;
            const offset = gridSize * 0.35;
            const center = { x: x + gridSize / 2, y: y + gridSize / 2 };
            let vx = velocityX;
            let vy = velocityY;
            if (gamePaused || (vx === 0 && vy === 0)) { 
                if (currentDirection === 'ArrowLeft') { vx = -1; vy = 0; }
                else if (currentDirection === 'ArrowUp') { vx = 0; vy = -1; }
                else if (currentDirection === 'ArrowDown') { vx = 0; vy = 1; }
                else { vx = 1; vy = 0; }
            } 
            let eye1 = { x: center.x, y: center.y };
            let eye2 = { x: center.x, y: center.y };
            if (vx === 1) { eye1.x += offset / 2; eye1.y -= offset / 2; eye2.x += offset / 2; eye2.y += offset / 2; } 
            else if (vx === -1) { eye1.x -= offset / 2; eye1.y -= offset / 2; eye2.x -= offset / 2; eye2.y += offset / 2; } 
            else if (vy === -1) { eye1.x -= offset / 2; eye1.y -= offset / 2; eye2.x += offset / 2; eye2.y -= offset / 2; } 
            else if (vy === 1) { eye1.x -= offset / 2; eye1.y += offset / 2; eye2.x += offset / 2; eye2.y += offset / 2; }
            ctx.beginPath(); ctx.arc(eye1.x, eye1.y, eyeSize, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(eye2.x, eye2.y, eyeSize, 0, Math.PI * 2); ctx.fill();
        }
    });
}

function changeDirection(key) {
    if (!gameRunning || gamePaused) return; 
    if (directionQueue.length < 2) {
        directionQueue.push(key);
    }
}

function togglePause() {
    const isInfoVisible = getComputedStyle(infoModal).display !== 'none';
    const isStartVisible = getComputedStyle(startModal).display !== 'none';
    const isGameOverVisible = getComputedStyle(gameOverModal).display !== 'none';

    if (!gameRunning || isGameOverVisible || isStartVisible || isInfoVisible) {
        return; 
    }
    gamePaused = !gamePaused;
    if (gamePaused) {
        clearInterval(intervalId);
        pauseModal.style.display = 'flex';
        pauseButton.innerHTML = '<i class="fa-solid fa-play"></i>'; 
    } else {
        pauseModal.style.display = 'none';
        intervalId = setInterval(gameLoop, gameSpeed);
        pauseButton.innerHTML = '<i class="fa-solid fa-pause"></i>'; 
    }
}

function exitGame() {
    if (!gameRunning) return;
    gameRunning = false;
    gamePaused = false; 
    clearInterval(intervalId);
    pauseModal.style.display = 'none';
    pauseButton.style.display = 'none'; 
    startModal.style.display = 'flex';
    snake = [{ x: 12, y: 12 }];
    score = 0;
    scoreElement.textContent = `Puntuación: 0`;
    drawGame();
}

function drawCountdown(count) {
    drawGame(); 
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = "bold 100px 'Segoe UI', Arial";
    ctx.fillStyle = 'white';
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (count > 0) {
        ctx.fillText(count, canvas.width / 2, canvas.height / 2);
    } else if (count === 0) {
        ctx.font = "bold 50px 'Segoe UI', Arial";
        ctx.fillText("¡GO!", canvas.width / 2, canvas.height / 2);
    }
}

function showCountdown(speed, speedName) {
    startModal.style.display = 'none';
    gameSpeed = speed;
    gameSpeedName = speedName; 
    let count = 3;
    currentDirection = 'ArrowRight'; 
    velocityX = 1; 
    velocityY = 0;
    snake = [{ x: 12, y: 12 }];
    placeFood();
    drawGame();
    pauseButton.style.display = 'flex'; 
    pauseButton.innerHTML = '<i class="fa-solid fa-pause"></i>';
    const countdownInterval = setInterval(() => {
        drawCountdown(count);
        count--;
        if (count < 0) {
            clearInterval(countdownInterval);
            startGame(gameSpeed);
        }
    }, 1000);
}

function startGame(speed) {
    if (gameRunning) return;
    score = 0;
    scoreElement.textContent = `Puntuación: 0`;
    gameRunning = true;
    gamePaused = false; 
    pauseButton.innerHTML = '<i class="fa-solid fa-pause"></i>';
    directionQueue.length = 0; 
    intervalId = setInterval(gameLoop, speed); 
    drawGame(); 
}

function gameOver() {
    gameRunning = false;
    gamePaused = false; 
    clearInterval(intervalId);
    pauseButton.style.display = 'none'; 
    saveHighScore(score);
    sendRecordToServer(score, gameSpeedName);
    finalScoreValueElement.textContent = score;
    finalHighScoreValueElement.textContent = loadHighScore();
    gameOverModal.style.display = 'flex';
}

function setupResponsiveControls() {
    const isMobile = window.matchMedia('(max-width: 768px)').matches || ('ontouchstart' in window);
    const controlsContainer = document.querySelector('.controls-container') || document.querySelector('.controls') || document.getElementById('controls');
    let pcControlsFooter = document.getElementById('pcControlsFooter');

    if (!isMobile) {
        if (controlsContainer) {
            controlsContainer.style.display = 'none';
        }
        if (!pcControlsFooter) {
            pcControlsFooter = document.createElement('div');
            pcControlsFooter.id = 'pcControlsFooter';
            pcControlsFooter.style.textAlign = 'center';
            pcControlsFooter.style.marginTop = '15px';
            pcControlsFooter.style.fontSize = '14px';
            pcControlsFooter.style.color = '#ffffff';
            pcControlsFooter.style.fontWeight = 'bold';
            
            const gameContainer = canvas.parentElement;
            gameContainer.appendChild(pcControlsFooter);
        }
        pcControlsFooter.innerHTML = 'Controles en PC: Movimiento (Flechas / WASD) | Pausa (Espacio / P / Esc) | Salir al Menú (Enter en Pausa)';
        pcControlsFooter.style.display = 'block';
    } else {
        if (controlsContainer) {
            controlsContainer.style.display = '';
        }
        if (pcControlsFooter) {
            pcControlsFooter.style.display = 'none';
        }
    }
}

document.addEventListener('keydown', (event) => {
    const keyMap = {
        'ArrowUp': 'ArrowUp',
        'w': 'ArrowUp',
        'W': 'ArrowUp',
        'ArrowDown': 'ArrowDown',
        's': 'ArrowDown',
        'S': 'ArrowDown',
        'ArrowLeft': 'ArrowLeft',
        'a': 'ArrowLeft',
        'A': 'ArrowLeft',
        'ArrowRight': 'ArrowRight',
        'd': 'ArrowRight',
        'D': 'ArrowRight'
    };

    const mappedKey = keyMap[event.key];
    const isInfoVisible = getComputedStyle(infoModal).display !== 'none';
    const isStartVisible = getComputedStyle(startModal).display !== 'none';

    if (isInfoVisible && event.key === 'Escape') {
        closeInfoModal();
        return;
    }

    if (mappedKey) {
        event.preventDefault(); 
        if (gameRunning && !gamePaused && !isInfoVisible) {
            changeDirection(mappedKey);
        } else if (!gameRunning && isStartVisible) {
            showCountdown(100, 'Normal (Medio)'); 
        }
    } else if (event.key === ' ' || event.key === 'Spacebar') {
        event.preventDefault();
        togglePause();
    } else if (event.key === 'Enter') {
        if (gameRunning && gamePaused) {
            event.preventDefault();
            exitGame();
        }
    } else if (event.key === 'p' || event.key === 'P' || (event.key === 'Escape' && !isInfoVisible)) {
        togglePause();
    }
});

document.querySelectorAll('.control-btn').forEach(button => {
    const direction = button.getAttribute('data-direction');
    const handleInput = (event) => {
        event.preventDefault(); 
        const isInfoVisible = getComputedStyle(infoModal).display !== 'none';
        const isStartVisible = getComputedStyle(startModal).display !== 'none';

        if (gameRunning && !gamePaused && !isInfoVisible) {
            changeDirection(direction);
        } else if (!gameRunning && isStartVisible) {
            showCountdown(100, 'Normal (Medio)');
        }
    };
    button.addEventListener('mousedown', handleInput);
    button.addEventListener('touchstart', handleInput);
});

document.querySelectorAll('.speed-btn').forEach(button => {
    button.addEventListener('click', (event) => {
        const speed = parseInt(event.currentTarget.getAttribute('data-speed'));
        const name = event.currentTarget.getAttribute('data-name');
        showCountdown(speed, name);
    });
});

pauseButton.addEventListener('click', togglePause);
resumeButton.addEventListener('click', togglePause);
exitButton.addEventListener('click', exitGame); 
playAgainBtn.addEventListener('click', () => {
    gameOverModal.style.display = 'none';
    pauseButton.style.display = 'none'; 
    startModal.style.display = 'flex'; 
    drawGame(); 
});

document.getElementById('btnClasificatoria').addEventListener('click', () => {
    window.open(CLASIFICACION_URL, '_blank'); 
});

btnInformacion.addEventListener('click', openInfoModal);
closeInfoBtn.addEventListener('click', closeInfoModal);

window.addEventListener('resize', setupResponsiveControls);

window.onload = () => {
    loadHighScore();
    drawGame(); 
    setupResponsiveControls();
};
