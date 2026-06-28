# loren-tools

本项目是一个本地运行的工具集合，当前包含“时间戳转换”工具。

## 技术栈

- 前端：React + TypeScript + Vite
- 后端：Node.js + Express
- 时区转换：Node.js / 浏览器原生 `Intl`，使用 IANA 时区名

## 功能

- 指定原时区、目标时区
- 时间戳输入单位支持秒和毫秒
- 时区下拉保留常用选项：UTC、上海、悉尼、东京、洛杉矶、伦敦、柏林
- 输出格式固定为 `yyyy-MM-dd HH:mm:ss`
- 支持点击“转换”或在时间戳输入框按 Enter 触发转换

## 本地开发

```bash
npm install
npm run dev
```

开发模式：

- 前端地址：`http://本机IP:5173`
- 后端地址：`http://本机IP:3000`
- 前端会通过 Vite proxy 请求 `/api`

## 普通启动

```bash
npm run build
npm start
```

启动后访问：

```text
http://本机IP:3000
```

## 本地域名启动

如果希望通过下面地址访问：

```text
http://www.lorentools.com
```

先用“管理员 PowerShell”执行一次：

```powershell
cd C:\Users\101780\sigen-code\loren-tools
npm run setup:domain
```

然后启动 HTTP 默认 80 端口服务：

```powershell
npm run start:http
```

关闭：

```powershell
npm run stop:http
```

说明：

- `hosts` 只能配置域名到 IP，不能配置端口。
- 不写端口时，`http://...` 默认访问 80 端口。
- `www.lorentools.com` 会被本机 `hosts` 映射到 `127.0.0.1`，只在当前电脑生效。

## 目录结构

```text
server/        后端 API 和静态文件托管
src/           前端页面和样式
scripts/       本地域名、80 端口启动和关闭脚本
dist/          前端构建产物
dist-server/   后端 TypeScript 构建产物
```
