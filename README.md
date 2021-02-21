# vector-logs

### Description
This app runs a server used to store vector logs for debugging. Once you have installed and started the server you can modify your vector to upload it's logs files to you chosen ip location. 
Info [here](<https://wire.my.to/vectorwiki/site/how-to/How%20to%20change%20where%20the%20logs%20are%20sent.html>)

You will need a custom firmware or OSKR to be able to do this.

### Configuration
The server reads the following from the .env file
```
SERVER_IP=0.0.0.0
SERVER_PORT=9000
UPLOAD_DIR="storage"
TMP_DIR="tmp"
```
SERVER_IP : IP the server uses, default will be the machines IP
SERVER_PORT : the port the server listens to
UPLOAD_DIR: directory used to store log files
TMP_DIR : directory used for extracting gz files

### Installation
First install dependencies then build
```
npm install
npm run build
```
To run server
```
node .
````
For development
```
npm run watch
````

You can daemonize the server either using either of these
[Non  Sucking Service Manager](https://nssm.cc/)(windows)
[forever](https://www.npmjs.com/package/forever)
[PM2](https://www.npmjs.com/package/pm2)