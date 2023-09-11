export default function (client) {
  return {
    method: 'POST',
    url: process.env.APPEAL_SUBMITTED_ENDPOINT,
    schema: {
      body: {}
    },
    handler: async (request, reply) => {
      try {
        const data = request.body

        console.log(data)

        // Get appeal data
        // Create a new post in #ban-appeals
        // Post a notification in #moderator-chat

        reply.code(200).send({ message: 'New ban appeal submitted' })
      } catch (error) {
        console.error(`Error processing request: ${error}`)
        reply.code(500).send({ error: 'An error occured while processing the request' })
      }
    }
  }
}
