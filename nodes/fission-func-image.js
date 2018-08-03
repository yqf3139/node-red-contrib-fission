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
    const Api = require('../fission/api');
    const Common = require('../fission/common');
    const api = new Api.Api(Api.InClusterConfig);

    function FissionImage(n) {
        RED.nodes.createNode(this, n);
        const funcname = 'std-image-convert';
        const node = this;

        node.instancename = n.instancename;
        node.dstbkt = n.dstbkt;
        node.width = parseInt(n.width);
        node.height = parseInt(n.height);
        node.grey = n.grey === 'true';
        node.aliveRequests = 0;

        node.on('input', function (msg) {
            const instancename = node.instancename || msg.instancename;
            if (!instancename || !msg.payload) {
                return;
            }

            node.aliveRequests += 1;
            node.status({fill: "green", shape: "ring", text: `running ${node.aliveRequests} reqs`, running: true});

            msg.payload.dstbkt = node.dstbkt;
            msg.payload.resize = {
                "width": node.width,
                "height": node.height,
                "grey": node.grey
            };

            api.invokeFunction(funcname, 'POST', {}, {},
                {instancename, payload: msg.payload}).then((response) => {

                node.aliveRequests -= 1;
                if (node.aliveRequests === 0) {
                    node.status({fill: "green", shape: "dot", text: `success`, running: true});
                    setTimeout(() => {
                        if (node.aliveRequests === 0) node.status({});
                    }, 2000);
                } else {
                    node.status({
                        fill: "green",
                        shape: "ring",
                        text: `running ${node.aliveRequests} reqs`,
                        running: true
                    });
                }
                Common.fillMsg(msg, response);
                node.send([msg, null]);
            }).catch((err) => {
                node.aliveRequests -= 1;
                node.status({fill: "red", shape: "dot", text: "an invocation failed", running: node.aliveRequests > 0});
                node.error(`invoke fission func [${funcname}] failed, with error: ${err}`);
                setTimeout(() => {
                    if (node.aliveRequests === 0) node.status({});
                }, 5000);
                Common.fillMsg(msg, err.response);
                node.send([null, msg]);
            });
        })
    }

    RED.nodes.registerType("fission-func-image", FissionImage);
};