// BattleManager.js - Управление боевой системой (версия без инлайн-стилей)

export class BattleManager {
    constructor(game, uiManager, gameState) {
        this.game = game;
        this.ui = uiManager;
        this.gameState = gameState;
        this.battleOverlay = null;
        this.battlePanel = null;
        this.createBattleUI();
    }

    /**
     * Создание UI для битвы
     */
    createBattleUI() {
        // Создаем overlay для битвы
        this.battleOverlay = this._createElement('div', 'battleOverlay');
        this.battleOverlay.id = 'battleOverlay';

        // Создаем панель битвы
        this.battlePanel = this._createElement('div', 'battlePanel');
        this.battlePanel.id = 'battlePanel';

        this.battleOverlay.appendChild(this.battlePanel);
        document.body.appendChild(this.battleOverlay);
    }

    /**
     * Начало битвы с монстром
     * @param {Monster} monster - Монстр для битвы
     * @param {number} monsterIndex - Индекс монстра в массиве объектов
     */
    startBattle(monster, monsterIndex) {
        console.log('Starting battle with monster');
        
        // Используем GameState для управления битвой
        this.gameState.startBattle(monster, monsterIndex);
        
        // Показываем UI битвы
        this.battleOverlay.style.display = 'block';
        
        // Добавляем запись в лог
        this.ui.addLog(`⚔️ Началась битва с монстром! HP: ${monster.getHpString()}`, 'warning');
        
        this.updateBattleUI();
    }

    /**
     * Обновление UI битвы
     */
    updateBattleUI() {
        if (!this.gameState.currentMonster || !this.gameState.battleActive) return;

        this.battlePanel.innerHTML = '';

        // Заголовок битвы
        const title = this._createElement('h2', 'battle-title');
        title.innerHTML = '⚔️ БИТВА С МОНСТРОМ ⚔️';
        this.battlePanel.appendChild(title);

        // Информация о монстре
        const monsterInfo = this._createElement('div', 'battle-monster-info');
        monsterInfo.innerHTML = `
            <div class="battle-monster-title">🐉 <strong>Монстр</strong></div>
            <div class="battle-monster-hp">💖 <strong>HP:</strong> ${this.gameState.currentMonster.getHpString()}</div>
        `;
        this.battlePanel.appendChild(monsterInfo);

        // Информация об игроке
        const playerInfo = this._createElement('div', 'battle-player-info');
        playerInfo.innerHTML = `
            <div class="battle-player-title">🧙 <strong>Ваши ресурсы</strong></div>
            <div class="battle-player-resources">${this.ui.formatResources(this.gameState.player.resources)}</div>
        `;
        this.battlePanel.appendChild(playerInfo);

        // Контейнер для заклинаний
        const spellsContainer = this._createElement('div', 'battle-spells-container');

        const spellsTitle = this._createElement('h3', 'battle-spells-title');
        spellsTitle.textContent = '✨ Боевые заклинания:';
        spellsContainer.appendChild(spellsTitle);

        // Получаем заклинания
        const combatSpells = this.getCombatSpells();
        
        console.log('Combat spells found:', combatSpells.length); // Отладка
        
        if (combatSpells.length === 0) {
            const noSpells = this._createElement('div', 'battle-no-spells');
            noSpells.textContent = 'Нет доступных боевых заклинаний';
            spellsContainer.appendChild(noSpells);
        } else {
            // Сбрасываем действия для битвы
            this.gameState.resetActionMappings();
            
            combatSpells.forEach((spell, index) => {
                const actionKey = index + 1;
                const spellBtn = this.createBattleButton(
                    `${spell.name}`,
                    `Стоимость: ${this.ui.formatResources(spell.cost)} | Урон: ${this.ui.formatResources(spell.damage)}`,
                    this.gameState.player.canAfford(spell.cost),
                    () => this.useSpell(spell)
                );
                
                // Добавляем номер действия
                const button = spellBtn.querySelector('.battle-button');
                const hotkey = this._createElement('span', 'battle-hotkey');
                hotkey.textContent = actionKey;
                button.insertBefore(hotkey, button.firstChild);
                
                // Регистрируем действие в GameState
                this.gameState.addAction(actionKey, () => this.useSpell(spell), `Заклинание: ${spell.name}`);
                
                spellsContainer.appendChild(spellBtn);
            });
        }

        this.battlePanel.appendChild(spellsContainer);

        // Кнопка побега
        const fleeActionKey = combatSpells.length + 1;
        const fleeBtn = this.createBattleButton(
            '🏃 Сбежать из битвы',
            'Покинуть битву без вознаграждения',
            true,
            () => this.fleeBattle(),
            'flee-button'
        );
        
        // Добавляем номер для кнопки побега
        const fleeButton = fleeBtn.querySelector('.battle-button');
        const fleeHotkey = this._createElement('span', 'battle-hotkey');
        fleeHotkey.textContent = fleeActionKey;
        fleeButton.insertBefore(fleeHotkey, fleeButton.firstChild);
        
        // Регистрируем действие побега
        this.gameState.addAction(fleeActionKey, () => this.fleeBattle(), 'Сбежать из битвы');
        
        this.battlePanel.appendChild(fleeBtn);
    }

    /**
     * Получение боевых заклинаний
     * Пытаемся получить заклинания из разных источников
     */
    getCombatSpells() {
        // Пробуем разные способы получения заклинаний
        let spells = [];
        
        // 1. Из глобального CONFIG
        if (typeof CONFIG !== 'undefined' && CONFIG.SPELLS) {
            spells = CONFIG.SPELLS.filter(s => s.combat);
        }
        // 2. Из this.game.config
        else if (this.game && this.game.config && this.game.config.SPELLS) {
            spells = this.game.config.SPELLS.filter(s => s.combat);
        }
        // 3. Из переданного в конструктор объекта config
        else if (this.game && this.game.CONFIG && this.game.CONFIG.SPELLS) {
            spells = this.game.CONFIG.SPELLS.filter(s => s.combat);
        }
        // 4. Последняя попытка - импорт
        else {
            try {
                // Если импортируется как модуль
                const { SPELLS } = await import('./spells.js');
                spells = SPELLS.filter(s => s.combat);
            } catch (e) {
                console.warn('Could not import spells:', e);
                // Фоллбэк - хардкод минимального набора заклинаний
                spells = [
                    {
                        name: 'Огненный шар',
                        cost: { '♠': 2, '♦': 1 },
                        damage: { '♠': 2, '♦': 1 },
                        combat: true
                    },
                    {
                        name: 'Лёд',
                        cost: { '♣': 1 },
                        damage: { '♣': 2 },
                        combat: true
                    }
                ];
            }
        }
        
        console.log('Found combat spells:', spells); // Отладка
        return spells;
    }

    /**
     * Создание кнопки для битвы
     */
    createBattleButton(title, description, enabled, onClick, additionalClass = '') {
        const container = this._createElement('div', 'battle-button-container');

        const btn = this._createElement('button', `battle-button ${additionalClass}`);
        btn.disabled = !enabled;

        const content = this._createElement('div', 'battle-button-content');
        const titleDiv = this._createElement('div', 'battle-button-title');
        titleDiv.textContent = title;
        
        const descDiv = this._createElement('div', 'battle-button-description');
        descDiv.textContent = description;

        content.appendChild(titleDiv);
        content.appendChild(descDiv);
        btn.appendChild(content);

        if (enabled) {
            btn.addEventListener('click', onClick);
        }

        container.appendChild(btn);
        return container;
    }

    /**
     * Использование заклинания в битве
     * @param {Object} spell - Заклинание для использования
     */
    useSpell(spell) {
        if (!this.gameState.player.canAfford(spell.cost)) {
            this.ui.showNotification('Недостаточно ресурсов!', 'error');
            return;
        }

        // Применяем стоимость заклинания через GameState
        if (!this.gameState.castSpell(spell)) {
            this.ui.showNotification('Не удалось использовать заклинание!', 'error');
            return;
        }
        
        // Наносим урон монстру
        this.gameState.currentMonster.receiveDamage(spell.damage);
        
        this.ui.addLog(
            `⚡ Использовано "${spell.name}" - урон: ${this.ui.formatResources(spell.damage)}`,
            'success'
        );

        // Проверяем, умер ли монстр
        if (this.gameState.currentMonster.isDead()) {
            this.ui.addLog('🏆 Монстр побежден!', 'success');
            this.victoryBattle();
        } else {
            // Обновляем UI битвы
            this.updateBattleUI();
        }

        // Обновляем основной UI игры
        this.game.updateUI();
    }

    /**
     * Победа в битве
     */
    victoryBattle() {
        // Используем GameState для управления победой
        this.gameState.victoryBattle();
        
        // Показываем сообщение о победе
        this.ui.showNotification('Монстр побежден! 🏆', 'success');
        
        // Завершаем битву
        this.endBattle();
        
        // Генерируем новых монстров
        this.game.generateObjects();
    }

    /**
     * Побег из битвы
     */
    fleeBattle() {
        this.ui.addLog('🏃 Вы сбежали из битвы', 'warning');
        this.ui.showNotification('Вы сбежали из битвы', 'warning');
        this.endBattle();
    }

    /**
     * Завершение битвы
     */
    endBattle() {
        console.log('Ending battle');
        
        // Используем GameState для управления завершением битвы
        this.gameState.endBattle();
        
        // Скрываем UI битвы
        this.battleOverlay.style.display = 'none';
        
        // Дополнительная проверка на случай зависания
        setTimeout(() => {
            if (this.gameState.paused && !this.gameState.battleActive) {
                console.log('Game still paused after battle, force unpausing');
                this.gameState.paused = false;
            }
        }, 100);
    }

    /**
     * Проверка активности битвы
     * @returns {boolean}
     */
    isBattleActive() {
        return this.gameState.battleActive;
    }

    /**
     * Очистка ресурсов менеджера битвы
     */
    cleanup() {
        if (this.battleOverlay && this.battleOverlay.parentNode) {
            this.battleOverlay.parentNode.removeChild(this.battleOverlay);
            this.battleOverlay = null;
            this.battlePanel = null;
        }
        
        this.gameState.resetBattle();
    }

    /**
     * Утилита для создания элементов с CSS-классами
     * @param {string} tag - HTML тег
     * @param {string} className - CSS класс(ы)
     * @param {string} id - ID элемента (опционально)
     * @returns {HTMLElement}
     */
    _createElement(tag, className = '', id = null) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (id) element.id = id;
        return element;
    }
}