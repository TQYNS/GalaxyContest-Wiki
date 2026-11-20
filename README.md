# GalaxyContest-Wiki

《缺氧》**逐鹿星河** Mod 中文图鉴与介绍页。

在线访问：**https://tqyns.github.io/GalaxyContest-Wiki/**

## 内容

- 食物、饮品、Buff、怪物、战斗装备、道具
- 星图探索、星图贸易、事件、叙事者
- 成就、内容词条
- 版本更新日志
- 全站搜索、主题切换、移动端适配

## 更新内容

版本日志数据位于 `update/updates.json`。

- `detail` 使用 Markdown 字符串数组，一行一个元素。
- 新增记录时填写 `id`、`name`、`summary`、`detail`、`date`、`tag`。
- 推送后 GitHub Pages 会自动重新发布，通常 1 分钟内生效。

## GitHub Pages

本仓库根目录就是站点根目录，Pages 从 `main` 分支根目录发布。

```text
分支：main
目录：/ (root)
```

日常更新只需：

```bash
git add -A
git commit -m "更新内容"
git push origin main
```

推送完成后，GitHub Actions / Pages 会自动构建。可在仓库 **Settings → Pages** 查看发布状态。

## 目录

```text
index.html          主页
pages/              各图鉴与更新页
assets/             样式、脚本、数据
data/               图鉴资源
update/updates.json 版本更新日志
```
