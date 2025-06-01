import { is } from '@electron-toolkit/utils'
import path from 'path'
import url from 'url'

export function getRootUrl(): string {
  // Must add a # because we are using hash routing.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    return process.env['ELECTRON_RENDERER_URL']! + '#'
  } else {
    return (
      url.format({
        pathname: path.join(__dirname, '../renderer/index.html'),
        protocol: 'file:',
        slashes: true
      }) + '#'
    )
  }
}
