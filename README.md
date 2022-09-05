# ez-recipes-server

[![Node.js CI](https://github.com/Abhiek187/ez-recipes-server/actions/workflows/node.js.yml/badge.svg)](https://github.com/Abhiek187/ez-recipes-server/actions/workflows/node.js.yml)
[![CodeQL](https://github.com/Abhiek187/ez-recipes-server/actions/workflows/codeql.yml/badge.svg)](https://github.com/Abhiek187/ez-recipes-server/actions/workflows/codeql.yml)

Easy recipes finder Express server

## Installing Locally

1. [Clone](https://github.com/Abhiek187/ez-recipes-web.git) this repo.
2. Create an account at [https://spoonacular.com/food-api](https://spoonacular.com/food-api) to obtain an API key. Then create a file called `.env` with the following content:

```
API_KEY=YOUR_API_KEY
```

3. Run `npm run dev`. The server will be listening on `http://localhost:5000`.

## Installing with Docker

1. Follow steps 1-2 above.
2. Run `docker-compose up -d` to start up both the web and server containers.

To stop the containers, run `docker-compose down`.
