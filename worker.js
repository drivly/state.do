import { assign, createMachine } from 'xstate'

export default {
  fetch: (req, env) => {
    const { hostname, pathname } = new URL(req.url)
    const id = env.STATE.idFromName(hostname + pathname)
    const stub = env.STATE.get(id)
    return stub.fetch(req)
  },
}

export class State {
  constructor(state, env) {
    this.state = state
  }

  async fetch(req) {
    if (!this.machine)
      this.machine = createMachine({
        predictableActionArguments: true,
        id: 'friends',
        context: { userId: 42, user: undefined, friends: undefined },
        initial: 'gettingUser',
        states: {
          gettingUser: {
            invoke: {
              src: this.getUserInfo,
              onDone: {
                target: 'gettingFriends',
                actions: assign({
                  user: (context, event) => event.data,
                }),
              },
            },
          },
          gettingFriends: {
            invoke: {
              src: this.getUserFriends,
              onDone: {
                target: 'success',
                actions: assign({
                  friends: (context, event) => event.data,
                }),
              },
            },
          },
          success: {
            type: 'final',
          },
        },
      })

    const { url, method } = req
    const { origin, hostname, pathname, searchParams, hash } = new URL(url)
    const id = req.headers.get('cf-ray') + '-' + req.cf.colo
    const ts = Date.now()
    const retval = {
      origin,
      method,
      hostname,
      pathname,
      searchParams,
      hash,
      id,
      ts,
    }
    return new Response(JSON.stringify(retval, null, 2), { headers: { 'content-type': 'application/json' } })
  }

  createNewMachine() {}

  async getUserInfo(context) {
    const response = await fetch(`/api/users/${context.userId}`)
    return await response.json()
  }

  // Returns a Promise
  getUserFriends(context) {
    const { friends } = context.user
    return Promise.all(friends.map((friendId) => fetch(`/api/users/${friendId}/`).then((response) => response.json())))
  }
}
