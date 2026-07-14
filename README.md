# Biu 音乐播放器

<p align="center">
  <img src="./screenshots/logo.svg" alt="Biu logo" width="112" />
</p>

基于哔哩哔哩公开接口的 Android 音乐播放器，使用 React、TypeScript、Capacitor 和原生 Android 播放能力构建。

> Biu 是非官方、非商业项目，与哔哩哔哩无任何官方关联或背书。项目当前只维护 Android 手机端。

## 当前阶段

- 当前版本：`1.17.0`
- 主线平台：Android / Capacitor
- 项目仍处于早期迭代阶段，接口兼容性、离线能力和真机体验仍在持续完善
- 不再维护 Windows、macOS、Linux 或 Electron 桌面版本

## 核心功能

- 登录哔哩哔哩账号并读取收藏夹、稍后再看、历史记录和关注动态
- 播放视频音轨与音频区内容，支持播放队列、后台播放和进度记忆
- Android 原生播放桥接，支持通知栏控制、蓝牙控制和音频焦点
- 音质偏好、弱网降级、省流模式和网络恢复
- 歌词搜索、歌词预览、偏移和字号调整
- Android 原生下载；下载记录和本地文件管理仍在完善
- 浅色、深色主题和移动端显示密度设置

## 下载与安装

稳定构建通过 [GitHub Releases](https://github.com/TYWIM/biu-app/releases/latest) 发布。

1. 在 Android 手机上下载最新的 `.apk`。
2. 按系统提示允许安装来自当前来源的应用。
3. 首次启动后按需登录哔哩哔哩账号。

部分音质和内容需要登录或对应的账号权限。请遵守哔哩哔哩用户协议、社区规则和相关法律法规。

## 本地开发

### 环境

- Node.js `22.17.1`
- pnpm `10.24.0`
- Android Studio 与可用的 Android SDK
- JDK 17 或 Android Studio 当前推荐版本

### Web 预览

```bash
pnpm install
pnpm dev
```

默认地址为 `http://localhost:5678`。Web 页面只用于开发预览，原生播放、Cookie、下载和部分网络行为必须在 Android 真机或模拟器验证。

### Android 调试

```bash
pnpm android:sync
pnpm android:open
```

也可以直接构建并运行：

```bash
pnpm android:run
```

### 质量检查

```bash
pnpm typecheck
pnpm test
pnpm lint
pnpm build
```

## 项目结构

```text
android/       Capacitor Android 工程与原生插件
shared/        Web 与原生共用类型、设置和存储约定
src/common/    平台适配、播放、下载和通用工具
src/components/ 通用移动端组件
src/layout/    移动应用壳层、导航和登录
src/pages/     业务页面
src/service/   哔哩哔哩接口封装
src/store/     Zustand 状态
tests/         Vitest 单元测试
```

## 贡献

1. Fork 仓库并创建功能或修复分支。
2. 保持改动面向 Android 手机端，不新增桌面专用路径。
3. 运行类型检查、测试、构建，并在 Android 真机或模拟器验证核心流程。
4. 提交 PR，说明改动范围、验证方式和必要的移动端截图。

## 许可证

本项目使用 [PolyForm Noncommercial License 1.0.0](LICENSE)，禁止任何商业用途。

## 法律声明

- 本项目仅供学习与研究使用，不得用于销售、收费服务、广告变现或其他商业活动。
- 数据来自用户主动调用的公开接口和个人账号授权，相关名称与商标归权利人所有。
- 禁止绕过登录、会员、DRM 或加密措施，禁止批量爬取或其他违反平台规则的行为。
- 如涉及权利或合规问题，请通过 GitHub Issues 联系维护者。

## 鸣谢

- [SocialSisterYi/bilibili-API-collect](https://github.com/SocialSisterYi/bilibili-API-collect) 提供的哔哩哔哩 API 资料整理
- 所有参与测试、反馈和贡献代码的社区成员

## Contributors

<a href="https://github.com/TYWIM/biu-app/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=TYWIM/biu-app" alt="Contributors" />
</a>
