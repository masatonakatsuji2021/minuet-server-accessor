import * as http from "http";
import { MinuetAccessor } from "../";

const ma = new MinuetAccessor();

const h = http.createServer((req, res) => {
    const status = ma.listen(req, res);
    if (!status) {
        res.write("URL=" + req.url);
        if (req.headers.params){
            res.write("\n params= " + JSON.stringify(req.headers.params));
        }
        res.end();
    }
});
h.listen(5811);
console.log("listen http://localhost:5811/");