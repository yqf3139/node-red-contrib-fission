function fillMsg(msg, response) {
    msg.payload = response.data;
    msg.headers = response.headers;
    msg.statusCode = response.status;
    msg.statusText = response.statusText;
}

function buildMsgs(msg, response, isErr, outputs, errorflow) {
    const body = response.data;
    if (outputs === 1) {
        fillMsg(msg, response);
        return msg;
    }
    if (errorflow && outputs === 2) {
        fillMsg(msg, response);
        return isErr ? [null, msg] : [msg, null];
    }
    if (Array.isArray(body) && body.length === outputs) {
        // if response size matches outputs
        return body.map((r) => {
            const m = Object.assign({}, msg);
            fillMsg(m, r);
            return m;
        });
    }
    // if not, duplicate responses into msg
    return new Array(outputs).fill(0).map(() => {
        const m = Object.assign({}, msg);
        fillMsg(m, response);
        return m;
    });
}

module.exports = {
    fillMsg,
    buildMsgs,
};
