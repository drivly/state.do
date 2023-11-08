import { createMachine, interpret } from 'xstate'

export default {
  fetch: (req, env) => {
    if (req.method == 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': req.headers.get('Origin') || req.headers.get('host'),
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cookie, X-Forwarded-Proto, X-Forwarded-For',
          'Access-Control-Max-Age': '86400',
        },
      })
    }
    const { hostname, pathname } = new URL(req.url)
    const instance = pathname.split('/')[1]
    const id = env.STATE.idFromName(hostname + instance)
    const stub = env.STATE.get(id)
    return stub.fetch(req)
  },
}

export class State {
  state
  env
  /** @type {import('xstate').MachineConfig} */
  machineDefinition
  /** @type {import('xstate').StateValue} */
  machineState
  /** @type {import('xstate').StateMachine} */
  machine
  /** @type {import('xstate').Interpreter} */
  service
  /** @type {import('xstate').State} */
  serviceState

  constructor(state, env) {
    this.state = state
    this.env = env
    state.blockConcurrencyWhile(async () => {
      ;[this.machineDefinition, this.machineState] = await Promise.all([this.state.storage.get('machineDefinition'), this.state.storage.get('machineState')])
      if (this.machineDefinition) {
        this.startMachine(this.machineState)
      }
    })
  }

  /**
   * @param {import('xstate').StateValue|undefined} state
   */
  startMachine(state) {
    this.machine = createMachine(this.machineDefinition)
    this.service = interpret(this.machine)
    this.service.onTransition(async (state) => {
      this.serviceState = state
      if (this.machineState === state.value) return
      await this.state.storage.put('machineState', (this.machineState = state.value))
      const meta = Object.values(state.meta)[0]
      const callback = meta?.callback || state.configuration.flatMap((c) => c.config).reduce((acc, c) => ({ ...acc, ...c }), {}).callback
      if (callback) {
        const callbacks = Array.isArray(callback) ? callback : [callback]
        for (let i = 0; i < callbacks.length; i++) {
          const url = typeof callbacks[i] === 'string' || callbacks[i] instanceof String ? callbacks[i] : callbacks[i].url
          const init = callbacks[i].init || meta?.init || {}
          init.headers = { 'content-type': 'application/json', ...(callbacks[i].headers || meta?.headers || init.headers) }
          init.method = callbacks[i].method || meta?.method || init.method || 'POST'
          init.body = JSON.stringify(callbacks[i].body || meta?.body || state.event)
          console.log({ url, init, state })
          const data = await fetch(url, init)
          // Escape special regex characters and replace x with \d to check if the callback status code matches an event (e.g. 2xx)
          const event = state?.nextEvents.find((e) => data.status.toString().match(new RegExp(e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/x/gi, '\\d'))))
          this.service.send(event || data.status.toString(), await data.json())
        }
      }
    })
    try {
      this.service.start(state)
    } catch (error) {
      // Machines with new definitions that have incompatible states can't recycle the old state
      this.reset()
    }
  }

  async reset() {
    // Stop the service and reset the state before restarting it
    this.service?.stop()
    this.service = undefined
    this.serviceState = undefined
    if (this.machineState) {
      this.machineState = undefined
      await this.state.storage.delete('machineState')
    }
    // Restart the service
    if (this.machineDefinition) this.startMachine()
  }

  /**
   * @param {import('xstate').MachineConfig} machineDefinition
   */
  async update(machineDefinition) {
    // Don't update if the new definition is empty or hasn't changed
    if (!machineDefinition || machineDefinition === this.machineDefinition) return
    this.service?.stop()
    await this.state.storage.put('machineDefinition', (this.machineDefinition = machineDefinition))
    this.startMachine(this.machineState)
  }

  /**
   * @param {Request} req
   */
  async fetch(req) {
    let { user, redirect, method, origin, pathSegments, search, json } = await this.env.CTX.fetch(req).then((res) => res.json())
    if (redirect) return Response.redirect(redirect)
    const [instance, stateEvent] = pathSegments
    const update = '?update='
    const isSearchBasedUpdate = search.startsWith(update)
    const retval = {
      api: {
        icon: '●→',
        name: 'state.do',
        description: 'Finite State Machine implementation with Durable Objects based on xstate',
        url: 'https://state.do/',
        type: 'https://apis.do/state',
        endpoints: {
          create: origin + '/:key?{state_machine}',
          reset: origin + '/:key?reset',
          update: origin + '/:key?update={state_machine}',
          read: origin + '/:key',
          event: origin + '/:key/:event',
        },
        site: 'https://state.do',
        repo: 'https://github.com/drivly/state.do',
      },
      instance,
    }
    if (search === '?reset') {
      await this.reset()
    } else if (search.startsWith('?import=')) {
      const machine = await fetch(decodeURIComponent(search.substring('?import='.length))).then((res) => res.json())
      await this.update(machine)
    } else if (search === '?machine') {
      if (this.machineDefinition) retval.machine = this.machineDefinition
      retval.user = user
      return new Response(JSON.stringify(retval, null, 2), { headers: { 'content-type': 'application/json; charset=utf-8' } })
    } else if ((search && (!this.machineDefinition || isSearchBasedUpdate)) || (method === 'POST' && !Array.isArray(json))) {
      await this.update((search && JSON.parse(decodeURIComponent(search.substring(isSearchBasedUpdate ? update.length : 1)))) || json)
    } else {
      if (json) console.log(json)
      if (stateEvent) this.service?.send(stateEvent, json)
      else if (json) this.service?.send(json)
    }
    retval.state = this.machineState
    if (this.serviceState?.nextEvents && this.serviceState.nextEvents.length)
      retval.events = this.serviceState.nextEvents.map((e) => `${origin}/${instance}/${encodeURIComponent(e)}`)
    retval.user = user
    return new Response(JSON.stringify(retval, null, 2), { headers: { 'content-type': 'application/json; charset=utf-8' } })
  }
}
