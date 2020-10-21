const axios =require('axios') 
axios.defaults.timeout = 20000;
axios.defaults.baseURL = 'https://testapi.peertime.cn/peertime/V1/';
axios.defaults.headers.authorization = 'Bearer 01427aa4-396e-44b7-82ab-84d802099bb0';
const Https =require("https");
const { resolve } = require('path');
var request = require('request');
let Webapi={
    getAjax(url){
        return new Promise((resolve, reject) => {
            axios.get(url,null,{ responseType: "json" }).then(res =>
            {
                resolve(res.data);
            }).catch(err =>
            {
                console.log(err);
                resolve(null);
            });
        });
    },
    postAjax(url,obj)
    {
        return new Promise((resolve, reject) => {
            axios.post(url,obj).then(res =>
            {
                resolve(res.data);
            }).catch(err =>
            {
                resolve(null);
            });
        });
    },
    setToken(token){
        axios.defaults.headers.UserToken = token;
    },
    async getSkypeToken(id){
        let url ='User/TokenBySkypeSessionID?id='+id;
        let result=await this.getAjax(url);
        let res_Json=eval('(' + result + ')')
        if (!res_Json)
        {
            return null;
        } else if(res_Json&&res_Json.RetCode==0) {
            return res_Json.RetData
        }
    },
    async getTeamsToken(id){
        let url ='User/TokenByTeamsSessionID?id='+id;
        let result=await this.getAjax(url);
        let res_Json=eval('(' + result + ')')
        if (!res_Json)
        {
            return null;
        } else if(res_Json&&res_Json.RetCode==0) {
            return res_Json.RetData
        }
    },
    async checkHash(filename, hash)
    {
        const str=Buffer.from(filename, 'utf8');
        var uname = encodeURIComponent(str.toString('base64'));
        var url= "FavoriteAttachment/UploadFileWithHash?Title=" +uname +"&Description=&Hash=" +hash
        var result = await this.postAjax(url,null);
        let res_Json=eval('(' + result + ')')//返回的数据是一个json字符串，但是JSON.parse不能转换，需要使用eval方法
        if(!res_Json)
        {
            return null;
        }
        else
        {
            return res_Json;
        }
    },
    returnText(){
        return "为啥不执行"
    },
    async startConverting(data){
        var url= "https://livedoc.peertime.cn/TxLiveDocumentApi/api/startConverting"
        var result = await this.postAjax(url,data);
        if(!result)
        {
            return null;
        }
        else
        {
            return result;
        }
    },
    async queryConvertPercentage(data){
        var url= "https://livedoc.peertime.cn/TxLiveDocumentApi/api/queryConverting"
        var result = await this.postAjax(url,data);
        if(!result)
        {
            return null;
        }
        else
        {
            return result;
        }
    },
    getOssKey(){
        return new Promise((resolve, reject)=>{
            var option={
                rejectUnauthorized: false,
                headers:{
                    authorization:"Bearer 01427aa4-396e-44b7-82ab-84d802099bb0"
                }
            }
            Https.get("https://livedoc.peertime.cn/TxLiveDocumentApi/api/prepareUploading?clientIp=",option,(res)=>{
                res.on('data', (id) => {
                    let ossObj=eval('(' + id.toString() + ')')
                    if(!ossObj||!ossObj.Success){
                        this.getOssKey()
                    }else{
                        resolve(ossObj)
                    }
                  })
            
            }) 
        })
    },
    async UploadFavNewFile(obj)
    {
        var url =  "FavoriteAttachment/UploadNewFile";
        var result = await this.postAjax(url, obj);
        let res_Json=eval('(' + result + ')')
        if (!res_Json)
        {
            return null;
        } else if(res_Json&&res_Json.RetCode==0) {
            return res_Json.RetData
        }
    },
    async uploadNewFile(filename,servername,fileid,pagecount,md5,size){
        var newfile= new Object();
        newfile.Title =filename;
        newfile.SchoolID =-1;
        newfile.Description =filename;
        newfile.Hash =md5;
        newfile.FileID=fileid;
        newfile.PageCount =pagecount;
        newfile.FileSize=size;
        newfile.FileName=servername.lastIndexOf(".")>-1?servername.substr(0,servername.lastIndexOf(".")):servername;
        var newfileresult =await this.UploadFavNewFile(newfile);
        return newfileresult;
    },
    async getLiveId(id,title)
    {
        const buf = Buffer.from(title, 'utf8');
        var url = "Lesson/AddTempLessonWithOriginalDocument?attachmentID=" + id+"&Title="+buf.toString('base64');
        var result = await this.postAjax(url);
        let res_Json=eval('(' + result + ')')
        if (!res_Json)
        {
            return null;
        } else if(res_Json&&res_Json.RetCode==0) {
            return res_Json.RetData
        }else{
            return res_Json.RetCode
        }
    },
    async updateLesson(id){
        var url =  "Lesson/UpgradeToNormalLesson?lessonID="+id;
        var result = await this.postAjax(url, obj);
        let res_Json=eval('(' + result + ')')
        if (!res_Json)
        {
            return false;
        } else if(res_Json&&res_Json.RetCode==0) {
            return true
        }
    },
    async getBotToken(){
        let data={
            grant_type:"client_credentials",
            client_id:"0e4e3e83-1e19-4fee-8ac4-9475d83f81f6",
            client_secret:"Fkv0J5I.oT16v59W7..wj75-Cuqsq0be5N",
            scope:"https://api.botframework.com/.default"
        }
        let str="grant_type=client_credentials&client_id=0e4e3e83-1e19-4fee-8ac4-9475d83f81f6&client_secret=Fkv0J5I.oT16v59W7..wj75-Cuqsq0be5N&scope=https://api.botframework.com/.default"
        return new Promise((resolve,reject)=>{
            var url="https://login.microsoftonline.com/botframework.com/oauth2/v2.0/token";
            request({
                url: url,
                method: "POST",
                headers: {
                    "content-type": "application/x-www-form-urlencoded",
                },
                body: str
            }, function(error, response, body) {
                if (!error&&response.statusCode == 200) {
                    resolve(JSON.parse(body))
                }else if(error||response.statusCode){
                    resolve(null)
                }
            });    
        }).catch((error)=>{
            console.log(error)
        })
        
    }
}
module.exports.Webapi=Webapi
