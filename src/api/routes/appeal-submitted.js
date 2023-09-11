export default function (client) {
  return {
    method: 'POST',
    url: process.env.APPEAL_SUBMITTED_ENDPOINT,
    schema: {
      body: {
        type: 'object',
        properties: {
          eventId: { type: 'string' },
          eventType: { type: 'string' },
          createdAt: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              responseId: { type: 'string' },
              submissionId: { type: 'string' },
              respondentId: { type: 'string' },
              formId: { type: 'string' },
              formName: { type: 'string' },
              createdAt: { type: 'string' },
              fields: {
                type: 'array',
                items: { type: 'object' }
              }
            },
            required: ['responseId', 'submissionId', 'respondentId', 'formId', 'formName', 'createdAt', 'fields']
          }
        },
        required: ['eventId', 'eventType', 'createdAt', 'data']
      }
    },
    handler: async (request, reply) => {
      try {
        // Get appeal data
        // Create a new post in #ban-appeals
        // Post a notification in #moderator-chat
        const data = request.body
        const fields = data.data.fields
        const username = fields[0].value
        const banReason = fields[1].value
        const notificationNotReceived = fields[3].value
        const appeal = fields[4].value
        const appealChannel = await client.channels.fetch(process.env.BAN_APPEALS_CHANNEL)
        const moderatorChatChannel = await client.channels.fetch(process.env.MODERATOR_CHAT_CHANNEL)

        const post = await appealChannel.threads.create({
          name: `New appeal from ${username}`,
          message: {
            content: `## Username\n${username}\n## Reason for ban\n${notificationNotReceived ? 'User did not receive a notification' : banReason}\n## Appeal\n${appeal}`
          }
        })

        moderatorChatChannel.send({ content: `A new ban appeal was submitted. ${post.url}` })

        reply.code(200).send({ message: 'New ban appeal submitted' })
      } catch (error) {
        console.error(`Error processing request: ${error}`)
        reply.code(500).send({ error: 'An error occured while processing the request' })
      }
    }
  }
}
