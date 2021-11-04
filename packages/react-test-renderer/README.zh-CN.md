# `react-test-renderer`

该模块提供了一个实验性的渲染器，可以在不依靠 DOM 或是手机端平台环境下将 React 组件解析成纯粹的 JS 对象。

本质上，使用该模块可以很方便地获取给 React DOM 或 React Native 渲染的 DOM 树的快照，这一切都不需要借助一个浏览器或是 JS DOM 环境。

文档：

[https://reactjs.org/docs/test-renderer.html](https://reactjs.org/docs/test-renderer.html)

用例：

```jsx
const ReactTestRenderer = require('react-test-renderer');

const renderer = ReactTestRenderer.create(
  <Link page="https://www.facebook.com/">Facebook</Link>
);

console.log(renderer.toJSON());
// { type: 'a',
//   props: { href: 'https://www.facebook.com/' },
//   children: [ 'Facebook' ] }
```

你还可以配合 Jest 的快照测试功能，将解析好的 JSON 树拷贝进一个文件，从而检测 React 组件树是否改变：https://jestjs.io/blog/2016/07/27/jest-14.html。
