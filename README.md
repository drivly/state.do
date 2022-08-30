# [state.do](https://state.do)

Finite State Machine implementation with Durable Objects based on [xstate](https://xstate.js.org)

## API

<https://state.do/:key?{"id":"fetch","initial":"loading","states":{"loading":{"context":"https://example.com/","on":{"OK":"success","Error":"failure"}},"success":{"context":"https://graphology.do.cf/:key?newnode?example|","type":"final"},"failure":{"context":"https://alarms.do/fromNow/10sec/https://state.do/:key/RETRY","on":{"RETRY":{"target":"loading"}}}}}>

<https://state.do/:key>

<https://state.do/:key/:event>

```mermaid
stateDiagram-v2
direction LR
loading-->failure: error
failure-->loading: RETRY
loading-->success: 200
```

```json
{
  "id": "fetch",
  "initial": "loading",
  "states": {
    "loading": {
      "context": "https://example.com/",
      "on": {
        "OK": "success",
        "Error": "failure"
      }
    },
    "success": {
      "context": "https://graphology.do.cf/:key?newnode?example|",
      "type": "final"
    },
    "failure": {
      "context": "https://alarms.do/fromNow/10sec/https://state.do/:key/RETRY",
      "on": {
        "RETRY": {
          "target": "loading"
        }
      }
    }
  }
}
```

## [🚀 We're hiring!](https://careers.do/apply)

[Driv.ly](https://driv.ly) is simple APIs to buy & sell cars online, funded by some of the [biggest names](https://twitter.com/TurnerNovak) in [automotive](https://fontinalis.com/team/#bill-ford) and [finance & insurance](https://www.detroit.vc)

We're building our entire infrastructure on Cloudflare Workers, Durable Objects, KV, R2, and PubSub. If you're as passionate about these transformational technologies as we are, we'd love for you to join our rapidly-growing team.
