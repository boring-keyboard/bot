// @ts-check
/**
 * @file content.js
 * 注入到页面中的脚本，操作页面DOM完成自动加购逻辑
 */

// @ts-ignore
let appConfigs;

function nextTickReturn(fn) {
    const result = fn();
    // return Promise.resolve().then(() => result);
    // @ts-ignore
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve(result);
        }, 0);
    });
}

class KeyWord {
    constructor(kw) {
        this.kw = kw;
    }

    isMatch(labelText, optionText) {
        if (typeof this.kw === 'string') {
            const kwRegExp = new RegExp(this.kw, 'i');

            if (kwRegExp.test(optionText)) {
                return true;
            }
        } else {
            const labelRegExp = new RegExp(this.kw.label, 'i');
            const valueRegExp = new RegExp(this.kw.value, 'i');
            if (labelRegExp.test(labelText) && valueRegExp.test(optionText)) {
                return true;
            }
        }
        return false;
    }
}

class SpecOption {
    constructor(element) {
        this.element = element;
    }

    getText() {
        return $(this.element).find('.skuValueName').text();
    }

    click() {
        return nextTickReturn(() => {
            $(this.element).find('.skuValueName').get(0).click();
        });
    }

    isValid() {
        console.log(this.getText(), $(this.element).hasClass('disabled'));
        return !($(this.element).hasClass('disabled'));
    }
}

class Spec {

    /**
     * @type {Array<SpecOption>}
     */
    options = [];

    constructor(element) {
        this.element = element;
        this.options = $(this.element).find('.skuItem').toArray().map((optionElement) => new SpecOption(optionElement));;
    }

    async clear() {
        if (this._getSelected()) {
            return nextTickReturn(() => {
                this._getSelected().click();
            });
        }
    }

    isSelected() {
        return !!this._getSelected();
    }

    _getSelected() {
        return $(this.element).find('.skuItem.current').get(0);
    }

    getLabelText() {
        return $(this.element).find('.skuCateText').text();
    }

    /**
     * 获取可点击的Option
     * @returns {Array<SpecOption>}
     */
    getValidOptions() {
        return this.options.filter((item) => item.isValid());
    }

}

class ItemPage {

    static match() {
        return /item\.taobao\.com\/item\.htm/.test(document.URL);
    }

    /**
     * @type {Array<Spec>} specs
     */
    specs = [];

    run() {
        // 改成label,value的形式，因为有可能有多个地方需要选择颜色，这时候就需要label区分了
        // @ts-ignore
        return new Promise((resolve) => {
            // 如果探测到页面加载完成就执行回调函数里的逻辑
            // @ts-ignore
            this._onReady(async () => {
                await this._selectSpecs(this.specs);

                setTimeout(() => {
                    // 点击立即购买按钮
                    if (appConfigs.autoBuy) {
                        this._clickBuy();
                    }
                    resolve();
                }, 0);
            });
        })
    }

    _onReady(callback) {
        loop((stop) => {
            if (!this._isReady()) {
                return;
            }
            stop();
            // @ts-ignore
            this.specs = $(SKU_SELECTOR).toArray().map((item) => new Spec(item));

            this._clearAllSpecs();

            setTimeout(() => {
                callback();
            }, 0);
        });
    }

    async _selectSpecs(specs, allSelectedOptions = []) {
        console.log('需要选择的specs数量', specs.length)
        if (specs.length === 0) {
            return this.specs.length === allSelectedOptions.length
        }

        const [firstSpec, ...restSpecs] = specs;

        const excludedOptions = [];
        while (true) {
            const selectedOption = await this._selectOneSpec(firstSpec, excludedOptions, allSelectedOptions);

            console.log(selectedOption);
            // 没得可选了，返回false
            if (selectedOption === null) {
                return false;
            }

            if (await this._selectSpecs(restSpecs, [...allSelectedOptions, selectedOption])) {
                return true;
            } else {
                excludedOptions.push(selectedOption);
            }
        }
    }

    /**
     * 
     * @param {Spec} spec 当前规格
     * @param {Array<SpecOption>} excludedOptions
     * @param {Array<SpecOption>} allSelectedOptions 
     * @returns 
     */
    async _selectOneSpec(spec, excludedOptions, allSelectedOptions) {
        // 先清除所有已选项，重新选择
        await spec.clear();

        const specLabelText = spec.getLabelText();

        // 一个spec的可点击列表
        const validOptions = spec.getValidOptions()
            .filter((item) =>
                // @ts-ignore
                !excludedOptions.includes(item)
                && !this._inBlacklist(allSelectedOptions, item)
            );

        for (const kw of (appConfigs.specRules || [])) {
            const selected = await this._selectSpec(specLabelText, validOptions, new KeyWord(kw));
            if (selected) {
                return selected;
            }
        }
        // 随机选择
        if (validOptions.length > 0) {
            return this._selectOneSpecRandom(validOptions);
        }

        return null;
    }

    /**
     * 
     * @param {string} labelText spec的名称
     * @param {Array<SpecOption>} validSpecOptions spec选项
     * @param {KeyWord} kw 
     * @returns 
     */
    async _selectSpec(labelText, validSpecOptions, kw) {
        let target = null;
        for (let specOption of validSpecOptions) {
            if (kw.isMatch(labelText, specOption.getText())) {
                target = specOption;
            }
        }
        if (target) {
            await target.click();
        }
        return target;
    }

    /**
     * 
     * @param {Array<SpecOption>} validOptions 
     * @returns 
     */
    async _selectOneSpecRandom(validOptions) {
        const idx = Math.floor(Math.random() * validOptions.length);
        const specOption = validOptions[idx];
        await specOption.click();
        return specOption;
    }

    /**
     * 
     * @param {Function} callback 
     */
    _travelAllSpecs(callback) {
        this.specs.forEach((spec) => {
            callback(spec);
        });
    }

    _clearAllSpecs() {
        this._travelAllSpecs((spec) => {
            spec.clear();
        });
    }

    _isReadyToClickBuy() {
        // 所有的spec都已经选择了
        const ll = this.specs.every((spec) => {
            console.log(spec.getLabelText(), spec.isSelected());
            return spec.isSelected();
        });
        console.log('ll', ll);
        return ll;
    }

    _clickBuy(is_retry = false) {
        console.log('is_retry', is_retry);
        // @ts-ignore
        if ($('button[class*="Actions--leftBtn"]').get(0)) {
            setTimeout(() => {
                nextTickReturn(() => {
                    $('button[class*="Actions--leftBtn"]').get(0).click();
                }).then(() => {
                    // 如果弹出了错误提示，重试一次
                    if ($('div[role="alert"]').get(0) && !is_retry) {
                        this._clickBuy(true);
                    }
                });
            }, is_retry ? 500 : 0);
        }
    }

    _isReady() {
        return $('span[class^="Price--priceText"]').text().trim().length > 0;
    }

    /**
     * 
     * @param {Array<SpecOption>} selectedOptions 
     * @param {SpecOption} targetOption
     * @returns 
     */
    _inBlacklist(selectedOptions, targetOption) {
        let blacklist = (appConfigs.blackSpecRules || []);
        if (blacklist.length === 0) {
            return false;
        }
        const selectedSpecTextSet = selectedOptions.map(x => x.getText());
        selectedSpecTextSet.push(targetOption.getText());

        return blacklist.some(
            (oneRule) => oneRule.every(oneKeyword => selectedSpecTextSet.some(x => new RegExp(oneKeyword, 'i').test(x)))
        );
    }
}

class SubmitPage {

    static match() {
        return /buy\.taobao\.com/.test(document.URL);
    }

    run() {
        loop((stop) => {
            // 根据选择器定位提交订单按钮
            const btn = $('.go-btn');
            if (btn.get(0)) {
                // 如果找到的就停止探测
                stop();
                // 点击提交订单那妞
                // @ts-ignore
                btn.get(0).click();
            }
        });
    }
}

class PayPage {
    static match() {
        return /alipay\.com/.test(document.URL);
    }

    run() {
        loop((stop) => {
            const dom = $('#orderDetail').get(0);
            if (dom) {
                stop();
                // @ts-ignore
                chrome.runtime.sendMessage({
                    cmd: "pay",
                    value: dom.innerHTML
                    // @ts-ignore
                }, function (response) {

                });
            }
        });
    }

}

class TradePage {
    static match() {
        return /buyertrade\.taobao\.com/.test(document.URL);
    }

    run() {
        loop((stop) => {
            const dom = $('.trade-info .status').get(0);
            if (dom) {
                stop();
                // @ts-ignore
                chrome.runtime.sendMessage({
                    cmd: "trade",
                    // @ts-ignore
                    value: dom.textContent.trim()
                    // @ts-ignore
                }, function (response) {

                });
            }
        });
    }
}

function loop(callback) {
    const timer = setInterval(() => {
        callback(() => clearInterval(timer));
        // @ts-ignore
    }, LOOP_SPEED);
}

function loadAppConfigs(callback) {
    // @ts-ignore
    chrome.runtime.sendMessage({
        cmd: "loadConfigs",
        url: document.URL
    }, function (response) {
        console.log(response);
        listen = !!response.listen;
        listenNew = !!response.listenNew;
        appConfigs = response;
        callback();
    });
}

// 标记是否跳转页面
// @ts-ignore
let listen = false;
// @ts-ignore
let listenNew = false;

// @ts-ignore
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    try {
        if (request.cmd === 'go') {
            if (listen) {
                listen = false;
                listenNew = false;
                window.location.replace(request.url);
            }
        }

        if (request.cmd === 'goNew') {
            if (listenNew) {
                listen = false;
                listenNew = false;
                window.location.replace(request.url);
            }
        }

        if (request.cmd === 'listen') {
            listen = true;
        }

        if (request.cmd === 'listenNew') {
            listenNew = request.value;
        }

        if (request.cmd === 'silent') {
            listen = false;
            listenNew = false;
        }

        if (request.cmd === 'getState') {
            sendResponse({
                listen,
                listenNew,
            });
        }

        if (request.cmd === 'checkListenStatus') {
            sendResponse(listen);
        }

    } catch (e) {
        console.log(e);
    }
});

function main() {
    if (SubmitPage.match()) {
        if (appConfigs.autoSubmit) {
            new SubmitPage().run();
        }
    } else if (ItemPage.match()) {
        new ItemPage().run();
    } else if (PayPage.match()) {
        new PayPage().run();
    } else if (TradePage.match()) {
        new TradePage().run();
    }
}

loadAppConfigs(main);