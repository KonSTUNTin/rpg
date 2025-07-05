const { useState, useEffect, useCallback, useRef } = React;

// ===== КОНФИГУРАЦИИ (MOCK DATA) =====
const CONFIG = {
    ROWS: 8,
    COLS: 12,
    MONSTER_COUNT: 5,
    OBJECT_CONFIG: OBJECT_CONFIGS.reduce((acc, config) => {
        acc[config.type] = config;
        return acc;
    }, {}),
    SPELLS: SPELLS,
    SURFACES: SURFACES
};

// ===== УТИЛИТЫ =====
const formatResources = (obj) => {
    return Object.entries(obj).map(([k, v]) => `${k}${v}`).join(' ');
};

// ===== КЛАССЫ ИГРОВЫХ ОБЪЕКТОВ =====
class GameObject {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.config = CONFIG.OBJECT_CONFIG[type];
        this.id = Math.random().toString(36).substr(2, 9);
    }

    interact(player) {
        if (this.config.resourceGain) {
            for (let res in this.config.resourceGain) {
                player.resources[res] = (player.resources[res] || 0) + this.config.resourceGain[res];
            }
        }
    }
}

class Monster extends GameObject {
    constructor(x, y) {
        super(x, y, 'monster');
        this.hp = { '♠': 2, '♣': 2, '♦': 1 };
        this.maxHp = { '♠': 2, '♣': 2, '♦': 1 };
    }

    receiveDamage(damage, player) {
        for (let res in damage) {
            const taken = Math.min(this.hp[res] || 0, damage[res]);
            this.hp[res] = Math.max(0, (this.hp[res] || 0) - taken);
            player.resources[res] = (player.resources[res] || 0) + taken;
        }
    }

    isDead() {
        return Object.values(this.hp).every(val => val === 0);
    }

    getHpString() {
        return Object.entries(this.hp).map(([k, v]) => `${k}${v}`).join(' ');
    }

    attack(player) {
        const damage = { '♠': 1, '♣': 1 };
        let canTakeDamage = false;
        
        for (let res in damage) {
            if ((player.resources[res] || 0) >= damage[res]) {
                canTakeDamage = true;
                break;
            }
        }
        
        if (canTakeDamage) {
            for (let res in damage) {
                const taken = Math.min(player.resources[res] || 0, damage[res]);
                player.resources[res] = Math.max(0, (player.resources[res] || 0) - taken);
            }
            return `Монстр атаковал! Потеряны ресурсы: ${formatResources(damage)}`;
        } else {
            return 'Монстр атаковал, но у вас недостаточно ресурсов для урона';
        }
    }
}

// ===== ГЕНЕРАТОР МЕСТНОСТИ =====
class TerrainManager {
    constructor(rows, cols, surfaces) {
        this.rows = rows;
        this.cols = cols;
        this.surfaces = surfaces;
        this.seedX = Math.random() * 1000;
        this.seedY = Math.random() * 1000;
        this.map = this.generate();
    }

    noise(x, y) {
        return Math.sin((x + this.seedX) * 3.14 + (y + this.seedY) * 1.618) * 
               Math.cos((y + this.seedY) * 3.14 + (x + this.seedX) * 1.618);
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

// ===== UI КОМПОНЕНТЫ =====

// Компонент ресурса
const ResourceItem = ({ symbol, amount }) => (
    <span className="resource">
        {symbol} {amount}
    </span>
);

// Панель ресурсов
const ResourcesPanel = ({ resources }) => (
    <div className="resources-panel">
        <h3>Ресурсы:</h3>
        <div className="resources">
            {Object.entries(resources).map(([symbol, amount]) => (
                <ResourceItem key={symbol} symbol={symbol} amount={amount} />
            ))}
        </div>
    </div>
);

// Клетка местности
const TerrainCell = ({ x, y, surface, isPlayerHere, objectHere }) => (
    <div
        className="terrain-cell"
        style={{ backgroundColor: surface?.color }}
        title={`${surface?.name} (${x}, ${y})`}
    >
        <div className="surface-emoji">{surface?.emoji}</div>
        {isPlayerHere && <div className="player">🧙‍♂️</div>}
        {objectHere && (
            <div className="game-object">
                {objectHere.config.emoji}
            </div>
        )}
    </div>
);

// Ряд местности
const TerrainRow = ({ y, cols, terrainManager, player, gameObjects }) => (
    <div className="terrain-row">
        {Array.from({ length: cols }, (_, x) => {
            const terrain = terrainManager?.map || [];
            const surface = terrainManager?.getSurface(terrain[y]?.[x]);
            const isPlayerHere = player.x === x && player.y === y;
            const objectHere = gameObjects.find(obj => obj.x === x && obj.y === y);
            
            return (
                <TerrainCell
                    key={x}
                    x={x}
                    y={y}
                    surface={surface}
                    isPlayerHere={isPlayerHere}
                    objectHere={objectHere}
                />
            );
        })}
    </div>
);

// Игровое поле
const GameArea = ({ rows, cols, terrainManager, player, gameObjects }) => (
    <div className="game-area">
        <div className="terrain-grid">
            {Array.from({ length: rows }, (_, y) => (
                <TerrainRow
                    key={y}
                    y={y}
                    cols={cols}
                    terrainManager={terrainManager}
                    player={player}
                    gameObjects={gameObjects}
                />
            ))}
        </div>
    </div>
);

// Кнопка действия
const ActionButton = ({ 
    actionKey, 
    emoji, 
    title, 
    cost, 
    gain, 
    canUse, 
    onClick, 
    className = "action-button" 
}) => (
    <button
        className={`${className} ${!canUse ? 'disabled' : ''}`}
        onClick={onClick}
        disabled={!canUse}
    >
        {actionKey && <span className="hotkey">{actionKey}</span>}
        {emoji && <span className="spell-emoji">{emoji}</span>}
        <div className="button-content">
            <div className="button-title">{title}</div>
            <div className="button-cost">
                {cost && Object.keys(cost).length > 0 && 
                    `Стоимость: ${formatResources(cost)}`
                }
                {cost && gain && Object.keys(cost).length > 0 && ' → '}
                {gain && `Получить: ${formatResources(gain)}`}
            </div>
        </div>
    </button>
);

// Боевая кнопка заклинания
const BattleSpellButton = ({ spell, actionKey, canUse, onUseSpell }) => (
    <ActionButton
        actionKey={actionKey}
        emoji={spell.emoji}
        title={spell.name}
        cost={spell.cost}
        gain={spell.damage ? `Урон: ${formatResources(spell.damage)}` : null}
        canUse={canUse}
        onClick={() => onUseSpell(spell)}
        className="battle-button"
    />
);

// Панель заклинаний
const SpellsPanel = ({ spells, actionMappings, canAfford, onUseSpell }) => (
    <div className="spells-panel">
        <h3>Заклинания</h3>
        {spells.filter(s => !s.combat).map((spell) => {
            const actionKey = Object.keys(actionMappings).find(key => 
                actionMappings[key].description === `Заклинание: ${spell.name}`
            );
            const canUse = canAfford(spell.cost);
            
            return (
                <ActionButton
                    key={spell.name}
                    actionKey={actionKey}
                    emoji={spell.emoji}
                    title={spell.name}
                    cost={spell.cost}
                    canUse={canUse}
                    onClick={() => onUseSpell(spell)}
                />
            );
        })}
    </div>
);

// Панель действий на местности
const TerrainActionsPanel = ({ 
    terrainManager, 
    player, 
    actionMappings, 
    canAfford, 
    onPerformTerrainAction 
}) => {
    const terrain = terrainManager?.map || [];
    const currentSurface = terrainManager?.getSurface(terrain[player.y]?.[player.x]);
    
    if (!currentSurface?.actions?.length) {
        return (
            <div className="terrain-actions">
                <h3>Действия на местности</h3>
                <p>Нет доступных действий</p>
            </div>
        );
    }

    return (
        <div className="terrain-actions">
            <h3>Действия на местности</h3>
            {currentSurface.actions.map((action) => {
                const actionKey = Object.keys(actionMappings).find(key => 
                    actionMappings[key].description === `Действие: ${action.label}`
                );
                const canUse = canAfford(action.cost);
                
                return (
                    <ActionButton
                        key={action.label}
                        actionKey={actionKey}
                        title={action.label}
                        cost={action.cost}
                        gain={action.gain}
                        canUse={canUse}
                        onClick={() => onPerformTerrainAction(action)}
                    />
                );
            })}
        </div>
    );
};

// Информация о монстре
const MonsterInfo = ({ monster }) => (
    <div className="monster-info">
        <h4>🐉 Монстр</h4>
        <p>💖 HP: {monster?.getHpString()}</p>
    </div>
);

// Панель боевых заклинаний
const BattleSpellsPanel = ({ spells, actionMappings, canAfford, onUseSpell }) => (
    <div className="battle-spells">
        <h4>✨ Боевые заклинания:</h4>
        {spells.filter(s => s.combat).map((spell) => {
            const actionKey = Object.keys(actionMappings).find(key => 
                actionMappings[key].description === `Заклинание: ${spell.name}`
            );
            const canUse = canAfford(spell.cost);
            
            return (
                <BattleSpellButton
                    key={spell.name}
                    spell={spell}
                    actionKey={actionKey}
                    canUse={canUse}
                    onUseSpell={onUseSpell}
                />
            );
        })}
    </div>
);

// Кнопка побега
const FleeButton = ({ actionMappings, onFlee }) => {
    const actionKey = Object.keys(actionMappings).find(key => 
        actionMappings[key].description === 'Сбежать из битвы'
    );
    
    return (
        <button className="battle-button flee-button" onClick={onFlee}>
            <span className="hotkey">{actionKey}</span>
            🏃 Сбежать из битвы
        </button>
    );
};

// Панель битвы
const BattlePanel = ({ 
    monster, 
    spells, 
    actionMappings, 
    canAfford, 
    onUseSpell, 
    onFlee 
}) => (
    <div className="battle-panel">
        <h2>⚔️ БИТВА С МОНСТРОМ ⚔️</h2>
        <MonsterInfo monster={monster} />
        <BattleSpellsPanel 
            spells={spells}
            actionMappings={actionMappings}
            canAfford={canAfford}
            onUseSpell={onUseSpell}
        />
        <FleeButton actionMappings={actionMappings} onFlee={onFlee} />
    </div>
);

// Запись в логе
const LogEntry = ({ entry }) => (
    <div className={`log-entry log-${entry.type}`}>
        <span className="log-time">[{entry.time}]</span>
        <span className="log-message">{entry.message}</span>
    </div>
);

// Лог событий
const GameLog = ({ gameLog }) => (
    <div className="game-log">
        <h3>Лог событий</h3>
        <div className="log-content">
            {gameLog.slice(0, 10).map((entry) => (
                <LogEntry key={entry.id} entry={entry} />
            ))}
        </div>
    </div>
);

// Боковая панель
const Sidebar = ({ 
    battleState, 
    spells, 
    actionMappings, 
    canAfford, 
    onUseSpell, 
    onFlee,
    terrainManager,
    player,
    onPerformTerrainAction
}) => (
    <div className="sidebar">
        {!battleState.active ? (
            <>
                <SpellsPanel 
                    spells={spells}
                    actionMappings={actionMappings}
                    canAfford={canAfford}
                    onUseSpell={onUseSpell}
                />
                <TerrainActionsPanel
                    terrainManager={terrainManager}
                    player={player}
                    actionMappings={actionMappings}
                    canAfford={canAfford}
                    onPerformTerrainAction={onPerformTerrainAction}
                />
            </>
        ) : (
            <BattlePanel
                monster={battleState.monster}
                spells={spells}
                actionMappings={actionMappings}
                canAfford={canAfford}
                onUseSpell={onUseSpell}
                onFlee={onFlee}
            />
        )}
    </div>
);

// ===== ГЛАВНЫЙ КОМПОНЕНТ ИГРЫ =====
const RPGGame = () => {
    // Состояния игры
    const [player, setPlayer] = useState({
        x: 0,
        y: 0,
        resources: { '♠': 3, '♦': 5, '♣': 2 }
    });
    
    const [gameObjects, setGameObjects] = useState([]);
    const [gameLog, setGameLog] = useState([]);
    const [battleState, setBattleState] = useState({
        active: false,
        monster: null,
        monsterIndex: -1
    });
    const [actionMappings, setActionMappings] = useState({});
    
    // Ссылки
    const terrainManagerRef = useRef(null);
    const gameContainerRef = useRef(null);

    // Инициализация местности
    useEffect(() => {
        terrainManagerRef.current = new TerrainManager(CONFIG.ROWS, CONFIG.COLS, CONFIG.SURFACES);
        generateObjects();
        addLogEntry('🎮 Игра началась! Используйте стрелки для перемещения.', 'system');
    }, []);

    // Генерация объектов на карте
    const generateObjects = useCallback(() => {
        const newObjects = [];
        const terrain = terrainManagerRef.current?.map || [];
        
        while (newObjects.filter(o => o instanceof Monster).length < CONFIG.MONSTER_COUNT) {
            const x = Math.floor(Math.random() * CONFIG.COLS);
            const y = Math.floor(Math.random() * CONFIG.ROWS);
            
            if (terrain[y] && terrain[y][x] !== 1 && (x !== player.x || y !== player.y)) {
                newObjects.push(new Monster(x, y));
            }
        }
        
        setGameObjects(newObjects);
    }, [player.x, player.y]);

    // Добавление записи в лог
    const addLogEntry = useCallback((message, type = 'system') => {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = {
            time: timestamp,
            message: message,
            type: type,
            id: Date.now() + Math.random()
        };
        
        setGameLog(prev => [logEntry, ...prev.slice(0, 49)]);
    }, []);

    // Проверка возможности позволить себе стоимость
    const canAfford = useCallback((cost) => {
        return Object.entries(cost).every(([k, v]) => (player.resources[k] || 0) >= v);
    }, [player.resources]);

    // Применение стоимости
    const applyCost = useCallback((cost) => {
        setPlayer(prev => {
            const newResources = { ...prev.resources };
            for (let res in cost) {
                newResources[res] = (newResources[res] || 0) - cost[res];
            }
            return { ...prev, resources: newResources };
        });
    }, []);

    // Получение ресурсов
    const gainResources = useCallback((gain) => {
        setPlayer(prev => {
            const newResources = { ...prev.resources };
            for (let res in gain) {
                newResources[res] = (newResources[res] || 0) + gain[res];
            }
            return { ...prev, resources: newResources };
        });
    }, []);

    // Перемещение игрока
    const movePlayer = useCallback((dx, dy) => {
        if (battleState.active) return;
        
        const newX = player.x + dx;
        const newY = player.y + dy;
        
        if (newX >= 0 && newX < CONFIG.COLS && newY >= 0 && newY < CONFIG.ROWS) {
            const terrain = terrainManagerRef.current?.map || [];
            const surface = terrainManagerRef.current?.getSurface(terrain[newY][newX]);
            
            if (surface && canAfford(surface.moveCost)) {
                applyCost(surface.moveCost);
                setPlayer(prev => ({ ...prev, x: newX, y: newY }));
                addLogEntry(`🚶 Перемещение в ${surface.name} (${newX}, ${newY})`, 'player');
                
                // Проверяем взаимодействие с объектами
                setTimeout(() => interactWithObjects(newX, newY), 100);
            } else {
                addLogEntry('⚠️ Недостаточно ресурсов для перемещения', 'error');
            }
        } else {
            addLogEntry('⚠️ Достигнута граница карты', 'error');
        }
    }, [player.x, player.y, battleState.active, canAfford, applyCost, addLogEntry]);

    // Взаимодействие с объектами
    const interactWithObjects = useCallback((x, y) => {
        const objIndex = gameObjects.findIndex(o => o.x === x && o.y === y);
        if (objIndex !== -1) {
            const obj = gameObjects[objIndex];
            if (obj instanceof Monster) {
                addLogEntry('⚔️ Столкновение с монстром! Начинается бой.', 'monster');
                startBattle(obj, objIndex);
            } else {
                obj.interact(player);
                setPlayer(prev => {
                    const newResources = { ...prev.resources };
                    for (let res in obj.config.resourceGain) {
                        newResources[res] = (newResources[res] || 0) + obj.config.resourceGain[res];
                    }
                    return { ...prev, resources: newResources };
                });
                addLogEntry(`💰 Найден ${obj.type}! Получены ресурсы: ${formatResources(obj.config.resourceGain)}`, 'player');
                setGameObjects(prev => prev.filter((_, i) => i !== objIndex));
            }
        }
    }, [gameObjects, player, addLogEntry]);

    // Начало битвы
    const startBattle = useCallback((monster, index) => {
        setBattleState({
            active: true,
            monster: monster,
            monsterIndex: index
        });
        addLogEntry(`⚔️ Началась битва с монстром! HP: ${monster.getHpString()}`, 'warning');
    }, [addLogEntry]);

    // Использование заклинания
    const useSpell = useCallback((spell) => {
        if (!canAfford(spell.cost)) {
            addLogEntry('Недостаточно ресурсов!', 'error');
            return;
        }

        applyCost(spell.cost);
        addLogEntry(`⚡ Использовано заклинание "${spell.name}"`, 'player');

        if (spell.combat && battleState.monster) {
            battleState.monster.receiveDamage(spell.damage, player);
            addLogEntry(`💥 Урон: ${formatResources(spell.damage)}`, 'player');
            
            if (battleState.monster.isDead()) {
                addLogEntry('🏆 Монстр побежден!', 'success');
                endBattle();
                setTimeout(generateObjects, 100);
            } else {
                const attackMessage = battleState.monster.attack(player);
                addLogEntry(attackMessage, 'monster');
                setPlayer(prev => ({ ...prev, resources: { ...prev.resources } }));
            }
        } else if (spell.name === 'Призыв сундука') {
            const x = Math.floor(Math.random() * CONFIG.COLS);
            const y = Math.floor(Math.random() * CONFIG.ROWS);
            const terrain = terrainManagerRef.current?.map || [];
            
            if (terrain[y] && terrain[y][x] !== 1) {
                const chest = new GameObject(x, y, 'chest');
                setGameObjects(prev => [...prev, chest]);
                addLogEntry(`📦 Сундук призван на позицию (${x}, ${y})`, 'player');
            } else {
                addLogEntry('Не удалось призвать сундук - место занято', 'error');
            }
        }
    }, [canAfford, applyCost, addLogEntry, battleState, player, generateObjects]);

    // Завершение битвы
    const endBattle = useCallback(() => {
        setBattleState({ active: false, monster: null, monsterIndex: -1 });
        setGameObjects(prev => prev.filter((_, i) => i !== battleState.monsterIndex));
        setActionMappings({});
    }, [battleState.monsterIndex]);

    // Побег из битвы
    const fleeBattle = useCallback(() => {
        addLogEntry('🏃 Вы сбежали из битвы', 'warning');
        endBattle();
    }, [addLogEntry, endBattle]);

    // Выполнение действия на местности
    const performTerrainAction = useCallback((action) => {
        if (!canAfford(action.cost)) {
            addLogEntry('Недостаточно ресурсов!', 'error');
            return;
        }

        applyCost(action.cost);
        gainResources(action.gain);
        addLogEntry(`🔨 Выполнено действие "${action.label}" - получено: ${formatResources(action.gain)}`, 'player');
    }, [canAfford, applyCost, gainResources, addLogEntry]);

    // Обработка нажатий клавиш
    useEffect(() => {
        const handleKeyPress = (e) => {
            if (e.key >= '1' && e.key <= '9') {
                const action = actionMappings[parseInt(e.key)];
                if (action) {
                    action.callback();
                }
                return;
            }

            if (battleState.active) return;

            const directions = {
                'ArrowUp': [0, -1],
                'ArrowDown': [0, 1],
                'ArrowLeft': [-1, 0],
                'ArrowRight': [1, 0]
            };

            if (directions[e.key]) {
                e.preventDefault();
                const [dx, dy] = directions[e.key];
                movePlayer(dx, dy);
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [movePlayer, battleState.active, actionMappings]);

    // Обновление маппинга действий
    useEffect(() => {
        const newMappings = {};
        let actionIndex = 1;

        if (battleState.active) {
            // Боевые заклинания
            const combatSpells = CONFIG.SPELLS.filter(s => s.combat);
            combatSpells.forEach((spell) => {
                newMappings[actionIndex] = {
                    callback: () => useSpell(spell),
                    description: `Заклинание: ${spell.name}`
                };
                actionIndex++;
            });

            // Кнопка побега
            newMappings[actionIndex] = {
                callback: fleeBattle,
                description: 'Сбежать из битвы'
            };
        } else {
            // Обычные заклинания
            const nonCombatSpells = CONFIG.SPELLS.filter(s => !s.combat);
            nonCombatSpells.forEach((spell) => {
                newMappings[actionIndex] = {
                    callback: () => useSpell(spell),
                    description: `Заклинание: ${spell.name}`
                };
                actionIndex++;
            });

            // Действия на местности
            const terrain = terrainManagerRef.current?.map || [];
            const currentSurface = terrainManagerRef.current?.getSurface(terrain[player.y]?.[player.x]);
            if (currentSurface?.actions) {
                currentSurface.actions.forEach((action) => {
                    newMappings[actionIndex] = {
                        callback: () => performTerrainAction(action),
                        description: `Действие: ${action.label}`
                    };
                    actionIndex++;
                });
            }
        }

        setActionMappings(newMappings);
    }, [battleState.active, player.x, player.y, useSpell, fleeBattle, performTerrainAction]);

    return (
        <div className="rpg-game" ref={gameContainerRef} tabIndex={0}>
            <ResourcesPanel resources={player.resources} />
            
            <div className="game-layout">
                <GameArea 
                    rows={CONFIG.ROWS}
                    cols={CONFIG.COLS}
                    terrainManager={terrainManagerRef.current}
                    player={player}
                    gameObjects={gameObjects}
                />
                
                <Sidebar
                    battleState={battleState}
                    spells={CONFIG.SPELLS}
                    actionMappings={actionMappings}
                    canAfford={canAfford}
                    onUseSpell={useSpell}
                    onFlee={fleeBattle}
                    terrainManager={terrainManagerRef.current}
                    player={player}
                    onPerformTerrainAction={performTerrainAction}
                />
            </div>

            <GameLog gameLog={gameLog} />
   
        </div>
    );
};
