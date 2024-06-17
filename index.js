"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MinuetAccessor = void 0;
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
class MinuetAccessor {
    constructor(options) {
        this.rootDir = "htdocs";
        this.buffers = {};
        if (options) {
            this.setting(options);
        }
        else {
            this.updateBuffer();
        }
    }
    setting(options) {
        if (options.rootDir != undefined)
            this.rootDir = options.rootDir;
        this.updateBuffer();
    }
    updateBuffer() {
        this.search(this.rootDir);
        console.log(this.buffers);
    }
    search(target) {
        const list = fs.readdirSync(target, {
            withFileTypes: true
        });
        for (let n = 0; n < list.length; n++) {
            const l_ = list[n];
            if (l_.isDirectory()) {
                this.search(target + "/" + l_.name);
            }
            else {
                const fullPath = target + "/" + l_.name;
                if (l_.name != ".accessor") {
                    continue;
                }
                const content = fs.readFileSync(fullPath);
                const filePath = path.dirname(fullPath.substring(this.rootDir.length));
                this.buffers[filePath] = yaml.load(content);
            }
        }
    }
    listen(req, res) {
        let url = req.url.split("?")[0] + "/";
        url = url.split("//").join("/");
        let status = false;
        const bc = Object.keys(this.buffers);
        for (let n = 0; n < bc.length; n++) {
            const name = bc[n];
            if (url.indexOf(name + "/") != 0)
                continue;
            const yml = this.buffers[name];
            let status_ = false;
            if (yml.routes) {
                status_ = this.routes(url, name, yml.routes, req, res);
            }
            if (yml.authority) {
                status_ = this.authority(url, name, yml.authority, req, res);
            }
            if (status_) {
                status = status_;
                break;
            }
        }
        return status;
    }
    routes(url, rootUrl, routes, req, res) {
        let status = false;
        for (let n = 0; n < routes.length; n++) {
            const route = routes[n];
            if (route.redirect || route.silent || route.domain) {
                if (!route.root)
                    continue;
                let target;
                if (route.root[route.root.length - 1] == "*") {
                    target = route.root.substring(0, route.root.length - 1);
                }
                else {
                    target = route.root;
                }
                if (url.indexOf(rootUrl + target) != 0)
                    continue;
                const remainUrl = url.substring((rootUrl + target).length);
                let redirectUrl;
                if (route.redirect) {
                    redirectUrl = rootUrl + route.redirect;
                }
                else if (route.silent) {
                    let silent = route.silent;
                    if (silent.indexOf("../") > -1) {
                        rootUrl = path.dirname(rootUrl);
                        silent = silent.split("../").join("");
                    }
                    redirectUrl = rootUrl + silent;
                }
                if (route.mode == "leave") {
                    redirectUrl += "/" + remainUrl;
                }
                else if (route.mode == "params") {
                    if (route.silent) {
                        req.headers.params = remainUrl.split("/");
                    }
                }
                if (route.redirect) {
                    if (!route.statusCode) {
                        route.statusCode = 301;
                    }
                    res.statusCode = route.statusCode;
                    res.setHeader("location", redirectUrl);
                    res.end();
                    status = true;
                    break;
                }
                else if (route.silent) {
                    req.url = redirectUrl;
                }
            }
        }
        return status;
    }
    authority(url, rootUrl, routes, req, res) {
        let status = false;
        for (let n = 0; n < routes.length; n++) {
            const route = routes[n];
            if (!(route.root && route.user && route.pass)) {
                continue;
            }
            let target;
            if (route.root[route.root.length - 1] == "*") {
                target = route.root.substring(0, route.root.length - 1);
            }
            else {
                target = route.root;
            }
            if (url.indexOf(rootUrl + target) != 0)
                continue;
            const encodedCredentials = Buffer.from(`${route.user}:${route.pass}`).toString('base64');
            const authHeader = req.headers['authorization'];
            if (authHeader && authHeader.startsWith('Basic ')) {
                const credentials = authHeader.split(' ')[1];
                if (credentials === encodedCredentials) {
                    break;
                }
            }
            res.statusCode = 401;
            res.setHeader("WWW-Authenticate", "Basic realm=\"Authoricate\"");
            if (!route.failureMessage) {
                route.failureMessage = "Authentication failure";
            }
            res.write(route.failureMessage);
            res.end();
            status = true;
            break;
        }
        return status;
    }
}
exports.MinuetAccessor = MinuetAccessor;
