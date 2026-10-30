# flight

一个展示自学练习与交互作品的个人网站，收集编程、乐理等学习过程中的实践。

首页展示 GORM 与 sqlc 对照实验和听见乐理。GORM 与 sqlc 页面提供改列名、零值更新、软删除、关联加载和动态筛选五个浏览器交互示例，支持中文和英文。

## 技术栈

- 前端：pnpm、React、TypeScript、Vite、Tailwind CSS
- 后端：Go 标准库优先
- 发布：前端构建到静态文件，再由 Go `embed` 编译进单个二进制

## 架构约定

项目按“功能纵向切片”组织。薪酬计算器、数据分析、转盘模拟器等功能互相隔离；每个功能可以只有前端，也可以拥有自己的 Go API、业务逻辑和持久化适配器。只有跨至少两个功能、且语义稳定的代码才能进入 shared/platform 层。

完整的产品事实见 [PRODUCT.md](PRODUCT.md)，目录、接口边界和构建流程见 [docs/architecture.md](docs/architecture.md)，AI 开发时使用的可执行规范位于 [.trellis/spec/](.trellis/spec/)。前端视觉基线见 [.trellis/spec/frontend/visual-design.md](.trellis/spec/frontend/visual-design.md)，页面模式见 [.trellis/spec/frontend/surface-modes.md](.trellis/spec/frontend/surface-modes.md)。

## 本地开发

推荐先启动前端开发服务器，再按需启动 Go API：

```bash
pnpm --dir frontend install
pnpm --dir frontend dev
go run ./cmd/flight
```

运行时写入内容统一放在 `FLIGHT_DATA_DIR` 指定的目录中，默认是项目根目录下的 `data/`：

```text
data/
├── flight.sqlite3
├── uploads/
└── exports/
```

容器部署时将 `FLIGHT_DATA_DIR` 设置为挂载卷路径（例如 `/var/lib/flight`），不需要为 SQLite 文件和其他持久化内容分别挂载卷。

Production builds use `bash scripts/build.sh`, which builds the frontend and embeds it in `build/flight`.

## Deployment

The production site is served at <https://www.hitnrun.cn>. GitHub Actions tests changes on pull requests, then builds and deploys an immutable container image when application or deployment changes reach `main`.

See [Deployment and recovery](docs/deployment.md) for server bootstrap, the first GHCR publication, runtime credentials, daily backups and rollback.
