import * as request from "request-promise-native";
import {VtigerConnector, VtigerApi} from "./VtigerConnector";

export = function(RED) {

    function VtigerServer(config) {
        RED.nodes.createNode(this,config);
        this.defaultConfig = {
            lastname: "???",
            assigned_user_id: "19x7"
        };
        this.host = config.host;
        this.user = config.user;
        // this.connector = new VtigerConnector( this.host, this.user, this.key, this.defaults)
    }
    RED.nodes.registerType("vtiger-server",VtigerServer, {
        credentials: {
            sessionId: { type: "text" },
            key: { type: "text" },
        }
    });

    function updateContact(config) {
        RED.nodes.createNode(this, config);
        const serverConfig = RED.nodes.getNode(config.server);
        const credentials = RED.nodes.getCredentials(config.server);
        const node = this

        this.on("input", function(msg) {
            const vtigerConnector = new VtigerConnector( credentials.host, credentials.user, credentials.key, serverConfig.defaults, sessionStorage(credentials))
            msg.payload = msg.payload.email
            node.send(msg);
        })
    }

    function getOneContact(config) {
        RED.nodes.createNode(this, config);
        const serverConfig = RED.nodes.getNode(config.server);
        const node = this

        this.on("input", async function(msg) {
            try {
                const vtigerConnector = new VtigerConnector( serverConfig.host, serverConfig.user, serverConfig.credentials.key, serverConfig.defaults, sessionStorage(serverConfig.credentials))
                // await node.server.connector.login()
                msg.payload = await vtigerConnector.getOneContact(msg.payload)
                node.send(msg);
            }
            catch (err) {
                node.error(err)
                console.error(err)
            }
            // msg.payload = msg.payload.email
        })
    }

    function testCredentials(config) {
        RED.nodes.createNode(this, config);
        const serverConfig = RED.nodes.getNode(config.server);
        const node = this

        this.on("input", function(msg) {
            msg.payload = serverConfig.credentials;
            node.send(msg);
        })
    }

    RED.nodes.registerType("vtiger-post",updateContact);
    RED.nodes.registerType("vtiger-test",testCredentials);
    RED.nodes.registerType("vtiger-get",getOneContact);
}

const sessionStorage = credentials => {
    return {
        getSessionId: () => credentials.sessionId,
        setSessionId: (sessionId) => credentials.sessionId = sessionId,
    }
}
