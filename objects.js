// Массив конфигураций объектов
export const OBJECT_CONFIGS = [
    {
        type: 'monster',
        color: 'purple',
        sprite: null, // Можно задать путь к спрайту: 'assets/monster.png'
        resourceGain: { '♠': 2, '♣': 1 }
    },
    {
        type: 'chest',
        //color: 'gold',
        sprite: './images/chest.png',
        resourceGain: { '♦': 3 }
    }
];