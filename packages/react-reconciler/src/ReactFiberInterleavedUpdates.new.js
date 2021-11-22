/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {UpdateQueue as HookQueue} from './ReactFiberHooks.new';
import type {SharedQueue as ClassQueue} from './ReactUpdateQueue.new';

// An array of all update queues that received updates during the current
// render. When this render exits, either because it finishes or because it is
// interrupted, the interleaved updates will be transferred onto the main part
// of the queue.
// 交替队列，一个全局数组
// 一个包含所有更新队列的数组，更新队列会在当前渲染过程中接收到 1 或多个更新。
// 无论是完成渲染还是被打断导致当前渲染退出时，交替更新将会转移到该队列的主要部分
let interleavedQueues: Array<
  HookQueue<any, any> | ClassQueue<any>,
> | null = null;

// 将队列 push 进交替队列
export function pushInterleavedQueue(
  queue: HookQueue<any, any> | ClassQueue<any>,
) {
  if (interleavedQueues === null) {
    // 首次 push 会初始化交替队列
    interleavedQueues = [queue];
  } else {
    interleavedQueues.push(queue);
  }
}

export function enqueueInterleavedUpdates() {
  // Transfer the interleaved updates onto the main queue. Each queue has a
  // `pending` field and an `interleaved` field. When they are not null, they
  // point to the last node in a circular linked list. We need to append the
  // interleaved list to the end of the pending list by joining them into a
  // single, circular list.
  if (interleavedQueues !== null) {
    for (let i = 0; i < interleavedQueues.length; i++) {
      const queue = interleavedQueues[i];
      const lastInterleavedUpdate = queue.interleaved;
      if (lastInterleavedUpdate !== null) {
        queue.interleaved = null;
        const firstInterleavedUpdate = lastInterleavedUpdate.next;
        const lastPendingUpdate = queue.pending;
        if (lastPendingUpdate !== null) {
          const firstPendingUpdate = lastPendingUpdate.next;
          lastPendingUpdate.next = (firstInterleavedUpdate: any);
          lastInterleavedUpdate.next = (firstPendingUpdate: any);
        }
        queue.pending = (lastInterleavedUpdate: any);
      }
    }
    interleavedQueues = null;
  }
}
