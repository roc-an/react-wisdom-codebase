/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Wakeable, Thenable} from 'shared/ReactTypes';

import {REACT_LAZY_TYPE} from 'shared/ReactSymbols';

const Uninitialized = -1;
const Pending = 0;
const Resolved = 1;
const Rejected = 2;

// 不同的 _status 值对应着不同的 Thenable 对象状态
// 4 种状态：Uninitialized、Pending、Resolved、Rejected
type UninitializedPayload<T> = {
  _status: -1,
  _result: () => Thenable<{default: T, ...}>,
};

type PendingPayload = {
  _status: 0,
  _result: Wakeable,
};

type ResolvedPayload<T> = {
  _status: 1,
  _result: {default: T},
};

type RejectedPayload = {
  _status: 2,
  _result: mixed,
};

type Payload<T> =
  | UninitializedPayload<T>
  | PendingPayload
  | ResolvedPayload<T>
  | RejectedPayload;

export type LazyComponent<T, P> = {
  $$typeof: Symbol | number,
  _payload: P,
  _init: (payload: P) => T,
};

// lazy 初始化函数
function lazyInitializer<T>(payload: Payload<T>): T {
  if (payload._status === Uninitialized) {
    // 如果 Thenable 对象未初始化
    const ctor = payload._result; // 取到调用 React.lazy(ctor) 时传入的构造函数
    const thenable = ctor(); // 调用构造函数，得到返回的 Thenable 对象
    // Transition to the next state.
    // This might throw either because it's missing or throws. If so, we treat it
    // as still uninitialized and try again next time. Which is the same as what
    // happens if the ctor or any wrappers processing the ctor throws. This might
    // end up fixing it if the resolution was a concurrency bug.
    thenable.then(
      // onFulfill 时，拿到模块对象，如果此时 Thenable 对象状态是 Pending 或 Uninitialized，
      // 那就将 Thenable 对象 resolve 掉，将模块对象作为传递结果
      moduleObject => {
        if (payload._status === Pending || payload._status === Uninitialized) {
          // Transition to the next state.
          const resolved: ResolvedPayload<T> = (payload: any);
          resolved._status = Resolved;
          resolved._result = moduleObject;
        }
      },
      // onReject 时，拿到错误信息，如果此时 Thenable 对象状态是 Pending 或 Uninitialized，
      // 那就将 Thenable 对象 reject 掉，将错误信息作为传递结果
      error => {
        if (payload._status === Pending || payload._status === Uninitialized) {
          // Transition to the next state.
          // 过渡到下一个 state
          const rejected: RejectedPayload = (payload: any);
          rejected._status = Rejected;
          rejected._result = error;
        }
      },
    );
    if (payload._status === Uninitialized) {
      // In case, we're still uninitialized, then we're waiting for the thenable
      // to resolve. Set it as pending in the meantime.
      // 这种情况下，仍还没有初始化完毕，我们需要等待 Thenable 对象去 resolve。
      // 在此期间，将状态设为 Pending
      const pending: PendingPayload = (payload: any);
      pending._status = Pending;
      pending._result = thenable;
    }
  }
  if (payload._status === Resolved) {
    // 如果 Thenable 对象已初始化，状态是 Resolved，那就取到文件对象，并返回文件对象.default
    const moduleObject = payload._result;
    if (__DEV__) {
      if (moduleObject === undefined) {
        console.error(
          'lazy: Expected the result of a dynamic imp' +
            'ort() call. ' +
            'Instead received: %s\n\nYour code should look like: \n  ' +
            // Break up imports to avoid accidentally parsing them as dependencies.
            'const MyComponent = lazy(() => imp' +
            "ort('./MyComponent'))\n\n" +
            'Did you accidentally put curly braces around the import?',
          moduleObject,
        );
      }
    }
    if (__DEV__) {
      if (!('default' in moduleObject)) {
        console.error(
          'lazy: Expected the result of a dynamic imp' +
            'ort() call. ' +
            'Instead received: %s\n\nYour code should look like: \n  ' +
            // Break up imports to avoid accidentally parsing them as dependencies.
            'const MyComponent = lazy(() => imp' +
            "ort('./MyComponent'))",
          moduleObject,
        );
      }
    }
    return moduleObject.default;
  } else {
    // 如果 Thenable 对象已初始化，状态不是 Resolved（也就是状态是 Rejected），
    // 那就 throw 一个异常，异常内容是 payload._result
    throw payload._result;
  }
}

// React.lazy 这个函数的参数是一个构造函数（ctor），构造函数返回 Thenable 对象
// Thenable 对象是指具有 then 方法的对象
// React.lazy 这个函数返回的是一个 LazyComponent，也就是有着 $$typeof 和其他属性的对象
export function lazy<T>(
  ctor: () => Thenable<{default: T, ...}>,
): LazyComponent<T, Payload<T>> {
  const payload: Payload<T> = {
    // We use these fields to store the result.
    // 用这些字段存储结果
    _status: Uninitialized, // 记录懒加载状态
    _result: ctor, // Thenable 对象 resolve 后，会将文件模块内容挂到 _result 上
  };

  const lazyType: LazyComponent<T, Payload<T>> = {
    $$typeof: REACT_LAZY_TYPE,
    _payload: payload,
    _init: lazyInitializer,
  };

  if (__DEV__) {
    // In production, this would just set it on the object.
    let defaultProps;
    let propTypes;
    // $FlowFixMe
    Object.defineProperties(lazyType, {
      defaultProps: {
        configurable: true,
        get() {
          return defaultProps;
        },
        set(newDefaultProps) {
          console.error(
            'React.lazy(...): It is not supported to assign `defaultProps` to ' +
              'a lazy component import. Either specify them where the component ' +
              'is defined, or create a wrapping component around it.',
          );
          defaultProps = newDefaultProps;
          // Match production behavior more closely:
          // $FlowFixMe
          Object.defineProperty(lazyType, 'defaultProps', {
            enumerable: true,
          });
        },
      },
      propTypes: {
        configurable: true,
        get() {
          return propTypes;
        },
        set(newPropTypes) {
          console.error(
            'React.lazy(...): It is not supported to assign `propTypes` to ' +
              'a lazy component import. Either specify them where the component ' +
              'is defined, or create a wrapping component around it.',
          );
          propTypes = newPropTypes;
          // Match production behavior more closely:
          // $FlowFixMe
          Object.defineProperty(lazyType, 'propTypes', {
            enumerable: true,
          });
        },
      },
    });
  }

  return lazyType;
}
