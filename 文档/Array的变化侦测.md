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

