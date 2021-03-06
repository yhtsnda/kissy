﻿/*
Copyright 2012, KISSY UI Library v1.40dev
MIT Licensed
build time: Nov 28 02:46
*/
/**
 * @ignore
 * @fileOverview Input wrapper for ComboBox component.
 * @author yiminghe@gmail.com
 */
KISSY.add("combobox/base", function (S, cursor, Node, Component, ComboBoxRender,Menu, undefined) {
    var ComboBox,
        $ = Node.all,
        KeyCodes = Node.KeyCodes,
        ALIGN = {
            points: ["bl", "tl"],
            overflow: {
                adjustX: 1,
                adjustY: 1
            }
        },
        win = $(S.Env.host),
        SUFFIX = 'suffix';

    /**
     * KISSY ComboBox.
     * xclass: 'combobox'.
     * @extends KISSY.Component.Controller
     * @class KISSY.ComboBox
     */
    ComboBox = Component.Controller.extend({

            // user's input text
            _savedInputValue: null,

            _stopNotify: 0,

            /**
             * normalize returned data
             * @protected
             * @param data
             */
            normalizeData: function (data) {
                var self = this, contents, v, i, c;
                if (data && data.length) {
                    data = data.slice(0, self.get("maxItemCount"));
                    if (self.get("format")) {
                        contents = self.get("format").call(self, getValue(self), data);
                    } else {
                        contents = [];
                    }
                    for (i = 0; i < data.length; i++) {
                        v = data[i];
                        c = contents[i] = S.mix({
                            content: v,
                            textContent: v,
                            value: v
                        }, contents[i]);
                    }
                    return contents;
                }
                return contents;
            },

            bindUI: function () {
                var self = this,
                    input = self.get("input");

                input.on("valuechange", onValueChange, self);

                /**
                 * fired after combobox 's collapsed attribute is changed.
                 * @event afterCollapsedChange
                 * @param e
                 * @param e.newVal current value
                 * @param e.prevVal previous value
                 */

            },

            handleFocus: function () {
                var self = this, placeholderEl;
                setInvalid(self, false);
                if (placeholderEl = self.get("placeholderEl")) {
                    placeholderEl.hide();
                }
            },

            handleBlur: function () {
                var self = this;
                ComboBox.superclass.handleBlur.apply(self, arguments);
                delayHide.call(self);
                var placeholderEl,
                    input = self.get("input");
                self.validate(function (error, val) {
                    if (error) {
                        if (!self.get("focused") && val == input.val()) {
                            setInvalid(self, error);
                        }
                    } else {
                        setInvalid(self, false);
                    }
                });
                if ((placeholderEl = self.get("placeholderEl")) && !input.val()) {
                    placeholderEl.show();
                }
            },

            handleMouseDown: function (e) {
                ComboBox.superclass.handleMouseDown.apply(this, arguments);
                var self = this,
                    input,
                    target = e.target,
                    trigger = self.get("trigger"),
                    hasTrigger = self.get('hasTrigger');
                if (hasTrigger && (trigger[0] == target || trigger.contains(target))) {
                    input = self.get("input");
                    if (!self.get('collapsed')) {
                        self.set('collapsed', true);
                    } else {
                        input[0].focus();
                        self.sendRequest('');
                    }
                    e.preventDefault();
                }
            },

            handleKeyEventInternal: function (e) {
                var self = this,
                    input = self.get("input"),
                    menu = getMenu(self);

                if (!menu) {
                    return;
                }

                var updateInputOnDownUp = self.get("updateInputOnDownUp");

                if (updateInputOnDownUp) {
                    // combobox will change input value
                    // but it does not need to reload data
                    if (S.inArray(e.keyCode, [
                        KeyCodes.UP,
                        KeyCodes.DOWN,
                        KeyCodes.ESC
                    ])) {
                        self._stopNotify = 1;
                    } else {
                        self._stopNotify = 0;
                    }
                }

                var activeItem;

                if (menu.get("visible")) {
                    var handledByMenu = menu.handleKeydown(e);

                    if (updateInputOnDownUp) {
                        if (S.inArray(e.keyCode, [KeyCodes.DOWN, KeyCodes.UP])) {
                            // update menu's active value to input just for show
                            setValue(self, menu.get("activeItem").get("textContent"));
                        }
                    }
                    // esc
                    if (e.keyCode == KeyCodes.ESC) {
                        self.set("collapsed", true);
                        if (updateInputOnDownUp) {
                            // restore original user's input text
                            setValue(self, self._savedInputValue);
                        }
                        return true;
                    }

                    // tab
                    // if menu is open and an menuitem is highlighted, see as click/enter
                    if (e.keyCode == KeyCodes.TAB) {
                        if (activeItem = menu.get("activeItem")) {
                            activeItem.performActionInternal();
                            // only prevent focus change in multiple mode
                            if (self.get("multiple")) {
                                return true;
                            }
                        }
                    }
                    return handledByMenu;
                } else if ((e.keyCode == KeyCodes.DOWN || e.keyCode == KeyCodes.UP)) {
                    // re-fetch , consider multiple input
                    S.log("refetch : " + getValue(self));
                    self.sendRequest(getValue(self));
                    return true;
                }
            },

            syncUI: function () {
                if (this.get("placeholder")) {
                    var self = this,
                        input = self.get("input"),
                        inputValue = self.get("inputValue");

                    if (inputValue != undefined) {
                        input.val(inputValue);
                    }

                    if (!input.val()) {
                        self.get("placeholderEl").show();
                    }
                }
            },

            validate: function (callback) {
                var self = this,
                    validator = self.get('validator'),
                    val = self.get("input").val();

                if (validator) {
                    validator(val, function (error) {
                        callback(error, val);
                    });
                } else {
                    callback(false, val);
                }

            },

            bindMenu: function () {
                var self = this,
                    el,
                    contentEl,
                    menu = self.get("menu");

                menu.on("click", function (e) {
                    var item = e.target;
                    // stop valuechange event
                    self._stopNotify = 1;
                    selectItem(self, item);
                    self.set("collapsed", true);
                    setTimeout(
                        function () {
                            self._stopNotify = 0;
                        },
                        // valuechange interval
                        50
                    );
                });

                self.__repositionBuffer = S.buffer(reposition, 50);

                win.on("resize", self.__repositionBuffer, self);

                el = menu.get("el");
                contentEl = menu.get("contentEl");

                el.on("focusout", delayHide, self);
                el.on("focusin", clearDismissTimer, self);

                contentEl.on("mouseover", function () {
                    // trigger el focus
                    self.get("input")[0].focus();
                    // prevent menu from hiding
                    clearDismissTimer.call(self);
                });


                self.bindMenu = S.noop;
            },

            /**
             * fetch comboBox list by value and show comboBox list
             * @param {String} value value for fetching comboBox list
             */
            sendRequest: function (value) {
                var self = this,
                    dataSource = self.get("dataSource");
                dataSource.fetchData(value, renderData, self);
            },

            _onSetCollapsed: function (v) {
                if (v) {
                    hideMenu(this);
                } else {
                    showMenu(this);
                }
            },

            destructor: function () {
                var self = this;
                win.detach("resize", self.__repositionBuffer, this);
                self.__repositionBuffer.stop();
            }
        },
        {
            ATTRS: {

                /**
                 * Input element of current combobox.
                 * @type {KISSY.NodeList}
                 * @property input
                 */
                /**
                 * @ignore
                 */
                input: {
                    view: 1
                },

                /**
                 * trigger arrow element
                 * @ignore
                 */
                trigger: {
                    view: 1
                },

                /**
                 * placeholder
                 * @cfg {String} placeholder
                 */
                /**
                 * @ignore
                 */
                placeholder: {
                    view: 1
                },


                /**
                 * label for placeholder in ie
                 * @ignore
                 */
                placeholderEl: {
                    view: 1
                },

                /**
                 * custom validation function
                 * @type Function
                 * @property validator
                 */
                /**
                 * @ignore
                 */
                validator: {

                },

                /**
                 * invalid tag el
                 * @ignore
                 */
                invalidEl: {
                    view: 1
                },

                allowTextSelection: {
                    value: true
                },

                /**
                 * Whether show combobox trigger.
                 * Defaults to: true.
                 * @cfg {Boolean} hasTrigger
                 */
                /**
                 * @ignore
                 */
                hasTrigger: {
                    view: 1
                },

                /**
                 * ComboBox dropDown menuList or config
                 * @cfg {KISSY.Menu.PopupMenu|Object} menu
                 */
                /**
                 * ComboBox dropDown menuList or config
                 * @property menu
                 * @type {KISSY.Menu.PopupMenu}
                 */
                /**
                 * @ignore
                 */
                menu: {
                    value: {
                        xclass: 'popupmenu'
                    },
                    setter: function (m) {
                        if (m instanceof Component.Controller) {
                            m.setInternal("parent", this);
                        }
                    }
                },

                /**
                 * Whether combobox menu is hidden.
                 * @type {Boolean}
                 * @property collapsed
                 */
                /**
                 * @ignore
                 */
                collapsed: {
                    view: 1
                },

                /**
                 * dataSource for comboBox.
                 * @cfg {KISSY.ComboBox.LocalDataSource|KISSY.ComboBox.RemoteDataSource|Object} dataSource
                 */
                /**
                 * @ignore
                 */
                dataSource: {
                    // 和 input 关联起来，input可以有很多，每个数据源可以不一样，但是 menu 共享
                    setter: function (c) {
                        return Component.create(c);
                    }
                },

                /**
                 * maxItemCount max count of data to be shown
                 * @cfg {Number} maxItemCount
                 */
                /**
                 * @ignore
                 */
                maxItemCount: {
                    value: 99999
                },

                /**
                 * Whether drop down menu is same width with input.
                 * Defaults to: true.
                 * @cfg {Boolean} matchElWidth
                 */
                /**
                 * @ignore
                 */
                matchElWidth: {
                    value: true
                },

                /**
                 * Format function to return array of
                 * html/text/menu item attributes from array of data.
                 * @cfg {Function} format
                 */
                /**
                 * @ignore
                 */
                format: {
                },

                /**
                 * Whether allow multiple input,separated by separator
                 * Defaults to: false
                 * @cfg {Boolean} multiple
                 */
                /**
                 * @ignore
                 */
                multiple: {
                },

                /**
                 * Separator chars used to separator multiple inputs.
                 * Defaults to: ;,
                 * @cfg {String} separator
                 */
                /**
                 * @ignore
                 */
                separator: {
                    value: ",;"
                },

                /**
                 * Separator type.
                 * After value( 'suffix' ) or before value( 'prefix' ).
                 * Defaults to: 'suffix'
                 * @cfg {String} separatorType
                 */
                /**
                 * @ignore
                 */
                separatorType: {
                    value: SUFFIX
                },

                /**
                 * Whether whitespace is part of toke value.
                 * Default to: true
                 * @cfg {Boolean} whitespace
                 * @private
                 */
                /**
                 * @ignore
                 */
                whitespace: {
                    valueFn: function () {
                        return this.get("separatorType") == SUFFIX;
                    }
                },

                /**
                 * Whether update input's value at keydown or up when combobox menu shows.
                 * Default to: true
                 * @cfg {Boolean} updateInputOnDownUp
                 */
                /**
                 * @ignore
                 */
                updateInputOnDownUp: {
                    value: true
                },

                /**
                 * If separator wrapped by literal chars,separator become normal chars.
                 * Defaults to: "
                 * @cfg {String} literal
                 */
                /**
                 * @ignore
                 */
                literal: {
                    value: "\""
                },

                /**
                 * Whether align menu with individual token after separated by separator.
                 * Defaults to: false
                 * @cfg {Boolean} alignWithCursor
                 */
                /**
                 * @ignore
                 */
                alignWithCursor: {
                },

                /**
                 * Whether or not the first row should be highlighted by default.
                 * Defaults to: false
                 * @cfg {Boolean} autoHighlightFirst
                 */
                /**
                 * @ignore
                 */
                autoHighlightFirst: {
                },

                xrender: {
                    value: ComboBoxRender
                }
            }
        },
        {
            xclass: 'combobox',
            priority: 10
        }
    );


    // #----------------------- private start

    function selectItem(self, item) {
        if (item) {
            var textContent = item.get("textContent"),
                separatorType = self.get("separatorType");
            setValue(self, textContent + (separatorType == SUFFIX ? "" : " "));
            self._savedInputValue = textContent;
            /**
             * fired when user select from suggestion list (bubbled from menuItem)
             * @event click
             * @param e
             * @param e.target Selected menuItem
             */
        }
    }

    function setInvalid(self, error) {
        var el = self.get("el"),
            cls = self.get("prefixCls") + "combobox-invalid",
            invalidEl = self.get("invalidEl");
        if (error) {
            el.addClass(cls);
            invalidEl.attr("title", error);
            invalidEl.show();
        } else {
            el.removeClass(cls);
            invalidEl.hide();
        }
    }


    function getMenu(self, init) {
        var m = self.get("menu");
        if (m && m.xclass) {
            if (init) {
                m = Component.create(m, self);
                self.setInternal("menu", m);
            } else {
                return null;
            }
        }
        return m;
    }

    function hideMenu(self) {
        var menu = getMenu(self);
        if (menu) {
            menu.hide();
        }
    }

    function alignMenuImmediately(self) {
        var menu = self.get("menu"),
            align = S.clone(menu.get("align"));
        align.node = self.get("el");
        S.mix(align, ALIGN, false);
        menu.set("align", align);
    }

    function alignWithTokenImmediately(self) {
        var inputDesc = getInputDesc(self),
            tokens = inputDesc.tokens,
            menu = self.get("menu"),
            cursorPosition = inputDesc.cursorPosition,
            tokenIndex = inputDesc.tokenIndex,
            tokenCursorPosition,
            cursorOffset,
            input = self.get("input");
        tokenCursorPosition = tokens.slice(0, tokenIndex).join("").length;
        if (tokenCursorPosition > 0) {
            // behind separator
            ++tokenCursorPosition;
        }
        input.prop("selectionStart", tokenCursorPosition);
        input.prop("selectionEnd", tokenCursorPosition);
        cursorOffset = cursor(input);
        input.prop("selectionStart", cursorPosition);
        input.prop("selectionEnd", cursorPosition);
        menu.set("xy", [cursorOffset.left, cursorOffset.top]);
    }

    function reposition() {
        var self = this,
            menu = getMenu(self);
        if (menu && menu.get("visible")) {
            if (self.get("multiple") && self.get("alignWithCursor")) {
                alignWithTokenImmediately(self);
            } else {
                alignMenuImmediately(self);
            }
        }
    }

    function delayHide() {
        var self = this;
        self._focusoutDismissTimer = setTimeout(function () {
            self.set("collapsed", true);
        }, 30);
    }

    function clearDismissTimer() {
        var self = this, t;
        if (t = self._focusoutDismissTimer) {
            clearTimeout(t);
            self._focusoutDismissTimer = null;
        }
    }

    function showMenu(self) {
        var el = self.get("el"),
            menu = getMenu(self, 1);

        // 保证显示前已经 bind 好 menu 事件
        clearDismissTimer.call(self);

        if (menu && !menu.get("visible")) {
            // 先 render，监听 width 变化事件
            menu.render();
            self.bindMenu();
            // 根据 el 自动调整大小
            if (self.get("matchElWidth")) {
                menu.set("width", el.innerWidth());
            }
            menu.show();
            reposition.call(self);
            self.get("input").attr("aria-owns", menu.get("el")[0].id);
        }
    }

    function setValue(self, value) {
        var input = self.get("input");
        if (self.get("multiple")) {
            var inputDesc = getInputDesc(self),
                tokens = inputDesc.tokens,
                tokenIndex = Math.max(0, inputDesc.tokenIndex),
                separator = self.get("separator"),
                cursorPosition,
                separatorType = self.get("separatorType"),
                token = tokens[tokenIndex];

            if (token && separator.indexOf(token.charAt(0)) != -1) {
                tokens[tokenIndex] = token.charAt(0);
            } else {
                tokens[tokenIndex] = "";
            }

            tokens[tokenIndex] += value;

            var nextToken = tokens[tokenIndex + 1];

            // appendSeparatorOnComplete if next token does not start with separator
            if (separatorType == SUFFIX && (!nextToken || separator.indexOf(nextToken.charAt(0)) == -1 )) {
                tokens[tokenIndex] += separator.charAt(0);
            }

            cursorPosition = tokens.slice(0, tokenIndex + 1).join("").length;

            input.val(tokens.join(""));

            input.prop("selectionStart", cursorPosition);
            input.prop("selectionEnd", cursorPosition);
        } else {
            input.val(value);
        }
    }


    /**
     * Consider multiple mode , get token at current cursor position
     */
    function getValue(self) {
        var input = self.get("input"),
            inputVal = input.val();
        if (self.get("multiple")) {
            var inputDesc = getInputDesc(self);
            var tokens = inputDesc.tokens,
                tokenIndex = inputDesc.tokenIndex;
            var separator = self.get("separator");
            var separatorType = self.get("separatorType");
            var token = tokens[tokenIndex] || "";
            // only if token starts with separator , then token has meaning!
            // token can not be empty
            if (token && separator.indexOf(token.charAt(0)) != -1) {
                // remove separator
                return token.substring(1);
            }
            // cursor is at the beginning of textarea
            if (separatorType == SUFFIX && (tokenIndex == 0 || tokenIndex == -1)) {
                return token;
            }
            return undefined;
        } else {
            return inputVal;
        }
    }


    function onValueChange() {
        var self = this;
        if (self._stopNotify) {
            return;
        }
        var value = getValue(self);
        if (value === undefined) {
            self.set("collapsed", true);
            return;
        }
        self._savedInputValue = value;
        // S.log("value change: " + value);
        self.sendRequest(value);
    }

    function renderData(data) {
        var self = this,
            v,
            children = [],
            val,
            matchVal,
            i,
            menu = getMenu(self, 1);

        data = self.normalizeData(data);

        menu.removeChildren(true);

        if (data && data.length) {
            for (i = 0; i < data.length; i++) {
                v = data[i];
                children.push(menu.addChild(S.mix({
                    xclass: 'menuitem'
                }, v)));
            }

            // make menu item (which textContent is same as input) active
            val = getValue(self);
            for (i = 0; i < children.length; i++) {
                if (children[i].get("textContent") == val) {
                    menu.set("highlightedItem", children[i]);
                    matchVal = true;
                    break;
                }
            }
            // Whether or not the first row should be highlighted by default.
            if (!matchVal && self.get("autoHighlightFirst")) {
                for (i = 0; i < children.length; i++) {
                    if (!children[i].get("disabled")) {
                        menu.set("highlightedItem", children[i]);
                        break;
                    }
                }
            }
            self.set("collapsed", false);
        } else {
            self.set("collapsed", true);
        }
    }

    function getInputDesc(self) {
        var input = self.get("input"),
            inputVal = input.val(),
            tokens = [],
            cache = [],
            literal = self.get("literal"),
            separator = self.get("separator"),
            inLiteral = false,
            whitespace = self.get("whitespace"),
            cursorPosition = input.prop('selectionStart'),
            tokenIndex = -1;

        for (var i = 0; i < inputVal.length; i++) {
            var c = inputVal.charAt(i);
            if (i == cursorPosition) {
                // current token index
                tokenIndex = tokens.length;
            }
            if (!inLiteral) {
                // whitespace is not part of token value
                // then separate
                if (!whitespace && /\s|\xa0/.test(c)) {
                    tokens.push(cache.join(""));
                    cache = [];
                }

                if (separator.indexOf(c) != -1) {
                    tokens.push(cache.join(""));
                    cache = [];
                }
            }
            if (literal) {
                if (c == literal) {
                    inLiteral = !inLiteral;
                }
            }
            cache.push(c);
        }

        if (cache.length) {
            tokens.push(cache.join(""));
        }
        if (tokenIndex == -1) {
            tokenIndex = tokens.length - 1;
        }
        return {
            tokens: tokens,
            cursorPosition: cursorPosition,
            tokenIndex: tokenIndex
        };
    }

    // #------------------------private end

    return ComboBox;
}, {
    requires: [
        './cursor',
        'node',
        'component/base',
        './render',
        'menu'
    ]
});

/**
 * @ignore
 *
 * !TODO
 *  - menubutton combobox 抽象提取 picker (extjs)
 *
 *
 * 2012-05
 * auto-complete menu 对齐当前输入位置
 *  - http://kirblog.idetalk.com/2010/03/calculating-cursor-position-in-textarea.html
 *  - https://github.com/kir/js_cursor_position
 *
 * 2012-04-01 可能 issue :
 *  - 用户键盘上下键高亮一些选项，
 *    input 值为高亮项的 textContent,那么点击 body 失去焦点，
 *    到底要不要设置 selectedItem 为当前高亮项？
 *    additional note:
 *    1. tab 时肯定会把当前高亮项设置为 selectedItem
 *    2. 鼠标时不会把高亮项的 textContent 设到 input 上去
 *    1,2 都没问题，关键是键盘结合鼠标时怎么个处理？或者不考虑算了！
 **//**
 * @ignore
 * @fileOverview Export ComboBox.
 * @author yiminghe@gmail.com
 */
KISSY.add("combobox", function (S, ComboBox, FilterSelect, LocalDataSource, RemoteDataSource) {
    ComboBox.LocalDataSource = LocalDataSource;
    ComboBox.RemoteDataSource = RemoteDataSource;
    ComboBox.FilterSelect = FilterSelect;
    return ComboBox;
}, {
    requires: [
        'combobox/base',
        'combobox/filter-select',
        'combobox/LocalDataSource',
        'combobox/RemoteDataSource'
    ]
});/**
 * get cursor position of input
 * @author yiminghe@gmail.com
 */
KISSY.add('combobox/cursor', function (S, DOM) {

    var FAKE_DIV_HTML = "<div style='" +
            "z-index:-9999;" +
            "overflow:hidden;" +
            "position: fixed;" +
            "left:-9999px;" +
            "top:-9999px;" +
            "opacity:0;" +
            // firefox default normal,need to force to use pre-wrap
            "white-space:pre-wrap;" +
            "word-wrap:break-word;" +
            "'></div>",
        FAKE_DIV,
        MARKER = "<span>" +
            // must has content
            // or else <br/><span></span> can not get right coordinates
            "x" +
            "</span>",
        STYLES = [
            'paddingLeft',
            'paddingTop', 'paddingBottom',
            'paddingRight',
            'marginLeft',
            'marginTop',
            'marginBottom',
            'marginRight',
            'borderLeftStyle',
            'borderTopStyle',
            'borderBottomStyle',
            'borderRightStyle',
            'borderLeftWidth',
            'borderTopWidth',
            'borderBottomWidth',
            'borderRightWidth',
            'line-height',
            'outline',
            'height',
            'fontFamily',
            'fontSize',
            'fontWeight',
            'fontVariant',
            'fontStyle'
        ],
        supportInputScrollLeft,
        findSupportInputScrollLeft;

    function getFakeDiv(elem) {
        var fake = FAKE_DIV, body;
        if (!fake) {
            fake = DOM.create(FAKE_DIV_HTML);
        }
        if (elem.type == 'textarea') {
            DOM.css(fake, "width", DOM.css(elem, "width"));
        } else {
            // input does not wrap at all
            DOM.css(fake, "width", 9999);
        }
        S.each(STYLES, function (s) {
            DOM.css(fake, s, DOM.css(elem, s));
        });
        if (!FAKE_DIV) {
            body = elem.ownerDocument.body;
            body.insertBefore(fake, body.firstChild);
        }
        FAKE_DIV = fake;
        return fake;
    }

    findSupportInputScrollLeft = function () {
        var doc = document,
            input = DOM.create("<input>");
        DOM.css(input, {
            width: 1,
            position: "absolute",
            left: -9999,
            top: -9999
        });
        input.value = "123456789";
        doc.body.appendChild(input);
        input.focus();
        supportInputScrollLeft = !!(input.scrollLeft > 0);
        DOM.remove(input);
        findSupportInputScrollLeft = S.noop;
    };

    return function (elem) {
        var doc = elem.ownerDocument, offset,
            elemScrollTop = elem.scrollTop,
            elemScrollLeft = elem.scrollLeft;
        if (doc.selection) {
            var range = doc.selection.createRange();
            return {
                // http://msdn.microsoft.com/en-us/library/ie/ms533540(v=vs.85).aspx
                // or simple range.offsetLeft for textarea
                left: range.boundingLeft + elemScrollLeft + DOM.scrollLeft(),
                top: range.boundingTop + elemScrollTop + range.boundingHeight + DOM.scrollTop()
            };
        }

        findSupportInputScrollLeft();

        var elemOffset = DOM.offset(elem);

        // input does not has scrollLeft
        // so just get the position of the beginning of input
        if (!supportInputScrollLeft && elem.type != 'textarea') {
            elemOffset.top += elem.offsetHeight;
            return elemOffset;
        }

        var fake = getFakeDiv(elem);

        var selectionStart = elem.selectionStart;

        fake.innerHTML = S.escapeHTML(elem.value.substring(0, selectionStart - 1)) +
            // marker
            MARKER;

        // can not set fake to scrollTop，marker is always at bottom of marker
        // when cursor at the middle of textarea , error occurs
        // fake.scrollTop = elemScrollTop;
        // fake.scrollLeft = elemScrollLeft;
        offset = elemOffset;

        // offset.left += 500;
        DOM.offset(fake, offset);
        var marker = fake.lastChild;
        offset = DOM.offset(marker);
        offset.top += DOM.height(marker);
        // at the start of textarea , just fetch marker's left
        if (selectionStart > 0) {
            offset.left += DOM.width(marker);
        }

        // so minus scrollTop/Left
        offset.top -= elemScrollTop;
        offset.left -= elemScrollLeft;

        // offset.left -= 500;
        return offset;
    };
}, {
    requires: ['dom']
});/**
 * @ignore
 * @fileOverview filter select from combobox
 * @author yiminghe@gmail.com
 */
KISSY.add("combobox/filter-select", function (S, Combobox) {

    function valInAutoCompleteList(inputVal, _saveData) {
        var valid = false;
        if (_saveData) {
            for (var i = 0; i < _saveData.length; i++) {
                if (_saveData[i].textContent == inputVal) {
                    return _saveData[i];
                }
            }
        }
        return valid;
    }

    /**
     * validate combobox input by dataSource
     * @class KISSY.ComboBox.FilterSelect
     * @extends KISSY.ComboBox
     */
    var FilterSelect = Combobox.extend({
        validate: function (callback) {
            var self = this;
            FilterSelect.superclass.validate.call(self, function (error, val) {
                if (!error) {
                    self.get("dataSource").fetchData(val, function (data) {
                        var d = valInAutoCompleteList(val, self.normalizeData(data));
                        callback(d ? "" : self.get("invalidMessage"), val, d);
                    });
                } else {
                    callback(error, val);
                }
            });
        }
    }, {
        ATTRS: {
            /**
             * when does not match show invalidMessage
             * @cfg {String} invalidMessage
             */
            /**
             * @ignore
             */
            invalidMessage: {
                value: 'invalid input'
            }
        }
    });

    return FilterSelect;

}, {
    requires: ['./base']
});/**
 * @ignore
 * @fileOverview Local dataSource for ComboBox
 * @author yiminghe@gmail.com
 */
KISSY.add("combobox/LocalDataSource", function (S, Component) {

    /**
     * Local dataSource for comboBox.
     * xclass: 'combobox-LocalDataSource'.
     * @extends KISSY.Base
     * @class KISSY.ComboBox.LocalDataSource
     */
    function LocalDataSource() {
        LocalDataSource.superclass.constructor.apply(this, arguments);
    }

    function parser(inputVal, data) {
        var ret = [],
            count = 0;
        if (!inputVal) {
            return data;
        }
        S.each(data, function (d) {
            if (d.indexOf(inputVal) != -1) {
                ret.push(d);
            }
            count++;
        });

        return ret;
    }

    LocalDataSource.ATTRS = {
        /**
         * array of static data for comboBox
         * @cfg {Object[]} data
         */
        /**
         * @ignore
         */
        data:{
            value:[]
        },
        /**
         * parse data function.
         * Defaults to: index of match.
         * @cfg {Function} parse
         */
        parse:{
            value:parser
        }
    };

    S.extend(LocalDataSource, S.Base,{
        /**
         * Data source interface. How to get data for comboBox.
         * @param {String} inputVal current active input's value
         * @param {Function} callback callback to notify comboBox when data is ready
         * @param {Object} context callback 's execution context
         */
        fetchData:function (inputVal, callback, context) {
            var parse = this.get("parse"),
                data = this.get("data");
            data = parse(inputVal, data);
            callback.call(context, data);
        }
    });

    Component.Manager.setConstructorByXClass("combobox-LocalDataSource", LocalDataSource);

    return LocalDataSource;
}, {
    requires:['component/base']
});/**
 * @ignore
 * @fileOverview Remote datasource for ComboBox
 * @author yiminghe@gmail.com
 */
KISSY.add("combobox/RemoteDataSource", function (S, IO, Component) {

    /**
     * dataSource which wrap {@link KISSY.IO} utility.
     * xclass: 'combobox-RemoteDataSource'.
     * @class KISSY.ComboBox.RemoteDataSource
     * @extends KISSY.Base
     */
    function RemoteDataSource() {
        var self = this;
        RemoteDataSource.superclass.constructor.apply(self, arguments);
        self.io = null;
        self.caches = {};
    }

    RemoteDataSource.ATTRS = {
        /**
         * Used as parameter name to send combobox input's value to server.
         * Defaults to: 'q'
         * @cfg  {String} paramName
         */
        /**
         * @ignore
         */
        paramName: {
            value: 'q'
        },
        /**
         * whether send empty to server when input val is empty.
         * Defaults to: false
         * @cfg {Boolean} allowEmpty
         */
        /**
         * @ignore
         */
        allowEmpty: {},
        /**
         * Whether server response data is cached.
         * Defaults to: false
         * @cfg {Boolean} cache
         */
        /**
         * @ignore
         */
        cache: {},
        /**
         * Serve as a parse function to parse server
         * response to return a valid array of data for comboBox.
         * @cfg {Function} parse
         */
        /**
         * @ignore
         */
        parse: {},
        /**
         * IO configuration.same as {@link KISSY.IO}
         * @cfg {Object} xhrCfg
         */
        /**
         * @ignore
         */
        xhrCfg: {
            value: {}
        }
    };

    S.extend(RemoteDataSource, S.Base, {
        /**
         * Data source interface. How to get data for comboBox
         * @param {String} inputVal current active input's value
         * @param {Function} callback callback to notify comboBox when data is ready
         * @param {Object} context callback 's execution context
         */
        fetchData: function (inputVal, callback, context) {
            var self = this,
                v,
                paramName = self.get("paramName"),
                parse = self.get("parse"),
                cache = self.get("cache"),
                allowEmpty = self.get("allowEmpty");
            if (self.io) {
                // abort previous request
                self.io.abort();
                self.io = null;
            }
            if (!inputVal && allowEmpty !== true) {
                return callback.call(context, []);
            }
            if (cache) {
                if (v = self.caches[inputVal]) {
                    return callback.call(context, v);
                }
            }
            var xhrCfg = self.get("xhrCfg");
            xhrCfg.data = xhrCfg.data || {};
            xhrCfg.data[paramName] = inputVal;
            xhrCfg.success = function (data) {
                if (parse) {
                    data = parse(inputVal, data);
                }
                self.setInternal("data", data);
                if (cache) {
                    self.caches[inputVal] = data;
                }
                callback.call(context, data);
            };
            self.io = IO(xhrCfg);
        }
    });

    Component.Manager.setConstructorByXClass("combobox-RemoteDataSource", RemoteDataSource);

    return RemoteDataSource;
}, {
    requires: ['ajax', 'component/base']
});/**
 * @ignore
 * @fileOverview Render aria properties to input element.
 * @author yiminghe@gmail.com
 */
KISSY.add("combobox/render", function (S, Component) {

    var $ = S.all,
        tpl = '<div class="{prefixCls}combobox-input-wrap">' +
            '</div>',
        triggerTpl = '<div class="{prefixCls}combobox-trigger">' +
            '<div class="{prefixCls}combobox-trigger-inner">&#x25BC;</div>' +
            '</div>',
        inputTpl = '<input ' +
            'aria-haspopup="true" ' +
            'aria-autocomplete="list" ' +
            'aria-haspopup="true" ' +
            'role="autocomplete" ' +
            'autocomplete="off" ' +
            'class="{prefixCls}combobox-input" />';

    var ComboboxRender = Component.Render.extend({

        createDom: function () {
            var self = this,
                wrap,
                input = self.get("input"),
                inputId,
                prefixCls=self.get('prefixCls'),
                el = self.get("el"),
                trigger = self.get("trigger");

            if (!self.get("srcNode")) {
                el.append(S.substitute(tpl,{
                    prefixCls:prefixCls
                }));
                wrap = el.one("."+prefixCls+"combobox-input-wrap");
                input = input || S.all(S.substitute(inputTpl,{
                    prefixCls:prefixCls
                }));
                wrap.append(input);
                self.setInternal("input", input);
            }

            if (!trigger) {
                self.setInternal("trigger", S.all(S.substitute(triggerTpl,{
                    prefixCls:prefixCls
                })));
            }

            self.get("trigger").unselectable();

            var invalidEl = $("<div " +
                "class='"+prefixCls+"combobox-invalid-el'>" +
                "<div class='"+prefixCls+"combobox-invalid-inner'></div>" +
                "</div>").insertBefore(input.parent());
            self.setInternal("invalidEl", invalidEl);

            var placeholder;

            if (placeholder = self.get("placeholder")) {
                if (!(inputId = input.attr("id"))) {
                    input.attr("id", inputId = S.guid("ks-combobox-input"));
                }
                self.setInternal('placeholderEl', $('<label for="' +
                    inputId + '" ' +
                    'class="'+prefixCls+'combobox-placeholder">' +
                    placeholder + '</label>').appendTo(el));
            }
        },

        getKeyEventTarget: function () {
            return this.get("input");
        },

        _onSetCollapsed: function (v) {
            this.get("input").attr("aria-expanded", v);
        },

        _onSetHasTrigger: function (t) {
            var trigger = this.get("trigger");
            if (t) {
                this.get("el").prepend(trigger);
            } else {
                trigger.remove();
            }
        },

        _onSetDisabled: function (v) {
            ComboboxRender.superclass._onSetDisabled.apply(this, arguments);
            this.get("input").attr("disabled", v);
        }

    }, {
        ATTRS: {
            collapsed: {
                value: true
            },

            hasTrigger: {
                value: true
            },

            input: {
            },

            trigger: {
            },

            placeholder: {
            },

            placeholderEl: {

            },

            invalidEl: {
            }
        },
        HTML_PARSER: {
            input: function (el) {
                return el.one("."+this.get('prefixCls')+"combobox-input");
            },
            trigger: function (el) {
                return el.one("."+this.get('prefixCls')+"combobox-trigger");
            }
        }
    });

    return ComboboxRender;
}, {
    requires: ['component/base']
});
