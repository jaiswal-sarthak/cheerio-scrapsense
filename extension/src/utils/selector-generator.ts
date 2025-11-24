// CSS Selector Generator - Creates optimal selectors for elements
export class SelectorGenerator {
    generate(element: Element): string {
        // Try ID first (most specific)
        if (element.id) {
            return `#${CSS.escape(element.id)}`;
        }

        // Try unique class combination
        const classSelector = this.getClassSelector(element);
        if (classSelector && this.isUnique(classSelector)) {
            return classSelector;
        }

        // Try attribute selectors
        const attrSelector = this.getAttributeSelector(element);
        if (attrSelector && this.isUnique(attrSelector)) {
            return attrSelector;
        }

        // Fallback to path-based selector
        return this.getPathSelector(element);
    }

    private getClassSelector(element: Element): string | null {
        const classes = Array.from(element.classList)
            .filter(cls => !cls.match(/^(hover|active|focus|selected)/)); // Exclude state classes

        if (classes.length === 0) return null;

        const selector = element.tagName.toLowerCase() + '.' + classes.map(c => CSS.escape(c)).join('.');
        return selector;
    }

    private getAttributeSelector(element: Element): string | null {
        const attributes = ['data-testid', 'data-id', 'name', 'type', 'role'];

        for (const attr of attributes) {
            const value = element.getAttribute(attr);
            if (value) {
                return `${element.tagName.toLowerCase()}[${attr}="${CSS.escape(value)}"]`;
            }
        }

        return null;
    }

    private getPathSelector(element: Element): string {
        const path: string[] = [];
        let current: Element | null = element;

        while (current && current !== document.body) {
            let selector = current.tagName.toLowerCase();

            if (current.id) {
                selector = `#${CSS.escape(current.id)}`;
                path.unshift(selector);
                break;
            }

            // Add nth-child if needed for uniqueness
            const parent: Element | null = current.parentElement;
            if (parent) {
                const siblings = Array.from(parent.children).filter(
                    (el: Element) => el.tagName === current!.tagName
                );
                if (siblings.length > 1) {
                    const index = siblings.indexOf(current) + 1;
                    selector += `:nth-of-type(${index})`;
                }
            }

            path.unshift(selector);
            current = parent;
        }

        return path.join(' > ');
    }

    private isUnique(selector: string): boolean {
        try {
            return document.querySelectorAll(selector).length === 1;
        } catch {
            return false;
        }
    }

    // Generate selector for multiple similar elements (pattern detection)
    generatePattern(elements: Element[]): string {
        if (elements.length === 0) return '';
        if (elements.length === 1) return this.generate(elements[0]);

        // Find common parent
        const commonParent = this.findCommonParent(elements);
        if (!commonParent) return this.generate(elements[0]);

        // Find common class or tag
        const firstElement = elements[0];
        const tag = firstElement.tagName.toLowerCase();
        const commonClasses = this.findCommonClasses(elements);

        let pattern = tag;
        if (commonClasses.length > 0) {
            pattern += '.' + commonClasses.join('.');
        }

        // Test if pattern matches all elements
        const parentSelector = this.generate(commonParent);
        const fullPattern = `${parentSelector} ${pattern}`;

        const matches = document.querySelectorAll(fullPattern);
        if (matches.length >= elements.length) {
            return fullPattern;
        }

        return this.generate(elements[0]);
    }

    private findCommonParent(elements: Element[]): Element | null {
        if (elements.length === 0) return null;

        let parent = elements[0].parentElement;
        while (parent) {
            if (elements.every(el => parent!.contains(el))) {
                return parent;
            }
            parent = parent.parentElement;
        }
        return null;
    }

    private findCommonClasses(elements: Element[]): string[] {
        if (elements.length === 0) return [];

        const firstClasses = Array.from(elements[0].classList);
        const common: string[] = [];

        for (const cls of firstClasses) {
            if (elements.every((el: Element) => el.classList.contains(cls))) {
                if (!cls.match(/^(hover|active|focus|selected)/)) {
                    common.push(CSS.escape(cls));
                }
            }
        }

        return common;
    }
}

export const selectorGenerator = new SelectorGenerator();
