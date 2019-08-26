import Dep from './Dep';
import Watcher from './Watcher';
function defineReactive(data, key, val) {
    Object.defineProperty(data, key, {
        configurable: true,
        enumerable: true,
        get() {
            return val;
        },
        set(newVal) {
            if (val === newVal) {
                return;
            }
            val = newVal;
        }
    })
}

function defineReactive(data, key, val) {
    const deep = [];
    Object.defineProperty(data, key, {
        configurable: true,
        enumerable: true,
        get() {
            deep.push(window.target);
            return val;
        },
        set(newVal) {
            if (val === newVal) {
                return;
            }
            val = newVal;
            for (let i = 0; i < deep.length; i++) {
                deep[i](newVal, val);
            }
        }
    })
}



function defineReactive(data, key, val) {
    const deep = new Deep()
    Object.defineProperty(data, key, {
        configurable: true,
        enumerable: true,
        get() {
            deep.depend();
            return val;
        },
        set(newVal) {
            if (val === newVal) {
                return;
            }
            val = newVal;
            deep.notify();
        }
    })
}