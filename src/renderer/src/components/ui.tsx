import React, { useState } from 'react'
import { Modal } from './Modal'

export interface MenuItem {
  label?: string
  onClick?: () => void
  disabled?: boolean
  separator?: boolean
  danger?: boolean
  checked?: boolean
}

export function Menu({
  items,
  onClose,
  style
}: {
  items: MenuItem[]
  onClose: () => void
  style?: React.CSSProperties
}) {
  return (
    <>
      <div className="menu-overlay" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose() }} />
      <div className="dropdown menu" style={style}>
        {items.map((it, i) =>
          it.separator ? (
            <div key={i} className="menu-sep" />
          ) : (
            <div
              key={i}
              className={`dropdown-item ${it.disabled ? 'disabled' : ''} ${it.danger ? 'danger' : ''}`}
              onClick={() => {
                if (it.disabled) return
                onClose()
                it.onClick?.()
              }}
            >
              {it.checked ? '✓ ' : ''}
              {it.label}
            </div>
          )
        )}
      </div>
    </>
  )
}

export function Prompt({
  title,
  label,
  defaultValue = '',
  placeholder,
  submitLabel = 'OK',
  onCancel,
  onSubmit
}: {
  title: string
  label: string
  defaultValue?: string
  placeholder?: string
  submitLabel?: string
  onCancel: () => void
  onSubmit: (value: string) => void
}) {
  const [value, setValue] = useState(defaultValue)
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button className="btn" onClick={onCancel}>
            Huỷ
          </button>
          <button className="btn accent" onClick={() => value.trim() && onSubmit(value.trim())}>
            {submitLabel}
          </button>
        </>
      }
    >
      <div className="field">
        <label>{label}</label>
        <input
          type="text"
          autoFocus
          value={value}
          placeholder={placeholder}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && value.trim() && onSubmit(value.trim())}
        />
      </div>
    </Modal>
  )
}
