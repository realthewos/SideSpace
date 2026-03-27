# SideSpace

将 Arc 浏览器的垂直标签栏和 Space 空间管理带到 Chrome。

SideSpace 是一个 Chrome 扩展（Manifest V3），通过侧边栏提供垂直标签管理和 Space 空间组织功能，让你在 Chrome 中也能享受类似 Arc 浏览器的高效浏览体验。

## 功能特性

- **Space 空间管理** - 创建多个工作空间，按场景分类浏览会话（工作、学习、娱乐等）
- **垂直标签栏** - 通过 Chrome Side Panel 实现侧边栏式标签管理
- **文件夹层级** - 在 Space 内用嵌套文件夹组织标签页
- **拖拽排序** - 支持拖放操作，自由调整标签和文件夹的顺序
- **分屏视图** - 在同一窗口内并排查看两个标签页
- **快速搜索** - 按标题或 URL 过滤当前空间内的标签页
- **数据导入/导出** - 支持从 Arc 浏览器或 Chrome 书签导入数据，可将空间导出为 JSON
- **快捷键支持** - `Cmd/Ctrl+F` 搜索、`Cmd/Ctrl+N` 新建空间、`Cmd/Ctrl+E` 导出

## 安装

### 前置要求

- Node.js 18+
- npm

### 构建与加载

```bash
# 安装依赖
npm install

# 构建
npm run build

# 开发模式（监听文件变化自动重新构建）
npm run dev
```

构建完成后，在 Chrome 中加载扩展：

1. 打开 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择项目的 `dist` 目录

## 项目结构

```
src/
├── background/          # Service Worker
│   ├── index.ts             # 入口
│   ├── tabManager.ts        # 标签生命周期管理
│   ├── storageManager.ts    # 存储操作封装
│   ├── messageHandler.ts    # 消息通信
│   ├── arcImporter.ts       # Arc 数据导入
│   └── splitViewManager.ts  # 分屏视图
├── sidepanel/           # 侧边栏 UI
│   ├── App.tsx              # 主组件
│   ├── store.ts             # Zustand 状态管理
│   └── components/          # UI 组件
├── splitpanel/          # 分屏视图 UI
└── shared/              # 共享代码
    ├── types/               # TypeScript 类型定义
    └── utils/               # 工具函数
```

## 技术栈

- **React 18** + TypeScript
- **Zustand** - 状态管理
- **React DnD** - 拖拽交互
- **Webpack 5** - 构建打包
- **Chrome Extension Manifest V3** - 侧边栏、标签、存储等 API

## 开发

```bash
# 开发模式
npm run dev

# 清理构建产物
npm run clean
```

开发时修改代码后需要在 `chrome://extensions/` 页面点击刷新按钮以加载最新构建。

## 权限说明

| 权限 | 用途 |
|------|------|
| `tabs` | 访问和管理浏览器标签页 |
| `storage` | 存储空间、文件夹、标签数据 |
| `sidePanel` | 显示侧边栏 |
| `bookmarks` | 导入 Chrome 书签 |
| `system.display` | 获取屏幕信息 |
| `scripting` | 注入分屏视图 |
| `tabGroups` | 标签组集成 |

## License

MIT
