# Array的变化侦测

由于对Object的变化侦测是通过getter/setter实现的，那么使用数组的一些方法如push向数组中添加一个值，并不会触发getter/setter。正因为我们可以通过Array原型上的方法来改变数组的内容，所以Object变化侦测的方法对数组来说并不适用。

## 如何追踪变化

Object的变化是通过setter来追踪的，只要数据一发生改变，就一定会触发setter。

那么同样的道理，我们可以使用push方法来改变数组，那么我们就可以在push方法执行的时候得到通知，从而达到同样的目的。

然而在ES6之前js并没有提供元编程的能力，也就是没有提供可以拦截原型方法的能力，但是我们可以使用自定义的方法去覆盖原生的原型方法。

我们可以使用一个拦截器覆盖Array.prototype。以后每次使用Array原型上的方法操作数组时，其实执行的都是拦截器中提供的方法。

## 拦截器

拦截器其实就是一个和Array.prototype一样的Object，里面包含的属性一模一样，只是这个Object中的某些可以改变数组自身的方法被我们处理过。

Array的原型中能够改变自身内容的方法一共7个：push、pop、shift、unshift、splice、sort、reverse。

下面我们简单实现一个拦截器：

```js
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
].forEach(function mutator(method) {
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
```

在上面的代码中，我们创建了一个变量arrayMethods，它继承自Array.prototype，具备其所有的功能。

接下来，我们在arrayMethods上使用Object.definePrototype方法将那些可以改变数组自身内容的方法进行封装。

## 使用拦截器覆盖Array原型

有了拦截器之后，想要让它生效，就需要使用它去覆盖Array.prototype。但是我们又不能够直接覆盖，这样会污染全局的Array。我们希望拦截器只在那些需要被侦测的数据上生效。也就是说拦截器只覆盖那些响应式数组的原型。

将数据转换成响应式的，需要通过Observer，所以我们只需要在Observer中使用拦截器覆盖那些被转换成响应式Array类型数据的原型就好了：

```js
    constructor (value) {
        this.value = value;
        if (Array.isArray(value)) {
            value.__proto__ = arrayMethods;
        } else {
            this.walk(value);
        }
    }
```

## 将拦截器方法挂载到数组的属性上

由于浏览器兼容的问题，有些浏览器无法支持__proto__这个非标准属性，所以我们还需要做一些兼容的处理。

我们可以判断一下，浏览器是否支持__proto__，如果支持就直接将数组的__proto__属性的指向修改到arrayMethods，否则就直接将arrayMethods中的方法设置到数组上面，以达到覆盖数组原型上面的方法的目的。

## 如何收集依赖

我们在前面创建的拦截器，最主要的目的就是当数组的内容发生改变的时候，能够得到通知，然后去做一些事情。

现在我们已经能够在数组内容改变的时候得到通知了，但是我们应该通知谁呢？答案当然是Dep中的依赖(Watcher)，那么依赖如何收集呢？

处理object时我们是在getter中收集依赖，然后储存到Dep中。而数组的依赖我们也是在getter中收集。

所以数组是在getter中收集依赖，在拦截器中触发依赖。

## 依赖表存在哪里

Vue.js是吧Array的依赖存放在了Observer中，为什么呢？因为数组的依赖是在getter中收集的，在拦截器中触发的，那么依赖就应该存放在getter和拦截器都能够访问的地方。

我们将其保存在Observer的实例上，getter中能够访问到Observer实例，同时在拦截器中也能够访问到Observer的实例。

## 收集依赖



