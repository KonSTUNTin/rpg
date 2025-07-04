// Менеджер спрайтов
class SpriteManager {
    constructor() {
        this.sprites = new Map();
        this.loadingPromises = new Map();
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
                resolve(img);
            };
            img.onerror = () => {
                this.loadingPromises.delete(key);
                reject(new Error(`Failed to load sprite: ${src}`));
            };
            img.src = src;
        });

        this.loadingPromises.set(key, promise);
        return promise;
    }

    getSprite(key) {
        return this.sprites.get(key);
    }

    hasSprite(key) {
        return this.sprites.has(key);
    }
}

// Глобальный менеджер спрайтов
const spriteManager = new SpriteManager();

// Массив конфигураций объектов
const OBJECT_CONFIGS = [
    {
        type: 'monster',
        color: 'purple',
        sprite: null, // Можно задать путь к спрайту: 'assets/monster.png'
        resourceGain: { '♠': 2, '♣': 1 }
    },
    {
        type: 'chest',
        color: 'gold',
        sprite: 'images/chest.png',
        resourceGain: { '♦': 3 }
    }
];

// Массив заклинаний
const SPELLS = [
    {
        name: 'Огненный шар',
        cost: { '♠': 2, '♦': 1 },
        damage: { '♥': 2, '♦': 1, '♠': 1,'♣': 2 },
        combat: true
    },
    {
        name: 'Лёд',
        cost: { '♣': 1 },
        damage: { '♥': 2, '♦': 1, '♠': 1,'♣': 2 },
        combat: true
    },
    {
        name: 'Исцеление',
        cost: { '♣': 2 },
        effect: () => alert('💚 Исцеление!'),
        combat: false
    },
    {
        name: 'Призыв сундука',
        cost: { '♠': 1, '♣': 1 },
        effect: function () {
            const x = Math.floor(Math.random() * CONFIG.COLS);
            const y = Math.floor(Math.random() * CONFIG.ROWS);
            if (game.terrain[y][x] !== 1) {
                game.objects.push(new Chest(x, y));
            }
        },
        combat: false
    }
];

// Массив поверхностей
const SURFACES = [
    {
        id: 0,
        name: 'Поле',
        color: '#90EE90',
        sprite: null,
        probability: 0.5,
        moveCost: { '♠': 0 },
        actions: [
            { label: 'Собрать урожай', cost: {}, gain: { '♠': 1 }, combat: false, depth: 1 },
            { label: 'Построить амбар', cost: { '♠': 2 }, gain: { '♦': 1 }, combat: false, depth: 1 }
        ]
    },
    {
        id: 1,
        name: 'Скалы',
        color: '#A9A9A9',
        sprite: null, // Можно задать путь к спрайту: 'assets/rocks.png'
        probability: 0.1,
        moveCost: { '♠': 0 },
        actions: []
    },
    {
        id: 2,
        name: 'Река',
        color: '#87CEEB',
        sprite: null, // Можно задать путь к спрайту: 'assets/river.png'
        probability: 0.4,
        moveCost: { '♣': 0 },
        actions: [
            { label: 'Порыбачить', cost: {}, gain: { '♣': 1 }, combat: false, depth: 2 },
            { label: 'Набрать воду', cost: { '♣': 1 }, gain: { '♦': 2 }, combat: false, depth: 2 }
        ]
    },
    {
        id: 3,
        name: 'Лес',
        color: '#006400',
        sprite: null, // Можно задать путь к спрайту: 'assets/forest.png'
        probability: 0.4,
        moveCost: { '♣': 0 },
        actions: [
            { label: 'Рубить лес', cost: {}, gain: { '♣': 1 }, combat: false, depth: 3 }
        ]
    }
];

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

class GameObject {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.config = CONFIG.OBJECT_CONFIG[type];
        this.spriteLoaded = false;
        
        // Загружаем спрайт если он задан
        if (this.config.sprite) {
            this.loadSprite();
        }
    }

    async loadSprite() {
        try {
            await spriteManager.loadSprite(this.type, this.config.sprite);
            this.spriteLoaded = true;
        } catch (error) {
            console.warn(`Failed to load sprite for ${this.type}:`, error);
        }
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
        this.sprite = null; // Можно задать путь к спрайту игрока: 'assets/player.png'
        this.spriteLoaded = false;
        
        // Загружаем спрайт если он задан
        if (this.sprite) {
            this.loadSprite();
        }
    }

    async loadSprite() {
        try {
            await spriteManager.loadSprite('player', this.sprite);
            this.spriteLoaded = true;
        } catch (error) {
            console.warn('Failed to load player sprite:', error);
        }
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
        this.loadSurfaceSprites();
    }

    async loadSurfaceSprites() {
        for (const surface of this.surfaces) {
            if (surface.sprite) {
                try {
                    await spriteManager.loadSprite(`surface_${surface.id}`, surface.sprite);
                } catch (error) {
                    console.warn(`Failed to load surface sprite for ${surface.name}:`, error);
                }
            }
        }
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
        this.generateObjects();
        this.bindKeys();
        this.updateUI();
        requestAnimationFrame(() => this.update());
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
                        this.interactWithObjects();
                        this.updateUI();
                        this.updateGameStatus(`Moved to ${surface.name}`);
                    } else {
                        this.updateGameStatus('Cannot move - insufficient resources');
                    }
                } else {
                    this.updateGameStatus('Cannot move - boundary reached');
                }
            }
        });
    }

    interactWithObjects() {
        const objIndex = this.objects.findIndex(o => o.x === this.player.x && o.y === this.player.y);
        if (objIndex !== -1) {
            const obj = this.objects[objIndex];
            if (obj instanceof Monster) {
                this.startBattle(obj, objIndex);
            } else {
                obj.interact(this.player);
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
                
                if (this.currentMonster.isDead()) {
                    this.objects.splice(this.currentMonsterIndex, 1);
                    this.updateGameStatus('Monster defeated!');
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
            this.endBattle();
        };
        battleContent.appendChild(fleeBtn);
    }

    endBattle() {
        console.log('Ending battle');
        this.currentMonster = null;
        this.currentMonsterIndex = -1;
        this.paused = false;
        this.updateGameStatus('Ready to explore');
        
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

    updateGameStatus(message) {
        const statusElement = document.getElementById('gameStatus');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.style.color = this.paused ? 'red' : 'green';
        }
    }

    updateUI() {
        // Update spells panel
        const spellsList = document.getElementById('spellsList');
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
                    if (spell.effect) {
                        spell.effect();
                    }
                    this.updateUI();
                }
            };
            
            spellDiv.appendChild(btn);
            spellsList.appendChild(spellDiv);
        });

        // Update terrain actions
        const actionsList = document.getElementById('actionsList');
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
                        this.updateUI();
                        this.updateGameStatus(`Performed ${action.label}`);
                    }
                };
                
                actionDiv.appendChild(btn);
                actionsList.appendChild(actionDiv);
            });
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

let game = new Game();