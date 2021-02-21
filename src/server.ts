import express from 'express';
import http, { Server } from 'http';
import fs from 'fs';
import dotenv from 'dotenv';
import zlib from 'zlib';
dotenv.config();

class AppServer {
  private _app:express.Application;
  private server: Server;

  constructor () {
    this._app = express();
    this._app.enable('strict routing');   
    this._app.disable('x-powered-by')
    this._app.set('view engine', 'ejs');
    this._app.set('trust proxy', 1);
  }

  private saveContentToFile(content, path){
    fs.writeFile(path, content,()=>{
      console.log(path + "  saved");
    });
    return this;
  }

  private extractGZContent(timeStamp, content):Promise<any>{
    return new Promise((resolve, reject)=>{
      const prefix = Math.floor(1000 + Math.random() * 9000);
      const tmpFile1 =process.env.TMP_DIR+"/"+prefix+"-"+timeStamp+".json.gz"; 
      const tmpFile2 =process.env.TMP_DIR+"/"+prefix+"-"+timeStamp+".json"; 
      fs.writeFile(tmpFile1, content,(err)=>{
        if(err){
          reject(err);
          return;
        }
        const gunzip = zlib.createGunzip();
        const rstream = fs.createReadStream(tmpFile1);
        const wstream = fs.createWriteStream(tmpFile2);
        rstream.pipe(gunzip).pipe(wstream);
        wstream.on('finish', ()=>{
          fs.unlink(tmpFile1,()=>{
            console.log("Removed temp file "+tmpFile1);
          });
          resolve(tmpFile2);
        });
      });
    })
  }

  private getDASSerial(filePath):Promise<string>{
    return new Promise((resolve, reject)=>{
      fs.readFile(filePath, (err, data)=>{
        if(err){
          reject(err);
          return;
        }
        const log = JSON.parse(data.toString());
        resolve(log[0].robot_id??"");
      });
    })
  }

  private processRequest(req, content){
    return new Promise(async (resolve, reject)=>{
      /// [serial #] / year-month /  [ time stamp]
      let errorThrown = false;
      const date = new Date();
      let serial = "########";
      const fileName = "MessageBody.json";
      const year_month = date.getFullYear()+"-"+(((date.getMonth()+1) < 10)?"0"+(date.getMonth()+1):(date.getMonth()+1));
      const timeStamp = date.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', second:'numeric', hour12: true }).replace(/:| /g,"-");
      const name = req.params.name;
      let type = "";

      const headers = req.headers;
      headers["RemoteEndPoint"] = req.ip;
      const infoText = JSON.stringify(headers);
      const paramsText = JSON.stringify(req.params);
      const jsonBodyPath = await this.extractGZContent(timeStamp, content)
      .catch((extractGZError)=>{
        reject(extractGZError);
        errorThrown = true;
      })
      if(errorThrown) return;

      if(name.toUpperCase().indexOf("DAS") != -1){
        type = "DAS";
        serial = await this.getDASSerial(jsonBodyPath);
      } else if(name.toUpperCase().indexOf("VICTOR-") != -1){
        type = "VECTOR_LOG";
        serial = name.split("-")[1]??"";
      } else if(typeof(req.headers['usr-robotesn'] != "undefned") && req.headers['usr-robotesn'].length > 0){
        type = "CRASH_REPORT";
        serial = req.headers['usr-robotesn']??"";
      }
      console.log(`The type is ${type}`);
      //Save Files
      if(serial.length === 0){
        reject(new Error("Failed to extract serial from DAS logfile"));
        return;
      } 

      const subFolderPath = process.env.UPLOAD_DIR+"/"+serial+"/"+year_month+"/"+timeStamp;
      fs.mkdir(subFolderPath, {recursive: true},(mkdirerr)=>{
        if(mkdirerr){
          reject(mkdirerr);
          return;
        }
        fs.rename(jsonBodyPath, subFolderPath+"/"+fileName, (renameError)=>{
          if(renameError){
            reject(renameError);
            return;
          }
          this.saveContentToFile(infoText, subFolderPath+"/info.txt")
          .saveContentToFile(paramsText, subFolderPath+"/params.txt")
          resolve("0");
          console.log(subFolderPath+"/"+fileName+" saved");
        })
      });
      
    });
  }

  private setRoutes(){
    let errorMessage = "";
    this._app.put("/:name", (req, res) => {
      const data = [];
      req.on('data', (chunk) => {
        data.push(chunk);
      });

      req.on('end', ()=> {
        const binary = Buffer.concat(data);
        const result = this.processRequest(req, binary)
        .catch((err)=>{
          errorMessage = JSON.stringify(err);
        })
        if(errorMessage.length > 0){
          res.status(500).send(errorMessage);
        } else {
          res.status(200).send(result);
        }
      });
    });
  }

  public start(){
    this.setRoutes();
    this.server = http.createServer(this._app);
    this.server.listen({
      port:process.env.SERVER_PORT, 
      host:process.env.SERVER_IP});
    console.log(`server is listening on ${process.env.SERVER_IP}:${process.env.SERVER_PORT}`);
  }
}

const server = new AppServer();
server.start();