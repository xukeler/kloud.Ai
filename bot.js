// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, MessageFactory ,CardFactory,ActivityTypes,ActionTypes} = require('botbuilder');
const {Webapi}=require('./axios/axios')
class EchoBot extends ActivityHandler {
    constructor() {
        super();
        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {
            let res="";
            if(context.activity.channelId){
                res= await Webapi.getSkypeToken(encodeURIComponent(context.activity.from.id));
            }else{
                res= await Webapi.getTeamsToken(encodeURIComponent(context.activity.from.id));
            }
            if(res){
                const replyText = `Echo: ${ context.activity.text }`;
                await context.sendActivity(context.activity.from.id);
            }else{
                const reply = { type: ActivityTypes.Message };
                const card =  CardFactory.signinCard(
                    'Sign in Kloud',
                    'https://testkloudsync.peertime.cn/login?'+context.activity.channelId+'='+encodeURIComponent(context.activity.from.id),
                    "Your identity information has not been bound to Kloud, please log in to Kloud."
                    );
                reply.attachments = [card]; 
                await context.sendActivity(reply);
            }

            await next();
        });
        this.onMembersAdded(async (context, next) => {
            const reply = { type: ActivityTypes.Message };
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Welcome to kloud.ai, Please login!';
            await context.sendActivity(reply);
            const card =  CardFactory.signinCard(
                'Sign in Kloud',
                'https://testkloudsync.peertime.cn/login?'+context.activity.channelId+'='+context.activity.from.id,
            );
            reply.attachments = [card];
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity(welcomeText);
                    await context.sendActivity(reply);
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }
}

module.exports.EchoBot = EchoBot;
