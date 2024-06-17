import * as fs from "fs";
import * as path from "path";
import * as http from "http";
import * as yaml from "js-yaml";

export interface MinuetAccessorOption {

    rootDir? : string,



}

export class MinuetAccessor {

    public rootDir : string = "htdocs";

    private buffers = {};

    public constructor(options? : MinuetAccessorOption){
        if (options){
            this.setting(options);
        }
        else {
            this.updateBuffer();
        }
    }
    
    public setting(options? : MinuetAccessorOption){
        if (options.rootDir != undefined) this.rootDir = options.rootDir;
        this.updateBuffer();
    }

    public updateBuffer(){
        this.search(this.rootDir);
        console.log(this.buffers);
    }

    private search(target : string) {
        const list = fs.readdirSync(target, {
            withFileTypes: true
        });
        for ( let n = 0 ; n < list.length ; n++){
            const l_ = list[n];

            if (l_.isDirectory()){
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

    public listen(req : http.IncomingMessage, res : http.ServerResponse) : boolean {
        let url = req.url.split("?")[0] + "/";
        url = url.split("//").join("/");

        let status : boolean = false;
        const bc = Object.keys(this.buffers);
        for (let n = 0 ; n < bc.length ;n++ ){
            const name = bc[n];

            if (url.indexOf(name + "/") == -1) {
                continue;
            }

            const yml = this.buffers[name];

            let status_ : boolean = false;
            if (yml.routes){
                status_ = this.routes(url, name, yml.routes, req, res);
            }
            else if(yml.authority) {
                status_ = this.authority(url,  name, yml.routes, req, res);
            }
 
            if (status_) {
                status = status_;
                break;
            }
        }

        return status;
    }

    private routes(url : string, rootUrl : string, routes : Array<MinuetAccessorRoute>, req : http.IncomingMessage, res : http.ServerResponse) : boolean {
        let status : boolean = false;
        for (let n = 0 ; n < routes.length ; n++){
            const route = routes[n];
            
            if (route.redirect || route.silent) {
                if (!route.root) continue;
                
                let target : string;
                if (route.root[route.root.length - 1] == "*") {
                    target = route.root.substring(0, route.root.length - 1);
                }
                else {
                    target = route.root;
                }
                if (url.indexOf(rootUrl + target) == -1) continue;

                const remainUrl = url.substring((rootUrl+target).length);

                let redirectUrl;
                if (route.redirect){
                    redirectUrl = rootUrl + route.redirect;
                }
                else if (route.silent) {
                    let silent = route.silent;
                    if (silent.indexOf("../") > -1){
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

                if (route.redirect){
                    if (!route.statusCode){
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

    private authority (rl : string, rootUrl : string, routes : Array<MinuetAccessorRoute>, req : http.IncomingMessage, res : http.ServerResponse) : boolean {
        let status : boolean = false;





        return status;
    }
}



interface MinuetAccessorRoute {
    root? : string,
    redirect? : string,
    silent? : string,
    domain? : string,
    mode? : "none" | "leave" | "params",
    statusCode? : number,
}