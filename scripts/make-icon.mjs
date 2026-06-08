// Sinh build/icon.png và build/icon.ico từ build/icon.svg
import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import { readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = readFileSync(join(root, 'build', 'icon.svg'))

// PNG 256 cho electron-builder (Linux/macOS) và xem trước
const png256 = await sharp(svg).resize(256, 256).png().toBuffer()
writeFileSync(join(root, 'build', 'icon.png'), png256)

// ICO chứa nhiều kích thước cho Windows
const sizes = [16, 24, 32, 48, 64, 128, 256]
const buffers = await Promise.all(
  sizes.map((s) => sharp(svg).resize(s, s).png().toBuffer())
)
const ico = await pngToIco(buffers)
writeFileSync(join(root, 'build', 'icon.ico'), ico)

console.log('Đã tạo build/icon.png và build/icon.ico')
