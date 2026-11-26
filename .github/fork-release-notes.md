### 本 Fork 的定制内容

- **包名**：保持官方正式包名 `com.cherryai.cherrystudio_app`，可直接覆盖安装（不会装成第二个 App）。
- **SSH 全免审批**：6 个内置 SSH 工具（`ssh_execute`、`ssh_list_files`、`ssh_read_file`、`ssh_write_file`、`ssh_download_file`、`ssh_upload_file`）默认自动批准，不再逐次弹审批。
- **Agent 默认 SSH**：在 Agent 编辑页可为 standard 模式 Agent 指定默认 SSH。打开、切回或发送该 Agent 的对话时会**静默自动连接**——不插入 `@SSH` 提及、不弹「是否恢复连接」确认框；在对话内手动切换到别的 SSH 仍然优先。
- **Agent 默认文件夹**：同一页可指定默认文件夹。新建会话会自动使用该文件夹（输入框菜单直接显示文件夹名），创建出的会话直接绑定，无需每次手动选择；对话内手动改选仍然优先。
- **绑定自清理**：删除 Agent 或对应的 SSH / 文件夹不存在时，绑定自动失效，不残留、不报错。
- **关闭 OTA 与遥测**：禁用 Expo OTA 热更新，关闭 Sentry / Observe / Insights 上报，避免自编译版本被云端覆盖。
- **构建方式**：GitHub Actions `ubuntu-latest`，仅编译 `arm64-v8a`，使用公开 AOSP `testkey` 签名。
