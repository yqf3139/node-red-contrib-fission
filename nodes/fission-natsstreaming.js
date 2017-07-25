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
    const bodyParser = require("body-parser");
    const jsonParser = bodyParser.json();
    const Api = require('../fission/api');
    const api = new Api.Api(Api.InClusterConfig);

    function FissionNatsTrigger(n) {
        RED.nodes.createNode(this, n);
        if (RED.settings.httpNodeRoot !== false) {
            if (!n.topic) {
                return;
            }
            const node = this;
            node.autoresp = n.autoresp;

            this.errorHandler = function (err, req, res, next) {
                node.warn(err);
                res.sendStatus(500);
            };

            this.callback = function (req, res) {
                const msgid = RED.util.generateId();
                res._msgid = msgid;
                if (node.autoresp) {
                    res.send({});
                    node.send({_msgid: msgid, req, payload: req.body});
                } else {
                    node.send({_msgid: msgid, req, res: {_res: res}, payload: req.body});
                }
            };

            let metricsHandler = function (req, res, next) {
                next();
            };
            if (this.metric()) {
                // TODO fission metrics
            }

            const url = `/${this.id}`;
            RED.httpNode.post(url, metricsHandler, jsonParser, this.callback, this.errorHandler);

            this.on("close", function () {
                const node = this;
                RED.httpNode._router.stack.forEach(function (route, i, routes) {
                    if (route.route && route.route.path === `/${node.id}`) {
                        routes.splice(i, 1);
                    }
                });
            });
        } else {
            this.warn(RED._("httpin.errors.not-created"));
        }
    }

    function FissionNatsPublisher(n) {
        RED.nodes.createNode(this, n);
        const node = this;
        node.topic = n.topic;
        node.aliveRequests = 0;
        const funcname = 'std-mq-natspub';

        node.on('input', function (msg) {
            const topic = node.topic || msg.topic;
            if (!topic || !msg.payload) {
                return;
            }

            node.aliveRequests += 1;
            node.status({fill: "green", shape: "ring", text: `running ${node.aliveRequests} reqs`, running: true});

            api.invokeFunction(funcname, 'POST', {}, {}, {topic, payload: msg.payload}).then((response) => {
                node.aliveRequests -= 1;
                if (node.aliveRequests === 0) {
                    node.status({});
                } else {
                    node.status({fill: "green", shape: "ring", text: `running ${node.aliveRequests} reqs`,
                        running: node.aliveRequests > 0});
                }
            }).catch((err) => {
                node.status({fill: "red", shape: "dot", text: "an invocation failed", running: node.aliveRequests > 0});
                node.error(`invoke fission func [${funcname}] failed, with error: ${err}`);
            });
        })
    }

    RED.nodes.registerType("fission-natstrigger", FissionNatsTrigger);
    RED.nodes.registerType("fission-natspublisher", FissionNatsPublisher);
};