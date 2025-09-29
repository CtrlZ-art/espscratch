# Blockly ESP32 Studio

该项目提供一个在线 Blockly 可视化编程环境，支持生成 Arduino C++ 代码并通过 `arduino-cli` 将程序烧录到共享的 ESP32 开发板。系统支持多用户并发、实时日志反馈以及摄像头远程查看运行效果。

## 功能概览

- 📦 **Blockly 积木编程**：内置数字 IO、WiFi、蓝牙等 ESP32 专用积木，支持拖拽拼接程序。
- 🧠 **代码生成**：客户端基于自定义 Arduino 代码生成器实时输出 C++ 草稿。
- 🔌 **资源调度**：后端通过 `BoardManager` 管理开发板资源，实现自动分配与锁定。
- 🔁 **编译烧录**：`FlashService` 调用 `arduino-cli compile/upload` 完成编译与烧录，日志通过 SSE 实时推送。
- 📹 **远程监控**：烧录成功后自动打开对应摄像头流地址，支持远程观察运行状态。
- 💾 **项目管理**：支持将积木 XML 和生成代码保存到本地 JSON 存储并再次载入。

## 快速开始

### 1. 安装依赖

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

确保主机已安装 `arduino-cli` 且配置好所需的 ESP32 平台与串口权限。

### 2. 启动后端

```bash
uvicorn app.main:app --app-dir backend --reload --port 8000
```

默认会自动挂载前端页面，可直接访问 [http://localhost:8000](http://localhost:8000) 打开 Blockly 编辑器。

### 3. 配置开发板

在 `backend/app/main.py` 中定义了默认的两块 ESP32 开发板：

```python
Board(
    identifier="esp32_devkit_v1",
    name="ESP32 DevKit V1",
    fqbn="esp32:esp32:esp32",
    port="/dev/ttyUSB0",
    camera_url="http://localhost:8001/stream",
)
```

根据实际环境修改串口、FQBN 与摄像头地址即可。`BoardManager` 会保证同一时间只有一个任务使用同一开发板。

### 4. 运行流程

1. 打开页面后从侧边栏选择开发板。
2. 拖拽积木搭建程序，点击“生成代码”可下载 Arduino 草稿。
3. 点击“烧录”开始编译上传，日志会在底部控制台实时刷新。
4. 当烧录成功时，页面会自动展示摄像头预览，方便观察设备状态。

### 5. 扩展建议

- **积木扩展**：可在 `frontends/blockly/js/custom_blocks.js` 中添加更多传感器或通信积木，并在 `arduino_generator.js` 中实现对应代码生成逻辑。
- **OTA 支持**：在 `flash_service.py` 中新增 OTA 部署命令即可支持远程升级。
- **权限管理**：可在 FastAPI 中接入用户体系，对 `/api/flash` 等接口进行鉴权。
- **PlatformIO**：若偏好 PlatformIO，可在 `FlashService` 中替换为 `pio run -t upload` 命令。

## API 速览

| 路径 | 方法 | 描述 |
| ---- | ---- | ---- |
| `/api/boards` | GET | 获取可用 ESP32 开发板列表 |
| `/api/flash` | POST | 提交代码编译烧录任务 |
| `/api/stream/{job_id}` | GET | SSE 推送日志与状态 |
| `/api/jobs/{job_id}` | GET | 查询任务状态与历史日志 |
| `/api/projects` | GET/POST | 列出或保存 Blockly 项目 |
| `/api/projects/{id}` | GET | 读取指定项目 |

## 目录结构

```
backend/
  app/
    board_manager.py   # 开发板资源池
    flash_service.py   # 调用 arduino-cli 的核心逻辑
    job_manager.py     # 任务与 SSE 队列
    main.py            # FastAPI 入口，挂载静态页面
    schema.py          # Pydantic 模型
    storage.py         # Blockly 项目存储
frontends/
  blockly/
    index.html
    css/style.css
    js/
      app.js
      arduino_generator.js
      custom_blocks.js
```

## 摄像头集成

摄像头链接通过 `Board.camera_url` 配置，烧录成功后前端会将 `<iframe>` 指向该地址。可以对接 RTSP 网关、ESP32-CAM 自带的 HTTP 视频流等服务。

## 许可证

本项目示例未附带具体许可证，请根据实际需求补充。
