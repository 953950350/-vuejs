const arrayProto = Array.prototype

const arrayMethods = Object.create(arrayProto)

;[
    'push',
    'pop',
    'shift',
    'unshift',
    'sort',
    'reverse',
    'splice'
].forEach(method => {
    // 将原始方法缓存
    const original = arrayMethods[method];
    Object.defineProperty(arrayMethods, method, {
        configurable: true,
        enumerable: false,
        writable: true,
        value(...arg) {
            return original.apply(this, arg);
        }
    })
})
module.exports = arrayMethods;