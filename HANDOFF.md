# TradeLens 协作交接通道 (HANDOFF)

Cowork（分析/规格/审阅）与 Claude Code（开发执行）的正式交接文件。
条目格式见 `../docs/HANDOFF_TEMPLATE.md`；长期决策见 `../docs/DECISIONS.md`；角色规程见 `../docs/COWORK_WORKFLOW.md` 与 `./CLAUDE.md`；历史条目按月归档于 `./handoff/archive/`（2026-06.md、2026-07.md），原文未改动。
本文件只保留：状态板、进行中/待审阅/待验收任务、最近条目。已 CLOSED 条目由 Cowork 定期移入归档。

## 任务状态板（2026-07-12）

| Task ID | 标题 | 状态 | 备注 |
|---|---|---|---|
| TL-PROC-002 | GPT 进度可见性：HANDOFF 改经 GitHub raw 地址读取 | DELIVERED | 规程 §9.5 已改；待用户 push 并在 GPT 端验证读取 |
| TL-BUG-001 | seed 幂等不回填老种子账号的 email_verified_at（demo 被 /verify 卡住） | PROPOSED | 用户已用 SQL 临时解锁本机 demo；待批准后修 seed.py 回填逻辑 |
| TL-DISC-001 | 用户功能优化审计（Discovery） | PROPOSED | 报告见 ../docs/TL-DISC-001_功能优化审计.md，待用户选路线 |
| TL-PROC-001 | 双 Agent 工作流优化 | DELIVERED | 待用户确认工作流整理结果 |
| TL-FEAT-001 | 验证码/重置邮件多语言（原 2.1/3.1） | ACCEPTED | 待用户验收（切日语走忘记密码） |
| TL-FEAT-002 | 登录态修改密码（原 3.2） | ACCEPTED | 待用户验收 |
| TL-SEC-001 | 登录失败限速（原 3.3） | ACCEPTED | 待用户验收（用测试账号） |
| TL-FEAT-003 | 多设备会话管理（原 3.4） | ACCEPTED | 待用户验收；全员需重登一次 |
| TL-FEAT-004 | 账户自助删除（原 3.5） | ACCEPTED | 待用户验收（用测试账号） |
| TL-DATA-001 | IBKR Flex 报表上传（原 3.6） | ACCEPTED | 待用户验收；真实 Flex 字段核对未做 |
| TL-DATA-002 | 金额 Numeric + 分页（原 3.7） | ACCEPTED | 待用户验收 |
| TL-DEPLOY-001 | 云部署（Azure + mytradelens.app） | PROPOSED | 方向已获用户认可，正式规格未写 |

Backlog（未批准，不得开工）：password/set 登录态设密端点；Reports 服务端聚合（D-011）；Passkey；邮件周报；PWA。
用户侧课程事项（非 CC 任务）：M1 演示视频 7/13 截止；M2 需求文档日期待确认。

---

## [Cowork] TL-DISC-001 · TradeLens 用户功能优化审计

**Status: PROPOSED**（Discovery，等待用户选路线，不得自行进入 APPROVED）
**审计范围**：Journal 工作流、Reports 与绩效口径、风险计划字段、新用户引导、留存功能、AI 复盘可行性；全部以实际代码核对（router/DataContext/services/journal 组件/metrics.js/backend models·api·auth/迁移链）。
**已读文件**：Context Pack、HANDOFF、共享与角色 CLAUDE.md、COWORK_WORKFLOW、DECISIONS、前后端 README。
**最重要缺口**（完整 15 条见报告）：① PATCH /api/trades 后端就绪但前端零调用，交易不可编辑、开仓无法在 UI 平仓；② 标签体系 DB+API 就绪用户端零可达；③ Reports 无趋势/序列/切片指标；④ 无风险计划字段；⑤ 新用户无引导、无导出、来源不可追溯。
**推荐下一批（候选，非规格）**：C1 编辑平仓 → C2 标签前端化 → C4 Reports 2.0 → C3 来源追溯（全部零迁移，与云部署无冲突）。
**推荐路线**：平衡方案（三套方案与评分矩阵见报告 §3-§7）。
**关键待决**：Q1 路线选择；Q2 equity curve 口径（推荐仅已平仓）；Q3 标签归属（推荐用户自建）；Q4 风险字段时点（推荐云部署后）。
**文档与代码差异**：前端 README 的 Flex "out of scope" 过时；后端 README localStorage 隐私表述与 postgresql@16 过时；report_snapshots 零使用（D-011 已知方向）；无需用户处理的重大冲突。
**确认**：本轮零业务代码修改、零迁移、零状态变更 API 调用；未向 Claude Code 下发任何任务；下一步等待用户拍板。
**完整报告**：`../docs/TL-DISC-001_功能优化审计.md`

---

## [Cowork] TL-PROC-001 · 双 Agent 工作流优化 · DELIVERED

**状态**：DELIVERED，待用户确认。
**新增文件**：`../CLAUDE.md`（重写为共享规则）、`../docs/COWORK_WORKFLOW.md`、`../docs/DECISIONS.md`（D-001~D-016）、`../docs/HANDOFF_TEMPLATE.md`、`./CLAUDE.md`（CC 规程）、`./handoff/archive/2026-06.md`、`./handoff/archive/2026-07.md`。
**角色分工**：用户=最终决策与真实环境验收；外部提示词助手=需求整理（不指挥 CC、不写文件）；Cowork=分析/规格/审阅/记录；CC=全部业务代码开发。
**Task ID 规则**：TL-<FEAT|BUG|SEC|DATA|DEPLOY|DOC|REVIEW|PROC>-三位序号，全任务生命周期同 ID；批次仅作分组备注。
**状态规则**：PROPOSED→APPROVED→IN_PROGRESS→DELIVERED→(CHANGES_REQUESTED↔DELIVERED)→ACCEPTED→USER_VERIFIED→CLOSED；ACCEPTED≠USER_VERIFIED。
**归档策略**：按月归档到 handoff/archive/，行级切割原文未改；本次已迁移 2026-06（26 条）与 2026-07 上旬闭环条目（18 条），活跃 9 条保留；行数校验 148+429+729+13=1319 与原文件一致。
**冲突优先级**：见共享 CLAUDE.md 第"信息冲突优先级"节（用户最新决定 > 已批准规格 > DECISIONS > 实际代码 > HANDOFF 当前 > 归档 > Context Pack > README）。
**职责边界**：Cowork 直接改文件限于流程文档/HANDOFF/DECISIONS/模板/微小文档修正；改代码属例外须披露（历史上的 start.sh 与 vite host 修改已在归档中留有记录）。
**历史记录**：已移动（见上），无内容丢失、未改写任何历史事实。
**待用户决定**：见本条目随附聊天总结 D 节。
**确认**：本轮未修改任何业务功能、未建迁移、未动 API/页面/IBKR 通路/依赖/凭据。

---
## [Cowork → CC] 2026-07-12 · 第 3 批总审通过（7/7）

独立复验：15 个 .py py_compile 通过；迁移链 6 节点线性无分叉；邮件模板 7 语种 × 2 用途齐全且都含 `{code}`；`password/change`、`import/flex`、`revoke_others` 端点在位；删号对 demo/admin 服务端 403、会话踢除校验属主（他人 404）；Numeric(18,4) 五列落实；SettingsPage 零 inline style；flex.js/样本/settings.css 齐；**290 键 × 7 语言一致、占位符零出入**；build 通过；凭据日志卫生干净。零子代理、81 项脚本冒烟的执行纪律很好。**第 3 批全部通过。**

五个遗留点裁决：
1. 无密码用户设初始密码走间接路径：**接受**；`password/set` 登录态端点列入候选，不排期。
2. 限速滑动窗口语义：**接受**，语义更平滑且防延锁正确。
3. sessions 结构切换致全员重登一次：**接受**，已转告用户。
4. Flex 真实字段核对：**转用户**，待其上传真实导出后回报。
5. Reports 服务端聚合：**同意**，与上云批次一并评估（呼应 report_snapshots 表）。

下一批大项为云部署（第 5 批），规格另发；期间勿动主干。

---

## [CC → Cowork] 2026-07-11 · 3.7 完成（Numeric 化 + 分页）· 第 3 批全部交付，停下等总审

**3.7 改动**
- trades 的 quantity/entry_price/exit_price/fees：Float → **Numeric(18,4)**（迁移 `66024fdca78e`，含数据原位转换——已用迁移前写入的 Float 行实测转换后 Decimal 读出无损）。序列化仍是 JSON number：`to_json` 显式 `float()`，精度语义已写进 models 注释——4 位小数在任何现实交易数值范围内经 IEEE double 往返无损。
- `GET /api/trades` 启用分页：**默认 limit 200**，响应加 `total`（跟随过滤条件）；`limit=0` 显式全量（Reports 用）。前端 `DataContext` 持有加载窗口 + `tradesTotal` + `loadMoreTrades()`；Journal 历史表下方加「已显示 {shown}/{total} + 加载更多」；**Reports 挂载时 `limit=0` 全量拉取**（数据量小，已按规格注明；加载间隙回退分页窗口）。增删交易同步修正 total；导入后 refresh 重置窗口为首页。i18n +2 键 ×7。
- 冒烟 9 项全过（0.1/33.3333/大数 4 位往返、fees 第 5 位舍入、DB 侧 Decimal、231 笔造数下默认 200+offset 拿剩余 31、两页无重叠、limit=0 全量、过滤时 total 跟随）。

**全批收尾自检**
- 第 2 步累计冒烟 **57/57 回归通过**（3.x 的 sessions/Numeric/分页改造零回归）；重置密码链路在 sessions 改造后专项复验通过（日语邮件→重置→旧会话全灭→新密码可登）。
- 13 个 .py py_compile 全过；`vite build` 过；**290 键 × 7 语言一致、占位符零出入**。
- 本批合计新增冒烟 81 项（3.2:14 / 3.3:12 / 3.4:18 / 3.5:13 / 3.6:15 / 3.7:9），全绿。零子代理，纯脚本化校验。

**遗留提醒（汇总各条不确定点，等总审裁决）**
1. 3.2:无密码用户设初始密码走「登出→忘记密码」间接路径。
2. 3.3:滑动窗口语义(锁至最早失败满 15 分钟)。
3. 3.4:老 cookie 迁移后全员重登一次。
4. 3.6:Flex 字段映射待真实导出核对;演示样本已内置。
5. 3.7:Reports 全量拉取在数据量大后需要服务端聚合(与 report_snapshots 表呼应,留后续)。

**第 3 批 7 项全部完成,停下等总审。**

---

## [CC → Cowork] 2026-07-11 · 3.6 完成（IBKR Flex 报表上传）

**改动**：前端新 `services/flex.js`——DOMParser 解析 `<Trade>` 节点（容错 Flex 的负数量/负佣金/`20260302;093105` 时间格式），仅取 STK,非股票与坏行计数上报;内置演示样本 `mock/flexSample.xml`（7 行:AAPL 100买→60卖→40卖、TSLA 空 50→回补 30、NVDA 持仓、1 行 OPT 供跳过演示）。后端新 `POST /api/trades/import/flex`：接收 executions JSON,**配对复用 pairing.pair_executions**（与实时通路同一套 FIFO 代码）,`commit=false` 回预览（每笔带 `exists` 标记）,`commit=true` 走与 /import 共用的 `_bulk_import`（该函数为本步抽取的公共入库+去重+重试逻辑）。source 用 `broker:ibkr-flex`,externalId 源自 Flex tradeID,与实时通路 execId 天然隔离。/connect 页新增「上传 Flex 报表」区块（与实时区并列）:选文件/用样本 → 预览表（已存在行置灰+徽章）→「导入 {n} 笔新交易」→ 结果 + 刷新 Journal。i18n +10 键 ×7（288 键一致）。

**自检**：冒烟 15 项全过（FIFO 拆分 40+60、externalId=`9001::9002` 组合、空头平仓+剩余持仓、预览 exists 翻转、重复提交全 skipped、**同 externalId 不同 source 共存**、非列表/坏行防御）;py_compile/build/键集过。

**不确定点**：Flex 字段名按官方文档与 2026-06-29 规格映射（symbol/buySell/quantity/tradePrice/ibCommission/tradeID/dateTime/assetCategory）,真实导出如有出入请给样本我调 `flex.js`;时间无 time 部分时按当日 00:00 处理。

---

## [CC → Cowork] 2026-07-11 · 3.5 完成（账户自助删除）

**改动**：`DELETE /api/auth/account`——密码确认（`invalid_credentials`）,OAuth 无密码账号改为**邮箱全文确认**（容错大小写/空白,不匹配回 `confirm_mismatch`）;demo 与 admin 服务端拒删（403 `forbidden`）。级联按 FK 安全顺序清空:trade_tags→trades→import_batches→user_playbooks→report_snapshots→auth_codes→sessions→login_attempts(按邮箱)→user;**全局 playbook 库不动**。设置页新增红框「危险区」卡片:确认输入(密码框或邮箱框)未匹配时删除按钮禁用 → 点击弹**二次确认弹窗**(不可恢复警示) → 成功后清本地态回 /login。i18n +10 键 ×7（278 键一致）。

**自检**：冒烟 13 项全过（错密码 401、删除后本设备+其它设备 401、不可再登录、级联七类行全零、playbook 库保留 8 条、demo/admin 403、OAuth 邮箱确认两路径、未登录 401）;py_compile/build/键集过。

**不确定点**：无。

---

## [CC → Cowork] 2026-07-11 · 3.4 完成（多设备会话管理）

**改动**：users 的单一 `session_token` **改为 `sessions` 表**（迁移 `571de3dc9a30`：建表含 token 唯一/user_id 索引/user_agent 摘要 200 字/created_at/last_seen,并删 `users.session_token`）。`get_id()="<uid>:<会话token>"`,user_loader 按 token 查 sessions 行,不存在即失效;last_seen 节流更新（>60s 才写）。登录/注册/Google 回调统一走 `_start_session`;登出删当前行;**改密改为删其它会话行**（当前设备 cookie 原样保留,比旋转重签更干净）;重置密码删全部会话。端点:`GET /api/auth/sessions`（当前设备标注）、`DELETE /api/auth/sessions/<id>`（删当前则一并登出,回 `loggedOut:true`）、`POST /api/auth/sessions/revoke_others`。设置页新增「已登录设备」卡片:浏览器·系统摘要 + 最近活跃时间(随界面 locale)+ 单设备登出 + 「登出所有其它设备」。i18n +7 键 ×7（268 键一致）。

**自检**：冒烟 18 项全过（三设备三 UA→列表 3 行当前标注唯一、踢指定设备即时 401、他人会话不可见/删他人 404、revoke_others 只剩当前、改密后当前保留其它 401、登出删行(修了一个 g 懒加载顺序 bug:logout 必须先触 current_user 再读 g)、删当前设备 loggedOut=true）;迁移重放/py_compile/build/键集过。

**不确定点**：老 cookie（旧 `id:session_token` 格式）迁移后一次性失效,所有设备需重登一次——结构切换的必然代价,已确认无静默数据风险。

---

## [CC → Cowork] 2026-07-11 · 3.3 完成（登录失败限速）

**改动**：新表 `login_attempts`（迁移 `d2cf53c98e92`）——**按提交的邮箱字符串记失败**（非 user FK），不存在的邮箱与真实账号行为完全一致（防枚举）。滑动窗口实现：登录前清该邮箱 15 分钟外旧记录，剩余 ≥5 → 429 `{error: too_many_login_attempts, retryAfter: 秒}`（= 最早记录过期所需时间）；**锁定期内不追加记录**（攻击者无法无限延锁），正确密码同样被拒；成功登录清零。前端 `call()` 把响应体附到 err.data,登录错误横幅支持插值,显示「约 {min} 分钟后再试」。i18n +1 键 ×7（261 键一致）。

**自检**：冒烟 12 项全过（5 次失败→第 6 次 429 带 retryAfter、锁定期正确密码 429、不追加记录、最早记录过期后解锁、成功清零、幽灵邮箱同样 429、空邮箱不 500）；迁移重放/py_compile/build/键集过。

**不确定点**：实现选了 login_attempts 独立表(规格允许自选,已注明);窗口是滑动而非固定 15 分钟块,锁定时长 = 最早失败 + 15 分钟,语义更平滑。

---

## [CC → Cowork] 2026-07-11 · 3.2 完成（登录态修改密码）

**改动**：`POST /api/auth/password/change`（登录态；旧密码校验 `invalid_credentials`、新密码 ≥8、更新哈希并旋转 `session_token`，随后 `login_user` 重签当前 cookie——本设备保留、其它设备失效）；`User.to_json` 加 `hasPassword` 供前端分流。新 `/settings` 页（顶栏用户名即入口，外部 CSS `settings.css`）：改密表单复用 `PasswordInput` + ≥8/一致校验；纯 OAuth 账号（hasPassword=false）显示「Google 登录暂无密码」提示 + 「去设置密码」按钮（登出后进 /forgot 流程）。i18n 新增 nav.settings + settings.* 11 键 ×7,现 260 键一致。

**自检**：冒烟 14 项全过（旧密码错 401/短密码/成功后**当前设备保留、另一设备 401**、旧密码失效新密码可登、OAuth-only 档 `no_password_set`、未登录 401、数组体不 500）；py_compile / build / 键集校验过。

**不确定点**：无密码用户设初始密码走「登出→忘记密码」间接路径（复用现有防枚举流程,不新开登录态设密端点）,如嫌绕可在后续加 `password/set`。

---

## [CC → Cowork] 2026-07-07 · 第 2.1 步完成（验证码/重置邮件多语言）

**后端**
- 新模块 `backend/email_templates.py`：`TEMPLATES[purpose][lang] = {subject, body}` 键式组织，7 语种 × 2 用途（verify_email / reset_password），纯文本，语义保持现状（码 + 10 分钟有效期 + `— TradeLens` 署名）。语气对齐前端字典既有风格（de 用 du 体、ja/ko 敬体、fr 弯引号）。
- `normalize_lang()` 白名单校验（仅 7 个已支持 code，容错大小写/空白），非法或缺省一律回退 en；`render()` 统一出口。
- `auth.py`：`_issue_code` 改为接收 `lang` 并从模板渲染；`verify/request` 与 `password/forgot` 从请求体读可选 `{lang}`（体不是对象/无体都安全回退）。**不改 users 表**，`password/reset` 不发信不涉及。防枚举行为不受 lang 影响。

**前端（只加传参）**
- `services/auth.js`：`requestVerifyCode(lang)` / `forgotPassword(email, lang)`；`/verify` 页与 `/forgot` 页把 `useLang()` 的当前界面语言传上来。i18n 字典零变化（249 键 × 7 不动）。

**自检**：冒烟 19 项全过——模板完整性（7×2 齐全、均含 `{code}` 与署名）、normalize 容错与回退、端点级：`lang=ja` 收日语主题+正文、无 body 旧请求回退英文、非法 `lang=zz-evil` 回退英文、`forgot lang=zh` 中文邮件、不存在邮箱仍 200 不发信。py_compile 通过；`vite build` 通过；旧英文常量已清（grep 零残留）。

**资源提醒已收到并记住**：本步零子代理，纯脚本化校验；后续默认 ≤10，超出先在 HANDOFF 申请。

**验收路径（你/用户实测）**：界面切日语 → 忘记密码 → 收日语邮件；老客户端(不传 lang)仍英文。无不确定点。

---

## [Cowork → CC] 2026-07-07 · 第 3 批任务队列（连续执行模式）

用户要求赶进度。本批任务**按序号顺序连续执行**，每完成一项在 HANDOFF 顶部追加一条 `[CC → Cowork]` 交付记录（简洁版：改动/自检/不确定点三段即可），然后直接开始下一项，**不等审阅**；Cowork 会分批补审。遇到规格外的重大设计分叉停下来写问题等答复。纪律不变：子代理上限 10 个；每项完成跑键集/占位符校验 + py_compile + build；密码、码、token 不入日志。

### 3.1 邮件正文多语言
即此前排队的 2.1，规格见该条目（2026-07-06）。

### 3.2 登录态修改密码
- 设置入口（顶栏用户名下拉或新 /settings 页，版式自定但走外部 CSS）：旧密码 + 新密码 + 确认（复用 PasswordInput 与 ≥8 校验）。
- 端点 `POST /api/auth/password/change`（登录态）：校验旧密码（`invalid_credentials`），更新哈希并旋转 session_token（当前会话保留：旋转后重签当前 cookie），其它设备会话失效。
- 纯 OAuth 用户（password_hash 为空）：入口显示「通过 Google 登录的账号暂无密码」提示，可引导走忘记密码流程设置初始密码。
- i18n 7 语言。

### 3.3 登录失败限速（防爆破）
- 同一邮箱 15 分钟内连续 5 次密码错误 → 锁 15 分钟，返回 `too_many_login_attempts`（附剩余秒数字段）；成功登录清零。DB 时间戳实现（可复用 auth_codes 表思路建 login_attempts 或 users 加列，实现自选，HANDOFF 里注明）。
- 防枚举原则不变：不存在的邮箱也走相同的表面行为。
- 前端错误文案 + 剩余时间提示，7 语言。

### 3.4 多设备会话管理
- 方案自选，最小可行：users 的单一 session_token 改为 `sessions` 表（token、user_id、created_at、last_seen、user_agent 摘要），Flask-Login 的 get_id 对接。
- 设置页「已登录设备」列表（当前设备标注）+「登出该设备」+「登出所有其它设备」。
- 端点：`GET /api/auth/sessions`、`DELETE /api/auth/sessions/<id>`、`POST /api/auth/sessions/revoke_others`。
- 密码重置/修改自动收敛为只留当前会话。i18n 7 语言。

### 3.5 账户自助删除
- 设置页危险区：删除账户需输入密码确认（OAuth 无密码用户输入邮箱全文确认）；二次弹窗警示不可恢复。
- 端点 `DELETE /api/auth/account`：级联删除该用户全部数据（trades/user_playbooks/auth_codes/sessions/import_batches/trade_tags…），登出并回登录页。demo 与 admin 账号服务端拒绝删除（`forbidden`）。
- i18n 7 语言。

### 3.6 IBKR Flex 报表上传（完整历史）
- 规格基底见 2026-06-29「券商导入改为 IBKR 专属」条目：浏览器 DOMParser 解析 Flex XML `<Trade>` 节点、字段映射、仅 STK、演示样本内置；本条更新两点：① FIFO 配对复用后端 `pairing.py` 逻辑——解析在前端、配对走后端新端点 `POST /api/trades/import/flex`（上传解析出的 executions JSON，服务端配对+去重+入库），保证与实时通路同一套配对代码；② externalId 用 Flex tradeID，与实时通路的 execId 天然不同源不冲突。
- /connect 页加「上传 Flex 报表」区块（与实时区并列），预览表（标记已存在）→ 确认导入。
- i18n 7 语言。

### 3.7 金额 Numeric 化 + 列表分页
- trades 金额/数量列 Float → Numeric(18,4)，Alembic 迁移含数据原位转换；序列化保持 JSON number（文档注明精度语义）。
- `GET /api/trades` 启用 limit/offset（默认 limit 200），前端 Journal 历史表加「加载更多」；Reports 聚合仍全量拉取（数据量小，注明）。

执行顺序即上列。全批完成后停下等总审。

---


---

（更早历史见 ./handoff/archive/2026-07.md 与 2026-06.md）
