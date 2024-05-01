# GCSecretManager

GCSecretManager is a Google Apps Script library that simplifies using [Google Cloud Secret Manager](https://cloud.google.com/security/products/secret-manager) for storing secrets. It also can serve as a storage engine for the [SecretService](https://github.com/dataful-tech/secret-service) library.

Capabilities:

-   Create new secrets and secret versions in Google Cloud Secret Manager.
-   Retrieve any secret and secret versions that your account has access to.

The library intentionally doesn't include methods for modifying and deleting secrets. First, to keep it simple; second, the Google Cloud's web interface is a better tool for doing it.

GCSecretManager is a [Dataful.Tech](https://dataful.tech) project.

## Security Note

1. Storing secrets in Google Apps Script safely is challenging. The root cause is that other users often have access to the code and can edit it.

    Once you retrieve the secrets from the Secret Manager, they can be logged or otherwise compromised by people who have edit access to the script.

2. The library requires authorization to access all your Google Cloud services, not only the Secret Manager. Unfortunately, Google doesn't provide option to request more narrow permissions.

    Use of an account with limited access to your Google Cloud infrastructure is advised.

## Costs

Google Cloud Secret Manager is a paid service ([pricing](https://cloud.google.com/secret-manager/pricing)). If you exceed the free quota, you will be charged per-use.

## Setup

You can use GCSecretManager in two ways:

1. **As a library**: use the library id `1AMOC3WpfX5_pkasmD6o58wFPvXn3xktdeT58Jx9qo8GizfJg5PFxnIlg`.
2. **Copy the code** from `src/GCSecretManager.js` to your project.

## Usage

You can use library's methods directly or create an instance. In each case you can call either:

-   convenience methods:
    -   `get("secret-key", [config])`
    -   `set("secret-key", "secret-value", [config])`
-   or methods directly calling specific APIs:
    -   `getSecret("project-id", "secret-key", ["version"])`
    -   `createSecret("project-id", "secret-key")`
    -   `createSecretVersion("project-id", "secret-key", "secret-value")`

You can also use it as a storage for SecretService library. For examples see the [SecretService documentation](https://github.com/dataful-tech/secret-service).

### Use Library Directly

```js
// Get the latest version of the secret
const secretLatest = GCSecretManager.get("secret-key", { project: "project-id" });

// Get the latest version of the secret
const secretV2 = GCSecretManager.get("secret-key", { project: "project-id", version: 2 });

// Instead of the config, specify project via chaining:
const anotherSecretV3 = GCSecretManager.setProject("project-id")
    .setVersion(3)
    .get("another-secret-key");

// Set secret. A new one will be created if it doesn't exist
// or, if it does, a new version for the existing one.
GCSecretManager.set("secret-key", "secret-value", { project: "project-id" });

// Directly call the Secret Manager API

// Get the latest version of the secret
const oneMoreSecretLatest = GCSecretManager.getSecret("project-id", "one-more-secret-key");

// Create a new secret
GCSecretManager.createSecret("project-id", "new-secret-key");
// Create a new version of a secret
GCSecretManager.createSecretVersion("project-id", "new-secret-key", "new-secret-value");
```

### Create an Instance

You can create an instance to provide the configuration only once and use it multiple times:

```js
// Initialize
const MANAGER = GCSecretManager.init({ project: "project-id" });

// You can also use chaining to initialize the manager
const MANAGER = GCSecretManager.init().setProject("project-id");

// Retrieve the latest secret version
const secret = MANAGER.get("secret-key");

// Set a secret
MANAGER.set("secret-key", "secret-value");

// The direct methods will work the same way as in the examples above
const oneMoreSecretLatest = MANAGER.getSecret("project-id", "one-more-secret-key");

// Create a new secret
MANAGER.createSecret("project-id", "new-secret-key");
// Create a new version of a secret
MANAGER.createSecretVersion("project-id", "new-secret-key", "new-secret-value");
```

## Configuration

GCSecretService accepts two configuration parameters:

-   `project` (required) - Google Cloud project where you store the secrets.
-   `version` (default: `latest`) - which version of the secret to retrieve.

## Authorization Scopes

GCSecretManager requires two authorization scopes:

-   `https://www.googleapis.com/auth/script.external_request` - to send requests to Google's API.
-   `https://www.googleapis.com/auth/cloud-platform` to generate a token to get access to the secrets in Secret Manager.

These authorization scopes must be set explicitly in `appsscript.json`. This is the snippet you need to add to your `appsscript.json` file (add other scopes as required):

```json
"oauthScopes": [
  "https://www.googleapis.com/auth/script.external_request",
  "https://www.googleapis.com/auth/cloud-platform"
]
```

Read more on the authorization scopes in Google Apps Script [here](https://dataful.tech/google-apps-script/scopes/how-to-set/).

## Tests

GCSecretManager is covered by unit tests with mocks and jest.

## Versioning

This project follows standard `MAJOR.MINOR.PATCH` semantic versioning. Breaking changes may be introduced in new major versions.

## License

GCSecretManager is available under the MIT license.

## Contribution

Contributions are welcome. Feel free to submit PRs or issues on GitHub for any suggestions or issues.
