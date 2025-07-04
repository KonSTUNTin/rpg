// Массив заклинаний
export const SPELLS = [
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
        effect: () => game.addLog('💚 Исцеление!'),
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
                game.addLog(`📦 Сундук призван на позицию (${x}, ${y})`);
            }
        },
        combat: false
    }
];