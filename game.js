import { OBJECT_CONFIGS } from './objectConfigs.js';
import { SURFACES } from './surfaces.js';
import { SPELLS } from './spells.js';


// Менеджер спрайтов с улучшенной системой загрузки
class SpriteManager {
    constructor() {
        this.sprites = new Map();
        this.loadingPromises = new Map();
        this.loadingProgress = new Map();
        this.totalAssets = 0;
        this.loadedAssets = 0;
    }

    // Предзагрузка всех спрайтов
    async preloadAllSprites() {
        const spritesToLoad = [];
        
        // Собираем все спрайты из конфигураций
        OBJECT_CONFIGS.forEach(config => {
            if (config.sprite) {
                spritesToLoad.push({ key: config.type, src: config.sprite });
            }
        });

        SURFACES.forEach(surface => {
            if (surface.sprite) {
                spritesToLoad.push({ key: `surface_${surface.id}`, src: surface.sprite });
            }
        });

        // Добавляем спрайт игрока если он задан
        if (PLAYER_SPRITE) {
            spritesToLoad.push({ key: 'player', src: PLAYER_SPRITE });
        }

        this.totalAssets = spritesToLoad.length;
        this.loadedAssets = 0;

        console.log(`Starting to load ${this.totalAssets} sprites...`);

        // Загружаем все спрайты параллельно
        const loadPromises = spritesToLoad.map(sprite => 
            this.loadSprite(sprite.key, sprite.src)
        );

        try {
            await Promise.all(loadPromises);
            console.log('All sprites loaded successfully!');
        } catch (error) {
            console.warn('Some sprites failed to load:', error);
        }
    }

    loadSprite(key, src) {
        if (this.sprites.has(key)) {
            return Promise.resolve(this.sprites.get(key));
        }

        if (this.loadingPromises.has(key)) {
            return this.loadingPromises.get(key);
        }

        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                this.sprites.set(key, img);
                this.loadingPromises.delete(key);
                this.loadedAssets++;
                this.updateLoadingProgress();
                console.log(`Loaded sprite: ${key} (${this.loadedAssets}/${this.totalAssets})`);
                resolve(img);
            };
            
            img.onerror = () => {
                this.loadingPromises.delete(key);
                this.loadedAssets++;
                this.updateLoadingProgress();
                console.warn(`Failed to load sprite: ${src}`);
                // Не отклоняем промис, чтобы не блокировать загрузку других спрайтов
                resolve(null);
            };
            
            img.src = src;
        });

        this.loadingPromises.set(key, promise);
        return promise;
    }

    updateLoadingProgress() {
        const progress = this.totalAssets > 0 ? (this.loadedAssets / this.totalAssets) * 100 : 100;
        this.onProgress?.(progress, this.loadedAssets, this.totalAssets);
    }

    getSprite(key) {
        return this.sprites.get(key);
    }

    hasSprite(key) {
        return this.sprites.has(key);
    }

    getLoadingProgress() {
        return this.totalAssets > 0 ? (this.loadedAssets / this.totalAssets) * 100 : 100;
    }

    isLoading() {
        return this.loadedAssets < this.totalAssets;
    }
}

// Глобальный менеджер спрайтов
const spriteManager = new SpriteManager();

// Спрайт игрока (можно задать)
const PLAYER_SPRITE = null; // 'assets/player.png'







// Основная конфигурация игры
const CONFIG = {
    TILE_SIZE: 50,
    ROWS: 8,
    COLS: 12,
    MONSTER_COUNT: 5,
    
    // Преобразуем массив объектов в объект для быстрого доступа
    OBJECT_CONFIG: OBJECT_CONFIGS.reduce((acc, config) => {
        acc[config.type] = config;
        return acc;
    }, {}),
    
    // Используем массивы из отдельных конфигураций
    SPELLS: SPELLS,
    SURFACES: SURFACES
};

// Загрузчик игры
class GameLoader {
    constructor() {
        this.loadingElement = null;
        this.progressBar = null;
        this.progressText = null;
        this.createLoadingUI();
    }

    createLoadingUI() {
        // Создаем элементы загрузки
        this.loadingElement = document.createElement('div');
        this.loadingElement.id = 'gameLoader';
        this.loadingElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 1000;
            color: white;
            font-family: Arial, sans-serif;
        `;

        const title = document.createElement('h2');
        title.textContent = 'Загрузка игры...';
        title.style.marginBottom = '30px';

        const progressContainer = document.createElement('div');
        progressContainer.style.cssText = `
            width: 300px;
            height: 20px;
            background: #333;
            border-radius: 10px;
            overflow: hidden;
            margin-bottom: 20px;
        `;

        this.progressBar = document.createElement('div');
        this.progressBar.style.cssText = `
            width: 0%;
            height: 100%;
            background: linear-gradient(90deg, #4CAF50, #45a049);
            border-radius: 10px;
            transition: width 0.3s ease;
        `;

        this.progressText = document.createElement('div');
        this.progressText.style.cssText = `
            text-align: center;
            font-size: 14px;
            margin-top: 10px;
        `;

        progressContainer.appendChild(this.progressBar);
        this.loadingElement.appendChild(title);
        this.loadingElement.appendChild(progressContainer);
        this.loadingElement.appendChild(this.progressText);

        document.body.appendChild(this.loadingElement);
    }

    updateProgress(progress, loaded, total) {
        if (this.progressBar) {
            this.progressBar.style.width = `${progress}%`;
        }
        if (this.progressText) {
            this.progressText.textContent = `${loaded}/${total} ресурсов загружено (${Math.round(progress)}%)`;
        }
    }

    hide() {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'none';
        }
    }

    show() {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'flex';
        }
    }

    destroy() {
        if (this.loadingElement) {
            document.body.removeChild(this.loadingElement);
            this.loadingElement = null;
        }
    }
}

class GameObject {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.config = CONFIG.OBJECT_CONFIG[type];
        this.spriteLoaded = false;
        
        // Спрайт уже должен быть загружен через preloader
        this.spriteLoaded = spriteManager.hasSprite(this.type);
    }

    interact(player) {
        if (this.config.resourceGain) {
            player.gain(this.config.resourceGain);
        }
    }

    draw(ctx) {
        const x = this.x * CONFIG.TILE_SIZE;
        const y = this.y * CONFIG.TILE_SIZE;
        const cx = x + CONFIG.TILE_SIZE / 2;
        const cy = y + CONFIG.TILE_SIZE / 2;

        // Проверяем, есть ли спрайт
        if (this.config.sprite && spriteManager.hasSprite(this.type)) {
            const sprite = spriteManager.getSprite(this.type);
            const size = CONFIG.TILE_SIZE * 0.8; // Спрайт немного меньше клетки
            ctx.drawImage(
                sprite,
                cx - size / 2,
                cy - size / 2,
                size,
                size
            );
        } else {
            // Рисуем цветной круг если спрайта нет
            ctx.beginPath();
            ctx.arc(cx, cy, CONFIG.TILE_SIZE / 4, 0, 2 * Math.PI);
            ctx.fillStyle = this.config.color;
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.stroke();
        }
    }
}

class Chest extends GameObject {
    constructor(x, y) {
        super(x, y, 'chest');
    }
}

class Monster extends GameObject {
    constructor(x, y) {
        super(x, y, 'monster');
        this.hp = { '♠': 2, '♣': 2, '♦': 1 };
        this.maxHp = { '♠': 2, '♣': 2, '♦': 1 };
    }

    receiveDamage(damage) {
        for (let res in damage) {
            const taken = Math.min(this.hp[res] || 0, damage[res]);
            this.hp[res] = Math.max(0, (this.hp[res] || 0) - taken);
            game.player.gain({ [res]: taken });
        }
    }

    isDead() {
        return Object.values(this.hp).every(val => val === 0);
    }

    getHpString() {
        return Object.entries(this.hp).map(([k, v]) => `${k}${v}`).join(' ');
    }
}

class Player {
    constructor(x = 0, y = 0, resources = { '♠': 3, '♦': 5, '♣': 2 }) {
        this.x = x;
        this.y = y;
        this.resources = resources;
        this.color = 'red';
        this.sprite = PLAYER_SPRITE;
        this.spriteLoaded = false;
        
        // Спрайт уже должен быть загружен через preloader
        this.spriteLoaded = spriteManager.hasSprite('player');
    }

    canAfford(cost) {
        return Object.entries(cost).every(([k, v]) => (this.resources[k] || 0) >= v);
    }

    applyCost(cost) {
        for (let res in cost) this.resources[res] -= cost[res];
    }

    gain(gain) {
        for (let res in gain) this.resources[res] = (this.resources[res] || 0) + gain[res];
    }

    draw(ctx) {
        const x = this.x * CONFIG.TILE_SIZE;
        const y = this.y * CONFIG.TILE_SIZE;
        const cx = x + CONFIG.TILE_SIZE / 2;
        const cy = y + CONFIG.TILE_SIZE / 2;

        // Проверяем, есть ли спрайт
        if (this.sprite && spriteManager.hasSprite('player')) {
            const sprite = spriteManager.getSprite('player');
            const size = CONFIG.TILE_SIZE * 0.8; // Спрайт немного меньше клетки
            ctx.drawImage(
                sprite,
                cx - size / 2,
                cy - size / 2,
                size,
                size
            );
        } else {
            // Рисуем цветной круг если спрайта нет
            ctx.beginPath();
            ctx.arc(cx, cy, CONFIG.TILE_SIZE / 4, 0, 2 * Math.PI);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.strokeStyle = '#000';
            ctx.stroke();
        }
    }
}

class TerrainManager {
    constructor(rows, cols, surfaces) {
        this.rows = rows;
        this.cols = cols;
        this.surfaces = surfaces;
        this.seedX = Math.random() * 1000;
        this.seedY = Math.random() * 1000;
        this.map = this.generate();
        this.depthMap = this.generateDepthMap();
    }

    noise(x, y) {
        return Math.sin((x + this.seedX) * 3.14 + (y + this.seedY) * 1.618) * Math.cos((y + this.seedY) * 3.14 + (x + this.seedX) * 1.618);
    }

    generate(scale = Math.random() * 0.3 + 0.1) {
        const map = [];
        for (let y = 0; y < this.rows; y++) {
            const row = [];
            for (let x = 0; x < this.cols; x++) {
                const v = (this.noise(x * scale, y * scale) + 1) / 2;
                let idx = Math.floor(v * this.surfaces.length);
                idx = Math.min(idx, this.surfaces.length - 1);
                let tile = this.surfaces[idx];
                if (Math.random() > tile.probability) {
                    tile = this.surfaces.find(s => Math.random() <= s.probability) || tile;
                }
                row.push(tile.id);
            }
            map.push(row);
        }
        return map;
    }

    generateDepthMap() {
        const map = [];
        for (let y = 0; y < this.rows; y++) {
            const row = [];
            for (let x = 0; x < this.cols; x++) {
                const surface = this.getSurface(this.map[y][x]);
                const maxDepth = surface.actions?.reduce((max, act) => Math.max(max, act.depth || 1), 1);
                row.push(maxDepth);
            }
            map.push(row);
        }
        return map;
    }

    reduceDepth(x, y) {
        if (this.depthMap[y][x] > 0) this.depthMap[y][x]--;
    }

    getSurface(id) {
        return this.surfaces.find(s => s.id === id);
    }

    drawTile(ctx, x, y, surface) {
        const tileX = x * CONFIG.TILE_SIZE;
        const tileY = y * CONFIG.TILE_SIZE;

        // Проверяем, есть ли спрайт для этой поверхности
        if (surface.sprite && spriteManager.hasSprite(`surface_${surface.id}`)) {
            const sprite = spriteManager.getSprite(`surface_${surface.id}`);
            ctx.drawImage(
                sprite,
                tileX,
                tileY,
                CONFIG.TILE_SIZE,
                CONFIG.TILE_SIZE
            );
        } else {
            // Рисуем цветной прямоугольник если спрайта нет
            ctx.fillStyle = surface.color;
            ctx.fillRect(tileX, tileY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
        }

        // Рисуем границы клетки
        ctx.strokeStyle = '#333';
        ctx.strokeRect(tileX, tileY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);

        // Рисуем доступные ресурсы в углах
        this.drawResourceIndicators(ctx, tileX, tileY, surface);
    }

    drawResourceIndicators(ctx, tileX, tileY, surface) {
        if (!surface.resourceGain) return;

        const resources = Object.entries(surface.resourceGain);
        const cornerSize = 12;
        
        // Позиции углов: верхний левый, верхний правый, нижний левый, нижний правый
        const corners = [
            { x: tileX + 2, y: tileY + 2 },
            { x: tileX + CONFIG.TILE_SIZE - cornerSize - 2, y: tileY + 2 },
            { x: tileX + 2, y: tileY + CONFIG.TILE_SIZE - cornerSize - 2 },
            { x: tileX + CONFIG.TILE_SIZE - cornerSize - 2, y: tileY + CONFIG.TILE_SIZE - cornerSize - 2 }
        ];

        resources.forEach(([resourceType, amount], index) => {
            if (index < corners.length) {
                const corner = corners[index];
                
                // Рисуем полупрозрачный черный квадратик
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.fillRect(corner.x, corner.y, cornerSize, cornerSize);
                
                // Рисуем символ ресурса
                ctx.fillStyle = 'white';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(
                    resourceType,
                    corner.x + cornerSize / 2,
                    corner.y + cornerSize / 2
                );
            }
        });
    }
}

function formatResources(obj) {
    return Object.entries(obj).map(([k, v]) => `${k}${v}`).join(' ');
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.player = new Player();
        this.terrainManager = new TerrainManager(CONFIG.ROWS, CONFIG.COLS, CONFIG.SURFACES);
        this.terrain = this.terrainManager.map;
        this.objects = [];
        this.paused = false;
        this.currentMonster = null;
        this.currentMonsterIndex = -1;
        this.gameLog = []; // Массив для хранения логов
        this.maxLogEntries = 10; // Максимальное количество записей в логе
        
        this.generateObjects();
        this.bindKeys();
        this.updateUI();
        this.addLog('🎮 Игра началась! Используйте стрелки для перемещения.');
        requestAnimationFrame(() => this.update());
    }

    // Метод для добавления записи в лог
    addLog(message) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            message,
            timestamp,
            id: Date.now() + Math.random()
        };
        
        // Добавляем в начало массива
        this.gameLog.push(logEntry);
        
        // Ограничиваем количество записей
        // if (this.gameLog.length > this.maxLogEntries) {
        //     this.gameLog = this.gameLog.slice(0, this.maxLogEntries);
        // }
    
        this.updateLogDisplay();
    }
    

    // Метод для обновления отображения лога
    updateLogDisplay() {
        const logContainer = document.getElementById('gameLog');
        if (!logContainer) {
            // Создаем контейнер для лога если его нет
            this.createLogContainer();
            return;
        }

        logContainer.innerHTML = '';
        
        this.gameLog.forEach((entry, index) => {
            const logEntry = document.createElement('div');
            logEntry.className = 'log-entry';
            logEntry.style.cssText = `
                padding: 5px;
                margin-bottom: 2px;
                background: ${index === 0 ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
                border-left: 3px solid ${index === 0 ? '#4CAF50' : '#666'};
                font-size: 12px;
                opacity: ${1 - (index * 0.1)};
                transition: all 0.3s ease;
            `;
            
            logEntry.innerHTML = `
                <span style="color: #888; font-size: 10px;">[${entry.timestamp}]</span>
                <span style="margin-left: 8px;">${entry.message}</span>
            `;
        
            logContainer.appendChild(logEntry); // 👈 теперь можно просто append
        });
        
    }
    // Создание контейнера для лога
    createLogContainer() {
        const logContainer = document.createElement('div');
        logContainer.id = 'gameLog';
        logContainer.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            width: 300px;
            max-height: 200px;
            overflow-y: auto;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px;
            border-radius: 5px;
            font-family: monospace;
            z-index: 100;
        `;

        const title = document.createElement('div');
        title.style.cssText = `
            font-weight: bold;
            margin-bottom: 5px;
            color: #4CAF50;
            border-bottom: 1px solid #333;
            padding-bottom: 3px;
        `;
        title.textContent = 'Лог событий';

        logContainer.appendChild(title);
        document.body.appendChild(logContainer);
        
        this.updateLogDisplay();
    }

    generateObjects() {
        while (this.objects.filter(o => o instanceof Monster).length < CONFIG.MONSTER_COUNT) {
            const x = Math.floor(Math.random() * CONFIG.COLS);
            const y = Math.floor(Math.random() * CONFIG.ROWS);
            if (this.terrain[y][x] !== 1 && (x !== this.player.x || y !== this.player.y)) {
                this.objects.push(new Monster(x, y));
            }
        }
    }

    bindKeys() {
        document.addEventListener('keydown', (e) => {
            // Предотвращаем обработку если игра на паузе
            if (this.paused) {
                console.log('Game is paused, ignoring key input');
                return;
            }
            
            const dir = {
                ArrowUp: [0, -1],
                ArrowDown: [0, 1],
                ArrowLeft: [-1, 0],
                ArrowRight: [1, 0]
            }[e.key];
            
            if (dir) {
                e.preventDefault(); // Предотвращаем скролл страницы
                const [dx, dy] = dir;
                const newX = this.player.x + dx;
                const newY = this.player.y + dy;
                
                // Проверяем границы
                if (newX >= 0 && newX < CONFIG.COLS && newY >= 0 && newY < CONFIG.ROWS) {
                    const surface = this.terrainManager.getSurface(this.terrain[newY][newX]);
                    if (surface && this.player.canAfford(surface.moveCost)) {
                        this.player.applyCost(surface.moveCost);
                        this.player.x = newX;
                        this.player.y = newY;
                        this.addLog(`🚶 Перемещение в ${surface.name} (${newX}, ${newY})`);
                        this.interactWithObjects();
                        this.updateUI();
                    } else {
                        this.addLog('⚠️ Недостаточно ресурсов для перемещения');
                    }
                } else {
                    this.addLog('⚠️ Достигнута граница карты');
                }
            }
        });
    }

    interactWithObjects() {
        const objIndex = this.objects.findIndex(o => o.x === this.player.x && o.y === this.player.y);
        if (objIndex !== -1) {
            const obj = this.objects[objIndex];
            if (obj instanceof Monster) {
                this.addLog('⚔️ Началась битва с монстром!');
                this.startBattle(obj, objIndex);
            } else {
                obj.interact(this.player);
                this.addLog(`💰 Найден ${obj.type}! Получены ресурсы: ${formatResources(obj.config.resourceGain)}`);
                this.objects.splice(objIndex, 1);
            }
        }
    }

    startBattle(monster, index) {
        this.paused = true;
        this.currentMonster = monster;
        this.currentMonsterIndex = index;

        const battleOverlay = document.getElementById('battleOverlay');
        const battlePanel = document.getElementById('battle');
        const battleContent = document.getElementById('battleContent');

        battleOverlay.style.display = 'block';
        battlePanel.style.display = 'block';

        this.updateBattleUI();
    }

    updateBattleUI() {
        const battleContent = document.getElementById('battleContent');
        battleContent.innerHTML = '';

        // Monster info
        const monsterInfo = document.createElement('div');
        monsterInfo.className = 'monster-info';
        monsterInfo.innerHTML = `
            <h3>🐉 Битва с монстром</h3>
            <p><strong>HP монстра:</strong> ${this.currentMonster.getHpString()}</p>
        `;
        battleContent.appendChild(monsterInfo);

        // Combat spells
        const combatSpells = CONFIG.SPELLS.filter(s => s.combat);
        combatSpells.forEach(spell => {
            const spellDiv = document.createElement('div');
            spellDiv.className = 'spell-info';
            
            const canAfford = this.player.canAfford(spell.cost);
            const btn = document.createElement('button');
            btn.className = 'battle-button';
            btn.textContent = `${spell.name} (${formatResources(spell.cost)}) - урон: ${formatResources(spell.damage)}`;
            btn.disabled = !canAfford;
            
            btn.onclick = () => {
                if (!this.player.canAfford(spell.cost)) {
                    return;
                }
                this.player.applyCost(spell.cost);
                this.currentMonster.receiveDamage(spell.damage);
                this.addLog(`⚡ Использовано заклинание "${spell.name}" - урон: ${formatResources(spell.damage)}`);
                
                if (this.currentMonster.isDead()) {
                    this.objects.splice(this.currentMonsterIndex, 1);
                    this.addLog('🏆 Монстр побежден!');
                    this.endBattle();
                    this.generateObjects(); // Spawn new monsters
                } else {
                    this.updateBattleUI();
                }
                this.updateUI();
            };
            
            spellDiv.appendChild(btn);
            battleContent.appendChild(spellDiv);
        });

        // Flee button
        const fleeBtn = document.createElement('button');
        fleeBtn.className = 'battle-button flee-button';
        fleeBtn.textContent = '🏃 Сбежать';
        fleeBtn.onclick = () => {
            this.addLog('🏃 Вы сбежали из битвы');
            this.endBattle();
        };
        battleContent.appendChild(fleeBtn);
    }

    endBattle() {
        console.log('Ending battle');
        this.currentMonster = null;
        this.currentMonsterIndex = -1;
        this.paused = false;
        
        const battleOverlay = document.getElementById('battleOverlay');
        const battlePanel = document.getElementById('battle');
        
        battleOverlay.style.display = 'none';
        battlePanel.style.display = 'none';
        
        // Убеждаемся что игра не заморожена
        setTimeout(() => {
            if (this.paused) {
                console.log('Game still paused after battle, force unpausing');
                this.paused = false;
            }
        }, 100);
    }

    updateUI() {
        // Update spells panel
        const spellsList = document.getElementById('spellsList');
        if (spellsList) {
            spellsList.innerHTML = '';
            
            const nonCombatSpells = CONFIG.SPELLS.filter(s => !s.combat);
            nonCombatSpells.forEach(spell => {
                const spellDiv = document.createElement('div');
                spellDiv.className = 'spell-info';
                
                const canAfford = this.player.canAfford(spell.cost);
                const btn = document.createElement('button');
                btn.className = 'battle-button';
                btn.textContent = `${spell.name} (${formatResources(spell.cost)})`;
                btn.disabled = !canAfford;
                
                btn.onclick = () => {
                    if (this.player.canAfford(spell.cost)) {
                        this.player.applyCost(spell.cost);
                        this.addLog(`✨ Использовано заклинание "${spell.name}"`);
                        if (spell.effect) {
                            spell.effect();
                        }
                        this.updateUI();
                    }
                };
                
                spellDiv.appendChild(btn);
                spellsList.appendChild(spellDiv);
            });
        }

        // Update terrain actions
        const actionsList = document.getElementById('actionsList');
        if (actionsList) {
            actionsList.innerHTML = '';
            
            const currentSurface = this.terrainManager.getSurface(this.terrain[this.player.y][this.player.x]);
            if (currentSurface && currentSurface.actions) {
                currentSurface.actions.forEach(action => {
                    const actionDiv = document.createElement('div');
                    actionDiv.className = 'spell-info';
                    
                    const canAfford = this.player.canAfford(action.cost);
                    const btn = document.createElement('button');
                    btn.className = 'battle-button';
                    btn.textContent = `${action.label} (${formatResources(action.cost)}) → ${formatResources(action.gain)}`;
                    btn.disabled = !canAfford;
                    
                    btn.onclick = () => {
                        if (this.player.canAfford(action.cost)) {
                            this.player.applyCost(action.cost);
                            this.player.gain(action.gain);
                            this.addLog(`🔨 Выполнено действие "${action.label}" - получено: ${formatResources(action.gain)}`);
                            this.updateUI();
                        }
                    };
                    
                    actionDiv.appendChild(btn);
                    actionsList.appendChild(actionDiv);
                });
            }
        }
    }

    update() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawGrid();
        this.drawObjects();
        this.drawPlayer();
        this.drawResources();
        requestAnimationFrame(() => this.update());
    }

    drawGrid() {
        for (let y = 0; y < CONFIG.ROWS; y++) {
            for (let x = 0; x < CONFIG.COLS; x++) {
                const tileId = this.terrain[y][x];
                const surface = this.terrainManager.getSurface(tileId);
                this.terrainManager.drawTile(this.ctx, x, y, surface);
            }
        }
    }

    drawPlayer() {
        this.player.draw(this.ctx);
    }

    drawObjects() {
        for (const obj of this.objects) {
            obj.draw(this.ctx);
        }
    }

    drawResources() {
        this.ctx.fillStyle = '#000';
        this.ctx.font = '18px Arial';
        this.ctx.textAlign = 'left';
        let offset = 10;
        for (let key in this.player.resources) {
            this.ctx.fillText(`${key} ${this.player.resources[key]}`, offset, 25);
            offset += 60;
        }
    }
}

// Главная функция инициализации игры
async function initGame() {
    console.log('Starting game initialization...');
    
    // Создаем загрузчик
    const loader = new GameLoader();
    
    // Настраиваем обратный вызов для обновления прогресса
    spriteManager.onProgress = (progress, loaded, total) => {
        loader.updateProgress(progress, loaded, total);
    };
    
    try {
        // Показываем загрузчик
        loader.show();
        
        // Предзагружаем все спрайты
        await spriteManager.preloadAllSprites();
        
        // Небольшая задержка для плавности
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Скрываем загрузчик
        loader.hide();
        
        // Создаем игру
        window.game = new Game();
        
        console.log('Game initialized successfully!');
        
        // Удаляем загрузчик через некоторое время
        setTimeout(() => {
            loader.destroy();
        }, 1000);
        
    } catch (error) {
        console.error('Failed to initialize game:', error);
        
        // Показываем ошибку пользователю
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #ff4444;
            color: white;
            padding: 20px;
            border-radius: 10px;
            z-index: 1001;
        `;
        errorDiv.textContent = 'Ошибка загрузки игры. Попробуйте обновить страницу.';
        document.body.appendChild(errorDiv);
    }
}

// Функция для ручной перезагрузки ресурсов
function reloadAssets() {
    if (window.game) {
        delete window.game;
    }
    
    // Очищаем менеджер спрайтов
    spriteManager.sprites.clear();
    spriteManager.loadingPromises.clear();
    spriteManager.loadedAssets = 0;
    
    // Перезапускаем игру
    initGame();
}

// Автоматический запуск при загрузке страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    // Если документ уже загружен
    initGame();
}