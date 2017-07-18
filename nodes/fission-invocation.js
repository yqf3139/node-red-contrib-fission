module.exports = function (RED) {
    "use strict";

    const Proxy = require('express-http-proxy');
    const Api = require('../fission/api');
    const Common = require('../fission/common');
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

        const buildMsgs = function(msg, response, isErr) {
            return Common.buildMsgs(msg, response, isErr, node.outputs, node.errorflow);
        };

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
                node.aliveRequests -= 1;
                node.status({fill: "red", shape: "dot", text: "an invocation failed"});
                node.error(`invoke fission func [${node.funcname}] failed, with error: ${err}`);
                node.send(buildMsgs(msg, err.response, true));
            });
        });
        node.on('close', function () {
            // tidy up any state
        });
    }

    RED.nodes.registerType("fission-invocation", FissionInvocation);

    // set up a proxy server to fission controller and router for frontend
    function makeProxy(backend, prefix) {
        return Proxy(backend, {
            proxyReqPathResolver: function (req) {
                return Url.parse(req.originalUrl).path.replace(prefix, '');
            }
        });
    }

    const controllerProxy = makeProxy(Api.InClusterConfig.controller, '/proxy/fission-controller');
    const routerProxy = makeProxy(Api.InClusterConfig.router, '/proxy/fission-router');
    const catalogProxy = makeProxy(Api.InClusterConfig.catalog, '/proxy/fission-catalog');

    RED.httpNode.use("/proxy/fission-controller/*", controllerProxy);
    RED.httpNode.use("/proxy/fission-router/*", routerProxy);
    RED.httpNode.use("/proxy/fission-catalog/*", catalogProxy);
};