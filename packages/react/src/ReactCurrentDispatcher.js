/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Dispatcher} from 'react-reconciler/src/ReactInternalTypes';

/**
 * Keeps track of the current dispatcher.
 * 保持对当前 Dispatcher 的跟踪
 */
const ReactCurrentDispatcher = {
  /**
   * @internal
   * @type {ReactComponent}
   */
  // 初始时，ReactCurrentDispatcher.current 为 null
  // 在 react 这个库的层面，还不涉及组件实例（就算有，有的也是组件的类，而不是实例），到了 react-dom 渲染过程中才会为它赋值
  // 这也符合 “react 这个库与平台无关” 这个思想，只有确定了渲染所处平台，才能确定 Dispatcher
  current: (null: null | Dispatcher),
};

export default ReactCurrentDispatcher;
