
class StringVariable {
    constructor(value) {
        this.value = value;
    }
    static of(value) {
        const obj = new StringVariable();
        obj.deserialize(value);
        return obj;
    }
    serialize() {
        return this.value;
    }
    deserialize(v) {
        this.value = v;
    }
}

class BooleanVariable {
    constructor(value) {
        this.value = value;
    }
    static of(value) {
        const obj = new BooleanVariable();
        obj.deserialize(value);
        return obj;
    }
    serialize() {
        return JSON.stringify(this.value)
    }
    deserialize(v) {
        this.value = JSON.parse(v)
    }
}

class ObjectVariable {
    constructor(value) {
        this.value = value;
    }
    static of(value) {
        const obj = new ObjectVariable();
        obj.deserialize(value);
        return obj;
    }
    serialize() {
        return JSON.stringify(this.value)
    }
    deserialize(v) {
        this.value = JSON.parse(v)
    }
}

class LocalVariable {
    constructor(key, data) {
        this.key = key;
        this.data = data;
    }

    get value() {
        return this.data.value;
    }

    set value(v) {
        this.data = v;
    }

    save() {
        window.localStorage.setItem(this.key, this.data.serialize()); 
    }

    load(defaultData) {
        try {
            if (window.localStorage.getItem(this.key) === null) {
                this.data = defaultData;
            } else {
                this.data.deserialize(window.localStorage.getItem(this.key));
            }
        } catch(e) {
            this.data = defaultData
        }
        
    }
}

class GlobalVariable {
    constructor(key, data) {
        this.key = key;
        this.data = data;
    }

    get value() {
        return this.data.value;
    }

    set value(v) {
        this.data = v;
    }

    save() {
        chrome.storage.sync.set({ [this.key]: this.data.serialize() });
    }

    load(defaultData) {
        return new Promise((resolve) => {
            chrome.storage.sync.get([this.key], (result) => {
                if (result[this.key] === null || result[this.key] === undefined) {
                    this.data = defaultData;
                } else {
                    this.data.deserialize(result[this.key]);
                }
                resolve();
            });
        });
    }
}
