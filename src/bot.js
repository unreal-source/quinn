import { HieiClient } from '../hiei.js'
import { GatewayIntentBits } from 'discord.js'

const client = new HieiClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages
  ]
})

client.login(process.env.TOKEN)
