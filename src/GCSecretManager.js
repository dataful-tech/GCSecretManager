// Official repository: https://github.com/dataful-tech/GCSecretManager
//
// MIT License

// Copyright 2024 Dataful.Tech

// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the “Software”), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

/**
 * @typedef {Object} GCSecretManagerConfig
 * @property {string} project Google Cloud Project ID.
 * @property {string} version Secret version. Default: `latest`.
 */

const DEFAULT_CONFIG = {
    project: null,
    version: "latest",
};

/**
 * Initialize the GCSecretManager with the given configuration.
 * @param {GCSecretManagerConfig} config Configuration object.
 * Supported options:
 * - `project`: Google Cloud Project ID. Required.
 * - `version`: Secret version. Default: `latest`.
 * @returns {GCSecretManager} GCSecretManager instance.
 */
function init(config = {}) {
    return new GCSecretManager({ ...DEFAULT_CONFIG, ...config });
}

/**
 * Get the secret value for the given key.
 * @param {string} key Secret key.
 * @param {GCSecretManagerConfig} config Configuration object.
 * Supported options:
 * - `project`: Google Cloud Project ID. Required.
 * - `version`: Secret version. Default: `latest`.
 * @returns {string} Secret value.
 */
function get(key, config = {}) {
    return init(config).get(key);
}

/**
 * Set the secret value for the given key.
 * @param {string} key Secret key.
 * @param {string} value Secret value.
 * @param {GCSecretManagerConfig} config Configuration object.
 * Supported options:
 * - `project`: Google Cloud Project ID. Required.
 * - `version`: Secret version. Default: `latest`.
 * @returns {void}
 * @throws {Error} If the Secret Manager API returns an unexpected response code.
 * @throws {Error} If the Google Cloud Project ID is not provided.
 */
function set(key, value, config = {}) {
    return init(config).set(key, value);
}

/**
 * Get the secret value for the given key.
 * @param {string} project Google Cloud Project ID.
 * @param {string} key Secret key.
 * @param {string} [version="latest"] Secret version. Default: `latest`.
 * @returns {string} Secret value.
 */
function getSecret(project, key, version = "latest") {
    return init().getSecret(project, key, version);
}

/**
 * Create a new secret with the given key.
 * @param {string} project Google Cloud Project ID.
 * @param {string} key Secret key.
 * @returns {UrlFetchApp.HTTPResponse} HTTP response.
 */
function createSecret(project, key) {
    return init().createSecret(project, key);
}

/**
 * Create a new secret version with the given value.
 * @param {string} project Google Cloud Project ID.
 * @param {string} key Secret key.
 * @param {string} value Secret value.
 * @returns {UrlFetchApp.HTTPResponse} HTTP response.
 */
function createSecretVersion(project, key, value) {
    return init().createSecretVersion(project, key, value);
}

/**
 * Set the Google Cloud Project ID.
 * @param {string} project Google Cloud Project ID.
 * @returns {GCSecretManager} GCSecretManager instance.
 */
function setProject(project) {
    return init().setProject(project);
}


/**
 * Set the secret version.
 * @param {string|number} version Secret version.
 * @returns {GCSecretManager} GCSecretManager instance.
 */
function setVersion(version) {
    return init().setVersion(version);
}

class GCSecretManager {
    constructor(config = DEFAULT_CONFIG) {
        this.config_ = config;
    }

    setProject(project) {
        this.config_.project = project;
        return this;
    }

    setVersion(version) {
        this.config_.version = version;
        return this;
    }

    get(key, config = {}) {
        const mergedConfig = this.getConfig_(config);
        return this.getSecret(mergedConfig.project, key, mergedConfig.version);
    }

    set(key, value, config = {}) {
        const mergedConfig = this.getConfig_(config);
        const createSecretResponse = this.createSecret(mergedConfig.project, key);
        if (![200, 409].includes(createSecretResponse.getResponseCode()))
            throw Error(
                `Unexpected response code from the Secret Manager when creating a new secret: ${createSecretResponse.getResponseCode()}`
            );
        const createSecretVersionResponse = this.createSecretVersion(mergedConfig.project, key, value);
        if (createSecretVersionResponse.getResponseCode() !== 200) {
            throw Error(
                `Unexpected response code from the Secret Manager when creating a secret version: ${createSecretVersionResponse.getResponseCode()}`
            );
        }
    }

    getSecret(project, key, version = "latest") {
        const response = UrlFetchApp.fetch(
            `https://secretmanager.googleapis.com/v1/projects/${project}/secrets/${key}/versions/${version}:access`,
            {
                muteHttpExceptions: true,
                headers: {
                    Authorization: "Bearer " + ScriptApp.getOAuthToken(),
                    Accept: "application/json",
                },
            }
        );
        // Return undefined if no secret is found
        const responseCode = response.getResponseCode();
        if (responseCode === 403) throw new Error("Permission denied");
        if (responseCode === 404) return undefined;
        const decodedData = Utilities.base64Decode(
            JSON.parse(response.getContentText())["payload"]["data"]
        );
        return Utilities.newBlob(decodedData).getDataAsString();
    }

    createSecret(project, key) {
        const payload = {
            replication: {
                automatic: {},
            },
        };
        return UrlFetchApp.fetch(
            `https://secretmanager.googleapis.com/v1/projects/${project}/secrets?secretId=${key}`,
            {
                method: "POST",
                muteHttpExceptions: true,
                payload: JSON.stringify(payload),
                contentType: "application/json",
                headers: {
                    Authorization: "Bearer " + ScriptApp.getOAuthToken(),
                    Accept: "application/json",
                },
            }
        );
    }

    createSecretVersion(project, key, value) {
        const payload = {
            payload: {
                data: Utilities.base64Encode(value),
            },
        };
        return UrlFetchApp.fetch(
            `https://secretmanager.googleapis.com/v1/projects/${project}/secrets/${key}:addVersion`,
            {
                method: "POST",
                muteHttpExceptions: true,
                payload: JSON.stringify(payload),
                contentType: "application/json",
                headers: {
                    Authorization: "Bearer " + ScriptApp.getOAuthToken(),
                    Accept: "application/json",
                },
            }
        );
    }

    getConfig_(config) {
        const mergedConfig = { ...DEFAULT_CONFIG, ...this.config_, ...config };
        if (!mergedConfig.project) throw new Error("Google Cloud Project is required");
        return mergedConfig;
    }
}



if (typeof module === "object") {
    module.exports = {
        init,
        get,
        set,
        getSecret,
        createSecret,
        createSecretVersion,
        setProject,
        setVersion,
    };
}
