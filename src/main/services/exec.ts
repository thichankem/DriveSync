import { spawn } from 'child_process'
import type { CommandResult } from '@shared/types'

export interface RunOptions {
  cwd?: string
  /** Callback nhận từng đoạn output theo thời gian thực (để stream tiến trình). */
  onData?: (chunk: string, stream: 'stdout' | 'stderr') => void
  env?: NodeJS.ProcessEnv
}

/**
 * Chạy một lệnh CLI và trả về kết quả. Dùng spawn (không qua shell) để tránh
 * vấn đề escape với đường dẫn có dấu cách / ký tự tiếng Việt.
 */
export function run(command: string, args: string[], opts: RunOptions = {}): Promise<CommandResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: opts.cwd,
      env: { ...process.env, ...opts.env },
      // Trên Windows, git/dvc là .exe/.cmd; shell:true giúp phân giải .cmd.
      shell: process.platform === 'win32',
      windowsHide: true
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (d) => {
      const s = d.toString()
      stdout += s
      opts.onData?.(s, 'stdout')
    })
    child.stderr.on('data', (d) => {
      const s = d.toString()
      stderr += s
      opts.onData?.(s, 'stderr')
    })

    child.on('error', (err) => {
      resolve({ ok: false, code: -1, stdout, stderr: stderr + '\n' + err.message })
    })

    child.on('close', (code) => {
      resolve({ ok: code === 0, code: code ?? -1, stdout, stderr })
    })
  })
}

export async function commandExists(command: string): Promise<boolean> {
  const probe = process.platform === 'win32' ? 'where' : 'which'
  const res = await run(probe, [command])
  return res.ok
}
