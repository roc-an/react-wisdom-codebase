/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Fiber} from 'react-reconciler/src/ReactInternalTypes';

/**
 * Keeps track of the current owner.
 * 请保持对当前所有者的跟踪
 *
 * The current owner is the component who should own any components that are
 * currently being constructed.
 * 当前所有者（current owner）是将拥有正被构建的组件的组件。
 */
const ReactCurrentOwner = {
  /**
   * @internal
   * @type {ReactComponent}
   */
  current: (null: null | Fiber),
};

export default ReactCurrentOwner;
