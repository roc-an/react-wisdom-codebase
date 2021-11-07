/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import ReactNoopUpdateQueue from './ReactNoopUpdateQueue';

const emptyObject = {};
if (__DEV__) {
  Object.freeze(emptyObject);
}

/**
 * Base class helpers for the updating state of a component.
 */
function Component(props, context, updater) {
  this.props = props;
  this.context = context; // context 提供了无需为每层组件添加 props，就能在组件树中传递数据的能力
  // If a component has string refs, we will assign a different object later.
  // 如果组件有 string refs，后面还会为它分配一个不同的对象
  this.refs = emptyObject;
  // We initialize the default updater but the real one gets injected by the
  // renderer.
  // 这里初始化了默认的 updater，后面渲染器会注入实际的 updater
  this.updater = updater || ReactNoopUpdateQueue;
}

Component.prototype.isReactComponent = {};

/**
 * Sets a subset of the state. Always use this to mutate
 * state. You should treat `this.state` as immutable.
 * 
 * 设置 state 子集。请确保总是使用 setState() 来改变 state。可以将 `this.state` 视为不可变数据
 *
 * There is no guarantee that `this.state` will be immediately updated, so
 * accessing `this.state` after calling this method may return the old value.
 * 
 * `this.state` 不会立刻更新，因此在调用 setState() 后访问 `this.state` 可能会得到旧值
 *
 * There is no guarantee that calls to `setState` will run synchronously,
 * as they may eventually be batched together.  You can provide an optional
 * callback that will be executed when the call to setState is actually
 * completed.
 * 
 * 调用 setState() 也不是同步的，它们最终会被一起批处理。可以提供一个可选的回调来确保在 setState() 确实执行完毕后调用
 *
 * When a function is provided to setState, it will be called at some point in
 * the future (not synchronously). It will be called with the up to date
 * component arguments (state, props, context). These values can be different
 * from this.* because your function may be called after receiveProps but before
 * shouldComponentUpdate, and this new state, props, and context will not yet be
 * assigned to this.
 * 
 * setState() 的首个参数也可以是函数，这个函数将来会被调用（也不是同步的）。
 * 调用时它可以访问到最新的组件相关参数（state、props、context）。
 * 这些值可能会不同于 this.* 上的，因为这个函数可能会在 receiveProps 之后、shouldComponentUpdate 之前被调用，
 * 而这时新的 state、props 以及 context 也许不再是之前 this 上分配的了
 * 
 * @param {object|function} partialState Next partial state or function to
 *        produce next partial state to be merged with current state.
 *        将来的 state 子集，或是一个产生将来用于和那时候的 state 合并的 state 子集的函数
 * @param {?function} callback Called after state is updated. state 更新后调用的回调
 * @final
 * @protected
 */
Component.prototype.setState = function(partialState, callback) {
  // 检查传参，类型不符就抛错
  if (
    typeof partialState !== 'object' &&
    typeof partialState !== 'function' &&
    partialState != null
  ) {
    throw new Error(
      'setState(...): takes an object of state variables to update or a ' +
        'function which returns an object of state variables.',
    );
  }

  this.updater.enqueueSetState(this, partialState, callback, 'setState');
};

/**
 * Forces an update. This should only be invoked when it is known with
 * certainty that we are **not** in a DOM transaction.
 * 
 * 强制更新。请确保不处于 DOM 事务中时调用它
 *
 * You may want to call this when you know that some deeper aspect of the
 * component's state has changed but `setState` was not called.
 *
 * 你可能会在类似组件 state 已经变了但 `setState` 又没被调用的这种更深层次情况时使用它
 * 
 * This will not invoke `shouldComponentUpdate`, but it will invoke
 * `componentWillUpdate` and `componentDidUpdate`.
 * 
 * 它不会触发 `shouldComponentUpdate` 的执行，但会触发 `componentWillUpdate` 和
 * `componentDidUpdate` 的执行
 *
 * @param {?function} callback Called after update is complete. 更新完成后的回调
 * @final
 * @protected
 */
Component.prototype.forceUpdate = function(callback) {
  this.updater.enqueueForceUpdate(this, callback, 'forceUpdate');
};

/**
 * Deprecated APIs. These APIs used to exist on classic React classes but since
 * we would like to deprecate them, we're not going to move them over to this
 * modern base class. Instead, we define a getter that warns if it's accessed.
 */
if (__DEV__) {
  const deprecatedAPIs = {
    isMounted: [
      'isMounted',
      'Instead, make sure to clean up subscriptions and pending requests in ' +
        'componentWillUnmount to prevent memory leaks.',
    ],
    replaceState: [
      'replaceState',
      'Refactor your code to use setState instead (see ' +
        'https://github.com/facebook/react/issues/3236).',
    ],
  };
  const defineDeprecationWarning = function(methodName, info) {
    Object.defineProperty(Component.prototype, methodName, {
      get: function() {
        console.warn(
          '%s(...) is deprecated in plain JavaScript React classes. %s',
          info[0],
          info[1],
        );
        return undefined;
      },
    });
  };
  for (const fnName in deprecatedAPIs) {
    if (deprecatedAPIs.hasOwnProperty(fnName)) {
      defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
    }
  }
}

function ComponentDummy() {}
ComponentDummy.prototype = Component.prototype;

/**
 * Convenience component with default shallow equality check for sCU.
 * 有着对 sCU 默认浅比较检查的便利性组件
 */
function PureComponent(props, context, updater) {
  this.props = props;
  this.context = context;
  // If a component has string refs, we will assign a different object later.
  this.refs = emptyObject;
  this.updater = updater || ReactNoopUpdateQueue;
}

// 让 PureComponent 的原型是个空对象实例，这个实例的原型是 Component 的原型，从而继承了原型
const pureComponentPrototype = (PureComponent.prototype = new ComponentDummy());
// 让原型的 constructor 指向构造函数，以完善原型相关属性
pureComponentPrototype.constructor = PureComponent;
// Avoid an extra prototype jump for these methods.
// 将 Component 原型上的属性拷贝到 PureComponent 原型，以避免额外的一次沿原型链查找
Object.assign(pureComponentPrototype, Component.prototype);
// 通过原型的 isPureReactComponent 属性来标识继承自这个类的组件是一个 PureComponent
// 后续的更新过程中会借此判断是否是一个 PureComponent
pureComponentPrototype.isPureReactComponent = true;

export {Component, PureComponent};
