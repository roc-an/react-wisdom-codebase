/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @description Scheduler 最小二叉堆
 * @flow strict
 */

// 要想理解二叉堆排序，首先要理解二叉堆的 3 个基本操作：构建二叉堆、插入节点、删除节点

// 以最小二叉堆为例：

// * 构建二叉堆：从完全二叉树的最后一个非叶子节点开始，依次遍历所有非叶子节点，并做“下沉”调整
//   * 下沉：与左、右子节点比较值的大小，如果自己值最大，不调整，否则与比自己值小的互换位置。如果左、右节点值都比自己小，那与最小值互换位置
// * 插入节点：先将新节点插入到最小堆的末尾，然后进行“上浮”调整
//   * 上浮：与父节点比较值的大小，如果比父节点值小，就与父节点互换位置，直到比较到根节点
// * 删除节点：从堆顶删除。将堆顶与最后一个叶子节点互换位置，互换后那个之前的叶子节点从堆顶做“下沉”调整

// 二叉堆排序：

// 排序就是循环提取二叉堆根节点的过程，当所有节点都提取完，被提取的节点构成的数组就是有序数组。

// * 如需升序排序，应该构造最大堆。因为最大的元素最先被提取出来，被放置到了数组的最后，最终数组中最后一个元素为最大元素
// * 如需降序排序，应该构造最小堆。因为最小的元素最先被提取出来，被放置到了数组的最后，最终数组中最后一个元素为最小元素
// * 堆排序是一种不稳定排序。对于相同大小的元素，排序后可能次序被打乱
// * 二叉堆排序的时间复杂度是 `O(nlogn)`

type Heap = Array<Node>;
type Node = {|
  id: number,
  sortIndex: number,
|};

// 添加新节点，添加后需要调用 `siftUp` 将新节点做“上浮”调整
export function push(heap: Heap, node: Node): void {
  const index = heap.length;
  heap.push(node);
  siftUp(heap, node, index);
}

// 查看堆顶，也就是取到优先级最高的任务
// 该操作时间复杂度为 O(1)
export function peek(heap: Heap): Node | null {
  return heap.length === 0 ? null : heap[0];
}

// 提取堆顶节点（提取后，堆数组中不再有该堆顶节点），将最后一个叶子节点置于堆顶后做下沉调整
export function pop(heap: Heap): Node | null {
  if (heap.length === 0) {
    return null;
  }
  const first = heap[0]; // 堆顶
  const last = heap.pop(); // Array.prototype.pop() 会删除数组最后一个元素并返回该元素
  if (last !== first) {
    // 如果堆的最后一个节点不是堆顶，那么与堆顶互换位置，并进行下沉操作
    heap[0] = last;
    siftDown(heap, last, 0);
  }
  return first; // 返回堆顶
}

// 上浮调整。插入节点后做上浮调整，确保 heap 是一个最小二叉堆
function siftUp(heap, node, i) {
  let index = i; // 要上浮的节点索引
  while (index > 0) {
    const parentIndex = (index - 1) >>> 1; // 父节点索引
    const parent = heap[parentIndex]; // 父节点
    if (compare(parent, node) > 0) {
      // The parent is larger. Swap positions.
      // 父节点值更大，交换位置
      heap[parentIndex] = node;
      heap[index] = parent;
      index = parentIndex;
    } else {
      // The parent is smaller. Exit.
      // 如果父节点更小，退出上浮调整
      return;
    }
  }
}

// 下沉调整
// 参数 i 是要下沉的节点的索引
function siftDown(heap, node, i) {
  let index = i;
  const length = heap.length;
  const halfLength = length >>> 1; // 等同于 Math.floor(length/2)
  while (index < halfLength) { // 一直下沉到最后一个非叶子节点索引就可以了
    const leftIndex = (index + 1) * 2 - 1; // 左子节点索引
    const left = heap[leftIndex];
    const rightIndex = leftIndex + 1; // 右子节点索引
    const right = heap[rightIndex];

    // If the left or right node is smaller, swap with the smaller of those.
    // 如果左、右子节点更小，那么与它们中最小的那个交换
    if (compare(left, node) < 0) {
      if (rightIndex < length && compare(right, left) < 0) {
        // 与右子节点交换
        heap[index] = right;
        heap[rightIndex] = node;
        index = rightIndex;
      } else {
        // 与左子节点交换
        heap[index] = left;
        heap[leftIndex] = node;
        index = leftIndex;
      }
    } else if (rightIndex < length && compare(right, node) < 0) {
      // 与右子节点交换
      heap[index] = right;
      heap[rightIndex] = node;
      index = rightIndex;
    } else {
      // Neither child is smaller. Exit.
      // 左、右两个子节点都没有当前遍历的节点小，退出下沉调整
      return;
    }
  }
}

// 比较 a、b 两个节点，如果结果大于 0，则 a > b
function compare(a, b) {
  // Compare sort index first, then task id.
  // 先比较 sortIndex，如果相同，再比较任务 ID
  const diff = a.sortIndex - b.sortIndex;
  return diff !== 0 ? diff : a.id - b.id;
}
