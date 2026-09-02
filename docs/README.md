# Terax 项目文档

本目录集中存放项目核心文档、需求、Bug 记录及贡献者指南。文档统一使用中文说明，代码标识符和技术术语保留英文。

文档冲突时，以 `TERAX.md` 的架构约定为准。

## Getting started

- [TERAX.md](TERAX.md) - 架构文档和开发约定
- [需求列表](REQUIREMENTS.md)
- [Bug 记录](BUGS.md)
- [CONTRIBUTING.md](../CONTRIBUTING.md) - 贡献方式、质量标准和项目结构

## 架构指南

- [Two-process model and IPC command reference](architecture/two-process-model.md) - Rust owns all OS access; the webview talks through `invoke()`. Command catalog and how to add a new command.
- [PTY shell integration](architecture/pty-shell-integration.md) - PTY sessions, shell init scripts, OSC 7 / 133, ConPTY, SPAWN_LOCK, Job Object, WSL.
- [Security model](architecture/security-model.md) - deny-list, SSRF guard, workspace authorization, AI tool approval, IPC allowlist, OSC trust, keychain handling.
- [AI subsystem](architecture/ai-subsystem.md) - providers, agent, sub-agents, sessions, composer, tools, edit diffs, live context bridge. Includes a walkthrough for adding a new provider.
- [Terminal renderer pool](architecture/terminal-renderer-pool.md) - slot pooling, the DormantRing, and the never-serialize-mid-command invariant.
- [CLI control plane](architecture/cli-control.md) - bundled CLI, authenticated local protocol, caller targeting, packaging, and current platform limits.

## 贡献指南

- [Testing](contributing/testing.md) - the testing contract, how to run checks, and what makes a good core-subsystem test.


