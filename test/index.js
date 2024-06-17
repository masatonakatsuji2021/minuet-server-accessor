"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http = require("http");
const __1 = require("../");
const ma = new __1.MinuetAccessor();
const h = http.createServer((req, res) => {
    const status = ma.listen(req, res);
    console.log(status);
    if (!status) {
        res.write("URL=" + req.url);
        if (req.headers.params) {
            res.write("\n params= " + JSON.stringify(req.headers.params));
        }
        res.end();
    }
});
h.listen(5811);
console.log("listen http://localhost:5811/");
