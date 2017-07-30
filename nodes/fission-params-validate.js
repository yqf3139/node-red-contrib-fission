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

    // throws if msg is not validated
    function validate(msg, template) {
        Object.keys(template).map((k) => {
            const v = template[k];
            if (!msg.hasOwnProperty(k)) {
                throw new Error(`[${k}] is not a valid key in msg`)
            }
            const msgv = msg[k];
            switch (v) {
                case 'array':
                    if (!Array.isArray(msgv)) {
                        throw new Error(`[${msgv}] is not a valid [${v}] in msg`)
                    }
                    break;
                case 'number':
                case 'string':
                case 'object':
                    if (v !== typeof msgv) {
                        throw new Error(`[${msgv}] is not a valid [${v}] in msg`)
                    }
                    break;
                default:
                    if ('object' === typeof v) {
                        validate(msgv, v);
                    } else {
                        throw new Error(`[${v}] is not a valid type`)
                    }
            }
        });
    }

    function FissionParamsValidate(n) {
        RED.nodes.createNode(this, n);
        this.payload = JSON.parse(n.payload);
        this.payloadType = n.payloadType;
        const node = this;

        this.on("input", function (msg) {
            try {
                validate(msg, node.payload);
                node.send([msg, null]);
                msg = null;
            } catch (err) {
                node.error(err, msg);
                msg.payload = {err: err.toString()};
                msg._payload = msg.payload;
                node.send([null, msg]);
            }
        });
    }

    RED.nodes.registerType("fission-params-validate", FissionParamsValidate);
};