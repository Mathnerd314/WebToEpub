"use strict";

parserFactory.register("activetranslations.xyz", () => new ActiveTranslationsParser());

class ActiveTranslationsParser extends Parser{
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("a.panel-title")]
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        let content = dom.querySelector("div.entry-content");
        if (content === null) {
            content = dom.querySelector("div.entry-content-container");
        }
        if (content === null) {
            content = dom.querySelector("div.nv-content-wrap");
        }
        if (content !== null) {
            util.removeChildElementsMatchingCss(content, ".code-block, #comments");
        }
        return content;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("div.nv-page-title h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("div.nv-page-title h1");
    }

    removeUnusedElementsToReduceMemoryConsumption(chapterDom) {
        this.unscrambleText(chapterDom, this.findContent(chapterDom));
    }

    unscrambleText(dom, content) {
        let style = content.querySelector("style");
        if (style == null) {
            return;
        }
        let rules = this.parseStyle(content);
        let spans = new Map();
        for(let span of [...content.querySelectorAll("p span")]) {
            spans.set(span.className.trim(), span);
        }
        this.addRuleContent(dom, spans, rules);
    }

    parseStyle(content) {
        let rules = new Map();
        let style = [...content.querySelectorAll("style")].pop();
        let lines = style.textContent.split("}")
            .map(l => l.trim())
            .filter(l => !util.isNullOrEmpty(l));
        for(let line of lines) {
            let index = line.indexOf("::before {");
            if (0 < index) {
                this.addBefore(line, index, rules);
                continue;
            }
            index = line.indexOf("::after {");
            if (0 < index) {
                this.addAfter(line, index, rules);
                continue;
            }
            break;
        }
        style.remove();
        return rules;
    }

    addBefore(line, index, rules) {
        let className = line.substring(1, index);
        let context = this.extractContent(line);
        let rule = rules.get(className);
        if (rule === undefined) {
            rules.set(className, { before: context});
        } else {
            rule.before = context;
        }
    }

    addAfter(line, index, rules) {
        let className = line.substring(1, index);
        let context = this.extractContent(line);
        let rule = rules.get(className);
        if (rule === undefined) {
            rules.set(className, { after: context});
        } else {
            rule.after = context;
        }
    }

    extractContent(contextLine) {
        let start = contextLine.indexOf("'");
        let end = contextLine.lastIndexOf("'");
        return contextLine.substring(start + 1, end).replace("\\a0", "");
    }

    addRuleContent(dom, spans, rules)
    {
        for(let span of spans.entries()) {
            let rule = rules.get(span[0]);
            if (rule != null) {
                let text = span[1].textContent;
                if (rule.before) {
                    text = rule.before + text;
                }
                if (rule.after) {
                    text += rule.after;
                }
                let textNode = dom.createTextNode(text);
                span[1].replaceWith(textNode);
            }
        }
    }
}
