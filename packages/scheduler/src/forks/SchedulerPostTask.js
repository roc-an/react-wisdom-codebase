/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {PriorityLevel} from '../SchedulerPriorities';

declare class TaskController {
  constructor(priority?: string): TaskController;
  signal: mixed;
  abort(): void;
}

type PostTaskPriorityLevel = 'user-blocking' | 'user-visible' | 'background';

type CallbackNode = {|
  _controller: TaskController,
|};

import {
  ImmediatePriority,
  UserBlockingPriority,
  NormalPriority,
  LowPriority,
  IdlePriority,
} from '../SchedulerPriorities';

export {
  ImmediatePriority as unstable_ImmediatePriority,
  UserBlockingPriority as unstable_UserBlockingPriority,
  NormalPriority as unstable_NormalPriority,
  IdlePriority as unstable_IdlePriority,
  LowPriority as unstable_LowPriority,
};

// Capture local references to native APIs, in case a polyfill overrides them.
const perf = window.performance;
const setTimeout = window.setTimeout;

// Use experimental Chrome Scheduler postTask API.
const scheduler = global.scheduler;

const getCurrentTime = perf.now.bind(perf);

export const unstable_now = getCurrentTime;

// Scheduler periodically yields in case there is other work on the main
// thread, like user events. By default, it yields multiple times per frame.
// It does not attempt to align with frame boundaries, since most tasks don't
// need to be frame aligned; for those that do, use requestAnimationFrame.
// 如果主线程上有其他任务要进行（如用户事件），那么调度将周期性地发生
// 默认一帧内将发生多次调度
// 调度并不会发生在每一帧的边界，因为绝大多数任务无需与帧对齐。如果要对齐的话应该使用 requestAnimationFrame

// 由于浏览器的 JS 线程与 GUI 线程互斥，因此执行 JS 和进行布局、绘制不能同时进行。如果要执行 JS 过久，就会阻塞页面每一帧的绘制
// 在浏览器的每一帧时间中，预留一些时间给 JS 线程，React 利用这些时间完成更新，而不是让 JS 完全占用了这一帧的时间，因为可能还有其他事情要做
// 每一帧预留的 JS 处理时间就是 yieldInterval，默认是 5ms
// 如果预留时间内没有完成 JS 处理，那么 React 会将线程控制权交还给浏览器让它渲染 UI
// 等到了下一帧，React 再用 yieldInterval 时间继续处理之前中断的任务
// 这种将长任务拆分到每一帧的小任务中去执行而不阻塞 UI 渲染的思想，叫「时间切片（Time Slice）」
// 时间切片的核心思想是：将同步更新变为可中断的异步更新
const yieldInterval = 5;
let deadline = 0;

let currentPriorityLevel_DEPRECATED = NormalPriority;

// `isInputPending` is not available. Since we have no way of knowing if
// there's pending input, always yield at the end of the frame.
export function unstable_shouldYield() {
  return getCurrentTime() >= deadline;
}

export function unstable_requestPaint() {
  // Since we yield every frame regardless, `requestPaint` has no effect.
}

type SchedulerCallback<T> = (
  didTimeout_DEPRECATED: boolean,
) =>
  | T
  // May return a continuation
  | SchedulerCallback<T>;

export function unstable_scheduleCallback<T>(
  priorityLevel: PriorityLevel,
  callback: SchedulerCallback<T>,
  options?: {delay?: number},
): CallbackNode {
  let postTaskPriority;
  switch (priorityLevel) {
    case ImmediatePriority:
    case UserBlockingPriority:
      postTaskPriority = 'user-blocking';
      break;
    case LowPriority:
    case NormalPriority:
      postTaskPriority = 'user-visible';
      break;
    case IdlePriority:
      postTaskPriority = 'background';
      break;
    default:
      postTaskPriority = 'user-visible';
      break;
  }

  const controller = new TaskController();
  const postTaskOptions = {
    priority: postTaskPriority,
    delay: typeof options === 'object' && options !== null ? options.delay : 0,
    signal: controller.signal,
  };

  const node = {
    _controller: controller,
  };

  scheduler
    .postTask(
      runTask.bind(null, priorityLevel, postTaskPriority, node, callback),
      postTaskOptions,
    )
    .catch(handleAbortError);

  return node;
}

function runTask<T>(
  priorityLevel: PriorityLevel,
  postTaskPriority: PostTaskPriorityLevel,
  node: CallbackNode,
  callback: SchedulerCallback<T>,
) {
  deadline = getCurrentTime() + yieldInterval;
  try {
    currentPriorityLevel_DEPRECATED = priorityLevel;
    const didTimeout_DEPRECATED = false;
    const result = callback(didTimeout_DEPRECATED);
    if (typeof result === 'function') {
      // Assume this is a continuation
      const continuation: SchedulerCallback<T> = (result: any);
      const continuationController = new TaskController();
      const continuationOptions = {
        priority: postTaskPriority,
        signal: continuationController.signal,
      };
      // Update the original callback node's controller, since even though we're
      // posting a new task, conceptually it's the same one.
      node._controller = continuationController;
      scheduler
        .postTask(
          runTask.bind(
            null,
            priorityLevel,
            postTaskPriority,
            node,
            continuation,
          ),
          continuationOptions,
        )
        .catch(handleAbortError);
    }
  } catch (error) {
    // We're inside a `postTask` promise. If we don't handle this error, then it
    // will trigger an "Unhandled promise rejection" error. We don't want that,
    // but we do want the default error reporting behavior that normal
    // (non-Promise) tasks get for unhandled errors.
    //
    // So we'll re-throw the error inside a regular browser task.
    setTimeout(() => {
      throw error;
    });
  } finally {
    currentPriorityLevel_DEPRECATED = NormalPriority;
  }
}

function handleAbortError(error) {
  // Abort errors are an implementation detail. We don't expose the
  // TaskController to the user, nor do we expose the promise that is returned
  // from `postTask`. So we should suppress them, since there's no way for the
  // user to handle them.
}

export function unstable_cancelCallback(node: CallbackNode) {
  const controller = node._controller;
  controller.abort();
}

export function unstable_runWithPriority<T>(
  priorityLevel: PriorityLevel,
  callback: () => T,
): T {
  const previousPriorityLevel = currentPriorityLevel_DEPRECATED;
  currentPriorityLevel_DEPRECATED = priorityLevel;
  try {
    return callback();
  } finally {
    currentPriorityLevel_DEPRECATED = previousPriorityLevel;
  }
}

export function unstable_getCurrentPriorityLevel() {
  return currentPriorityLevel_DEPRECATED;
}

export function unstable_next<T>(callback: () => T): T {
  let priorityLevel;
  switch (currentPriorityLevel_DEPRECATED) {
    case ImmediatePriority:
    case UserBlockingPriority:
    case NormalPriority:
      // Shift down to normal priority
      priorityLevel = NormalPriority;
      break;
    default:
      // Anything lower than normal priority should remain at the current level.
      priorityLevel = currentPriorityLevel_DEPRECATED;
      break;
  }

  const previousPriorityLevel = currentPriorityLevel_DEPRECATED;
  currentPriorityLevel_DEPRECATED = priorityLevel;
  try {
    return callback();
  } finally {
    currentPriorityLevel_DEPRECATED = previousPriorityLevel;
  }
}

export function unstable_wrapCallback<T>(callback: () => T): () => T {
  const parentPriorityLevel = currentPriorityLevel_DEPRECATED;
  return () => {
    const previousPriorityLevel = currentPriorityLevel_DEPRECATED;
    currentPriorityLevel_DEPRECATED = parentPriorityLevel;
    try {
      return callback();
    } finally {
      currentPriorityLevel_DEPRECATED = previousPriorityLevel;
    }
  };
}

export function unstable_forceFrameRate() {}

export function unstable_pauseExecution() {}

export function unstable_continueExecution() {}

export function unstable_getFirstCallbackNode() {
  return null;
}

// Currently no profiling build
export const unstable_Profiling = null;
