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
                context.sendActivity({ attachments: [this.createOAuthCard()] });
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
    createOAuthCard() {
        return CardFactory.oauthCard(
            'OAuth connection', // Replace with the name of your Azure AD connection
            'Sign In',
            'BotFramework OAuth Card'
        );
    }
    /**
     * Saves incoming attachments to disk by calling `this.downloadAttachmentAndWrite()` and
     * responds to the user with information about the saved attachment or an error.
     * @param {Object} turnContext
     */
    async handleIncomingAttachment(turnContext) {
        let token =await Util.checkSkypeTeam(turnContext.activity.channelId,turnContext.activity.from.id);
        if(!token) return
        await Webapi.setToken(token)
        // Prepare Promises to download each attachment and then execute each Promise.
        turnContext.sendActivity("文件上传转换中...")
        console.log(turnContext)
        turnContext.sendActivity(turnContext.activity.attachments[0].name)
        const promises = turnContext.activity.attachments.map(this.downloadAttachmentAndWrite.bind(this,turnContext));
        const successfulSaves = await Promise.all(promises);
        // Replies back to the user with information about where the attachment is stored on the bot's server,
        // and what the name of the saved file is.
        async function replyForReceivedAttachments(localAttachmentData) {
            if (localAttachmentData) {
                // Because the TurnContext was bound to this function, the bot can call
                // `TurnContext.sendActivity` via `this.sendActivity`;
                await this.sendActivity(`Attachment "${ localAttachmentData.fileName }" ` +
                    `has been received and saved to "${ localAttachmentData.localPath }".`);
            } else {
                await this.sendActivity('Attachment was not successfully saved to disk.');
            }
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
        console.log(context,attachment)
        context.sendActivity("1")
        // Retrieve the attachment via the attachment's contentUrl.
        const url = attachment.contentUrl;
        const conversationReference = TurnContext.getConversationReference(context.activity);
        let conversationReferences={};
        conversationReferences[conversationReference.conversation.id] = conversationReference;
        // Local file path for the bot to save the attachment.
        const localFileName = path.join(__dirname, attachment.name);
        let send=(uploadRes)=>{
            Webapi.getLiveId(uploadRes.AttachmentID,uploadRes.Title).then(async(idObj)=>{
                if(idObj){
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
                }
            })

        }
        try {
            // arraybuffer is necessary for images
            context.sendActivity("3")
            const response = await axios.get(url, { responseType: 'arraybuffer' ,headers:{Authorization:"0.ASwAdwFxibZwDkqw01IX4u0bBLaHe-GTR4JPmCWhOIG6hfssANk.AQABAAIAAAB2UyzwtQEKR7-rWbgdcBZIgDN36ZXhJrXkFCT1e5M7wJZwFjj-fAnQ_jch0SxxOCqveAsojnnZBIs9ordDHdUGruY78IMCjiSaK7BC76xDH61vnLjuLB6QOM0b5Ot1WJHApzwwvgAtR5DwQHVfzhP7ckCEr1YafJvB6K8hHNyx3UNSonQ6ljbFt_je1_xYsXoByxg3Mw2XleuvEhKlWeVjwHjZVtuWYb0CzKKKQkRgyCrmQD6LYbFrwJMkHPHbW_QSqS6Ldto8WUYJQseXa9yPGpxEEYLSd4YJnS7hyb5XWfStX_Qhv2QoxM4cxuxWCaa6WVDWWlcQYfSxBjK8ZoK2VSJqK120n8qqnJzNKKy0nWgchraktE4XL-PZtquRJGhSLXolFX3-mSudmHZyf3s4zFHhpOUiDFbvtB3d_lP4RAVztSlx7qbgwG28krsdzHrqBqEBuZWkiEGl1pparI8huinCfGS9pDrBmiYtFJoMdANixN7hIUi6CtYAmMXzgo69ORqPdLG73k4Jk0hRrl9vbfnl20f_yzQJ5i0stLmKQoUl5XWsXzOKwVDhNyIPpH3iOLw3X-micCRHbxo2PozNuUF7S9Nm_atzqUrd8rqczMNxJ2c671AH6zbSl94lW2HJtLctSPYi5p3cnZFek1d2UhfnUSAFajEc4jFdJwu2TwDpXWOH04Alf9ACGPMUGtPv7DYJVEBlmVdpLkj3ctELE9ZC9XcOkMBYU4srM9xNZAAXLp70fmz090-Z5AfNObCuVqgwmUyHUnNtFJCgm-lSl7lvrko4paiG9cQXZe14pIcOQ79vsVAjyESs65zPGPNMY0yNPgVJnuCE7NSo6hVjEm-GGbSwpw52SaTU9npi0UCKOPFrRRhKus_fXLVENq2jh1Ae5CikmTmP3js6tHsIhpAeTexXlsPom69boGhvnt9p5DqRu47tPGH_EoXK0S8LcfUZiOupMfTkr98bhMPvk6GNyPZjl2Lap6d575CePXfHVCCedBiw12VzlkqQqF3SRxuKNxgJbB-1G7YeYdDv7oLOIX00UZftgXBWxDQbY_7oHXdBxipwtKZug7echUtGmDS0UajLXh1TjMiBeaJjSi_aI9jmbStgcoRMRfIqaYdQgE9fpUkPRrGtgxawmwzIyX-azFIeFqznM1DS7N5kWqrTVMrx-yxfqHMFphrfde9c838MGhXQc_K4qTI0vcz6GS1GzwPgpnTxMtQLXs9xtyUdpRFl_tGShGy7DiCVBes6FxEdjRmXWZRSCoeegCYWfIpWHiWbrgCOUE9S_q8SHFgXAy0KmW-zHif9ikssSyAA"}});
            console.log(response.config.url)
            context.sendActivity(response.config.url)
            let  fileSize=parseInt(parseInt(response.headers['content-length']))
            context.sendActivity("444")
            // If user uploads JSON file, this prevents it from being written as "{"type":"Buffer","data":[123,13,10,32,32,34,108..."
            // if (response.headers['content-type'] === 'application/json') {
            //     response.data = JSON.parse(response.data, (key, value) => {
            //         return value && value.type === 'Buffer' ? Buffer.from(value.data) : value;
            //     });
            // }
            console.log(response)
            let hash=Util.GetMD5(response.data) 
            let res=await Webapi.checkHash(attachment.name,hash);
            
            context.sendActivity("4")
            context.sendActivity(res.RetCode+"1")
            if(res&&res.RetCode==0){
                console.log(res)
            }
            if(res&&res.RetCode==-6002){
                context.sendActivity(5)
                let ossObj=await Webapi.getOssKey();
                var convertParam = {
                    ServiceProviderId: ossObj.Data.ServiceProviderId,
                    RegionName: ossObj.Data.RegionName,
                    BucketName: ossObj.Data.BucketName,
                    AccessKeyId:ossObj.Data.AccessKeyId,
                    AccessKeySecret:ossObj.Data.AccessKeySecret,
                    SecurityToken:ossObj.Data.SecurityToken,
                  }

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
                      var params = {
                        Bucket: this.s3.config.params.Bucket,
                        Key: attachment.name,
                        Body: response.data
                      }
                      s3.putObject(params, function (perr, pres) {
                        if (perr) {
                            console.log("Error uploading data: ", perr);
                        } else {
                            console.log("Successfully uploaded data to myBucket/myKey");
                        }
                    });
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
                        var _bucket={                    
                            ServiceProviderId: convertParam.ServiceProviderId,
                            RegionName: convertParam.RegionName,
                            BucketName: convertParam.BucketName,
                        }
                        await Webapi.startConverting({Key:name,DocumentType:type,Bucket:_bucket,TargetFolderKey:res.RetData.Path})
                        function setTime(specifiedKey){
                            Webapi.queryConvertPercentage(specifiedKey).then((cresult)=>{
                                if(cresult&&cresult.Success&&cresult.Data.CurrentStatus==5){
                                    var servername=Util.GUID()+""+attachment.name.substr(attachment.name.lastIndexOf("."));;
                                     Webapi.uploadNewFile(attachment.name,servername,res.RetData.FileID,cresult.Data.Result.Count,hash,fileSize).then((uploadRes)=>{
                                        if(uploadRes){
                                            send(uploadRes)
                                        }
                                     }).catch(function (error) {
                                        console.log(error);
                                      })
                                      
                                    // await this.sendLiveDocCard(uploadRes,context).catch( (error)=> {
                                    //     console.log(error);
                                    //   })
                                    // const reply = { type: ActivityTypes.Message };
                                    // if(uploadRes){
                                    //     console.log(44444)

                                    // }
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
                return 1 //上传文件已经存在
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
        const imageData = fs.readFileSync(path.join(__dirname, '../resources/architecture-resize.png'));
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