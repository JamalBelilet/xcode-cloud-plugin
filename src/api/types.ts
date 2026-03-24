// JSONAPI envelope types

export interface JsonApiResponse<T> {
  data: T | T[];
  included?: JsonApiResource[];
  links?: { self: string; next?: string };
  meta?: { paging?: { total: number } };
}

export interface JsonApiResource {
  type: string;
  id: string;
  attributes?: Record<string, unknown>;
  relationships?: Record<
    string,
    {
      data?:
        | { type: string; id: string }
        | { type: string; id: string }[]
        | null;
      links?: { self?: string; related?: string };
    }
  >;
  links?: { self: string };
}

// Domain types

export interface CiProduct {
  id: string;
  name: string;
  createdDate: string;
  productType: "APP" | "FRAMEWORK";
}

export interface CiWorkflow {
  id: string;
  name: string;
  description: string;
  isEnabled: boolean;
  isLockedForEditing: boolean;
  lastModifiedDate: string;
}

export interface CiBuildRun {
  id: string;
  number: number;
  createdDate: string;
  startedDate?: string;
  finishedDate?: string;
  executionProgress: "PENDING" | "RUNNING" | "COMPLETE";
  completionStatus?:
    | "SUCCEEDED"
    | "FAILED"
    | "ERRORED"
    | "CANCELED"
    | "SKIPPED";
  startReason:
    | "GIT_REF_CHANGE"
    | "MANUAL"
    | "MANUAL_REBUILD"
    | "PULL_REQUEST_OPEN"
    | "PULL_REQUEST_UPDATE"
    | "SCHEDULE";
  isPullRequestBuild: boolean;
  sourceCommit?: {
    commitSha: string;
    author?: { displayName: string };
    message?: string;
  };
  destinationCommit?: {
    commitSha: string;
    author?: { displayName: string };
    message?: string;
  };
  issueCounts?: CiIssueCounts;
}

export interface CiIssueCounts {
  analyzerWarnings: number;
  errors: number;
  testFailures: number;
  warnings: number;
}

export interface CiBuildAction {
  id: string;
  name: string;
  actionType: "BUILD" | "ANALYZE" | "TEST" | "ARCHIVE";
  executionProgress: "PENDING" | "RUNNING" | "COMPLETE";
  completionStatus?:
    | "SUCCEEDED"
    | "FAILED"
    | "ERRORED"
    | "CANCELED"
    | "SKIPPED";
  startedDate?: string;
  finishedDate?: string;
  issueCounts?: CiIssueCounts;
  isRequiredToPass: boolean;
}

export interface CiArtifact {
  id: string;
  fileType: string;
  fileName: string;
  fileSize: number;
  downloadUrl: string;
}

export interface CiIssue {
  id: string;
  issueType: "ERROR" | "WARNING" | "ANALYZER_WARNING" | "TEST_FAILURE";
  message: string;
  fileSource?: {
    path: string;
    lineNumber?: number;
  };
  category?: string;
}

export interface CiTestResult {
  id: string;
  className: string;
  name: string;
  status: "EXPECTED_FAILURE" | "FAILURE" | "SKIPPED" | "SUCCESS";
  message?: string;
  destinationTestResults?: {
    deviceName: string;
    osVersion: string;
    status: string;
  }[];
}

export interface CiXcodeVersion {
  id: string;
  version: string;
  name: string;
}

export interface CiMacOsVersion {
  id: string;
  version: string;
  name: string;
}

export interface ScmProvider {
  id: string;
  scmProviderType: "BITBUCKET_CLOUD" | "BITBUCKET_SERVER" | "GITHUB" | "GITLAB" | "GITLAB_SELF_MANAGED";
}

export interface ScmRepository {
  id: string;
  httpCloneUrl?: string;
  sshCloneUrl?: string;
  ownerName: string;
  repositoryName: string;
}

export interface ScmGitReference {
  id: string;
  name: string;
  canonicalName: string;
  kind: "BRANCH" | "TAG";
  isDeleted: boolean;
}
