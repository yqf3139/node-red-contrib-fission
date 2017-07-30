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

    function FissionTimeTrigger(n) {
        RED.nodes.createNode(this, n);
        if (RED.settings.httpNodeRoot !== false) {
            if (!n.cron) {
                return;
            }
            const node = this;

            this.errorHandler = function (err, req, res, next) {
                node.warn(err);
                res.sendStatus(500);
            };

            this.callback = function (req, res) {
                const msgid = RED.util.generateId();
                res._msgid = msgid;
                node.status({fill: "blue", shape: "dot", text: `triggered`, running: true});
                setTimeout(() => {
                    node.status({});
                }, 500);
                node.send({_msgid: msgid, payload: req.headers});
                res.sendStatus(200);
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

    RED.nodes.registerType("fission-timetrigger", FissionTimeTrigger);
};