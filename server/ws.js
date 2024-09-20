const os = require('os');
const WebSocket = require('ws');
const dayjs = require('dayjs');
const uuid = require('uuid');
const htmlDecode = require('js-htmlencode').htmlDecode;

function log(message) {
  console.log(`${dayjs().format('YYYY-MM-DD HH:mm:ss')} ${message}`);
}

// 获取当前内网IP
const ifaces = os.networkInterfaces();
let localIp = '';
Object.keys(ifaces).forEach(function (ifname) {
  ifaces[ifname].forEach(function (iface) {
    if ('IPv4' !== iface.family || iface.internal !== false) {
      return;
    }
    localIp = iface.address;

  });
});
log(`内网IP:${localIp}`);

function connectWithRetry(url, callback) {
  const ws = new WebSocket(url);
  ws.on('error', function error(err) {
    setTimeout(function () {
      connectWithRetry(url, callback);
    }, 2000);
  });
  ws.on('open', function open() {
    callback(ws);
  });
}

function getGroupIds() {
  const filter = require('./go-cqhttp/filter.json');
  const groups = filter['.or'][0]['group_id']['.in'];
  return groups;

}
let groupNames = [];
const groupIds = getGroupIds();
console.log('groupIds:', groupIds);

// 创建一个 WebSocket 服务器实例
const wss = new WebSocket.Server({ port: 4001 });

// 监听连接事件
wss.on('connection', function connection(ws) {
  log('A new client connected');
  const clientId = uuid.v4(); // Generate a unique ID
  // Send the clientId to the client if needed
  ws.send('clientId:' + clientId);

  ws.send('groups:' + JSON.stringify(groupNames));
  // 监听消息事件
  ws.on('message', function incoming(message) {
    if (message.toString() === 'latency') {
      ws.send('latency ack');

    }
    if (message.toString().startsWith('pay:')) {
      const payHTML = message.toString().substring(4);
      // payHTMLList.push(`${dayjs().format('YYYY-MM-DD HH:mm:ss')} ${payHTML}`);

    }
    if (message.toString().startsWith('trade:')) {
      const trade = message.toString().substring(6);
      // tradeList.push(`${dayjs().format('YYYY-MM-DD HH:mm:ss')} ${trade}`);

    }
    if (message.toString().startsWith('specs:')) {
      try {

        // const json = JSON.parse(message.toString().substring(6));
        // if (!json) { return; }
        // const {
        //   clientId,
        //   specs
        // } = json;
        // specsCache[clientId] = {
        //   time: new Date(),
        //   specs
        // };
      } catch (e) {

      }
    }
  });

  // 监听关闭事件
  ws.on('close', function close() {
    log('A client disconnected');
  });
});

setInterval(() => {
  wss.clients.forEach(function (client) {
    client.send('connects:' + wss.clients.size);
  });
}, 5000);

connectWithRetry('ws://127.0.0.1:8080/api', (cqSocketApi) => {

  let fetchGroupsTimer;
  cqSocketApi.on('open', function open() {
    log('api socket open');
    clearInterval(fetchGroupsTimer);
    fetchGroupTimer = setInterval(() => {
      fetchGroups();
    }, 60 * 1000);
    fetchGroups();
  });
  function fetchGroups() {
    groupNames = [];
    groupIds.forEach(groupId => {
      cqSocketApi.send(
        JSON.stringify({
          "action": "get_group_info",
          "params": {
            "group_id": groupId,
          },
          "echo": "get_group_info"
        })
      );
    })
  }

  cqSocketApi.on('message', function message(data) {
    console.log('API:', data.toString())
    const group = JSON.parse(data.toString());
    const groupName = group['data']['group_name'];
    const groupId = group['data']['group_id'];
    const memberCount = group['data']['member_count'];
    log(groupName);
    groupNames.push({ groupId, groupName, memberCount, isMe: false });
    if (groupIds.length === groupNames.length) {
      wss.clients.forEach(function (client) {
        client.send('groups:' + JSON.stringify(groupNames));
      })

    }
  });
});

connectWithRetry('ws://127.0.0.1:8080/event', (cqSocket) => {

  cqSocket.on('open', function open() {
    cqSocket.send('something');
  });

  const regexp = /https:\/\/item\.taobao\.com[^\s\u4e00-\u9fa5]+/i;
  const regexpM = /https:\/\/m\.tb\.cn[^\s\u4e00-\u9fa5]+/i;

  cqSocket.on('message', function message(data) {
    log('received: ' + data.toString());
    try {
      data = JSON.parse(data);
      if (data && data.message_type === 'group') {
        const message = data.message;
        let matchRet = message.match(regexp) || message.match(regexpM);
        if (matchRet) {
          log('匹配' + matchRet[0]);
          wss.clients.forEach(function (client) {
            log('发送给客户端执行跳转');
            client.send(htmlDecode(matchRet[0]));
          });
        }
        wss.clients.forEach(function (client) {
          client.send('lastMessage:' + JSON.stringify(data));
        });
      }

      if (data && data.notice_type === 'group_ban') {
        wss.clients.forEach(function (client) {
          client.send('ban:' + JSON.stringify(data));
        });
      }
    } catch (err) {
      log('解析data失败' + err.message);
    }
  });
});