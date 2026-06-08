import React from 'react'
import type { Repo } from '@shared/types'
import { CloneIcon, FolderIcon, PlusIcon, RepoIcon, TrashIcon } from './icons'

interface Props {
  repos: Repo[]
  onOpen: (repo: Repo) => void
  onRemove: (id: string) => void
  onCreate: () => void
  onAdd: () => void
  onClone: () => void
}

export function Welcome({ repos, onOpen, onRemove, onCreate, onAdd, onClone }: Props) {
  return (
    <div className="welcome">
      <div className="welcome-card">
        <h1>DriveSync</h1>
        <p className="sub">Quản lý dự án &amp; code kiểu GitHub Desktop — lưu trữ qua DVC + Google Drive</p>

        <div className="welcome-actions">
          <button className="welcome-action" onClick={onCreate}>
            <PlusIcon size={24} />
            <b>Tạo mới</b>
            <span>Tạo repository mới</span>
          </button>
          <button className="welcome-action" onClick={onAdd}>
            <FolderIcon size={24} />
            <b>Mở có sẵn</b>
            <span>Thêm repo trên máy</span>
          </button>
          <button className="welcome-action" onClick={onClone}>
            <CloneIcon size={24} />
            <b>Clone</b>
            <span>Tải về từ URL</span>
          </button>
        </div>

        {repos.length > 0 && (
          <>
            <div className="repo-list-title">Repository gần đây</div>
            <div>
              {repos.map((r) => (
                <div className="repo-item" key={r.id} onClick={() => onOpen(r)}>
                  <RepoIcon />
                  <div className="meta">
                    <b>{r.name}</b>
                    <small>{r.path}</small>
                  </div>
                  <button
                    className="remove"
                    title="Xoá khỏi danh sách"
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemove(r.id)
                    }}
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
