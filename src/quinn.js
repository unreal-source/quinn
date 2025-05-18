import { HieiClient } from 'hiei.js'
import { GatewayIntentBits } from 'discord.js'
import * as Sentry from '@sentry/node'
import api from './api/server.js'

const client = new HieiClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates
  ]
})

Sentry.init({
  environment: Bun.env.SENTRY_ENVIRONMENT,
  dsn: Bun.env.SENTRY_DSN
})

client.login(Bun.env.TOKEN)

api.configure(client)
api.start()
