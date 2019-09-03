const Dep = require('../Object变化侦测/Dep')
const arrayProto = Array.prototype

export const arrayMethods = Object.create(arrayProto)

;[
    'splice',
    'push',
    'pop',
    'shift',
    'unshift',
    'sort',
    'reverse'
].forEach(key => {
    const original = arrayMethods[key]
    def(arrayMethods, key, function mutator (...arg) {
        const ob = this.__ob__
        const result = original.apply(this, arg)
        ob.dep.notify()
        return result
    })
})
const hasProto = '__proto__' in {}
const keys = Object.getOwnPropertyNames(arrayMethods)
export class Observer {
    constructor(value) {
        this.value = value
        this.dep = new Dep()
        def(value, '__ob__', this)
        if(Array.isArray(this.value)) {
            const augment = hasProto ? protoAugment : copyAugment
            augment(this.value, arrayMethods, keys)
        } else {
            this.walk(value)
        }
    }
    walk(value) {
        const keys = Object.keys(value)
        keys.forEach(key => {
            defineReactive(value, key, value[key])
        })
    }
}

function protoAugment(target, src, keys) {
    target.__proto__ = src
}

function copyAugment(target, src, keys) {
    keys.forEach(key => def(target, key, target[key]))
}

function def(target, key, value, enumerable) {
    Object.defineProperty(target, key, {
        writable: true,
        enumerable: !!enumerable,
        configurable: true,
        value
    })
}

function defineReactive(data, key, val) {
    const childOb = observe(val)
    let dep = new Dep()
    Object.defineProperty(data, key, {
        configurable: true,
        enumerable: true,
        get() {
            dep.depend();
            if (childOb) {
                childOb.dep.depend()
            }
            return val;
        },
        set(newVal) {
            if (newVal === val) return;
            val = newVal;
            this.dep.notify();
        }
    })
}

function observe(value, asRootData) {
    if (!isObject(value)) return
    let ob
    if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
        ob = value.__ob__
    } else {
        ob = new Observer(value)
    }
    return ob
}