// Auto Detector - Automatically identify lists and tables
import { selectorGenerator } from './selector-generator';

export class AutoDetector {
    detect(): Record<string, string> | null {
        // 1. Find the best container candidate
        const candidate = this.findBestContainer();
        if (!candidate) return null;

        // 2. Analyze children to find common fields
        const selectors = this.generateSelectors(candidate.container, candidate.childTag);

        return selectors;
    }

    private findBestContainer(): { container: Element, childTag: string } | null {
        const allElements = document.getElementsByTagName('*');
        let bestScore = 0;
        let bestCandidate: { container: Element, childTag: string } | null = null;

        for (let i = 0; i < allElements.length; i++) {
            const element = allElements[i];

            // Skip invisible elements
            if (!this.isVisible(element)) continue;

            // Group children by tag
            const childrenByTag = new Map<string, Element[]>();
            for (let j = 0; j < element.children.length; j++) {
                const child = element.children[j];
                if (!this.isVisible(child)) continue;

                const tag = child.tagName.toLowerCase();
                if (!childrenByTag.has(tag)) {
                    childrenByTag.set(tag, []);
                }
                childrenByTag.get(tag)?.push(child);
            }

            // Evaluate groups
            for (const [tag, children] of childrenByTag.entries()) {
                // We need at least 3 similar items to consider it a list
                if (children.length < 3) continue;

                // Check if they look similar (class structure)
                if (!this.areSimilar(children)) continue;

                const score = this.calculateScore(element, children);
                console.log(`[AutoDetector] Candidate: ${element.tagName} > ${tag} (x${children.length}), Score: ${score}`);

                if (score > bestScore) {
                    bestScore = score;
                    bestCandidate = { container: element, childTag: tag };
                }
            }
        }

        if (bestCandidate) {
            console.log(`[AutoDetector] Best candidate found: ${bestCandidate.container.tagName} > ${bestCandidate.childTag} with score ${bestScore}`);
        } else {
            console.warn('[AutoDetector] No suitable candidate found');
        }

        return bestCandidate;
    }

    private isVisible(element: Element): boolean {
        const style = window.getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
    }

    private areSimilar(elements: Element[]): boolean {
        // Check if at least 80% of elements share the same class list length
        // This is a simple heuristic; could be more robust
        if (elements.length === 0) return false;

        const firstClassCount = elements[0].classList.length;
        let matchCount = 0;

        for (const el of elements) {
            if (el.classList.length === firstClassCount) matchCount++;
        }

        return (matchCount / elements.length) >= 0.8;
    }

    private calculateScore(container: Element, children: Element[]): number {
        let score = 0;

        // More items is generally better, but diminishing returns
        score += Math.min(children.length, 20) * 10;

        // Text content density
        const textLength = container.textContent?.length || 0;
        if (textLength > 100) score += 20;

        // Penalty for very deep nesting (likely too specific) or too shallow (body)
        if (container.tagName === 'BODY') score -= 100;

        // Bonus for common list tags
        if (['UL', 'OL', 'TBODY'].includes(container.tagName)) score += 30;

        return score;
    }

    private generateSelectors(container: Element, childTag: string): Record<string, string> {
        const selectors: Record<string, string> = {};

        // Get the first item to analyze structure
        const firstItem = Array.from(container.children).find(c => c.tagName.toLowerCase() === childTag);
        if (!firstItem) return selectors;

        // Generate base selector for the item
        // We use the selector generator but force it to be specific to this list
        const itemSelector = selectorGenerator.generate(firstItem);

        // Now find fields inside the first item

        // 1. Image
        const img = firstItem.querySelector('img');
        if (img) {
            selectors['image'] = selectorGenerator.generate(img);
        }

        // 2. Link (Title often inside link)
        const link = firstItem.querySelector('a');
        if (link) {
            selectors['link'] = selectorGenerator.generate(link);
            if (link.textContent?.trim()) {
                selectors['title'] = selectorGenerator.generate(link);
            }
        }

        // 3. Price
        const priceElement = this.findPriceElement(firstItem);
        if (priceElement) {
            selectors['price'] = selectorGenerator.generate(priceElement);
        }

        // 4. Title (if not found in link)
        if (!selectors['title']) {
            const titleElement = this.findTitleElement(firstItem);
            if (titleElement) {
                selectors['title'] = selectorGenerator.generate(titleElement);
            }
        }

        return selectors;
    }

    private findPriceElement(root: Element): Element | null {
        // Depth-first search for price pattern
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
        let node: Node | null = walker.currentNode;

        while (node) {
            const el = node as Element;
            const text = el.textContent?.trim() || '';
            // Regex for currency symbols or standard price formats
            if (/^[$€£¥₹]\s?\d/.test(text) || /^\d+[.,]\d{2}\s?[$€£¥₹]?$/.test(text)) {
                // Ensure it's a leaf node or close to it
                if (el.children.length === 0) return el;
            }
            node = walker.nextNode();
        }
        return null;
    }

    private findTitleElement(root: Element): Element | null {
        // Look for headings first
        const heading = root.querySelector('h1, h2, h3, h4, h5, h6');
        if (heading) return heading;

        // Look for bold text or specific classes
        const strong = root.querySelector('strong, b');
        if (strong) return strong;

        // Fallback: finding the element with the most text that isn't a description
        // This is hard to do reliably without more complex heuristics
        return null;
    }
}

export const autoDetector = new AutoDetector();
