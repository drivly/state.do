import { createMachine } from 'xstate'

export default {
  fetch: (req, env) => {
    const { hostname, pathname } = new URL(req.url)
    const [_, instance] = pathname.split('/')
    const id = env.STATE.idFromName(hostname + instance)
    const stub = env.STATE.get(id)
    return stub.fetch(req)
  },
}

export class State {
  constructor(state, env) {
    this.state = state
  }

  async fetch(req) {
    if (!this.machine) this.machine = createMachine(await req.json())

    const { url, method } = req
    const { origin, hostname, pathname, searchParams, hash } = new URL(url)
    const id = req.headers.get('cf-ray') + '-' + req.cf.colo
    const ts = Date.UTC()
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
}
