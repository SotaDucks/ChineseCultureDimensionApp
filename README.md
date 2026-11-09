# Vespa × 中国文化元素 · 共创评分网站

纯前端静态网站（Vite + 原生 JS，五边形为手写 SVG）。

## 运行

```bash
npm install
npm run dev        # 本机 http://localhost:5173 ，同一局域网的手机/电脑也能访问
npm run build      # 输出 dist/，可部署到任意静态托管（GitHub Pages / Netlify / OSS…）
npm run preview    # 本地预览 dist/
```

> `dist/` 需要通过 http 打开（双击 `index.html` 走 file:// 时浏览器会拦截模块脚本）。

## 操作

| 操作 | 方式 |
|---|---|
| 切换元素 | ← / → 方向键，或屏幕两侧箭头；窄屏可左右滑动 |
| 切换维度 | Tab / Shift+Tab，或 ↑ / ↓；也可以点维度名称 |
| 打分 | 拖动轴上的控制点（吸附 1–5），点击刻度，或按数字键 1–5 |
| 清除当前维度 | 0 / Backspace，或把控制点拖回中心 |
| 总览页 | O 或 Esc |
| 全屏 | F |

## 文件

- `src/data/elements.json` — 预置元素数据（改这里增删预置元素）
- `src/config.js` — 维度、大类、标签、点缀色（`ACCENT_DEFAULT`）
- `public/images/` — 元素图片（来源见每个元素的 `imageSource` 字段，均来自 Wikimedia Commons）
- 点缀色也可以临时用 URL 参数覆盖：`?accent=2bb3a3`

## Supabase 共享编辑

在目标 Supabase 项目中，通过 SQL Editor 执行 [数据库迁移](supabase/migrations/20261109000000_shared_elements.sql) 一次。仓库中的 `.env` 包含工作坊项目的公开配置。若要换项目，可以在本地的 `.env.local` 或部署平台的构建环境中覆盖：

- `VITE_SUPABASE_URL`，Supabase 的 Project URL。
- `VITE_SUPABASE_PUBLISHABLE_KEY`，项目的 Publishable key，也可使用旧版公开的 anon key。

配置完成后重新构建并部署网站。所有访客都可以直接新增、编辑、打分和保存备注。保存由数据库确认，其他访客刷新后即可读到更新。上传的压缩图片随元素一同保存。共享模式关闭删除和全站重置，支持通过「数据」导入原有 JSON，导入会按 ID 更新共享记录。启用共享前保留在浏览器里的记录可先导出，确认需要发布的内容后再导入。

## 同学上传更多文化元素（两项 Supabase 配置均为空时）

1. 同学在网页点「＋ 新增」，填写名称、上传图片（自动压缩）并保存，数据存在自己浏览器里。
2. 「数据」→「提交我新增的元素」，下载一个小 JSON（只含自己新增的元素和图片），发给老师（微信 / 邮件 / 网盘均可）。
3. 老师在「数据」里**多选导入**所有同学的文件，再「导出 JSON」。
4. 把导出的文件保存为 `public/data/shared.json`，`npm run build` 重新部署。之后所有人打开网页都会自动看到大家新增的元素。

新增元素的 id 带随机后缀，不同同学添加同名元素不会互相覆盖。
