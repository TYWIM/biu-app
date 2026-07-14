import { addToast } from "@heroui/react";

import { addDownloadTask, type DownloadTask } from "./native-download";

const MAX_BATCH_DOWNLOADS = 3;

export async function queueDownloadTask(task: DownloadTask, showToast = true): Promise<boolean> {
  const result = await addDownloadTask(task);
  const success = Boolean(result);

  if (showToast) {
    addToast({
      title: success ? "已添加下载任务" : "下载失败，请稍后重试",
      color: success ? "success" : "danger",
    });
  }

  return success;
}

export async function queueDownloadTasks(tasks: DownloadTask[]): Promise<number> {
  const queuedTasks = tasks.slice(0, MAX_BATCH_DOWNLOADS);
  let successCount = 0;

  for (const task of queuedTasks) {
    if (await queueDownloadTask(task, false)) {
      successCount += 1;
    }
  }

  addToast({
    title: successCount ? `已添加 ${successCount} 个下载任务` : "下载失败，请稍后重试",
    description: tasks.length > MAX_BATCH_DOWNLOADS ? `单次最多添加 ${MAX_BATCH_DOWNLOADS} 个任务` : undefined,
    color: successCount ? "success" : "danger",
  });

  return successCount;
}
