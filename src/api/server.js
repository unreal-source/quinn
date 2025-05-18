import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import appealSubmitted from './routes/appeal-submitted.js'
import { fastifyOptions } from '../utilities/logger.js'

const fastify = Fastify({
  logger: fastifyOptions
})

const server = {
  configure (client) {
    // Register plugins
    fastify.register(cors, {
      origin: process.env.API_CORS_ORIGIN,
      methods: ['POST']
    })
    fastify.register(helmet)
    fastify.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute'
    })

    // Register routes
    fastify.register((instance, opts, done) => {
      instance.route(appealSubmitted(client))
      done()
    })
  },
  async start () {
    // Start the server
    try {
      await fastify.listen({ port: process.env.API_PORT })
      fastify.log.info(`Server is running on http://localhost:${process.env.API_PORT}`)
    } catch (e) {
      fastify.log(e)
      process.exit(1)
    }
  }
}

export default server
