import { execa } from 'execa'
import { consola } from 'consola'
import { resolve } from 'pathe'
import { defineCommand } from 'citty'
import { tryResolveModule } from '../utils/esm'
import { cwdArgs, legacyRootDirArgs, logLevelArgs } from './_shared'

const MODULE_BUILDER_PKG = '@nuxt/module-builder'

export default defineCommand({
  meta: {
    name: 'build-module',
    description: `Helper command for using ${MODULE_BUILDER_PKG}`,
  },
  args: {
    ...cwdArgs,
    ...logLevelArgs,
    ...legacyRootDirArgs,
    build: {
      type: 'boolean',
      description: 'Build module for distribution',
      default: false,
    },
    stub: {
      type: 'boolean',
      description: 'Stub dist instead of actually building it for development',
      default: false,
    },
    sourcemap: {
      type: 'boolean',
      description: 'Generate sourcemaps',
      default: false,
    },
    prepare: {
      type: 'boolean',
      description: 'Prepare module for local development',
      default: false,
    },
  },
  async run(ctx) {
    // Find local installed version
    const cwd = resolve(ctx.args.cwd || ctx.args.rootDir)

    const hasLocal = await tryResolveModule(
      `${MODULE_BUILDER_PKG}/package.json`,
      cwd,
    )

    const execArgs = Object.entries({
      '--stub': ctx.args.stub,
      '--sourcemap': ctx.args.sourcemap,
      '--prepare': ctx.args.prepare,
    })
      .filter(([, value]) => value)
      .map(([key]) => key)

    let cmd = 'nuxt-module-build'
    if (!hasLocal) {
      consola.warn(
        `Cannot find locally installed version of \`${MODULE_BUILDER_PKG}\` (>=0.2.0). Falling back to \`npx ${MODULE_BUILDER_PKG}\``,
      )
      cmd = 'npx'
      execArgs.unshift(MODULE_BUILDER_PKG)
    }

    await execa(cmd, execArgs, {
      cwd,
      preferLocal: true,
      stdio: 'inherit',
    })
  },
})
