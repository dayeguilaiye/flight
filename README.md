# flight

一个用于承载个人实验、工具和小型网页的玩具站点。

## 技术栈

- 前端：pnpm、React、TypeScript、Vite、Tailwind CSS
- 后端：Go 标准库优先
- 发布：前端构建到静态文件，再由 Go `embed` 编译进单个二进制

## 架构约定

项目按“功能纵向切片”组织。薪酬计算器、数据分析、转盘模拟器等功能互相隔离；每个功能可以只有前端，也可以拥有自己的 Go API、业务逻辑和持久化适配器。只有跨至少两个功能、且语义稳定的代码才能进入 shared/platform 层。

完整的目录、接口边界、构建流程和编码规范见 [docs/architecture.md](docs/architecture.md)。AI 开发时使用的可执行规范位于 [.trellis/spec/](.trellis/spec/)。

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

生产构建应使用仓库提供的统一脚本（待前端和 Go 基础骨架落地后实现），确保前端产物先生成，再执行 `go build`。
