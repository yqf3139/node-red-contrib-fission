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
        const funcname = 'std.image.convert';
        const node = this;

        node.outputs = parseInt(n.outputs);

        node.instancename = n.instancename;
        node.errorflow = n.errorflow;
        node.aliveRequests = 0;

        const buildMsgs = function(msg, response, isErr) {
            return Common.buildMsgs(msg, response, isErr, node.outputs, node.errorflow);
        };

        node.on('input', function (msg) {
            const instancename = node.instancename || msg.instancename;
            if (!instancename || !msg.payload) {
                return;
            }

            node.aliveRequests += 1;
            node.status({fill: "green", shape: "ring", text: `running ${node.aliveRequests} reqs`});

            api.invokeFunction(funcname, 'POST', {}, {},
                {instancename, payload: msg.payload}).then((response) => {
                node.log(response);

                node.aliveRequests -= 1;
                if (node.aliveRequests === 0) {
                    node.status({});
                } else {
                    node.status({fill: "green", shape: "ring", text: `running ${node.aliveRequests} reqs`});
                }
                node.send(buildMsgs(msg, response, false));
            }).catch((err) => {
                console.error(err.response.data);
                node.aliveRequests -= 1;
                node.status({fill: "red", shape: "dot", text: "an invocation failed"});
                node.error(`invoke fission func [${funcname}] failed, with error: ${err}`);
                node.send(buildMsgs(msg, err.response, true));
            });
        })
    }

    RED.nodes.registerType("fission-func-image", FissionImage);
};