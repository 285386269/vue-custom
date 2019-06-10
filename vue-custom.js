class Vue {
    constructor(options = {}) {

        this.$el = document.querySelector(options.el);
        let data = this.data = options.data;
        // 这样做的目的，是为了可以通过this.的方式进行访问
        Object.keys(data).forEach((key) => {
            this.proxyData(key);
        });
        this.methods = options.methods;
        this.watcherTask = {};
        this.observer(data);
        this.compile(this.$el); //对根节点进行编译
    }

    proxyData(key) {
        let that = this;
        Object.defineProperty(that, key, {
            configurable: false,
            enumerable: true,
            get() {
                return that.data[key];
            },
            set(newVal) {
                that.data[key] = newVal;
            }
        });
    }
    //添加监听
    observer(data) {
        let that = this;
        Object.keys(data).forEach((key) => {
            let value = data[key];
            this.watcherTask[key] = [];
            Object.defineProperty(data, key, {
                configurable: false,
                enumerable: true,
                get() {
                    return value;
                },
                set(newVal) {
                    if(newVal !== value) {
											value = newVal; // 这句必不可少
											that.watcherTask[key].forEach(task => {
												task.update();
											})
                    }
                }
            })
        })
    }
    compile(el) { // dom -> data
        var nodes = el.childNodes;
        for(let i = 0, icount = nodes.length; i<icount; i++) {
            const node = nodes[i];
            if(node.nodeType === 3) { //文本节点
                let text = node.textContent.trim();
                if(!text) continue;
                this.compileText(node, 'textContent');
            } else if(node.nodeType === 1) {
                if(node.childNodes.length > 0) {
                    this.compile(node);
                }
                if(node.hasAttribute('v-model') && (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA')) {
                    node.addEventListener('input', (() => {
                        let attrVal = node.getAttribute('v-model');
                        this.watcherTask[attrVal].push(new Watcher(node, this, attrVal, 'value'));
                        node.removeAttribute('v-model');
                        return () => {
                            this.data[attrVal] = node.value;
                        }
                    })())
                }
                if(node.hasAttribute('v-html')) {
                    let attrVal = node.getAttribute('v-html');
                    this.watcherTask[attrVal].push(new Watcher(node, this, attrVal, 'innerHTML'));
                    node.removeAttribute('v-html');
                }
                this.compileText(node, 'innerHTML');
                if(node.hasAttribute('@click')) {
                    let attrVal = node.getAttribute('@click');
                    node.removeAttribute('@click');
                    node.addEventListener('click', e => {
                        this.methods[attrVal] && this.methods[attrVal].bind(this)();
                    })
                }
            }
        }
    }
    compileText(node, type) {
        let reg = /\{\{(.*)\}\}/, txt = node.textContent;
        if(reg.test(txt)) {
            node.textContent = txt.replace(reg, (matched, value) => {
								let tpl = this.watcherTask[value] || [];
								tpl.push(new Watcher(node, this, value, type));
								return value.split('.').reduce((val, key) => {
									return this.data[key];
								}, this.$el);
            })
        }
    }
}

class Watcher {
	constructor(el, vm, value, type) {
		this.el = el;
		this.vm = vm;
		this.value = value;
		this.type = type;
		this.update();
	}
	update() { // data -> dom
		this.el[this.type] = this.vm.data[this.value];
	}
}