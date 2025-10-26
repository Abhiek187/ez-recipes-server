# Agent Instructions

## Project Overview

This is a Node.js server that fetches recipe information for various clients, including iOS, Android, Web, and even Postman. It connects to the spoonacular API to get new recipes. Existing recipes are stored in MongoDB. Account information is managed with Firebase. The CI/CD pipeline is handled using GitHub Actions. Finally, the server is deployed on Render using Docker. The final Docker image should be as minimal as possible, containing only what's required to run the server.

Before writing any code, review the existing architecture and propose your implementation plan for approval by the user. If something is uncertain, always prefer asking for clarity over making any assumptions. If you're not sure how to implement a solution, it's ok to be honest and admit it to the user.

## Build and Test Commands

Before committing changes, make sure the following commands succeed:

```bash
# Lint
npm run lint
# Build
npm run build
# Test
npm test
```

## Code Style Guidelines

This project uses TypeScript and should follow the most up-to-date best practices and patterns for the language to mitigate runtime errors. Types shouldn't be bypassed to let the code run. All ESLint rules must be respected when files are saved. Comments can be used to explain more complicated code, but shouldn't be overused if the code is self-explanatory. Make sure test logs and unused imports are removed prior to committing changes. IDE warnings must be kept to a minimum. Commented or unused code should be removed unless the user intends to reference it in the future. Always consider edge cases when implementing features. Above anything else, make sure the functionality is understandable to someone reading the code.

The API is documented in an OpenAPI spec and hosted using Swagger UI. Any changes made to these endpoints should be reflected in these files and be rendered properly on Swagger. The OpenAPI spec should follow best practices for documenting the required inputs and providing sample responses for both success and error scenarios.

When you write commit messages, prepend them with 🤖 so it's clear the changes were made with AI. When you raise PRs, make sure to disclose the AI tool used. All changes must be made to a feature branch and then merged to main via a PR.

When working with the user, ensure you follow all guidelines for ethical AI, such as keeping the human in the loop, taking accountability for changes, and being transparent about the thought process and where you retrieve your ideas from.

## Testing Instructions

Helper methods should be unit tested where possible with reasonable coverage. Mock any external dependencies needed for unit tests. Testing actual APIs should be kept to a minimum to avoid using up quota when the CI/CD pipeline runs. These should only be reserved if it's necessary to do a health check for 3rd party APIs.

In addition to running the test command above, ensure the user tests both the server and Swagger UI running locally.

## Security Considerations

Make sure the server follows best practices to ensure the API is secure and gracefully handles any kind of input from different clients. Sensitive data like API keys or DB credentials must be referenced from environment variables or secrets managers and should not be exposed in the repo. All input from requests must be sanitized to fulfill the requirements for an API and return an error if some input is invalid.

The APIs are rate-limited to prevent the server from getting overwhelmed. Response headers should omit any fingerprinting information that could help attackers identify the server or technology used. Additionally, the response headers should include security headers like CORS, HSTS, and CSP.

All API requests and responses should be logged for auditing purposes, but sensitive information like passwords, cookies, or API keys should be masked in the logs. Important transactions can be logged as well, but don't make logs excessive when it comes time to search logs to troubleshoot bugs with the app.

All dependencies should be kept up-to-date to minimize any vulnerabilities. Any new packages added to this project should be regularly updated and not abandoned after several years or contain lingering vulnerabilities. If a feature can be implemented trivially without introducing another dependency, that's preferred.
