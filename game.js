// Refactored game.js (Single-file structure with OOP)

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
            damage: { '♥': 2 }
        },
        {
            name: 'Лёд',
            cost: { '♣': 1 },
            damage: { '♠': 1 }
        },
        {
            name: 'Исцеление',
            cost: { '♣': 2 },
            effect: () => alert('💚 Исцеление!')
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
            }
        }
    ],

    SURFACES: {
        field: {
            id: 0,
            name: 'Поле',
            color: '#90EE90',
            probability: 0.5,
            actions: [
                { label: 'Собрать урожай', cost: {}, gain: { '♠': 1 } },
                { label: 'Построить амбар', cost: { '♠': 2 }, gain: { '♦': 1 } }
            ]
        },
        rock: {
            id: 1,
            name: 'Скалы',
            color: '#A9A9A9',
            probability: 0.1,
            actions: []
        },
        water: {
            id: 2,
            name: 'Река',
            color: '#87CEEB',
            probability: 0.4,
            actions: [
                { label: 'Порыбачить', cost: {}, gain: { '♣': 1 } },
                { label: 'Набрать воду', cost: { '♣': 1 }, gain: { '♦': 2 } }
            ]
        },
        forest: {
            id: 3,
            name: 'Лес',
            color: '#006400',
            probability: 0.4,
            actions: [
                { label: 'Рубить лес', cost: {}, gain: { '♣': 1 } }
            ]
        }
    }
};

class Player {
    constructor(x = 0, y = 0, resources = { '♠': 3, '♦': 5, '♣': 2 }) {
        this.x = x;
        this.y = y;
        this.resources = resources;
    }

    move(dx, dy, terrain, cols, rows) {
        const newX = this.x + dx;
        const newY = this.y + dy;
        if (newX >= 0 && newX < cols && newY >= 0 && newY < rows && terrain[newY][newX] !== 1) {
            this.x = newX;
            this.y = newY;
            return true;
        }
        return false;
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
        this.surfaces = Object.values(surfaces).sort((a, b) => a.id - b.id);
        this.seedX = Math.random() * 1000;
        this.seedY = Math.random() * 1000;
        this.map = this.generate();
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

    getSurface(id) {
        return this.surfaces.find(s => s.id === id);
    }
}

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

class Monster extends GameObject {
    constructor(x, y) {
        super(x, y, 'monster');
    }
}

class Chest extends GameObject {
    constructor(x, y) {
        super(x, y, 'chest');
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.player = new Player();
        this.terrainManager = new TerrainManager(CONFIG.ROWS, CONFIG.COLS, CONFIG.SURFACES);
        this.terrain = this.terrainManager.map;
        this.objects = [];
        this.generateObjects();
        this.bindKeys();
        requestAnimationFrame(() => this.update());
    }

    generateObjects() {
        let count = 0;
        while (count < CONFIG.MONSTER_COUNT) {
            const x = Math.floor(Math.random() * CONFIG.COLS);
            const y = Math.floor(Math.random() * CONFIG.ROWS);
            if (this.terrain[y][x] !== 1 && (x !== this.player.x || y !== this.player.y)) {
                this.objects.push(new Monster(x, y));
                count++;
            }
        }
        for (let i = 0; i < 3; i++) {
            const x = Math.floor(Math.random() * CONFIG.COLS);
            const y = Math.floor(Math.random() * CONFIG.ROWS);
            if (this.terrain[y][x] !== 1 && (x !== this.player.x || y !== this.player.y)) {
                this.objects.push(new Chest(x, y));
            }
        }
    }

    bindKeys() {
        document.addEventListener('keydown', (e) => {
            const dir = {
                ArrowUp: [0, -1],
                ArrowDown: [0, 1],
                ArrowLeft: [-1, 0],
                ArrowRight: [1, 0]
            }[e.key];
            if (dir) {
                const [dx, dy] = dir;
                if (this.player.move(dx, dy, this.terrain, CONFIG.COLS, CONFIG.ROWS)) {
                    this.interactWithObjects();
                }
            }
        });
    }

    interactWithObjects() {
        const objIndex = this.objects.findIndex(o => o.x === this.player.x && o.y === this.player.y);
        if (objIndex !== -1) {
            const obj = this.objects[objIndex];
            obj.interact(this.player);
            if (!(obj instanceof Monster)) this.objects.splice(objIndex, 1);
        }
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
        this.ctx.stroke();
    }

    drawObjects() {
        for (const obj of this.objects) obj.draw(this.ctx);
    }

    drawResources() {
        this.ctx.fillStyle = '#000';
        this.ctx.font = '20px Arial';
        let offset = 10;
        for (let key in this.player.resources) {
            this.ctx.fillText(`${key} ${this.player.resources[key]}`, offset, 25);
            offset += 70;
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
}

let game = new Game();
