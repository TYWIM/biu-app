import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { addToast, Button, Spinner, Tab, Tabs, Textarea } from "@heroui/react";
import { RiThumbUpFill, RiThumbUpLine, RiMessage3Line, RiPushpinLine } from "@remixicon/react";
import clsx from "classnames";

import useIsMobile from "@/common/hooks/use-is-mobile";
import { formatNumber } from "@/common/utils/number";
import { formatTimeAgo } from "@/common/utils/time";
import Image from "@/components/image";
import ScrollContainer, { type ScrollRefObject } from "@/components/scroll-container";
import type { ReplyContent, ReplyItem } from "@/service/reply";
import { getReplyDetail, getReplyListCursor, likeReply, sendReply } from "@/service/reply";

interface CommentListProps {
  avid?: number;
  targetId?: number | string;
  type?: number;
  title?: string;
}

type SortType = "hot" | "time";

interface EmojiMap {
  [name: string]: string;
}

const findComment = (comments: ReplyItem[], rpid: number): ReplyItem | undefined => {
  for (const comment of comments) {
    if (comment.rpid === rpid) return comment;
    const reply = findComment(comment.replies ?? [], rpid);
    if (reply) return reply;
  }
};

const updateComment = (
  comments: ReplyItem[],
  rpid: number,
  updater: (comment: ReplyItem) => ReplyItem,
): ReplyItem[] =>
  comments.map(comment => {
    const nextReplies = comment.replies ? updateComment(comment.replies, rpid, updater) : comment.replies;
    const nextComment = comment.rpid === rpid ? updater(comment) : comment;
    return nextReplies === comment.replies ? nextComment : { ...nextComment, replies: nextReplies };
  });

const buildEmojiMap = (content: ReplyContent): EmojiMap => {
  const map: EmojiMap = {};
  const details = content.emoji_info?.emoji_details;
  if (details) {
    for (const emoji of details) {
      map[emoji.text] = emoji.url;
    }
  }
  return map;
};

const renderRichContent = (content: ReplyContent): React.ReactNode[] => {
  const emojiMap = buildEmojiMap(content);
  const { message, jump_url } = content;

  if (!message) return [];

  const jumpEntries = jump_url
    ? Object.entries(jump_url).sort((a, b) => b[0].length - a[0].length)
    : [];

  const emojiRegex = /\[([^\]]+)\]/g;
  const allRegex = new RegExp(
    [
      emojiRegex.source,
      ...jumpEntries.map(([key]) => key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    ].join("|"),
    "g",
  );

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = allRegex.exec(message)) !== null) {
    if (match.index > lastIndex) {
      parts.push(message.slice(lastIndex, match.index));
    }

    const matchedText = match[0];

    if (matchedText.startsWith("[") && matchedText.endsWith("]")) {
      const emojiName = matchedText;
      const emojiUrl = emojiMap[emojiName];
      if (emojiUrl) {
        parts.push(
          <img
            key={`emoji-${match.index}`}
            src={emojiUrl}
            alt={emojiName}
            className="inline-block h-5 w-5 align-text-bottom"
          />,
        );
      } else {
        parts.push(matchedText);
      }
    } else {
      const jumpInfo = jump_url?.[matchedText];
      if (jumpInfo) {
        parts.push(
          <a
            key={`link-${match.index}`}
            href={jumpInfo.app_url_schema || "#"}
            className="text-primary underline break-all"
            onClick={e => {
              if (!jumpInfo.app_url_schema) {
                e.preventDefault();
              }
            }}
          >
            {jumpInfo.title || matchedText}
          </a>,
        );
      } else {
        parts.push(matchedText);
      }
    }

    lastIndex = match.index + matchedText.length;
  }

  if (lastIndex < message.length) {
    parts.push(message.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [message];
};

interface CommentItemProps {
  comment: ReplyItem;
  isReply?: boolean;
  replyLoadingMap: Record<number, boolean>;
  onLike: (comment: ReplyItem) => void;
  onSetReplyTarget: (comment: ReplyItem) => void;
  onLoadReplies: (comment: ReplyItem) => void;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  isReply,
  replyLoadingMap,
  onLike,
  onSetReplyTarget,
  onLoadReplies,
}) => {
  const rootId = comment.root || comment.rpid;
  const visibleReplies = comment.replies ?? [];
  const remainingReplyCount = Math.max(0, comment.rcount - visibleReplies.length);
  const isLoadingReplies = Boolean(replyLoadingMap[rootId]);

  return (
    <div className={clsx("flex gap-3", isReply ? "mt-3" : "py-4 border-b border-default-100 last:border-0")}>
      <Image
        src={comment.member.avatar}
        alt={comment.member.uname}
        className={clsx("flex-shrink-0 rounded-full object-cover", isReply ? "h-7 w-7" : "h-10 w-10")}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={clsx("font-medium text-primary truncate", isReply ? "text-xs" : "text-sm")}>{comment.member.uname}</span>
          {comment.member.vip?.vipStatus === 1 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-pink-100 text-pink-600 font-medium">
              {comment.member.vip.label.text}
            </span>
          )}
        </div>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
          {renderRichContent(comment.content)}
        </p>
        {comment.content.pictures && comment.content.pictures.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {comment.content.pictures.map((pic, index) => (
              <Image
                key={index}
                src={pic.img_src}
                alt="评论图片"
                className="h-24 w-24 rounded-lg object-cover"
              />
            ))}
          </div>
        )}
        <div className="flex items-center gap-4 mt-2 text-xs text-default-500">
          <span>{formatTimeAgo(comment.ctime)}</span>
          <button
            type="button"
            onClick={() => onLike(comment)}
            aria-label={comment.action === 1 ? "取消点赞评论" : "点赞评论"}
            className={clsx(
              "flex items-center gap-1 transition-colors",
              comment.action === 1 ? "text-pink-500" : "hover:text-foreground",
            )}
          >
            {comment.action === 1 ? <RiThumbUpFill size={14} /> : <RiThumbUpLine size={14} />}
            {formatNumber(comment.like)}
          </button>
          <button
            type="button"
            onClick={() => onSetReplyTarget(comment)}
            aria-label="回复评论"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <RiMessage3Line size={14} />
            回复
          </button>
        </div>
        {!isReply && visibleReplies.length > 0 && (
          <div className="mt-3 rounded-lg bg-default-50 p-3">
            {visibleReplies.map(reply => (
              <CommentItem
                key={reply.rpid}
                comment={reply}
                isReply
                replyLoadingMap={replyLoadingMap}
                onLike={onLike}
                onSetReplyTarget={onSetReplyTarget}
                onLoadReplies={onLoadReplies}
              />
            ))}
          </div>
        )}
        {!isReply && remainingReplyCount > 0 && (
          <Button
            size="sm"
            variant="light"
            className="mt-2 h-7 px-2 text-xs text-primary"
            isLoading={isLoadingReplies}
            onPress={() => onLoadReplies(comment)}
          >
            查看 {formatNumber(remainingReplyCount)} 条回复
          </Button>
        )}
      </div>
    </div>
  );
};

const CommentList: React.FC<CommentListProps> = ({ avid, targetId, type = 1, title = "评论" }) => {
  const resolvedTargetId = targetId ?? avid ?? 0;
  const isMobile = useIsMobile();
  const [sort, setSort] = useState<SortType>("hot");
  const [comments, setComments] = useState<ReplyItem[]>([]);
  const [topComment, setTopComment] = useState<ReplyItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState(0);
  const [total, setTotal] = useState(0);
  const [replyTarget, setReplyTarget] = useState<ReplyItem | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [replyLoadingMap, setReplyLoadingMap] = useState<Record<number, boolean>>({});
  const scrollRef = useRef<ScrollRefObject | null>(null);
  const cursorRef = useRef(0);
  const loadingRef = useRef(false);

  const fetchComments = useCallback(async (isRefresh = false) => {
    if (loadingRef.current || !resolvedTargetId) return;
    loadingRef.current = true;
    setLoading(true);
    setRefreshing(isRefresh);
    try {
      const currentCursor = isRefresh ? 0 : cursorRef.current;
      const response = await getReplyListCursor({
        type,
        oid: resolvedTargetId,
        sort: sort === "hot" ? 3 : 2,
        next: currentCursor,
        ps: 20,
      });

      if (response.code === 0) {
        const newComments = response.data.replies || [];
        if (isRefresh) {
          setComments(newComments);
          const top = response.data.top;
          setTopComment(top && top.rpid ? top : null);
        } else {
          setComments(prev => [...prev, ...newComments]);
        }
        setTotal(response.data.cursor.all_count);
        cursorRef.current = response.data.cursor.next;
        setCursor(response.data.cursor.next);
        setHasMore(!response.data.cursor.is_end);
      }
    } catch (error) {
      console.error("Failed to fetch comments:", error);
      addToast({ title: "评论加载失败", color: "danger" });
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  }, [resolvedTargetId, sort, type]);

  useEffect(() => {
    setComments([]);
    setTopComment(null);
    cursorRef.current = 0;
    setCursor(0);
    setHasMore(true);
    setTotal(0);
    setReplyTarget(null);
    setDraft("");
    void fetchComments(true);
  }, [resolvedTargetId, sort, fetchComments]);

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      void fetchComments(false);
    }
  };

  const handleLike = useCallback(async (comment: ReplyItem) => {
    const action = comment.action === 1 ? 0 : 1;
    setComments(prev =>
      updateComment(prev, comment.rpid, item => ({
        ...item,
        action,
        like: Math.max(0, item.like + (action === 1 ? 1 : -1)),
      })),
    );
    try {
      const result = await likeReply(comment.rpid, comment.oid, comment.type, action as 0 | 1);
      if (result.code !== 0) {
        addToast({ title: result.message || "操作失败", color: "danger" });
        setComments(prev =>
          updateComment(prev, comment.rpid, item => ({
            ...item,
            action: comment.action,
            like: comment.like,
          })),
        );
      }
    } catch (error) {
      console.error("Failed to like comment:", error);
      addToast({ title: "点赞失败", color: "danger" });
      setComments(prev =>
        updateComment(prev, comment.rpid, item => ({
          ...item,
          action: comment.action,
          like: comment.like,
        })),
      );
    }
  }, []);

  const handleLoadReplies = useCallback(async (comment: ReplyItem, forceRefresh = false) => {
    const rootId = comment.root || comment.rpid;
    if (replyLoadingMap[rootId]) return;

    const rootComment = comment.root ? findComment(comments, rootId) : comment;
    if (!rootComment) return;

    const currentReplies = rootComment.replies ?? [];
    if (!forceRefresh && currentReplies.length >= rootComment.rcount) return;

    setReplyLoadingMap(prev => ({ ...prev, [rootId]: true }));
    try {
      const response = await getReplyDetail({
        type: rootComment.type,
        oid: rootComment.oid,
        root: rootId,
        pn: 1,
        ps: Math.max(10, rootComment.rcount || 10),
      });

      if (response.code === 0) {
        setComments(prev =>
          updateComment(prev, rootId, item => ({
            ...item,
            replies: response.data.replies ?? [],
          })),
        );
      } else {
        addToast({ title: response.message || "回复加载失败", color: "danger" });
      }
    } catch (error) {
      console.error("Failed to load replies:", error);
      addToast({ title: "回复加载失败", color: "danger" });
    } finally {
      setReplyLoadingMap(prev => ({ ...prev, [rootId]: false }));
    }
  }, [comments, replyLoadingMap]);

  const handleSetReplyTarget = useCallback((comment: ReplyItem) => {
    setReplyTarget(comment);
    setDraft(prev => prev || "");
  }, []);

  const handleSubmit = async () => {
    const message = draft.trim();
    if (!message) {
      addToast({ title: "先写点内容吧", color: "warning" });
      return;
    }
    if (!resolvedTargetId) {
      addToast({ title: "当前内容没有可用评论区", color: "warning" });
      return;
    }

    const target = replyTarget;
    const root = target ? target.root || target.rpid : 0;
    const parent = target ? target.rpid : 0;

    setSending(true);
    try {
      const result = await sendReply({
        type,
        oid: resolvedTargetId,
        message,
        root,
        parent,
      });

      if (result.code === 0) {
        addToast({ title: target ? "回复已发送" : "评论已发送", color: "success" });
        setDraft("");
        setReplyTarget(null);
        if (target) {
          const rootComment = findComment(comments, root);
          if (rootComment) {
            setComments(prev =>
              updateComment(prev, root, item => ({
                ...item,
                rcount: item.rcount + 1,
              })),
            );
            await handleLoadReplies(rootComment, true);
          }
        } else {
          await fetchComments(true);
        }
      } else {
        addToast({ title: result.message || "发送失败", color: "danger" });
      }
    } catch (error) {
      console.error("Failed to send comment:", error);
      addToast({ title: "发送失败", color: "danger" });
    } finally {
      setSending(false);
    }
  };

  const isTopInComments = useMemo(
    () => topComment ? comments.some(c => c.rpid === topComment.rpid) : false,
    [topComment, comments],
  );

  return (
    <div className={clsx("flex flex-col h-full", isMobile ? "bg-background" : "")}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-default-100">
        <h3 className="text-base font-semibold">
          {title} {total > 0 && `(${formatNumber(total)})`}
        </h3>
        <Tabs
          size="sm"
          selectedKey={sort}
          onSelectionChange={key => setSort(key as SortType)}
          variant="light"
        >
          <Tab key="hot" title="热门" />
          <Tab key="time" title="最新" />
        </Tabs>
      </div>

      <ScrollContainer
        ref={scrollRef}
        className="min-h-0 flex-1 px-4"
        options={{ scrollbars: { autoHide: "leave" } }}
        resetOnChange={`${resolvedTargetId}-${type}-${sort}`}
      >
        {!resolvedTargetId ? (
          <div className="flex flex-col items-center justify-center py-20 text-default-400">
            <RiMessage3Line size={48} className="mb-4" />
            <p>当前内容没有可用评论区</p>
          </div>
        ) : refreshing && comments.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="sm" />
          </div>
        ) : comments.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-default-400">
            <RiMessage3Line size={48} className="mb-4" />
            <p>暂无评论</p>
          </div>
        ) : (
          <>
            {topComment && !isTopInComments && (
              <div className="border-b border-primary-200 mb-1">
                <div className="flex items-center gap-1 text-xs text-primary py-2">
                  <RiPushpinLine size={12} />
                  <span>置顶</span>
                </div>
                <CommentItem
                  comment={topComment}
                  replyLoadingMap={replyLoadingMap}
                  onLike={handleLike}
                  onSetReplyTarget={handleSetReplyTarget}
                  onLoadReplies={handleLoadReplies}
                />
              </div>
            )}
            {comments.map(comment => (
              <CommentItem
                key={comment.rpid}
                comment={comment}
                replyLoadingMap={replyLoadingMap}
                onLike={handleLike}
                onSetReplyTarget={handleSetReplyTarget}
                onLoadReplies={handleLoadReplies}
              />
            ))}
            {hasMore && (
              <div className="flex justify-center py-4">
                <Button
                  variant="light"
                  size="sm"
                  onPress={handleLoadMore}
                  isLoading={loading}
                  isDisabled={loading}
                >
                  {loading ? "加载中..." : "加载更多"}
                </Button>
              </div>
            )}
            {!hasMore && comments.length > 0 && (
              <p className="text-center text-xs text-default-400 py-4">没有更多评论了</p>
            )}
          </>
        )}
      </ScrollContainer>

      <div className="border-t border-default-100 px-4 py-3">
        {replyTarget && (
          <div className="mb-2 flex items-center justify-between gap-2 text-xs text-default-500">
            <span className="min-w-0 truncate">回复 @{replyTarget.member.uname}</span>
            <button
              type="button"
              className="flex-none text-primary"
              onClick={() => setReplyTarget(null)}
            >
              取消
            </button>
          </div>
        )}
        <div className="flex items-end gap-2">
          <Textarea
            minRows={1}
            maxRows={3}
            value={draft}
            onValueChange={setDraft}
            placeholder={replyTarget ? "写下回复..." : "写下评论..."}
            variant="bordered"
            radius="sm"
            classNames={{
              inputWrapper: "min-h-10",
              input: "text-sm",
            }}
          />
          <Button
            color="primary"
            size="sm"
            className="h-10 flex-none px-4"
            isLoading={sending}
            isDisabled={sending || !draft.trim() || !resolvedTargetId}
            onPress={handleSubmit}
          >
            发送
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CommentList;
