const express = require('express');
const zulipInit = require('zulip-js');
const path = require('path');
const zuliprc = path.resolve(__dirname, 'zuliprc');

// env
const app = express();
const PORT = process.env.PORT || 21609;

let message;

// 執行遞迴監聽
(async () => {

    async function init () {

        console.log('====== init ======');

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
            const { sender: { user_id: operand } } = events;

            //
            const receive = await client.messages.retrieve({
                anchor: 'newest',
                num_before: 1,
                num_after: 0,
                narrow: [
                    { operator: 'sender', operand },
                ],
            });

            console.log('receive:', receive);
            message = [ ...receive.messages ];
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
const replyMesg = async () => {

    const user_id = 209; // myself
    const params = {
        to: [user_id],
        type: 'private',
        content: '下班',
    };

    return await zulip.messages.send(params);

};

app.get('/', async (req, res) => {

    const members = await getUsers();
    const streams = await getStreams();
    // const reply = await replyMesg();

    res.json({
        streams,
        members,
    });

});

//
// app.listen(PORT, () => console.log(`Server is running on port ${PORT}.`));
app.listen(PORT);
