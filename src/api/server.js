import fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import appealSubmitted from './routes/appeal-submitted.js'
import logger from '../utilities/logger.js'

const app = fastify({ logger })

const server = {
  configure (client) {
    // Register plugins
    app.register(cors, {
      origin: process.env.API_CORS_ORIGIN,
      methods: ['POST']
    })
    app.register(helmet)
    app.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute'
    })

    // Register routes
    app.register((instance, opts, done) => {
      instance.route(appealSubmitted(client))
      done()
    })
  },
  async start () {
    // Start the server
    try {
      await app.listen({ port: process.env.API_PORT })
      app.log.info(`Server is running on http://localhost:${process.env.API_PORT}`)
    } catch (e) {
      app.log(e)
      process.exit(1)
    }
  }
}

export default server
