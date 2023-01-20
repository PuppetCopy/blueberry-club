
/**
 * The globalThis.regeneratorRuntime = undefined addresses a potentially unsafe-eval problem
 * Source: https://github.com/facebook/regenerator/issues/378#issuecomment-802628326
 * Date: July 14, 2021
 */
// @ts-ignore
globalThis.regeneratorRuntime = undefined

import 'construct-style-sheets-polyfill'
import './assignThemeSync' // apply synchnously theme before all styles are being evaluated

import { runBrowser } from "@aelea/dom"
import { $Main } from './pages/$Main'


runBrowser()(
  $Main({})({})
)