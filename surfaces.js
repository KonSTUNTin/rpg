// Массив поверхностей
export const SURFACES = [
    {
        id: 0,
        name: 'Поле',
        color: '#90EE90',
        sprite: null,
        probability: 0.5,
        moveCost: { '♠': 0 },
        resourceGain: { '♠': 1 }, // Ресурсы, доступные в этой клетке
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
        resourceGain: { '♦': 1 },
        actions: []
    },
    {
        id: 2,
        name: 'Река',
        color: '#87CEEB',
        sprite: null, // Можно задать путь к спрайту: 'assets/river.png'
        probability: 0.4,
        moveCost: { '♣': 0 },
        resourceGain: { '♣': 1, '♦': 1 },
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
        resourceGain: { '♣': 1, '♠': 1 },
        actions: [
            { label: 'Рубить лес', cost: {}, gain: { '♣': 1 }, combat: false, depth: 3 }
        ]
    }
];