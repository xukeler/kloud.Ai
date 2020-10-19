const crypto = require('crypto');
const {Webapi} =require("./axios");
const Util={
    // 获取文件hash
    uploadPercent:0,
    GetMD5(buffer){
        const hash = crypto.createHash('md5');
        hash.update(buffer)
        let res=hash.digest('hex')//digest只能调用一次，每次需要重新生成实例
        return res
    },
    async checkSkypeTeam(text,id){
        let res;
        if(text){
            res= await Webapi.getSkypeToken(encodeURIComponent("29:1vpKz7N8WAy1eEwj7jWwP9lFnwXmecxTTleaf504I2gg"));
        }else{
            res= await Webapi.getTeamsToken(encodeURIComponent(id));
        }
        return res
    },
     GUID(){
      var guid = "";
      for (var i = 1; i <= 32; i++)
      {
        var n = Math.floor(Math.random() * 16.0).toString(16);
        guid += n;
        if ((i == 8) || (i == 12) || (i == 16) || (i == 20))
          guid += "-";
      }
      return guid;
    },

      GetCovertType(filename)
      {
        var ext = filename.substr(filename.lastIndexOf("."));
        ext = ext.toLowerCase();
        if (this.isFileTypeSupport(ext, "convert"))
        {
          return ext.substr(1);
        }
        else
        {
          return "";
        }
      },
      isFileTypeSupport(ext,mode="all")
      {
        if (ext.indexOf(".") != 0)
        {
          ext = ext.substr(ext.lastIndexOf("."));
        }
        var accept = [];
        if (mode == "all")
        {
          accept = [".rmvb",".mtv",".avi",".wmv",".amv",".flv",".mp4",".mp3",".m4a",".wav",".3gpp",".acc",".mp2",".jpg", ".jpeg", ".jpe", ".png", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".pdf",".rar",".zip",".7z",".key",".numbers",
          ".rp",".sketch",".psd",".js",".txt",".md",".html",".ico",".xmind",".xd",".svg",".ai",".css",".json"];//,".pages"
        }
        else if (mode == "doc")
        {
          accept = [".jpg", ".jpeg", ".jpe", ".png", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".pdf",".key",".numbers"];//,".pages"
        }
        else if (mode == "convert")
        {
          accept = [".jpg",".jpeg",".jpe",".png",".doc",".docx",".xls",".xlsx",".ppt",".pptx",".pdf",".key",".numbers"];//,".pages"
        }
        else if (mode == "img")
        {
          accept = [".jpg", ".jpeg", ".jpe", ".png"];
        }
        else if (mode == "video")
        {
          accept = [".mp4"];
        }
        else if (mode == "audio")
        {
          accept = [".mp3",".wav",".3gpp",".acc",".mp2",".m4a"];
        }
        else if (mode == "media")
        {
          accept = [".mp4",".mp3",".wav",".3gpp",".acc",".mp2",".m4a"];
        }
        else if(mode == "videoAnddoc"){
          accept = [".mp4",".jpg", ".jpeg", ".jpe", ".png", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".pdf",".key",".numbers"];//,".pages"
        }
        var flag=false;
        accept.forEach((item)=>{
          if(item==ext.toLowerCase()){
            flag=true
          }
        })
        return flag;
      },
      async setIntervalEx(asyncFunction, timeout)
      {
        //loger.log("setIntervalEx:436");
        var result = await asyncFunction();
        if (result)
        {
          setTimeout(() => { this.setIntervalEx(asyncFunction, timeout); },timeout);
        }
      },
      getcoverUrl(url){
        //获取文档封面
        let src;
        let str=url;
        let index=str.lastIndexOf("/");
        let cstr=str.substring(index + 1, str.length);
        let index2=cstr.lastIndexOf(".");
        let str2=cstr.substring(0,index2);
        let index3=str2.lastIndexOf("_");
        let str3=str2.substring(index3+1,str2.length);
        str=str.substring(0,index+1)+cstr.replace(eval("/"+str3+"/g"),'1');
        src=str;
        return src;
      },
}
module.exports.Util=Util