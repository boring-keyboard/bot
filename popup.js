/**
 * @file popup.js
 */

function sendMessageToBackground(message, callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.runtime.sendMessage({ ...message, tab: tabs[0] }, function (response) {
            if (chrome.runtime.lastError) {
                // console.log(chrome.runtime.lastError);
            } else {
                // Do whatever you want, background script is ready now
            }
            if (callback) callback(response);
        });
    });
    // chrome.runtime.sendMessage(message, function (response) {
    //     if (callback) callback(response);
    // });
}

function sendMessageToContentScript(message, callback) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, message, function (response) {
            if (chrome.runtime.lastError) {
                // console.log(chrome.runtime.lastError);
            } else {
                // Do whatever you want, background script is ready now
            }
            if (callback) callback(response);
        });
    });
}

function decodeHtml(html) {
    var txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
}

function escapeHTML(htmlString) {
    var tempElement = document.createElement('div');
    tempElement.textContent = htmlString;
    return tempElement.innerHTML;
}


function updateContentScriptState() {
    sendMessageToContentScript({ cmd: 'getState' }, function (response) {
        if (!response) {
            return;
        }
        const {
            listen,
            listenNew,
        } = response;

        console.log(listenNew);

        if (listenNew) {
            document.getElementById('listenNew').setAttribute('checked', 'checked');
            document.getElementById('listenNewBtn').classList.add('bg-[#ffc900]');
            document.getElementById('listenNewBtn').classList.remove('bg-gray-300');
            document.getElementById('listenNewBtn').classList.remove('hover:bg-[#cccccc]');

        } else {
            document.getElementById('listenNew').removeAttribute('checked');
            document.getElementById('listenNewBtn').classList.remove('bg-[#ffc900]');
            document.getElementById('listenNewBtn').classList.add('bg-gray-300');
            document.getElementById('listenNewBtn').classList.add('hover:bg-[#cccccc]');
        }


        const openId = listen ? 'listen' : 'silent';
        const closeId = listen ? 'silent' : 'listen';

        function open(id) {
            document.getElementById(id).setAttribute('disabled', 'disabled');
            // 激活背景
            document.getElementById(id).classList.remove('bg-slate-900/10');
            document.getElementById(id).classList.add('bg-black');
            // 激活字体
            document.getElementById(id).classList.remove('text-black');
            document.getElementById(id).classList.add('text-white');
        }

        function close(id) {
            document.getElementById(id).removeAttribute('disabled');
            // 关闭背景
            document.getElementById(id).classList.remove('bg-black');
            document.getElementById(id).classList.add('bg-slate-900/10');
            // 关闭字体
            document.getElementById(id).classList.remove('text-white');
            document.getElementById(id).classList.add('text-black');
        }
        open(openId);
        close(closeId);

        if (listen) {
            document.getElementById('lastMessage').classList.remove('opacity-40');
            document.getElementById('groups').classList.remove('opacity-40');
        } else {
            document.getElementById('lastMessage').classList.add('opacity-40');
            document.getElementById('groups').classList.add('opacity-40');
        }


  
    });
}

function updateBackgroundState() {
    sendMessageToBackground({ cmd: 'getState' }, function (response) {
        if (!response) {
            return;
        }

        const {
            // connectStatus,
            specCaches,
            groups,
            lastMessage,
            specRules,
            blackSpecRules,
            autoBuy,
            autoSubmit,
        } = response;

        document.getElementById('specs').value = specRules === 'null' ? '' : specRules;
        document.getElementById('blackspecs').value = blackSpecRules === 'null' ? '' : blackSpecRules;

        // 用于初次缓存spec到该tab页
        sendMessageToBackground({ cmd: 'setSpecs', value: specRules }, function (response) {
        });

        updateGroups(groups);
        if (lastMessage) {
            updateLastMessage(lastMessage);
        }

        isHttpsPage(function (flag) {
            flag && updateSpecCaches(specCaches);
        });
        if (autoBuy === 'true') {
            document.getElementById('autoBuy').setAttribute('checked', 'checked');
            document.getElementById('autoBuyBtnCircle').classList.add('translate-x-4');
            document.getElementById('autoBuyBtnOuterCircle').classList.add('bg-[#ffc900]');
            document.getElementById('autoBuyBtnOuterCircle').classList.remove('bg-gray-300');

        } else {
            document.getElementById('autoBuy').removeAttribute('checked');
            document.getElementById('autoBuyBtnCircle').classList.remove('translate-x-4');
            document.getElementById('autoBuyBtnOuterCircle').classList.remove('bg-[#ffc900]');
            document.getElementById('autoBuyBtnOuterCircle').classList.add('bg-gray-300');
        }

        if (autoSubmit === 'true') {
            document.getElementById('autoSubmit').setAttribute('checked', 'checked');
            document.getElementById('autoSubmitBtnCircle').classList.add('translate-x-4');
            document.getElementById('autoSubmitBtnOuterCircle').classList.add('bg-[#ffc900]');
            document.getElementById('autoSubmitBtnOuterCircle').classList.remove('bg-gray-300');

        } else {
            document.getElementById('autoSubmit').removeAttribute('checked');
            document.getElementById('autoSubmitBtnCircle').classList.remove('translate-x-4');
            document.getElementById('autoSubmitBtnOuterCircle').classList.remove('bg-[#ffc900]');
            document.getElementById('autoSubmitBtnOuterCircle').classList.add('bg-gray-300');
        }


        if (!document.getElementById('autoBuyBtnCircle').classList.contains('transition')) {
            setTimeout(() => {
                document.getElementById('autoBuyBtnCircle').classList.add('transition');
                document.getElementById('autoBuyBtnOuterCircle').classList.add('transition');
                document.getElementById('autoBuyBtnCircle').classList.add('duration-200');
                document.getElementById('autoBuyBtnOuterCircle').classList.add('duration-200');
            }, 300);

        }

        if (!document.getElementById('autoSubmitBtnCircle').classList.contains('transition')) {
            setTimeout(() => {
                document.getElementById('autoSubmitBtnCircle').classList.add('transition');
                document.getElementById('autoSubmitBtnOuterCircle').classList.add('transition');
                document.getElementById('autoSubmitBtnCircle').classList.add('duration-200');
                document.getElementById('autoSubmitBtnOuterCircle').classList.add('duration-200');
            }, 300);
        }

    });
}

function update() {
    updateContentScriptState();
    updateBackgroundState();
}

function updateLatency(latencyMS) {
    document.getElementById('latency').innerHTML = Math.max(0, Math.min(999, latencyMS)) + 'ms';
}

function updateConnects(connects) {
    document.getElementById('connects').innerHTML = connects;
}

function updateGroups(groups) {
    const innerHTML = groups.sort(function (a, b) {
        return a.groupName > b.groupName ? 1 : -1;
    }).map((group) => {
        const groupName = escapeHTML(group.groupName);
        const memberCount = group.memberCount;
        // 只保留前3个字和后3个字，中间用...代替
        // const groupNameShort = groupName.length > 8 ? groupName.substring(0, 4) + '...' + groupName.substring(groupName.length - 4) : groupName;
        const groupNameShort = groupName;
        return `<span id="group-${group.groupId}" class="groups float-left mr-1 mb-1 line-clamp-1 bg-slate-900/10 px-1 rounded text-gray-500"><span style="color: red;" id="group-ban-${group.groupId}" class="hidden">禁言</span>${groupNameShort}(${memberCount})</span>`;
    }).join('');

    document.getElementById('groups').innerHTML = innerHTML;
}


function updateBan(banGroupMap) {
    Object.keys(banGroupMap).forEach((groupId) => {
        const groupBanDOM = document.getElementById(`group-ban-${groupId}`);
        if (groupBanDOM) {
            if (banGroupMap[groupId]) {
                groupBanDOM.classList.remove('hidden');
            } else {
                groupBanDOM.classList.add('hidden');
            }
        }
    });
}


function updateSpecCaches(specCaches) {
    document.getElementById('specCaches').classList.remove('hidden');

    const innerHTML = specCaches.map((specs) => {
        const label = escapeHTML(specs.label);
        return `<span id="spec-cache-${specs.id}" class="cursor-pointer	float-left mr-1 mb-1 line-clamp-1 bg-slate-900/10 px-1 rounded text-gray-500">${label}</span>`;
    }).join('');

    if (innerHTML) {
        // document.getElementById('specCaches').classList.remove('hidden');
    } else {
        // document.getElementById('specCaches').classList.add('hidden');
    }

    document.getElementById('specCaches').innerHTML = innerHTML ? innerHTML + '<span class="text-gray-400 break-keep">右键点击删除</span>' : '<div style="text-align:right;" class="text-gray-400">Ctrl + Enter 保存</div>';
    // 给每个specCache添加点击事件
    specCaches.forEach((specCache) => {
        document.getElementById(`spec-cache-${specCache.id}`).addEventListener('click', () => {
            sendMessageToBackground({ cmd: 'setSpecs', value: specCache.value }, function (response) {
                updateBackgroundState();
            });
        }, false);

        // 右键点击删除
        document.getElementById(`spec-cache-${specCache.id}`).addEventListener('contextmenu', (e) => {
            e.preventDefault();
            sendMessageToBackground({ cmd: 'removeSpecsCache', value: specCache.id }, function (response) {
                updateBackgroundState();
            });
        }, false);
    });
}

function updateConnectStatus(updateConnectStatus) {
    if (updateConnectStatus === 1) {
        document.getElementById('socket_status').innerHTML = '已连接';
        document.getElementById('connectStatusSvg').classList.remove('opacity-20');
        // document.getElementById('socket_status').style = 'color:green';
    } else {
        document.getElementById('socket_status').innerHTML = '未连接';
        document.getElementById('connectStatusSvg').classList.add('opacity-20');

        // document.getElementById('socket_status').style = 'color:red';
    }
}

function updateLastMessage(lastMessage) {
    const {
        sender: {
            nickname
        },
        time,
        message,
        group_id,
    } = lastMessage;


    // 解析message格式，如果是[CQ:image开头，则使用img显示
    // 否则使用text
    const isImage = message.startsWith('[CQ:image');
    const isRecord = message.startsWith('[CQ:record');
    const isVideo = message.startsWith('你的QQ暂不支持查看视频短片');
    if (isImage) {
        const url = message.match(/\[CQ:image,file=(.*?),url=(.*?)\]/)[2];
        document.getElementById('lastMessageContent').innerHTML = `<img src="${url}" class="max-w-24 max-h-20">`;
    } else if (isRecord) {
        document.getElementById('lastMessageContent').innerHTML = '<svg style="margin-left:-2px" t="1700334235969" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="6920" width="20" height="20"><path d="M938.666667 576v42.666667a21.333333 21.333333 0 0 1-21.333334 21.333333h-29.013333a85.333333 85.333333 0 0 1-85.333333-68.693333l-68.693334-350.72a9.386667 9.386667 0 0 0-17.493333 0l-112.213333 597.333333a95.573333 95.573333 0 0 1-186.453334 5.546667L309.76 390.826667a8.96 8.96 0 0 0-8.533333-6.826667h-8.106667a9.386667 9.386667 0 0 0-8.533333 5.973333l-63.573334 191.573334A85.333333 85.333333 0 0 1 139.946667 640H106.666667a21.333333 21.333333 0 0 1-21.333334-21.333333v-42.666667a21.333333 21.333333 0 0 1 21.333334-21.333333h33.28l64-191.573334A93.866667 93.866667 0 0 1 293.12 298.666667h8.106667A94.293333 94.293333 0 0 1 392.533333 369.92l108.373334 433.92a8.96 8.96 0 0 0 8.533333 6.826667c6.826667 0 10.24-2.986667 11.093333-7.253334l112.213334-597.333333a94.293333 94.293333 0 0 1 185.173333 0L888.32 554.666667h29.013333a21.333333 21.333333 0 0 1 21.333334 21.333333z" p-id="6921"></path></svg>';
    } else if (isVideo) {
        document.getElementById('lastMessageContent').innerHTML = '<svg style="margin-left:-2px" t="1700335253537" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2425" width="20" height="20"><path d="M896 305.066667a72.533333 72.533333 0 0 0-78.933333 12.8l-91.733334 85.333333V341.333333a128 128 0 0 0-128-128H213.333333a128 128 0 0 0-128 128v341.333334a128 128 0 0 0 128 128h384a128 128 0 0 0 128-128v-61.866667l92.16 85.333333a74.24 74.24 0 0 0 49.493334 19.2 71.68 71.68 0 0 0 29.44-6.4 68.266667 68.266667 0 0 0 42.666666-63.146666V368.213333A68.266667 68.266667 0 0 0 896 305.066667z" fill="#231F20" p-id="2426"></path></svg>';
    } else {
        document.getElementById('lastMessageContent').textContent = decodeHtml(message);
    }

    const groupDOMs = document.getElementsByClassName('groups');
    for (let i = 0; i < groupDOMs.length; i++) {
        groupDOMs[i].classList.remove('bg-[#ffc900]');
        groupDOMs[i].classList.add('bg-slate-900/10');
        groupDOMs[i].classList.add('text-gray-500');
        groupDOMs[i].classList.remove('text-black');
    }

    const groupDOM = document.getElementById(`group-${group_id}`);
    if (groupDOM) {
        groupDOM.classList.add('bg-[#ffc900]');
        groupDOM.classList.remove('bg-slate-900/10');
        groupDOM.classList.remove('text-gray-500');
        groupDOM.classList.add('text-black');
    }

    // document.getElementById('lastMessageContent').textContent = message;
    const date = new Date(time * 1000);
    // 时间格式化，补全0
    const pl = (num) => {
        return (100 + num).toString().substring(1);
    }
    const dateFormat = `${pl(date.getHours())}:${pl(date.getMinutes())}:${pl(date.getSeconds())}`;

    document.getElementById('nickname').textContent = `${dateFormat} ${nickname}`;
    document.getElementById('lastMessage').classList.remove('hidden');
}

// 获取当前tab的url并判断当前页面url是否是空白或者非https页面
function isHttpsPage(cb) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const url = tabs[0].url;
        if (!url || !url.startsWith('https')) {
            cb(false);
            // document.getElementById('blankOrNotHttps').classList.remove('hidden');
        } else {
            cb(true);
            // document.getElementById('blankOrNotHttps').classList.add('hidden');
        }
    });
}

isHttpsPage(function (flag) {
    console.log('flag', flag);
    if (flag) {
        run();
    } else {
        disable();
    }
});

function disable() {
    // document.documentElement.innerHTML = '当前页面不支持设置';
    // document.documentElement.style = 'height: 50px;width: 200px;line-height: 50px;text-align: center;background: white;color: #b8b8b8;';
    document.getElementById('disable-section').classList.remove('hidden');
    document.getElementById('redirect').addEventListener('click', () => {
        chrome.tabs.create({ url: 'https://www.taobao.com' });
    }, false);
    chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
        const cmd = req.cmd;
        if (cmd === 'latency') {
            updateLatency(req.value);
            sendResponse({ farewell: "ok" })
        }

        if (cmd === 'connects') {
            updateConnects(req.value);
            sendResponse({ farewell: "ok" })
        }

        if (cmd === 'lastMessage') {
            updateLastMessage(req.value);
            sendResponse({ farewell: "ok" })
        }

        if (cmd === 'ban') {
            updateBan(req.value);
            sendResponse({ farewell: "ok" })
        }

        if (cmd === 'connectStatus') {
            updateConnectStatus(req.value);
            sendResponse({ farewell: "ok" })
        }

    });
    updateBackgroundState();
}

function saveUrlListenStatus(listen) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const url = tabs[0].url;
        sendMessageToBackground({ cmd: 'saveUrlListenStatus', url, listen }, function (response) { });
    });
}

function saveUrlListenNewStatus(listenNew) {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const url = tabs[0].url;
        sendMessageToBackground({ cmd: 'saveUrlListenNewStatus', url, listenNew }, function (response) { });
    });
}

function run() {
    document.getElementById('listen-section').classList.remove('hidden');
    document.getElementById('kw-section').classList.remove('hidden');
    document.getElementById('blacklist-section').classList.remove('hidden');
    document.getElementById('auto-section').classList.remove('hidden');

    document.getElementById('listen').addEventListener('click', () => {
        sendMessageToContentScript({ cmd: 'listen' }, function (response) {
            updateContentScriptState();
        });
        saveUrlListenStatus(true);
    }, false);

    document.getElementById('listenNewBtn').addEventListener('click', () => {
        const current = document.getElementById('listenNew').checked;
        sendMessageToContentScript({ cmd: 'listenNew', value: !current }, function (response) {
            updateContentScriptState();
        });
        saveUrlListenNewStatus(!current);

        if (!current) {
            sendMessageToContentScript({ cmd: 'listen' }, function (response) {
                updateContentScriptState();
            });
            saveUrlListenStatus(true);
        }
    }, false);

    document.getElementById('silent').addEventListener('click', () => {
        sendMessageToContentScript({ cmd: 'silent' }, function (response) {
            updateContentScriptState();
        });
        saveUrlListenStatus(false);
        saveUrlListenNewStatus(false);
    }, false);

    document.getElementById('specs').addEventListener('input', (e) => {
        try {
            const value = e.target.value || null;
            console.log('value', value);
            JSON.parse(value);

            sendMessageToBackground({ cmd: 'setSpecs', value }, function (response) {
            });
        } catch (error) {
            console.log(error);
        }
    }, false);

    document.getElementById('specs').addEventListener('keydown', (e) => {
        try {
            // 检查是否同时按下了 Command（Mac）或 Ctrl（Windows）键
            var isCommandKey = e.metaKey || e.ctrlKey;
            // 如果按的是回车键
            if (isCommandKey && e.code === 'Enter') {
                const value = e.target.value || null;
                console.log('value', value);
                JSON.parse(value);
                if (JSON.parse(value) && JSON.parse(value)[0]) {
                    const values = JSON.parse(value).join(',');
                    sendMessageToBackground({
                        cmd: 'setSpecsCache',
                        value: {
                            // 如果大于8个字符，先后各截取4个，中间...代替
                            label: values.length > 8 ? values.substring(0, 4) + '...' + values.substring(values.length - 4) : values,
                            value,
                            // 后面的字符作为specs
                        }
                    }, function (response) {
                        console.log('response', response);
                        if (response === undefined) {
                            updateBackgroundState();
                        } else {
                            // response返回已存在相同内容的id，另其闪烁1秒钟
                            const id = response;
                            const dom = document.getElementById(`spec-cache-${id}`);
                            dom.classList.add('bg-[#ffc900]');
                            dom.classList.remove('bg-slate-900/10');
                            dom.classList.remove('text-gray-500');
                            dom.classList.add('text-black');
                            setTimeout(() => {
                                dom.classList.remove('bg-[#ffc900]');
                                dom.classList.add('bg-slate-900/10');
                                dom.classList.add('text-gray-500');
                                dom.classList.remove('text-black');
                            }, 500);
                        }
                    });
                }
            }
        } catch (error) {
            console.log(error);
        }
    }, false);

    document.getElementById('blackspecs').addEventListener('input', (e) => {
        try {
            const value = e.target.value || null;
            JSON.parse(value);
            sendMessageToBackground({ cmd: 'setBlackSpecs', value }, function (response) {
            });
        } catch (error) {

        }
    }, false);

    document.getElementById('autoBuyBtn').addEventListener('click', (e) => {
        const current = document.getElementById('autoBuy').checked;
        sendMessageToBackground({ cmd: 'setAutoClickBuy', value: !current ? 'true' : 'false' }, function (response) {
            update();
        });
    }, false);

    document.getElementById('autoSubmitBtn').addEventListener('click', (e) => {
        const current = document.getElementById('autoSubmit').checked;
        sendMessageToBackground({ cmd: 'setAutoClickSubmit', value: !current ? 'true' : 'false' }, function (response) {
            update();
        });
    }, false);

    setInterval(() => {
        updateContentScriptState();
    }, 1000);


    chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
        const cmd = req.cmd;
        if (cmd === 'dirty') {
            updateBackgroundState();
            sendResponse({ farewell: "ok" })
        }

        if (cmd === 'latency') {
            updateLatency(req.value);
            sendResponse({ farewell: "ok" })
        }

        if (cmd === 'connects') {
            updateConnects(req.value);
            sendResponse({ farewell: "ok" })
        }

        if (cmd === 'lastMessage') {
            updateLastMessage(req.value);
            sendResponse({ farewell: "ok" })
        }

        if (cmd === 'ban') {
            updateBan(req.value);
            sendResponse({ farewell: "ok" })
        }

        if (cmd === 'connectStatus') {
            updateConnectStatus(req.value);
            sendResponse({ farewell: "ok" })
        }
        if (cmd === 'broadcastListenCnt') {
            // document.getElementById('listenCnt').innerHTML = '[' + req.value + ']';
            sendResponse({ farewell: "ok" })
        }
    });

    console.log('popup open');
    update();
}