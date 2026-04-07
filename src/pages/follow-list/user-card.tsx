import React from "react";
import { useNavigate } from "react-router";

import { Avatar, Button, Card, CardBody, addToast } from "@heroui/react";
import { RiFlashlightFill, RiGroupLine, RiUserUnfollowLine } from "@remixicon/react";

import useIsMobile from "@/common/hooks/use-is-mobile";
import type { RelationListItem } from "@/service/relation-followings";
import type { RelationTagUser } from "@/service/relation-tag";

import { UserRelationAction, postRelationModify } from "@/service/relation-modify";
import { useModalStore } from "@/store/modal";

interface Props {
  u: RelationListItem | RelationTagUser;
  refresh: () => void;
  onSetGroup: (u: RelationListItem | RelationTagUser) => void;
}

const UserCard = ({ u, refresh, onSetGroup }: Props) => {
  const navigate = useNavigate();
  const onOpenConfirmModal = useModalStore(s => s.onOpenConfirmModal);
  const isMobile = useIsMobile();

  const handleUnfollow = async () => {
    onOpenConfirmModal({
      title: `取消关注 ${u.uname}`,
      type: "danger",
      confirmText: "取消关注",
      onConfirm: async () => {
        try {
          const res = await postRelationModify({ fid: u.mid, act: UserRelationAction.Unfollow });
          if (res?.code !== 0) {
            addToast({
              title: "取消关注失败",
              color: "danger",
            });
            return false;
          }
          addToast({
            title: "取消关注成功",
            color: "success",
          });
          refresh();
          return true;
        } catch {
          addToast({
            title: "取消关注失败",
            color: "danger",
          });
          return false;
        }
      },
    });
  };

  const handleSetGroup = () => {
    onSetGroup(u);
  };

  return (
    <Card
      key={u.mid}
      radius="md"
      as="div"
      isHoverable
      isPressable
      onPress={() => navigate(`/user/${u.mid}`)}
      className="group relative h-full w-full overflow-hidden"
    >
      <CardBody className={isMobile ? "flex items-center gap-3 overflow-hidden p-4" : "flex items-center space-y-2 overflow-hidden p-4"}>
        <div className={isMobile ? "relative h-20 w-20 flex-none" : "relative h-32 w-32 flex-none"}>
          <Avatar
            className={isMobile ? "text-large h-20 w-20" : "text-large h-32 w-32"}
            src={`${u.face}@160w_160h_1c_1s.webp`}
            name={u.uname}
          />
          {u.official_verify?.type === 0 && (
            <div className={isMobile ? "bg-warning ring-background absolute right-0 bottom-0 flex h-5 w-5 items-center justify-center rounded-full text-white ring-2" : "bg-warning ring-background absolute right-1 bottom-1 flex h-6 w-6 items-center justify-center rounded-full text-white ring-2"}>
              <RiFlashlightFill size={14} />
            </div>
          )}
          {u.official_verify?.type === 1 && (
            <div className={isMobile ? "bg-primary ring-background absolute right-0 bottom-0 flex h-5 w-5 items-center justify-center rounded-full text-white ring-2" : "bg-primary ring-background absolute right-1 bottom-1 flex h-6 w-6 items-center justify-center rounded-full text-white ring-2"}>
              <RiFlashlightFill size={14} />
            </div>
          )}
        </div>
        <div className={isMobile ? "flex min-w-0 flex-1 flex-col items-start space-y-1" : "flex w-full flex-col items-center space-y-1"}>
          <span className={isMobile ? "max-w-full min-w-0 truncate text-base font-medium" : "max-w-full min-w-0 truncate text-lg"}>{u.uname}</span>
          <span className={isMobile ? "text-foreground-500 line-clamp-2 w-full text-left text-sm" : "text-foreground-500 line-clamp-2 w-full text-center text-sm"}>{u.sign}</span>
        </div>
      </CardBody>

      <div
        className={
          isMobile
            ? "border-divider/40 flex items-center justify-end gap-2 border-t px-4 py-3"
            : "bg-background/70 absolute bottom-4 left-1/2 flex w-max -translate-x-1/2 translate-y-20 items-center justify-center rounded-full border border-white/10 px-1 py-1 shadow-lg backdrop-blur-xl backdrop-saturate-150 transition-all duration-300 ease-in-out group-hover:translate-y-0"
        }
      >
        <Button
          size="sm"
          variant="light"
          radius={isMobile ? "md" : "full"}
          onPress={handleSetGroup}
          aria-label="设置分组"
          title="设置分组"
          startContent={<RiGroupLine size={18} />}
        >
          设置分组
        </Button>
        <Button
          size="sm"
          color="danger"
          variant="light"
          radius={isMobile ? "md" : "full"}
          onPress={handleUnfollow}
          aria-label="取消关注"
          title="取消关注"
          startContent={<RiUserUnfollowLine size={18} />}
        >
          取消关注
        </Button>
      </div>
    </Card>
  );
};

export default UserCard;
