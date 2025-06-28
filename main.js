// === Configuration ===
const CONFIG = {
    canvas: {
        width: 800,
        height: 600,
        backgroundColor: '#2a2a2a'
    },
    game: {
        fps: 60,
        attackCooldown: 60,
        combatRange: 20,
        unitRadius: 12
    },
    cards: {
        minRank: 2,
        maxCardsPerStat: 5,
        deckSize: 25
    }
};

const CARD_DATA = {
    ranks: { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' },
    suits: {
        attack: '🗡',
        health: '❤️',
        speed: '💨',
        dexterity: '🎯'
    },
    effects: {
        attack: rank => rank * 10,
        health: rank => rank * 20,
        speed: rank => rank * 0.1,
        dexterity: rank => rank * 10
    }
};

// === Core Classes ===
class Unit {
    constructor(attack, speed, health, dexterity, faction) {
        this.attack = attack;
        this.speed = speed;
        this.health = health;
        this.maxHealth = health;
        this.dexterity = dexterity;
        this.faction = faction;
        this.color = faction.color;
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.target = null;
        this.attackCooldown = 0;
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
    }

    update(opponents, allies) {
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }

        if (!this.target || this.target.health <= 0 || !opponents.includes(this.target)) {
            this.target = this.findClosest(opponents);
        }

        if (this.target) {
            this.moveToward(this.target);
            if (this.distanceTo(this.target) < CONFIG.game.combatRange && this.attackCooldown <= 0) {
                let damage = this.attack * 0.5;
                this.target.health -= damage;
                this.attackCooldown = CONFIG.game.attackCooldown;
            }
        }

        this.x = Math.max(CONFIG.game.unitRadius, Math.min(CONFIG.canvas.width - CONFIG.game.unitRadius, this.x + this.vx));
        this.y = Math.max(CONFIG.game.unitRadius, Math.min(CONFIG.canvas.height - CONFIG.game.unitRadius, this.y + this.vy));
    }

    findClosest(units) {
        let closest = null;
        let minDist = Infinity;
        for (let u of units) {
            let d = this.distanceTo(u);
            if (d < minDist) {
                minDist = d;
                closest = u;
            }
        }
        return closest;
    }

    moveToward(target) {
        let dx = target.x - this.x;
        let dy = target.y - this.y;
        let dist = Math.hypot(dx, dy);
        if (dist > CONFIG.game.combatRange) {
            this.vx = (dx / dist) * this.speed;
            this.vy = (dy / dist) * this.speed;
        } else {
            this.vx = 0;
            this.vy = 0;
        }
    }

    distanceTo(other) {
        return Math.hypot(this.x - other.x, this.y - other.y);
    }

    draw(ctx) {
        // Unit circle
        ctx.beginPath();
        ctx.arc(this.x, this.y, CONFIG.game.unitRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();

        // Health bar
        let healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = 'red';
        ctx.fillRect(this.x - 15, this.y - 20, 30, 4);
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x - 15, this.y - 20, 30 * healthPercent, 4);
    }
}

class Faction {
    constructor(name, color) {
        this.name = name;
        this.color = color;
        this.units = [];
    }
}

// === Game Systems ===
class BattleSystem {
    constructor(canvas, ctx) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.units = [];
        this.factions = [
            new Faction('Blue', 'blue'),
            new Faction('Red', 'red')
        ];
        this.running = false;
    }

    startBattle(userConfigs) {
        this.clearAll();
        this.units = [];
        this.factions[0].units = [];
        this.factions[1].units = [];

        // Spawn allies
        for (let cfg of userConfigs) {
            let u = new Unit(cfg.attack, cfg.speed, cfg.health, cfg.dexterity, this.factions[0]);
            u.setPosition(
                Math.random() * (CONFIG.canvas.width - 100) + 50,
                Math.random() * (CONFIG.canvas.height - 100) + 50
            );
            this.factions[0].units.push(u);
            this.units.push(u);
        }

        // Spawn enemies
        for (let i = 0; i < userConfigs.length; i++) {
            let u = new Unit(
                Math.floor(Math.random() * 80 + 20),
                Math.random() * 2 + 0.5,
                100 + Math.random() * 100,
                Math.floor(Math.random() * 100),
                this.factions[1]
            );
            u.setPosition(
                Math.random() * (CONFIG.canvas.width - 100) + 50,
                Math.random() * (CONFIG.canvas.height - 100) + 50
            );
            this.factions[1].units.push(u);
            this.units.push(u);
        }

        this.running = true;
        this.gameLoop();
    }

    update() {
        this.ctx.fillStyle = CONFIG.canvas.backgroundColor;
        this.ctx.fillRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);

        for (let i = this.units.length - 1; i >= 0; i--) {
            let unit = this.units[i];
            if (unit.health <= 0) {
                unit.faction.units = unit.faction.units.filter(u => u !== unit);
                this.units.splice(i, 1);
                continue;
            }

            let opponents = this.units.filter(u => u.faction !== unit.faction);
            let allies = this.units.filter(u => u.faction === unit.faction && u !== unit);
            unit.update(opponents, allies);
            unit.draw(this.ctx);
        }

        // Check win/lose conditions
        if (this.running) {
            if (this.factions[0].units.length === 0) {
                gameManager.endBattle(false);
                this.running = false;
            } else if (this.factions[1].units.length === 0) {
                gameManager.incrementRoom();
                gameManager.endBattle(true);
                this.running = false;
            }
        }
    }

    gameLoop() {
        if (this.running) {
            this.update();
            requestAnimationFrame(() => this.gameLoop());
        }
    }

    clearAll() {
        this.ctx.clearRect(0, 0, CONFIG.canvas.width, CONFIG.canvas.height);
    }
}

class CardSystem {
    constructor() {
        this.deck = [];
        this.generateDeck();
    }

    generateDeck() {
        const suits = Object.keys(CARD_DATA.suits); // ["attack", "health", "speed", "dexterity"]
        const fullDeck = [];
    
        // 1. Генерируем полную колоду (каждая масть, ранги от 2 до 14)
        for (let suit of suits) {
            for (let rank = 2; rank <= 14; rank++) {
                fullDeck.push({ suit, rank });
            }
        }
    
        // 2. Перемешиваем колоду
        for (let i = fullDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [fullDeck[i], fullDeck[j]] = [fullDeck[j], fullDeck[i]];
        }
    
        // 3. Берем первые N карт
        this.deck = fullDeck.slice(0, CONFIG.cards.deckSize);
    }
    

    createCard(suit, rank) {
        return { suit, rank };
    }

    getCardDisplay(card) {
        let rank = CARD_DATA.ranks[card.rank] || card.rank;
        return `${rank}${CARD_DATA.suits[card.suit]}`;
    }

    calculateEffect(stat, rank) {
        return CARD_DATA.effects[stat](rank);
    }
}

class UnitSystem {
    constructor(cardSystem) {
        this.cardSystem = cardSystem;
        this.units = [];
        this.createUnits();
    }

    createUnits() {
        this.units = [];
        for (let i = 0; i < 4; i++) {
            this.units.push({
                name: `Юнит #${i + 1}`,
                base: { attack: 0, health: 0, speed: 0, dexterity: 0 },
                cards: { attack: [], health: [], speed: [], dexterity: [] }
            });
        }
    }

    getEffectiveStats(unit) {
        let stats = { ...unit.base };
        for (let stat in unit.cards) {
            let cards = unit.cards[stat];
            if (cards.length === 0) {
                stats[stat] += this.cardSystem.calculateEffect(stat, CONFIG.cards.minRank);
            } else {
                for (let card of cards) {
                    stats[stat] += this.cardSystem.calculateEffect(stat, card.rank);
                }
            }
        }
        return stats;
    }

    getAllUnitCards(unit) {
        let allCards = [];
        for (let stat in unit.cards) {
            allCards = allCards.concat(unit.cards[stat]);
        }
        return allCards;
    }
}

class PokerValidator {
    static isValidHand(cards) {
        if (cards.length === 0) return { valid: true, combo: 'Нет карт' };
        if (cards.length < 2) return { valid: false, combo: 'Недостаточно карт (нужно 5)' };
        if (cards.length > 5) return { valid: false, combo: 'Слишком много карт (максимум 5)' };
        
        let sortedCards = [...cards].sort((a, b) => a.rank - b.rank);
        let ranks = sortedCards.map(c => c.rank);
        let suits = sortedCards.map(c => c.suit);
        
        let rankCounts = {};
        ranks.forEach(rank => {
            rankCounts[rank] = (rankCounts[rank] || 0) + 1;
        });
        
        let counts = Object.values(rankCounts).sort((a, b) => b - a);
        
        // Check combinations
        if (this.isFlush(suits) && this.isStraight(ranks) && ranks[0] === 10) {
            return { valid: true, combo: 'Роял Флеш' };
        }
        
        if (this.isFlush(suits) && this.isStraight(ranks)) {
            return { valid: true, combo: 'Стрит Флеш' };
        }
        
        if (counts[0] === 4) {
            return { valid: true, combo: 'Каре' };
        }
        
        if (counts[0] === 3 && counts[1] === 2) {
            return { valid: true, combo: 'Фулл Хаус' };
        }
        
        if (this.isFlush(suits)) {
            return { valid: true, combo: 'Флеш' };
        }
        
        if (this.isStraight(ranks)) {
            return { valid: true, combo: 'Стрит' };
        }
        
        if (counts[0] === 3) {
            return { valid: true, combo: 'Тройка' };
        }
        
        if (counts[0] === 2 && counts[1] === 2) {
            return { valid: true, combo: 'Две Пары' };
        }
        
        if (counts[0] === 2) {
            return { valid: true, combo: 'Пара' };
        }
        
        return { valid: true, combo: 'Старшая Карта' };
    }

    static isFlush(suits) {
        return suits.every(suit => suit === suits[0]);
    }

    static isStraight(ranks) {
        let uniqueRanks = [...new Set(ranks)].sort((a, b) => a - b);
        if (uniqueRanks.length !== 5) return false;
        
        for (let i = 1; i < uniqueRanks.length; i++) {
            if (uniqueRanks[i] !== uniqueRanks[i-1] + 1) {
                return false;
            }
        }
        return true;
    }
}

// === UI System ===
class UIManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.currentUnit = null;
    }

    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
    }

    updateUnitList() {
        const container = document.getElementById('unit-list');
        container.innerHTML = '';
        let a_max = 0
        let h_max = 0
        let s_max = 0
        let d_max = 0
        this.gameManager.unitSystem.units.forEach((unit, index) => {
            let stats = this.gameManager.unitSystem.getEffectiveStats(unit);
            a_max = Math.max(Math.round(stats.attack), a_max)
            h_max = Math.max(Math.round(stats.health), h_max)
            s_max = Math.max(stats.speed.toFixed(1), s_max)
            d_max = Math.max(Math.round(stats.dexterity), d_max)
        })


        this.gameManager.unitSystem.units.forEach((unit, index) => {
            const unitCard = document.createElement('div');
            unitCard.className = 'unit-card';
            unitCard.onclick = () => this.openEditor(index);
            
            const stats = this.gameManager.unitSystem.getEffectiveStats(unit);
            let a_chart = .9 * Math.round(stats.attack) / a_max + .1
            let h_chart = .9 * Math.round(stats.health) / h_max + .1
            let s_chart = .9 * stats.speed.toFixed(1)/ s_max + .1
            let d_chart = .9 * Math.round(stats.dexterity) / d_max + .1

            unitCard.innerHTML = `
                <div class="unit-name">${unit.name}</div>
                <div class="unit-stats">
                    <span class = 'a_chart' style = 'width : ${a_chart * 100}%'>🗡 ${Math.round(stats.attack)}</span>
                    <span class = 'h_chart' style = 'width : ${h_chart * 100}%'>❤️ ${Math.round(stats.health)}</span>
                    <span class = 's_chart' style = 'width : ${s_chart * 100}%'>💨 ${stats.speed.toFixed(1)}</span>
                    <span class = 'd_chart' style = 'width : ${d_chart * 100}%'>🎯 ${Math.round(stats.dexterity)}</span>
                </div>
            `;
            
            container.appendChild(unitCard);
        });
    }

    openEditor(index) {
        this.currentUnit = this.gameManager.unitSystem.units[index];
        this.showScreen('card-editor');
        document.getElementById('editor-title').textContent = this.currentUnit.name;

        // Update card columns
        for (let stat in CARD_DATA.suits) {
            let col = document.querySelector(`.column[data-stat="${stat}"]`);
            col.innerHTML = `<h3>${CARD_DATA.suits[stat]} ${this.capitalize(stat)}</h3>`;
        
            // Сортировка карт по убыванию ранга
            let sortedCards = [...this.currentUnit.cards[stat]].sort((a, b) => b.rank - a.rank);
            sortedCards.forEach((card, i) => {
                let cardEl = this.createCardElement(card);
                cardEl.onclick = () => {
                    // Удаление нужной карты из массива (по ссылке)
                    const idx = this.currentUnit.cards[stat].indexOf(card);
                    if (idx !== -1) {
                        this.currentUnit.cards[stat].splice(idx, 1);
                        this.gameManager.cardSystem.deck.push(card);
                        this.openEditor(this.gameManager.unitSystem.units.indexOf(this.currentUnit));
                    }
                };
                col.appendChild(cardEl);
            });
        }
        

        this.updateCardPool();
        this.updateComboStatus();
    }

    updateCardPool() {
        const pool = document.getElementById('card-pool');
        pool.innerHTML = '';
    
        let sortedDeck = [...this.gameManager.cardSystem.deck].sort((a, b) => b.rank - a.rank);
    
        sortedDeck.forEach((card) => {
            let cardEl = this.createCardElement(card);
            cardEl.onclick = () => {
                let stat = card.suit;
                if (this.currentUnit.cards[stat].length < CONFIG.cards.maxCardsPerStat) {
                    this.currentUnit.cards[stat].push(card);
    
                    const idx = this.gameManager.cardSystem.deck.indexOf(card);
                    if (idx !== -1) {
                        this.gameManager.cardSystem.deck.splice(idx, 1);
                    }
    
                    this.openEditor(this.gameManager.unitSystem.units.indexOf(this.currentUnit));
                }
            };
            pool.appendChild(cardEl);
        });
    }
    

    updateComboStatus() {
        const statusDiv = document.getElementById('combo-status');
        const allCards = this.gameManager.unitSystem.getAllUnitCards(this.currentUnit);
        const result = PokerValidator.isValidHand(allCards);
        
        let statInfo = [];
        // for (let stat in CARD_DATA.suits) {
        //     let cards = this.currentUnit.cards[stat];
        //     if (cards.length > 0) {
        //         let cardNames = cards.map(card => 
        //             this.gameManager.cardSystem.getCardDisplay(card)
        //         ).join(' ');
        //         statInfo.push(`${CARD_DATA.suits[stat]} ${this.capitalize(stat)}: ${cardNames}`);
        //     } else {
        //         statInfo.push(`${CARD_DATA.suits[stat]} ${this.capitalize(stat)}: Минимум`);
        //     }
        // }
        
        //let message = statInfo.join('<br>') + '<br><br>';
        let message = `<strong>Общая комбинация: ${result.combo}</strong><br>`;
        message += `Всего карт: ${allCards.length}/5`;
        
        statusDiv.innerHTML = message;
        statusDiv.className = result.valid ? 'combo-status combo-valid' : 'combo-status combo-invalid';
    }

    createCardElement(card) {
        const el = document.createElement('div');
        el.className = 'card';
        el.textContent = this.gameManager.cardSystem.getCardDisplay(card);
        return el;
    }

    saveEdits() {
        const allCards = this.gameManager.unitSystem.getAllUnitCards(this.currentUnit);
        const result = PokerValidator.isValidHand(allCards);
        
        if (!result.valid) {
            alert(`Внимание! Неверная покерная комбинация: ${result.combo}.\nНужно ровно 5 карт для создания валидной покерной комбинации.`);
            return;
        }
        
        this.closeEditor();
        this.updateUnitList();
    }

    closeEditor() {
        this.showScreen('setup-screen');
    }

    startBattle() {
        const userConfigs = this.gameManager.unitSystem.units.map(unit => 
            this.gameManager.unitSystem.getEffectiveStats(unit)
        );
        
        this.showScreen('battle-screen');
        document.getElementById('battle-room-count').textContent = this.gameManager.roomCount;
        
        const canvas = document.getElementById('game-canvas');
        const ctx = canvas.getContext('2d');
        this.gameManager.battleSystem = new BattleSystem(canvas, ctx);
        this.gameManager.battleSystem.startBattle(userConfigs);
    }

    showResult(won) {
        this.showScreen('result-screen');
        
        if (won) {
            document.getElementById('result-message').textContent = '🎉 Победа!';
            document.getElementById('next-btn').style.display = 'inline-block';
            document.getElementById('restart-btn').style.display = 'none';
        } else {
            document.getElementById('result-message').textContent = '💀 Поражение!';
            document.getElementById('next-btn').style.display = 'none';
            document.getElementById('restart-btn').style.display = 'inline-block';
        }
    }

    nextBattle() {
        this.showScreen('setup-screen');
        document.getElementById('room-count').textContent = this.gameManager.roomCount;
    }

    restartGame() {
        this.gameManager.roomCount = 0;
        document.getElementById('room-count').textContent = '0';
        this.showScreen('setup-screen');
    }

    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}

// === Game Manager ===
class GameManager {
    constructor() {
        this.roomCount = 0;
        this.cardSystem = new CardSystem();
        this.unitSystem = new UnitSystem(this.cardSystem);
        this.ui = new UIManager(this);
        this.battleSystem = null;
        
        this.initialize();
    }

    initialize() {
        this.ui.updateUnitList();
    }

    incrementRoom() {
        this.roomCount++;
        document.getElementById('room-count').textContent = this.roomCount;
    }

    endBattle(won) {
        this.ui.showResult(won);
    }

    reset() {
        this.roomCount = 0;
        this.cardSystem.generateDeck();
        this.unitSystem.createUnits();
        this.ui.updateUnitList();
    }
}

// === Initialize Game ===
const gameManager = new GameManager();