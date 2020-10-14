// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, MessageFactory ,CardFactory,ActivityTypes} = require('botbuilder');

class EchoBot extends ActivityHandler {
    constructor() {
        super();
        // See https://aka.ms/about-bot-activity-message to learn more about the message and other activity types.
        this.onMessage(async (context, next) => {
            const replyText = `Echo: ${ context.activity.text }`;
            await context.sendActivity(context.activity.channelId);
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
        this.onMembersAdded(async (context, next) => {
            const reply = { type: ActivityTypes.Message };
            const membersAdded = context.activity.membersAdded;
            const welcomeText = 'Welcome to kloud Ai!';
            const card =  CardFactory.signinCard(
                'Sign in Kloud',
                'https://kloud.cn?'+context.activity.channelId+'='+context.activity.from.id,
            );
            reply.attachments = [card];
            for (let cnt = 0; cnt < membersAdded.length; ++cnt) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    await context.sendActivity(context.activity.channelId);
                    await context.sendActivity(reply);
                }
            }
            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });
    }
}

module.exports.EchoBot = EchoBot;
