module.exports = function (RED) {
    "use strict";

    const Proxy = require('express-http-proxy');
    const Api = require('../fission/api');
    const Url = require('url');
    const api = new Api.Api(Api.InClusterConfig);

    function FissionInvocation(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        node.name = config.name;
        node.funcname = config.funcname;
        node.errorflow = config.errorflow;
        node.outputs = parseInt(config.outputs);

        node.aliveRequests = 0;

        function fillMsg(msg, response) {
            msg.payload = Object.assign({}, response.data);
            msg.headers = response.headers;
            msg.statusCode = response.status;
            msg.statusText = response.statusText;
        }

        function buildMsgs(msg, response, isErr) {
            const body = response.data;
            if (node.outputs === 1) {
                fillMsg(msg, response);
                return msg;
            }
            if (node.errorflow && node.outputs === 2) {
                fillMsg(msg, response);
                return isErr ? [null, msg] : [msg, null];
            }
            if (Array.isArray(body) && body.length === node.outputs) {
                // if response size matches outputs
                return body.map((r) => {
                    const m = Object.assign({}, msg);
                    fillMsg(m, r);
                    return m;
                });
            }
            // if not, duplicate responses into msg
            return new Array(node.outputs).fill(0).map(() => {
                const m = Object.assign({}, msg);
                fillMsg(m, response);
                return m;
            });
        }

        node.on('input', function (msg) {
            console.log(msg);

            let method = 'POST';
            let headers = {};
            let params = {};
            // if a plain or json payload
            let body = {
                from: 'node-red',
                payload: msg.payload,
            };

            // if a http req in
            // parse req into body
            if (msg.req) {
                method = msg.req.method;
                headers = msg.req.headers;
                params = msg.req.query;
                body = msg.req.body;

                delete msg.req;
            }

            node.aliveRequests += 1;
            node.status({fill: "green", shape: "ring", text: `running ${node.aliveRequests} reqs`});

            api.invokeFunction(node.funcname, method, headers, params, body).then((response) => {
                node.aliveRequests -= 1;
                if (node.aliveRequests === 0) {
                    node.status({});
                } else {
                    node.status({fill: "green", shape: "ring", text: `running ${node.aliveRequests} reqs`});
                }
                node.send(buildMsgs(msg, response, false));
            }).catch((err) => {
                node.status({fill: "red", shape: "dot", text: "an invocation failed"});
                node.error(`invoke fission func [${node.funcname}] failed, with error: ${err.responseText}`);
                node.send(buildMsgs(msg, err.response, true));
            });

        });
        node.on('close', function () {
            // tidy up any state
        });
    }

    RED.nodes.registerType("fission-invocation", FissionInvocation);

    // set up a proxy server to fission controller and router for frontend
    const controllerProxy = Proxy(Api.InClusterConfig.controller, {
        proxyReqPathResolver: function (req) {
            return Url.parse(req.originalUrl).path.replace('/proxy/fission-controller', '');
        }
    });
    const routerProxy = Proxy(Api.InClusterConfig.router, {
        proxyReqPathResolver: function (req) {
            return Url.parse(req.originalUrl).path.replace('/proxy/fission-router', '');
        }
    });

    RED.httpNode.use("/proxy/fission-controller/*", controllerProxy);
    RED.httpNode.use("/proxy/fission-router/*", routerProxy);
};