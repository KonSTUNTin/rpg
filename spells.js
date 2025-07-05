
const SPELLS = [
    {
        name: 'Огненный шар',
        emoji: '🔥',
        cost: { '♠': 2, '♦': 1 },
        damage: { '♥': 2, '♦': 1, '♠': 1, '♣': 2 },
        combat: true
    },
    {
        name: 'Лёд',
        emoji: '❄️',
        cost: { '♣': 1 },
        damage: { '♥': 2, '♦': 1, '♠': 1, '♣': 2 },
        combat: true
    },
    {
        name: 'Исцеление',
        emoji: '💚',
        cost: { '♣': 2 },
        combat: false
    },
    {
        name: 'Призыв сундука',
        emoji: '📦',
        cost: { '♠': 1, '♣': 1 },
        combat: false
    }
];