const Dep = require('./Dep');
const Watcher = require('./Watcher');
/*
  Observer类会附加到每一个被侦测的object上面。
  一旦被附加上，Observer会将objet的所有属性转换成getter/setter的形式
  来收集属性的依赖，并且当属性发生变化时会通知这些依赖 
 */
class Observer {
    constructor (value) {
        this.value = value;
        if (!Array.isArray(value)) {
            this.walk(value);
        }
    }
    /* 
      walk会将每一个属性转换成getter/setter的形式来侦测变化
      这个方法只有在数据类型为Object时才会被调用
    */
    walk(obj) {
        const keys = Object.keys(obj);
        for (let i = 0; i < keys.length; i++) {
            defineReactive(obj, keys[i], obj[keys[i]]);
        }
    }
}

function defineReactive(data, key, val) {
    // 递归子属性
    if (typeof val === 'object') {
        new Observer(val);
    }
    let dep = new Dep();
    Object.defineProperty(data, key, {
        configurable: true,
        enumerable: true,
        get() {
            dep.depend();
            return val;
        },
        set(newVal) {
            if (newVal === val) return;
            val = newVal;
            dep.notify();
        }
    })
}

const myObj = {
    aa: 12,
    bb: 13
}
new Observer(myObj);
// console.log(myObj);
new Watcher(myObj, 'aa', function (val, oldVal) {
    console.log(val);
})
// console.log(myObj.aa);
myObj.aa = 33;