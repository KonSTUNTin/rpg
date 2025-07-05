
const SURFACES = [
    {
        id: 0,
        name: 'Поле',
        color: '#90EE90',
        emoji: '🌾',
        probability: 0.5,
        moveCost: { '♠': 0 },
        actions: [
            { label: 'Собрать урожай', cost: {}, gain: { '♠': 1 } },
            { label: 'Построить амбар', cost: { '♠': 2 }, gain: { '♦': 1 } }
        ]
    },
    {
        id: 1,
        name: 'Скалы',
        color: '#A9A9A9',
        emoji: '🏔️',
        probability: 0.1,
        moveCost: { '♠': 0 },
        actions: []
    },
    {
        id: 2,
        name: 'Река',
        color: '#87CEEB',
        emoji: '🌊',
        probability: 0.4,
        moveCost: { '♣': 0 },
        actions: [
            { label: 'Порыбачить', cost: {}, gain: { '♣': 1 } },
            { label: 'Набрать воду', cost: { '♣': 1 }, gain: { '♦': 2 } }
        ]
    },
    {
        id: 3,
        name: 'Лес',
        color: '#006400',
        emoji: '🌲',
        probability: 0.4,
        moveCost: { '♣': 0 },
        actions: [
            { label: 'Рубить лес', cost: {}, gain: { '♣': 1 } }
        ]
    }
];