export {
  currentWorkspaceScopeKey,
  currentWorkspaceEnv,
  getWslHome,
  LOCAL_WORKSPACE,
  parseWorkspaceScopeKey,
  useWorkspaceEnvStore,
  workspaceScopeKey,
  type WorkspaceEnv,
  type WslDistro,
} from "./env";

export { loadRecentDirectories, recordRecentDirectory, removeRecentDirectory, type RecentDirectory } from './recentDirectories';
