import { useNavigate } from "react-router";

import { Capacitor } from "@capacitor/core";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar,
  useDisclosure,
  addToast,
  type DropdownItemProps,
} from "@heroui/react";
import {
  RiExternalLinkLine,
  RiFeedbackLine,
  RiLoginCircleLine,
  RiLogoutCircleLine,
  RiProfileLine,
  RiRefreshLine,
  RiSettings3Line,
} from "@remixicon/react";
import { twMerge } from "tailwind-merge";

import { canUseRuntimeCookieApi, clearRuntimeLoginCookies, getRuntimeCookie } from "@/common/utils/runtime-cookie";
import { postPassportLoginExit } from "@/service/passport-login-exit";
import { useFavoritesStore } from "@/store/favorite";
import { useModalStore } from "@/store/modal";
import { usePlayList } from "@/store/play-list";
import { usePlayProgress } from "@/store/play-progress";
import { useSettings } from "@/store/settings";
import { useToken } from "@/store/token";
import { useUser } from "@/store/user";

import Login from "../login";

interface UserCardProps {
  onDropdownOpenChange?: (open: boolean) => void;
}

const UserCard = ({ onDropdownOpenChange }: UserCardProps) => {
  const user = useUser(s => s.user);
  const clearUser = useUser(s => s.clear);
  const clearToken = useToken(s => s.clear);
  const navigate = useNavigate();
  const updateSettings = useSettings(s => s.update);
  const electron = typeof window !== "undefined" ? window.electron : undefined;

  const { isOpen: isLoginModalOpen, onOpen: openLoginModal, onOpenChange: onLoginModalOpenChange } = useDisclosure();

  const onOpenConfirmModal = useModalStore(s => s.onOpenConfirmModal);

  const finishLogout = () => {
    clearToken();
    clearUser();
    updateSettings({
      hiddenMenuKeys: [],
    });
    usePlayList.getState().clear();
    useFavoritesStore.setState({
      createdFavorites: [],
      collectedFavorites: [],
    });
    usePlayProgress.setState({
      currentTime: 0,
    });
    navigate("/");
  };

  const logout = async () => {
    if (!canUseRuntimeCookieApi()) {
      addToast({ title: "当前运行环境不支持退出登录操作", color: "default" });
      return false;
    }

    const csrfToken = await getRuntimeCookie("bili_jct");

    if (csrfToken) {
      try {
        const res = await postPassportLoginExit({
          biliCSRF: csrfToken,
        });

        if (res?.code === 0) {
          await clearRuntimeLoginCookies();
          finishLogout();
          addToast({
            title: "已退出登录",
            color: "success",
          });
          return true;
        }
      } catch {
      }
    }

    if (Capacitor.isNativePlatform()) {
      await clearRuntimeLoginCookies();
      finishLogout();
      addToast({
        title: "已退出登录",
        color: "success",
      });
      return true;
    }

    addToast({
      title: csrfToken ? "退出登录失败" : "CSRF Token 不存在",
      color: "danger",
    });
    return false;
  };

  const dropdownItems: (DropdownItemProps & { label: string; hidden?: boolean })[] = [
    {
      key: "login",
      label: "登录",
      startContent: <RiLoginCircleLine size={18} />,
      hidden: user?.isLogin,
      onPress: openLoginModal,
    },
    {
      key: "profile",
      label: "个人资料",
      startContent: <RiProfileLine size={18} />,
      hidden: !user?.isLogin,
      onPress: () => navigate(`/user/${user?.mid}`),
    },
    {
      key: "settings",
      label: "设置",
      startContent: <RiSettings3Line size={18} />,
      onPress: () => navigate("/settings"),
    },
    {
      key: "refresh",
      label: "刷新数据",
      startContent: <RiRefreshLine size={18} />,
      onPress: async () => {
        try {
          await useUser.getState().updateUser();
          const mid = useUser.getState().user?.mid;
          if (mid) {
            await useFavoritesStore.getState().updateCreatedFavorites(mid);
            await useFavoritesStore.getState().updateCollectedFavorites(mid);
          }
          addToast({
            title: "数据刷新成功",
            color: "success",
          });
        } catch {
          addToast({
            title: "刷新数据失败",
            color: "danger",
          });
        }
      },
    },
    {
      key: "feedback",
      label: "问题反馈",
      startContent: <RiFeedbackLine size={18} />,
      endContent: <RiExternalLinkLine size={18} />,
      onPress: () => {
        const url = "https://github.com/TYWIM/biu-app/issues";
        if (electron?.openExternal) {
          electron.openExternal(url);
          return;
        }
        window.open(url, "_blank", "noopener,noreferrer");
      },
    },
    {
      key: "logout",
      label: "退出登录",
      startContent: <RiLogoutCircleLine size={18} />,
      color: "danger" as const,
      className: "text-danger",
      hidden: !user?.isLogin,
      onPress: () => {
        onOpenConfirmModal({
          title: "确认退出登录？",
          type: "danger",
          onConfirm: logout,
        });
      },
    },
  ].filter(item => !item.hidden);

  return (
    <>
      <Dropdown
        shouldBlockScroll={false}
        triggerScaleOnOpen={false}
        radius="md"
        classNames={{
          content: "min-w-[140px]",
        }}
        onOpenChange={onDropdownOpenChange}
      >
        <DropdownTrigger>
          <Avatar
            isBordered
            showFallback
            size="sm"
            as="button"
            type="button"
            className="cursor-pointer transition-transform hover:scale-105"
            src={user?.face}
          />
        </DropdownTrigger>
        <DropdownMenu aria-label="用户操作" variant="flat" items={dropdownItems}>
          {({ key, label, className, ...rest }) => (
            <DropdownItem className={twMerge("rounded-medium", className)} key={key} {...rest}>
              {label}
            </DropdownItem>
          )}
        </DropdownMenu>
      </Dropdown>
      <Login isOpen={isLoginModalOpen} onOpenChange={onLoginModalOpenChange} />
    </>
  );
};

export default UserCard;
