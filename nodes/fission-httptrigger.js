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
    const cookieParser = require("cookie-parser");
    const getBody = require('raw-body');
    const jsonParser = bodyParser.json();
    const urlencParser = bodyParser.urlencoded({extended: true});
    const typer = require('media-typer');
    const isUtf8 = require('is-utf8');

    function rawBodyParser(req, res, next) {
        if (req.skipRawBodyParser) {
            next();
        } // don't parse this if told to skip
        if (req._body) {
            return next();
        }
        req.body = "";
        req._body = true;

        let isText = true;
        let checkUTF = false;

        if (req.headers['content-type']) {
            const parsedType = typer.parse(req.headers['content-type'])
            if (parsedType.type === "text") {
                isText = true;
            } else if (parsedType.subtype === "xml" || parsedType.suffix === "xml") {
                isText = true;
            } else if (parsedType.type !== "application") {
                isText = false;
            } else if (parsedType.subtype !== "octet-stream") {
                checkUTF = true;
            } else {
                // applicatino/octet-stream
                isText = false;
            }
        }

        getBody(req, {
            length: req.headers['content-length'],
            encoding: isText ? "utf8" : null
        }, function (err, buf) {
            if (err) {
                return next(err);
            }
            if (!isText && checkUTF && isUtf8(buf)) {
                buf = buf.toString()
            }
            req.body = buf;
            next();
        });
    }

    function FissionHttptrigger(n) {
        RED.nodes.createNode(this, n);
        if (RED.settings.httpNodeRoot !== false) {
            if (!n.url) {
                this.warn(RED._("httpin.errors.missing-path"));
                return;
            }
            this.url = n.url;
            if (this.url[0] !== '/') {
                this.url = '/' + this.url;
            }
            this.method = n.method;

            const node = this;

            this.errorHandler = function (err, req, res, next) {
                node.warn(err);
                res.sendStatus(500);
            };

            this.callback = function (req, res) {
                const msgid = RED.util.generateId();
                res._msgid = msgid;

                let token = null;
                if (req.headers.hasOwnProperty('authorization')) {
                    token = req.headers['authorization'].replace('Bearer ', '');
                }

                if (node.method.match(/^(post|delete|put)$/)) {
                    node.send({_msgid: msgid, req, res: {_res: res}, payload: req.body, token});
                } else if (node.method === "get") {
                    node.send({_msgid: msgid, req, res: {_res: res}, payload: req.query, token});
                } else {
                    node.send({_msgid: msgid, req, res: {_res: res}, token});
                }

                node.status({fill: "blue", shape: "dot", text: `triggered`, running: true});
                setTimeout(() => {
                    node.status({});
                }, 500);
            };

            let metricsHandler = function (req, res, next) {
                next();
            };
            if (this.metric()) {
                // TODO fission metrics
            }

            const url = `/${this.id}`;
            if (this.method === "get") {
                RED.httpNode.get(url, cookieParser(), metricsHandler, this.callback, this.errorHandler);
            } else if (this.method === "post") {
                RED.httpNode.post(url, cookieParser(), metricsHandler, jsonParser, urlencParser, rawBodyParser, this.callback, this.errorHandler);
            } else if (this.method === "put") {
                RED.httpNode.put(url, cookieParser(), metricsHandler, jsonParser, urlencParser, rawBodyParser, this.callback, this.errorHandler);
            } else if (this.method === "patch") {
                RED.httpNode.patch(url, cookieParser(), metricsHandler, jsonParser, urlencParser, rawBodyParser, this.callback, this.errorHandler);
            } else if (this.method === "delete") {
                RED.httpNode.delete(url, cookieParser(), metricsHandler, jsonParser, urlencParser, rawBodyParser, this.callback, this.errorHandler);
            }

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

    RED.nodes.registerType("fission-httptrigger", FissionHttptrigger);
};