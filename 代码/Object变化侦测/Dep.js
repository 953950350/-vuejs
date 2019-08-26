module.exports = class Deep{
    constructor() {
        this.subs = [];
    }
    addSub (sub) {
        this.subs.push(sub);
    }
    removeSub(sub) {
        remove(this.subs, sub);    
    }
    depend() {
        if (global.target) {
            this.addSub(global.target);
        }
    }
    notify () {
        const subs = this.subs.slice();
        subs.forEach(item => item.update());
    }
}

function remove(arr, item) {
    if (!arr.length) return;
    const index = arr.indexOf(item);
    if (!~index) return;
    arr.splice(index, 1);
}