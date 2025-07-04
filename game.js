
const CONFIG = {
    TILE_SIZE: 50,
    ROWS: 8,
    COLS: 12,
    MONSTER_COUNT: 5,

    OBJECT_CONFIG: {
        monster: {
            type: 'monster',
            color: 'purple',
            resourceGain: { '♠': 2, '♣': 1 }
        },
        chest: {
            type: 'chest',
            color: 'gold',
            resourceGain: { '♦': 3 }
        }
    },

    SPELLS: [
        {
            name: 'Огненный шар',
            cost: { '♠': 2, '♦': 1 },
            damage: { '♥': 2 },
            combat: true
        },
        {
            name: 'Лёд',
            cost: { '♣': 1 },
            damage: { '♠': 1 },
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
    ],

    SURFACES: [
        {
            id: 0,
            name: 'Поле',
            color: '#90EE90',
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
            probability: 0.1,
            moveCost: { '♠': 0 },
            actions: []
        },
        {
            id: 2,
            name: 'Река',
            color: '#87CEEB',
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
            probability: 0.4,
            moveCost: { '♣': 0 },
            actions: [
                { label: 'Рубить лес', cost: {}, gain: { '♣': 1 }, combat: false, depth: 3 }
            ]
        }
    ]
};

class GameObject {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.config = CONFIG.OBJECT_CONFIG[type];
    }

    interact(player) {
        if (this.config.resourceGain) {
            player.gain(this.config.resourceGain);
        }
    }

    draw(ctx) {
        const cx = this.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const cy = this.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, CONFIG.TILE_SIZE / 4, 0, 2 * Math.PI);
        ctx.fillStyle = this.config.color;
        ctx.fill();
        ctx.stroke();
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
                this.ctx.fillStyle = surface.color;
                this.ctx.fillRect(x * CONFIG.TILE_SIZE, y * CONFIG.TILE_SIZE, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                this.ctx.strokeStyle = '#333';
                this.ctx.strokeRect(x * CONFIG.TILE_SIZE, y * CONFIG.TILE_SIZE, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
            }
        }
    }

    drawPlayer() {
        const cx = this.player.x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        const cy = this.player.y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, CONFIG.TILE_SIZE / 4, 0, 2 * Math.PI);
        this.ctx.fillStyle = 'red';
        this.ctx.fill();
        this.ctx.strokeStyle = '#000';
        this.ctx.stroke();
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