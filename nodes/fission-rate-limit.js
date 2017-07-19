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

//Simple node to introduce a pause into a flow
module.exports = function (RED) {
    "use strict";

    const MILLIS_TO_NANOS = 1000000;
    const SECONDS_TO_NANOS = 1000000000;

    function Counter(seconds) {
        this.interval = seconds * 1000;
        this.arr = [];

        this.mark = function () {
            this.arr.push(Date.now())
        };
        this.clean = function () {
            const past = Date.now() - this.interval;
            while (this.arr.length > 0 && this.arr[0] < past) {
                this.arr.shift();
            }
        };
        this.count = function () {
            return this.arr.length;
        }
    }

    function FissionRateLimit(n) {
        RED.nodes.createNode(this, n);

        this.rateUnits = n.rateUnits;
        if (n.rateUnits === "minute") {
            this.rate = (60 * 1000) / n.rate;
        } else if (n.rateUnits === "hour") {
            this.rate = (60 * 60 * 1000) / n.rate;
        } else if (n.rateUnits === "day") {
            this.rate = (24 * 60 * 60 * 1000) / n.rate;
        } else {  // Default to seconds
            this.rate = 1000 / n.rate;
        }

        this.rate *= (n.nbRateUnits > 0 ? n.nbRateUnits : 1);

        this.name = n.name;
        this.lastSent = {};
        this.passed = 0;
        this.dropped = 0;
        this.secCnt = new Counter(1);
        this.minCnt = new Counter(60);
        const node = this;
        this.worker = setInterval(function () {
            node.minCnt.clean();
            node.secCnt.clean();
            const n = node;
            node.status({
                text: `${n.passed} pass, ${n.dropped} drop, ${n.secCnt.count()} m/sec, ${n.minCnt.count()} m/min`
            });
        }, 500);

        node.on("input", function (msg) {
            let timeSinceLast;
            const topic = msg.topic || "_none_";
            node.secCnt.mark();
            node.minCnt.mark();
            if (node.lastSent[topic]) {
                timeSinceLast = process.hrtime(node.lastSent[topic]);
            }
            if (!node.lastSent[topic]) { // ensuring that we always send the first message
                node.lastSent[topic] = process.hrtime();
                node.send([msg, null]);
                node.passed++;
            } else if (( (timeSinceLast[0] * SECONDS_TO_NANOS) + timeSinceLast[1] ) > (node.rate * MILLIS_TO_NANOS)) {
                node.lastSent[topic] = process.hrtime();
                node.send([msg, null]);
                node.passed++;
            } else {
                msg._payload = msg.payload;
                msg.payload = {err: 'Request limit'};
                msg.statusCode = 400;
                node.send([null, msg]);
                node.dropped++;
            }
        });
        node.on("close", function () {
            node.status({});
            clearInterval(node.worker);
        });
    }

    RED.nodes.registerType("fission-rate-limit", FissionRateLimit);
};