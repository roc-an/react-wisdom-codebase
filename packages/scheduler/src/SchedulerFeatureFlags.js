/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

export const enableSchedulerDebugging = false;
export const enableIsInputPending = false;
export const enableProfiling = false;
export const enableIsInputPendingContinuous = false;
export const frameYieldMs = 5; // 每一帧中，如果任务的执行超过该毫秒数，那么让出控制权给主线程
export const continuousYieldMs = 50;
export const maxYieldMs = 300;
