import Store from 'electron-store'
import { randomUUID } from 'crypto'
import { basename } from 'path'
import type { Repo } from '@shared/types'

interface Schema {
  repos: Repo[]
  lastRepoId: string | null
}

const store = new Store<Schema>({
  defaults: { repos: [], lastRepoId: null }
})

export function listRepos(): Repo[] {
  return [...store.get('repos')].sort((a, b) => b.lastOpened - a.lastOpened)
}

export function addRepo(path: string, name?: string): Repo {
  const repos = store.get('repos')
  const existing = repos.find((r) => r.path === path)
  if (existing) {
    existing.lastOpened = Date.now()
    store.set('repos', repos)
    return existing
  }
  const repo: Repo = {
    id: randomUUID(),
    name: name || basename(path),
    path,
    lastOpened: Date.now()
  }
  store.set('repos', [...repos, repo])
  return repo
}

export function removeRepo(id: string): void {
  store.set(
    'repos',
    store.get('repos').filter((r) => r.id !== id)
  )
}

export function touchRepo(id: string): void {
  const repos = store.get('repos')
  const r = repos.find((x) => x.id === id)
  if (r) {
    r.lastOpened = Date.now()
    store.set('repos', repos)
  }
  store.set('lastRepoId', id)
}

export function getLastRepoId(): string | null {
  return store.get('lastRepoId')
}
