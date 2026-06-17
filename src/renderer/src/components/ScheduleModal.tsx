import React, { useEffect, useState } from 'react'
import { Modal } from './Modal'
import type { BackupAction, BackupSchedule, BackupUnit } from '@shared/types'

interface Props {
  repoPath: string
  onClose: () => void
  toast: (m: string) => void
}

const UNIT_LABEL: Record<BackupUnit, string> = { minute: 'phút', hour: 'giờ', day: 'ngày' }
const ACTION_LABEL: Record<BackupAction, string> = {
  commit: 'Chỉ tạo điểm khôi phục (commit)',
  push: 'Commit + đẩy lên GitHub (push)',
  sync: 'Commit + Sync (GitHub + Google Drive)'
}

export function ScheduleModal({ repoPath, onClose, toast }: Props) {
  const [cfg, setCfg] = useState<BackupSchedule>({
    enabled: false,
    every: 30,
    unit: 'minute',
    action: 'commit'
  })

  useEffect(() => {
    window.api.schedule.get(repoPath).then(setCfg)
  }, [repoPath])

  const save = async () => {
    await window.api.schedule.set(repoPath, cfg)
    toast(cfg.enabled ? 'Đã bật tự động sao lưu' : 'Đã tắt tự động sao lưu')
    onClose()
  }

  return (
    <Modal
      title="⏰ Tự động sao lưu theo lịch"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Huỷ
          </button>
          <button className="btn accent" onClick={save}>
            Lưu
          </button>
        </>
      }
    >
      <label className="checkbox-field" style={{ marginBottom: 16 }}>
        <input
          type="checkbox"
          checked={cfg.enabled}
          onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })}
        />
        <b>Bật tự động sao lưu cho repo này</b>
      </label>

      <div className="field">
        <label>Tần suất</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Mỗi</span>
          <input
            type="number"
            min={1}
            value={cfg.every}
            onChange={(e) => setCfg({ ...cfg, every: Math.max(1, parseInt(e.target.value || '1', 10)) })}
            style={{ width: 80, padding: '7px 9px', border: '1px solid var(--border)', borderRadius: 6 }}
          />
          <select
            value={cfg.unit}
            onChange={(e) => setCfg({ ...cfg, unit: e.target.value as BackupUnit })}
            style={{ padding: '7px 9px', border: '1px solid var(--border)', borderRadius: 6 }}
          >
            {(['minute', 'hour', 'day'] as BackupUnit[]).map((u) => (
              <option key={u} value={u}>
                {UNIT_LABEL[u]}
              </option>
            ))}
          </select>
        </div>
        <div className="field-hint">Ví dụ: mỗi 30 phút, mỗi 1 giờ, mỗi 1 ngày…</div>
      </div>

      <div className="field">
        <label>Hành động mỗi lần chạy</label>
        <select
          value={cfg.action}
          onChange={(e) => setCfg({ ...cfg, action: e.target.value as BackupAction })}
          style={{ width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6 }}
        >
          {(['commit', 'push', 'sync'] as BackupAction[]).map((a) => (
            <option key={a} value={a}>
              {ACTION_LABEL[a]}
            </option>
          ))}
        </select>
      </div>

      <div className="field-hint">
        ⓘ Tự động sao lưu chạy <b>khi DriveSync đang mở</b>. Nếu không có thay đổi nào thì bỏ qua,
        không tạo commit rỗng.
        {cfg.lastRun && (
          <>
            <br />
            Lần chạy gần nhất: <b>{new Date(cfg.lastRun).toLocaleString('vi-VN')}</b>
          </>
        )}
      </div>
    </Modal>
  )
}
