const axios =require('axios') 
axios.defaults.timeout = 20000;
axios.defaults.baseURL = 'https://testapi.peertime.cn/peertime/V1/';
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
            axios.post(url,JSON.stringify(obj)).then(res =>
            {
                resolve(res.data);
            }).catch(err =>
            {
                resolve(null);
            });
        });
    },
    setToken(token){
        axios.defaults.headers.common['Authorization'] = token;
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

}
module.exports.Webapi=Webapi
