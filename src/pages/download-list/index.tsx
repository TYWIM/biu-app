import { useEffect, useState } from "react";

import {
  Button,
  Card,
  CardBody,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  Radio,
  RadioGroup,
  TableRow,
  Tooltip,
} from "@heroui/react";
import { RiDeleteBinLine, RiExternalLinkLine, RiFolderLine } from "@remixicon/react";
import { filesize } from "filesize";

import { formatMillisecond } from "@/common/utils/time";
import { openBiliVideoLink } from "@/common/utils/url";
import Empty from "@/components/empty";
import Image from "@/components/image";
import ScrollContainer from "@/components/scroll-container";
import { useSettings } from "@/store/settings";
import useIsMobile from "@/common/hooks/use-is-mobile";

import DownloadActions from "./actions";
import DownloadProgress from "./progress";

const DownloadList = () => {
  const downloadPath = useSettings(s => s.downloadPath);
  const isMobile = useIsMobile();
  const electron = window.electron;
  const isBrowserPreview = !electron;
  const [downloadList, setDownloadList] = useState<MediaDownloadTask[]>([]);
  const [fileType, setFileType] = useState<string>("all");

  useEffect(() => {
    if (!electron?.getMediaDownloadTaskList || !electron?.syncMediaDownloadTaskList) {
      setDownloadList([]);
      return;
    }

    const initList = async () => {
      const list = await electron.getMediaDownloadTaskList();
      if (list.length) {
        setDownloadList(list);
      }
    };

    initList();

    const removeListener = electron.syncMediaDownloadTaskList(payload => {
      if (payload?.type === "full") {
        setDownloadList(payload.data as MediaDownloadTask[]);
      } else if (payload?.type === "update") {
        setDownloadList(prev => {
          const updateTasks = payload.data;
          return prev.map(item => {
            const updateTask = updateTasks.find(t => t.id === item.id);
            return updateTask ? { ...item, ...updateTask } : item;
          });
        });
      }
    });

    return () => {
      removeListener();
    };
  }, [electron]);

  const clearDownloadList = async () => {
    await electron?.clearMediaDownloadTaskList?.();
  };

  const openDownloadDir = async () => {
    await electron?.openDirectory?.(downloadPath);
  };

  const getFileQuality = (item: MediaDownloadTask) => {
    if (item.outputFileType === "video") {
      return item.videoResolution
        ? `${item.videoResolution}${item.videoFrameRate ? `@${item.videoFrameRate}` : ""}`
        : "";
    }

    if (item.audioCodecs === "flac") {
      return "flac";
    }

    if (item.audioCodecs?.includes("ec-3")) {
      return "杜比音频";
    }

    if (item.audioBandwidth) {
      return `${Math.round(item.audioBandwidth / 1000)} kbps`;
    }

    return "";
  };

  const filteredDownloadList = downloadList.filter(item => fileType === "all" || item.outputFileType === fileType);

  return (
    <ScrollContainer enableBackToTop className={isMobile ? "h-full w-full px-4 py-3" : "h-full w-full px-4"}>
      <div className={isMobile ? "mb-3 flex flex-col gap-3" : "mb-2 flex items-center justify-between"}>
        <h1 className="flex items-center space-x-1">下载记录</h1>
        <div className={isMobile ? "w-full" : "flex items-center space-x-1"}>
          <Button variant="flat" onPress={openDownloadDir} startContent={<RiFolderLine size={18} />} isDisabled={!electron?.openDirectory} className={isMobile ? "w-full justify-start" : undefined}>
            {downloadPath}
          </Button>
        </div>
      </div>
      {isBrowserPreview && (
        <Empty className="py-8" title="浏览器预览模式下不提供 Electron 下载记录，这里只用于检查手机端排版。" />
      )}
      <Card radius="md" shadow="sm">
        <CardBody>
          <div className={isMobile ? "mb-3 flex flex-col gap-3" : "mb-3 flex items-center justify-between"}>
            <RadioGroup
              orientation={isMobile ? "vertical" : "horizontal"}
              value={fileType}
              onValueChange={setFileType}
              classNames={{
                wrapper: isMobile ? "gap-2" : "gap-4",
              }}
            >
              <Radio value="all">全部</Radio>
              <Radio value="audio">音频</Radio>
              <Radio value="video">视频</Radio>
            </RadioGroup>
            {Boolean(downloadList.length) &&
              (isMobile ? (
                <Button size="sm" variant="flat" color="danger" startContent={<RiDeleteBinLine size={18} />} onPress={clearDownloadList} className="w-full justify-start">
                  清空记录
                </Button>
              ) : (
                <Tooltip content="清空记录" closeDelay={0}>
                  <Button size="sm" isIconOnly onPress={clearDownloadList}>
                    <RiDeleteBinLine size={18} />
                  </Button>
                </Tooltip>
              ))}
          </div>

          {isMobile ? (
            filteredDownloadList.length ? (
              <div className="flex flex-col gap-3">
                {filteredDownloadList.map(item => {
                  const quality = getFileQuality(item);

                  return (
                    <Card key={item.id} radius="md" shadow="none" className="border-divider/40 border">
                      <CardBody className="gap-3 p-4">
                        <div className="flex items-start gap-3">
                          <Image radius="md" src={item.cover} width={56} height={56} className="h-14 w-14 shrink-0 object-cover" />
                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              className="group flex w-full min-w-0 items-center gap-1 text-left hover:underline"
                              onClick={() =>
                                openBiliVideoLink({
                                  type: item.sid ? "audio" : "mv",
                                  bvid: item.bvid,
                                  sid: item.sid,
                                })
                              }
                            >
                              <span className="min-w-0 flex-1 truncate font-medium">{item.title}</span>
                              <RiExternalLinkLine className="text-default-400 h-4 w-4 flex-none" />
                            </button>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Chip size="sm" radius="sm" variant="flat">
                                {item.outputFileType === "audio" ? "音频" : "视频"}
                              </Chip>
                              {Boolean(quality) && (
                                <Chip size="sm" radius="sm" variant="flat">
                                  {quality}
                                </Chip>
                              )}
                            </div>
                          </div>
                        </div>

                        <DownloadProgress data={item} />

                        <div className="grid grid-cols-2 gap-3 text-xs text-default-500">
                          <div>
                            <div className="mb-1">大小</div>
                            <div className="text-foreground text-sm">{item.totalBytes ? filesize(item.totalBytes) : "-"}</div>
                          </div>
                          <div>
                            <div className="mb-1">下载时间</div>
                            <div className="text-foreground text-sm">{item.createdTime ? formatMillisecond(item.createdTime) : "-"}</div>
                          </div>
                        </div>

                        <DownloadActions data={item} />
                      </CardBody>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Empty title={isBrowserPreview ? "浏览器预览模式下暂无下载数据" : undefined} />
            )
          ) : (
            <div className="w-full overflow-x-auto">
              <Table
                fullWidth
                radius="md"
                aria-label="下载列表"
                removeWrapper
                classNames={{
                  th: "first:rounded-s-medium last:rounded-e-medium",
                }}
              >
                <TableHeader className="rounded-medium">
                  <TableColumn width={350}>文件</TableColumn>
                  <TableColumn align="center">状态</TableColumn>
                  <TableColumn width={120} align="center">
                    大小
                  </TableColumn>
                  <TableColumn width={120} align="center">
                    下载时间
                  </TableColumn>
                  <TableColumn width={120} align="center">
                    操作
                  </TableColumn>
                </TableHeader>
                <TableBody items={filteredDownloadList} emptyContent={<Empty title={isBrowserPreview ? "浏览器预览模式下暂无下载数据" : undefined} />}>
                  {item => {
                    const quality = getFileQuality(item);

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="max-w-[280px] truncate">
                          <div className="flex items-center space-x-2">
                            <Image radius="md" src={item.cover} width={48} height={48} className="mr-2 object-cover" />
                            <div className="flex min-w-0 flex-1 flex-col items-start space-y-1 overflow-hidden">
                              <div
                                className="group flex max-w-full min-w-0 cursor-pointer items-center space-x-1 hover:underline"
                                onClick={() =>
                                  openBiliVideoLink({
                                    type: item.sid ? "audio" : "mv",
                                    bvid: item.bvid,
                                    sid: item.sid,
                                  })
                                }
                              >
                                <span className="min-w-0 flex-auto truncate">{item.title}</span>
                                <RiExternalLinkLine className="w-0 flex-none group-hover:w-[16px]" />
                              </div>
                              {Boolean(quality) && (
                                <Chip size="sm" radius="sm" variant="flat">
                                  {quality}
                                </Chip>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <DownloadProgress data={item} />
                        </TableCell>
                        <TableCell>{item.totalBytes ? filesize(item.totalBytes) : "-"}</TableCell>
                        <TableCell>{item.createdTime ? formatMillisecond(item.createdTime) : "-"}</TableCell>
                        <TableCell>
                          <DownloadActions data={item} />
                        </TableCell>
                      </TableRow>
                    );
                  }}
                </TableBody>
              </Table>
            </div>
          )}
        </CardBody>
      </Card>
    </ScrollContainer>
  );
};

export default DownloadList;
