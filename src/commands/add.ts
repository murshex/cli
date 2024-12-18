import { existsSync, promises as fsp } from 'node:fs'
import { dirname, resolve, extname } from 'pathe'
import { consola } from 'consola'
import { defineCommand } from 'citty'
import { loadKit } from '../utils/kit'
import { templates } from '../utils/templates'
import { cwdArgs, logLevelArgs } from './_shared'

export default defineCommand({
  meta: {
    name: 'add',
    description: 'Create a new template file.',
  },
  args: {
    ...cwdArgs,
    ...logLevelArgs,
    force: {
      type: 'boolean',
      description: 'Force override file if it already exists',
      default: false,
    },
    template: {
      type: 'positional',
      required: true,
      valueHint: Object.keys(templates).join('|'),
      description: `Specify which template to generate`,
    },
    name: {
      type: 'positional',
      required: true,
      description: 'Specify name of the generated file',
    },
  },
  async run(ctx) {
    const cwd = resolve(ctx.args.cwd)

    const templateName = ctx.args.template
    const template = templates[templateName]
    const ext = extname(ctx.args.name)
    const name
      = ext === '.vue' || ext === '.ts'
        ? ctx.args.name.replace(ext, '')
        : ctx.args.name

    // Validate template name
    if (!template) {
      consola.error(
        `Template ${templateName} is not supported. Possible values: ${Object.keys(
          templates,
        ).join(', ')}`,
      )
      process.exit(1)
    }

    // Validate options
    if (!name) {
      consola.error('name argument is missing!')
      process.exit(1)
    }

    // Load config in order to respect srcDir
    const kit = await loadKit(cwd)
    const config = await kit.loadNuxtConfig({ cwd })

    // Resolve template
    const res = template({ name, args: ctx.args, nuxtOptions: config })

    // Ensure not overriding user code
    if (!ctx.args.force && existsSync(res.path)) {
      consola.error(
        `File exists: ${res.path} . Use --force to override or use a different name.`,
      )
      process.exit(1)
    }

    // Ensure parent directory exists
    const parentDir = dirname(res.path)
    if (!existsSync(parentDir)) {
      consola.info('Creating directory', parentDir)
      if (templateName === 'page') {
        consola.info('This enables vue-router functionality!')
      }
      await fsp.mkdir(parentDir, { recursive: true })
    }

    // Write file
    await fsp.writeFile(res.path, res.contents.trim() + '\n')
    consola.info(`🪄 Generated a new ${templateName} in ${res.path}`)
  },
})
