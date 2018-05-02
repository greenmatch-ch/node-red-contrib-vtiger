import { createHash } from "crypto";
import * as rp from "request-promise-native";

import * as _ from "lodash"

export interface VtigerApi {
    basicOptions: any;
    login: Function;
    getChallenge: Function;
    createContact: Function;
    getOneContact: Function;
    updateContact: Function;
    updateOrCreateContact: Function;
    findKeyOfField: Function;
}

interface DefaultObject {
    lastname: string;
    assigned_user_id: string;
}

interface SessionManager {
    getSessionId: () => string;
    setSessionId: ( sessionId: string ) => void;
}

export class VtigerConnector implements VtigerApi {
    basicOptions;
    sessionId?;

    constructor(
        private url: string,
        private username: string,
        private accessKey: string,
        private requiredFields: DefaultObject,
        private sessionStorage?: SessionManager,
    ) {
        this.basicOptions = {
            uri: url + "/webservice.php",
            json: true
        };
        if (!sessionStorage) {
            this.sessionStorage = {
                getSessionId: () => this.sessionId,
                setSessionId: sessionId => this.sessionId = sessionId,
            }
        }
    }

    async login() {
        if (this.url !== "dummy") {
            let token = await this.getChallenge();

            let options = { ...this.basicOptions };

            let accessKey = createHash("md5")
                .update(token + this.accessKey)
                .digest("hex");

            options.method = "POST";

            options.form = {
                operation: "login",
                username: this.username,
                accessKey: accessKey
            };

            await rp(options).then(res => {
                if (res.success) {
                    this.sessionStorage.setSessionId(res.result.sessionName);
                } else {
                    throw new VtigerApiError(res.error);
                }
            });
        }
    }

    getChallenge() {
        let options = { ...this.basicOptions };

        options.qs = {
            operation: "getchallenge",
            username: this.username
        };

        return rp(options).then(res => {
            if (res.success) {
                return res.result.token;
            } else {
                throw new VtigerApiError(res.error);
            }
        });
    }

    @loggedIn()
    async getOneContact(email: string) {
        let options = { ...this.basicOptions };

        let query =
            "SELECT * from Contacts WHERE email = '" + email + "' LIMIT 1;";
        options.qs = {
            operation: "query",
            sessionName: this.sessionStorage.getSessionId(),
            query
        };

        return rp(options).then(res => {
            if (res.success) {
                return res.result.length ? res.result[0] : null;
            } else {
                throw new VtigerApiError(res.error);
            }
        });
    }

    @loggedIn()
    async updateContact(email: string, updateValueMap) {
        let options = { ...this.basicOptions };

        let element = await this.getOneContact(email);

        Object.keys(updateValueMap).forEach(key => {
            element[key] = updateValueMap[key];
        });

        options.method = "POST";

        options.form = {
            operation: "update",
            sessionName: this.sessionStorage.getSessionId(),
            element: JSON.stringify(element)
        };

        return rp(options).then(res => {
            if (res.success) {
                return res.result;
            } else {
                throw new Error(res.error);
            }
        });
    }

    @loggedIn()
    async createContact(contact: any) {
        let options = { ...this.basicOptions };

        options.method = "POST";

        contact.lastname = contact.lastname || this.requiredFields.lastname;
        contact.assigned_user_id =
            contact.assigned_user_id || this.requiredFields.assigned_user_id;

        options.form = {
            operation: "create",
            sessionName: this.sessionStorage.getSessionId(),
            element: JSON.stringify(contact),
            elementType: "Contacts"
        };

        return rp(options).then(res => {
            if (res.success) {
                return res.result;
            } else {
                throw new Error(res.error);
            }
        });
    }

    @loggedIn()
    async updateOrCreateContact(contact: any, defaults: DefaultObject) {
        let existingContact = await this.getOneContact(contact.email);
        return existingContact === null
            ? this.createContact(contact)
            : this.updateContact(contact.email, contact);
    }

    @loggedIn()
    async findKeyOfField(label: string) {
        let options = { ...this.basicOptions };

        options.qs = {
            operation: "describe",
            sessionName: this.sessionStorage.getSessionId(),
            elementType: "Contacts"
        };

        return rp(options).then(res => {
            let field: any = _.find(res.result.fields, { label: label });
            return field.name;
        });
    }
}

const VtigerDummy: VtigerApi = {
    basicOptions: {},
    login: () => {},
    getChallenge: () => {},
    createContact: () => {},
    getOneContact: () => {},
    updateContact: () => {},
    updateOrCreateContact: () => {},
    findKeyOfField: () => {}
};

// decorator with arguments
function loggedIn(): any {
    return (target, key, descriptor) => ({
            ...descriptor,
            value: async function(...args) {
                // check if loggedIn and SessionId is valid
                if (!this.sessionId) {
                    await this.login();
                }
                try {
                    return await descriptor.value.apply(this, args);
                } catch (e) {
                    console.error("fuck not logging in " + e )
                    await this.login();
                    return descriptor.value.apply(this, args);
                }
            }
        })
}

class VtigerApiError extends Error {
    public code;
    constructor(errorObj: { code: string; message: string }, ...args) {
        super(errorObj.message);
        this.code = errorObj.code;
    }
}
