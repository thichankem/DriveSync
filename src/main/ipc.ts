import { ipcMain, dialog, shell, BrowserWindow } from 'electron'
import { promises as fs } from 'fs'
import { join } from 'path'
import * as gitSvc from './services/git'
import * as dvcSvc from './services/dvc'
import * as driveSvc from './services/drive'
import * as accountsSvc from './services/accounts'
import * as syncSvc from './services/sync'
import * as store from './services/store'
import type { DriveAccount } from '@shared/types'
import type { CreateRepoOptions } from '@shared/types'

export function registerIpc(getWindow: () => BrowserWindow | null) {
  // ---------- Hộp thoại / hệ thống ----------
  ipcMain.handle('dialog:pickDirectory', async () => {
    const win = getWindow()
    const res = await dialog.showOpenDialog(win!, { properties: ['openDirectory', 'createDirectory'] })
    return res.canceled ? null : res.filePaths[0]
  })

  ipcMain.handle('dialog:pickFiles', async (_e, defaultPath?: string) => {
    const win = getWindow()
    const res = await dialog.showOpenDialog(win!, {
      defaultPath,
      properties: ['openFile', 'multiSelections']
    })
    return res.canceled ? null : res.filePaths
  })

  ipcMain.handle('shell:openPath', async (_e, p: string) => shell.openPath(p))

  // ---------- Quản lý repo ----------
  ipcMain.handle('repo:list', () => store.listRepos())
  ipcMain.handle('repo:lastId', () => store.getLastRepoId())
  ipcMain.handle('repo:touch', (_e, id: string) => store.touchRepo(id))
  ipcMain.handle('repo:remove', (_e, id: string) => store.removeRepo(id))

  ipcMain.handle('repo:add', async (_e, path: string) => {
    const isRepo = await gitSvc.isGitRepo(path)
    if (!isRepo) {
      return { error: 'Thư mục này không phải là Git repository.' }
    }
    return { repo: store.addRepo(path) }
  })

  ipcMain.handle('repo:create', async (_e, opts: CreateRepoOptions) => {
    const target = join(opts.path, opts.name)
    await fs.mkdir(target, { recursive: true })
    // README mặc định
    const readme = join(target, 'README.md')
    try {
      await fs.access(readme)
    } catch {
      await fs.writeFile(readme, `# ${opts.name}\n`, 'utf-8')
    }
    if (opts.initGit) {
      await gitSvc.init(target)
    }
    if (opts.initDvc && (await dvcSvc.isInstalled())) {
      await dvcSvc.init(target)
    }
    return { repo: store.addRepo(target, opts.name) }
  })

  ipcMain.handle('repo:clone', async (_e, args: { url: string; dest: string }) => {
    const win = getWindow()
    const send = (s: string) => win?.webContents.send('clone:progress', s)
    const res = await gitSvc.clone(args.url, args.dest, send)
    if (!res.ok) return { error: res.stderr || 'Clone thất bại' }
    return { repo: store.addRepo(args.dest) }
  })

  // ---------- Git ----------
  ipcMain.handle('git:status', (_e, cwd: string) => gitSvc.status(cwd))
  ipcMain.handle('git:stage', (_e, cwd: string, paths: string[]) => gitSvc.stage(cwd, paths))
  ipcMain.handle('git:unstage', (_e, cwd: string, paths: string[]) => gitSvc.unstage(cwd, paths))
  ipcMain.handle('git:stageAll', (_e, cwd: string) => gitSvc.stageAll(cwd))
  ipcMain.handle('git:discard', (_e, cwd: string, paths: string[]) => gitSvc.discard(cwd, paths))
  ipcMain.handle('git:commit', (_e, cwd: string, msg: string) => gitSvc.commit(cwd, msg))
  ipcMain.handle('git:log', (_e, cwd: string) => gitSvc.log(cwd))
  ipcMain.handle('git:branches', (_e, cwd: string) => gitSvc.branches(cwd))
  ipcMain.handle('git:createBranch', (_e, cwd: string, name: string) => gitSvc.createBranch(cwd, name))
  ipcMain.handle('git:checkout', (_e, cwd: string, name: string) => gitSvc.checkout(cwd, name))
  ipcMain.handle('git:diff', (_e, cwd: string, path: string, staged: boolean) =>
    gitSvc.diff(cwd, path, staged)
  )
  // Git nâng cao
  const fwd = (ch: string) => (cb: string) => getWindow()?.webContents.send(ch, cb)
  ipcMain.handle('git:fetch', (_e, cwd: string) => gitSvc.fetch(cwd, fwd('git:progress')))
  ipcMain.handle('git:pull', (_e, cwd: string) => gitSvc.pull(cwd, fwd('git:progress')))
  ipcMain.handle('git:push', (_e, cwd: string) => gitSvc.push(cwd, fwd('git:progress')))
  ipcMain.handle('git:publishBranch', (_e, cwd: string) =>
    gitSvc.publishBranch(cwd, fwd('git:progress'))
  )
  ipcMain.handle('git:renameBranch', (_e, cwd: string, o: string, n: string) =>
    gitSvc.renameBranch(cwd, o, n)
  )
  ipcMain.handle('git:deleteBranch', (_e, cwd: string, n: string, force: boolean) =>
    gitSvc.deleteBranch(cwd, n, force)
  )
  ipcMain.handle('git:merge', (_e, cwd: string, n: string) => gitSvc.mergeBranch(cwd, n))
  ipcMain.handle('git:rebase', (_e, cwd: string, n: string) => gitSvc.rebaseOnto(cwd, n))
  ipcMain.handle('git:repoState', (_e, cwd: string) => gitSvc.repoState(cwd))
  ipcMain.handle('git:abortMerge', (_e, cwd: string) => gitSvc.abortMerge(cwd))
  ipcMain.handle('git:abortRebase', (_e, cwd: string) => gitSvc.abortRebase(cwd))
  ipcMain.handle('git:continueMerge', (_e, cwd: string) => gitSvc.continueMerge(cwd))
  ipcMain.handle('git:continueRebase', (_e, cwd: string) => gitSvc.continueRebase(cwd))
  ipcMain.handle('git:markResolved', (_e, cwd: string, p: string[]) => gitSvc.markResolved(cwd, p))
  ipcMain.handle('git:undoLast', (_e, cwd: string) => gitSvc.undoLastCommit(cwd))
  ipcMain.handle('git:amend', (_e, cwd: string, m: string) => gitSvc.amendCommit(cwd, m))
  ipcMain.handle('git:lastMessage', (_e, cwd: string) => gitSvc.lastCommitMessage(cwd))
  ipcMain.handle('git:revert', (_e, cwd: string, h: string) => gitSvc.revertCommit(cwd, h))
  ipcMain.handle('git:reset', (_e, cwd: string, h: string, m: 'soft' | 'mixed' | 'hard') =>
    gitSvc.resetToCommit(cwd, h, m)
  )
  ipcMain.handle('git:checkoutCommit', (_e, cwd: string, h: string) => gitSvc.checkoutCommit(cwd, h))
  ipcMain.handle('git:branchAt', (_e, cwd: string, n: string, r: string) =>
    gitSvc.createBranchAt(cwd, n, r)
  )
  ipcMain.handle('git:cherryPick', (_e, cwd: string, h: string) => gitSvc.cherryPick(cwd, h))
  ipcMain.handle('git:commitFiles', (_e, cwd: string, h: string) => gitSvc.commitFiles(cwd, h))
  ipcMain.handle('git:commitFileDiff', (_e, cwd: string, h: string, p: string) =>
    gitSvc.commitFileDiff(cwd, h, p)
  )
  ipcMain.handle('git:tags', (_e, cwd: string) => gitSvc.tags(cwd))
  ipcMain.handle('git:createTag', (_e, cwd: string, n: string, m?: string, r?: string) =>
    gitSvc.createTag(cwd, n, m, r)
  )
  ipcMain.handle('git:deleteTag', (_e, cwd: string, n: string) => gitSvc.deleteTag(cwd, n))
  ipcMain.handle('git:pushTags', (_e, cwd: string) => gitSvc.pushTags(cwd, fwd('git:progress')))
  ipcMain.handle('git:remotes', (_e, cwd: string) => gitSvc.remotes(cwd))
  ipcMain.handle('git:addRemote', (_e, cwd: string, n: string, u: string) =>
    gitSvc.addRemote(cwd, n, u)
  )
  ipcMain.handle('git:removeRemote', (_e, cwd: string, n: string) => gitSvc.removeRemote(cwd, n))
  ipcMain.handle('git:setRemoteUrl', (_e, cwd: string, n: string, u: string) =>
    gitSvc.setRemoteUrl(cwd, n, u)
  )
  ipcMain.handle('git:getIdentity', (_e, cwd: string) => gitSvc.getIdentity(cwd))
  ipcMain.handle('git:setIdentity', (_e, cwd: string, n: string, em: string) =>
    gitSvc.setIdentity(cwd, n, em)
  )
  ipcMain.handle('git:stashList', (_e, cwd: string) => gitSvc.stashList(cwd))
  ipcMain.handle('git:stashSave', (_e, cwd: string, m: string, u: boolean) =>
    gitSvc.stashSave(cwd, m, u)
  )
  ipcMain.handle('git:stashApply', (_e, cwd: string, i: number) => gitSvc.stashApply(cwd, i))
  ipcMain.handle('git:stashPop', (_e, cwd: string, i: number) => gitSvc.stashPop(cwd, i))
  ipcMain.handle('git:stashDrop', (_e, cwd: string, i: number) => gitSvc.stashDrop(cwd, i))
  ipcMain.handle('git:discardAll', (_e, cwd: string) => gitSvc.discardAll(cwd))
  // Cỗ máy thời gian / quay lại quá khứ
  ipcMain.handle('git:reflog', (_e, cwd: string) => gitSvc.reflog(cwd))
  ipcMain.handle('git:restoreFile', (_e, cwd: string, ref: string, p: string) =>
    gitSvc.restoreFileFrom(cwd, ref, p)
  )
  ipcMain.handle('git:snapshot', (_e, cwd: string, m: string) => gitSvc.snapshot(cwd, m))
  ipcMain.handle('git:squashLast', (_e, cwd: string, n: number, m: string) =>
    gitSvc.squashLast(cwd, n, m)
  )
  ipcMain.handle('git:forcePush', (_e, cwd: string) => gitSvc.forcePush(cwd, fwd('git:progress')))
  ipcMain.handle('git:pullMerge', (_e, cwd: string) => gitSvc.pullMerge(cwd, fwd('git:progress')))
  ipcMain.handle('git:searchLog', (_e, cwd: string, q: string) => gitSvc.searchLog(cwd, q))
  ipcMain.handle('git:compare', (_e, cwd: string, b: string, h: string) =>
    gitSvc.compareRefs(cwd, b, h)
  )
  ipcMain.handle('git:diffBetween', (_e, cwd: string, b: string, h: string, p: string) =>
    gitSvc.diffBetween(cwd, b, h, p)
  )
  ipcMain.handle('git:openFile', (_e, cwd: string, p: string) =>
    shell.openPath(require('path').join(cwd, p))
  )
  ipcMain.handle('git:openTerminal', (_e, cwd: string) => {
    const { spawn } = require('child_process')
    if (process.platform === 'win32') {
      spawn('cmd.exe', ['/c', 'start', 'cmd.exe'], { cwd, detached: true })
    } else {
      shell.openPath(cwd)
    }
  })

  // ---------- DVC ----------
  ipcMain.handle('dvc:info', (_e, cwd: string) => dvcSvc.info(cwd))
  ipcMain.handle('dvc:isInstalled', () => dvcSvc.isInstalled())
  ipcMain.handle('dvc:init', (_e, cwd: string) => dvcSvc.init(cwd))
  ipcMain.handle('dvc:add', (_e, cwd: string, paths: string[]) => dvcSvc.add(cwd, paths))
  ipcMain.handle('dvc:setRemoteLocal', (_e, cwd: string, p: string) => dvcSvc.setRemoteLocal(cwd, p))
  ipcMain.handle('dvc:setRemoteGdrive', (_e, cwd: string, id: string) => dvcSvc.setRemoteGdrive(cwd, id))
  ipcMain.handle('dvc:push', (_e, cwd: string) => dvcSvc.push(cwd))
  ipcMain.handle('dvc:pull', (_e, cwd: string) => dvcSvc.pull(cwd))

  // ---------- Google Drive ----------
  ipcMain.handle('drive:detect', () => driveSvc.detectDriveRoots())
  ipcMain.handle('drive:autoConnect', (_e, cwd: string) => driveSvc.autoConnect(cwd))

  // ---------- Tài khoản Google Drive (nhiều Gmail/Drive) ----------
  ipcMain.handle('acc:list', () => accountsSvc.listAccounts())
  ipcMain.handle('acc:add', (_e, a: Omit<DriveAccount, 'id'>) => accountsSvc.addAccount(a))
  ipcMain.handle('acc:update', (_e, a: DriveAccount) => accountsSvc.updateAccount(a))
  ipcMain.handle('acc:remove', (_e, id: string) => accountsSvc.removeAccount(id))
  ipcMain.handle('acc:active', (_e, cwd: string) => accountsSvc.getActiveAccountId(cwd))
  ipcMain.handle('acc:apply', (_e, cwd: string, id: string) => accountsSvc.applyAccount(cwd, id))

  // ---------- Sync ----------
  ipcMain.handle('sync:run', async (_e, cwd: string) => {
    const win = getWindow()
    return syncSvc.runSync(cwd, (step, log) => {
      win?.webContents.send('sync:progress', { step, log })
    })
  })
}
