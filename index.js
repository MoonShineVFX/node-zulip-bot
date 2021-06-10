const express = require('express');
const zulipInit = require('zulip-js');
const path = require('path');
const zuliprc = path.resolve(__dirname, 'zuliprc');

// env
const app = express();
const PORT = process.env.PORT || 21609;

let mesgs;

// 執行遞迴監聽
(async () => {

    async function init () {

        console.log(`============ init-${Date.now()} ============`);

        try {

            const client = await zulipInit({ zuliprc });

            // 先註冊
            const register = await client.queues.register({ fetch_event_types: ['message'] });
            const { queue_id, last_event_id } = register;

            // 取得監聽事件
            const getEvents = await client.events.retrieve({
                queue_id,
                last_event_id,
            });

            const [ events ] = getEvents.events;

            // console.log('events:', events)

            // 私訊
            if (events.message_type === 'private') {

                const receive = await client.messages.retrieve({
                    anchor: 'newest',
                    num_before: 1,
                    num_after: 0,
                    narrow: [
                        { operator: 'sender', operand: events.sender.user_id },
                    ],
                });

                const regex = /(<([^>]+)>)/ig;
                let [ _mesg ] = receive.messages;
                mesgs = {
                    ..._mesg,
                    content: _mesg.content.replace(regex, ''),
                };

            }
            else mesgs = events.message;

            // 機器人發送訊息
            await replyMesg(client, mesgs);
            return init();

        }
        catch (error) {

            console.log('error:', error);
            return init();

        }

    }

    init();

})();

let zulip;

// init
app.use(async (req, res, next) => {

    zulip = await zulipInit({ zuliprc });
    next();

});

// 所有使用者
const getUsers = async () => await zulip.users.retrieve();

// 所有頻道
const getStreams = async () => await zulip.streams.retrieve();

// 送訊息
const replyMesg = async (zulip, mesgs) => {

    console.log('mesgs:', mesgs)

    const to = (mesgs.type === 'private') ? mesgs.sender_id : mesgs.stream_id;
    const params = {
        to: [to],
        type: mesgs.type,
        content: mesgs.content,
    };

    // stream 要多送 topic
    if (mesgs.type === 'stream') params.topic = mesgs.subject;

    return await zulip.messages.send(params);

};

app.get('/', async (req, res) => {

    const members = await getUsers();
    const streams = await getStreams();
    // const reply = await replyMesg();

    res.json({
        // streams,
        members,
    });

});

//
// app.listen(PORT, () => console.log(`Server is running on port ${PORT}.`));
app.listen(PORT);
