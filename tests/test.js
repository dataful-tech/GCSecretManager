const GCSecretManager = require("../src/GCSecretManager");

global.UrlFetchApp = require("./mocks/UrlFetchApp");
global.Utilities = require("./mocks/Utilities");
global.ScriptApp = require("./mocks/ScriptApp");

describe("GCSecretManager: storage methods (get, set)", () => {
    beforeEach(() => {
        UrlFetchApp.fetch.mockClear();
        Utilities.base64Encode.mockClear();
        Utilities.base64Decode.mockClear();
        ScriptApp.getOAuthToken.mockClear();
    });

    it("Running without a project", () => {
        const manager = GCSecretManager.init();
        expect(() => manager.get("does-not-exist")).toThrowError("Project is required");
    });

    it("Get a secret without permissions", () => {
        UrlFetchApp.fetch.mockReturnValueOnce({
            getResponseCode: () => 403,
        });
        const manager = GCSecretManager.init({ project: "my-project" });
        expect(() => manager.get("secret-key")).toThrowError("Permission denied");
    });

    it("Set a secret without permissions", () => {
        UrlFetchApp.fetch.mockReturnValueOnce({
            getResponseCode: () => 403,
        });
        const manager = GCSecretManager.init({ project: "my-project" });
        expect(() => manager.get("secret-key")).toThrowError("Permission denied");
    });

    it("Set project and version via chaining", () => {
        UrlFetchApp.fetch.mockReturnValueOnce({
            getResponseCode: () => 404,
        });
        const result = GCSecretManager.init().setProject("my-project").setVersion(3).get("does-not-exist");
        expect(result).toBe(undefined);
        expect(UrlFetchApp.fetch).toHaveBeenCalledTimes(1);
        expect(UrlFetchApp.fetch).toHaveBeenCalledWith(
            "https://secretmanager.googleapis.com/v1/projects/my-project/secrets/does-not-exist/versions/3:access",
            {
                muteHttpExceptions: true,
                headers: {
                    Authorization: "Bearer mock-oauth-token",
                    Accept: "application/json",
                },
            }
        );
    });

    it("Get a secret that does not exist", () => {
        const manager = GCSecretManager.init({ project: "my-project" });
        UrlFetchApp.fetch.mockReturnValueOnce({
            getResponseCode: () => 404,
        });
        const secret = manager.get("does-not-exist");
        expect(secret).toBe(undefined);
        expect(UrlFetchApp.fetch).toHaveBeenCalledTimes(1);
        expect(UrlFetchApp.fetch).toHaveBeenCalledWith(
            "https://secretmanager.googleapis.com/v1/projects/my-project/secrets/does-not-exist/versions/latest:access",
            {
                muteHttpExceptions: true,
                headers: {
                    Authorization: "Bearer mock-oauth-token",
                    Accept: "application/json",
                },
            }
        );
    });

    it("Get a secret", () => {
        const manager = GCSecretManager.init({ project: "my-project" });
        UrlFetchApp.fetch.mockReturnValueOnce({
            getResponseCode: () => 200,
            getContentText: () =>
                JSON.stringify({
                    payload: {
                        data: "mock-secret",
                    },
                }),
        });
        const secret = manager.get("does-not-exist");
        expect(secret).toBe("mock-secret");
        expect(UrlFetchApp.fetch).toHaveBeenCalledTimes(1);
        expect(UrlFetchApp.fetch).toHaveBeenCalledWith(
            "https://secretmanager.googleapis.com/v1/projects/my-project/secrets/does-not-exist/versions/latest:access",
            {
                muteHttpExceptions: true,
                headers: {
                    Authorization: "Bearer mock-oauth-token",
                    Accept: "application/json",
                },
            }
        );
        expect(Utilities.base64Decode).toHaveBeenCalledTimes(1);
        expect(Utilities.base64Decode).toHaveBeenCalledWith("mock-secret");
    });

    it("Get a secret of specific version", () => {
        const manager = GCSecretManager.init({ project: "my-project" });
        UrlFetchApp.fetch.mockReturnValueOnce({
            getResponseCode: () => 200,
            getContentText: () =>
                JSON.stringify({
                    payload: {
                        data: "mock-secret",
                    },
                }),
        });
        const secret = manager.get("does-not-exist", { version: "1" });
        expect(secret).toBe("mock-secret");
        expect(UrlFetchApp.fetch).toHaveBeenCalledTimes(1);
        expect(UrlFetchApp.fetch).toHaveBeenCalledWith(
            "https://secretmanager.googleapis.com/v1/projects/my-project/secrets/does-not-exist/versions/1:access",
            {
                muteHttpExceptions: true,
                headers: {
                    Authorization: "Bearer mock-oauth-token",
                    Accept: "application/json",
                },
            }
        );
        expect(Utilities.base64Decode).toHaveBeenCalledTimes(1);
        expect(Utilities.base64Decode).toHaveBeenCalledWith("mock-secret");
    });

    it("Set a secret version for a non-existing secrets", () => {
        const manager = GCSecretManager.init({ project: "my-project" });
        UrlFetchApp.fetch.mockReturnValueOnce({
            getResponseCode: () => 200,
        });
        manager.set("new-secret", "new-secret-value");
        expect(UrlFetchApp.fetch).toHaveBeenCalledTimes(2);
        expect(UrlFetchApp.fetch).toHaveBeenNthCalledWith(
            1,
            "https://secretmanager.googleapis.com/v1/projects/my-project/secrets?secretId=new-secret",
            {
                method: "POST",
                muteHttpExceptions: true,
                payload: JSON.stringify({
                    replication: {
                        automatic: {},
                    },
                }),
                contentType: "application/json",
                headers: {
                    Authorization: "Bearer mock-oauth-token",
                    Accept: "application/json",
                },
            }
        );
        expect(UrlFetchApp.fetch).toHaveBeenNthCalledWith(
            2,
            "https://secretmanager.googleapis.com/v1/projects/my-project/secrets/new-secret:addVersion",
            {
                method: "POST",
                muteHttpExceptions: true,
                payload: JSON.stringify({
                    payload: {
                        data: "new-secret-value",
                    },
                }),
                contentType: "application/json",
                headers: {
                    Authorization: "Bearer mock-oauth-token",
                    Accept: "application/json",
                },
            }
        );
        expect(Utilities.base64Encode).toHaveBeenCalledTimes(1);
        expect(Utilities.base64Encode).toHaveBeenCalledWith("new-secret-value");
    });

    it("Set a secret version for an existing secrets", () => {
        const manager = GCSecretManager.init({ project: "my-project" });
        UrlFetchApp.fetch.mockReturnValueOnce({
            getResponseCode: () => 409,
        });
        manager.set("new-secret", "new-secret-value");
        expect(UrlFetchApp.fetch).toHaveBeenCalledTimes(2);
        expect(UrlFetchApp.fetch).toHaveBeenNthCalledWith(
            1,
            "https://secretmanager.googleapis.com/v1/projects/my-project/secrets?secretId=new-secret",
            {
                method: "POST",
                muteHttpExceptions: true,
                payload: JSON.stringify({
                    replication: {
                        automatic: {},
                    },
                }),
                contentType: "application/json",
                headers: {
                    Authorization: "Bearer mock-oauth-token",
                    Accept: "application/json",
                },
            }
        );
        expect(UrlFetchApp.fetch).toHaveBeenNthCalledWith(
            2,
            "https://secretmanager.googleapis.com/v1/projects/my-project/secrets/new-secret:addVersion",
            {
                method: "POST",
                muteHttpExceptions: true,
                payload: JSON.stringify({
                    payload: {
                        data: "new-secret-value",
                    },
                }),
                contentType: "application/json",
                headers: {
                    Authorization: "Bearer mock-oauth-token",
                    Accept: "application/json",
                },
            }
        );
    });
});

describe("GCSecretManager: direct methods", () => {
    beforeEach(() => {
        UrlFetchApp.fetch.mockClear();
        Utilities.base64Encode.mockClear();
        Utilities.base64Decode.mockClear();
        ScriptApp.getOAuthToken.mockClear();
    });

    it("Create a secret", () => {
        UrlFetchApp.fetch.mockReturnValueOnce({
            getResponseCode: () => 200,
        });
        const manager = GCSecretManager.init();
        manager.createSecret("my-project", "new-secret");
        expect(UrlFetchApp.fetch).toHaveBeenCalledTimes(1);
        expect(UrlFetchApp.fetch).toHaveBeenCalledWith(
            "https://secretmanager.googleapis.com/v1/projects/my-project/secrets?secretId=new-secret",
            {
                method: "POST",
                muteHttpExceptions: true,
                payload: JSON.stringify({
                    replication: {
                        automatic: {},
                    },
                }),
                contentType: "application/json",
                headers: {
                    Authorization: "Bearer mock-oauth-token",
                    Accept: "application/json",
                },
            }
        );
    });

    it("Create a secret version", () => {
        UrlFetchApp.fetch.mockReturnValueOnce({
            getResponseCode: () => 200,
        });
        const manager = GCSecretManager.init();
        manager.createSecretVersion("my-project", "new-secret", "new-secret-value");
        expect(UrlFetchApp.fetch).toHaveBeenCalledTimes(1);
        expect(UrlFetchApp.fetch).toHaveBeenCalledWith(
            "https://secretmanager.googleapis.com/v1/projects/my-project/secrets/new-secret:addVersion",
            {
                method: "POST",
                muteHttpExceptions: true,
                payload: JSON.stringify({
                    payload: {
                        data: "new-secret-value",
                    },
                }),
                contentType: "application/json",
                headers: {
                    Authorization: "Bearer mock-oauth-token",
                    Accept: "application/json",
                },
            }
        );
    });

    it("Get a secret", () => {
        UrlFetchApp.fetch.mockReturnValueOnce({
            getResponseCode: () => 200,
            getContentText: () =>
                JSON.stringify({
                    payload: {
                        data: "mock-secret",
                    },
                }),
        });
        const manager = GCSecretManager.init();
        const secret = manager.getSecret("my-project", "new-secret", 2);
        expect(secret).toBe("mock-secret");
        expect(UrlFetchApp.fetch).toHaveBeenCalledTimes(1);
        expect(UrlFetchApp.fetch).toHaveBeenCalledWith(
            "https://secretmanager.googleapis.com/v1/projects/my-project/secrets/new-secret/versions/2:access",
            {
                muteHttpExceptions: true,
                headers: {
                    Authorization: "Bearer mock-oauth-token",
                    Accept: "application/json",
                },
            }
        );
        expect(Utilities.base64Decode).toHaveBeenCalledTimes(1);
        expect(Utilities.base64Decode).toHaveBeenCalledWith("mock-secret");
    });
});

describe("GCSecretManager: external methods", () => {
    beforeEach(() => {
        UrlFetchApp.fetch.mockClear();
        Utilities.base64Encode.mockClear();
        Utilities.base64Decode.mockClear();
        ScriptApp.getOAuthToken.mockClear();
    });

    it("GCSecretManager.createSecret", () => {
        UrlFetchApp.fetch.mockReturnValueOnce({
            getResponseCode: () => 200,
        });
        GCSecretManager.createSecret("my-project", "new-secret", "new-secret-value");
        expect(UrlFetchApp.fetch).toHaveBeenCalledTimes(1);
        expect(UrlFetchApp.fetch).toHaveBeenNthCalledWith(
            1,
            "https://secretmanager.googleapis.com/v1/projects/my-project/secrets?secretId=new-secret",
            {
                method: "POST",
                muteHttpExceptions: true,
                payload: JSON.stringify({
                    replication: {
                        automatic: {},
                    },
                }),
                contentType: "application/json",
                headers: {
                    Authorization: "Bearer mock-oauth-token",
                    Accept: "application/json",
                },
            }
        );
    });

    it("GCSecretManager.createSecret", () => {
        UrlFetchApp.fetch.mockReturnValueOnce({
            getResponseCode: () => 200,
        });
        GCSecretManager.createSecret("my-project", "new-secret");
        expect(UrlFetchApp.fetch).toHaveBeenCalledTimes(1);
        expect(UrlFetchApp.fetch).toHaveBeenNthCalledWith(
            1,
            "https://secretmanager.googleapis.com/v1/projects/my-project/secrets?secretId=new-secret",
            {
                method: "POST",
                muteHttpExceptions: true,
                payload: JSON.stringify({
                    replication: {
                        automatic: {},
                    },
                }),
                contentType: "application/json",
                headers: {
                    Authorization: "Bearer mock-oauth-token",
                    Accept: "application/json",
                },
            }
        );
    });

    it("GCSecretManager.createSecretVersion", () => {
        UrlFetchApp.fetch.mockReturnValueOnce({
            getResponseCode: () => 200,
        });
        GCSecretManager.createSecretVersion("my-project", "new-secret", "new-secret-value");
        expect(UrlFetchApp.fetch).toHaveBeenCalledTimes(1);
        expect(UrlFetchApp.fetch).toHaveBeenNthCalledWith(
            1,
            "https://secretmanager.googleapis.com/v1/projects/my-project/secrets/new-secret:addVersion",
            {
                method: "POST",
                muteHttpExceptions: true,
                payload: JSON.stringify({ payload: { data: "new-secret-value" } }),
                contentType: "application/json",
                headers: {
                    Authorization: "Bearer mock-oauth-token",
                    Accept: "application/json",
                },
            }
        );
    });

    it("GCSecretManager.getSecret", () => {
        UrlFetchApp.fetch.mockReturnValueOnce({
            getResponseCode: () => 200,
            getContentText: () =>
                JSON.stringify({
                    payload: {
                        data: "mock-secret",
                    },
                }),
        });
        const secret = GCSecretManager.getSecret("my-project", "new-secret", 2);
        expect(secret).toBe("mock-secret");
        expect(UrlFetchApp.fetch).toHaveBeenCalledTimes(1);
        expect(UrlFetchApp.fetch).toHaveBeenCalledWith(
            "https://secretmanager.googleapis.com/v1/projects/my-project/secrets/new-secret/versions/2:access",
            {
                muteHttpExceptions: true,
                headers: {
                    Authorization: "Bearer mock-oauth-token",
                    Accept: "application/json",
                },
            }
        );
        expect(Utilities.base64Decode).toHaveBeenCalledTimes(1);
        expect(Utilities.base64Decode).toHaveBeenCalledWith("mock-secret");
    });

    it("GCSecretManager.setProject", () => {
        UrlFetchApp.fetch.mockReturnValueOnce({
            getResponseCode: () => 404,
        });
        const result = GCSecretManager.setProject("my-project").setVersion(5).get("does-not-exist");
        expect(result).toBe(undefined);
        expect(UrlFetchApp.fetch).toHaveBeenCalledTimes(1);
        expect(UrlFetchApp.fetch).toHaveBeenCalledWith(
            "https://secretmanager.googleapis.com/v1/projects/my-project/secrets/does-not-exist/versions/5:access",
            {
                muteHttpExceptions: true,
                headers: {
                    Authorization: "Bearer mock-oauth-token",
                    Accept: "application/json",
                },
            }
        );
    });

    it("Get a secret that does not exist", () => {
        UrlFetchApp.fetch.mockReturnValueOnce({
            getResponseCode: () => 404,
        });
        const secret = GCSecretManager.get("does-not-exist", { project: "my-project" });
        expect(secret).toBe(undefined);
        expect(UrlFetchApp.fetch).toHaveBeenCalledTimes(1);
        expect(UrlFetchApp.fetch).toHaveBeenCalledWith(
            "https://secretmanager.googleapis.com/v1/projects/my-project/secrets/does-not-exist/versions/latest:access",
            {
                muteHttpExceptions: true,
                headers: {
                    Authorization: "Bearer mock-oauth-token",
                    Accept: "application/json",
                },
            }
        );
    });

    it("Get a secret", () => {
        UrlFetchApp.fetch.mockReturnValueOnce({
            getResponseCode: () => 200,
            getContentText: () =>
                JSON.stringify({
                    payload: {
                        data: "mock-secret",
                    },
                }),
        });
        const secret = GCSecretManager.get("does-not-exist", { project: "my-project" });
        expect(secret).toBe("mock-secret");
        expect(UrlFetchApp.fetch).toHaveBeenCalledTimes(1);
        expect(UrlFetchApp.fetch).toHaveBeenCalledWith(
            "https://secretmanager.googleapis.com/v1/projects/my-project/secrets/does-not-exist/versions/latest:access",
            {
                muteHttpExceptions: true,
                headers: {
                    Authorization: "Bearer mock-oauth-token",
                    Accept: "application/json",
                },
            }
        );
        expect(Utilities.base64Decode).toHaveBeenCalledTimes(1);
        expect(Utilities.base64Decode).toHaveBeenCalledWith("mock-secret");
    });

    it("Get a secret of specific version", () => {
        UrlFetchApp.fetch.mockReturnValueOnce({
            getResponseCode: () => 200,
            getContentText: () =>
                JSON.stringify({
                    payload: {
                        data: "mock-secret",
                    },
                }),
        });
        const secret = GCSecretManager.get("does-not-exist", {
            version: "1",
            project: "my-project",
        });
        expect(secret).toBe("mock-secret");
        expect(UrlFetchApp.fetch).toHaveBeenCalledTimes(1);
        expect(UrlFetchApp.fetch).toHaveBeenCalledWith(
            "https://secretmanager.googleapis.com/v1/projects/my-project/secrets/does-not-exist/versions/1:access",
            {
                muteHttpExceptions: true,
                headers: {
                    Authorization: "Bearer mock-oauth-token",
                    Accept: "application/json",
                },
            }
        );
        expect(Utilities.base64Decode).toHaveBeenCalledTimes(1);
        expect(Utilities.base64Decode).toHaveBeenCalledWith("mock-secret");
    });

    it("Set a secret version for a non-existing secrets", () => {
        UrlFetchApp.fetch.mockReturnValueOnce({
            getResponseCode: () => 200,
        });
        GCSecretManager.set("new-secret", "new-secret-value", { project: "my-project" });
        expect(UrlFetchApp.fetch).toHaveBeenCalledTimes(2);
        expect(UrlFetchApp.fetch).toHaveBeenNthCalledWith(
            1,
            "https://secretmanager.googleapis.com/v1/projects/my-project/secrets?secretId=new-secret",
            {
                method: "POST",
                muteHttpExceptions: true,
                payload: JSON.stringify({
                    replication: {
                        automatic: {},
                    },
                }),
                contentType: "application/json",
                headers: {
                    Authorization: "Bearer mock-oauth-token",
                    Accept: "application/json",
                },
            }
        );
        expect(UrlFetchApp.fetch).toHaveBeenNthCalledWith(
            2,
            "https://secretmanager.googleapis.com/v1/projects/my-project/secrets/new-secret:addVersion",
            {
                method: "POST",
                muteHttpExceptions: true,
                payload: JSON.stringify({
                    payload: {
                        data: "new-secret-value",
                    },
                }),
                contentType: "application/json",
                headers: {
                    Authorization: "Bearer mock-oauth-token",
                    Accept: "application/json",
                },
            }
        );
        expect(Utilities.base64Encode).toHaveBeenCalledTimes(1);
        expect(Utilities.base64Encode).toHaveBeenCalledWith("new-secret-value");
    });
});
