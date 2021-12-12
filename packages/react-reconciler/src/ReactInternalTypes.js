/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Source} from 'shared/ReactElementType';
import type {
  RefObject,
  ReactContext,
  MutableSourceSubscribeFn,
  MutableSourceGetSnapshotFn,
  MutableSourceVersion,
  MutableSource,
} from 'shared/ReactTypes';
import type {SuspenseInstance} from './ReactFiberHostConfig';
import type {WorkTag} from './ReactWorkTags';
import type {TypeOfMode} from './ReactTypeOfMode';
import type {Flags} from './ReactFiberFlags';
import type {Lane, Lanes, LaneMap} from './ReactFiberLane.old';
import type {RootTag} from './ReactRootTags';
import type {TimeoutHandle, NoTimeout} from './ReactFiberHostConfig';
import type {Wakeable} from 'shared/ReactTypes';
import type {Cache} from './ReactFiberCacheComponent.old';

// Unwind Circular: moved from ReactFiberHooks.old
// 移除通知：从 ReactFiberHooks.old 中移除
// 17 种 Hook 类型
export type HookType =
  | 'useState'
  | 'useReducer'
  | 'useContext'
  | 'useRef'
  | 'useEffect'
  | 'useInsertionEffect'
  | 'useLayoutEffect'
  | 'useCallback'
  | 'useMemo'
  | 'useImperativeHandle'
  | 'useDebugValue'
  | 'useDeferredValue'
  | 'useTransition'
  | 'useMutableSource'
  | 'useSyncExternalStore'
  | 'useId'
  | 'useCacheRefresh';

export type ContextDependency<T> = {
  context: ReactContext<T>,
  next: ContextDependency<mixed> | null,
  memoizedValue: T,
  ...
};

export type Dependencies = {
  lanes: Lanes,
  firstContext: ContextDependency<mixed> | null,
  ...
};

// A Fiber is work on a Component that needs to be done or was done. There can
// be more than one per component.
// 一个 Fiber 对象代表着一个即将渲染或已渲染的 ReactElement
// 每个 ReactElement 可能有 0 ~ 2 个 Fiber，Current Fiber 和 WorkInProgress Fiber
// React.Fragment 没有对应的 Fiber
export type Fiber = {|
  // These first fields are conceptually members of an Instance. This used to
  // be split into a separate type and intersected with the other Fiber fields,
  // but until Flow fixes its intersection bugs, we've merged them into a
  // single type.

  // An Instance is shared between all versions of a component. We can easily
  // break this out into a separate object to avoid copying so much to the
  // alternate versions of the tree. We put this on a single object for now to
  // minimize the number of objects created during the initial render.

  // Tag identifying the type of fiber.
  // 表示不同的 Fiber 类型，根据 ReactElement.type 生成，比如原生 DOM 节点、Class Component、Functional Component 等共 25 种
  tag: WorkTag,

  // Unique identifier of this child.
  // 唯一标识该子节点，也就是 ReactElement 的 key
  key: null | string,

  // The value of element.type which is used to preserve the identity during
  // reconciliation of this child.
  // ReactElement.type，即 React.createElement() 的首个参数，用来保留 reconciliation 过程中该子节点的身份
  elementType: any,

  // The resolved function/class/ associated with this fiber.
  // 与这个 Fiber 相关的 resolved 了的 function/class
  // 异步组件（Lazy Component）resolved 之后 return 的内容，一般是 function 或 class
  type: any,

  // The local state associated with this fiber.
  // 该 Fiber 对象对应的实例
  //   对于 HostComponent，就是该 Fiber 对应的 DOM 节点
  //   对于 ClassComponent，就是 Class 实例
  //   FunctionalComponent 没有实例，因此没有 stateNode
  //   根节点的 stateNode 指向 FiberRoot
  // 通过该属性就可以维护组件实例上的 state 和 props 更新
  stateNode: any,

  // Conceptual aliases
  // parent : Instance -> return The parent happens to be the same as the
  // return fiber since we've merged the fiber and instance.
  // 概念上的别名：
  // parent：由于合并了 Fiber 和实例，因此实例 return 的父节点恰巧就是 Fiber return 的父节点

  // Remaining fields belong to Fiber
  // 其余字段属于 Fiber

  // The Fiber to return to after finishing processing this one.
  // This is effectively the parent, but there can be multiple parents (two)
  // so this is only the parent of the thing we're currently processing.
  // It is conceptually the same as the return address of a stack frame.
  // 指向自己的父节点
  // 处理完当前 Fiber 后，要返回到的 Fiber
  // 实际上就是当前 Fiber 的父 Fiber
  // 通过 return、child、sibling 这 3 个属性，就能深度优先地遍历完整个 Fiber 单链表树
  return: Fiber | null,

  // Singly Linked List Tree Structure.
  // 单链表树结构：通过自己的第一个子节点、自己的下一个兄弟节点的连接，构成单向链表树
  child: Fiber | null, // 指向自己的第一个子节点（并不会存所有子节点）
  sibling: Fiber | null, // 指向自己的下一个兄弟节点
  index: number, // 该 Fiber 在兄弟节点中的索引，如果是单节点则默认为 0

  // The ref last used to attach this node.
  // I'll avoid adding an owner field for prod and model that as functions.
  // 在 ReactElement 上设置的 ref
  // 在 reconciler 阶段会将 string 类型的 ref 转成 function 类型
  ref:
    | null
    | (((handle: mixed) => void) & {_stringRef: ?string, ...})
    | RefObject,

  // Input is the data coming into process this fiber. Arguments. Props.
  // pendingProps: 即将下一次更新前，节点的新 props
  // 也就是从 ReactElement 传入的 props，和 memoizedProps 比较可以判断出 props 是否改变
  pendingProps: any, // This type will be more specific once we overload the tag.
  // 上一次生成子节点时用到的属性（生成子节点前是 pendingProps，生成子节点后将 pendingProps 赋给 memoizedProps）
  memoizedProps: any, // The props used to create the output.

  // A queue of state updates and callbacks.
  // 该 Fiber 对应的组件通过 setState 等触发了更新后，更新及其回调会存在该 Fiber 的 updateQueue 中
  // 每一次发起更新，都需要在该队列上创建一个 update 对象
  updateQueue: mixed,

  // The state used to create the output
  // 上一次更新完成后，Fiber 对应组件的 state
  // 如果该 Fiber 对应 FunctionalComponent，那么 memoizedState 指向 Hook 队列
  memoizedState: any,

  // Dependencies (contexts, events) for this fiber, if it has any
  // 该 Fiber 对象所依赖的 context、event
  dependencies: Dependencies | null,

  // Bitfield that describes properties about the fiber and its subtree. E.g.
  // the ConcurrentMode flag indicates whether the subtree should be async-by-
  // default. When a fiber is created, it inherits the mode of its
  // parent. Additional flags can be set at creation time, but after that the
  // value should remain unchanged throughout the fiber's lifetime, particularly
  // before its child fibers are created.
  // 描述当前 Fiber 和其子树的 Bitfield（二进制数字段，如 ConcurrentMode 0b000001）
  // 比如，如果是 ConcurrentMode，那就表明子树默认是异步渲染的
  // 创建 Fiber 时，该模式会继承自父节点。其他标识也可以在创建时设置，
  // 一旦设置后，在整个 Fiber 生命周期内就不应再变了，尤其是在其子 Fiber 创建前
  mode: TypeOfMode,

  // Effect
  // 副作用相关
  flags: Flags, // 副作用标记，Reconciler 阶段会将所有有 flags 标记的节点加入到「副作用链表」中，等待 commit 阶段去处理
  subtreeFlags: Flags,
  deletions: Array<Fiber> | null,

  // Singly linked list fast path to the next fiber with side-effects.
  nextEffect: Fiber | null, // 单向链表中，指向下一个有副作用的 Fiber

  // The first and last fiber with side-effect within this subtree. This allows
  // us to reuse a slice of the linked list when we reuse the work done within
  // this fiber.
  firstEffect: Fiber | null, // 该 Fiber 子树中，首个有副作用的节点
  lastEffect: Fiber | null, // 该 Fiber 子树中，最后一个有副作用的节点

  // 优先级相关
  lanes: Lanes, // 该 Fiber 节点的优先级，创建 Fiber 时设置
  childLanes: Lanes, // 子节点的优先级

  // This is a pooled version of a Fiber. Every fiber that gets updated will
  // eventually have a pair. There are cases when we can clean up pairs to save
  // memory if we need to.
  // 这是一个 Fiber 的池化版（alternate 译为“交替”）。更新过程中，每个 Fiber 都会有与其对应的一个 Fiber
  // 这两个 Fiber 是 current 和 workInProgress 的关系
  // 更新过程中，会基于当前 Fiber（current Fiber）创建一个对应的正进行更新中的 Fiber（workInProgress Fiber）
  // 更新渲染完成后，current Fiber 和 workInProgress Fiber 两者互换
  // 之所以需要该属性来存着对应的 Fiber，是为了避免每次交换时重新创建对象的开销，直接通过该属性复用就行了
  // 是一种双缓冲 Double Buffer 思想
  alternate: Fiber | null,

  // 性能统计相关，需开启 enableProfilerTimer 后才统计
  // Time spent rendering this Fiber and its descendants for the current update.
  // This tells us how well the tree makes use of sCU for memoization.
  // It is reset to 0 each time we render and only updated when we don't bailout.
  // This field is only set when the enableProfilerTimer flag is enabled.
  // 本次更新中，该节点及其子树所消耗的总时间
  actualDuration?: number,

  // If the Fiber is currently active in the "render" phase,
  // This marks the time at which the work began.
  // This field is only set when the enableProfilerTimer flag is enabled.
  // 该 Fiber 节点开始构建的时间
  actualStartTime?: number,

  // Duration of the most recent render time for this Fiber.
  // This value is not updated when we bailout for memoization purposes.
  // This field is only set when the enableProfilerTimer flag is enabled.
  // 最近一次生成该 Fiber 节点所消耗的时间
  selfBaseDuration?: number,

  // Sum of base times for all descendants of this Fiber.
  // This value bubbles up during the "complete" phase.
  // This field is only set when the enableProfilerTimer flag is enabled.
  // 生成子树所消耗的总时间
  treeBaseDuration?: number,

  // Conceptual aliases
  // workInProgress : Fiber ->  alternate The alternate used for reuse happens
  // to be the same as work in progress.
  // __DEV__ only

  _debugSource?: Source | null,
  _debugOwner?: Fiber | null,
  _debugIsCurrentlyTiming?: boolean,
  _debugNeedsRemount?: boolean,

  // Used to verify that the order of hooks does not change between renders.
  _debugHookTypes?: Array<HookType> | null,
|};

// 主要的 FiberRoot 属性
type BaseFiberRootProperties = {|
  // The type of root (legacy, batched, concurrent, etc.)
  // root 类型（legacy、batched、concurrent 等等）
  tag: RootTag,

  // Any additional information from the host associated with this root.
  // 携带着来自宿主的任何和该 root 相关的信息
  // ReactDOM.render() 传入的第二个参数，即要渲染至的容器节点
  containerInfo: any,
  // Used only by persistent updates.
  // 仅在持久更新（比如 SSR）中用到，react-dom 不会用到
  pendingChildren: any,
  // The currently active root fiber. This is the mutable root of the tree.
  // 当前激活的根 Fiber，是 Fiber 树的根
  // 整个应用维护着一棵 Fiber 树，每个 ReactElement 都对应着一个 Fiber 对象。
  // 该 FiberRoot 的 current 是 Fiber 树的顶点
  current: Fiber,

  pingCache: WeakMap<Wakeable, Set<mixed>> | Map<Wakeable, Set<mixed>> | null,

  // A finished work-in-progress HostRoot that's ready to be committed.
  // 用于记录在一次更新渲染过程中完成了的那个更新任务（也就是每次更新渲染的最高优先级的那个任务）
  // 之所以将它挂在 root 上面，是因为更新后就要渲染实际 DOM 了，此时可以读取 finishedWork 属性
  finishedWork: Fiber | null,
  // Timeout handle returned by setTimeout. Used to cancel a pending timeout, if
  // it's superseded by a new one.
  // 由 setTimeout return 的超时句柄，用于取消 pending 超时
  // 多用于 <React.Suspense>，在其中 throw promise 实例，任务会被挂起，timeoutHandle 用于记录挂起的超时情况
  timeoutHandle: TimeoutHandle | NoTimeout,
  // Top context object, used by renderSubtreeIntoContainer
  // 顶层 context 对象（超低频使用）
  // 只有主动调用 renderSubtreeIntoContainer 才会有 context 对象
  context: Object | null,
  pendingContext: Object | null,
  // Determines if we should attempt to hydrate on the initial mount
  // 决定首次渲染时是否应尝试调和（复用 container 的已渲染子节点）
  +isDehydrated: boolean,

  // Used by useMutableSource hook to avoid tearing during hydration.
  mutableSourceEagerHydrationData?: Array<
    MutableSource<any> | MutableSourceVersion,
  > | null,

  // Node returned by Scheduler.scheduleCallback. Represents the next rendering
  // task that the root will work on.
  // 由 Scheduler.scheduleCallback return 的节点。代表了 root 将进行的下一个渲染任务
  callbackNode: *,
  callbackPriority: Lane,
  eventTimes: LaneMap<number>,
  expirationTimes: LaneMap<number>,

  pendingLanes: Lanes,
  suspendedLanes: Lanes,
  pingedLanes: Lanes,
  expiredLanes: Lanes,
  mutableReadLanes: Lanes,

  finishedLanes: Lanes,

  entangledLanes: Lanes,
  entanglements: LaneMap<Lanes>,

  pooledCache: Cache | null,
  pooledCacheLanes: Lanes,
|};

// The following attributes are only used by DevTools and are only present in DEV builds.
// They enable DevTools Profiler UI to show which Fiber(s) scheduled a given commit.
type UpdaterTrackingOnlyFiberRootProperties = {|
  memoizedUpdaters: Set<Fiber>,
  pendingUpdatersLaneMap: LaneMap<Set<Fiber>>,
|};

export type SuspenseHydrationCallbacks = {
  onHydrated?: (suspenseInstance: SuspenseInstance) => void,
  onDeleted?: (suspenseInstance: SuspenseInstance) => void,
  ...
};

// The follow fields are only used by enableSuspenseCallback for hydration.
type SuspenseCallbackOnlyFiberRootProperties = {|
  hydrationCallbacks: null | SuspenseHydrationCallbacks,
|};

// Exported FiberRoot type includes all properties,
// To avoid requiring potentially error-prone :any casts throughout the project.
// The types are defined separately within this file to ensure they stay in sync.
export type FiberRoot = {
  ...BaseFiberRootProperties,
  ...SuspenseCallbackOnlyFiberRootProperties,
  ...UpdaterTrackingOnlyFiberRootProperties,
  ...
};

type BasicStateAction<S> = (S => S) | S;
type Dispatch<A> = A => void;

export type Dispatcher = {|
  getCacheSignal?: () => AbortSignal,
  getCacheForType?: <T>(resourceType: () => T) => T,
  readContext<T>(context: ReactContext<T>): T,
  useState<S>(initialState: (() => S) | S): [S, Dispatch<BasicStateAction<S>>],
  useReducer<S, I, A>(
    reducer: (S, A) => S,
    initialArg: I,
    init?: (I) => S,
  ): [S, Dispatch<A>],
  useContext<T>(context: ReactContext<T>): T,
  useRef<T>(initialValue: T): {|current: T|},
  useEffect(
    create: () => (() => void) | void,
    deps: Array<mixed> | void | null,
  ): void,
  useInsertionEffect(
    create: () => (() => void) | void,
    deps: Array<mixed> | void | null,
  ): void,
  useLayoutEffect(
    create: () => (() => void) | void,
    deps: Array<mixed> | void | null,
  ): void,
  useCallback<T>(callback: T, deps: Array<mixed> | void | null): T,
  useMemo<T>(nextCreate: () => T, deps: Array<mixed> | void | null): T,
  useImperativeHandle<T>(
    ref: {|current: T | null|} | ((inst: T | null) => mixed) | null | void,
    create: () => T,
    deps: Array<mixed> | void | null,
  ): void,
  useDebugValue<T>(value: T, formatterFn: ?(value: T) => mixed): void,
  useDeferredValue<T>(value: T): T,
  useTransition(): [boolean, (() => void) => void],
  useMutableSource<Source, Snapshot>(
    source: MutableSource<Source>,
    getSnapshot: MutableSourceGetSnapshotFn<Source, Snapshot>,
    subscribe: MutableSourceSubscribeFn<Source, Snapshot>,
  ): Snapshot,
  useSyncExternalStore<T>(
    subscribe: (() => void) => () => void,
    getSnapshot: () => T,
    getServerSnapshot?: () => T,
  ): T,
  useId(): string,
  useCacheRefresh?: () => <T>(?() => T, ?T) => void,

  unstable_isNewReconciler?: boolean,
|};
