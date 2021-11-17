# React Wisdom Codebase

React 17 源码详细注解。

我会尽可能地确保每次 `commit` 都是一块相对完整的功能。可以配合着 [react-wisdom](https://github.com/roc-an/react-wisdom/issues) 阅读，里面用专题文章的形式对有价值的源码模块做了图文剖析。

## 目前已完成的关键注解

### `react` package

React 各顶层 API：

* [`React.createElement`](https://github.com/roc-an/react-wisdom-codebase/commit/31f5842a99f0bd6326c2fd5a68dda52c9c73b3ae)；
* [`React.Component` 与 `React.pureComponent`](https://github.com/roc-an/react-wisdom-codebase/commit/aaa9a78b379b4e0e691e42270db20aaa0f923738)；
* [`React.Children`](https://github.com/roc-an/react-wisdom-codebase/commit/d6471fb486c7f5c45a21c98a132f5e85137e2a9e)；
* [`React.createRef`](https://github.com/roc-an/react-wisdom-codebase/commit/e00e962fa88af985b5b32c8dfa3404e953009de6) 与 [`React.forwardRef`](https://github.com/roc-an/react-wisdom-codebase/commit/5adddf6b5244aff1c6cf4ee9332d8f38f5220baa)；
* [`React.createContext`](https://github.com/roc-an/react-wisdom-codebase/commit/fbd5905ef7c549ee418db822c21f3cbc343506bd)；
* [`React.Lazy`](https://github.com/roc-an/react-wisdom-codebase/commit/a772cf0791ca388c8c73c1be3d01027ecb1d8c23)；
* [`React.memo`](https://github.com/roc-an/react-wisdom-codebase/commit/4e1578f2a02a483daec2fdae8e6d9498ec5f86a6)

React Hooks：

* [`React.useState` 与 `React.useEffect`](https://github.com/roc-an/react-wisdom-codebase/commit/02cf9533e741848b179c365db8a16862fef3d015)；
