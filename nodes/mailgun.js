/**
 * Copyright JS Foundation and other contributors, http://js.foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function (RED) {
    "use strict";

    const mg = require('mailgun-js');

    function Mailgun(n) {
        RED.nodes.createNode(this, n);
        const node = this;
        node.config = RED.nodes.getNode(n.config);
        node.aliveRequests = 0;

        node.on('input', function (msg) {
            const {apikey, domain, from, to} = node.config;
            if (!apikey || !domain || !from || !to) {
                return;
            }
            node.aliveRequests += 1;
            node.status({fill: "green", shape: "ring", text: `running ${node.aliveRequests} reqs`, running: true});

            const mailgun = mg({apiKey: apikey, domain: domain});
            const data = {
                from,
                to,
                subject: msg.topic || 'new email from node red via gun',
                text: msg.payload,
            };

            mailgun.messages().send(data, function (error, body) {
                node.aliveRequests -= 1;
                console.log(body);
                if (error) {
                    node.status({fill: "red", shape: "dot", text: "an email not sent", running: node.aliveRequests > 0});
                    node.error(`invoke mailgun failed, with error: ${error}`);
                    return;
                }
                if (node.aliveRequests === 0) {
                    node.status({});
                } else {
                    node.status({fill: "green", shape: "ring", text: `running ${node.aliveRequests} reqs`,
                        running: node.aliveRequests > 0});
                }
            });
        })
    }

    function MailgunConfig(n) {
        RED.nodes.createNode(this, n);
        this.name = n.name;
        this.domain = n.domain;
        this.apikey = n.apikey;
        this.from = n.from;
        this.to = n.to;
    }

    RED.nodes.registerType("mailgun", Mailgun);
    RED.nodes.registerType("mailgun-config", MailgunConfig);
};