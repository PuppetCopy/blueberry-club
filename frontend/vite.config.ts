import { defineConfig } from 'vite'
import dotenv from 'dotenv'
import path from 'path'
// import rollupNodePolyFill from 'rollup-plugin-node-polyfills'
// import { NodeGlobalsPolyfillPlugin } from "@esbuild-plugins/node-globals-polyfill";

const parentDotenvPath = path.join(__dirname, '..', '.env')
const parentDotenvConfig = dotenv.config({ path: parentDotenvPath })

if (parentDotenvConfig.parsed === undefined) {
  throw new Error(`Failed to load parent .env file at ${parentDotenvPath}`)
}

const prefixedParentEnv = Object.fromEntries(
  Object.entries(parentDotenvConfig.parsed).map(([key, value]) => [`import.meta.env.${key}`, JSON.stringify(value)])
)

// https://vitejs.dev/config/
export default defineConfig({

  define: {
    ...prefixedParentEnv,
    global: "globalThis",
  },
  build: {
    outDir: ".dist",
    // rollupOptions: {
    //   plugins: [
    //     // Enable rollup polyfills plugin
    //     // used during production bundling
    //     // rollupNodePolyFill()
    //   ]
    // }
  },
  resolve: {
    alias: {
      events: 'eventemitter3',
    }
  }
})