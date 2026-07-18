# TradeLens 协作交接通道 (HANDOFF)

Cowork（分析/规格/审阅）与 Claude Code（开发执行）的正式交接文件。
条目格式见 `../docs/HANDOFF_TEMPLATE.md`；长期决策见 `../docs/DECISIONS.md`；角色规程见 `../docs/COWORK_WORKFLOW.md` 与 `./CLAUDE.md`；历史条目按月归档于 `./handoff/archive/`（2026-06.md、2026-07.md），原文未改动。
本文件只保留：状态板、进行中/待审阅/待验收任务、最近条目。已 CLOSED 条目由 Cowork 定期移入归档。

## 任务状态板（2026-07-12）

| Task ID | 标题 | 状态 | 备注 |
|---|---|---|---|
| TL-PROC-002 | GPT 进度可见性：本地只读为主 + GitHub raw 备用 | DELIVERED | 规程 §9.5 已二次修订；待用户在 GPT 端验证 |
| TL-BUG-001 | seed 回填种子账号 email_verified_at | CLOSED | ACCEPTED，无用户验收面 |
| TL-FEAT-005 | 交易编辑与 UI 平仓 | CLOSED | 2026-07-12 用户真实验收通过（编辑/平仓/清空平仓/券商提示） |
| TL-FEAT-006 | 标签用户端工作流（方案 A，含迁移） | ACCEPTED | 待用户验收（打标/筛选/管理/隔离） |
| TL-FEAT-007 | Reports 2.0（已实现收益口径） | ACCEPTED | 核心已 USER_VERIFIED；Tag 切片 ACCEPTED 待用户验收后整体 CLOSED |
| TL-DATA-003 | 来源与配对追溯展示 | CLOSED | 2026-07-12 用户真实验收通过（三种来源徽章与只读区） |
| TL-DOC-001 | README 过时内容修正 | CLOSED | ACCEPTED，纯文档；增量修正列 TL-DOC-002 backlog |
| TL-DISC-001 | 用户功能优化审计（Discovery） | CLOSED | 2026-07-12 用户批准平衡路线；Q2 仅已平仓口径、Q4 风险字段延后（记 D-017） |
| TL-PROC-001 | 双 Agent 工作流优化 | DELIVERED | 待用户确认工作流整理结果 |
| TL-FEAT-001 | 验证码/重置邮件多语言（原 2.1/3.1） | CLOSED | 2026-07-12 用户真实验收通过（日语邮件全链路） |
| TL-FEAT-002 | 登录态修改密码（原 3.2） | CLOSED | 2026-07-12 用户真实验收通过 |
| TL-SEC-001 | 登录失败限速（原 3.3） | CLOSED | 2026-07-12 用户真实验收通过（锁定与解锁） |
| TL-FEAT-003 | 多设备会话管理（原 3.4） | CLOSED | 2026-07-12 用户真实验收通过（设备列表与踢除） |
| TL-FEAT-004 | 账户自助删除（原 3.5） | CLOSED | 2026-07-12 用户真实验收通过（测试账号删除与隔离） |
| TL-DATA-001 | IBKR Flex 报表上传（原 3.6） | CLOSED | 2026-07-12 用户真实验收通过（含演示样本去重与真实报表核对） |
| TL-DATA-002 | 金额 Numeric + 分页（原 3.7） | CLOSED | 2026-07-12 用户真实验收通过（4 位精度录入） |
| TL-PROC-003 | Finding Your Unknowns 工作流学习 | CLOSED | 2026-07-12 用户批准"平衡"档（定级权归 Cowork 可改判、Quiz 不引入）；已落入 TEMPLATE/WORKFLOW §2.5，记 D-021 |
| TL-DISC-002 | 云端行情/持仓快照/历史同步 Discovery | CLOSED | 2026-07-12 用户拍板 Q1-Q4 均按推荐（轮询/Flex 权威/30 天/USD 美股 ETF），记 D-019、D-020 |
| TL-DEPLOY-001 | 云部署（AWS ECS Express + mytradelens.app） | USER_VERIFIED（部署链路） | Cowork ACCEPTED + 2026-07-17 用户于 Express 默认域名真实登录 demo 进入应用；批次功能走查并入第 5 批统一验收；域名/Google/EventBridge 转 TL-DEPLOY-002 |
| TL-DEPLOY-002 | 上线收尾三件套（自定义域 / Google 生产回调 / EventBridge 定时同步） | DELIVERED | 2026-07-17 七步全部完成，自动化验收全绿（含 Resend 无伤比对）；待用户手动验收三项 |
| TL-FEAT-010 | Google 登录强制账号选择（prompt=select_account） | DELIVERED | 2026-07-17 交付并已上生产（CI 全绿 + 生产 302 探测含参数）；待用户点一次 Google 登录见账号列表 |
| TL-FEAT-008 | 新用户 Onboarding | ACCEPTED | 待批次统一用户验收 |
| TL-DATA-004 | Broker Connection Center + IBKR Flex 自动同步 | ACCEPTED | 待批次统一用户验收；每日任务承载已随 AWS 返修改为 EventBridge→job 端点 |
| TL-DATA-005 | 行情与自选股（Alpaca IEX） | ACCEPTED | 待批次统一用户验收（需 Alpaca key） |
| TL-DATA-006 | 持仓快照与本地推送（设备令牌） | ACCEPTED | 待批次统一用户验收（本机推送实测） |
| TL-FEAT-009 | Home Dashboard | ACCEPTED | 待批次统一用户验收 |

Backlog（未批准，不得开工）：password/set 登录态设密端点；Reports 服务端聚合（D-011）；Passkey；邮件周报；PWA。
用户侧课程事项（非 CC 任务）：M1 演示视频 7/13 截止；M2 需求文档日期待确认。

---

## [Cowork → CC] 第 5 批（Onboarding / 券商中心 / 行情 / 快照 / Home）· 连续执行说明

用户 2026-07-14 以快速下发模式批准本批全部产品决定（无需再回问 UI 命名、组件拆分、可逆实现选择）。**执行顺序**：先收尾 TL-FEAT-006（+007 Tag 切片）→ TL-DEPLOY-001 → 008 → 004 → 005 → 006 → 009。各任务独立交付、独立审阅、同 ID 返修；非阻塞范围外问题只记录。**全批停止条件**（任一触发即暂停问用户）：IBKR 官方能力与 D-019/DISC-002 结论冲突；无法安全加密并可恢复地存 Flex Token；任何方案要求保存 IBKR 密码/2FA；要求下单或资金权限；迁移有数据丢失风险；新增持续成本预计超 $20/月；需改已批 Azure 架构；无法避免 Gateway 与 Flex 双录；必须复制 TradeZella 受保护素材；代码与规格存在改变产品方向的根本冲突。其余情况取保守可逆选项继续并记录。
**视觉总则（全批）**：沿用 TradeLens 现有深色体系；参考 TradeZella 仅限**分步结构与信息架构**（参考截图：`/Users/fyy/Downloads/微信图片_20260714225248_525_1413.png` 至 `..._532_1413.png` 共 8 张，及 `../docs/competitor_research/TradeZella_onboarding_notes.md`），禁止复制其文案、插画、商标、配色与像素级布局。桌面与窄屏完整可用；loading/empty/error/expired/offline 状态齐全；external CSS；七语言。
**本批共同排除**：订阅/支付、AI 评分、Backtesting、Trade Replay、Mentor/社区、多券商真实 API、预测荐股、任何下单能力、无关重构。

---

## [CC → Cowork] TL-DEPLOY-002 · 上线收尾三件套执行完毕 · DELIVERED（2026-07-17）

**按单七步结果**：
1. **ACM 证书**：经用户逐字批准后申请（ARN 尾号 …cc22d，mytradelens.app + www 双域 DNS 验证）；验证 CNAME 精确值列给用户加入 Namecheap，数分钟后 ISSUED（远低于 45 分钟停止线）。
2. **监听器**：证书挂 443 监听器（SNI 附加证书，IsDefault=false，.on.aws 默认证书保留）；priority 1 规则 host-header 扩为三值（.on.aws 默认域 + 裸域 + www）。修一处查询笔误（Priority 为字符串型）。
3. **DNS 指向**：用户加 ALIAS @ 与 CNAME www；裸域即通。www 首验失败，定位为 Namecheap 输入事故——**CNAME 值被粘贴两遍连成一串**（权威 NS 直查实证，排除缓存）；用户修正后权威记录翻转，301 全通（带 path+query 跳转裸域）。期间用 `curl --resolve` 经 ALB IP 先行证明应用层/证书/规则正确，与 DNS 层问题解耦。
4. **base-url 核对**：任务定义 FRONTEND_URL/CORS_ORIGINS/GOOGLE_REDIRECT_URI 三值本就指向 https://mytradelens.app，SSM 十二参数均为凭据类无 base-url 项——**零改动零重部署**，本单 SSM 例外授权未动用。
5. **Google 生产回调**：精确值与 Console 路径列给用户；生效验证——应用 302 携带的 redirect_uri 与生产回调逐字一致，Google 授权页无 redirect_uri_mismatch。真实账号登录留用户手动验收。
6. **EventBridge 每日同步**：connection（X-Job-Secret 值经 SSM→0600 临时文件→即删管道注入，全程零回显）→ api-destination `https://mytradelens.app/api/jobs/sync-flex`（限速 1/s）→ 新建最小权限角色 tradelens-events-invoke（events:InvokeApiDestination 限定该 destination）→ 规则 `cron(0 9 ? * TUE-SAT *)` ENABLED。**E2E 实证**：临时 rate(1 minute) 规则真实触发一次，应用日志出现 `[flex-sweep] done: 0 connection(s)`（生产无连接，0 为预期），临时规则即拆（list-rules 复核残留为零）。
7. **CI HEALTH_URL**：默认值切 https://mytradelens.app（repo 变量可覆盖），commit 59d42be 推送后 run 29618960529 **全绿**——健康轮询直接打自定义域通过。
**自动化验收清单**：`curl -sI https://mytradelens.app` HTTP/2 200 且证书 ISSUED 并 InUse 于 ALB；www→裸域 301；/api/health 200；demo 登录经自定义域 200；EventBridge E2E sweep 日志实迹；**dig TXT/MX 与操作前快照 diff 为空（Resend DKIM/MX/SPF 逐字节未动）**。
**发现项**：① www CNAME 粘贴两遍属用户面板输入事故，值本身无歧义，无流程改进必要；② Namecheap 权威边缘对记录修正有约数分钟传播延迟，验收时以权威 NS 直查为准。
**不确定点**：无。**子代理使用**：0 个。
**待用户手动验收三项**：浏览器 mytradelens.app 登录 demo；Google 账号真实登录一次；触发一封系统邮件（如忘记密码验证码）确认发信正常且域名记录无恙。
**遗留提醒**：RDS 托管密码 7 天轮换治本方案仍待另单（下次轮换将使 database-url 失效，届时同步管道需重跑）。

---

## [CC → Cowork] TL-FEAT-010 · 实现完成并已上生产 · DELIVERED（2026-07-17）

**改动**：`auth.py` google_start 的 `authorize_redirect` 增 `prompt="select_account"`（authlib 透传为 authorize URL 查询参数），附注释注明用途。scope 未动（D-002）、回调与 session 零改动（Do Not Touch 达成）。提交 60809fa。
**自检（自动化证据）**：py_compile 过；本地 302 冒烟断言 authorize URL 含 `prompt=select_account` 且 redirect_uri 在位；推送后 CI run 29628267066 全绿（build→migrate 幂等→canary→健康轮询）；**生产 302 探测**——rollout COMPLETED 后 authorize URL 实测含 `prompt=select_account`，health 200，RUNNING 任务数回到 1。过程记录：rollout 窗口内首次探测命中旧任务（Canary 双任务并存的预期现象），等 COMPLETED 后复测通过。
**发现项**：无。**不确定点**：无。**子代理使用**：0 个。
**待用户手动验收**：生产点 Continue with Google 应出现账号选择列表。

---

## [Cowork → CC] TL-FEAT-010 · Google 登录强制账号选择 · APPROVED（2026-07-17）

**风险等级**：Low（单参数改动，既有 OAuth 流内）。
**背景**：用户在生产实测发现点 Continue with Google 静默直选当前账号，无法换号；2026-07-17 拍板加账号选择画面。
**目标**：每次发起 Google 登录都出现 Google 账号选择界面。
**In Scope**：授权请求加 `prompt=select_account`（authorize 参数处，实现位置由 CC 定）。
**Out of Scope**：scope 变化（D-002 不动）、其它登录流改动。**Do Not Touch**：回调处理、session 逻辑。**依赖**：无。
**产品决定**：用户 2026-07-17 拍板要选择画面。**技术约束**：D-002。**数据模型影响 / API 影响 / i18n 影响**：无。**安全与隐私**：无新增。
**自动化验收**：authorize 跳转 URL 含 `prompt=select_account`（现有 302 探测冒烟延伸一条断言）。
**手动验收（用户）**：生产点 Continue with Google 出现账号列表。
**停止条件**：无特殊。**不确定点处理**：常规。

---

## [Cowork → CC] TL-DEPLOY-002 · 上线收尾三件套 · APPROVED（2026-07-17）

**风险等级**：High（生产 DNS、OAuth 回调、定时任务与密钥相邻）。
**背景**：TL-DEPLOY-001 部署链路已 USER_VERIFIED（2026-07-17 用户 demo 真实登录）。本单接管剩余三件：自定义域、Google 生产回调、EventBridge 每日 Flex 同步。执行模式沿用代执行拍板：CC 跑全部终端命令；Namecheap 面板与 Google Console 属用户网页操作，CC 到步时把**逐字段精确值**列给用户点击，等用户回报后继续。
**目标**：https://mytradelens.app 全功能可用（含 Google 登录），每日自动同步就位。

**事实与未知**：
- ALB/监听器/证书架构已由 Express 建成；自定义域官方路径已于三次交付时核查（aws-provision.sh 第 8 步，访问日期 2026-07-16）。
- `POST /api/jobs/sync-flex` 端点已交付（X-Job-Secret 认证、202 立答后台 sweep、防重入）；SSM `/tradelens/job-secret` 在位。
- 已知未知：Namecheap 面板对裸域 ALIAS 的实际支持以用户面板实见为准；邮件外链所用 base-url 类 SSM 参数当前值指向何处需 CC 核对。

**In Scope（按序）**：
1. ACM 申请 mytradelens.app + www 证书（DNS 验证）；验证 CNAME 值列给用户加入 Namecheap；等 ISSUED。
2. ALB 监听器挂新证书；host-header 规则加裸域与 www（保留 .on.aws 默认入口）。
3. 用户在 Namecheap 加 ALIAS @ 与 CNAME www 指向 ALB DNS 名（CC 给精确值）；生效后验证 https://mytradelens.app 与 www 301。
4. 核对并按需更新 base-url 类 SSM 参数与相关配置至 https://mytradelens.app（属本单授权的 SSM 例外，逐条披露）；如改动需重部署则 force-new-deployment。
5. 用户在 Google Console 添加生产 redirect `https://mytradelens.app/api/auth/google/callback`（CC 给精确值与页面路径）；生产 Google 登录冒烟。
6. EventBridge Scheduler：connection（X-Job-Secret 从 SSM 管道注入，不回显）→ api-destination `https://mytradelens.app/api/jobs/sync-flex` → `cron(0 9 ? * TUE-SAT *)`（UTC，对应美股收盘后）；手动触发一次验证 202 与后台 sweep 日志。
7. CI 的 HEALTH_URL 切回自定义域。
**Out of Scope**：密码轮换治本方案（另单）；批次功能统一用户验收；任何新功能。
**Do Not Touch**：**Resend 全部既有 DNS 记录（TXT/MX/DKIM/CNAME，一条不许动，只做加法）**；RDS；安全组；已对齐的 database-url。
**依赖**：无。

**产品决定**：域名 mytradelens.app（既有）；www 301 至裸域（既有实现）。**技术约束**：D-012；D-002（Google 只读身份 scope 不扩）。
**数据模型影响 / API 影响 / i18n 影响**：无。
**安全与隐私**：job-secret 全程管道注入不落屏；Google client secret 不入命令行明文（如需引用走 SSM）。
**自动化验收**：curl -sI https://mytradelens.app 200 且证书有效；www→裸域 301；/api/health 200；EventBridge 手动触发 202 + CloudWatch sweep 实迹；`dig TXT/MX mytradelens.app` 与操作前快照一致（Resend 未伤）。
**手动验收（用户）**：浏览器 mytradelens.app 登录 demo；Google 账号真实登录一次；收一封系统邮件确认外链域名正确。
**停止条件**：Namecheap 无 ALIAS 类型可用；ACM 验证 45 分钟未 ISSUED；任何步骤要求修改 Resend 记录；同因失败 2 次；出现新增费用项。
**不确定点处理**：非阻塞记发现项；阻塞的停下等 Cowork/用户。

---

## [Cowork → CC] TL-DEPLOY-001 · 上线收尾运维单审阅 · ACCEPTED（2026-07-17）

**独立验证（静态审阅证据，与 CC 自检分开）**：Cowork 从独立网络环境直接请求线上 `/api/health`，返回 200 `{"ok":true,"readOnly":true}`（readOnly 徽章在，D-003 卫生面正常）；HANDOFF 所载 migrate 日志链核对与本地迁移图谱一致（4c984bc16851 起 11 个迁移线性至 37d4dfa8a113，login_attempts 在链上）；seed 实迹清单与 seed.py 预期产出吻合；ecs-deploy 策略范围复核（default 集群限定 + PassRole 两角色，无越权面）。
**三层结论**：规格符合性——六步全达标，中断点按 High 定级规矩处理，合格；技术与对抗——两次 CI 失败非同因判定成立，健康步三处修复（默认域名、--max-time、cancel-in-progress）方向正确且已披露，密钥卫生全程干净；产品与 UX——留待用户真实登录走查。
**裁决**：额外改动三项全部接受；AWS_SUBNETS/AWS_APP_SG 的 workflow 回退默认值方案接受（非密钥、可覆盖），repo variables 补设降为可选。
**待用户验收项**：浏览器 demo 登录走 Home/Journal/Reports 一圈（Express 默认域名）。通过后本单置 USER_VERIFIED，进入自定义域/Google redirect/EventBridge 收尾单。

---

## [CC → Cowork] TL-DEPLOY-001 · 上线收尾运维单执行完毕 · DELIVERED（2026-07-17）

**按单六步结果**（中断点详情见下一条，未删以保时间线）：
1. **流浪任务**：RUNNING 仅服务自身 1 任务（group=service:tradelens）；9dc472b1 已 STOPPED（orphan），两个假一次性任务不在 RUNNING。终态达标。
2. **脚本返修四项**：已落盘并随 b7dd933 提交（task role 信任策略 ecs-tasks 必做命令、securityGroups 键名、execution role logs 三权、一次性任务镜像前置条件双处注明，均标 2026-07-17 生产实证）。
3. **GitHub variables**：gh CLI 本机不可用（未安装且认证交互式），按单内回退路径处理——workflow 对 AWS_SUBNETS/AWS_APP_SG 加表达式回退默认（值非密钥且已成文），repo variables 保留覆盖能力；AWS_REGION/AWS_DEPLOY_ROLE_ARN 经 CI 成功推镜像证明在位（AWS_ACCOUNT_ID 未被 workflow 引用）。网页设置步骤已列于中断点条目供用户择机补设。
4. **完整 CI**：经历两次已定性失败后于 run 29569334171（commit 59bb112）**全绿**。失败一=tradelens-deploy 角色缺 ecs-deploy 策略（第三次交付成文但未挂载），经用户批准后补挂（ECS 四动作限定 default 集群 + PassRole 限定两角色，与指南模板逐字一致）；失败二=健康步 curl 打尚未绑定的自定义域，解析到停靠页 TLS 悬挂 66 分钟且 curl 无超时——**非同因，未触发"同因两次"停止条件**。修复：HEALTH_URL 改 Express 默认域名（repo 变量可覆盖，域名绑定后切回）、curl 加 `--max-time 10`、并发语义改 cancel-in-progress: true（最新推送取胜，migrate 幂等故安全；此举同时取消了僵死 run）。**migrate 真日志已核**：CloudWatch `app/Main/7f53aa9b...` 流含 `[entrypoint] one-shot migration` 与完整 `Running upgrade` 链——空库起步 4c984bc16851→…→37d4dfa8a113 共 11 个迁移全数执行至 head，任务退出码 0。roll 与健康轮询过绿。
5. **一次性 seed**（任务 457c6cf6，assignPublicIp=ENABLED）：退出码 0，日志实迹齐全——`+ created demo@tradelens.app`、`+ created admin@…`、双双 onboarding marked complete、playbooks 8、tags 9、demo trades 18、adoptions 4。
6. **冒烟**：`/api/health` 200；demo 登录 API 200（凭据为 README 公开演示账号）；RUNNING 任务数=1。**自动化验收四项全达标**（CI 绿、Running upgrade 链至 head、login_attempts 表由登录冒烟间接证明存在、RUNNING=1）。
**本单期间额外改动披露**：① 用户批准的 ecs-deploy IAM 内联策略挂载；② deploy.yml 健康步三处修复（见上，随 59bb112 提交，属"健康检查轮询保留"的缺陷修复而非语义变更）；③ 两次提交 b7dd933/59bb112 + 一次空提交 f3673fb，均不带 skip ci。
**密钥卫生**：全程零明文密钥/SSM 值输出；CI 日志匿名不可读，诊断全部走 AWS 侧只读查询。
**发现项**：僵死 run 曾占住并发组约 85 分钟（公共仓库零费用），cancel-in-progress 修复后不再可能。
**不确定点**：无。**子代理使用**：0 个。
**待用户手动验收**：浏览器登录 demo 走 Home/Journal/Reports 一圈（Express 默认域名，地址见单首）。**遗留提醒**：RDS 托管密码 7 天轮换问题按单内说明另立任务。

---

## [CC → Cowork] TL-DEPLOY-001 · 上线收尾执行中断点（已解除，见上条）· 2026-07-17

**已完成（按单序）**：
1. 流浪任务清理确认：`list-tasks RUNNING` 仅剩服务自身 1 任务（group=service:tradelens）；点名任务 9dc472b1 已 STOPPED（reason=orphan），两个假一次性任务不在 RUNNING。
2. 脚本返修四项已落盘：① provision 指南 task role 复用处补 `update-assume-role-policy` 改 ecs-tasks 的必做命令（注明 2026-07-17 生产实证）；② `securityGroup`→`securityGroups`；③ execution role 补 tradelens-logs 三权说明；④ 入口脚本与 CI 头注双处写明一次性任务前置条件=镜像必须含当前入口（禁 [skip ci] 后直接跑一次性任务，注明事故日期）。
3. gh CLI 本机未装且其认证交互式无法代执行，按单内回退：workflow 对 AWS_SUBNETS/AWS_APP_SG 增加表达式回退默认值（子网/SG id 非密钥且已成文于 infra），repo variables 仍可覆盖；AWS_REGION 与 AWS_DEPLOY_ROLE_ARN 经上一次 CI 成功推镜像证明在位（AWS_ACCOUNT_ID 实际未被 workflow 引用）。**网页设置步骤（可选，用户操作）**：GitHub → tradelens 仓库 → Settings → Secrets and variables → Actions → Variables → New：`AWS_SUBNETS=subnet-08b41021d844fbba4,subnet-0ab978a52584cf4d4`、`AWS_APP_SG=sg-09131eb0aaa971a47`。
4.（部分）提交 b7dd933 推送成功（无 skip ci），CI 触发：checkout/OIDC/ECR 登录/**build+推镜像全绿**（ECR 出现 b7dd933 镜像，02:31 实证）；**migrate 步失败（本单第 1 次 CI 失败）**。

**失败根因（AWS 侧实证，公共 API 佐证步骤级结论）**：`tradelens-deploy` 角色现有策略仅 `ecr-push`（已 get-role-policy 核对），第三次交付即成文的 ecs-deploy 内联策略（ecs:RunTask/UpdateService/DescribeServices/DescribeTasks 限定 default 集群 + iam:PassRole 限定两角色）从未挂载 → run-task 被拒、无任务创建、后续步骤 skipped。
**中断原因**：代执行环境的权限分级要求 IAM 授权类操作由用户亲自批准（与本单 High 定级一致）。**待用户执行/批准的一条命令**（与 provision 指南模板逐字一致，无新增权面）：
```
aws iam put-role-policy --role-name tradelens-deploy --policy-name ecs-deploy --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["ecs:RunTask","ecs:UpdateService","ecs:DescribeServices","ecs:DescribeTasks"],"Resource":"*","Condition":{"ArnEquals":{"ecs:cluster":"arn:aws:ecs:us-east-2:634005656606:cluster/default"}}},{"Effect":"Allow","Action":"iam:PassRole","Resource":["arn:aws:iam::634005656606:role/tradelens-execution","arn:aws:iam::634005656606:role/tradelens-apprunner-instance"]}]}'
```
**批准后剩余动作（CC 继续代执行）**：空提交重触发 CI → 验 migrate 真日志（CloudWatch `Running upgrade` 链）→ force-new-deployment + 健康轮询 → 一次性 seed + 日志核实 → health/demo 登录冒烟。失败计数提醒：同因再败即触发停止条件。
**密钥卫生**：全程零明文密钥输出；CI 日志匿名不可读（403），诊断全部走 AWS 侧。
**子代理使用**：0 个。

---

## [Cowork → CC] TL-DEPLOY-001 · 上线收尾运维执行单（含脚本返修四项）· APPROVED（2026-07-17）

**风险等级**：High（生产环境操作 + IAM/密钥相邻）。
**背景**：用户 2026-07-17 拍板：**此后所有终端操作由 CC 在用户 Mac 上代执行**，用户只保留花钱批准与最终验收；Cowork 出规格与审阅。本单为 Express 上线收尾。执行环境：用户本机终端（`~/.aws` 凭证、区域 us-east-2、账户 634005656606），CC 直接跑命令，不再让用户手敲。
**目标**：https://tr-debccbde876f46f0b4cbe892002bcd93.ecs.us-east-2.on.aws 可用 demo 账号正常登录进入应用。

**事实与未知（现场实况盘点，2026-07-17 凌晨）**：
- Express 服务已建成且 steady state；ALB/证书/监听器/目标组/伸缩全绿；日志组 `/aws/ecs/tradelens` 已建。
- RDS 密码轮换与 SSM `/tradelens/database-url` 已对齐（自动管道二次写入），应用容器可连库。
- **根因链**：返修提交 `5d67ae9` 带 `[skip ci]` → 镜像未重建 → ECR `:latest` 仍为 `77c3aad` 版（入口脚本无 migrate/seed 一次性分支）→ 一次性任务收到 command 覆盖后照常起 gunicorn → 所谓 exit 0 是假阳性 → **数据库迁移与 seed 均未真正执行**（`relation "login_attempts" does not exist` 实证）。
- 审阅期现场发现并已修复两处（Cowork 指挥用户手工执行，按 §6 披露）：① `tradelens-apprunner-instance` 信任策略仍指 App Runner，已 `update-assume-role-policy` 改为 ecs-tasks；② `tradelens-execution` 缺 logs 权限，已建日志组并挂 `tradelens-logs` 内联策略（logs:CreateLogGroup/CreateLogStream/PutLogEvents，Resource 为 log-group:*）。

**In Scope（按序执行）**：
1. 清理流浪任务：stop 任务 `9dc472b1c5804c7288380d392e52e285` 及昨晚两个假一次性任务（若仍 RUNNING）；`list-tasks --desired-status RUNNING` 终态应只剩服务自己 1 个任务。
2. 脚本返修四项落盘：`infra/aws-provision.sh` ① task role 信任策略模板改 ecs-tasks.amazonaws.com；② `create-express-gateway-service` 网络配置键名 `securityGroup`→`securityGroups`；③ execution role 策略补 logs 三权；`docker-entrypoint.sh` 或 CI 文档 ④ 注明一次性任务前置条件=镜像必须含当前入口脚本（禁 `[skip ci]` 后直接跑一次性任务）。
3. GitHub variables：`AWS_SUBNETS=subnet-08b41021d844fbba4,subnet-0ab978a52584cf4d4`、`AWS_APP_SG=sg-09131eb0aaa971a47`（gh CLI 优先；未认证则列出网页操作给用户）；核对 `AWS_REGION`/`AWS_ACCOUNT_ID`/`AWS_DEPLOY_ROLE_ARN` 在位。
4. 提交本单改动并推送（**不带 skip ci**），触发完整 CI：build → 推 ECR → 一次性 migrate（看真日志 `Running upgrade`，非仅退出码）→ force-new-deployment → 健康轮询。
5. CI 绿后跑一次性 seed 任务（assignPublicIp=ENABLED），核对日志出现 seed 实迹。
6. 冒烟：curl `/api/health` 200；demo 账号登录 API 返回 200（凭据用 seed 既有 demo，不得在输出中回显任何密钥/SSM 值）。
**Out of Scope**：自定义域、Google 生产 redirect、EventBridge 定时同步（收尾验证后另发）；密码轮换长期方案（见下）。
**Do Not Touch**：Resend 相关 DNS；RDS 实例配置；SSM 参数值（database-url 已对齐，勿动）；任何安全组规则。
**依赖**：无。

**产品决定**：终端操作代执行模式（用户 2026-07-17）。**技术约束**：D-012（密钥卫生）全程适用；轮换密码若需再对齐，沿用既有"Secrets Manager→urllib.parse.quote→SSM"管道整段执行，密码不落日志不回显。
**数据模型影响 / API 影响 / i18n 影响**：无。
**安全与隐私**：命令输出如含密钥立即中止并改用管道方式。
**自动化验收**：CI 全绿；migrate 任务日志含完整 `Running upgrade` 链至 head；`login_attempts` 表存在（可由登录冒烟间接证明）；RUNNING 任务数=1。
**手动验收（用户）**：浏览器登录 demo 走一圈 Home/Journal/Reports。
**停止条件**：CI 同一原因失败 2 次；出现新的 IAM AccessDenied；任何步骤要求输出明文密钥；预计新增费用。
**已知遗留（转后续任务）**：RDS 托管密码**每 7 天自动轮换**，SSM 连接串会周期性失效——治本方案（应用启动时从 Secrets Manager 现取拼接，或改用轮换感知代理）另立任务拍板，本单不处理。

---

## [Cowork] TL-DEPLOY-001 · 阻断实况与用户决策（2026-07-16）

**新事实（未知未知落网）**：AWS 控制台横幅明示 App Runner 自 2026-04-30 不再接受新客户，现有服务可运行但无法新建——部署 Discovery 核验了其功能与价格却未核验"是否仍接受新客"，教训记入：外部服务核查清单增加"当前可用性/生命周期状态"一项（并入 COWORK_WORKFLOW §2.5 Blind Spot Pass 第⑤问的执行口径）。
**用户决策**：在 A（ECS 快速模式，AWS 官方推荐迁移方向，长期约 $26-29/月）与 B（Lightsail $7/月）之间选 **A**，并接受成本线由 $20 上调至 **$35/月**（Budgets 告警同步调整）。触发的停止条件按规程处理完毕。
**资产盘点（全部保留）**：ECR 仓库与 :latest 镜像、GitHub OIDC 角色、RDS（available，密码已轮换且经自动管道入 SSM）、SSM /tradelens/* 全部 12 参数、tradelens-apprunner-instance 角色（可复用为 ECS task role）、安全组两枚。

---

## [Cowork → CC] TL-DEPLOY-001 · CHANGES_REQUESTED（第二次：App Runner → ECS 快速模式）

**风险等级**：High。**前置要求（D-021）**：实施前先查 ECS Express Mode 官方文档（含当前可用性），记录访问日期；其能力假设不得凭记忆。
**返修项**：
1. `infra/aws-provision.sh` 第 6-7 步改写为 ECS 快速模式：从 ECR :latest 建服务（0.25 vCPU/0.5GB、端口 8000、健康检查 /api/health、期望任务数 1）；task role 复用 tradelens-apprunner-instance（改名或另建 tradelens-task 均可，注明）；execution role 需 ECR 拉取 + SSM SecureString 读取（secrets valueFrom 用参数 ARN）；环境变量与 12 条 SSM secrets 清单沿用原规格；网络用默认 VPC 子网 + APP_SG（sg-09131eb0aaa971a47），DB SG 已放行该组无需改。
2. **迁移时序**：ECS 滚动部署可能双任务并存，entrypoint 迁移存在并发风险——部署配置取 minimumHealthyPercent=0 / maximumPercent=100（先停旧再起新，可接受短暂停机）或将迁移挪为 CI 一次性步骤，二选一并注明理由。
3. CI：部署触发改为 `aws ecs update-service --force-new-deployment`（OIDC 角色补 ecs:UpdateService 等最小权限），健康检查轮询保留。
4. 自定义域：ALB + ACM 证书 + Namecheap ALIAS/CNAME 路径重写指南（Resend 记录不动警示保留）；www 301 逻辑不变。
5. DEPLOY.md 全量更新（含成本节改 $35 线与 ALB 固定费说明、EventBridge 第 8 步端点不变）。
**停止条件**：ECS Express 官方现状与本单假设冲突时停；其余沿用批次十条（成本线按 $35 执行）。同一 Task ID 交付。

---

## [CC → Cowork] TL-DEPLOY-001 · ECS 快速模式返修完成 · DELIVERED（三次交付）

**D-021 前置核查（官方文档，访问日期 2026-07-16）**：ECS Express Mode 真实存在且 GA（2025-11 发布，2026-06 扩至 GovCloud），覆盖全部 ECS+Fargate 区域含 us-east-2；API 为 `aws ecs create-express-gateway-service`；创建资源清单（ALB+HTTPS 监听 host-header 规则+目标组+默认域名 ACM 证书+目标追踪伸缩+日志组+5XX 回滚告警）、自定义域官方步骤、资源直改持久性（"Express Mode will not overwrite changes unless requested as part of an Express Mode update"）均已逐页核对。来源：developerguide 的 express-service-getting-started / express-service-work / express-service-advanced-customization 三页（链接留存于 aws-provision.sh 头注）。**与返修单假设的两处出入**（均在返修单预留的选择空间内，未触发停止条件）：① 部署策略固定 Canary 且官方明示不可更改，返修项 2 的"min 0/max 100 先停后起"不可用；② `--primary-container` 无 secrets 字段且 `--cpu` 仅整 vCPU，0.25 vCPU + 12 条 SSM secrets 需走官方自带任务定义路径（"uses your task definition as-is"）。

**按返修项逐条**：
1. **infra**：`aws-provision.sh` 第 6-7 步改写——新 `tradelens-execution` 执行角色（**语义修正并注明：ECS 中读 SSM SecureString 的是 execution role 而非 task role**，App Runner 时代 instance role 的 SSM 策略复制到执行角色）+ 官方 `ecsInfrastructureRoleForExpressServices`（托管策略）；task role **复用 tradelens-apprunner-instance 原名**（应用运行时零 AWS 调用，占位即可，选择已注明）。新 `infra/taskdef-template.json`：容器名 Main、单一命名 TCP 端口 8000、cpu 256/memory 512、12 条 secrets 按参数 ARN valueFrom、环境变量沿用原规格并加 `SKIP_MIGRATIONS=1`、awslogs 日志组。服务经 `create-express-gateway-service --task-definition-arn`（/api/health 健康检查、scaling min=max=1、默认 VPC 公有子网 + APP_SG，DB SG 无需改）。首次初始化改为两个一次性任务按序 `migrate`、`seed`。
2. **迁移时序（二选一：选 CI 一次性步骤）**：理由=Express 强制 Canary 不可改，选项 A 的部署参数不存在；新旧任务并存下入口迁移会自我竞态。实现：服务任务 `SKIP_MIGRATIONS=1`；`docker-entrypoint.sh` 增 `migrate`/`seed` 一次性模式（command 覆盖走 ENTRYPOINT 参数，因 ECS containerOverrides 只能覆盖 command 不能覆盖 entryPoint）；本地 docker run 无参仍默认开机自迁移。Canary 窗口内旧代码短暂运行新 schema，迁移保持加法式（现状满足），已写入 DEPLOY.md §3。
3. **CI**：build → 推 ECR :sha/:latest → **`aws ecs run-task` 跑 migrate 一次性任务并等退出码 0（非 0 中止发布）** → `aws ecs update-service --force-new-deployment`（:latest 在新部署时重解析 digest，官方 versionConsistency 语义）→ 健康轮询保留。OIDC 角色补最小权限（ecs:RunTask/UpdateService/Describe* 限定 default 集群 + iam:PassRole 限定两角色），策略模板在 provision 第 1-5 步说明；GitHub 新增 AWS_SUBNETS/AWS_APP_SG 两个 variables。
4. **自定义域**：按官方 Express 路径重写（provision 第 8 步）——ACM 证书（DNS 验证 CNAME 入 Namecheap）→ ALB 监听规则 host-header 加 OR 条件（保留 .on.aws 默认值，加裸域与 www）→ 监听器挂证书 → Namecheap ALIAS @ / CNAME www 指向 ALB DNS 名；**Resend 记录不动警示保留**；www→裸域 301 应用层不变；手工改动持久性已经官方文档确认。
5. **DEPLOY.md 全量更新**：架构与背景（App Runner 停收实证 + $35 拍板）、§1 剩余步骤清单（已完成资产标注跳过）、§3 迁移语义、§4 回滚（旧 sha 重打 :latest + Express 自带 5XX 回滚告警）、§7 成本节——**ALB 固定费约 $16-17/月为主要新增项**（同 VPC 25 服务共享的摊薄特性已注明）、合计约 $26-29/月、**RDS 免费档到期后合计约 $38-42 将越 $35 线的提前预警**、告警阈值 $28；§9 EventBridge 第 8→9 步端点不变。
**自检（自动化证据）**：`bash -n`/`sh -n` 两脚本语法过；taskdef 模板 JSON 程序化断言（Main/单端口命名/256/512/12 secrets/SKIP_MIGRATIONS=1/FARGATE）；workflow 过 yaml-lint 且步骤顺序断言 build(56)→migrate(65)→roll(81)→health(87)；**入口脚本两种一次性模式真实执行验证**（migrate 对已在 head 的开发库幂等空跑、seed 幂等跳过）；例行基线 py_compile 28 文件 / i18n 551 × 7 / build 全过。业务代码零改动（本次仅 entrypoint sh、infra、CI、文档）。
**发现项**：无。
**不确定点**：① Express 默认伸缩指标为 CPU 目标追踪，min=max=1 下不起作用，保留默认未调；② 一次性任务需 assignPublicIp=ENABLED（默认 VPC 公有子网拉 ECR 镜像所需），已写入命令；③ ALB 监听规则的 OR host-header 上限与证书配额在多服务场景才需关注，单服务无碍（官方页有提额提示，已在指南 8 步末尾保留原文提醒的语义）。
**子代理使用**：0 个。

---

## [Cowork] 第 5 批逐项审阅汇总（2026-07-15，六项全 ACCEPTED）

**TL-FEAT-008 · ACCEPTED**——独立验证：gate.js/profileOptions.js/OnboardingPage 在位，守卫顺序 verify 优先于 onboarding；user_profiles 无敏感字段（模型 docstring 明示不收集收入/净资产/风险承受度）；词表白名单与 step 夹取；seed 幂等置 demo/admin 完成。裁决：安全退出=保存并登出（接受，守卫下唯一自洽解）；完成落地页交由 009 接管（已生效）。发现并修复的 delete-orphan 缺陷处理得当。
**TL-DATA-004 · ACCEPTED**——独立验证：Fernet 可恢复加密 + FLEX_TOKEN_KEY、token_mask 仅末 4 位、cryptography 入依赖；api 响应零明文（冒烟含卫生扫描）；退避序列与官方码映射断言；重跑幂等 0 新增；D-019 翻转（活跃连接下 Gateway 导入下线）。裁决：Test Connection 真实消耗一次报表生成——接受（官方无 dry-run）；90 天保留、date_format 容错——接受；原 ACA Job 表述已被 AWS 返修取代，以 job 端点方案为准。
**TL-DATA-005 · ACCEPTED**——独立验证：AlpacaProvider 归一化含 status/feed 标注、TTL 缓存单测、密钥零下发、满 30 与跨用户隔离冒烟。裁决：assets 全表 24h 缓存内搜索——接受；涨跌一律相对前收——接受，口径一致且 UI 有时段徽章。
**TL-DATA-006 · ACCEPTED**——独立验证：push 端点 nonce+±300s 窗口+设备哈希、(device,nonce) 唯一兜底、明文仅创建响应一次、保留策略实测、accountTags 译名清偿原始 tag。裁决：token_hint 末 4 位——接受（"只存哈希"的展示性例外，无泄密面）；对称窗口、v1 不做汇率——接受。
**TL-DEPLOY-001（AWS 返修） · ACCEPTED**——独立验证：infra 仅存 aws-provision.sh、deploy.yml 零 az 残留、OIDC role-to-assume、ECR 推送、jobs/sync-flex 端点 constant-time 比较、202 立答后台 sweep 的超时兼容设计合理；预算告警前置为第 0 步符合成本停止条件。裁决：App Runner 计费条款由用户在控制台当期核对（列入上线清单）；ALIAS 记录不可用时再议——接受。
**TL-FEAT-009 · ACCEPTED**——独立验证：/home 为索引落点、导航更名"投资组合"、dayWinRate 口径单测（单日聚合/持平稀释/未平仓零影响）、真实账户零假数据、Reports 零改动；全批终检 143 项后端冒烟 + 551 键 × 7 + build 复验通过。裁决：行情时间芯片并入自选卡、日历浅底配色——接受，呈现权在 CC。
**下一步**：批次进入统一用户真实验收 + 上线操作（用户亲手执行 DEPLOY.md 11 步，Cowork 领路）。

---

## [CC → Cowork] TL-FEAT-009 · 实现完成 · DELIVERED（第 5 批收官）

**改动**
- 路由与导航：新 `/home` 为登录默认落地页（索引重定向改指 /home，Onboarding 完成后 navigate('/') 自然落 Home，008 代码零回改）；顶部导航更新为 **Home → 策略库 → 交易日志 → 绩效报表 → 投资组合**（nav.connect 七语由"实时"改"投资组合"，命名微调权按批次说明行使）。
- `metrics.js` 新增纯函数 `dayWinRate`（盈利日比例=日级曲线中净盈利日/有平仓日；持平日入分母不计胜，口径注释成文）；平均盈利/平均亏损复用 computeMetrics 既有 avgWin/avgLoss。
- 新 `HomePage`，11 区域全部落地、**每卡独立数据源与空态、任何集成缺位不阻塞整页、真实账户零示例假数据**：①状态条（连接状态徽章/只读徽章/上次与下次同步/立即同步按钮/快照时间与过期标注，未连接则 CTA）②核心指标 8 卡（净 P&L/胜率/PF/盈利日比例/平均盈利/平均亏损/Expectancy/最大回撤，全部已实现口径并复用 Reports 口径说明文案）③已实现收益曲线（复用 EquityCurveChart）④Recent Trades（近 5 笔+去日志链接）⑤Open Positions 分层（"日志持仓"层常在；快照就绪叠加"券商持仓快照"层+时间戳+过期标注）⑥本月 P&L 日历（按平仓日净额格子，正负色，星期头随界面语言 Intl 生成）⑦最近同步结果（sync_runs 前 3 条）⑧今日复盘清单（当日平仓且无 notes 的交易+去补记链接）⑨起步清单（连接券商/首笔交易/首条笔记三件套，朴素勾选无评分——**TradeLens Score 未做**，按规格以完成度清单替代）⑩Playbook 使用（已采用策略近 30 天开仓笔数分布，空态 CTA 去库）⑪待处理事项（Token 过期/同步失败/导入失败行数/快照过期聚合，各带跳转）。自选卡（005 的 WatchlistCard）同页接线。
- CSS 新 `home.css`（复用 reports.css 的指标卡与图表组件样式，quotes.css 供自选卡）；i18n +43 键 × 7（home 42 + nav.home，另 nav.connect 改值；现 **551 键 × 7**）。Reports 页零改动（Do Not Touch 达成）。
**自检（自动化证据）**：dayWinRate 单测 6/6——固定 6 笔样例 3/6=50%、空数据 null、全亏 0、**单日多笔聚合为一日**、持平日稀释、未平仓零影响；路由矩阵沿用 gate 纯函数单测 7/7（未验证/未引导/正常/demo 由 /me 数据驱动，落点重定向为 router 配置并经 build 验证）；全批终检重跑：**7 套后端冒烟 143/143**（10+17+26+19+27+21+23）、metrics 25/25+6/6、gate 7/7、i18n 551 × 7 占位符零出入、py_compile 28 文件、build 过。
**发现项**：清理了一个本会话误创建的根目录杂散 requirements.txt（cwd 错误的追加命令所致，backend/requirements.txt 正本无恙）。
**不确定点**：①状态条未单列"行情时间"芯片——行情时间与 IEX 徽章已在同页自选卡内呈现，避免重复（呈现选择权按批次说明归 CC，如需单列一行改动）；②本月日历配色用带透明度的正负色底（延续现有正负色约定的浅底变体）。
**手动验收提示（用户）**：demo 与真实账号 Home 全卡走查、手机端、空账号 CTA、导航顺序与"投资组合"命名、Onboarding 完成后落 Home。
**子代理使用**：0 个。

---

## [CC → Cowork] TL-DATA-006 · 实现完成 · DELIVERED

**改动**
- 迁移 `37d4dfa8a113`：`broker_sync_devices`（**token 只存 SHA-256 哈希**+末 4 位提示、可吊销 revoked_at、可过期 expires_at、last_used_at）、`portfolio_snapshots`（captured_at/received_at 双时间戳、base_currency、summary JSON、**(device_id,nonce) 唯一=防重放兜底**）、`position_snapshots`（symbol/quantity/avg_cost/currency/sec_type）；重放通过。保留策略：每日末条 + 30 天，推送时修剪。
- 端点：`POST /api/broker/push`——设备令牌 Bearer（哈希查找、吊销/过期即 401 `invalid_device_token`）+ **timestamp ±5 分钟窗口**（`PUSH_REPLAY_WINDOW` 可配，规格要求的可配置时钟偏差容忍）+ nonce 唯一（重复 409 `replay_detected`）；仅此一权（写属主快照），与 session 体系完全并行不混用。GET `/api/broker/snapshots/latest`（session）；设备管理 GET/POST/DELETE `/api/broker/devices`（**明文只在创建响应出现一次**，吊销而非删除以保审计链）。删号级联清设备/快照/持仓行。
- 本地推送代理 `push_snapshot.py`：读本机 Gateway 桥（status/account/positions）→ HTTPS 推云端；token 走 `TL_DEVICE_TOKEN` 环境变量（避免 shell history 与 ps 泄漏）；`--interval` 循环模式；后端 README 新增 §5.5 指引。云端零 IBKR 凭据（D-003 未触碰）。
- 前端：Settings 新「同步设备」卡（创建令牌→一次性明文展示框+复制警示、列表含末 4 位提示/最近使用/已吊销徽章、两步确认吊销）；`SnapshotCard`（/connect，TL-FEAT-009 将再挂 Home）——**双时间戳并列**（快照/接收/行情三时点）、>24h 显"已过期，非实时"徽章、混合时点说明文案、估值 v1 仅 USD STK/ETF（复用 005 行情，其余行灰显"不估值"徽章不入合计）、空态含代理命令提示。**顺带清偿**：/connect 实时账户卡与快照摘要的 IBKR 原始 tag（NetLiquidation 等 5 个）统一改为七语产品名（`utils/accountTags.js`，技术含义注释成文）。CSS 新 `portfolio.css`（sd-* 入 settings.css）。i18n +30 键 × 7（现 508 键）。
**自检（自动化证据）**：冒烟 23/23——创建令牌明文仅现一次且 DB 只有哈希、设备列表无明文、有效推送 201 与最新快照双时间戳/摘要/坏行过滤、last_used 更新、**防重放三态**（过期戳 401 stale_timestamp、未来戳 401、重复 nonce 409 replay_detected）+ 坏 token/无 Bearer 401、他人设备吊销 404 与快照隔离、过期设备 401、吊销后推送 401、**保留策略实测**（40 天旧条被修剪、同日双推只留最新、孤儿持仓行零）、删号级联、**明文令牌在创建响应之外零出现**；迁移重放、i18n 508 × 7、build、py_compile 28 文件过。
**发现项**：无。
**不确定点**：① token_hint 存明文末 4 位用于列表辨识（哈希之外唯一保留的令牌衍生物，64 位十六进制随机下无实际泄密面），如 Cowork 认为违背"只存哈希"字面可去掉；② 防重放窗口对"过去"与"未来"对称 ±300s；③ 快照估值不做汇率换算（v1 规格），非 USD 行为灰显不入合计。
**手动验收提示（用户）**：本机开 Gateway 跑 `push_snapshot.py` 推一次→云端 /connect 看快照与时间戳→关 Gateway 页面仍显示快照+过期标注→Settings 吊销令牌后再推被拒。
**子代理使用**：0 个。

---

## [CC → Cowork] TL-DEPLOY-001 · AWS 返修完成 · DELIVERED（二次交付）

**按返修单逐项**：
1. **CI**：`.github/workflows/deploy.yml` 重写——GitHub **OIDC**（`AWS_DEPLOY_ROLE_ARN` secret + `AWS_REGION`/`AWS_ACCOUNT_ID` variables，零长期密钥）→ ECR 登录 → 推 `:sha` 与 `:latest`；部署触发选 **App Runner 对 :latest 的自动部署**（少一个显式环节，理由注明），CI 保留健康检查轮询验证落地。
2. **infra**：`azure-provision.sh` 已删除，新 `infra/aws-provision.sh`（分步指南体，用户亲手执行）：第 0 步**先设 Budgets $20/月告警**、ECR、OIDC 角色与信任策略模板（限定 repo:main）、默认 VPC 双安全组（DB 仅收 App SG 5432）、RDS PostgreSQL 17 db.t4g.micro/20GB **不对公网开放** + 托管主密码、SSM SecureString 机密清单、App Runner 服务（0.25vCPU/0.5GB、端口 8000、健康检查 /api/health、**自动伸缩 max=1**、VPC connector、SSM secrets 引用、ECR 自动部署）、自定义域（证书验证 CNAME + 裸域 ALIAS + www CNAME，**Resend 记录不动**警示保留）、EventBridge 定时同步三件套。区域 us-east-2 变量化，整体可切 us-east-1。
3. **DEPLOY.md** 全文改写为 AWS：11 步用户操作清单（信用卡开户、预算告警先行、IAM/OIDC 最小权限、SSM、App Runner、域名、EventBridge）、机密清单（SSM /tradelens/* 前缀含新增 job-secret）、发布与迁移语义、回滚（旧 sha 重打 :latest）、看日志、轮换、**费用检查点含 RDS 免费档 12 个月到期后 $12-15/月的估算与贴线预警**、本地开发不变。
4. **DATA-004 Job 承载修订（选首选项）**：新端点 `POST /api/jobs/sync-flex`——`X-Job-Secret` 头认证（`JOB_SECRET` env，constant-time 比较，未配置恒 401；非 session 通道，仅此一权）；**202 立答 + 后台线程跑全量 sweep**（EventBridge API destination 超时以秒计，而 sweep 可达分钟级——此为端点方式与超时约束的兼容解，无需 Fargate 备选，理由注明）；并发锁防重入；幂等由 (user,source,externalId) 去重兜底，双触发无害。`flex_service.sync_all_connections` 抽为共享核心，`sync_job.py` 保留为本地/手动 CLI 同一代码路径。
5. **迁移时序复核**：App Runner 滚动部署下入口迁移语义已复核——自动伸缩 max=1 保证至多一实例执行 upgrade；发布窗口内旧实例短暂以旧代码跑新 schema，现有迁移全为加法式可容；扩伸缩前需先挪 CI 一次性步骤（入口脚本注释与 DEPLOY.md §3 双处说明）。**保留不动清单与审阅一致**：Dockerfile/.dockerignore/entrypoint（仅注释按 App Runner 更新）、生产配置分离、同源 API_BASE、/connect 降级横幅。
**自检（自动化证据）**：py_compile 全过；`aws-provision.sh` bash -n 过；job 触发端点三态实测（未配置 401 / 错误头 401 / 正确头 202 且后台 sweep 执行、二次触发防重入）；TL-DATA-004 冒烟 27/27 与 TL-DATA-005 冒烟 21/21 重跑全过（sync 核心抽取零回归）；build 过。
**发现项**：无。
**不确定点**：① App Runner「暂停时计费」与最新免费额度条款请用户在控制台按当期页面核对（文档已提示）；② EventBridge API destination 的 invocation timeout 官方值未在本机核实，端点已按最坏情形设计（立答 202），即使数秒超时也不影响正确性；③ Namecheap 裸域用 ALIAS 记录类型（其 BasicDNS 支持），若用户面板无此类型再议 www 主导方案。
**子代理使用**：0 个。

---

## [CC → Cowork] TL-DATA-005 · 实现完成 · DELIVERED

**改动**
- 迁移 `574c9acfd854`：`watchlist_items`（user_id FK、symbol、sort_order、唯一 (user_id,symbol)）；重放通过。上限 30 在 API 层报 `watchlist_full`。
- 新 `quotes.py`：`QuoteProvider` 接口（get_quotes/market_open/search）+ `AlpacaProvider` 实现——REST snapshots（`feed=iex`）；密钥 env `ALPACA_KEY_ID/ALPACA_SECRET` 仅服务端（缺失报 `quotes_not_configured`）；**进程内 TTL 缓存**：开市 20s、休市 600s（D-020 不建表），市场时钟走 /v2/clock 缓存 60s、失败保守视为休市；归一化输出 `{price, prevClose, change, changePct, time, status[ok/unavailable], feed:"iex"}`——退市/未知标的回 unavailable 而非陈旧数字；符号搜索用 assets 全表 24h 缓存内前缀+名称子串匹配（服务端代理，密钥零下发）。
- 端点：`GET /api/quotes?symbols=`（规范化大写、去重、正则滤杂、上限 60/请求，响应带 marketOpen）、`GET /api/symbols/search?q=`、watchlist CRUD（满 30→`watchlist_full`、重复→409 `watchlist_duplicate`）与 `PATCH /api/watchlist/reorder`。删号级联清 watchlist（auth.py）。
- 前端：可复用 `WatchlistCard`（挂 /connect，TL-FEAT-009 将再挂 Home）——防抖搜索下拉、加/删/上下移排序、最新价与当日涨跌（正负色）、**"IEX 实时"徽章常显**（D-020 禁称全市场/NBBO）、休市显示前收+已收盘徽章、不可用标的显示不可用态、未配置密钥显示说明；**订阅集=日志持仓 ticker ∪ 自选去重**，REST 30s 轮询（页面隐藏时跳过）。CSS 新 `quotes.css`。i18n +13 键 × 7（现 478 键）。DEPLOY.md Secrets 清单补 alpaca 两键。
**自检（自动化证据）**：冒烟 21/21——归一化字段与 IEX 标注、未知标的 unavailable、**缓存 TTL 单测**（开市 20s 内命中缓存零 http、过期重取、休市 60s 后仍命中长 TTL）、搜索前缀优先与不可交易剔除与名称子串、endpoint 符号规范化去重滤杂、加自选规范化、重复 409、坏符号 400、**满 30 报 watchlist_full**、重排序生效、跨用户隔离（他人列表空、删他人 404）、删号级联、**假密钥在全部响应中零出现**；迁移重放、i18n 478 × 7、build、py_compile 过。
**发现项**：无。
**不确定点**：① 符号搜索实现为 assets 全表内存缓存（24h TTL）上的本地匹配——官方 assets 端点无搜索参数，此法首请求较重但换来真实的名称搜索，已注明；② 盘前盘后归一化：price 取最新 IEX 成交、prevClose 取前日线收盘，涨跌一律相对前收（口径简单一致），UI 由 marketOpen 徽章区分状态。
**手动验收提示（用户）**：真实 key 写入本地 .env（ALPACA_KEY_ID/ALPACA_SECRET）后到 /connect 加自选看实时价与涨跌、休市徽章、手机端。
**子代理使用**：0 个。

---

## [CC → Cowork] TL-DATA-004 · 实现完成 · DELIVERED

**改动**
- 迁移 `f7ef9c56edb7`：`broker_connections`（user+provider 唯一、encrypted_token 只存密文、token_mask 存末 4 位供展示、query_id/date_format/status[active/expired/error/disconnected]/last_sync_at/next_sync_at）与 `sync_runs`（kind[initial/manual/scheduled]、起止、状态、added/skipped/failed、error_code；90 天机会式修剪）；重放通过。
- 重构 `trade_import.py`：从 api.py 抽出 bulk_import 核心（语义零变化：D-010 去重 + 并发重试一次），api 端点与定时任务共用同一入库管线；api.py 原函数改薄委托。
- 新 `flex_service.py`：**可恢复加密**（Fernet，主密钥 env `FLEX_TOKEN_KEY`，本地 .env 用户自生成、生产走 Secrets；缺失时优雅报 `flex_key_missing` 不裸奔）；Flex XML 解析为前端 flex.js 的 Python 等价（仅 STK、负数量/负佣金、`20260302;093105` 时间）；`fetch_statement`（SendRequest→GetStatement 轮询，1004/1019/1018 指数退避 2,4,8,16s，官方错误码映射稳定可翻译码：`flex_token_expired`[1012/1013/1015]、`flex_query_invalid`[1003/1020/1021]、`flex_not_ready`、`flex_rate_limited`、`flex_unreachable`）；`run_sync`（解密→抓取→解析→**复用 pairing.pair_executions 同一 FIFO**→bulk_import 幂等入库→SyncRun 记录→连接状态机维护，token 明文用后即弃）。
- 端点（api.py，全部按用户隔离）：GET/POST/PATCH/DELETE `/api/broker/connections[...]`、POST `/test`（服务端发起、字段完整性校验、**token 永不回传**，响应只含 `****xxxx` 遮罩与行数统计）、POST `/<id>/sync`（首次=initial、此后=manual）、GET `/<id>/runs`。断开删除连接与其 runs（交易保留——属日志不属连接）。删号级联清 connections 与 runs（auth.py）。
- 每日自动同步：`sync_job.py`（ACA Container Apps Job 入口，本地可 `python sync_job.py`；连接间隔 6s 远低于官方 10/min；输出只有计数摘要零 token）；`infra/azure-provision.sh` 第 8 步给出 Job 开通命令（cron `0 9 * * 2-6` UTC = 美东工作日次日凌晨，符合官方"收盘后更新、次日取"指引；重跑同一 365 天 Query 靠去重兜底幂等——已批保守选项）；DEPLOY.md Secrets 清单补 `flex-token-key`。
- 前端：`BrokerCenter`（/connect 顶部）——目录卡（IBKR 可连，Schwab/Fidelity/Robinhood/Webull/E*TRADE/tastytrade 诚实标 Coming Soon 不伪装）；IBKR 设置流（只读说明 + 可展开五步 Client Portal 指南[启用 WS/字段清单/期间 365 天/日期格式/Token] + Token[password 输入]/Query ID/日期格式 + **Test Connection**[成功显遮罩+行数，字段缺失告警] + 保存并首次同步[结果含新增/跳过/坏行]）；已连接则状态卡（遮罩 Token、上次/下次同步、立即同步、更新 Token、两步确认断开、过期/出错横幅、同步历史表）。**D-019 落实**：存在活跃 Flex 连接时 Gateway 成交区导入按钮下线并显示"当日只读预览"横幅（查看保留）；手动 Flex 上传保留为无连接用户降级路径。
- Provider 契约：`models.CONNECTION_TYPES = flex_query|oauth|api_token|file_import|unsupported`（仅 flex_query 实现，其余留位）。CSS 进 connect.css；i18n +53 键 × 7（broker 段 + gatewayPreviewNote，现 465 键）。requirements +cryptography。
**自检（自动化证据）**：冒烟 27/27——加密往返且密文不含明文、缺钥优雅报错、stub http 下 1019→1004→成功且退避序列恰为 [2,4,8]、四个官方码映射断言、Test Connection 三态（成功含遮罩与 6 行统计/坏 token 400/坏 query 400）、创建连接只回遮罩且 DB 无明文、首次同步 5 笔配对入库（AAPL 拆 2 闭 + TSLA 平 1 闭 1 空头余仓 + NVDA 持仓）、**重跑同一报表 0 新增 5 跳过（幂等）**、B 对 A 连接 404 × 2、历史列表倒序、过期 token 同步→run error + 连接 expired、更新 token 复活、断开级联清 runs、删号级联、**日志卫生：假 token 明文在全部响应/输出/DB 密文中零出现**；回归 005/006/008 全绿（入库管线重构零回归）；迁移重放、i18n 465 × 7、build、py_compile 24 文件过。
**发现项**：无。
**不确定点**：① Test Connection 会真实消耗一次报表生成（官方无 dry-run 接口），限速由官方 10/min 约束覆盖；② 同步历史保留 90 天为规格值，修剪按用户在每次同步后机会式执行；③ ACA Job 的实际开通依赖 DEPLOY-001 用户步骤完成，命令已在 provision 脚本第 8 步；④ date_format 目前存储并展示，解析端对两种格式都容错（解析器按分隔符归一），如未来 Query 配置出现第三种格式再扩。
**手动验收提示（用户）**：真实 Token 走通配置→测试→365 天首同步→次日自动同步→立即同步→更新 Token→断开；Gateway 区确认变当日预览。
**子代理使用**：0 个。

---

## [CC → Cowork] TL-FEAT-008 · 实现完成 · DELIVERED

**改动**
- 迁移 `1bdf8c94ad63`：新表 `user_profiles`（user_id 主键 FK、experience、account_types/assets/goals JSON、primary_broker、referral_source 可空、onboarding_completed_at、current_step、is_legacy、created_at）；**升级时既有用户回填 is_legacy=true**（老用户获得一次性可跳过引导）；重放通过。无敏感字段（收入/净资产/风险承受度一律不收集）。
- 后端：`models.UserProfile` + `User.profile` 关系（joined + delete-orphan 级联）；`User.to_json` 增 `onboardingCompleted`/`onboardingLegacy` 两个守卫输入（附着于 /me，未改任何 auth 端点逻辑）；`api.py` 新增 GET/PATCH `/api/profile`（词表白名单：experience 5 值、账户类型 4、资产 7、目标 5、来源 5、券商 10；多选滤未知值去重；currentStep 0-8 夹取）与 POST `/api/profile/complete`（幂等，首个时间戳为准）；`seed.py` 增 `ensure_onboarded`——demo/admin 直接置完成（幂等回填，同 TL-BUG-001 模式）；删号级联经 delete-orphan 清 profile。
- 守卫集中一处：新纯函数 `utils/gate.js`（loading→login→verify→onboarding→ok，verify 语义未动且优先于 onboarding），`ProtectedRoute` 只渲染其结论；`/onboarding` 路由与 /verify 同模式（ProtectedRoute 外、自带检查、完成后永不再入）。
- 前端流程：`OnboardingPage` 8 步（欢迎/经验/账户类型多选/主要券商目录含其他与暂不/资产多选/目标多选/**来源可跳过**/连接券商[去 /connect 或稍后]），进度条(data-step 档位纯 CSS)、返回、继续、右上「保存并退出登录」安全退出；**每步 PATCH 落库、刷新或重登按 currentStep 断点续走**；老用户欢迎步显示「跳过引导」（=标记完成）；答案存英文 slug（`utils/profileOptions.js` 唯一词表源），UI 翻译展示。Settings 新增「交易偏好」卡（`TradingPreferences`：五组 chips 编辑同一词表，referral 一次性问题不重编）。视觉全为 TradeLens 自有体系，未复制任何 TradeZella 素材；窄屏单列。
- `AuthContext` 增 `refreshUser`（完成引导后刷新守卫状态免整页刷新）。CSS 新 `onboarding.css` + settings pref 样式；i18n +55 键 × 7（onboarding 51 + settings 4，现 412 键）。
**自检（自动化证据）**：迁移重放通过（既有 4 用户回填 legacy 验证）；守卫矩阵单测 7/7（restoring/匿名/未验证/新账号/老账号/已完成/未验证优先级）；HTTP 冒烟 19/19——五态 /me 数据（新账号未引导、legacy 标志、未验证无时间戳、demo 已完成）、未验证访问 profile 403、分步保存与断点续走、多选滤杂去重、非法值 400、step 夹取、complete 幂等、/me 翻转、legacy 跳过即完成、**删号含 profile 级联**；回归 TL-FEAT-006 26/26、TL-FEAT-005 17/17；i18n 412 × 7 一致；build、py_compile 20 文件过。
**发现项**：实现中发现并修复一处真实缺陷——`User.profile` 关系默认级联会在删号时试图将 user_profiles 主键置空（AssertionError 500），已改 delete-orphan 并去除重复批删，冒烟覆盖。
**不确定点**：① 安全退出实现为「保存并登出」（守卫使未完成者无法游走应用内，退出=登出，进度已逐步落库）；② 完成后落地页暂为 `/`（现指 /library），TL-FEAT-009 将改指 /home，届时无需回改本任务代码。
**子代理使用**：0 个。

---

## [Cowork → CC] TL-FEAT-006 · 审阅 · ACCEPTED

**独立验证**：迁移 039c5b72c6da 共享域/用户域两条部分唯一索引与 NULL=共享语义落实；api.py 用户级标签端点齐（本人优先解析、他人 404、共享 403）；TagPicker/TagManager 在位且零 inline style；py_compile 19 文件、build、键集一致（465 × 7，含后续交付累计）全过；26 项冒烟含跨用户隔离与删号级联，覆盖面好。三层结论：规格全覆盖未越界 / 对抗面（可见性、409 域、级联）扎实 / TagPicker 录入编辑双入口是一致性收益。
**裁决**：① 录入表单同步获得 TagPicker——接受；② 标签筛选沿用客户端窗口内过滤（与现有筛选器同构）——接受，服务端 tagId 过滤保留为后续升级路径；③ 大小写并发变体极端场景——接受，注释已诚实说明，风险与代价不成比例。
**待用户验收**：打标/移标、按标签筛选、Settings 管理自有标签、共享标签只读、（可选）双账号隔离。

---

## [Cowork → CC] TL-FEAT-007 · Tag 切片追加审阅 · ACCEPTED

**独立验证**：ReportsPage tagSliceLabel 控件在位，切片先于全部指标生效并与 Playbook AND 组合，口径未动（metrics 单测 25/25 无变化）。下拉而非分段按钮的呈现选择——接受，理由充分。**待用户验收**：选一个标签看全指标联动。核心部分此前已 USER_VERIFIED，切片验收后整体 CLOSED。

---

## [Cowork] TL-DEPLOY-001 · 用户决策变更：Azure → AWS（2026-07-15）

用户在 CC 交付 Azure 版工件后改选 AWS（知悉已就绪状态与信用卡要求后确认）。部署模式同步调整为：**云端操作由用户亲手执行、Cowork 领路指导；CC 仅负责代码与脚本工件**。Azure 版交付的质量无异议，返修性质为方向变更而非缺陷。

---

## [Cowork → CC] TL-DEPLOY-001 · CHANGES_REQUESTED（AWS 转向返修单）

**保留不动（云无关，审阅确认可复用）**：Dockerfile/.dockerignore/docker-entrypoint.sh（含迁移启动步骤与 RUN_SEED）、config.py/app.py 生产配置分离（COOKIE_SECURE/TRUST_PROXY/SPA 伺服/www 301）、前端同源 API_BASE 适配、/connect 降级横幅、gunicorn 依赖。
**返修项**：
1. CI（.github/workflows/deploy.yml）：推送目标 GHCR → **Amazon ECR**（App Runner 不支持 GHCR），部署步骤 `az containerapp update` → App Runner 触发（`aws apprunner start-deployment` 或 ECR push 自动部署），AWS 凭据走 GitHub OIDC（优先）或 Secrets。
2. `infra/azure-provision.sh` → `infra/aws-provision.sh`：ECR 仓库、App Runner 服务（0.25vCPU/0.5GB 起步，环境变量与密钥经 App Runner 配置或 SSM Parameter Store）、RDS PostgreSQL 17 免费档（db.t4g.micro/20GB，公网关闭、仅 App Runner 连接器或安全组收敛）、自定义域绑定（App Runner custom domain + Namecheap CNAME/验证记录，**不得触碰 Resend 记录**）。区域 us-east-2（Ohio，近芝加哥）首选，SKU 不可用整体回退 us-east-1。
3. `docs/DEPLOY.md` 改写为 AWS 流程与用户操作清单（含信用卡开户、预算告警设置 Budgets $20/月、IAM 最小权限用户/OIDC、费用检查点）。
4. **DATA-004 Job 承载修订**：每日 Flex 同步的 ACA Job 引用改为 AWS 等价——首选 **EventBridge Scheduler 定时 HTTPS 调用应用的内部同步端点**（端点用专用 job secret 头认证，非 session；简单、零新容器）；若 CC 评估该端点方式与幂等/超时约束冲突，备选 ECS Fargate Scheduled Task 共享镜像，二选一注明理由。
5. 迁移与 seed 的执行位置说明按 App Runner 单实例语义复核（entrypoint 迁移在 App Runner 部署时同样恰一次？若滚动部署存在双实例窗口，改为 CI 一次性迁移步骤，注明选择）。
**停止条件沿用批次十条**（成本线 $20/月含 RDS 免费档到期后的估算须写入 DEPLOY.md）。完成后同一 Task ID 交付。

---

## [CC → Cowork] TL-DEPLOY-001 · 实现完成（CC 侧）· DELIVERED，上线待用户 8 项操作

**改动**
- 容器化：根目录多阶段 `Dockerfile`（node22 构建 dist → python3.13-slim + gunicorn 运行层，`src/mock` 随层拷贝供 seed）；`.dockerignore` 硬排除 `backend/.env`、venv、node_modules（密钥零入镜像）；`docker-entrypoint.sh`——**Alembic 迁移作为部署显式步骤在容器启动时执行**（单副本 min=max=1 保证每次发布恰一次迁移，注释注明扩副本前必须改为 CI 一次性 Job），`RUN_SEED=1` 一次性生产初始化开关。
- 生产配置分离（`config.py`/`app.py`，本地默认全关零影响）：`COOKIE_SECURE`（FRONTEND_URL 为 https 时自动开）、`TRUST_PROXY`（ProxyFix 一跳，OAuth 回调与 Secure cookie 见真实 https）、`SESSION/REMEMBER_COOKIE_SECURE`；Flask 伺服 `../dist` + SPA fallback（仅 dist 存在时注册；`/api/*` 未知路径回 JSON 404 不吐 index.html）；**www→裸域 301**（规范主机名自 FRONTEND_URL 派生，本地永不触发）。
- 前端同源适配：`services/auth.js` 的 API_BASE 在非本地主机自动改为同源相对路径（本地 Vite 流程照旧走 127.0.0.1:5001）——云端可用性的必要修正，属规格"生产配置分离"的直接推论。/connect 实时区在非本地主机显示"需本地环境"降级横幅并停用探测与连接按钮（D-019 预备），Flex 上传区不受影响；i18n +1 键 × 7（357 键）。
- CI/CD：`.github/workflows/deploy.yml`——push main → GHCR 构建推镜像（内建 GITHUB_TOKEN）→ `az containerapp update` → 生产健康检查轮询。镜像仓库选 **GHCR**（已知未知裁决：零额外 Azure 资源费用、CI 鉴权内建，ACA 只需一条 read:packages 凭据，已注明）。
- 开通与运维：`infra/azure-provision.sh`（分步资源开通：RG/PG B1ms 32GB 无 HA v17/ACA env/App 单副本 0.5vCPU 1Gi/防火墙/Secrets 模板/域名绑定步骤，全程无密钥值，NCUS 变量化可整体切 eastus）；`../docs/DEPLOY.md` 运维手册（首次部署顺序、Secrets 清单只列名、发布与迁移、回滚到旧镜像、看日志、Secrets 轮换、费用检查点、本地开发不变声明）。`requirements.txt` +gunicorn。
**自检（自动化证据）**：本机无 docker（记录在案），关键假设改用 gunicorn 直跑等价验证全过——`/api/health` 200、`/` 返回 index.html、哈希资产 200、SPA 路由 `/journal` fallback 到 index、`/api/nonexistent` 回 JSON 404、`Host: www.…` 带 path+query 301 到规范域。两个 shell 脚本 `bash -n` 语法过；py_compile 19 文件过；i18n 357 × 7 一致；vite build 过；本地 dev 通路未动（start.sh 未改，SPA 伺服仅 dist 存在时注册）。
**发现项**：前端 API_BASE 原实现写死 127.0.0.1:5001，同源部署下云端必然全挂——已按上述修正，请 Cowork 审阅该行为变化（本地行为不变）。
**不确定点**：① Docker 本机未装，`docker build/run` 首验证点由两路替代：gunicorn 等价验证（已过）+ 首次 CI 构建即真实 docker 构建；如需本机复验请装 Docker Desktop 后跑 `docker build -t tradelens . && docker run -p 8000:8000 --env-file backend/.env tradelens`。② PG 防火墙用"允许 Azure 服务"规则（B1ms 无 VNet 集成下最简可靠），比"仅应用出口 IP"宽，收紧路径已在脚本注明。③ minReplicas=1 而非 0（迁移时序 + 免冷启动），费用影响已写入 DEPLOY.md §7。
**子代理使用**：0 个。

**【用户操作清单——上线前依序完成，详见 ../docs/DEPLOY.md §1】**
1. Azure for Students 开通 + `az login`。
2. GitHub 仓库 Secrets 添加 `AZURE_CREDENTIALS`（service principal，创建命令见 workflow 头注）。
3. push main（或手动触发 Actions）让镜像入 GHCR。
4. 分步执行 `infra/azure-provision.sh`（需先在 shell 设 GHCR_USER/GHCR_PAT）。
5. 按脚本第 6 步填 Secrets 与环境变量（值只进 Azure，不进聊天与代码）。
6. 首启 `RUN_SEED=1`，完成后移除；admin 密码用新强随机值。
7. Google Console 新增生产回调 `https://mytradelens.app/api/auth/google/callback`（保留本地条目）。
8. Namecheap 新增 TXT/A/CNAME（**不得触碰 Resend 既有记录**），传播后绑定托管证书。

---

## [CC → Cowork] TL-FEAT-006 · 实现完成 · DELIVERED

**改动**
- 迁移 `039c5b72c6da`（tags user scope）：tags 加 `user_id`（nullable FK→users，NULL=共享模板）；删全局 `tags_label_key` 唯一约束，建两条部分唯一索引（共享域 label WHERE user_id IS NULL；用户域 (user_id,label) WHERE user_id IS NOT NULL）+ user_id 普通索引。既有 9 个共享标签原位保留。downgrade 恢复全局唯一并删除用户域标签及其 trade_tags（数据损失已在迁移 docstring 注明，系该特性的忠实逆操作），upgrade/downgrade/upgrade 重放通过。
- 后端 `api.py`：`_normalize_label`（trim/折叠空白/40 截断）+ `_find_visible_tag`（共享+本人域内大小写不敏感查找，本人优先）；`_tags_for_labels` 改为按用户解析，未知标签**创建为本人标签**，列表内大小写不敏感去重。GET /api/tags 只返回共享+本人；新增用户级 POST /api/tags（409 tag_exists）、PATCH/DELETE /api/tags/<id>（他人 404 不可见、共享 403 只读、删除级联清 trade_tags）。GET /api/trades 加 `tagId` 过滤（基查询已限本人交易，他人 tagId 天然返回空）。admin/tags 端点未动。`models.Tag` 加 user_id 与部分索引定义、to_json 加 `shared` 标志。`auth.py` 删号级联补本人标签及其 trade_tags（否则 FK 阻塞删除，属规格的直接推论）。
- 前端：新 `TagPicker`（chips + 已有标签下拉 + 自由输入新建，客户端镜像同一规范化）挂入共享 `TradeFormFields`——录入表单与编辑弹窗同时获得打/移标签；`formToPayload` 带 tags（PATCH 全量替换标签集）；编辑弹窗脏检查改深比较（tags 为数组）。TradeRow ticker 旁显示标签 chips。Journal 筛选器加标签下拉（含"无标签"项，选项取自已加载窗口，模式与 playbook 筛选一致）。Settings 新增「交易标签」卡（`TagManager`：本人标签改名/两步确认删除/新建，共享标签只读 chips 展示）。DataContext 加 createTag/renameTag/deleteTag/refreshTags；改名与删除同步就地修正已加载交易的标签数组（不重置分页窗口）；带标签保存交易后后台刷新标签列表。
- CSS 进 journal.css/settings.css；零 inline style。i18n +19 键 × 7。
**自检（自动化证据）**：迁移重放通过（downgrade 后仅剩 tags_label_key，重升后部分索引齐且 9 共享标签原数）；HTTP 冒烟 26/26——规范化建标、本人域/共享域大小写不敏感 409、他人同名可建、可见性隔离（A 不见 B、共享计数吻合）、改名成功与两类 409、共享标签 PATCH/DELETE 403、他人标签 404、打标签混合（共享+本人+新建+列表内去重）、新标签归本人、tagId 过滤命中与跨用户空结果、PATCH 替换标签集、删本人标签后交易同步清空、admin 建/删共享标签与用户可见、删号级联清标签与关联且共享标签数不变。回归：TL-FEAT-005 冒烟 17/17、TL-BUG-001 冒烟 10/10、metrics 单测 25/25 全过；i18n 356 键 × 7 一致；build 过；py_compile 19 文件过。
**发现项**：无。
**不确定点**：① 录入表单（TradeForm）也获得 TagPicker——规格写"编辑表单与 TradeRow"，因字段组件共享，录入侧同步获得，视为一致性收益，如需隐藏一行 prop 即可。② Journal 标签筛选沿用现有客户端窗口内过滤模式（与 from/to/ticker/playbook 一致）；服务端 tagId 过滤已实现并被冒烟覆盖，UI 暂未接（避免混合两种过滤语义），如需改为服务端筛选请裁决。③ 部分唯一索引对 label 精确大小写唯一，大小写不敏感唯一由应用层规范化保证（并发窗口下极端可产生大小写变体重复，IntegrityError 兜底不了跨大小写场景），已注释说明。
**子代理使用**：0 个。

---

## [CC → Cowork] TL-FEAT-007 · Tag 切片追加交付 · DELIVERED（追加）

**改动**：Reports 页新增标签切片下拉（选项=该用户交易中实际使用的标签，含共享与本人；空选项集时不渲染控件，无残缺入口）。切片在**全部指标之前**生效（经典四卡与 Reports 2.0 全部新指标、曲线、月度、多空、Ticker 表一体过滤），并与 Playbook 选择器 AND 组合。口径不变（仅已平仓、net of fees，D-017）；纯客户端过滤（D-011），无新纯函数、无 API 变化。CSS 进 reports.css；i18n +1 键 × 7（tagSliceLabel，与 006 的 19 键合计 +20 × 7，现 356 键）。
**自检（自动化证据）**：build 过；键集 356 × 7 一致；metrics 单测 25/25（无口径变化）。切片正确性由纯函数输入过滤保证（与 playbookId 切片同构，后者已有用户验收）。
**发现项**：无。**不确定点**：切片控件用下拉而非分段按钮（标签数可能远多于 playbook，分段按钮会溢出），呈现选择权按批次说明归 CC，记录备查。
**子代理使用**：0 个。

---

## [Cowork → CC] TL-FEAT-008 · 新用户 Onboarding · APPROVED

**风险等级**：High（含迁移 + 首登路由守卫变更）
**背景**：用户 2026-07-14 批准；流程固定为 注册 → 验证/Google → **首次登录 Onboarding** → Home。
**事实与未知**：已确认——models.py 无 profile 类表（证据：全文件仅 users/auth/数据八表）；/verify 闸门已在 ProtectedRoute。关键假设——onboarding 守卫叠加在 verified 判定之后（顺序：未验证→/verify；已验证未完成引导→/onboarding；否则→目标页）。最可能 UU——与 OAuth 回调落地页的交互、老会话中途升级；处理原则：守卫逻辑集中一处，勿散落各页。
**In Scope**：新表 `user_profiles`（user_id 唯一 FK 级联删；experience、account_types JSON、primary_broker、assets JSON、goals JSON、referral_source 可空、onboarding_completed_at、current_step；Alembic 迁移可重放）。分步页面（TradeLens 自有视觉）：①欢迎 ②交易经验（尚未开始/<1 年/1-3/3-5/5+）③账户类型（个人资金/Prop Firm/模拟/尚未开始，多选）④主要券商（目录选择，含"其他/暂不"）⑤交易资产（股票/ETF/期权/期货/外汇/加密/其他，多选）⑥目标（记录交易/分析表现/改善纪律/跟踪策略执行/定期复盘，多选）⑦如何了解到（**可选可跳过**）⑧连接券商（立即去连接 或 稍后）。进度条、返回、继续、安全退出；每步落库、刷新/退出断点续走；完成后不再进入；Settings 增"交易偏好"编辑入口。老用户：首次进入新版见一次性可跳过引导（跳过=标记完成）；demo/admin seed 直接置完成。不收集收入/净资产/风险承受度等敏感信息。账户删除级联清 profile（并入 TL-FEAT-004 级联清单）。
**Out of Scope**：券商真实连接（仅跳转 004 的入口）；评分。**Do Not Touch**：/verify 闸门语义、auth 端点。
**自动化验收**：迁移重放；守卫矩阵冒烟（未验证/未引导/已完成/demo/老用户五态 × 目标路由）；键集/build/py_compile。**手动验收（用户）**：新账号全流程走查含中途退出续走、跳过⑦、Settings 修改；老账号一次性提示；手机端走查。
**停止条件**：守卫需改动认证架构时。

---

## [Cowork → CC] TL-DATA-004 · Broker Connection Center + IBKR Flex 自动同步 · APPROVED

**风险等级**：High（凭据加密 + 外部 API + 迁移 + 定时任务）
**背景**：用户 2026-07-14 批准"统一券商连接体验"（统一操作流，不是统一凭据机制）。
**事实与未知**：已确认——Flex WS 官方规则已核（2026-07-12：token 6h-1 年、限速 1/s 与 10/min、Activity 每日收盘后更新宜次日取、生成延迟需重试 1004/1019、错误码表全）；现有解析在前端 flex.js，服务端需 Python 等价实现（复用 pairing.py 与 _bulk_import，证据：api.py `import/flex` 已走该管线）；requirements 无加密库。关键假设——`cryptography`(Fernet/AES-GCM) 加密 Token，主密钥来自 ACA Secrets 环境变量（本地开发用 .env 变量名 `FLEX_TOKEN_KEY`，值用户自生成），**可恢复加密而非哈希**（后台同步要用）。最可能 UU——Flex 报表字段随查询模板差异、大报表分页/超时、用户 Query 未按指南配置字段；处理：Test Connection 阶段做字段完整性校验并给稳定错误码。
**In Scope**：
- Provider/Adapter 契约：`connection_types = flex_query | oauth | api_token | file_import | unsupported`；Broker Catalog（IBKR=flex_query 可用；其余主流券商列出但标 **Coming Soon** 或 仅文件导入，不伪装可连）。
- 迁移：`broker_connections`（user_id FK 级联删、provider、connection_type、**encrypted_token**、query_id、date_format、status[active/expired/error/disconnected]、last_sync_at、next_sync_at、created_at；user+provider 唯一）与 `sync_runs`（复用 DISC-002 §4 定义：kind、起止、状态、added/skipped/failed、error_code；90 天修剪）。
- IBKR 连接页（左右分栏或步骤式）：①说明"只读报表同步，非 IBKR 账号密码登录"②可展开的 Client Portal 配置指南（启用 Flex WS、生成 Token 选有效期、建 Activity Flex Query 所需字段清单与 Date Format、期间设 Last 365 Calendar Days）③输入 Token/Query ID/日期格式 ④**Test Connection**（服务端发起，校验 + 字段完整性，Token 永不回传前端，响应只含遮罩摘要如 `****1234`）⑤首次同步（既定 Query 期间=最近 365 天）带进度与新增/跳过/失败 ⑥状态区：上次/下次同步、立即同步、更新 Token、断开连接、Token 过期/失效告警、同步历史（sync_runs）。"稍后连接"随时可退出。
- 每日自动同步：ACA **Container Apps Job**（依赖 TL-DEPLOY-001 镜像与 Secrets），美东工作日取上一营业日 Activity 数据（重跑同一 365 天 Query，幂等去重兜底——保守可逆选择，已注明）；限速与 1004/1019 指数退避重试；错误码稳定可翻译（`flex_token_expired`/`flex_query_invalid`/`flex_not_ready`/`flex_rate_limited` 等映射官方码表）。
- **D-019 落实**：连接激活后，/connect 的 Gateway 成交区切换为"当日只读预览"，导入按钮下线（保留查看）；Flex 为唯一入库通路。
- 安全硬性：Token 不入前端持久存储/日志/HANDOFF/错误正文/测试输出；按用户隔离；账户删除级联清 connections 与 runs；同步幂等（(user,source,externalId) 兜底）。
**Out of Scope**：多券商真实 API、OAuth 适配器实现（仅留契约位）。**Do Not Touch**：D-003/D-010；现有手动 Flex 上传保留（作无连接用户的降级路径）。
**自动化验收**：迁移重放；加密往返单测（密钥缺失时优雅报错不裸奔）；Test Connection 三态（成功/坏 token/坏 query）模拟；首次同步与重跑幂等（零重复）；限速重试模拟；日志卫生扫描（token 明文零出现）；删除账户级联；键集/build/py_compile。**手动验收（用户）**：真实 Token 走通全流程（配置→测试→365 天首同步→次日自动同步→立即同步→更新 Token→断开）；Gateway 区确认已变当日预览。
**停止条件**：见批次停止条件（尤其加密可恢复性与 $20/月成本线）。

---

## [Cowork → CC] TL-DATA-005 · 行情与自选股（Alpaca IEX） · APPROVED

**风险等级**：High（外部 API + 迁移）
**背景**：TL-DISC-002 已批（D-020：REST 轮询 30s、QuoteProvider 解耦、密钥零下发）。
**事实与未知**：已确认——Alpaca Basic 免费档 IEX 实时、WS 30 标的上限、REST 200/min（官方 2026-07-12 核，实施时超 4 周需复核）。关键假设——单进程内存缓存足够（D-020，不建 quote 表）。最可能 UU——盘前盘后与休市字段行为、退市标的响应；处理：QuoteProvider 统一归一化并带 status 字段。
**In Scope**：服务端 `QuoteProvider` 接口 + Alpaca 实现（REST snapshot，密钥走 Secrets/.env 变量名 `ALPACA_KEY_ID/ALPACA_SECRET`）；短 TTL 内存缓存（开市 15-30s、休市 10min）；订阅集=持仓∪自选去重；迁移：`watchlist_items`（user_id FK 级联删、symbol、sort_order、唯一 (user_id,symbol)、上限 30 超出报 `watchlist_full`）；端点：`GET /api/quotes?symbols=`、`GET /api/symbols/search?q=`（服务端代理）、watchlist CRUD；UI：自选区（搜索、增删、排序、最新价、今日涨跌、**"IEX 实时"标识**）+ 接入 Home 的自选卡与 /connect 或新投资组合页的行情列；失效/退市标的显示不可用状态。休市显示前收+已收盘徽章。禁止表述为全市场/NBBO 报价（D-020 口径标注）。
**Out of Scope**：WebSocket、SIP、期权外汇加密行情、未实现盈亏并入绩效。**Do Not Touch**：Reports 已实现口径（D-017）。
**自动化验收**：迁移重放；缓存 TTL 单测；上限与去重；搜索代理不泄密钥；键集/build。**手动验收（用户）**：真实 key 下加自选看实时价与涨跌、休市态标识、手机端。

---

## [Cowork → CC] TL-DATA-006 · 持仓快照与本地推送（设备令牌） · APPROVED

**风险等级**：High（新认证通道 + 迁移 + 财务数据）
**背景**：TL-DISC-002 已批：本地 Gateway 经设备令牌 HTTPS 推送快照，云端零 IBKR 凭据；页面永不把过期快照伪装实时。
**事实与未知**：已确认——ib_service 已能读账户/持仓（复用）；ConnectPage 现渲染原始 IBKR tag（本任务顺带清偿为七语译名映射）。关键假设——本地推送代理复用现有本地后端加推送模式（新 CLI 子命令或定时循环，用户本机运行）。最可能 UU——ACA ingress 对自定义认证头的处理、时钟偏差影响防重放窗口；处理：窗口取 ±5 分钟并允许配置。
**In Scope**：迁移：`portfolio_snapshots` + `position_snapshots` + `broker_sync_devices`（字段与保留策略按 DISC-002 §4：每日末条+30 天修剪、token 只存哈希、可吊销可过期）；端点 `POST /api/broker/push`（设备令牌 Bearer + timestamp+nonce 防重放，唯一非 session 端点，仅 push-snapshot 权限）；Settings 增设备令牌管理（创建一次性明文显示/吊销/最近使用）；本地推送模式（Gateway 在线时读取→推送，README 指引）；估值与展示按 D-020/DISC-002 §6 口径（双时间戳并列、混合时点标注、v1 USD 美股 ETF 其余降级显示不入合计）；快照区接入 Home 的 Open Positions"券商持仓快照"层与账户摘要卡（**七语言产品名映射替代 NETLIQUIDATION 等原始 tag**，技术映射写注释文档）。
**Out of Scope**：Gateway 云端化、任何自动登录方案。**Do Not Touch**：D-003；auth session 体系（设备令牌并行不混用）。
**自动化验收**：迁移重放；防重放三态（过期戳/重复 nonce/坏签）；他人令牌 401；修剪逻辑；键集/build。**手动验收（用户）**：本机开 Gateway 推一次→云端页面见快照与时间戳→关 Gateway 页面仍显示快照+过期标注→吊销令牌后推送被拒。

---

## [Cowork → CC] TL-FEAT-009 · Home Dashboard · APPROVED

**风险等级**：Medium（无迁移，UI 聚合既有数据；新纯函数沿用既定口径）
**背景**：用户 2026-07-14 批准 Home 为默认页；定位"今天最需要关注的"，非 Reports 复制品。
**事实与未知**：已确认——Reports 2.0 纯函数可复用（metrics.js 16 导出）；索引路由现指 /library（router.jsx:33，改指 /home）。关键假设——盈利日比例/平均盈利/平均亏损为 metrics.js 小幅新增纯函数，口径继续 D-017（仅已平仓、net of fees、固定样例扩展断言）。最可能 UU——卡片数据源就绪度参差；处理：**每张卡独立数据分层与空态**，绝不阻塞整页。
**In Scope**：新 `/home` 为登录默认路由与 Onboarding 完成落地页；顶部导航更新为 Home → 策略库 → 交易日志 → 绩效报表 → 实时/投资组合（命名可逆微调权在 CC）。区域：①顶部状态条（券商连接状态、只读徽章、上次导入/下次同步、立即同步、行情时间、快照时间、过期与 Token 告警——数据来自 004/005/006，各自任务负责接线，未就绪时本任务先以可用数据+空态占位，不做伪数据）②核心指标卡（净 P&L、胜率、Profit Factor、盈利日比例、平均盈利、平均亏损、Expectancy、最大回撤；全部已实现口径，未实现盈亏独立显示不混入）③累计已实现 P&L 曲线（复用 equityCurve）④Recent Trades ⑤Open Positions 分层（快照未就绪→Journal 未平仓并标注"日志持仓"；006 落地后叠加"券商持仓快照"层+时间戳）⑥本月 P&L 日历（按平仓日净额）⑦最近同步结果 ⑧今日复盘清单（当日已平仓未写 notes 的交易列表 + 一键去补记）⑨Onboarding/账户完成度卡（来自 008；连接券商、首笔交易、首次复盘三件套）⑩Playbook 使用情况（已采用/近 30 天使用分布）⑪待处理事项（导入失败、Token 过期、数据过旧聚合）。**TradeLens Score 本批不做**，以完成度+复盘完成度+待办数替代（呈现为朴素清单，不做综合评分）。普通账户禁用示例假数据；空账户各卡显示 CTA（连接券商/导入/记一笔）。
**Out of Scope**：任何新表；评分公式；Reports 页改动。**Do Not Touch**：Reports 口径与现有页面路由语义（除索引重定向）。
**自动化验收**：新指标纯函数固定样例断言（含全亏/空数据/单日多笔）；路由矩阵（未验证/未引导/正常/demo 落点）；键集/build。**手动验收（用户）**：demo 与真实账号的 Home 全卡走查、手机端、空账号 CTA、导航顺序。

---

## [Cowork → CC] TL-DEPLOY-001 · 云部署（Azure Container Apps + mytradelens.app） · APPROVED

**风险等级**：High（云部署 + 外部服务 + 凭据迁移 + DNS 不可逆操作；定级依据 COWORK_WORKFLOW §2.5）
**背景**：用户 2026-07-12 拍板（单容器 ACA；North Central US 首选，订阅不可用则**整体**回退 East US；PG Flexible Server B1ms、32GB、无高可用，优先使用账户实际提供的免费额度）。Discovery 见 ../docs/TL-DEPLOY-001_云部署Discovery.md。
**目标**：任何设备打开 https://mytradelens.app 可注册、收码、登录、使用全部现有功能；本地开发流程不受影响。

**事实与未知（Blind Spot Pass 结论，2026-07-12）**
- 已确认事实：域名 DNS（Namecheap）正承载 Resend 的 TXT/MX/DKIM 记录，**部署新增记录时绝不可删改它们**；同源部署下 cookie 体系零改造（D-001/D-013）；App Service F1 不支持自定义域（官方 Q&A，2026-07-12 核）；Azure for Students $100/12 月免卡（官方页，2026-07-12 核）；本任务**零 schema 迁移**（证据：全部改动为容器化与配置，models/migrations 不动）。
- 已知未知：学生订阅在 NCUS 对 ACA 与 PG Flexible 的 SKU 可用性（回退规则已定）；750 小时 B1ms 免费资格是否适用学生 offer（门户实测后择优）；镜像仓库用 ACR 还是 GHCR（CC 按摩擦最小选择并注明）。
- 关键假设：Flask 可伺服 Vite dist + SPA fallback 而无需架构改动（标准能力，实施首步验证）；gunicorn 单 worker 足够单用户流量；ACA 冷启动（若 minReplicas=0）对本应用可接受——实测超过约 10 秒则改 minReplicas=1 并注明成本。
- 最可能未知未知区域：容器内静态资源路径与 Vite base；https 下 OAuth 回调与 cookie Secure/SameSite 细节；PG SSL 连接串参数；ACA ingress 健康检查与端口；DNS 传播窗口。遇到即按"保守选项 + 记入交付发现项"处理。

**In Scope**
1. 多阶段 Dockerfile（node 构建 dist → python 运行层 gunicorn；Flask 挂静态目录 + SPA fallback 路由）；本地 `docker build/run` 跑通为第一验证点。
2. 生产配置分离：`FLASK_DEBUG=0`、cookie `Secure`、`FRONTEND_URL=https://mytradelens.app`、CORS 收敛为生产域、`DATABASE_URL` 强制 SSL；全部机密走 **Container Apps Secrets**（本地 .env 照旧，互不影响；CC 产出"需填 Secrets 清单"，值由用户在门户/CLI 填入，不经聊天与代码）。
3. Azure 资源开通（脚本或按序命令，`az login` 由用户完成，CC 不接触凭据）：资源组、镜像仓库、Container App（外部 ingress、目标端口、健康检查）、PG Flexible Server **B1ms/32GB/无 HA/NCUS**（防火墙仅允许应用出口），全部资源 NCUS；任一 SKU 不可用 → 整体切 East US。
4. 域名与证书：Container App 绑定 mytradelens.app + 托管证书；产出需在 Namecheap **新增**的记录清单（用户操作，明示不得动 Resend 既有记录）；www 301 到裸域。
5. Google OAuth 生产回调：CC 提供精确 redirect URI，用户在 Console 添加（本地 127.0.0.1 条目保留共存）。
6. CI/CD：GitHub Actions——push main → 构建 → 推镜像 → 更新 Container App；**Alembic 迁移作为部署流程中的显式步骤**（单实例时序，防并发迁移，实现方式注明）。
7. 生产初始化：迁移 + seed 一次（demo 保留；admin 密码用新的强随机值经 Secrets 注入）。
8. 云端 /connect 的 Gateway 实时区显示"需本地环境"降级提示（i18n 7 语，为 D-019 预备）。
9. `docs/DEPLOY.md` 运维手册：部署、回滚（上一镜像）、看日志、Secrets 轮换、费用检查点。

**Out of Scope**：行情/自选/持仓快照/Flex 自动同步（TL-DISC-002 各阶段，独立任务）；Key Vault（Secrets 起步够用）；多区域、HA、CDN、PWA。
**Do Not Touch**：本地开发链路（start.sh 必须照常可用）；Resend 的任何 DNS 记录；IB 只读（D-003）；数据库 schema（本任务零迁移）；`.env` 值（只列变量名清单）。
**依赖**：用户完成 Azure for Students 开通与 `az login`；Google Console 加回调；Namecheap 加记录。各步 CC 在 HANDOFF 或终端明确提示用户操作。

**自动化验收**：本地 docker 构建运行 + 健康端点 200；CI 全流程绿；py_compile/build/键集照常。
**手动验收（用户）**：手机蜂窝网络打开 https://mytradelens.app → 注册新账号 → 收到 noreply@mytradelens.app 的码 → OTP → 进应用；Google 登录走通；数据与另一设备一致；demo 可登且种子完整；证书有效；反向项——错密码 5 次限速在公网生效、登出后受保护路由弹回登录；本地 start.sh 环境照常工作。
**停止条件**：双区域 SKU 均不可用；发现需要 schema 改动；域名绑定被迫升级付费档使新增成本超约 $20/月；任何方案要求云端保存 IBKR 凭据；DNS 操作可能影响 Resend 记录时。
**不确定点处理**：可逆且局部的按保守选项继续并记录；涉及凭据、DNS、费用结构的暂停等 Cowork/用户。

---

## [Cowork] TL-PROC-003 · Finding Your Unknowns 工作流学习

**Status: PROPOSED**（候选建议，未生效，等用户拍板）
**已读**：Anthropic 原文（2026-07-06，Thariq Shihipar）+ 全部项目规程与三份 Discovery + 第 4 批全记录。
**当前覆盖结论**：文章方法的大半（Discovery/Spec 分离、scope 三件套、停止条件、Deviations 式不确定点记录、独立审阅、证据三层、拍板边界）已在 TL-PROC-001 体系中充分覆盖并有实证；缺口集中在四处——高危假设不显性（案例：标签"零迁移"误判）、口径样例无下发前自算（案例：PF=1.86 笔误）、视觉原型与官方 API 核查未成文、Blind Spot Pass 无正式动作。
**最重要候选改进（前 5）**：① 规格模板加「事实/已知未知/关键假设/最可能未知未知」节（High 必填）；② High 任务规格前 10 分钟 Blind Spot Pass 自查清单；③ "零迁移/复用现有"论断必须附字段级代码证据；④ 公式/口径任务固定他证样例+下发前脚本自算；⑤ 新页面级视觉决策先做多方向低成本原型。拒绝常态化：Explainer 独立产物、Quiz、独立 Unknowns Register（防形式主义，理由见报告）。
**Cowork 推荐采用强度**：平衡（上述五项，零新增文档，负担集中于 High 任务）；轻量与严格两档见报告 §8。
**待用户决定**：Q1 采用强度（推荐平衡）；Q2 风险定级权（推荐 Cowork 定级+用户可改判）；Q3 Quiz（推荐现在不引入）。
**确认**：本轮未修改任何长期工作流文件、未改业务代码、未向 CC 下发任务；批准前所有建议不生效。完整报告：`../docs/TL-PROC-003_Unknowns工作流审计.md`。

---

## [Cowork] TL-DISC-002 · 云端行情、持仓与历史同步 Discovery

**Status: PROPOSED**（等待用户拍板，不自行 APPROVED，未生成开发规格）
**审计范围**：云端 Alpaca IEX 行情、IBKR 持仓快照同步、持仓估值口径、自选股、Flex Web Service 每日自动同步；只读，与执行中的 TL-FEAT-006 并行未干扰。
**当前代码结论**：ib_service/pairing/flex 解析/去重约束可复用；Gateway 通路上云即失效；无任何定时任务框架；ConnectPage 直接渲染原始 IBKR 字段名（UI 债确认）。**关键风险实锤：实时通路（execId）与 Flex 通路（tradeID）id 不同源且 source 不同，同一成交经两路会成两笔交易，需产品级重复策略（Q2）。**
**官方关键限制（2026-07-12 官方文档）**：Alpaca Basic 免费=IEX 实时、WS 30 标的、REST 200 次/分；Flex WS=令牌 6h-1 年+可绑 IP、限速 1/s 与 10/min、Activity 每日收盘后更新（官方明示不宜轮询、次日取前日）、Trade Confirmation 盘中 5-10 分钟可见；Gateway 无官方云端无人值守形态。
**推荐架构**：方案 A 修订版——云端 QuoteProvider（供应商解耦、密钥不下发）+ 本地代理经设备令牌 HTTPS 推送持仓快照（防重放、可吊销、云端零 IBKR 凭据）+ 首次 Flex 全量上传 + 云端每日 Flex WS 增量（复用现有解析配对去重管线）；估值双时间戳并列不混口径。
**推荐数据模型**：新表 5+1（portfolio/position_snapshots、watchlist_items、broker_sync_devices、flex_sync_configs 加密存 token、sync_runs），行情缓存不建表；全部用户级联删除；建议合并 2 个迁移。
**与 TL-DEPLOY-001 关系**：部署为全部阶段前置；任务承载形态（WebJob/Container Apps Job/进程内调度）在部署 Discovery 定型。
**实施阶段**：部署 → 行情+自选 → 快照+实时页（含字段译名清偿） → Flex 自动同步 → 远期多用户授权；独立 Task ID 独立审阅。
**待用户决定**：Q1 行情传输（推荐 REST 轮询 30s）；Q2 双通路重复策略（推荐 Flex 为权威、Gateway 改当日只读预览）；Q3 快照保留（推荐 30 天）；Q4 v1 限定 USD 美股/ETF（推荐限定+降级展示）。
**确认**：零业务代码修改；未向 Claude Code 下发任务；下一步等待用户拍板。完整报告：`../docs/TL-DISC-002_云端行情与同步Discovery.md`。

---

## [Cowork] 用户真实验收记录（2026-07-12）

用户按合并清单完成第 3 批与第 4 批已交付项的真实环境验收，全部通过：改密与会话踢除、日语邮件全链路、交易编辑/平仓/清空平仓、来源徽章与只读区、Reports 2.0 新指标与多语言口径标注、Flex 演示样本去重与真实报表字段核对、金额 4 位精度、登录限速锁定、测试账号删除与数据隔离。对应任务已置 USER_VERIFIED/CLOSED（见状态板）；TL-FEAT-007 保持 USER_VERIFIED，待 Tag 切片追加交付后 CLOSED。遗留在场任务：TL-FEAT-006（CC 执行中）、TL-DEPLOY-001（待规格）。

---

## [Cowork → CC] 第 4 批（平衡路线）· 连续执行模式说明

用户 2026-07-12 批准 TL-DISC-001 平衡路线并对 Q2/Q3/Q4 拍板。本批共 6 任务，**按下列顺序连续执行已 APPROVED 的任务**，每项独立写交付记录（同一 Task ID），不等审阅直接做下一项；Cowork 按 Task ID 逐项独立审阅。TL-FEAT-006 处于 BLOCKED，**跳过它继续后续任务**，等用户补充拍板后按所选方案执行。纪律沿用：子代理默认 0、上限 3-5；每项跑 py_compile / build / 7 语键集与占位符；密码码 token 不入日志。

顺序：TL-BUG-001 → TL-FEAT-005 → (TL-FEAT-006 解锁后插入) → TL-FEAT-007 → TL-DATA-003 → TL-DOC-001。

**批次共同边界**——Out of Scope：风险计划字段、结构化复盘、onboarding、CSV 导出、复制交易、软删除、AI 复盘、每周邮件、PWA、Passkey、服务端聚合、report_snapshots 启用、行情接入、浮动盈亏估值、云部署本身。Do Not Touch：IB 只读原则（D-003）、导入去重键语义（D-010）、认证与会话架构（TL-BUG-001 的 seed 修复除外）、无关模型与迁移、.env 与密钥、无关页面重构。

---

## [Cowork → CC] TL-BUG-001 · 审阅 · ACCEPTED

**独立验证**：seed.py 回填逻辑仅限种子邮箱、仅限 email_verified_at 为空时，其它字段不碰（代码注释与实现一致）；py_compile 过。三层结论：规格全覆盖 / 幂等与隔离冒烟 10 项扎实 / 无 UX 面。**裁决**：无待决。**待用户验收项**：无（防复发性质）。→ 本条可随批次 CLOSED。

---

## [Cowork → CC] TL-FEAT-005 · 审阅 · ACCEPTED

**独立验证**：PATCH 成对校验/日期序/正数约束在 api.py 落实（invalid_payload 分支 10 处）；TradeEditModal 与 TradeFormFields 抽取到位（共用一份映射与校验，未复制规则）；DataContext.updateTrade 本地替换实现选择合理；17 项 HTTP 冒烟含回滚验证。三层结论：In Scope 全做且未越界 / 对抗面（他人 404、半改回滚、越界值）覆盖好 / 未保存确认与平仓快捷入口符合 UX 预期。**裁决**：测试脚手架的 context 泄漏记录备查，接受。**待用户验收**：编辑一笔改价看 Reports 变化；持仓中平仓再改回；券商行看提示。

---

## [Cowork → CC] TL-FEAT-007 · 审阅 · ACCEPTED

**独立验证**：metrics.js 16 个导出、Reports 页接入曲线与新卡、无任何 tag 残缺入口；单测 25 项含固定样例断言；build 过。回撤 380 的计算过程复核正确（峰 500 谷 120）。三层结论：口径全程"仅已实现"且 UI 标注到位（D-017）/ 除零与空态逐指标处理 / 卡片与图布局延续现有语言。
**裁决两项**：① 规格样例 "PF=1.86" 确认为 Cowork 笔误，正确值 820/380≈2.16，以实现为准，规格勘误记录于此；② 费用占比的"毛盈利=Σ单笔税前正 P&L"口径**接受**，注释已写清。
**待用户验收**：demo 账号看收益曲线/回撤/连击/月度图；切语言看口径标注；空账号看空态。**遗留依赖**：Tag 切片等 TL-FEAT-006 完成后补做（追加交付，同 Task ID 007 记一条补充）。

---

## [Cowork → CC] TL-DATA-003 · 审阅 · ACCEPTED

**独立验证**：sourceLabelKey 映射与 TradeRow 徽章在位；to_json 本就含 source/externalId，后端零改动属实；列表不露 externalId、编辑弹窗只读区含配对说明。**裁决**：手工来源不并列原始串 `manual`——接受，信息无增量。**待用户验收**：三种来源各一笔的徽章与只读区展示。

---

## [Cowork → CC] TL-DOC-001 · 审阅 · ACCEPTED

**独立验证**：前端 README Out of scope 已不含 Flex（现仅行情/支付 + tags 预留句）；后端 README postgresql@17 两处、localStorage 表述清零。**裁决**：发现项（Reports 四指标描述过时、API 清单缺第 3/4 批端点、tags 预留句将随 006 过时）**接受为 backlog**，登记候选 TL-DOC-002，与 006/007 收尾后一并做。→ 本条可随批次 CLOSED（纯文档，无用户验收面）。

---

## [Cowork] 第 4 批审阅小结与状态对齐（2026-07-12）

五项 DELIVERED 全部 ACCEPTED。CC 上报的状态板冲突已对齐：TL-FEAT-006 的解锁（用户拍板方案 A）发生在 CC 开工之后，其按当时指令跳过执行正确；006 现为 APPROVED 待执行。**下一步给 CC**：执行 TL-FEAT-006（方案 A 规格），随后以 TL-FEAT-007 追加交付补 Tag 切片。TL-DOC-002（README 增量修正）列入 backlog。

---

## [CC → Cowork] TL-DOC-001 · 实现完成 · DELIVERED

**改动**
- 前端 `README.md`：Out of scope 移除 "CSV/Flex file import"（Flex 已实现，整项按规格删除）；Views 补 **Settings**（改密/设备管理/删号）与 /connect 的 **Flex 上传区**描述；架构图补 `services/flex.js` 一行、共享组件行补 `PasswordInput`。
- 后端 `README.md`：`postgresql@16` → `postgresql@17` 两处（D-004）；隐私节 "persisted (in the browser's localStorage)" 改为 "persisted (in Postgres, scoped to your account)"。
- 无凭据、无连接串变动；无关段落未重写。
**自检（自动化证据）**：纯文档无自动化要求；diff 供 Cowork 静态审阅。
**发现项**（范围外过时点，只记录未修复）：① 前端 README Views 的 Reports 描述仍是旧四指标，本批 TL-FEAT-007 落地后已过时；② 后端 README 数据 API 节写 "reserved `limit`/`offset`" 但分页已实现（默认 200，limit=0 全量），且未列 `import/flex`、`password/change`、`sessions`、`DELETE /api/auth/account` 等第 3 批端点。建议列入下次文档任务。
**不确定点**：无。
**子代理使用**：0 个。

---

## [CC → Cowork] TL-DATA-003 · 实现完成 · DELIVERED

**改动**
- `utils/format.js` 新增 `sourceLabelKey`：source → i18n 键（manual→"手工"、broker:ibkr→"IBKR 实时"、broker:ibkr-flex→"IBKR Flex"），未知 source 回退原始串不留白。
- TradeRow：ticker 旁来源徽章，仅券商来源显示（规格允许"手工可不显示"，选不显示以保持常见情形安静，实现选择已注释）；列表不展示 externalId。
- 编辑表单（TL-FEAT-005 的弹窗）只读区扩展为**所有交易**显示：来源（本地化标签，券商来源并列原始 source 串即"原值"）；externalId 存在时显示原值，并附一行 i18n 说明解释 `open::close` 为 FIFO 配对的开平仓成交号。手工交易无 externalId 时该两行自然不出现（空值兼容）。
- 后端零改动：核对 `models.Trade.to_json` 已输出 source 与 externalId，无需补充；未触碰 D-003/D-010 与任何导入逻辑。
- CSS 进 `journal.css`（.tl-source-badge、.te-readonly-note）。i18n +4 键 × 7（现 336 键 × 7）。
**自检（自动化证据）**：i18n 336 键 × 7 一致占位符零出入；vite build 过；py_compile 18 文件过（后端无改动，例行基线）。
**发现项**：无。
**不确定点**：手工来源在编辑表单只读区只显示本地化"手工"，未并列原始串 `manual`（信息重复无增量）；券商来源两者都显示。如 Cowork 要求手工也显示原值，一行改动即可。
**手动验收提示（用户）**：Journal 造/导入三种来源各一笔——手工行无徽章、IBKR 实时与 IBKR Flex 行有对应徽章；打开各自编辑弹窗看只读区与配对说明。
**子代理使用**：0 个。

---

## [CC → Cowork] TL-FEAT-007 · 实现完成 · DELIVERED

**改动**
- `utils/metrics.js` 扩展 11 个纯函数（D-011 前端计算）：`closedByCloseDate`（(close_date,id) 稳定排序，所有序列指标的唯一底序）、`equityCurve`（日级聚合后累计，基线 0）、`maxDrawdown`（含 0 基线峰值，单调不降回 0）、`profitFactor`（无亏损→noLosses 标记，无盈利→0）、`expectancy`、`streaks`（P&L=0 中断两种连击且不计入）、`sideBreakdown`（空组 winRate null）、`monthlyPnl`（YYYY-MM）、`bestWorstTrade`（并列取底序在前者）、`tickerBreakdown`（按净额降序）、`feesImpact`（毛盈利=Σ正的税前 P&L=realizedPnl+fees，毛盈利 0→ratio null）。全部仅已平仓、net of fees（复用 realizedPnl），未平仓交易零进入。
- Reports 页：新增 7 张指标卡（盈利因子[无亏损显 — 加 tooltip]、期望值、最大回撤、最长连击、最佳/最差交易[ticker+日期+金额]、费用合计[占毛盈利比]）+ 已实现收益曲线（全宽折线，副题即规格要求的"不含未平仓浮动盈亏"标注，未用"账户净值"字样）+ 月度净额柱状图（正负色沿用 #22c55e/#ef4444）+ 多空对比表 + Ticker 维度表。卡片区上方有整体口径说明（i18n）。全部指标随现有 Playbook 选择器同步切片（#11 兼容不回退）；数据仍 limit=0 全量；report_snapshots 未动。**Tag 切片未实现、无残缺入口**（硬依赖 006）。空态：每卡/每图各自空态文案。图表沿用 recharts。
- `MetricCard` 增可选 `title` tooltip 属性（向后兼容）。样式全进 `reports.css`。i18n +29 键 × 7（现 332 键 × 7）。
**自检（自动化证据）**：metrics 单测 25/25——含规格固定 6 笔样例全指标断言（构造：AAPL 多 8股 100→162.75 费2=净+500、TSLA 多 -300、MSFT 空 -80、NVDA 空 +120、META 多 +200、AMZN 平 0，平仓日 01-10/01-15/01-20/02-05/02-10/02-15，含多空与跨月）：累计 +440、PF=820/380≈2.16、Expectancy=440/6≈+73.33、连胜 2 连败 2（底序 W,L,L,W,W,0）、月度 01=+120/02=+320、最佳 AAPL +500 最差 TSLA -300、Ticker 序 AAPL,META,NVDA,AMZN,MSFT,TSLA、费用 2 占毛盈利 822（502+120+200）之 0.24%；边界：空数据/单笔（PF noLosses、回撤 0）/全亏（PF=0、回撤自 0 基线）/单调不降回撤 0/纯持平（连击 0/0）/同日聚合/同日并列按 id/混入未平仓交易零影响。i18n 332 键 × 7 占位符零出入；vite build 过。
**回撤计算过程（供复核）**：累计序列 500→200→120→240→440→440；峰值追踪：基线 0，01-10 起峰 500；各点回落 = 0,300,380,260,60,60；最大回撤 = **380**（峰 500 至谷 120）。
**发现项**：规格验收样例中"PF=1.86"与同句"820/380"矛盾——820/380=2.16（保留两位）；按指标清单 #3 的公式定义（Σ盈利/|Σ亏损|）实现并以 2.16 断言，"1.86"判为笔误，请 Cowork 复核确认。
**不确定点**：#10"费用占毛盈利比"中"毛盈利"实现为 Σ单笔税前正 P&L（=realizedPnl+fees，逐笔取正后求和），已在代码注释与本条注明，如 Cowork 意指其它口径（如 Σ净盈利）请裁决。
**子代理使用**：0 个。

---

## [CC → Cowork] TL-FEAT-005 · 实现完成 · DELIVERED

**改动**
- 前端（复用不复制）：抽出 `components/journal/TradeFormFields.jsx`——字段网格、`TRADE_FORM_BLANK`、`tradeToForm`（交易→表单预填）、`formToPayload`（表单→API 载荷，POST/PATCH 共用，一份映射）；`TradeForm` 改为薄壳（行为不变）；校验仍走唯一的 `validation.js`。
- 新 `TradeEditModal.jsx`：TradeRow 铅笔按钮进入编辑；持仓中行另有「平仓」快捷按钮（同一表单，`focusExit` 自动聚焦 exit price）。预填现值；未保存更改时关闭（Esc/遮罩/取消/×）先弹放弃确认（确认视图换入同一弹窗，Esc 回到编辑）；保存失败按错误码显示翻译文案（invalid_payload 专属键，其余 requestFailed）。「清空平仓信息，改回持仓中」按钮把 exitPrice 与 closeDate **成对清空**。券商来源（source≠manual）表单顶部显示不一致提示，source/externalId 只读展示（TL-DATA-003 将再扩展）。
- `DataContext`：新增 `updateTrade`——PATCH 成功后**本地替换该行**，分页窗口与 tradesTotal 不动（实现选择已注释：编辑不改笔数，Reports 挂载时全量重拉自然同步）；`addTrade` 改用同一 `formToPayload`。
- 后端 `api.py` PATCH：应用完毕后整体校验——exit_price/close_date 同空或同有、close≥open、quantity>0、entry>0、exit>0（设置时），违反回 `invalid_payload`；source/external_id 不可 PATCH（保持字段表外，注释注明 D-010 理由）并加测试锁定。`models.py` 补 P&L 不落库、一律派生的注释级说明。
- 样式全部进 `css/journal.css`（行内按钮、券商提示、只读区、弹窗动作区），零 inline style。i18n +13 键 × 7 语（编辑/平仓/清空平仓/未保存确认/券商提示/只读标签/错误文案）。
**自检（自动化证据）**：HTTP 冒烟 17/17——他人交易 404 且行未变；成对四象限（双空 200/双有 200/单清 exit 400/单清 close 400）；400 后 GET 证实回滚无半改；成对清空回持仓 200；close<open 与 open 越过 close 均 400；quantity 0/-3、entry 0、exit -1 均 400；券商行 PATCH source/externalId 被忽略；有效编辑后 PATCH 响应与 GET 完全一致。i18n 303 键 × 7 一致占位符零出入；vite build 过；py_compile 18 文件过。
**发现项**：无。
**不确定点**：冒烟首版曾把 test_client 包在长生命 app context 里导致 session 脏状态跨请求泄漏（三项假失败），已重构为每请求独立 context 后全绿——真实服务器行为不受影响，仅测试脚手架问题，记录备查。
**子代理使用**：0 个。

---

## [CC → Cowork] TL-BUG-001 · 实现完成 · DELIVERED

**改动**：仅 `backend/seed.py` 的 `ensure_user`——已存在的种子账号（按邮箱识别：demo@tradelens.app 与 .env 的 ADMIN_EMAIL）若 `email_verified_at` 为空则回填 `utcnow()` 并注明 D-014；已验证则维持原样不重打时间戳。密码、display_name、role 等其它字段一律不碰；非种子用户不在 `ensure_user` 调用路径内，天然不会被批量置已验证。无迁移、未触碰 auth 端点与会话逻辑。
**自检（自动化证据）**：冒烟 10/10 通过——demo/admin 置空验证字段后跑 seed 均回填、其它字段逐一比对未变、混入的非种子用户保持未验证、总账号数不变（无重复创建）、二次重放不改时间戳不加账号、现场完整还原（原时间戳恢复、测试用户删除）；py_compile 18 个后端 .py 全过。凭据值零输出。
**发现项**：状态板中 TL-FEAT-006 标 APPROVED（备注"用户拍板 A，插队于 007 之前"），与规格条目的 BLOCKED 及批次说明"跳过 006"冲突；本批按用户当前会话指令（BLOCKED，跳过）执行，请 Cowork 对齐状态板。
**不确定点**：无。
**子代理使用**：0 个。

---

## [Cowork → CC] TL-BUG-001 · seed 回填种子账号验证状态 · APPROVED

**背景**：demo/admin 种子账号若创建于 1.5 迁移前，email_verified_at 为空被 /verify 卡住；用户已在本机手工 SQL 解锁，需产品级修复。
**目标**：重复运行 seed.py 后，两个种子账号必处于已验证状态（D-014），无需人工 SQL。
**In Scope**：seed.py 对**按邮箱识别的种子账号**（demo@tradelens.app 与 .env 指定的 ADMIN_EMAIL）在已存在且 email_verified_at 为空时回填 now()；保持幂等（重复跑无副作用、不建重复账号）；不改这两个账号的其它字段（密码、display_name 等用户可能改过的内容一律不碰）；回归测试覆盖"账号已存在但验证字段为空→跑 seed→已验证"与"非种子普通用户绝不被批量置已验证"。
**Out of Scope**：其它 seed 行为、任何迁移。**Do Not Touch**：auth 端点与会话逻辑、users 模型。
**自动化验收**：上述回归 + 幂等重放 + py_compile。**手动验收**：无（用户本机已解锁，此项防复发）。
**停止条件**：若发现需要迁移或触碰 auth 逻辑，停下写 HANDOFF。

---

## [Cowork → CC] TL-FEAT-005 · 交易编辑与 UI 平仓 · APPROVED

**背景**：PATCH /api/trades 与 services/data.js:updateTrade 均就绪但前端零调用；用户无法编辑交易、无法平仓（TL-DISC-001 缺口 #1/#2）。
**目标**：用户可编辑自己的任意交易字段并将持仓中交易平仓，全链路验证完备。

**In Scope（前端）**
- TradeRow 增编辑入口；持仓中行增「平仓」快捷入口（同一编辑表单、聚焦平仓字段）。
- 编辑表单：预填现值，复用/抽取 TradeForm 的字段与校验逻辑（不复制粘贴两份规则）；取消放弃更改；有未保存更改时关闭需确认；保存失败展示翻译后错误。
- 保存成功后 Journal 行与 Reports 数据同步刷新，分页窗口与 total 不错位（编辑不改变笔数，本地替换该行即可，注明实现选择）。
- 清空平仓（把已平仓改回持仓中）：exitPrice 与 closeDate 必须**成对清空**，UI 提供明确操作。

**In Scope（后端最小修正，核查确认的缺口）**
- PATCH 应用完毕后整体校验：exit_price 与 close_date 同为空或同有值，否则 `invalid_payload`；close_date ≥ open_date；quantity > 0；entry_price/exit_price > 0。
- source / external_id 不可经 PATCH 修改（现状已不在字段表，补测试锁定）。

**产品决定**
- 券商来源交易（source 非 manual）**允许编辑**，但编辑表单顶部显示提示"来自券商导入，修改数值将与券商记录不一致"（i18n）；source/externalId 在表单中只读展示。
- P&L 不存储，一律由字段派生（现状确认，写进代码注释级说明）。

**技术约束**：D-005（无迁移需求，若发现需要即停）、D-007 i18n 7 语、external CSS。
**数据模型影响**：无。**API 影响**：PATCH 校验强化，错误码复用 invalid_payload。**i18n**：编辑/平仓/提示/确认 predicted ~10 键 × 7。
**自动化验收**：冒烟含：编辑他人交易 404；成对校验四象限（双空/双有过，单一方 400）；close<open 400；quantity≤0 400；broker 行 source 不可改；编辑后 GET 一致。前端 build、键集。
**手动验收（用户）**：编辑一笔已平仓改价格看 Reports 变化；把持仓中的平仓；再改回持仓中；broker 交易看到提示。
**停止条件**：需迁移、或发现现有字段语义与本规格冲突。

---

## [Cowork → CC] TL-FEAT-006 · 标签用户端工作流 · APPROVED（用户已拍板方案 A，迁移获批）

**2026-07-12 用户决定：采用方案 A**。迁移获得批准（tags 加 nullable user_id + 共享域/用户域两条部分唯一索引，含可重放 downgrade）。执行位置：插队于 TL-FEAT-007 之前；若 CC 已进入 007，则 007 当轮完成后立即回做本项，随后补 007 的 Tag 切片。以下原 BLOCKED 分析与方案细节保留作为规格依据。

**核查结论（Cowork 2026-07-12）**：`Tag(id, label unique 全局, color)`，无 user_id；trade_tags 为纯关联表。已批准的所有权模型（用户自建、用户级去重、互不可见）**无法零迁移实现**；TL-DISC-001 将 C2 标为零迁移的判断在此项不成立，冲突确认。

**方案 A（推荐，最小迁移）**：tags 加 `user_id`（nullable FK，NULL=管理员共享模板）；全局 label 唯一约束改为两条部分唯一索引（共享域：label where user_id is null；用户域：(user_id, label) where user_id is not null）；GET /api/tags 返回共享+本人；用户创建归本人、修改删除仅限本人（删除级联清其 trade_tags）；共享标签用户可直接使用但不可改删（admin 端点不变）；既有 9 个标签归入共享域（user_id=NULL），完全兼容。迁移含可重放 downgrade。工期约 +0.5 至 1 天。
**方案 B（零迁移降级）**：用户不可自建标签，仅可使用共享标签打标、筛选、切片。安全但表达力受限，与 Q3 产品方向不符。
**共同工作流范围（两案一致，供拍板后执行）**：交易打/移标签（编辑表单与 TradeRow）、Journal 按标签筛选、Reports 标签切片数据接口、用户标签管理界面（仅 A）、名称规范化（trim/折叠空白/大小写不敏感去重）、跨用户隔离测试（他人标签不可见、按他人 tagId 筛选返回空）、空态、i18n 7 语。
**等待**：用户选 A 或 B。选 A 即补批迁移并置 APPROVED；未拍板前 CC 不得实施。

---

## [Cowork → CC] TL-FEAT-007 · Reports 2.0 · APPROVED

**背景**：现有 Reports 仅胜率/盈亏比/持仓期/集中度，无法回答"为什么盈亏"（TL-DISC-001 缺口 #8/#9）。
**目标**：新增趋势、序列与维度指标，全部**仅已实现（已平仓）口径**（用户 Q2 拍板）。

**口径总则（约束全部新指标）**
- 仅纳入已平仓交易（exit_price 与 close_date 齐备）；未平仓交易只影响现有持仓集中度与计数卡，不进入任何新指标。
- P&L 一律为扣除 fees 的 net realized P&L（复用 metrics.realizedPnl）。
- 时间轴按 close_date **日级聚合后累计**；需要逐笔序列的指标按 (close_date, id) 稳定排序。
- UI 必须标注"已实现收益曲线（不含未平仓浮动盈亏）"（i18n），不得称"账户净值"。禁止估算浮动盈亏（无行情源）。

**指标清单（定义 / 除零与空态）**
1. Realized Equity Curve + Cumulative P&L：从 0 起按日累计 net P&L 折线；无已平仓交易→空态卡（i18n 文案）。
2. Max Drawdown：累计曲线的峰到谷最大回落金额；单调不降→0。
3. Profit Factor：Σ盈利 / |Σ亏损|；无亏损→显示"—"加 tooltip"无亏损交易"；无盈利→0.00。
4. Expectancy：net P&L 均值/笔；0 笔→空态。
5. Consecutive Wins/Losses：稳定排序下最长连胜与连败；P&L=0 的交易中断两种连击且不计入。
6. Long vs Short：两组各自笔数/胜率/净额；空组显示"—"。
7. 月度趋势：按平仓月（YYYY-MM）净额柱状图。
8. Best / Worst Trade：net P&L 最大/最小的单笔（并列取排序在前者），显示 ticker+日期+金额。
9. Ticker 维度：按 ticker 净额/笔数/胜率表，按净额排序。
10. Fees 影响：总费用、费用占毛盈利比；毛盈利为 0→"—"。
11. Playbook 维度：与现有实现兼容不回退。
12. **Tag 切片：硬依赖 TL-FEAT-006，006 未解锁前不实现、不做伪实现**，UI 不出现残缺入口。

**实现约束**：遵守 D-011——前端计算（metrics.js 扩展为纯函数 + 单测），Reports 继续 limit=0 全量；不动 report_snapshots；图表沿用现有图表方案与正负色约定。
**验收样例**：规格附固定 6 笔构造交易（3 胜 2 负 1 平、含多空与跨月），CC 冒烟必须断言全部指标期望值——AAPL +500/-2 费、TSLA -300、NVDA +120、MSFT -80、META +200、AMZN 0（净额已扣费口径），期望：累计 +440、PF=1.86（820/380 保留两位说明口径）、Expectancy +73.33、最大连胜 2、连败 2、回撤为构造序列实算值（CC 在交付中给出计算过程供审阅复核）。
**自动化验收**：metrics 单测（含除零/空数据/单笔/全亏）、build、键集。**手动验收（用户）**：demo 账号看全部新卡与图、切语言看文案、空账号看空态。
**停止条件**：任何指标需要服务端聚合才能正确 → 停（勿降级口径）。

---

## [Cowork → CC] TL-DATA-003 · 来源与配对追溯展示 · APPROVED

**背景**：Journal 无法区分手工/IBKR 实时/Flex 导入，externalId 与 FIFO 配对不可见（TL-DISC-001 缺口 #3）。
**In Scope**：TradeRow 显示来源徽章（手工 manual 可不显示或淡显示"手工"，broker:ibkr → "IBKR 实时"，broker:ibkr-flex → "IBKR Flex"，i18n 词条而非原始 source 串）；编辑表单（TL-FEAT-005 的）只读区展示来源与 externalId 原值，并附一行说明文案解释配对 id 的含义（`open::close` 为 FIFO 配对的开平仓成交号）；列表不展示 externalId（避噪）。to_json 若未含 source/externalId 则补只读输出（核对后如需）。空值兼容（手工交易无 externalId）。
**Out of Scope**：改动去重键、任何导入逻辑。to_json 之外的 API 变化。**Do Not Touch**：D-003 只读、D-010。
**验收**：三种来源各一笔的展示截图路径（用户手动）；键集/build/py_compile。
**停止条件**：无预期分叉；发现 to_json 改动影响其它消费方时停。

---

## [Cowork → CC] TL-DOC-001 · README 过时内容修正 · APPROVED

**In Scope**（以实际代码与 DECISIONS 为准）：前端 README——"Out of scope" 移除 CSV/Flex file import（Flex 已实现），Views 补 Settings 页与 /connect 的 Flex 上传区，架构图补 services/flex.js 与共享组件 PasswordInput；后端 README——隐私节"localStorage"表述改为 Postgres 现状、postgresql@16 → 17（D-004）。
**Out of Scope**：无关段落重写、任何凭据/连接串。
**验收**：改动 diff 审阅；无自动化要求（纯文档）。

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
