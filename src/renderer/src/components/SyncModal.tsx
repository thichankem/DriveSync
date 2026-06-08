import React from 'react'
import { Modal } from './Modal'
import type { SyncStep } from '@shared/types'
import { CheckIcon, SyncIcon, XIcon } from './icons'

interface Props {
  steps: SyncStep[]
  running: boolean
  onClose: () => void
}

function StepIcon({ status }: { status: SyncStep['status'] }) {
  if (status === 'running') return <SyncIcon className="spin" />
  if (status === 'done') return <span style={{ color: 'var(--green)' }}><CheckIcon /></span>
  if (status === 'error') return <span style={{ color: 'var(--red)' }}><XIcon /></span>
  if (status === 'skipped') return <span style={{ color: 'var(--text-muted)' }}>–</span>
  return <span style={{ color: 'var(--text-muted)' }}>○</span>
}

export function SyncModal({ steps, running, onClose }: Props) {
  return (
    <Modal
      title="Đồng bộ (Git + DVC ⇄ Google Drive)"
      onClose={running ? () => {} : onClose}
      footer={
        <button className="btn accent" onClick={onClose} disabled={running}>
          {running ? 'Đang đồng bộ…' : 'Đóng'}
        </button>
      }
    >
      {steps.map((s) => (
        <div className="sync-step" key={s.key}>
          <span className="icon">
            <StepIcon status={s.status} />
          </span>
          <div className="step-label">
            {s.label}
            {s.detail && <div className="step-detail">{s.detail}</div>}
          </div>
        </div>
      ))}
    </Modal>
  )
}
