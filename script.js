

window.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const starSpan = document.getElementById('starTotal');
    const levelSpan = document.getElementById('levelDisplay');
    const heartsContainer = document.getElementById('heartsContainer');
    const jumpBoostSpan = document.getElementById('jumpBoostCount');
    const extraLifeSpan = document.getElementById('extraLifeCount');
    const shieldSpan = document.getElementById('shieldCount');

    const useJumpBoostBtn = document.getElementById('useJumpBoost');
    const useExtraLifeBtn = document.getElementById('useExtraLife');
    const useShieldBtn = document.getElementById('useShield');

    const themeToggle = document.getElementById('themeToggle');
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark');
        const icon = themeToggle.querySelector('i');
        icon.className = document.body.classList.contains('dark') ? 'fas fa-sun' : 'fas fa-moon';
    });

    const menuToggle = document.getElementById('menuToggle');
    const menuOverlay = document.getElementById('menuOverlay');
    const sideMenu = document.getElementById('sideMenu');
    const closeMenu = document.getElementById('closeMenu');
    const menuShop = document.getElementById('menuShop');
    const menuLevels = document.getElementById('menuLevels');
    const menuHowTo = document.getElementById('menuHowTo');
    const shopPanel = document.getElementById('shopPanel');
    const levelsPanel = document.getElementById('levelsPanel');
    const howToPanel = document.getElementById('howToPanel');

    const menuAbout = document.getElementById('menuAbout');
    const aboutPanel = document.getElementById('aboutPanel');

    function openMenu() {
        sideMenu.classList.add('open');
        menuOverlay.classList.add('visible');
    }
    function closeMenuFunc() {
        sideMenu.classList.remove('open');
        menuOverlay.classList.remove('visible');
    }
    menuToggle.addEventListener('click', openMenu);
    closeMenu.addEventListener('click', closeMenuFunc);
    menuOverlay.addEventListener('click', closeMenuFunc);

    menuShop.addEventListener('click', () => {
        shopPanel.style.display = shopPanel.style.display === 'none' ? 'block' : 'none';
        levelsPanel.style.display = 'none';
        howToPanel.style.display = 'none';
        aboutPanel.style.display = 'none';          
    });
    menuLevels.addEventListener('click', () => {
        levelsPanel.style.display = levelsPanel.style.display === 'none' ? 'block' : 'none';
        shopPanel.style.display = 'none';
        howToPanel.style.display = 'none';
        aboutPanel.style.display = 'none';          
        renderLevelSelect();
    });
    menuHowTo.addEventListener('click', () => {
        howToPanel.style.display = howToPanel.style.display === 'none' ? 'block' : 'none';
        shopPanel.style.display = 'none';
        levelsPanel.style.display = 'none';
        aboutPanel.style.display = 'none';          
    });

    menuAbout.addEventListener('click', () => {
        aboutPanel.style.display = aboutPanel.style.display === 'none' ? 'block' : 'none';
        shopPanel.style.display = 'none';
        levelsPanel.style.display = 'none';
        howToPanel.style.display = 'none';
    });

    const GRAVITY = 0.5;
    const BASE_JUMP = -9.8;
    const MOVE_SPEED = 4;
    const PLAYER_SIZE = 18;
    const TOTAL_LEVELS = 30;

    let player = {
        x: 50, y: 200,
        vx: 0, vy: 0,
        width: PLAYER_SIZE, height: PLAYER_SIZE,
        onGround: false
    };
    let platforms = [], coins = [], spikes = [], movingPlatforms = [];
    let goal = { x: 540, y: 110, width: 30, height: 30 };
    let starsCollected = 0, level = 1, lives = 3, gameActive = true;
    let powerupCounts = { jumpBoost: 0, extraLife: 0, shield: 0 };
    let activeShield = false;
    let pendingJumpBoost = false;

    let checkpointIndex = 0;

    let coinStates = {};

    const backgrounds = [
        { name: 'Default', price: 0, grad: ['#7ab5ff','#4f7fff'], owned: true },
        { name: 'Sunset', price: 100, grad: ['#ffb3ba','#ff6f91'], owned: false },
        { name: 'Forest', price: 150, grad: ['#a8e6cf','#56ab91'], owned: false },
        { name: 'Midnight', price: 200, grad: ['#2c3e50','#1a1f35'], owned: false },
        { name: 'Candy', price: 250, grad: ['#fbc2eb','#a6c1ee'], owned: false },
        { name: 'Neon', price: 300, grad: ['#ff9a9e','#fad0c4'], owned: false }
    ];
    let selectedBg = 0;

    let levelStars = new Array(TOTAL_LEVELS + 1).fill(0);

    const levelCompleteModal = document.getElementById('levelCompleteModal');
    const completeMessage = document.getElementById('completeMessage');
    const nextLevelBtn = document.getElementById('nextLevelBtn');
    const restartLevelBtn = document.getElementById('restartLevelBtn');

    const extraLifeModal = document.getElementById('extraLifeModal');
    const extraLifeMessage = document.getElementById('extraLifeMessage');
    const confirmExtraLife = document.getElementById('confirmExtraLife');
    const cancelExtraLife = document.getElementById('cancelExtraLife');

    const gameOverModal = document.getElementById('gameOverModal');
    const gameOverMessage = document.getElementById('gameOverMessage');
    const gameOverRestart = document.getElementById('gameOverRestart');
    const gameOverMenu = document.getElementById('gameOverMenu');

    const saveModal = document.getElementById('saveModal');
    const modalMsg = document.getElementById('modalMessage');
    const modalClose = document.getElementById('modalCloseBtn');
    modalClose.onclick = () => saveModal.classList.remove('visible');

    function showSaveModal(msg) {
        modalMsg.innerText = msg;
        saveModal.classList.add('visible');
    }

    useJumpBoostBtn.addEventListener('click', () => {
        if (powerupCounts.jumpBoost > 0) {
            if (confirm('Activate Jump Boost for next jump? (1 consumed)')) {
                powerupCounts.jumpBoost--;
                pendingJumpBoost = true;
                updateInventoryUI();
            }
        } else alert('No Jump Boost');
    });
    useShieldBtn.addEventListener('click', () => {
        if (powerupCounts.shield > 0) {
            if (confirm('Activate Shield? (protects one hit, 1 consumed)')) {
                powerupCounts.shield--;
                activeShield = true;
                updateInventoryUI();
            }
        } else alert('No Shield');
    });
    useExtraLifeBtn.addEventListener('click', () => {
        if (powerupCounts.extraLife > 0) {
            if (confirm('Use Extra Life? (adds one life)')) {
                powerupCounts.extraLife--;
                lives++;
                updateHearts();
                updateInventoryUI();
            }
        } else alert('No Extra Life');
    });

    function generateLevel(lvl) {
        let plat = [], star = [], spike = [], moving = [];
        let group = Math.floor((lvl - 1) / 5); // 0..5

        const groupParams = [
            { baseGap: 85, baseDrop: -22, platCountBase: 7, spikeBase: 0, movingBase: 0, widthBase: 40 },
            { baseGap: 92, baseDrop: -26, platCountBase: 8, spikeBase: 1, movingBase: 0, widthBase: 42 },
            { baseGap: 100, baseDrop: -30, platCountBase: 9, spikeBase: 2, movingBase: 1, widthBase: 44 },
            { baseGap: 108, baseDrop: -34, platCountBase: 10, spikeBase: 3, movingBase: 1, widthBase: 46 },
            { baseGap: 116, baseDrop: -38, platCountBase: 11, spikeBase: 4, movingBase: 2, widthBase: 48 },
            { baseGap: 124, baseDrop: -42, platCountBase: 12, spikeBase: 5, movingBase: 2, widthBase: 50 }
        ];
        let p = groupParams[group];

        let baseGap = p.baseGap + lvl * 0.6;
        let baseDrop = p.baseDrop - lvl * 0.3;
        let platformCount = p.platCountBase + Math.floor(lvl / 4);
        let spikeCount = p.spikeBase + Math.floor((lvl - 3) / 3);
        let movingCount = p.movingBase + Math.floor((lvl - 6) / 4);
        if (spikeCount < 0) spikeCount = 0;
        if (movingCount < 0) movingCount = 0;

        plat.push({ x: 0, y: 280, width: 200, height: 10 });
        let prevX = 200, prevY = 280;

        for (let i = 1; i < platformCount; i++) {
            let gap = baseGap + (i * 4) + (lvl % 7) * 2;
            let y = prevY + baseDrop - (i * 3) - (lvl % 5) + (i % 3) * 6;
            if (y < 40) y = 50;
            if (y > 240) y = 220;
            let width = p.widthBase + (lvl % 8) + (i % 4) * 3;
            plat.push({ x: prevX + gap, y, width, height: 10 });
            
            let starCount = 1 + (i % 2 === 0 ? 1 : 0);
            for (let s = 0; s < starCount; s++) {
                let starX = prevX + gap + width/2 + (s === 1 ? 15 : -15);
                let starY = y - 15 - (s * 5);
                if (starY < 20) starY = y - 8;
                star.push({ x: starX, y: starY, radius: 8 });
            }
            prevX = prevX + gap + width;
            prevY = y;
        }

        plat.push({ x: 520, y: 140, width: 70, height: 10 });
        star.push({ x: 555, y: 115, radius: 8 });

        if (lvl > 2) star.push({ x: 350, y: 180, radius: 8 });
        if (lvl > 5) star.push({ x: 420, y: 90, radius: 8 });
        if (lvl > 8) star.push({ x: 200, y: 130, radius: 8 });

        for (let i = 0; i < spikeCount; i++) {
            spike.push({ x: 80 + i * 100, y: 270, width: 20, height: 10 });
        }

        if (movingCount >= 1) moving.push({ x: 200, y: 200, width: 60, height: 8, dx: 1.2, minX: 150, maxX: 280 });
        if (movingCount >= 2) moving.push({ x: 350, y: 120, width: 50, height: 8, dx: 1.5, minX: 300, maxX: 420 });
        if (movingCount >= 3) moving.push({ x: 80, y: 180, width: 60, height: 8, dx: 1.8, minX: 50, maxX: 200 });
        if (movingCount >= 4) moving.push({ x: 450, y: 90, width: 50, height: 8, dx: 2, minX: 400, maxX: 520 });

        return { platforms: plat, stars: star, spikes: spike, movingPlatforms: moving, goal: { x: 540, y: 110, width: 30, height: 30 } };
    }

    function loadLevel(lvl) {
        let data = generateLevel(lvl);
        platforms = data.platforms.map(p => ({ ...p }));
        let newCoins = data.stars.map(c => ({ ...c, collected: false, value: 10 }));
        if (coinStates[lvl]) {
            for (let i = 0; i < newCoins.length; i++) {
                if (coinStates[lvl][i]) newCoins[i].collected = true;
            }
        }
        coins = newCoins;
        spikes = data.spikes.map(s => ({ ...s }));
        movingPlatforms = data.movingPlatforms.map(m => ({ ...m }));
        goal = { ...data.goal };
    
        checkpointIndex = 0;
        player.x = 50; player.y = 200; player.vx = 0; player.vy = 0;
        gameActive = true;
        levelSpan.innerText = lvl;
        updateHearts();
    }

    function updateHearts() {
        let h = '';
        for (let i = 0; i < lives; i++) h += '<i class="fas fa-heart"></i>';
        heartsContainer.innerHTML = h;
    }

    function updateInventoryUI() {
        jumpBoostSpan.innerText = powerupCounts.jumpBoost;
        extraLifeSpan.innerText = powerupCounts.extraLife;
        shieldSpan.innerText = powerupCounts.shield;
    }

    function respawn() {
        if (activeShield) {
            activeShield = false;
            return;
        }
        if (powerupCounts.extraLife > 0) {
            extraLifeMessage.innerText = `You have ${powerupCounts.extraLife} extra life(s). Use one to continue?`;
            extraLifeModal.classList.add('visible');
            return;
        }
        lives--;
        updateHearts();
        if (lives <= 0) {
            gameActive = false;
            gameOverMessage.innerText = 'You ran out of lives. What would you like to do?';
            gameOverModal.classList.add('visible');
            return;
        }
        
        if (checkpointIndex === 0) {
            player.x = 50; player.y = 200;
        } else {
            let p = platforms[checkpointIndex];
            if (p) {
                player.x = p.x + 10; 
                player.y = p.y - player.height;
            } else {
                
                player.x = 50; player.y = 200;
            }
        }
        player.vx = 0; player.vy = 0;
    }

    confirmExtraLife.addEventListener('click', () => {
        extraLifeModal.classList.remove('visible');
        if (powerupCounts.extraLife > 0) {
            powerupCounts.extraLife--;
            updateInventoryUI();
            
            if (checkpointIndex === 0) {
                player.x = 50; player.y = 200;
            } else {
                let p = platforms[checkpointIndex];
                player.x = p.x + 10;
                player.y = p.y - player.height;
            }
            player.vx = 0; player.vy = 0;
        }
    });
    cancelExtraLife.addEventListener('click', () => {
        extraLifeModal.classList.remove('visible');
        lives--;
        updateHearts();
        if (lives <= 0) {
            gameActive = false;
            gameOverMessage.innerText = 'You ran out of lives. What would you like to do?';
            gameOverModal.classList.add('visible');
            return;
        }
        if (checkpointIndex === 0) {
            player.x = 50; player.y = 200;
        } else {
            let p = platforms[checkpointIndex];
            player.x = p.x + 10;
            player.y = p.y - player.height;
        }
        player.vx = 0; player.vy = 0;
    });

    gameOverRestart.addEventListener('click', () => {
        gameOverModal.classList.remove('visible');
        lives = 3;
        loadLevel(level);
    });
    gameOverMenu.addEventListener('click', () => {
        gameOverModal.classList.remove('visible');
        openMenu();
    });

    const input = { left: false, right: false, jump: false };
    window.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') { input.left = true; e.preventDefault(); }
        else if (e.key === 'ArrowRight') { input.right = true; e.preventDefault(); }
        else if (e.key === ' ') { input.jump = true; e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => {
        if (e.key === 'ArrowLeft') { input.left = false; e.preventDefault(); }
        else if (e.key === 'ArrowRight') { input.right = false; e.preventDefault(); }
        else if (e.key === ' ') { input.jump = false; e.preventDefault(); }
    });

    function setupButton(id, key) {
        let btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); input[key] = true; });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); input[key] = false; });
        btn.addEventListener('mousedown', (e) => { e.preventDefault(); input[key] = true; });
        btn.addEventListener('mouseup', (e) => { e.preventDefault(); input[key] = false; });
        btn.addEventListener('mouseleave', (e) => { input[key] = false; });
    }
    setupButton('leftBtn', 'left');
    setupButton('rightBtn', 'right');
    setupButton('jumpBtn', 'jump');

    canvas.addEventListener('touchstart', (e) => e.preventDefault());
    canvas.addEventListener('touchmove', (e) => e.preventDefault());

    function rectCollide(r1, r2) {
        return r1.x < r2.x + r2.w && r1.x + r1.w > r2.x && r1.y < r2.y + r2.h && r1.y + r1.h > r2.y;
    }

    function update() {
        if (!gameActive) return;

        for (let mp of movingPlatforms) {
            mp.x += mp.dx;
            if (mp.x < mp.minX || mp.x > mp.maxX) { mp.dx *= -1; mp.x = Math.max(mp.minX, Math.min(mp.maxX, mp.x)); }
        }

        player.vx = (input.left ? -MOVE_SPEED : 0) + (input.right ? MOVE_SPEED : 0);
        player.vy += GRAVITY;

        player.x += player.vx;
        for (let p of platforms) {
            let pl = { x: player.x, y: player.y, w: player.width, h: player.height };
            let pr = { x: p.x, y: p.y, w: p.width, h: p.height };
            if (rectCollide(pl, pr)) {
                if (player.vx > 0) player.x = p.x - player.width;
                else if (player.vx < 0) player.x = p.x + p.width;
                player.vx = 0;
            }
        }
        for (let mp of movingPlatforms) {
            let pl = { x: player.x, y: player.y, w: player.width, h: player.height };
            let pr = { x: mp.x, y: mp.y, w: mp.width, h: mp.height };
            if (rectCollide(pl, pr)) {
                if (player.vx > 0) player.x = mp.x - player.width;
                else if (player.vx < 0) player.x = mp.x + mp.width;
                player.vx = 0;
            }
        }

        player.y += player.vy;
        let wasOnGround = player.onGround;
        player.onGround = false;

        for (let idx = 0; idx < platforms.length; idx++) {
            let p = platforms[idx];
            let pl = { x: player.x, y: player.y, w: player.width, h: player.height };
            let pr = { x: p.x, y: p.y, w: p.width, h: p.height };
            if (rectCollide(pl, pr)) {
                if (player.vy > 0) { 
                    player.y = p.y - player.height;
                    player.vy = 0;
                    player.onGround = true;
                    
                    checkpointIndex = idx;
                } else if (player.vy < 0) { 
                    player.y = p.y + p.height;
                    player.vy = 0;
                }
            }
        }
        
        for (let mp of movingPlatforms) {
            let pl = { x: player.x, y: player.y, w: player.width, h: player.height };
            let pr = { x: mp.x, y: mp.y, w: mp.width, h: mp.height };
            if (rectCollide(pl, pr)) {
                if (player.vy > 0) {
                    player.y = mp.y - player.height;
                    player.vy = 0;
                    player.onGround = true;
                    player.x += mp.dx; 
                } else if (player.vy < 0) {
                    player.y = mp.y + mp.height;
                    player.vy = 0;
                }
            }
        }

        let jumpForce = pendingJumpBoost ? BASE_JUMP * 1.3 : BASE_JUMP;
        if (input.jump && player.onGround) {
            player.vy = jumpForce;
            player.onGround = false;
            if (pendingJumpBoost) pendingJumpBoost = false;
        }

        for (let s of spikes) {
            let pl = { x: player.x, y: player.y, w: player.width, h: player.height };
            let sr = { x: s.x, y: s.y, w: s.width, h: s.height };
            if (rectCollide(pl, sr)) { respawn(); return; }
        }
        if (player.y > canvas.height + 30) { respawn(); return; }

        for (let i = 0; i < coins.length; i++) {
            if (!coins[i].collected) {
                let coin = coins[i];
                let coinRect = { x: coin.x - coin.radius, y: coin.y - coin.radius, w: coin.radius*2, h: coin.radius*2 };
                let pl = { x: player.x, y: player.y, w: player.width, h: player.height };
                if (rectCollide(pl, coinRect)) {
                    coins[i].collected = true;
                    starsCollected += 10;
                    starSpan.innerText = starsCollected;
                    levelStars[level] += 10;
                    if (!coinStates[level]) coinStates[level] = new Array(coins.length).fill(false);
                    coinStates[level][i] = true;
                }
            }
        }

        let goalRect = { x: goal.x, y: goal.y, w: goal.width, h: goal.height };
        let pl = { x: player.x, y: player.y, w: player.width, h: player.height };
        if (rectCollide(pl, goalRect)) {
            gameActive = false;
            
            if (level % 3 === 0) {
                lives = 3;
                updateHearts();
            }
            if (level % 5 === 0 && level < TOTAL_LEVELS) {
                showSaveModal('📌 Guga says — "Remember to save your progress using email below!"');
            }
            if (level === TOTAL_LEVELS) {
                showSaveModal('🎉 Congratulations! You beat all 30 levels! Please leave a comment.');
            }
            completeMessage.innerText = `Level ${level} complete! Stars: ${levelStars[level]}`;
            levelCompleteModal.classList.add('visible');
        }
    }

    nextLevelBtn.addEventListener('click', () => {
        if (level < TOTAL_LEVELS) {
            level++;
            loadLevel(level);
        } else {
            showSaveModal('🎉 You already beat all levels!');
        }
        levelCompleteModal.classList.remove('visible');
    });
    restartLevelBtn.addEventListener('click', () => {
        loadLevel(level);
        levelCompleteModal.classList.remove('visible');
    });

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let bg = backgrounds[selectedBg];
        let grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
        grad.addColorStop(0, bg.grad[0]); grad.addColorStop(1, bg.grad[1]);
        ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.shadowColor = '#5a3e2b'; ctx.shadowBlur = 6; ctx.shadowOffsetY = 3;
        platforms.forEach(p => { ctx.fillStyle = '#b58763'; ctx.fillRect(p.x, p.y, p.width, p.height); ctx.fillStyle = '#7d5d42'; ctx.fillRect(p.x, p.y, p.width, 4); });
        movingPlatforms.forEach(mp => { ctx.fillStyle = '#8aa0b5'; ctx.fillRect(mp.x, mp.y, mp.width, mp.height); ctx.fillStyle = '#5f7a9c'; ctx.fillRect(mp.x, mp.y, mp.width, 4); });

        ctx.shadowColor = '#6b0f0f'; ctx.shadowBlur = 8;
        spikes.forEach(s => {
            ctx.fillStyle = '#d64545';
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(s.x + s.width/2, s.y - 12);
            ctx.lineTo(s.x + s.width, s.y);
            ctx.closePath(); ctx.fill();
        });

        ctx.shadowColor = '#f5d742'; ctx.shadowBlur = 10;
        coins.forEach(c => {
            if (!c.collected) {
                ctx.beginPath(); ctx.arc(c.x, c.y, c.radius, 0, 2*Math.PI);
                ctx.fillStyle = '#f5d742'; ctx.fill();
                ctx.shadowBlur = 5; ctx.fillStyle = '#ffbf00';
                ctx.beginPath(); ctx.arc(c.x-2, c.y-2, c.radius-2, 0, 2*Math.PI); ctx.fill();
            }
        });

        ctx.shadowBlur = 12; ctx.shadowColor = '#ffd966';
        ctx.fillStyle = '#f1c40f'; ctx.fillRect(goal.x, goal.y, goal.width, goal.height);
        ctx.fillStyle = '#d4ac0d'; ctx.fillRect(goal.x+5, goal.y+5, goal.width-10, goal.height-10);
        ctx.fillStyle = '#8b5a2b'; ctx.shadowBlur = 4; ctx.fillRect(goal.x+12, goal.y-20, 5, 30);

        ctx.shadowColor = '#2b2b2b'; ctx.shadowBlur = 10;
        ctx.fillStyle = '#ff7b7b'; ctx.fillRect(player.x, player.y, player.width, player.height);
        ctx.fillStyle = 'white';
        ctx.fillRect(player.x+3, player.y+4, 4, 4); ctx.fillRect(player.x+11, player.y+4, 4, 4);
        ctx.fillStyle = '#2b1e1e';
        ctx.fillRect(player.x+4, player.y+5, 2, 2); ctx.fillRect(player.x+12, player.y+5, 2, 2);
        ctx.beginPath(); ctx.strokeStyle = '#5a3e2b'; ctx.lineWidth = 2;
        if (player.onGround) {
            ctx.moveTo(player.x+5, player.y+13);
            ctx.quadraticCurveTo(player.x+9, player.y+17, player.x+13, player.y+13);
        } else {
            ctx.moveTo(player.x+5, player.y+13);
            ctx.quadraticCurveTo(player.x+9, player.y+9, player.x+13, player.y+13);
        }
        ctx.stroke();

        if (activeShield) {
            ctx.shadowBlur = 20; ctx.strokeStyle = '#5f7fff'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(player.x+9, player.y+9, 12, 0, 2*Math.PI); ctx.stroke();
        }
        ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    }

    function buyJumpBoost() {
        if (starsCollected >= 30) {
            if (confirm('Are you sure you want to purchase Jump Boost for 30 stars?')) {
                starsCollected -= 30;
                powerupCounts.jumpBoost++;
                starSpan.innerText = starsCollected;
                updateInventoryUI();
                alert('Jump Boost acquired');
            }
        } else alert('Not enough stars!');
    }
    function buyExtraLife() {
        if (starsCollected >= 50) {
            if (confirm('Are you sure you want to purchase Extra Life for 50 stars?')) {
                starsCollected -= 50;
                powerupCounts.extraLife++;
                starSpan.innerText = starsCollected;
                updateInventoryUI();
                alert('Extra life acquired');
            }
        } else alert('Not enough stars!');
    }
    function buyShield() {
        if (starsCollected >= 40) {
            if (confirm('Are you sure you want to purchase Shield for 40 stars?')) {
                starsCollected -= 40;
                powerupCounts.shield++;
                starSpan.innerText = starsCollected;
                updateInventoryUI();
                alert('Shield acquired');
            }
        } else alert('Not enough stars!');
    }
    document.getElementById('buyJumpBtn').addEventListener('click', buyJumpBoost);
    document.getElementById('buyLifeBtn').addEventListener('click', buyExtraLife);
    document.getElementById('buyShieldBtn').addEventListener('click', buyShield);

    function renderBackgrounds() {
        let container = document.getElementById('bgSelector');
        container.innerHTML = '';
        backgrounds.forEach((bg, i) => {
            let div = document.createElement('div');
            div.className = 'bg-option' + (i === selectedBg ? ' selected' : '');
            div.style.background = `linear-gradient(145deg, ${bg.grad[0]}, ${bg.grad[1]})`;
            div.title = `${bg.name} (${bg.price}⭐)`;
            div.onclick = () => {
                if (bg.owned) {
                    selectedBg = i;
                    renderBackgrounds();
                } else {
                    if (starsCollected >= bg.price) {
                        if (confirm(`Are you sure you want to purchase the "${bg.name}" background for ${bg.price} stars?`)) {
                            starsCollected -= bg.price;
                            bg.owned = true;
                            selectedBg = i;
                            starSpan.innerText = starsCollected;
                            renderBackgrounds();
                            alert(`Background "${bg.name}" purchased!`);
                        }
                    } else alert(`Need ${bg.price} stars!`);
                }
            };
            container.appendChild(div);
        });
    }
    renderBackgrounds();

    function renderLevelSelect() {
        let container = document.getElementById('levelSelectContainer');
        container.innerHTML = '';
        for (let i = 1; i <= TOTAL_LEVELS; i++) {
            let btn = document.createElement('div');
            btn.className = 'level-btn' + (i <= level ? ' completed' : '');
            btn.innerHTML = `${i}<br><i class="fas fa-star"></i> ${levelStars[i]}`;
            btn.onclick = () => {
                if (i <= level) {
                    level = i;
                    loadLevel(i);
                    closeMenuFunc();
                } else alert('Level not reached yet');
            };
            container.appendChild(btn);
        }
    }

    function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
    function saveProgress() {
        let email = document.getElementById('emailInput').value.trim();
        if (!isValidEmail(email)) { alert('Enter a valid email.'); return; }
        if (confirm(`Are you sure you want to save your progress for ${email}?`)) {
            let data = {
                level,
                starsCollected,
                lives,
                powerupCounts,
                backgrounds: backgrounds.map(b => ({ owned: b.owned })),
                selectedBg,
                levelStars,
                coinStates
            };
            localStorage.setItem(`jumper_${email}`, JSON.stringify(data));
            alert('Progress saved!');
        }
    }
    function loadProgress() {
        let email = document.getElementById('emailInput').value.trim();
        if (!isValidEmail(email)) { alert('Enter a valid email.'); return; }
        if (confirm(`Are you sure you want to load progress for ${email}? Current unsaved progress will be lost.`)) {
            let saved = localStorage.getItem(`jumper_${email}`);
            if (!saved) { alert('No saved progress.'); return; }
            let data = JSON.parse(saved);
            level = data.level;
            starsCollected = data.starsCollected;
            lives = data.lives;
            powerupCounts = data.powerupCounts;
            starSpan.innerText = starsCollected;
            updateInventoryUI();
            data.backgrounds.forEach((b, i) => backgrounds[i].owned = b.owned);
            selectedBg = data.selectedBg;
            levelStars = data.levelStars || levelStars;
            coinStates = data.coinStates || {};
            renderBackgrounds();
            loadLevel(level);
            alert('Progress loaded!');
        }
    }
    document.getElementById('saveProgressBtn').addEventListener('click', saveProgress);
    document.getElementById('loadProgressBtn').addEventListener('click', loadProgress);

    loadLevel(1);
    starSpan.innerText = starsCollected;
    updateInventoryUI();
    gameLoop();

    function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }
});
alert ("From level 6 to 9, I think purchasing Jump Boosts will be your 'best' move ever. 🐎\n\n\ Click on the icon of the purchased power-up for activation. ✅\n\n\ For more details about this project check 'ℹ️ ABOUT' in the menu. ");