import { apiRequest } from "./request";

/**
 * 获取视频评论列表 - 请求参数
 */
export interface ReplyRequestParams {
  type: number; // 评论区类型 1:视频 2:话题 4:活动 5:直播 6:播单 7:文章 8:动态 9:歌单 11:相册 12:专栏 14:音频 17:歌单(新版) 19:课程 20:课程章节
  oid: number | string; // 目标id (视频为 avid，动态等场景可能是大整数字符串)
  sort?: number; // 排序方式 0:按时间 1:按热度 2:按回复数
  pn?: number; // 页码
  ps?: number; // 每页条数
  next?: number; // 游标分页（新版接口）
}

/**
 * 评论用户信息
 */
export interface ReplyMember {
  mid: string;
  uname: string;
  sex: string;
  sign: string;
  avatar: string;
  rank: string;
  face_nft_new: number;
  is_senior_member: number;
  level_info: {
    current_level: number;
    current_min: number;
    current_exp: number;
    next_exp: number;
  };
  pendant?: {
    pid: number;
    name: string;
    image: string;
    expire: number;
  };
  nameplate?: {
    nid: number;
    name: string;
    image: string;
    image_small: string;
    level: string;
    condition: string;
  };
  official_verify?: {
    type: number;
    desc: string;
  };
  vip?: {
    vipType: number;
    vipDueDate: number;
    dueRemark: string;
    accessStatus: number;
    vipStatus: number;
    vipStatusWarn: string;
    themeType: number;
    label: {
      path: string;
      text: string;
      label_theme: string;
      text_color: string;
      bg_style: number;
      bg_color: string;
      border_color: string;
    };
  };
  fans_detail?: {
    uid: number;
    medal_id: number;
    medal_name: string;
    level: number;
    medal_color: number;
    medal_color_end: number;
    medal_color_start: number;
  };
  user_sailing?: {
    pendant?: {
      id: number;
      name: string;
      image: string;
      jump_url: string;
      type: string;
      image_enhance: string;
    };
    cardbg?: {
      id: number;
      name: string;
      image: string;
      jump_url: string;
      fan?: {
        is_fan: number;
        number: number;
        color: string;
        name: string;
        num_desc: string;
      };
    };
  };
  is_contractor: boolean;
  contract_desc: string;
}

/**
 * 评论内容
 */
export interface ReplyContent {
  message: string;
  plat: number;
  device: string;
  max_line: number;
  members?: ReplyMember[];
  jump_url?: Record<
    string,
    {
      title: string;
      state: number;
      prefix_icon: string;
      app_url_schema: string;
      app_name: string;
      extra?: {
        is_word_search: boolean;
        goods_show_type: number;
      };
      click_report: string;
      is_half_screen: boolean;
      is_merge: boolean;
      is_publish: boolean;
      is_video: boolean;
    }
  >;
  pictures?: {
    img_src: string;
    img_width: number;
    img_height: number;
    img_size: number;
  }[];
  emoji_info?: {
    emoji_details: {
      emoji_name: string;
      url: string;
      meta: {
        size: number;
        alias: string;
      };
      mtime: number;
      type: number;
      attr: number;
      id: number;
      package_id: number;
      state: number;
      ctime: number;
      text: string;
      url_name: string;
      gif_url: string;
    }[];
  };
}

/**
 * 单条评论
 */
export interface ReplyItem {
  rpid: number; // 评论id
  oid: number; // 目标id
  type: number; // 评论区类型
  mid: number; // 发送者mid
  root: number; // 根评论id
  parent: number; // 父评论id
  dialog: number; // 对话id
  count: number; // 回复数
  rcount: number; // 回复数
  state: number;
  fansgrade: number;
  attr: number;
  ctime: number; // 发送时间
  rpid_str: string;
  root_str: string;
  parent_str: string;
  like: number; // 点赞数
  action: number; // 是否已点赞 0:未点赞 1:已点赞
  member: ReplyMember; // 发送者信息
  content: ReplyContent; // 评论内容
  replies?: ReplyItem[]; // 热门回复（仅主评论有）
  assist: number;
  folder: {
    has_folded: boolean;
    is_folded: boolean;
    rule: string;
  };
  up_action: {
    like: boolean;
    reply: boolean;
  };
  show_follow: boolean;
  invisible: boolean;
  reply_control: {
    time_desc: string;
    location: string;
    show_reply_btn: boolean;
    max_line: number;
    sub_reply_entry_text: string;
    sub_reply_title_text: string;
    sub_reply_number: number;
    time: string;
    is_up_top: boolean;
    is_author_top: boolean;
    is_like_show: boolean;
    is_follow_show: boolean;
  };
}

/**
 * 评论列表响应
 */
export interface ReplyResponse {
  code: number;
  message: string;
  ttl: number;
  data: {
    cursor: {
      all_count: number;
      is_begin: boolean;
      prev: number;
      next: number;
      is_end: boolean;
      mode: number;
      mode_text: string;
      name: string;
      pagination_reply?: {
        next_offset: string;
      };
    };
    hots: ReplyItem[] | null;
    notice: null;
    replies: ReplyItem[];
    top: ReplyItem | null;
    top_replies: ReplyItem[] | null;
    up_selection: {
      title: string;
      media_id: number;
      list: ReplyItem[];
    } | null;
    effects: {
      preloading: string;
    };
    assist: number;
    blacklist: number;
    vote: number;
    config: {
      showtopic: number;
      show_up_flag: boolean;
      read_only: boolean;
    };
    upper: {
      mid: number;
      top: ReplyItem | null;
    };
    control: {
      input_disable: boolean;
      root_input_text: string;
      child_input_text: string;
      giveup_input_text: string;
      screenshot_icon_state: number;
      answer_guide_text: string;
      answer_guide_icon_url: string;
      answer_guide_ios_url: string;
      answer_guide_android_url: string;
      bg_text: string;
      empty_page: null;
      show_type: number;
      show_text: string;
      web_selection: boolean;
      disable_jump_emote: boolean;
    };
    notes: any[];
    is_strict_reply: boolean;
  };
}

/**
 * 获取视频评论列表
 * @param params 请求参数
 * @returns 评论列表
 */
export async function getReplyList(params: ReplyRequestParams): Promise<ReplyResponse> {
  return apiRequest.get<ReplyResponse>("/x/v2/reply", {
    params: {
      type: params.type,
      oid: params.oid,
      sort: params.sort ?? 1,
      pn: params.pn ?? 1,
      ps: params.ps ?? 20,
    },
  });
}

/**
 * 获取视频评论列表（新版游标分页）
 * @param params 请求参数
 * @returns 评论列表
 */
export async function getReplyListCursor(params: ReplyRequestParams): Promise<ReplyResponse> {
  return apiRequest.get<ReplyResponse>("/x/v2/reply/main", {
    params: {
      type: params.type,
      oid: params.oid,
      mode: params.sort ?? 3,
      next: params.next ?? 0,
      ps: params.ps ?? 20,
    },
  });
}

/**
 * 获取评论的回复列表
 * @param params 请求参数
 * @returns 回复列表
 */
export async function getReplyDetail(params: {
  type: number;
  oid: number | string;
  root: number;
  pn?: number;
  ps?: number;
}): Promise<ReplyResponse> {
  return apiRequest.get<ReplyResponse>("/x/v2/reply/reply", {
    params: {
      type: params.type,
      oid: params.oid,
      root: params.root,
      pn: params.pn ?? 1,
      ps: params.ps ?? 20,
    },
  });
}

/**
 * 点赞/取消点赞评论
 * @param rpid 评论id
 * @param oid 目标id
 * @param type 评论区类型
 * @param action 1:点赞 0:取消点赞
 * @returns 操作结果
 */
export async function likeReply(
  rpid: number,
  oid: number | string,
  type: number,
  action: 0 | 1,
): Promise<{ code: number; message: string }> {
  return apiRequest.post(
    "/x/v2/reply/action",
    {
      rpid,
      oid,
      type,
      action,
    },
    {
      useCSRF: true,
      useFormData: true,
    },
  );
}

/**
 * 发送评论
 * @param params 请求参数
 * @returns 发送结果
 */
export async function sendReply(params: {
  type: number;
  oid: number | string;
  message: string;
  root?: number;
  parent?: number;
  plat?: number;
}): Promise<{ code: number; message: string; data: { rpid: number; rpid_str: string } }> {
  return apiRequest.post(
    "/x/v2/reply/add",
    {
      type: params.type,
      oid: params.oid,
      message: params.message,
      root: params.root ?? 0,
      parent: params.parent ?? 0,
      plat: params.plat ?? 1,
    },
    {
      useCSRF: true,
      useFormData: true,
    },
  );
}
