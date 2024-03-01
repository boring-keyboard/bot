
importScripts('utils.js');
importScripts('constants.js');

// tab页对应的规specRules
const specRulesTabMap = new Map();
const listenUrlMap = new Map();
const listenNewUrlMap = new Map();
/**
 * {
 *  label: '紫色',
 *  value: '["紫色"]',
 * }
 */
// const specCaches = [];
// let specCacheIdInc = 0;

const config = {
  // 是否自动点击立即购买按钮
  autoBuy: new GlobalVariable('autoBuy', new BooleanVariable(false)),
  // 是否自动点击提交订单按钮
  autoSubmit: new GlobalVariable('autoSubmit', new BooleanVariable(false)),
  // 规格关键字
  specRules: new GlobalVariable('specRules', new ObjectVariable(null)),
  specCaches: new GlobalVariable('specCaches', new ObjectVariable([])),
  // 黑名单规格关键字
  blackSpecRules: new GlobalVariable('blackSpecRules', new ObjectVariable(null)),
};

// socket实例
let webSocket = null;
// 链接状态
let connectStatus = 0;
// 消息监听器
let messageListeners = [];
// 最后一条QQ消息
let lastMessage = null;

let listenCnt = null;

/**
 * 发送给所有chrome窗口中激活的tab
 */
// function sendMessageToContentScript(message, callback) {
//   chrome.tabs.query({ active: true }, function (tabs) {
//     for (let i = 0; i < tabs.length; i++) {
//       chrome.tabs.sendMessage(tabs[i].id, message, function (response) {
//         if (chrome.runtime.lastError) {
//           // console.log(chrome.runtime.lastError);
//         } else {
//           // Do whatever you want, background script is ready now
//         }
//         if (callback) callback(response);
//       });
//     }
//   });
// }

function sendMessageToAllContentScriptOfActiveTab(message, callback) {
  chrome.tabs.query({ active: true }, function (tabs) {
    for (let i = 0; i < tabs.length; i++) {
      chrome.tabs.sendMessage(tabs[i].id, message, function (response) {
        if (chrome.runtime.lastError) {
          // console.log(chrome.runtime.lastError);
        } else {
          // Do whatever you want, background script is ready now
        }
        if (callback) callback(response, tabs.length);
      });
    }
  });
};

function addWebsocketMessageListener(listener) {
  messageListeners.push(listener);
}

function removeWebsocketMessageListener(listener) {
  const index = messageListeners.indexOf(listener);
  if (index > -1) {
    messageListeners.splice(index, 1);
  }
}

/**
 * 发送消息给popup
 */
function dispatchMessage(cmd, value) {
  chrome.runtime.sendMessage({
    cmd,
    value,
  }, (response) => {
    if (chrome.runtime.lastError) {
      // console.log(chrome.runtime.lastError);
    } else {
      // Do whatever you want, background script is ready now
    }
  });
}

setInterval(() => {
  let responseCnt = 0;
  let responseListenCnt = 0;
  sendMessageToAllContentScriptOfActiveTab({ cmd: 'checkListenStatus' }, function (isListen, len) {
    responseCnt++;
    if (isListen) {
      responseListenCnt++;
    }
    if (responseCnt === len) {
      listenCnt = responseListenCnt;
    }
  });
}, 1000);

setInterval(() => {
  if (connectStatus === 1) {
    chrome.action.setBadgeText({ text: listenCnt ? ('ON ' + listenCnt) : 'OFF' });
    if (!listenCnt) {
      chrome.action.setIcon({
        path: {
          "16": "images/icon16_gray.png",
          "32": "images/icon32_gray.png",
          "48": "images/icon48_gray.png",
          "64": "images/icon64_gray.png",
          "128": "images/icon128_gray.png"
        }
      });
    } else {
      chrome.action.setIcon({
        path: {
          "16": "images/icon16.png",
          "32": "images/icon32.png",
          "48": "images/icon48.png",
          "64": "images/icon64.png",
          "128": "images/icon128.png"
        }
      });
    }
    dispatchMessage('broadcastListenCnt', listenCnt);
  } else {
    chrome.action.setBadgeText({ text: '离线' });
    chrome.action.setIcon({
      path: {
        "16": "images/icon16_gray.png",
        "32": "images/icon32_gray.png",
        "48": "images/icon48_gray.png",
        "64": "images/icon64_gray.png",
        "128": "images/icon128_gray.png"
      }
    });
  }

}, 1000);

// 定时清理specRulesTabMap
setInterval(() => {
  chrome.windows.getAll({ populate: true }, function (windows) {
    const tabs = [];
    windows.forEach(function (window) {
      window.tabs.forEach(function (tab) {
        tabs.push(tab);
      });
    });
    // 清理specRulesTabMap
    const tabIds = tabs.map(tab => tab.id);
    for (let key of specRulesTabMap.keys()) {
      if (!tabIds.includes(key)) {
        specRulesTabMap.delete(key);
      }
    }
  });

}, 60 * 1000);

// 定时发送connectStatus
setInterval(() => {
  // 持续发送connectStatus
  dispatchMessage('connectStatus', connectStatus);
  dispatchMessage('ban', banGroupMap);
}, 1000);

// 定时上报specs
setInterval(() => {
  try {
    if (webSocket && webSocket.readyState === WebSocket.OPEN && clientId) {
      webSocket.send('specs:' + JSON.stringify({
        clientId,
        specs: config.specRules.data.serialize(),
      }));
    }
  } catch (e) {

  }
}, 60 * 1000);

class LatencyChecker {
  constructor() {
    this.latencyMS = -1;
    this.latencyTimer = null;
    this.startTime = null;
  }

  ackMessageHandler = (message) => {
    if (message === 'latency ack') {
      this.latencyMS = (Math.round((Date.now() - this.startTime) / 2));
      dispatchMessage('latency', this.latencyMS);
    }
  }

  start() {
    clearInterval(this.latencyTimer);
    addWebsocketMessageListener(this.ackMessageHandler);
    this.latencyTimer = setInterval(() => {
      this.startTime = Date.now();
      webSocket && webSocket.send('latency');
    }, 2000);
  }

  stop() {
    clearInterval(this.latencyTimer);
    removeWebsocketMessageListener(this.ackMessageHandler);
  }
}

const latencyChecker = new LatencyChecker();

function keepAlive() {
  const keepAliveIntervalId = setInterval(
    () => {
      if (webSocket) {
        // console.log(webSocket.readyState);
      }
      if (webSocket && webSocket.readyState === WebSocket.OPEN) {
        webSocket.send('keepalive');
      } else {
        clearInterval(keepAliveIntervalId);
      }
    },
    1 * 1000
  );
}
let clientId = null;
let groups = [];
const banGroupMap = {};

const messageRouter = {
  'http': (message) => {
    if (new URL(message).hostname === 'item.taobao.com' || new URL(message).hostname === 'm.tb.cn') {
      sendMessageToAllContentScriptOfActiveTab({ cmd: 'go', url: message });
    }
  },
  'newItemLink': (message) => {
    if (new URL(message.toString().substring(12)).hostname === 'item.taobao.com') {
      sendMessageToAllContentScriptOfActiveTab({ cmd: 'goNew', url:  message.toString().substring(12) });
    }
  },

  // '^https:\/\/((item\.taobao\.com)|(m\.tb\.cn))': (message) => {
  //   sendMessageToContentScript({ cmd: 'go', url: message });
  // },
  'connects': (message) => {
    dispatchMessage('connects', message.toString().match(/\d+/)[0] + '人');
  },
  'lastMessage': (message) => {
    const json = JSON.parse(message.toString().substring(12));
    lastMessage = json;
    dispatchMessage('lastMessage', json);

  },
  'ban': (message) => {
    const json = JSON.parse(message.toString().substring(4));
    console.log(json);
    if (json.sub_type === 'lift_ban') {
      banGroupMap[json.group_id] = false;
      return;
    } else if (json.sub_type === 'ban') {
      banGroupMap[json.group_id] = true;
    }
  },
  'clientId': (message) => {
    clientId = message.toString().substring(9);

  },
  'groups': (message) => {
    // dispatchMessage('groups', JSON.parse(message.toString().substring(7)));
    groups = JSON.parse(message.toString().substring(7));
  }
}

function listenMessageRouter() {
  addWebsocketMessageListener((message) => {
    Object.keys(messageRouter).forEach(key => {
      if (new RegExp(key).test(message.toString())) {
        messageRouter[key](message);
      }
    });
  });

}

// test
// setInterval(() => {
//   dispatchMessage('groups', ['Graystudio 官方6群', 'Graystudio 官方6群', 'Graystudio 官方6群', 'Graystudio 官方6群']);
// }, 1000);

function connect() {

  webSocket = new WebSocket(SERVER);

  webSocket.onopen = (event) => {
    console.log('websocket open');
    keepAlive();

    listenMessageRouter();
    latencyChecker.start();
    connectStatus = 1;
  };

  webSocket.onmessage = (event) => {
    messageListeners.forEach(listener => {
      listener(event.data);
    });
  };

  webSocket.onclose = (event) => {
    console.log('websocket connection closed');
    latencyChecker.stop();
    messageListeners = [];
    webSocket = null;

    connectStatus = 0;
    reconnect();
  };
}

function reconnect() {
  setTimeout(function () {
    console.log('重连');
    connect();
  }, 1000);
}

connect();

/***************** Event handlers **********************/

function handleSpecsChanged(specs, tab) {
  config.specRules.value = ObjectVariable.of(specs);
  config.specRules.save();
  specRulesTabMap.set(tab.id, ObjectVariable.of(specs));
  try {
    webSocket && webSocket.send(`specs:${specs}`);
  } catch (e) {

  }
}

function handleBlackSpecsChanged(blackspecs) {
  config.blackSpecRules.value = ObjectVariable.of(blackspecs);
  config.blackSpecRules.save();
  dispatchMessage('dirty');
}

function handleAutoClickBuyChanged(value) {
  config.autoBuy.value = BooleanVariable.of(value);
  config.autoBuy.save();
  dispatchMessage('dirty');
}

function handleAutoClickSubmitChanged(value) {
  config.autoSubmit.value = BooleanVariable.of(value);
  config.autoSubmit.save();
  dispatchMessage('dirty');
}

function handlePay(value) {
  if (webSocket && webSocket.readyState === WebSocket.OPEN) {
    webSocket.send('pay:' + value);
  }
}

function handleTrade(value) {
  if (webSocket && webSocket.readyState === WebSocket.OPEN) {
    webSocket.send('trade:' + value);
  }
}

function getContentTab(sender, callback) {
  chrome.windows.getAll({ populate: true }, function (windows) {
    windows.forEach(function (window) {
      window.tabs.forEach(function (tab) {
        if (tab.id === (sender.tab && sender.tab.id)) {
          callback(tab);
        }
      });
    });
  });
}

// test send 'go' message
// setInterval(function () {
//   sendMessageToContentScript({ cmd: 'go', url: 'https://baidu.com' })
//   // sendMessageToContentScript({ cmd: 'go', url: 'https://item.taobao.com/item.htm?spm=a230r.7195193.1997079397.5.1b1a2a88IjruMl&id=693494061553&abbucket=20' })
// }, 5 * 1000);

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.cmd === 'setAutoClickBuy') {
    handleAutoClickBuyChanged(request.value);
  }
  if (request.cmd === 'setAutoClickSubmit') {
    handleAutoClickSubmitChanged(request.value);
  }

  if (request.cmd === 'setSpecs') {
    handleSpecsChanged(request.value, request.tab);
  }
  if (request.cmd === 'setSpecsCache') {
    // 检查是否有value相同的，如果哟返回id

    const specCache = config.specCaches.value.find(item => item.value === request.value.value);
    if (specCache) {
      sendResponse(specCache.id);
      return;
    }
    // 获取最大id+1
    const nextId = config.specCaches.value.reduce((acc, cur) => {
      return Math.max(acc, cur.id);
    }, 0) + 1;
    config.specCaches.value.push({
      id: nextId,
      ...request.value
    });
    config.specCaches.save();
  }
  if (request.cmd === 'removeSpecsCache') {

    config.specCaches.value.splice(config.specCaches.value.findIndex(item => item.id === request.value), 1);
    config.specCaches.save();
  }
  if (request.cmd === 'setBlackSpecs') {
    handleBlackSpecsChanged(request.value);
  }

  if (request.cmd === 'pay') {
    handlePay(request.value);
  }

  if (request.cmd === 'trade') {
    handleTrade(request.value);
  }

  if (request.cmd === 'saveUrlListenStatus') {
    if (request.url) {
      listenUrlMap.set(request.url, request.listen);
    }
  }

  if (request.cmd === 'saveUrlListenNewStatus') {
    if (request.url) {
      listenNewUrlMap.set(request.url, request.listenNew);
    }
  }

  if (request.cmd === 'loadConfigs') {
    getContentTab(sender, (tab) => {
      Promise.all([
        config.specRules.load(new ObjectVariable(null)),
        config.blackSpecRules.load(new ObjectVariable(null)),
        config.autoBuy.load(new BooleanVariable(false)),
        config.autoSubmit.load(new BooleanVariable(false)),
      ]).then(() => {
        sendResponse({
          listen: listenUrlMap.get(request.url),
          listenNew: listenNewUrlMap.get(request.url),
          autoBuy: config.autoBuy.value,
          autoSubmit: config.autoSubmit.value,
          specRules: specRulesTabMap.get(tab.id) ? specRulesTabMap.get(tab.id).value : config.specRules.value,
          blackSpecRules: config.blackSpecRules.value,
        });
      });
    });
    return true;
  }

  if (request.cmd === 'getState') {
    if (request.tab && request.tab.id) {
      Promise.all([
        config.specCaches.load(new ObjectVariable([])),
        config.specRules.load(new ObjectVariable(null)),
        config.blackSpecRules.load(new ObjectVariable(null)),
        config.autoBuy.load(new BooleanVariable(false)),
        config.autoSubmit.load(new BooleanVariable(false)),
      ]).then(() => {
        sendResponse({
          // connectStatus,
          groups,
          lastMessage,
          specCaches: config.specCaches.value,
          autoBuy: config.autoBuy.data.serialize(),
          autoSubmit: config.autoSubmit.data.serialize(),
          specRules: specRulesTabMap.get(request.tab.id) ? specRulesTabMap.get(request.tab.id).serialize() : config.specRules.data.serialize(),
          blackSpecRules: config.blackSpecRules.data.serialize(),
        })
      });
      return true;
    }
  }
});
