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
  environment: process.env.SENTRY_ENVIRONMENT,
  dsn: process.env.SENTRY_DSN
})

client.login(process.env.TOKEN)

api.configure(client)
api.start()
