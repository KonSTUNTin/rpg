// config.js

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
            effect: () => {
                const x = Math.floor(Math.random() * COLS);
                const y = Math.floor(Math.random() * ROWS);
                if (terrain[y][x] !== 1) {
                    objects.push(new Chest(x, y));
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
                {
                    label: 'Собрать урожай',
                    cost: {},
                    gain: { '♠': 1 }
                },
                {
                    label: 'Построить амбар',
                    cost: { '♠': 2 },
                    gain: { '♦': 1 }
                }
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
                {
                    label: 'Порыбачить',
                    cost: {},
                    gain: { '♣': 1 }
                },
                {
                    label: 'Набрать воду',
                    cost: { '♣': 1 },
                    gain: { '♦': 2 }
                }
            ]
        },
        forest: {
            id: 3,
            name: 'Лес',
            color: '#006400',
            probability: 0.4,
            actions: [
                {
                    label: 'Рубить лес',
                    cost: {},
                    gain: { '♣': 1 }
                }
            ]
        }
    }
};

const SurfaceById = Object.values(CONFIG.SURFACES).reduce((map, surf) => {
    map[surf.id] = surf;
    return map;
}, {});

const { TILE_SIZE, ROWS, COLS, MONSTER_COUNT } = CONFIG;

// game.js

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const SEED_X = Math.random() * 1000;
const SEED_Y = Math.random() * 1000;

// Игрок
let player = { x: 0, y: 0 };

// Ресурсы
let resources = {
    '♠': 3,
    '♦': 5,
    '♣': 2
};

// Классы объектов

class GameObject {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.config = CONFIG.OBJECT_CONFIG[type];
    }

    interact() {
        const gain = this.config.resourceGain || {};
        for (let res in gain) {
            resources[res] = (resources[res] || 0) + gain[res];
        }
    }

    draw(ctx) {
        const cx = this.x * TILE_SIZE + TILE_SIZE / 2;
        const cy = this.y * TILE_SIZE + TILE_SIZE / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, TILE_SIZE / 4, 0, 2 * Math.PI);
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

// Генерация карты

function perlin2(x, y) {
    return Math.sin((x + SEED_X) * 3.14 + (y + SEED_Y) * 1.618) * Math.cos((y + SEED_Y) * 3.14 + (x + SEED_X) * 1.618);
}

function generateTerrain(rows, cols, scale = Math.random() * .3 + .1) {
    const surfaces = Object.values(CONFIG.SURFACES).sort((a, b) => a.id - b.id);
    const surfaceCount = surfaces.length;

    let map = [];

    for (let y = 0; y < rows; y++) {
        let row = [];
        for (let x = 0; x < cols; x++) {
            let v = (perlin2(x * scale, y * scale) + 1) / 2;

            // Получаем индекс по перлину
            let index = Math.floor(v * surfaceCount);
            if (index >= surfaceCount) index = surfaceCount - 1;

            let preferred = surfaces[index];

            // Проверяем вероятность попадания в выбранную поверхность
            if (Math.random() <= (preferred.probability ?? 1)) {
                row.push(preferred.id);
            } else {
                // Выбираем случайную альтернативную поверхность, удовлетворяющую своей вероятности
                let fallback = surfaces.find(surf =>
                    Math.random() <= (surf.probability ?? 0)
                );

                row.push((fallback || preferred).id);
            }
        }
        map.push(row);
    }

    return map;
}



let terrain = generateTerrain(ROWS, COLS);

// Генерация объектов

let objects = [];

function generateObjects() {
    objects = [];

    // Монстры
    while (objects.filter(o => o instanceof Monster).length < MONSTER_COUNT) {
        const x = Math.floor(Math.random() * COLS);
        const y = Math.floor(Math.random() * ROWS);
        if (terrain[y][x] !== 1 && !(x === player.x && y === player.y)) {
            objects.push(new Monster(x, y));
        }
    }

    // Сундуки
    for (let i = 0; i < 3; i++) {
        const x = Math.floor(Math.random() * COLS);
        const y = Math.floor(Math.random() * ROWS);
        if (terrain[y][x] !== 1 && !(x === player.x && y === player.y)) {
            objects.push(new Chest(x, y));
        }
    }
}

generateObjects();

// Перемещение игрока

function movePlayer(dx, dy) {
    const newX = player.x + dx;
    const newY = player.y + dy;

    if (newX >= 0 && newX < COLS && newY >= 0 && newY < ROWS) {
        if (terrain[newY][newX] !== 1) {
            player.x = newX;
            player.y = newY;

            // Взаимодействие с объектом
            const objIndex = objects.findIndex(o => o.x === newX && o.y === newY);
            const obj = objects[objIndex];
            if (obj instanceof Monster) {
                startBattle(obj, objIndex);
                return; // не продолжаем перемещение
            }
        }
    }
}

document.addEventListener('keydown', (e) => {
    const key = e.key;
    if (key === 'ArrowUp') movePlayer(0, -1);
    else if (key === 'ArrowDown') movePlayer(0, 1);
    else if (key === 'ArrowLeft') movePlayer(-1, 0);
    else if (key === 'ArrowRight') movePlayer(1, 0);
});

// Отрисовка

function drawGrid() {
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            const tile = terrain[y][x];
            const surface = SurfaceById[tile];
            ctx.fillStyle = surface.color;
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            ctx.strokeStyle = '#333';
            ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }
}

function drawPlayer() {
    const cx = player.x * TILE_SIZE + TILE_SIZE / 2;
    const cy = player.y * TILE_SIZE + TILE_SIZE / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, TILE_SIZE / 4, 0, 2 * Math.PI);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.stroke();
}

function drawObjects() {
    for (const obj of objects) {
        obj.draw(ctx);
    }
}

function drawResources() {
    ctx.fillStyle = '#000';
    ctx.font = '20px Arial';
    let offset = 10;
    for (let symbol in resources) {
        ctx.fillText(`${symbol} ${resources[symbol]}`, offset, 25);
        offset += 70;
    }
}

function drawActions() {
    const container = document.getElementById('actions');
    container.innerHTML = '';

    const tile = terrain[player.y][player.x];
    const surface = SurfaceById[tile];
    const actions = surface.actions;

    if (!actions || actions.length === 0) {
        container.innerHTML = '<i>Нет доступных действий</i>';
        return;
    }

    actions.forEach(action => {
        const btn = document.createElement('button');
        btn.textContent = formatActionLabel(action);
        btn.style.margin = '5px';
        btn.onclick = () => {
            if (canAfford(action.cost)) {
                applyAction(action);
                update();
            } else {
                alert('Недостаточно ресурсов!');
            }
        };
        container.appendChild(btn);
    });
}

function formatActionLabel(action) {
    const cost = formatResources(action.cost);
    const gain = formatResources(action.gain);
    return `${action.label}${cost ? ' | 🔻' + cost : ''}${gain ? ' | 🔺' + gain : ''}`;
}

function formatResources(res) {
    return Object.entries(res || {})
        .map(([key, val]) => `${key}${val}`)
        .join(' ');
}

function canAfford(cost) {
    for (let res in cost) {
        if ((resources[res] || 0) < cost[res]) return false;
    }
    return true;
}

function applyAction(action) {
    for (let res in action.cost) {
        resources[res] -= action.cost[res];
    }
    for (let res in action.gain) {
        resources[res] = (resources[res] || 0) + action.gain[res];
    }
}

// Главный цикл

function update() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    drawObjects();
    drawPlayer();
    drawResources();
    drawActions();
    requestAnimationFrame(update);
}

update();

document.getElementById('spellbookButton').addEventListener('click', () => {
    const el = document.getElementById('spellbook');
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
    drawSpellbook();
});

function drawSpellbook() {
    const el = document.getElementById('spellbook');
    el.innerHTML = '<h3>📜 Гримуар</h3>';

    CONFIG.SPELLS.forEach(spell => {
        const btn = document.createElement('button');
        btn.textContent = `${spell.name} (💰 ${formatResources(spell.cost)})`;
        btn.style.display = 'block';
        btn.style.margin = '4px 0';

        btn.onclick = () => {
            if (canAfford(spell.cost)) {
                applyCost(spell.cost);
                spell.effect();
                update(); // перерисовка
            } else {
                alert('Недостаточно ресурсов!');
            }
        };

        el.appendChild(btn);
    });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '❌ Закрыть';
    closeBtn.style.marginTop = '10px';
    closeBtn.onclick = () => {
        document.getElementById('spellbook').style.display = 'none';
    };
    el.appendChild(closeBtn);
}
function applyCost(cost) {
    for (let res in cost) {
        resources[res] -= cost[res];
    }
}
let currentMonster = null;
let monsterIndex = null;

function startBattle(monster, index) {
    currentMonster = monster;
    monsterIndex = index;

    document.getElementById('battle').style.display = 'block';
    updateMonsterStats();
    drawBattleSpells();
}
function updateMonsterStats() {
    const statEl = document.getElementById('monsterStats');
    statEl.textContent = Object.entries(currentMonster.hp)
        .map(([suit, val]) => `${suit}${val}`)
        .join(' ');
}
function drawBattleSpells() {
    const container = document.getElementById('spellOptions');
    container.innerHTML = '';

    CONFIG.SPELLS.forEach(spell => {
        const btn = document.createElement('button');
        btn.textContent = `${spell.name} (${formatResources(spell.cost)})`;
        btn.style.display = 'block';
        btn.style.margin = '4px 0';

        btn.onclick = () => {
            if (!canAfford(spell.cost)) {
                alert('Недостаточно ресурсов!');
                return;
            }

            applyCost(spell.cost);

            // Применяем урон
            const damage = spell.damage || { '♠': 1 }; // Можно задать в SPELLS
            currentMonster.receiveDamage(damage);
            updateMonsterStats();

            if (!currentMonster.isAlive()) {
                alert('🎉 Монстр побежден!');
                objects.splice(monsterIndex, 1);
                closeBattle();
                update();
                return;
            }

            // Ответ монстра
            const dmg = currentMonster.randomAttack();
            alert('👾 Монстр атакует!');
            for (let res in dmg) {
                resources[res] = Math.max(0, (resources[res] || 0) - dmg[res]);
            }
            update();
        };

        container.appendChild(btn);
    });
}
document.getElementById('fleeButton').onclick = () => {
    closeBattle();
};

function closeBattle() {
    document.getElementById('battle').style.display = 'none';
    currentMonster = null;
    monsterIndex = null;
}


