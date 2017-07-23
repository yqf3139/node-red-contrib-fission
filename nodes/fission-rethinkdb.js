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
    const Common = require('../fission/common');
    const api = new Api.Api(Api.InClusterConfig);

    function FissionRethinkdbAdapter(n) {
        RED.nodes.createNode(this, n);
        if (RED.settings.httpNodeRoot !== false) {
            if (!n.instancename || !n.database || !n.table) {
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

    function FissionRethinkdbPutter(n) {
        RED.nodes.createNode(this, n);
        const funcname = 'std.rethinkdb.put';
        const node = this;

        node.instancename = n.instancename;
        node.database = n.database;
        node.table = n.table;
        node.aliveRequests = 0;

        node.on('input', function (msg) {
            const instancename = node.instancename || msg.instancename;
            const database = node.database || msg.database;
            const table = node.table || msg.table;
            if (!instancename || !database || !table || !msg.payload) {
                return;
            }

            node.aliveRequests += 1;
            node.status({fill: "green", shape: "ring", text: `running ${node.aliveRequests} reqs`});

            api.invokeFunction(funcname, 'POST', {}, {},
                {instancename, database, table, payload: msg.payload}).then((response) => {
                node.log(response);

                node.aliveRequests -= 1;
                if (node.aliveRequests === 0) {
                    node.status({});
                } else {
                    node.status({fill: "green", shape: "ring", text: `running ${node.aliveRequests} reqs`});
                }
            }).catch((err) => {
                node.status({fill: "red", shape: "dot", text: "an invocation failed"});
                node.error(`invoke fission func [${funcname}] failed, with error: ${err}`);
            });
        })
    }

    function FissionRethinkdbGetter(n) {
        RED.nodes.createNode(this, n);
        const funcname = 'std.rethinkdb.get';
        const node = this;

        node.instancename = n.instancename;
        node.database = n.database;
        node.table = n.table;
        node.key = n.key;
        node.value = n.value;
        node.aliveRequests = 0;

        node.on('input', function (msg) {
            const instancename = node.instancename || msg.instancename;
            const database = node.database || msg.database;
            const table = node.table || msg.table;
            const key = node.key || msg.key;
            const value = node.value || msg.value;
            if (!instancename || !database || !table) {
                return;
            }

            node.aliveRequests += 1;
            node.status({fill: "green", shape: "ring", text: `running ${node.aliveRequests} reqs`, running: true});

            api.invokeFunction(funcname, 'POST', {}, {},
                {instancename, database, table, key, value}).then((response) => {

                node.aliveRequests -= 1;
                if (node.aliveRequests === 0) {
                    node.status({});
                } else {
                    node.status({fill: "green", shape: "ring", text: `running ${node.aliveRequests} reqs`, running: node.aliveRequests > 0});
                }
                Common.fillMsg(msg, response);
                node.send([msg, null]);
            }).catch((err) => {
                node.aliveRequests -= 1;
                node.status({fill: "red", shape: "dot", text: "an invocation failed", running: node.aliveRequests > 0});
                node.error(`invoke fission func [${funcname}] failed, with error: ${err}`);
                Common.fillMsg(msg, err.response);
                node.send([null, msg]);
            });
        })
    }

    function FissionRethinkdbUpdater(n) {
        RED.nodes.createNode(this, n);
        const funcname = 'std.rethinkdb.update';
        const node = this;

        node.instancename = n.instancename;
        node.database = n.database;
        node.table = n.table;
        node.key = n.key;
        node.value = n.value;
        node.newkey = n.newkey;
        node.newvalue = n.newvalue;
        node.aliveRequests = 0;

        node.on('input', function (msg) {
            const instancename = node.instancename || msg.instancename;
            const database = node.database || msg.database;
            const table = node.table || msg.table;
            const key = node.key || msg.key;
            const value = node.value || msg.value;
            const newkey = node.newkey || msg.newkey;
            const newvalue = node.newvalue || msg.newvalue;
            if (!instancename || !database || !table || !key || !value || !newvalue || !newvalue) {
                return;
            }

            node.aliveRequests += 1;
            node.status({fill: "green", shape: "ring", text: `running ${node.aliveRequests} reqs`, running: true});

            api.invokeFunction(funcname, 'POST', {}, {},
                {instancename, database, table, key, value, newkey, newvalue}).then((response) => {

                node.aliveRequests -= 1;
                if (node.aliveRequests === 0) {
                    node.status({});
                } else {
                    node.status({fill: "green", shape: "ring", text: `running ${node.aliveRequests} reqs`, running: node.aliveRequests > 0});
                }
            }).catch((err) => {
                node.aliveRequests -= 1;
                node.status({fill: "red", shape: "dot", text: "an invocation failed", running: node.aliveRequests > 0});
                node.error(`invoke fission func [${funcname}] failed, with error: ${err}`);
            });
        })
    }

    RED.nodes.registerType("fission-rethinkdb-adapter", FissionRethinkdbAdapter);
    RED.nodes.registerType("fission-rethinkdb-put", FissionRethinkdbPutter);
    RED.nodes.registerType("fission-rethinkdb-get", FissionRethinkdbGetter);
    RED.nodes.registerType("fission-rethinkdb-update", FissionRethinkdbUpdater);
};