# [state.do](https://state.do)

Finite State Machine implementation with Durable Objects

## API

```javascript
// Returns a Promise, e.g.:
// {
//   id: 42,
//   name: 'David',
//   friends: [2, 3, 5, 7, 9] // friend IDs
// }
function getUserInfo(context) {
  return fetch(`/api/users/${context.userId}`).then((response) =>
    response.json()
  );
}

// Returns a Promise
function getUserFriends(context) {
  const { friends } = context.user;

  return Promise.all(
    friends.map((friendId) =>
      fetch(`/api/users/${friendId}/`).then((response) => response.json())
    )
  );
}

const friendsMachine = createMachine({
  id: 'friends',
  context: { userId: 42, user: undefined, friends: undefined },
  initial: 'gettingUser',
  states: {
    gettingUser: {
      invoke: {
        src: getUserInfo,
        onDone: {
          target: 'gettingFriends',
          actions: assign({
            user: (context, event) => event.data
          })
        }
      }
    },
    gettingFriends: {
      invoke: {
        src: getUserFriends,
        onDone: {
          target: 'success',
          actions: assign({
            friends: (context, event) => event.data
          })
        }
      }
    },
    success: {
      type: 'final'
    }
  }
})
```

## [🚀 We're hiring!](https://careers.do/apply)

[Driv.ly](https://driv.ly) is simple APIs to buy & sell cars online, funded by some of the [biggest names](https://twitter.com/TurnerNovak) in [automotive](https://fontinalis.com/team/#bill-ford) and [finance & insurance](https://www.detroit.vc)

We're building our entire infrastructure on Cloudflare Workers, Durable Objects, KV, R2, and PubSub.  If you're as passionate about these transformational technologies as we are, we'd love for you to join our rapidly-growing team.
