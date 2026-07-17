#!/bin/bash
# TL-DEPLOY-001 (AWS) · Provisioning guide for TradeLens.
#
# RUN THESE STEP BY STEP, BY HAND (user executes; Cowork walks you through).
# Nothing here contains a secret value — placeholders <...> are yours to fill
# in the AWS console/CLI, never in chat or git.
#
# Region policy: us-east-2 (Ohio) first; if anything is unavailable there,
# redo EVERYTHING in us-east-1 — no split-region deployments.
#
# PREREQS:
#   1. AWS account (credit card required), `aws configure` done with an IAM
#      user (NOT root) that has admin for this setup session.
#   2. A Budgets alarm BEFORE creating anything (step 0) — the $20/month line
#      is a hard batch stop-condition.
set -euo pipefail

REGION="${REGION:-us-east-2}"
REPO="tradelens"
SERVICE="tradelens"
DB_ID="tradelens-pg"
DOMAIN="mytradelens.app"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"

run() { echo ""; echo ">>> $*"; "$@"; }

echo "== 0. Budget alarm FIRST (\$20/month, email notification) =="
cat <<'EOS'
aws budgets create-budget --account-id <ACCOUNT_ID> \
  --budget '{"BudgetName":"tradelens-monthly","BudgetLimit":{"Amount":"20","Unit":"USD"},"TimeUnit":"MONTHLY","BudgetType":"COST"}' \
  --notifications-with-subscribers '[{"Notification":{"NotificationType":"ACTUAL","ComparisonOperator":"GREATER_THAN","Threshold":80},"Subscribers":[{"SubscriptionType":"EMAIL","Address":"<your-email>"}]}]'
EOS

echo "== 1. ECR repository =="
run aws ecr create-repository --region "$REGION" --repository-name "$REPO" \
  --image-scanning-configuration scanOnPush=true

echo "== 2. GitHub OIDC role (CI pushes images without long-lived keys) =="
cat <<EOS
a) One-time OIDC provider (skip if it exists):
   aws iam create-open-id-connect-provider \\
     --url https://token.actions.githubusercontent.com \\
     --client-id-list sts.amazonaws.com
b) Create role tradelens-deploy with this trust policy (restricts to your
   repo's main branch), then attach a policy allowing ecr:* on the $REPO
   repository + ecr:GetAuthorizationToken:
   {
     "Version": "2012-10-17",
     "Statement": [{
       "Effect": "Allow",
       "Principal": {"Federated": "arn:aws:iam::$ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"},
       "Action": "sts:AssumeRoleWithWebIdentity",
       "Condition": {
         "StringEquals": {"token.actions.githubusercontent.com:aud": "sts.amazonaws.com"},
         "StringLike": {"token.actions.githubusercontent.com:sub": "repo:Yoyojas/tradelens:ref:refs/heads/main"}
       }
     }]
   }
c) GitHub repo settings: secret AWS_DEPLOY_ROLE_ARN = the role ARN;
   variables AWS_REGION=$REGION, AWS_ACCOUNT_ID=$ACCOUNT_ID.
d) Push main once so :latest lands in ECR before creating App Runner.
EOS

echo "== 3. Security groups (default VPC) =="
cat <<'EOS'
VPC_ID=$(aws ec2 describe-vpcs --filters Name=isDefault,Values=true --query 'Vpcs[0].VpcId' --output text)
APP_SG=$(aws ec2 create-security-group --group-name tradelens-app --description "App Runner VPC connector" --vpc-id $VPC_ID --query GroupId --output text)
DB_SG=$(aws ec2 create-security-group --group-name tradelens-db --description "RDS - only from app SG" --vpc-id $VPC_ID --query GroupId --output text)
aws ec2 authorize-security-group-ingress --group-id $DB_SG --protocol tcp --port 5432 --source-group $APP_SG
EOS

echo "== 4. RDS PostgreSQL 17 (free tier: db.t4g.micro, 20GB, NOT public) =="
cat <<'EOS'
aws rds create-db-instance \
  --db-instance-identifier tradelens-pg \
  --engine postgres --engine-version 17 \
  --db-instance-class db.t4g.micro \
  --allocated-storage 20 --storage-type gp3 \
  --master-username tladmin --manage-master-user-password \
  --db-name tradelens \
  --no-publicly-accessible \
  --vpc-security-group-ids $DB_SG \
  --backup-retention-period 7
# Endpoint + the managed master password live in the console (RDS + Secrets
# Manager). DATABASE_URL = postgresql://tladmin:<pw>@<endpoint>/tradelens?sslmode=require
EOS

echo "== 5. SSM parameters (App Runner reads secrets from here) =="
cat <<'EOS'
For each name below: aws ssm put-parameter --type SecureString --name <name> --value '<value>'
  /tradelens/secret-key         64-hex random
  /tradelens/database-url       (from step 4, keep ?sslmode=require)
  /tradelens/admin-email        /tradelens/admin-password   (new strong random)
  /tradelens/google-client-id   /tradelens/google-client-secret
  /tradelens/mail-username      /tradelens/mail-app-password
  /tradelens/flex-token-key     (Fernet key — same generator as before)
  /tradelens/alpaca-key-id      /tradelens/alpaca-secret
  /tradelens/job-secret         64-hex random (EventBridge sync trigger)
EOS

echo "== 6. App Runner service (0.25 vCPU / 0.5 GB, max size 1) =="
cat <<'EOS'
a) Instance role: create role tradelens-apprunner-instance with a policy
   allowing ssm:GetParameters + kms:Decrypt on /tradelens/*.
b) ECR access role: use the console default (AppRunnerECRAccessRole).
c) Create the service (console is easiest):
   - Source: ECR image <ACCOUNT_ID>.dkr.ecr.<REGION>.amazonaws.com/tradelens:latest
   - Deployments: AUTOMATIC (ECR push = deploy; matches deploy.yml)
   - Port 8000; health check path /api/health
   - CPU 0.25 vCPU, memory 0.5 GB
   - Auto scaling: create config max size 1, min 1 (single instance =
     entrypoint migrations run exactly once per rollout)
   - Networking: outgoing traffic -> Custom VPC connector (default VPC
     subnets + $APP_SG) so the app reaches the private RDS
   - Env: FLASK_DEBUG=0 TRUST_PROXY=1 COOKIE_SECURE=1
          FRONTEND_URL=https://mytradelens.app
          CORS_ORIGINS=https://mytradelens.app
          GOOGLE_REDIRECT_URI=https://mytradelens.app/api/auth/google/callback
   - Secrets (reference SSM parameters from step 5):
          SECRET_KEY DATABASE_URL ADMIN_EMAIL ADMIN_PASSWORD
          GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET MAIL_USERNAME
          MAIL_APP_PASSWORD FLEX_TOKEN_KEY ALPACA_KEY_ID ALPACA_SECRET
          JOB_SECRET
d) First boot only: temporarily add env RUN_SEED=1 (seeds demo/admin/library),
   verify, then remove it (each change redeploys).
EOS

echo "== 7. Custom domain =="
cat <<'EOS'
aws apprunner associate-custom-domain --service-arn <service-arn> --domain-name mytradelens.app --enable-www-subdomain
Then in Namecheap ADD ONLY (never touch the existing Resend TXT/MX/DKIM):
  - the certificate-validation CNAME records the command returns
  - ALIAS  @    <apprunner-dns-target>   (Namecheap ALIAS type for the apex)
  - CNAME  www  <apprunner-dns-target>
The app 301-redirects www to the apex (backend/app.py).
EOS

echo "== 8. Daily Flex sync via EventBridge Scheduler -> HTTPS =="
cat <<'EOS'
EventBridge rule + API destination (no extra container):
a) Connection (holds the job secret as an API-key header):
   aws events create-connection --name tradelens-sync \
     --authorization-type API_KEY \
     --auth-parameters '{"ApiKeyAuthParameters":{"ApiKeyName":"X-Job-Secret","ApiKeyValue":"<job-secret from step 5>"}}'
b) API destination:
   aws events create-api-destination --name tradelens-sync \
     --connection-arn <connection-arn> \
     --invocation-endpoint https://mytradelens.app/api/jobs/sync-flex \
     --http-method POST --invocation-rate-limit-per-second 1
c) Rule: 09:00 UTC Tue-Sat = the morning AFTER each U.S. trading day
   (Activity statements update overnight; IBKR advises next-day fetch):
   aws events put-rule --name tradelens-sync-daily --schedule-expression "cron(0 9 ? * TUE-SAT *)"
   aws events put-targets --rule tradelens-sync-daily \
     --targets '[{"Id":"1","Arn":"<api-destination-arn>","RoleArn":"<events-invoke-role-arn>"}]'
   (the role needs events:InvokeApiDestination on that destination)
The endpoint answers 202 immediately and runs the sweep in the background —
API-destination timeouts are seconds, the sweep can take minutes.
EOS

echo "Guide printed. Steps are manual by design (user-driven deployment)."
