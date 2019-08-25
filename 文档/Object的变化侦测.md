# Object的变化侦测

## 什么是变化侦测

Vue.js 会自动通过状态生成DOM，并将其输出到页面上显示出来，这个过程叫做渲染。Vue.js的渲染过程是声明式的，通过模板来描述状态与DOM之间的映射关系。

在运行时应用内部的状态会不断的变化，需要不停的重新渲染。那么如何确定状态中发生了什么变化呢？

通过变化侦测就可以解决这个问题，变化侦测被分为两种类型：一种是“推”(push)，一种是“拉”(pull)。

Angular和React中变化侦测属于“拉”，当状态发生变化时，它不知道哪个状态变了，只知道状态可能发生了改变，然后会发送一个信号告诉框架，框架内部收到这个信号之后，进行一个暴力的比对找出那些DOM节点需要重新渲染。在Angular中是脏检查的流程，在Rect中是使用虚拟DOM。

而Vue的变化侦测属于“推”。当状态发生改变时，Vue立刻就知道了，而且在一定程度上知道那些状态发生变了。所以它知道的信息更多，也就可以进行更细粒度的更新。

更细粒度的更新：假如一个状态绑定了很多个依赖，每个依赖表示一个具体的DOM节点，那么当这个状态发生变化时，向这个状态的所有依赖发送通知，让它们进行DOM更新的操作。相比较而言，“拉”的粒度是最粗的。

但是维护更细的粒度也是需要一定的代价的，因为粒度越细，每个状态所绑定的依赖就越多，依赖追踪在内存上的开销就会越大。所以从Vue2.0开始，引进了虚拟DOM，将粒度调整为中等粒度，即一个状态所绑定的依赖不再是具体的DOM节点，而是一个组件。这样状态发生改变后，会通知到组件，组件内部再使用虚拟DOM进行比对。这样就可以大大降低依赖数量，降低依赖追踪所消耗的内存。

## 如何追踪变化

在JS中要监测一个对象的变化有两种方法：`Object.defineProperty`和ES6的Proxy，由于后者存在一定的浏览器兼容问题，Vue2.0采用的是`Object.defineProperty`来实现的，Vue3.0会使用后者重写这一部分代码。

```js
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
```

我们尝试对`Object.defineProperty`进行一个简单封装，定义一个响应式的数据。在这个函数中进行变化追踪，封装后只需要传递data、key和val即可。

封装后，每当从data的key中读取数据的时候，get函数就会被触发；每当给data中的key赋值的时候set函数就会被触发。

## 如何收集依赖

仅仅是将`Object.defineProperty`进行封装意义并不是特别大，真正有用处的是收集依赖。我们之所以需要观察数据，目的就是当数据的属性发生变化的时候，可以通知到那些使用了该数据的地方。

比如：

```html
<template>
<h1>{{name}}<h1/>
</template>
```

我们在模板中使用了数据name，所以当name发送变化时，需要向使用了它的地方发送通知。

> 在Vue 2.0 中，模板使用数据等同于组件使用数据，所以当数据发生改变时，会将通知发送到组件，然后组件内部再通过虚拟DOM重新渲染
> 

所以我们需要先把用到数据name的地方收集起来，然后等属性发生变化时，把之前收集好的依赖循环触发一遍。

总结来说：就是在getter中收集依赖，在setter中触发依赖。

## 依赖收集在哪里？

现在我们有了一个明确的目标，就是在getter中收集依赖，那么需要把依赖收集到什么地方呢？

我们可以将`defineReactive`函数改造一下，使用一个数组来储存当前key的依赖，假设依赖是一个函数，保存在`window.target`上：

```js
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
```

这里我们增加了一个数据deep，用来储存依赖，在set被触发的时候，循环deep以触发收集到的依赖。

但是这么写会有一些耦合，我们可以把依赖收集的代码封装成一个Deep类，来帮助我们管理依赖。使用这个类可以收集依赖、删除依赖、或向依赖发送通知等。

```js
export default class Deep{
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
        if (window.target) {
            this.addSub(window.target);
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
```

我们使用这个Deep类来改造一下`defineReactive`函数。

```js
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
```

## 依赖是谁

在上面的代码我们收集的依赖是`window.target`，那么它到底是什么？我们究竟要收集谁呢？

这里收集谁的意思就是，当属性发送改变的时候我们需要通知谁。

我们需要通知使用到数据的地方，而使用到数据的地方有很多，而且类型还不一样，有可能是模板，也有可能是用户写的一个watch，这时就需要抽象出一个能集中处理这些情况的类。然后我们在依赖收集阶段只收集这个封装好的类的实例进来，通知也值通知它一个，接着，由它负责通知到其他的地方。我们将这个东西叫做Watcher。

## 什么是Watcher

Watcher是一个中介角色，数据发生变化时通知它，然后它再通知其他地方。

首先我们来看一个Watcher经典的使用例子：

```js
vm.$watch('a.b.c', function (newVal, val) {
    // doSomething
})
```

当data.a.b.c属性发生改变的时候，触发第二个参数中的函数。

那么我们需要怎么做呢？似乎只需要把这个watcher实例添加到data.a.b.c属性的Dep中就行了，然后当data.a.b.c的值发生改变的时候，通知Watcher。接着Watcher再执行参数中的回调函数。

```js
export default class Watcher {
    constructor (vm, expOrFn, cb) {
        this.vm = vm;
        this.getter = parsePath(expOrFn);
        this.cb = cb;
        this.value = this.get();
    }
    get() {
        window.target = this;
        let value = this.getter.call(this.vm, this.vm);
        window.target = undefined;
        return value;
    }
    update() {
        const oldValue = this.value;
        this.value = this.get();
        this.cb.call(this.vm, this.value, oldValue);
    }
}
const bailRE = /[^\w.$]/;
function parsePath(path) {
    if (bailRE.test(path)) return;
    const segments = path.split('.');
    return function (obj) {
        for (let i = 0; i < segments.length; i++) {
            obj = obj[segments[i]];
        }
        return obj;
    }
}
```

上面这段代码可以把自己主动添加到data.a.b.c的Dep中去。

因为我们在get方法中先把window.target设置成了this，也就是当前的Watcher实例，然后再读一下data.a.b.c的值，肯定就会触发getter。

触发了getter，就会触发收集依赖的逻辑。而关于依赖收集前面已经介绍了。

## 递归侦测所有key

现在我们已经可以实现变化侦测功能了，但是前面的代码只能侦测到数据的某一个属性，我们希望把数据中每一个属性(包括子属性)都侦测到，所以需要封装一个Observer类。这个类的作用就是将一个数据内的所有属性都转换成getter/setter形式，然后去追踪他们的变化。

```js
import Dep from './Dep';
/*
  Observer类会附加到每一个被侦测的object上面。
  一旦被附加上，Observer会将objet的所有属性转换成getter/setter的形式
  来收集属性的依赖，并且当属性发生变化时会通知这些依赖 
 */
export default class Observer {
    constructor (value) {
        this.value = value;
        if (!Array.isArray(this.value)) {
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
```

上面的代码我们定义了一个Observer类，它用来将一个正常的object转换成被侦测的object。

## 关于object的问题

我们在前面介绍了object类型数据的变化侦测原理，了解了数据的变化可以通过getter/setter来追踪。正是由于这样的追踪方式，有些语法即使我们的数据发生了变化Vue也追踪不到，比如给对象添加一个属性，删除一个属性，我们无法通过getter/setter来追踪到他们的变化。为了解决这个问题Vue提供了两个API——vm.$set与vm.$delete。










































































































































































