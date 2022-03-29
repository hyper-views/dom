# @hyper-views/dom

Hyper Views DOM is a small module to write declarative, reactive UI. It shares some API with React, and is inspired by how Vue works. It is about 1.5kb when minified and compressed with gzip. I wrote it to use with Web Components because I found I needed some way to create and update HTML in shadow DOM. Since JSX is built into Babel and SWC, it is sort of a free API to use. It does not use a virtual DOM, and there is little to no reconciliation. Attributes and child nodes are updated when data changes. That's it.

## examples

[Here is an example](https://codepen.io/erickmerchant/pen/zYpZdrG?editors=0010) on CodePen. And here is the JS from that same example to give you a small peek.

```javascript
// @jsx h

import {
  compute,
  h,
  proxy,
  render,
} from "https://unpkg.com/@hyper-views/dom@1.3.0/main.js";

const state = proxy({ count: 0 });

const incrementCount = () => state.count++;

render(
  <div>
    Clicks:
    <button onclick={incrementCount}>{compute(() => state.count)}</button>
  </div>,
  document.querySelector("div")
);
```

## exports

### h and fragment

These two are what JSX will need to target. In most cases you should be able to add `// @jsx h` to top of all your jsx files. You will also need `// @jsxFrag fragment` if you want to use fragments. And of course h and fragment will need to be imported. Also be aware that function components are supported, but classes are not.

### proxy and compute

These two are how to use the reactivity system. Used together you can create elements with attributes and children that update when an object's properties change. You call proxy with what ever object you want to be watched, then you will use compute in your jsx anywhere you want an attribute or child to be reactive.

### render

You call render just like you would in React, or any other React-like framework.

## browser support

This module uses [Proxy](https://caniuse.com/?search=Proxy) which can not really be polyfilled, so keep that in mind if you need to support IE11. Also it uses [WeakRef](https://caniuse.com/?search=WeakRef) which is relatively newer, but well supported at this point.
