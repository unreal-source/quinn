import { HieiClient } from 'hiei.js'
import { GatewayIntentBits } from 'discord.js'

const client = new HieiClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages
  ]
})

client.login(process.env.TOKEN)
