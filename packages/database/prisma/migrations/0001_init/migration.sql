-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ProviderName" AS ENUM ('drive', 'telegram');
CREATE TYPE "ProviderMode" AS ENUM ('oauth', 'public_bot_api', 'local_bot_api');
CREATE TYPE "ProviderHealthState" AS ENUM ('healthy', 'degraded', 'disconnected', 'revoked');
CREATE TYPE "StoragePoolMode" AS ENUM ('fill_first', 'balanced', 'rule_based', 'failover', 'replicated', 'archive');
CREATE TYPE "WorkspaceRole" AS ENUM ('owner', 'admin', 'editor', 'viewer');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "password_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Workspace" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "owner_user_id" UUID NOT NULL,
    "default_provider_account_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "WorkspaceMember" (
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "WorkspaceRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("workspace_id","user_id")
);
CREATE TABLE "Device" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "device_name" TEXT NOT NULL,
    "device_type" TEXT NOT NULL,
    "last_seen_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProviderAccount" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "workspace_id" UUID,
    "provider" "ProviderName" NOT NULL,
    "mode" "ProviderMode" NOT NULL,
    "display_name" TEXT NOT NULL,
    "encrypted_credentials" BYTEA NOT NULL,
    "scopes" JSONB NOT NULL DEFAULT '[]',
    "quota_status" JSONB,
    "health_state" "ProviderHealthState" NOT NULL DEFAULT 'degraded',
    "identity" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    CONSTRAINT "ProviderAccount_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "StoragePool" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "mode" "StoragePoolMode" NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "StoragePool_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "StoragePoolAccount" (
    "storage_pool_id" UUID NOT NULL,
    "provider_account_id" UUID NOT NULL,
    "priority" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "quota_threshold_percent" INTEGER,
    "rules" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StoragePoolAccount_pkey" PRIMARY KEY ("storage_pool_id","provider_account_id")
);
CREATE TABLE "StoragePoolRouteDecision" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "storage_pool_id" UUID NOT NULL,
    "upload_session_item_id" UUID,
    "file_version_id" UUID,
    "selected_provider_account_id" UUID,
    "replica_provider_account_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mode" "StoragePoolMode" NOT NULL,
    "decision_trace" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StoragePoolRouteDecision_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProviderCapabilitySnapshot" (
    "id" UUID NOT NULL,
    "provider_account_id" UUID NOT NULL,
    "provider" "ProviderName" NOT NULL,
    "mode" "ProviderMode" NOT NULL,
    "capabilities" JSONB NOT NULL,
    "limits" JSONB NOT NULL,
    "scopes" JSONB NOT NULL DEFAULT '[]',
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    CONSTRAINT "ProviderCapabilitySnapshot_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ProviderUploadAttempt" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "file_version_id" UUID NOT NULL,
    "provider_account_id" UUID NOT NULL,
    "route_decision_id" UUID NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "execution_location" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "provider_request_id" TEXT,
    "provider_object_id" TEXT,
    "error_code" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "ProviderUploadAttempt_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Folder" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "parent_folder_id" UUID,
    "name" TEXT NOT NULL,
    "path_cache" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Resource" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "folder_id" UUID,
    "created_by_user_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "extension" TEXT,
    "checksum_sha256" TEXT NOT NULL,
    "lifecycle_state" TEXT NOT NULL DEFAULT 'active',
    "index_status" TEXT NOT NULL DEFAULT 'pending',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "FileVersion" (
    "id" UUID NOT NULL,
    "resource_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FileVersion_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "StorageObject" (
    "id" UUID NOT NULL,
    "file_version_id" UUID NOT NULL,
    "provider_account_id" UUID NOT NULL,
    "provider" "ProviderName" NOT NULL,
    "providerObjectId" TEXT,
    "providerPath" TEXT,
    "sync_state" TEXT NOT NULL,
    "last_verified_at" TIMESTAMP(3),
    "error_code" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StorageObject_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "UploadSession" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "state" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UploadSession_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "UploadSessionItem" (
    "id" UUID NOT NULL,
    "upload_session_id" UUID NOT NULL,
    "resource_id" UUID,
    "original_name" TEXT NOT NULL,
    "staged_path" TEXT,
    "size_bytes" BIGINT NOT NULL,
    "checksum_sha256" TEXT,
    "state" TEXT NOT NULL,
    CONSTRAINT "UploadSessionItem_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "DesktopConnectorCapability" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "device_id" UUID NOT NULL,
    "capability_type" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "max_upload_bytes" BIGINT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "last_heartbeat_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DesktopConnectorCapability_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "DesktopJobLease" (
    "id" UUID NOT NULL,
    "job_id" TEXT NOT NULL,
    "device_id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "lease_state" TEXT NOT NULL,
    "leased_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "DesktopJobLease_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AuditEvent" (
    "id" UUID NOT NULL,
    "workspace_id" UUID NOT NULL,
    "actor_user_id" UUID,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "before_json" JSONB,
    "after_json" JSONB,
    "correlation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "device_id" UUID,
    "family_id" TEXT NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "client_type" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_used_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "revoke_reason" TEXT,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");
CREATE UNIQUE INDEX "StoragePoolAccount_storage_pool_id_priority_key" ON "StoragePoolAccount"("storage_pool_id", "priority");
CREATE INDEX "ProviderCapabilitySnapshot_provider_account_id_checked_at_idx" ON "ProviderCapabilitySnapshot"("provider_account_id", "checked_at");
CREATE UNIQUE INDEX "ProviderUploadAttempt_idempotency_key_key" ON "ProviderUploadAttempt"("idempotency_key");
CREATE UNIQUE INDEX "FileVersion_resource_id_version_number_key" ON "FileVersion"("resource_id", "version_number");
CREATE INDEX "DesktopJobLease_job_id_lease_state_idx" ON "DesktopJobLease"("job_id", "lease_state");
CREATE INDEX "AuditEvent_workspace_id_created_at_idx" ON "AuditEvent"("workspace_id", "created_at");
CREATE UNIQUE INDEX "Session_refresh_token_hash_key" ON "Session"("refresh_token_hash");
CREATE INDEX "Session_user_id_revoked_at_idx" ON "Session"("user_id", "revoked_at");
CREATE INDEX "Session_family_id_idx" ON "Session"("family_id");

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_default_provider_account_id_fkey" FOREIGN KEY ("default_provider_account_id") REFERENCES "ProviderAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Device" ADD CONSTRAINT "Device_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Device" ADD CONSTRAINT "Device_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderAccount" ADD CONSTRAINT "ProviderAccount_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderAccount" ADD CONSTRAINT "ProviderAccount_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoragePool" ADD CONSTRAINT "StoragePool_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoragePoolAccount" ADD CONSTRAINT "StoragePoolAccount_storage_pool_id_fkey" FOREIGN KEY ("storage_pool_id") REFERENCES "StoragePool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoragePoolAccount" ADD CONSTRAINT "StoragePoolAccount_provider_account_id_fkey" FOREIGN KEY ("provider_account_id") REFERENCES "ProviderAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoragePoolRouteDecision" ADD CONSTRAINT "StoragePoolRouteDecision_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoragePoolRouteDecision" ADD CONSTRAINT "StoragePoolRouteDecision_storage_pool_id_fkey" FOREIGN KEY ("storage_pool_id") REFERENCES "StoragePool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoragePoolRouteDecision" ADD CONSTRAINT "StoragePoolRouteDecision_selected_provider_account_id_fkey" FOREIGN KEY ("selected_provider_account_id") REFERENCES "ProviderAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StoragePoolRouteDecision" ADD CONSTRAINT "StoragePoolRouteDecision_upload_session_item_id_fkey" FOREIGN KEY ("upload_session_item_id") REFERENCES "UploadSessionItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StoragePoolRouteDecision" ADD CONSTRAINT "StoragePoolRouteDecision_file_version_id_fkey" FOREIGN KEY ("file_version_id") REFERENCES "FileVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProviderCapabilitySnapshot" ADD CONSTRAINT "ProviderCapabilitySnapshot_provider_account_id_fkey" FOREIGN KEY ("provider_account_id") REFERENCES "ProviderAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderUploadAttempt" ADD CONSTRAINT "ProviderUploadAttempt_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderUploadAttempt" ADD CONSTRAINT "ProviderUploadAttempt_file_version_id_fkey" FOREIGN KEY ("file_version_id") REFERENCES "FileVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderUploadAttempt" ADD CONSTRAINT "ProviderUploadAttempt_provider_account_id_fkey" FOREIGN KEY ("provider_account_id") REFERENCES "ProviderAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProviderUploadAttempt" ADD CONSTRAINT "ProviderUploadAttempt_route_decision_id_fkey" FOREIGN KEY ("route_decision_id") REFERENCES "StoragePoolRouteDecision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_parent_folder_id_fkey" FOREIGN KEY ("parent_folder_id") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FileVersion" ADD CONSTRAINT "FileVersion_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "Resource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StorageObject" ADD CONSTRAINT "StorageObject_file_version_id_fkey" FOREIGN KEY ("file_version_id") REFERENCES "FileVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StorageObject" ADD CONSTRAINT "StorageObject_provider_account_id_fkey" FOREIGN KEY ("provider_account_id") REFERENCES "ProviderAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UploadSession" ADD CONSTRAINT "UploadSession_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UploadSessionItem" ADD CONSTRAINT "UploadSessionItem_upload_session_id_fkey" FOREIGN KEY ("upload_session_id") REFERENCES "UploadSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UploadSessionItem" ADD CONSTRAINT "UploadSessionItem_resource_id_fkey" FOREIGN KEY ("resource_id") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DesktopConnectorCapability" ADD CONSTRAINT "DesktopConnectorCapability_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DesktopConnectorCapability" ADD CONSTRAINT "DesktopConnectorCapability_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DesktopJobLease" ADD CONSTRAINT "DesktopJobLease_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DesktopJobLease" ADD CONSTRAINT "DesktopJobLease_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "Device"("id") ON DELETE CASCADE ON UPDATE CASCADE;
