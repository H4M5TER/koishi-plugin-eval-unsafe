import { Context, h, z } from 'koishi'
import { inspect } from 'util'

export const name = 'eval-unsafe'

export interface Config { }

export const Config: z<Config> = z.object({})

const AsyncFunction = async function () { }.constructor

export function apply(ctx: Context) {
  const logger = ctx.logger(name)
  logger.level = 3

  ctx.command('eval <code:text>', {
    authority: 4,
    captureQuote: false,
  }).action(async (argv, code) => {
    if (!code.includes('return')) {
      code = `return (${code})`
    }
    const session = argv.session
    const expose = {
      require,
      ...require('koishi'),
      ctx,
      session,
      user: session.user,
      channel: session.channel,
      guild: session.guild,
      userId: session.userId,
      channelId: session.channelId,
      guildId: session.guildId,
      selfId: session.selfId,
      app: session.app,
      logger,
      bot: session.bot,
      argv,
      send: session.send.bind(session),
      // @ts-expect-error
      exec: (...args) => session.execute(...args, true),
      inspect: (obj: any) => inspect(obj, { depth: Infinity }),
    }

    async function __eval_wrapper__() {
      const func: (args: typeof expose) => Promise<any> = AsyncFunction(
        `{ ${Object.keys(expose).join(', ')} }`,
        code,
      )
      let result = await func.call(this, expose)

      if (result === undefined) {
        return 'undefined'
      }
      if (typeof result !== 'string') {
        result = inspect(result)
      }
      return h.escape(result)
    }

    try {
      return __eval_wrapper__()
    } catch (error) {
      return 'Uncaught ' + inspect(error)
    }
  })
}
