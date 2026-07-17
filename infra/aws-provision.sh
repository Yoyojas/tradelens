#!/bin/bash
# TL-DEPLOY-001 (AWS · ECS Express Mode) · Provisioning guide for TradeLens.
#
# RUN THESE STEP BY STEP, BY HAND (user executes; Cowork walks you through).
# Nothing here contains a secret value — placeholders <...> are yours to fill
# in the AWS console/CLI, never in chat or git.
#
# Second rework (2026-07-16): App Runner stopped accepting new customers, so
# the compute layer is now Amazon ECS Express Mode (GA since 2025-11; the
# official AWS-recommended migration direction). Capabilities below follow
# the official docs, accessed 2026-07-16:
#   https://docs.aws.amazon.com/AmazonECS/latest/developerguide/express-service-getting-started.html
#   https://docs.aws.amazon.com/AmazonECS/latest/developerguide/express-service-work.html
#   https://docs.aws.amazon.com/AmazonECS/latest/developerguide/express-service-advanced-customization.html
#
# ALREADY DONE (kept from the first pass — do NOT recreate):
#   ECR repo + :latest image · GitHub OIDC role · RDS (available; password in
#   SSM) · all 12 SSM /tradelens/* parameters · role
#   tradelens-apprunner-instance · security groups tradelens-app / tradelens-db.
#
# Region policy: us-east-2 (Ohio); full fallback to us-east-1 only as a whole.
set -euo pipefail

REGION="${REGION:-us-east-2}"
REPO="tradelens"
SERVICE="tradelens"
DOMAIN="mytradelens.app"
APP_SG="sg-09131eb0aaa971a47" # tradelens-app (already exists; DB SG allows it)
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"

run() { echo ""; echo ">>> $*"; "$@"; }

echo "== 0. Budget alarm — UPDATE to \$35/month (user decision 2026-07-16) =="
cat <<'EOS'
aws budgets update-budget --account-id <ACCOUNT_ID> \
  --new-budget '{"BudgetName":"tradelens-monthly","BudgetLimit":{"Amount":"35","Unit":"USD"},"TimeUnit":"MONTHLY","BudgetType":"COST"}'
# (80% notification threshold carries over: alarm now fires at $28.)
EOS

echo "== 1-5. DONE in the first pass =="
cat <<'EOS'
1 ECR · 2 GitHub OIDC role · 3 security groups · 4 RDS · 5 SSM parameters.
Only ONE addition in step 2's role: the CI role needs ECS deploy permissions
now. Attach this inline policy to the tradelens-deploy role:
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow",
      "Action": ["ecs:RunTask", "ecs:UpdateService", "ecs:DescribeServices",
                 "ecs:DescribeTasks"],
      "Resource": "*",
      "Condition": {"ArnEquals": {"ecs:cluster": "arn:aws:ecs:<REGION>:<ACCOUNT_ID>:cluster/default"}} },
    { "Effect": "Allow",
      "Action": "iam:PassRole",
      "Resource": ["arn:aws:iam::<ACCOUNT_ID>:role/tradelens-execution",
                   "arn:aws:iam::<ACCOUNT_ID>:role/tradelens-apprunner-instance"] }
  ]
}
GitHub variables to add: AWS_SUBNETS (comma-separated default-VPC public
subnet ids), AWS_APP_SG (sg-09131eb0aaa971a47).
EOS

echo "== 6. IAM roles for ECS Express Mode =="
cat <<EOS
Role semantics NOTE (differs from App Runner): in ECS, SSM SecureString
secrets are fetched by the EXECUTION role, not the task role.
a) Execution role tradelens-execution (ECR pull + logs + SSM secrets):
   aws iam create-role --role-name tradelens-execution \\
     --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
   aws iam attach-role-policy --role-name tradelens-execution \\
     --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
   Then attach the SAME ssm:GetParameters + kms:Decrypt policy on
   /tradelens/* that tradelens-apprunner-instance already carries (copy the
   inline policy across in the IAM console).
   ALSO attach inline policy tradelens-logs — the managed execution policy
   alone did NOT cover our custom awslogs group (hit in production
   2026-07-17):
   {"Version":"2012-10-17","Statement":[{"Effect":"Allow",
     "Action":["logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"],
     "Resource":"arn:aws:logs:<REGION>:<ACCOUNT_ID>:log-group:*"}]}
b) Infrastructure role (Express Mode manages ALB/scaling through it):
   aws iam create-role --role-name ecsInfrastructureRoleForExpressServices \\
     --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ecs.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
   aws iam attach-role-policy --role-name ecsInfrastructureRoleForExpressServices \\
     --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSInfrastructureRoleforExpressGatewayServices
c) Task role: REUSE tradelens-apprunner-instance (the app makes no AWS
   calls at runtime, so this role is a placeholder rather than renaming
   mid-flight). REQUIRED FIX when reusing it (hit in production 2026-07-17):
   its trust policy still names App Runner (tasks.apprunner.amazonaws.com)
   and MUST be switched to ECS tasks, or task launches fail:
   aws iam update-assume-role-policy --role-name tradelens-apprunner-instance \\
     --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"ecs-tasks.amazonaws.com"},"Action":"sts:AssumeRole"}]}'
EOS

echo "== 7. Task definition + Express Mode service =="
cat <<'EOS'
Why bring-your-own task definition: Express Mode's --primary-container has
no documented `secrets` field and --cpu only takes whole vCPUs; the official
BYO-task-definition path ("Express Mode uses your task definition as-is")
gives us 0.25 vCPU / 0.5 GB AND the 12 SSM secrets via valueFrom. Container
MUST be named "Main" with a single named TCP port mapping (official
requirement — infra/taskdef-template.json complies).

a) Fill <ACCOUNT_ID>/<REGION> in infra/taskdef-template.json, then:
   aws ecs register-task-definition --cli-input-json file://infra/taskdef-template.json
b) Create the Express Mode service (single task: min=max=1):
   aws ecs create-express-gateway-service \
     --service-name tradelens \
     --task-definition-arn arn:aws:ecs:<REGION>:<ACCOUNT_ID>:task-definition/tradelens:1 \
     --infrastructure-role-arn arn:aws:iam::<ACCOUNT_ID>:role/ecsInfrastructureRoleForExpressServices \
     --health-check-path "/api/health" \
     --scaling-target '{"minTaskCount":1,"maxTaskCount":1}' \
     --network-configuration '{"subnets":["<public-subnet-1>","<public-subnet-2>"],"securityGroups":["sg-09131eb0aaa971a47"]}' \
     --monitor-resources
   Express provisions: ALB + HTTPS listener (host-header rule) + target
   group + ACM cert for the default URL + autoscaling + log group. Wait for
   ACTIVE, then note the URL: https://tradelens-xxxx.ecs.<REGION>.on.aws
c) First boot: the service comes up WITHOUT tables (SKIP_MIGRATIONS=1 by
   design — migrations are a separate one-shot step now). Initialize once,
   two one-shot tasks in order (docker-entrypoint.sh modes migrate | seed);
   wait for each to reach STOPPED with exit code 0 before the next:
   aws ecs run-task --cluster default --launch-type FARGATE \
     --task-definition tradelens \
     --network-configuration 'awsvpcConfiguration={subnets=[<public-subnet-1>,<public-subnet-2>],securityGroups=[sg-09131eb0aaa971a47],assignPublicIp=ENABLED}' \
     --overrides '{"containerOverrides":[{"name":"Main","command":["migrate"]}]}'
   aws ecs run-task --cluster default --launch-type FARGATE \
     --task-definition tradelens \
     --network-configuration 'awsvpcConfiguration={subnets=[<public-subnet-1>,<public-subnet-2>],securityGroups=[sg-09131eb0aaa971a47],assignPublicIp=ENABLED}' \
     --overrides '{"containerOverrides":[{"name":"Main","command":["seed"]}]}'
EOS

echo "== 8. Custom domain (official Express Mode path, docs accessed 2026-07-16) =="
cat <<'EOS'
a) ACM certificate (region of the ALB): request cert for mytradelens.app +
   www.mytradelens.app, DNS validation. Namecheap: ADD the two validation
   CNAMEs (never touch Resend TXT/MX/DKIM records).
b) ALB listener rule (console: ECS service -> Resources -> listener rule ->
   Edit Rule): keep the existing Host-header value (the .on.aws URL), "Add
   OR condition value" for mytradelens.app AND www.mytradelens.app; save.
c) Listener -> Certificates tab -> Add certificate: attach the ACM cert.
   (Manual edits persist: per official docs Express Mode does not overwrite
   changes unless an Express update directly conflicts.)
d) Namecheap: ALIAS @ -> <ALB DNS name>; CNAME www -> <ALB DNS name>.
   The app 301-redirects www to the apex (backend/app.py).
EOS

echo "== 9. Daily Flex sync via EventBridge Scheduler -> HTTPS (UNCHANGED) =="
cat <<'EOS'
Same as before: connection (X-Job-Secret header) + API destination
https://mytradelens.app/api/jobs/sync-flex + rule cron(0 9 ? * TUE-SAT *).
The endpoint and its 202-then-background behavior are unaffected by the
compute-layer change.
EOS

echo "Guide printed. Steps are manual by design (user-driven deployment)."
