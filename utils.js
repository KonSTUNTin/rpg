// ===== UTILITY FUNCTIONS =====
export class Utils {
    static formatResources(obj) {
        return Object.entries(obj).map(([k, v]) => `${k}${v}`).join(' ');
    }
    
    static getRandomSeed() {
        return Math.random() * 1000;
    }
    
    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }
    
    static isValidPosition(x, y, cols = CONFIG.COLS, rows = CONFIG.ROWS) {
        return x >= 0 && x < cols && y >= 0 && y < rows;
    }

    static createElement(tag, className = null, id = null) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (id) element.id = id;
        return element;
    }
}