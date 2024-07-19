# Smallweb Puller

Use the following command to trigger a git pull on the server.

```bash
curl https://puller.smallweb.run -x post -h 'content-type: application/json' -d '{ "app": "docs.smallweb.run" }'
```
