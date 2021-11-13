/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {ReactNodeList} from 'shared/ReactTypes';

import isArray from 'shared/isArray';
import {
  getIteratorFn,
  REACT_ELEMENT_TYPE,
  REACT_PORTAL_TYPE,
} from 'shared/ReactSymbols';
import {checkKeyStringCoercion} from 'shared/CheckStringCoercion';

import {isValidElement, cloneAndReplaceKey} from './ReactElement';

const SEPARATOR = '.'; // 用于命名节点 key 的分隔符
const SUBSEPARATOR = ':'; // 用于命名节点 key 的子分隔符

/**
 * Escape and wrap key so it is safe to use as a reactid
 * 编码并包装 key，确保其作为 reactid 可以安全地去用
 *
 * @param {string} key to be escaped. // 要进行编码的 key
 * @return {string} the escaped key. // 编码后的 key
 */
function escape(key: string): string {
  const escapeRegex = /[=:]/g; // 全局匹配方括号中的任意字符，也就是 = 和 :
  const escaperLookup = {
    '=': '=0',
    ':': '=2',
  };
  // String.prototype.replace() API Doc: https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/String/replace
  const escapedString = key.replace(escapeRegex, function(match) {
    // 每次匹配命中都会调用，match 是匹配到的子串，返回值作为替换字符串
    return escaperLookup[match];
  });

  return '$' + escapedString;
}

/**
 * TODO: Test that a single child and an array with one item have the same key
 * pattern.
 */

let didWarnAboutMaps = false;

const userProvidedKeyEscapeRegex = /\/+/g; // 全局匹配 1 个或多个 /
function escapeUserProvidedKey(text: string): string {
  // 将匹配到的 1 个或多个 / 替换成 $&/
  return text.replace(userProvidedKeyEscapeRegex, '$&/');
}

/**
 * Generate a key string that identifies a element within a set.
 * 生成用于标识一组中的元素的 key 字符串。
 *
 * @param {*} element A element that could contain a manual key. // 一个可能包含了手动设置 key 的元素
 * @param {number} index Index that is used if a manual key is not provided. // 如果没有提供手动设置的 key，那就用索引生成
 * @return {string}
 */
function getElementKey(element: any, index: number): string {
  // Do some typechecking here since we call this blindly. We want to ensure
  // that we don't block potential future ES APIs.
  // 这里要做一些类型检查，因为我们是在逐渐摸索地去调用它，确保不会阻碍未来潜在的 ES API。
  // 如果元素手动设置了 key，那么直接返回编码后的 key
  if (typeof element === 'object' && element !== null && element.key != null) {
    // Explicit key
    if (__DEV__) {
      checkKeyStringCoercion(element.key);
    }
    return escape('' + element.key);
  }
  // Implicit key determined by the index in the set
  // 如果未手动设置 key，那么这种隐式的 key 由它在一组中所处的索引决定
  // 用 36 进制字符串来表示索引，大于 9 的数字用字母 a~z 表示
  return index.toString(36);
}

function mapIntoArray(
  children: ?ReactNodeList, // 要遍历的子节点树
  array: Array<React$Node>, // 遍历的结果数组
  escapedPrefix: string,
  nameSoFar: string,
  callback: (?React$Node) => ?ReactNodeList, // 给当前遍历节点调用的函数
): number { // 返回值是 map 得到的数组的元素数
  const type = typeof children;

  if (type === 'undefined' || type === 'boolean') {
    // All of the above are perceived as null.
    // children 如果是 undefined 或 boolean，都被视为 null 去处理
    children = null;
  }

  let invokeCallback = false; // 是否直接用单个子节点调用 callback

  // 如果 children 是 null | string | number 
  // 或者是 $$typeof 属性是 REACT_ELEMENT_TYPE 或 REACT_PORTAL_TYPE 的对象
  // 它们都是 React 可渲染的节点，那就将 invokeCallback 设为 true
  if (children === null) {
    invokeCallback = true;
  } else {
    switch (type) {
      case 'string':
      case 'number':
        invokeCallback = true;
        break;
      case 'object':
        switch ((children: any).$$typeof) {
          case REACT_ELEMENT_TYPE:
          case REACT_PORTAL_TYPE:
            invokeCallback = true;
        }
    }
  }

  // 如果 invokeCallback 为 true，那就直接调用 callback
  if (invokeCallback) {
    const child = children;
    let mappedChild = callback(child);
    // If it's the only child, treat the name as if it was wrapped in an array
    // so that it's consistent if the number of children grows:
    // 即便只有一个子节点，也会被当做包裹进一个数组中去命名。因为如果后续子节点的数量增加了，也能前后保持一致
    // 初始化子节点 key 的命名
    const childKey =
      nameSoFar === '' ? SEPARATOR + getElementKey(child, 0) : nameSoFar;
    if (isArray(mappedChild)) {
      // 如果调用 map 函数得到的子节点是数组，就编码好 key 前缀，然后递归进行 mapIntoArray()
      // 这一步确保了遍历的结果数组是一维的
      let escapedChildKey = '';
      if (childKey != null) {
        escapedChildKey = escapeUserProvidedKey(childKey) + '/';
      }
      mapIntoArray(mappedChild, array, escapedChildKey, '', c => c);
    } else if (mappedChild != null) {
      // 如果调用 map 函数得到的子节点不是数组，验证该节点是否是 ReactElement：
      //   A.对于 ReactElement，clone 它并附上新的 key，然后 push 进结果数组
      //   B.对于非 ReactElement，直接 push 进结果数组
      if (isValidElement(mappedChild)) {
        if (__DEV__) {
          // The `if` statement here prevents auto-disabling of the safe
          // coercion ESLint rule, so we must manually disable it below.
          // $FlowFixMe Flow incorrectly thinks React.Portal doesn't have a key
          if (mappedChild.key && (!child || child.key !== mappedChild.key)) {
            checkKeyStringCoercion(mappedChild.key);
          }
        }
        mappedChild = cloneAndReplaceKey(
          mappedChild,
          // Keep both the (mapped) and old keys if they differ, just as
          // traverseAllChildren used to do for objects as children
          // 如果 map 前后节点的 key 不同，那么都将保留
          // 用之前递归过程中的 key 前缀拼接本次 map 的节点的 key
          escapedPrefix +
            // $FlowFixMe Flow incorrectly thinks React.Portal doesn't have a key
            // $FlowFixMe Flow 错误的认为 React.Portal 没有 key
            // 这里三目判断条件是：是否是 “map 后的 child 有 key，且与 map 前不同”
            (mappedChild.key && (!child || child.key !== mappedChild.key)
              ? // $FlowFixMe Flow incorrectly thinks existing element's key can be a number
                // $FlowFixMe Flow 错误地认为元素的 key 可以是数字
                // eslint-disable-next-line react-internal/safe-string-coercion
                escapeUserProvidedKey('' + mappedChild.key) + '/'
              : '') +
            childKey,
        );
      }
      array.push(mappedChild);
    }
    return 1;
  }

  // 如果 invokeCallback 为 false，也就是 children 不是单个节点，那么对其进行遍历
  let child; // 用于存当前遍历的子节点
  let nextName;
  // Count of children found in the current subtree.
  // 当前子节点树的节点数
  let subtreeCount = 0;
  const nextNamePrefix =
    nameSoFar === '' ? SEPARATOR : nameSoFar + SUBSEPARATOR;

  if (isArray(children)) {
    // 如果 children 是数组，遍历这个数组，并用子节点递归地调用 mapIntoArray()
    for (let i = 0; i < children.length; i++) {
      child = children[i];
      nextName = nextNamePrefix + getElementKey(child, i);
      subtreeCount += mapIntoArray(
        child,
        array,
        escapedPrefix,
        nextName,
        callback,
      );
    }
  } else {
    const iteratorFn = getIteratorFn(children);
    if (typeof iteratorFn === 'function') {
      // 如果 children 是有 Iterator 函数的可迭代对象
      const iterableChildren: Iterable<React$Node> & {
        entries: any,
      } = (children: any);

      if (__DEV__) {
        // Warn about using Maps as children
        if (iteratorFn === iterableChildren.entries) {
          if (!didWarnAboutMaps) {
            console.warn(
              'Using Maps as children is not supported. ' +
                'Use an array of keyed ReactElements instead.',
            );
          }
          didWarnAboutMaps = true;
        }
      }

      const iterator = iteratorFn.call(iterableChildren);
      let step;
      let ii = 0;
      // 迭代 children，用子节点递归地调用 mapIntoArray()，直到迭代完毕（也就是 step.done 为 true）
      while (!(step = iterator.next()).done) {
        child = step.value; // 迭代的每个子节点
        nextName = nextNamePrefix + getElementKey(child, ii++);
        subtreeCount += mapIntoArray(
          child,
          array,
          escapedPrefix,
          nextName,
          callback,
        );
      }
    } else if (type === 'object') {
      // 如果 children 不是单个节点，也不是数组或可迭代对象，那么获取它的类型信息并抛错

      // eslint-disable-next-line react-internal/safe-string-coercion
      // 用 String() 得到 children 的类型信息字符串
      const childrenString = String((children: any));

      throw new Error(
        `Objects are not valid as a React child (found: ${
          childrenString === '[object Object]'
            ? 'object with keys {' +
              Object.keys((children: any)).join(', ') +
              '}'
            : childrenString
        }). ` +
          'If you meant to render a collection of children, use an array ' +
          'instead.',
      );
    }
  }

  return subtreeCount;
}

type MapFunc = (child: ?React$Node) => ?ReactNodeList;

/**
 * Maps children that are typically specified as `props.children`.
 * Map 遍历那些被指定为 `props.children` 的子节点
 *
 * See https://reactjs.org/docs/react-api.html#reactchildrenmap
 *
 * The provided mapFunction(child, index) will be called for each
 * leaf child.
 * 会为每个叶子节点调用传入的 mapFunction(child, index)
 *
 * @param {?*} children Children tree container. // 子节点树
 * @param {function(*, int)} func The map function. // map 遍历函数
 * @param {*} context Context for mapFunction. // map 遍历函数的上下文
 * @return {object} Object containing the ordered map of results. // 包含着排序后的 map 结果的对象
 */
function mapChildren(
  children: ?ReactNodeList,
  func: MapFunc,
  context: mixed,
): ?Array<React$Node> {
  // 如果传入的子节点容器是 null，就直接 return
  if (children == null) {
    return children;
  }
  // 初始化 map 结果数组和计数变量
  const result = [];
  let count = 0;

  mapIntoArray(children, result, '', '', function(child) {
    // 用指定上下文（没传就是 undefined）调用传入的 func（就是 map 遍历函数）并计数
    return func.call(context, child, count++);
  });
  return result;
}

/**
 * Count the number of children that are typically specified as
 * `props.children`.
 * 统计指定为 `props.children` 的子节点（及其子树）共有多少个节点
 *
 * See https://reactjs.org/docs/react-api.html#reactchildrencount
 *
 * @param {?*} children Children tree container.
 * @return {number} The number of children.
 */
function countChildren(children: ?ReactNodeList): number {
  let n = 0;
  mapChildren(children, () => {
    n++;
    // Don't return anything
    // 因为每次递归都会将该函数透传，所以该函数调用了多少次，就意味着已遍历多少个子节点
  });
  return n;
}

type ForEachFunc = (child: ?React$Node) => void;

/**
 * Iterates through children that are typically specified as `props.children`.
 * 遍历那些被指定为 `props.children` 的子节点
 *
 * See https://reactjs.org/docs/react-api.html#reactchildrenforeach
 *
 * The provided forEachFunc(child, index) will be called for each
 * leaf child.
 * 会为每个叶子节点调用传入的 forEachFunc(child, index)
 *
 * @param {?*} children Children tree container. // 子节点树
 * @param {function(*, int)} forEachFunc // forEach 遍历函数
 * @param {*} forEachContext Context for forEachContext. // forEach 遍历函数的上下文
 */
function forEachChildren(
  children: ?ReactNodeList,
  forEachFunc: ForEachFunc,
  forEachContext: mixed,
): void {
  // React.Children.forEach() 其实内部就是调用了 React.Children.map()，只是不需要返回值罢了
  mapChildren(
    children,
    function() {
      forEachFunc.apply(this, arguments);
      // Don't return anything.
      // 不需要任何 return 内容
    },
    forEachContext,
  );
}

/**
 * Flatten a children object (typically specified as `props.children`) and
 * return an array with appropriately re-keyed children.
 * 将子节点对象（如 `props.children`）展开为一维数组，return 重新设置了合适的 key 的子节点数组
 * 
 * See https://reactjs.org/docs/react-api.html#reactchildrentoarray
 */
function toArray(children: ?ReactNodeList): Array<React$Node> {
  // React.Children.toArray() 其实就是调用了 React.Children.map()
  // 只不过将 map 函数设为将传入的子节点直接 return
  return mapChildren(children, child => child) || [];
}

/**
 * Returns the first child in a collection of children and verifies that there
 * is only one child in the collection.
 *
 * See https://reactjs.org/docs/react-api.html#reactchildrenonly
 *
 * The current implementation of this function assumes that a single child gets
 * passed without a wrapper, but the purpose of this helper function is to
 * abstract away the particular structure of children.
 * 目前这个函数的实现假定了传入了一个没有任何包裹的单一子节点，但这个辅助函数的目的是抽象出子节点的特殊结构
 *
 * @param {?object} children Child collection structure.
 * @return {ReactElement} The first and only `ReactElement` contained in the
 * structure.
 */
function onlyChild<T>(children: T): T {
  // 验证传参是不是一个 ReactElement，如果是就直接 return，不是的话报错
  if (!isValidElement(children)) {
    throw new Error(
      'React.Children.only expected to receive a single React element child.',
    );
  }

  return children;
}

export {
  forEachChildren as forEach,
  mapChildren as map,
  countChildren as count,
  onlyChild as only,
  toArray,
};
