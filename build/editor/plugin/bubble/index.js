﻿/*
Copyright 2012, KISSY UI Library v1.30dev
MIT Licensed
build time: Jun 28 21:51
*/
/**
 * bubble or tip view for kissy editor
 * @author yiminghe@gmail.com
 */
KISSY.add("editor/plugin/bubble/index", function (S, Overlay, Editor) {
    var Event = S.Event,
        undefined = {}['a'],
        DOM = S.DOM,
        BUBBLE_CFG = {
            zIndex:Editor.baseZIndex(Editor.zIndexManager.BUBBLE_VIEW),
            elCls:"ks-editor-bubble",
            prefixCls:"ks-editor-",
            effect:{
                effect:"fade",
                duration:0.3
            }
        };

    function inRange(t, b, r) {
        return t <= r && b >= r;
    }

    /**
     * 是否两个bubble上下重叠？
     */
    function overlap(b1, b2) {
        var b1_top = b1.get("y"),
            b1_bottom = b1_top + b1.get("el").outerHeight(),
            b2_top = b2.get("y"),
            b2_bottom = b2_top + b2.get("el").outerHeight();

        return inRange(b1_top, b1_bottom, b2_bottom) ||
            inRange(b1_top, b1_bottom, b2_top);
    }

    /**
     * 得到依附在同一个节点上的所有 bubble 中的最下面一个
     */
    function getTopPosition(self) {
        var archor = null,
            editor = self.get("editor"),
            myBubbles = editor.getControls();
        S.each(myBubbles, function (bubble) {
            if (bubble.get && (bubble.get("elCls") || "").indexOf("bubble") != -1 &&
                bubble !== self &&
                bubble.get("visible") &&
                overlap(self, bubble)) {
                if (!archor) {
                    archor = bubble;
                } else if (archor.get("y") < bubble.get("y")) {
                    archor = bubble;
                }
            }
            return archor;
        });
    }

    function getXy(bubble) {

        var el = bubble.get("editorSelectedEl");


        if (!el) {
            return undefined;
        }

        var editor = bubble.get("editor"),
            editorWin = editor.get("window")[0],
            iframeXY = editor.get("iframe").offset(),
            top = iframeXY.top,
            left = iframeXY.left,
            right = left + DOM.width(editorWin),
            bottom = top + DOM.height(editorWin),
            elXY = el.offset(undefined, window),
            elTop = elXY.top,
            elLeft = elXY.left,
            elRight = elLeft + el.width(),
            elBottom = elTop + el.height(),
            x,
            y;

        // 对其下边
        // el 位于编辑区域，下边界超了编辑区域下边界
        if (elBottom > bottom && elTop < bottom) {
            // 别挡着滚动条
            y = bottom - 30;
        }
        // el bottom 在编辑区域内
        else if (elBottom > top && elBottom < bottom) {
            y = elBottom;
        }

        // 同上，对齐左边
        if (elRight > left && elLeft < left) {
            x = left;
        } else if (elLeft > left && elLeft < right) {
            x = elLeft;
        }

        if (x !== undefined && y !== undefined) {
            return [x, y];
        }
        return undefined;
    }

    Editor.prototype.addBubble = function (id, filter, cfg) {
        var editor = this,
            bubble;

        cfg = cfg || {};

        cfg.editor = editor;

        S.mix(cfg, BUBBLE_CFG);

        bubble = new Overlay(cfg);

        editor.addControl(id + "/bubble", bubble);

        // 借鉴google doc tip提示显示
        editor.on("selectionChange", function (ev) {
            var elementPath = ev.path,
                elements = elementPath.elements,
                a,
                lastElement;
            if (elementPath && elements) {
                lastElement = elementPath.lastElement;
                if (!lastElement) {
                    return;
                }
                a = filter(lastElement);
                if (a) {
                    bubble.set("editorSelectedEl", a);
                    // 重新触发 bubble show 事件
                    bubble.hide();
                    // 等所有 bubble hide 再show
                    S.later(onShow, 10);
                } else {
                    onHide();
                }
            }
        });

        // 代码模式下就消失
        // !TODO 耦合---
        function onHide() {
            bubble.hide();
            var editorWin = editor.get("window")[0];
            Event.remove(editorWin, "scroll", onScroll);
        }

        editor.on("sourceMode", onHide);



        function showImmediately() {

            var xy = getXy(bubble);
            if (xy) {
                bubble.set("xy", xy);
                var archor = getTopPosition(bubble);
                if (archor) {
                    xy[1] = archor.get("y") + archor.get("el").outerHeight();
                    bubble.set("xy", xy);
                }
                if (!bubble.get("visible")) {
                    bubble.show();
                } else {
                    S.log("already show by selectionChange");
                }
            }
        }

        var bufferScroll = S.buffer(showImmediately, 350);

        function onScroll() {
            if (!bubble.get("editorSelectedEl")) {
                return;
            }
            var el = bubble.get("el");
            bubble.hide();
            bufferScroll();
        }

        function onShow() {
            var editorWin = editor.get("window")[0];
            Event.on(editorWin, "scroll", onScroll);
            showImmediately();
        }
    };
}, {
    requires:['overlay', 'editor']
});