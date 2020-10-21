// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, ActionTypes, ActivityTypes, CardFactory, ConversationState,TurnContext ,BotFrameworkAdapter} = require('botbuilder');
const path = require('path');
const axios = require('axios');
const fs = require('fs');
const {Util}=require("../axios/util");
const { Webapi } = require('../axios/axios');
const AWS=require("aws-sdk")
var oss = require('ali-oss');
const adapter = new BotFrameworkAdapter({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword,
    channelService: process.env.ChannelService,
    openIdMetadata: process.env.BotOpenIdMetadata
});
class AttachmentsBot extends ActivityHandler {
    constructor() {
        super();
        this.onMessage(async (context, next) => {
            // Determine how the bot should process the message by checking for attachments.
            if (context.activity.attachments && context.activity.attachments.length > 0) {
                // The user sent an attachment and the bot should handle the incoming attachment.
                await this.handleIncomingAttachment(context);
            } else {
                // Since no attachment was received, send an attachment to the user.
                // await this.handleOutgoingAttachment(context);
            }
            // Send a HeroCard with potential options for the user to select.
            // await this.displayOptions(context);

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }
    /**
     * Saves incoming attachments to disk by calling `this.downloadAttachmentAndWrite()` and
     * responds to the user with information about the saved attachment or an error.
     * @param {Object} turnContext
     */
    async handleIncomingAttachment(turnContext) {
        let token =await Util.checkSkypeTeam(turnContext.activity.channelId,turnContext.activity.from.id);
        if(!token) return
        turnContext.sendActivity("token"+token)
        await Webapi.setToken(token)
        // Prepare Promises to download each attachment and then execute each Promise.
        turnContext.sendActivity("文件上传转换中...")
        const promises = turnContext.activity.attachments.map(this.downloadAttachmentAndWrite.bind(this,turnContext));
        const successfulSaves = await Promise.all(promises);
        // Replies back to the user with information about where the attachment is stored on the bot's server,
        // and what the name of the saved file is.
        async function replyForReceivedAttachments(localAttachmentData) {
            // if (localAttachmentData) {
            //     // Because the TurnContext was bound to this function, the bot can call
            //     // `TurnContext.sendActivity` via `this.sendActivity`;
            //     await this.sendActivity(`Attachment "${ localAttachmentData.fileName }" ` +
            //         `has been received and saved to "${ localAttachmentData.localPath }".`);
            // } else {
            //     await this.sendActivity('Attachment was not successfully saved to disk.');
            // }
        }

        // Prepare Promises to reply to the user with information about saved attachments.
        // The current TurnContext is bound so `replyForReceivedAttachments` can also send replies.
        const replyPromises = successfulSaves.map(replyForReceivedAttachments.bind(turnContext));
        await Promise.all(replyPromises);
    }

    /**
     * Downloads attachment to the disk.
     * @param {Object} attachment
     */
    async downloadAttachmentAndWrite(context,attachment) {
        // Retrieve the attachment via the attachment's contentUrl.
        const url = attachment.contentUrl;
        const conversationReference = TurnContext.getConversationReference(context.activity);
        let conversationReferences={};
        conversationReferences[conversationReference.conversation.id] = conversationReference;
        // Local file path for the bot to save the attachment.
        const localFileName = path.join(__dirname, attachment.name);
        let test=async (res)=>{
            for (const conversationReference of Object.values(conversationReferences)) {
                await adapter.continueConversation(conversationReference, async turnContext => {
                    await turnContext.sendActivity(res);
                });
            }
        }
        let send=(uploadRes)=>{
            test(uploadRes.AttachmentID+"")
            const buf = Buffer.from(uploadRes.Title, 'utf8');
            test(buf.toString('base64'))
            Webapi.getLiveId(uploadRes.AttachmentID,uploadRes.Title).then(async(idObj)=>{
                if(idObj){
                   let flag= await Webapi.updateLesson(idObj.LessonID);
                   test(flag+"")
                    let meetingUrl="https://testkloudsync.peertime.cn/live/"+idObj.LessonID
                    const reply = { type: ActivityTypes.Message };
                    const buttons = [
                        { type: ActionTypes.OpenUrl, title: 'start meeting ', value: meetingUrl },
                    ];
                    const img=[
                        {
                         url: Util.getcoverUrl(uploadRes.AttachmentUrl)
                        }
                    ]
                    const card = CardFactory.heroCard('', img,
                        buttons);
            
                    reply.attachments = [card];
                    for (const conversationReference of Object.values(conversationReferences)) {
                        await adapter.continueConversation(conversationReference, async turnContext => {
                            await turnContext.sendActivity(reply);
                        });
                    }
                }else{
                    test(idObj)
                }
            })

        }
        try {
            // arraybuffer is necessary for images
            
            let botToken=await Webapi.getBotToken();
            context.sendActivity(botToken.access_token)
            const response = await axios.get(url, { responseType: 'arraybuffer' ,headers:{Authorization:botToken.token_type+' '+botToken.access_token}});
            context.sendActivity(response.config.url)
            let  fileSize=parseInt(parseInt(response.headers['content-length']))
            // If user uploads JSON file, this prevents it from being written as "{"type":"Buffer","data":[123,13,10,32,32,34,108..."
            // if (response.headers['content-type'] === 'application/json') {
            //     response.data = JSON.parse(response.data, (key, value) => {
            //         return value && value.type === 'Buffer' ? Buffer.from(value.data) : value;
            //     });
            // }
            let hash=Util.GetMD5(response.data) 
            let res=await Webapi.checkHash(attachment.name,hash);
            context.sendActivity(res.RetCode+"1")
            console.log(res)
            if(res&&res.RetCode==0){
                send({AttachmentID:res.RetData.AttachmentID,Title:res.RetData.Title})
            }
            if(res&&res.RetCode==-6002){
                let ossObj=await Webapi.getOssKey();
                var convertParam = {
                    ServiceProviderId: ossObj.Data.ServiceProviderId,
                    RegionName: ossObj.Data.RegionName,
                    BucketName: ossObj.Data.BucketName,
                    AccessKeyId:ossObj.Data.AccessKeyId,
                    AccessKeySecret:ossObj.Data.AccessKeySecret,
                    SecurityToken:ossObj.Data.SecurityToken,
                  }
                  var _bucket={                    
                    ServiceProviderId: convertParam.ServiceProviderId,
                    RegionName: convertParam.RegionName,
                    BucketName: convertParam.BucketName,
                }
                  context.sendActivity(convertParam.ServiceProviderId+"5")
                  if(convertParam.ServiceProviderId==1){
                    var s3 = new AWS.S3({
                        apiVersion: '2006-03-01',
                        params: {Bucket: convertParam.BucketName},
                        accessKeyId:convertParam.AccessKeyId,
                        secretAccessKey:convertParam.AccessKeySecret,
                        sessionToken:convertParam.SecurityToken,
                        region:convertParam.RegionName,
                        maxRetries:0,//5
                        retryDelayOptions:{customBackoff:(retrycount)=>{
                          //console.log("customBackoff");
                          if(retrycount==4 && onError)
                          {
                            onError(1);
                          }
                          return 3000;
                        }},
                        httpOptions:{timeout:600000}
                      });
                      var s3Name=res.RetData.Path+"/"+Util.GUID()+""+attachment.name.substr(attachment.name.lastIndexOf("."));
                      var params = {
                        Bucket: s3.config.params.Bucket,
                        Key: s3Name,
                        Body: response.data
                      };
                      try{
                        s3.putObject(params,(perr, pres)=> {
                            if (perr) {
                                console.log("Error uploading data: ", perr);
                            } else {
                                console.log("Successfully uploaded data to myBucket/myKey");
                                context.sendActivity("Successfully uploaded data to myBucket/myKey")
                                var S3type=Util.GetCovertType(attachment.name);
                                context.sendActivity("key"+s3Name)
                                context.sendActivity(S3type)
                                context.sendActivity("reg"+_bucket.RegionName)
                                context.sendActivity("buc"+_bucket.BucketName)
                                context.sendActivity("path"+res.RetData.Path)
                                Webapi.startConverting({Key:s3Name,DocumentType:S3type,Bucket:_bucket,TargetFolderKey:res.RetData.Path}).then((code)=>{
                                    function S3setTime(specifiedKey){
                                        Webapi.queryConvertPercentage(specifiedKey).then((cresult)=>{
                                            test("开始转换"+cresult.Success)
                                            if(cresult&&cresult.Success&&cresult.Data.CurrentStatus==5){
                                                test("转换成功")
                                                test(attachment.name)
                                                test(cresult.Data.Result.FileName)
                                                test(res.RetData.FileID+"id")
                                                test(cresult.Data.Result.Count+"count")
                                                test(hash)
                                                test(cresult.Data.Result.FileSize+"size")
                                                 Webapi.uploadNewFile(attachment.name,cresult.Data.Result.FileName,res.RetData.FileID,cresult.Data.Result.Count,hash,cresult.Data.Result.FileSize).then((uploadRes)=>{
                                                    if(uploadRes){
                                                        send(uploadRes)
                                                    }
                                                 }).catch(function (error) {
                                                    test(error)
                                                    console.log(error);
                                                  })
                                            }else if(cresult&&cresult.Data.CurrentStatus==3){
                                                test("装换失败"+cresult.Data.CurrentStatus)
                                                return cresult
                                            }else if(cresult){
                                                test("timeouteffff")
                                                setTimeout( ()=>{
                                                    test("timeout")
                                                    S3setTime(specifiedKey)
                                                },2000)
                                            }
                                        }).catch((error)=>{
            
                                        })
            
                                    }
                                    S3setTime({Key:s3Name,Bucket:_bucket})
                                })
    
                                context.sendActivity("Successfully")
    
                            }
                            })
                      }catch(e){
                        context.sendActivity(e)
                        console.log("失败",e);
                      }
                  }else{
                    var client  =new oss({
                        region: convertParam.RegionName,
                        accessKeyId: convertParam.AccessKeyId,
                        accessKeySecret: convertParam.AccessKeySecret,
                        bucket: convertParam.BucketName,
                        stsToken:convertParam.SecurityToken,
                    });
                    try {
                        var name=res.RetData.Path+"/"+Util.GUID()+""+attachment.name.substr(attachment.name.lastIndexOf("."));
                        // object-name可以自定义为文件名（例如file.txt）或目录（例如abc/test/file.txt）的形式，实现将文件上传至当前Bucket或Bucket下的指定目录。
                         await client.put(name,response.data);
                        context.sendActivity(6)
                        var type=Util.GetCovertType(attachment.name);
                        await Webapi.startConverting({Key:name,DocumentType:type,Bucket:_bucket,TargetFolderKey:res.RetData.Path})
                        function setTime(specifiedKey){
                            Webapi.queryConvertPercentage(specifiedKey).then((cresult)=>{
                                if(cresult&&cresult.Success&&cresult.Data.CurrentStatus==5){
                                     Webapi.uploadNewFile(attachment.name,cresult.Data.Result.FileName,res.RetData.FileID,cresult.Data.Result.Count,hash,fileSize).then((uploadRes)=>{
                                        if(uploadRes){
                                            send(uploadRes)
                                        }
                                     }).catch(function (error) {
                                        console.log(error);
                                      })
                                }else if(cresult&&cresult.Data.CurrentStatus==3){
                                    return cresult
                                }else if(cresult){
                                    setTimeout( ()=>{
                                        setTime(specifiedKey)
                                    },2000)
                                }
                            }).catch((error)=>{

                            })

                        }
                      setTime({Key:name,Bucket:_bucket})
                    } catch (e) {
                        console.log("失败",e);
                      }
                  }
            }else if(res&&res.RetCode==-6003){
                send({AttachmentID:res.RetData,Title:attachment.name})
                return 1 //上传文件已经存在
                
                // RetData:
            }
        } catch (error) {
            context.sendActivity(error+"")
            console.error(error);
            return 6004;
        }
        // If no error was thrown while writing to disk, return the attachment's name
        // and localFilePath for the response back to the user.
        // if(res){
        //     return res
        // }else{
        //     return false
        // }
        return {
            fileName: attachment.name,
            localPath: localFileName
        };
    }
     async sendLiveDocCard(res,context){
         console.log(999999)
        console.log(res,context)

    }
    /**
     * Responds to user with either an attachment or a default message indicating
     * an unexpected input was received.
     * @param {Object} turnContext
     */
    async handleOutgoingAttachment(turnContext) {
        const reply = { type: ActivityTypes.Message };

        // Look at the user input, and figure out what type of attachment to send.
        // If the input matches one of the available choices, populate reply with
        // the available attachments.
        // If the choice does not match with a valid choice, inform the user of
        // possible options.
        const firstChar = turnContext.activity.text[0];
        if (firstChar === '1') {
            reply.text = 'This is an inline attachment.';
            reply.attachments = [this.getInlineAttachment()];
        } else if (firstChar === '2') {
            reply.attachments = [this.getInternetAttachment()];
            reply.text = 'This is an internet attachment.';
        } else if (firstChar === '3') {
            reply.attachments = [await this.getUploadedAttachment(turnContext)];
            reply.text = 'This is an uploaded attachment.';
        } else {
            // The user did not enter input that this bot was built to handle.
            reply.text = 'Your input was not recognized, please try again.';
        }
        await turnContext.sendActivity(reply);
    }

    /**
     * Sends a HeroCard with choices of attachments.
     * @param {Object} turnContext
     */
    async displayOptions(turnContext) {
        const reply = { type: ActivityTypes.Message };

        // Note that some channels require different values to be used in order to get buttons to display text.
        // In this code the emulator is accounted for with the 'title' parameter, but in other channels you may
        // need to provide a value for other parameters like 'text' or 'displayText'.
        const buttons = [
            { type: ActionTypes.ImBack, title: '1. Inline Attachment', value: '1' },
            { type: ActionTypes.ImBack, title: '2. Internet Attachment', value: '2' },
            { type: ActionTypes.ImBack, title: '3. Uploaded Attachment', value: '3' }
        ];
        const img=[
            {
             url: 'https://docs.microsoft.com/en-us/bot-framework/media/how-it-works/architecture-resize.png'
            }
        ]
        const card = CardFactory.heroCard('', img,
            buttons);

        reply.attachments = [card];

        await turnContext.sendActivity(reply);
    }

    /**
     * Returns an inline attachment.
     */
    getInlineAttachment() {
        const imageData = fs.readFileSync(path.join(__dirname, '../resources/architecture-resize.png'));
        const base64Image = Buffer.from(imageData).toString('base64');

        return {
            name: 'architecture-resize.png',
            contentType: 'image/png',
            contentUrl: `data:image/png;base64,${ base64Image }`
        };
    }

    /**
     * Returns an attachment to be sent to the user from a HTTPS URL.
     */
    getInternetAttachment() {
        // NOTE: The contentUrl must be HTTPS.
        return {
            name: 'architecture-resize.png',
            contentType: 'image/png',
            contentUrl: 'https://docs.microsoft.com/en-us/bot-framework/media/how-it-works/architecture-resize.png'
        };
    }

    /**
     * Returns an attachment that has been uploaded to the channel's blob storage.
     * @param {Object} turnContext
     */
    async getUploadedAttachment(turnContext) {
        const imageData = fs.readFileSync(path.join(__dirname, '../resources/123.jpg'));
        const connector = turnContext.adapter.createConnectorClient(turnContext.activity.serviceUrl);
        const conversationId = turnContext.activity.conversation.id;
        const response = await connector.conversations.uploadAttachment(conversationId, {
            name: 'architecture-resize.png',
            originalBase64: imageData,
            type: 'image/png'
        });

        // Retrieve baseUri from ConnectorClient for... something.
        const baseUri = connector.baseUri;
        const attachmentUri = baseUri + (baseUri.endsWith('/') ? '' : '/') + `v3/attachments/${ encodeURI(response.id) }/views/original`;
        return {
            name: 'architecture-resize.png',
            contentType: 'image/png',
            contentUrl: attachmentUri
        };
    }
}

module.exports.AttachmentsBot = AttachmentsBot;