const axios = require('axios');

let OutClusterConfig = {
    controller: 'http://cluster.me:31313',
    router: 'http://cluster.me:31314',
    catalog: 'http://cluster.me:30080',
    prometheus: 'http://cluster.me:31325',
    influxdb: {
        host: 'cluster.me',
        port: '31315',
    },
};

let InClusterConfig = {
    controller: 'http://controller',
    router: 'http://router',
    catalog: 'http://catalog-catalog-apiserver.catalog',
    prometheus: 'http://prometheus.fission-metrics:9090',
    influxdb: {
        host: 'influxdb',
        port: '8086',
    },
};

InClusterConfig = OutClusterConfig;

/**
 * Checks if a network request came back fine, and throws an error if not
 *
 * @param  {object} response   A response from a network request
 *
 * @return {object|undefined} Returns either the response, or throws an error
 */
function checkStatus(response) {
    if (response.status >= 200 && response.status < 300) {
        return response;
    }

    const error = new Error(response.statusText);
    error.response = response;
    throw error;
}

function buildFunction(item) {
    return {metadata: {name: item.name}, environment: {name: item.environment}, code: item.code};
}


function Api(config) {
    this.config = config;
    const {controller, router} = config;
    this.basePath = `${controller}/v1/`;
    this.routerPath = router;
}

Api.prototype.getEnvironments = function () {
    return axios.get(`${this.basePath}environments`)
        .then(checkStatus);
};

Api.prototype.getEnvironment = function (name) {
    return axios.get(`${this.basePath}environments/${name}`)
        .then(checkStatus);
};
Api.prototype.removeEnvironment = function (environment) {
    return axios.delete(`${this.basePath}environments/${environment.name}`)
        .then(checkStatus);
};
Api.prototype.putEnvironment = function (environment) {
    return axios.put(`${this.basePath}environments/${environment.name}`, {
        metadata: {name: environment.name},
        runContainerImageUrl: environment.image
    })
        .then(checkStatus);
};
Api.prototype.postEnvironment = function (environment) {
    return axios.post(`${this.basePath}environments`, {
        metadata: {name: environment.name},
        runContainerImageUrl: environment.image
    })
        .then(checkStatus);
};

Api.prototype.getFunctions = function () {
    return axios.get(`${this.basePath}functions`)
        .then(checkStatus);
};

Api.prototype.getFunction = function (name) {
    return axios.get(`${this.basePath}functions/${name}`)
        .then(checkStatus);
};

Api.prototype.removeFunction = function (item) {
    return axios.delete(`${this.basePath}functions/${item.name}`)
        .then(checkStatus);
};

Api.prototype.putFunction = function (item) {
    return axios.put(`${this.basePath}functions/${item.name}`, buildFunction(item))
        .then(checkStatus);
};

Api.prototype.getTriggersHttp = function () {
    return axios.get(`${this.basePath}triggers/http`)
        .then(checkStatus);
};

Api.prototype.removeTriggerHttp = function (item) {
    return axios.delete(`${this.basePath}triggers/http/${item.metadata.name}`)
        .then(checkStatus);
};

Api.prototype.postTriggerHttp = function (item) {
    return axios.post(`${this.basePath}triggers/http`, item)
        .then(checkStatus);
};

Api.prototype.postFunction = function (item) {
    return axios.post(`${this.basePath}functions`, buildFunction(item))
        .then(checkStatus);
};

Api.prototype.restRequest = function (url, method, headers, params, body) {
    return axios({
        method: method.toLowerCase(),
        url: `${this.routerPath}${url}`,
        headers,
        params,
        data: body,
    }).catch((e) => e.response);
};

Api.prototype.invokeFunction = function (name, method, headers, params, data, resptype) {
    const responseType = resptype || 'json';
    return axios({
        method,
        url: `${this.routerPath}/fission-function/${name}`,
        headers,
        params,
        data,
        responseType,
    })
        .then(checkStatus);
};

Api.prototype.getKubeWatchers = function () {
    return axios.get(`${this.basePath}watches`)
        .then(checkStatus);
};
Api.prototype.removeKubeWatcher = function (item) {
    return axios.delete(`${this.basePath}watches/${item.metadata.name}`)
        .then(checkStatus);
};
Api.prototype.postKubeWatcher = function (item) {
    return axios.post(`${this.basePath}watches`, item)
        .then(checkStatus);
};

Api.prototype.getTriggersTimer = function () {
    return axios.get(`${this.basePath}triggers/time`)
        .then(checkStatus);
};
Api.prototype.removeTriggerTimer = function (item) {
    return axios.delete(`${this.basePath}triggers/time/${item.metadata.name}`)
        .then(checkStatus);
};
Api.prototype.postTriggerTimer = function (item) {
    return axios.post(`${this.basePath}triggers/time`, item)
        .then(checkStatus);
};
Api.prototype.getFunctionVersions = function(name) {
  return axios.get(`${basePath}functions/${name}/versions`)
    .then(checkStatus);
};

module.exports = {
    Api,
    checkStatus,
    OutClusterConfig,
    InClusterConfig,
};
