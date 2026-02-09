/**
 * No More NA - Content Script
 * Three-layer color replacement engine.
 */

(function () {
  'use strict';

  let enabled = true;
  let hasRun = false;

  // Guard flag to prevent MutationObserver self-triggering
  let isProcessing = false;

  // CSS properties that can contain colors
  const COLOR_PROPERTIES = [
    'color', 'background-color', 'background', 'background-image',
    'border-color', 'border-top-color', 'border-right-color',
    'border-bottom-color', 'border-left-color',
    'border-block-start-color', 'border-block-end-color',
    'border-inline-start-color', 'border-inline-end-color',
    'outline-color', 'text-decoration-color',
    'fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color',
    'box-shadow', 'text-shadow',
    'caret-color', 'column-rule-color',
    'scrollbar-color', 'accent-color'
  ];

  // SVG attributes that can contain colors
  const SVG_COLOR_ATTRS = ['fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color', 'color'];

  // Legacy HTML color attributes
  const HTML_COLOR_ATTRS = ['bgcolor', 'color', 'bordercolor'];

  // Attributes to observe in MutationObserver (no 'class' — stylesheet rules already handle class-based styling)
  const OBSERVED_ATTRS = ['style', ...SVG_COLOR_ATTRS, ...HTML_COLOR_ATTRS];

  // Track observed shadow roots to prevent duplicate observers
  const observedShadowRoots = new WeakSet();

  // Track fetched cross-origin stylesheet hrefs to prevent duplicate injections
  const fetchedStylesheetHrefs = new Set();

  // ========== LAYER 1: Shadow DOM Interception ==========
  const originalAttachShadow = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (init) {
    const shadow = originalAttachShadow.call(this, init);
    if (!shadow) return shadow;

    if (enabled && hasRun) {
      // Process and observe this shadow root once it has content
      queueMicrotask(() => {
        processShadowRoot(shadow);
        setupShadowObserver(shadow);
      });
    }

    return shadow;
  };

  // ========== LAYER 2: Stylesheet Scanning ==========
  function processStyleSheets(root) {
    const sheets = root.styleSheets || [];
    for (let i = 0; i < sheets.length; i++) {
      const sheet = sheets[i];
      try {
        processStyleSheetRules(sheet);
      } catch (e) {
        if (e.name === 'SecurityError') {
          fetchAndReplaceStylesheet(sheet, root);
        }
      }
    }
  }

  function processStyleSheetRules(sheet) {
    const rules = sheet.cssRules;
    if (!rules) return;

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];

      if (rule.style) {
        processStyleDeclaration(rule.style);
      }

      // Handle @media, @supports, @layer, etc.
      if (rule.cssRules) {
        processStyleSheetRules(rule);
      }
    }
  }

  function processStyleDeclaration(style) {
    // Check standard color properties
    for (const prop of COLOR_PROPERTIES) {
      const value = style.getPropertyValue(prop);
      if (value && mayContainTargetColor(value)) {
        const priority = style.getPropertyPriority(prop);
        const replaced = replaceColorInValue(value);
        if (replaced !== value) {
          style.setProperty(prop, replaced, priority);
        }
      }
    }

    // Check CSS custom properties (--*) by iterating style indices
    for (let i = 0; i < style.length; i++) {
      const propName = style[i];
      if (!propName.startsWith('--')) continue;

      const propValue = style.getPropertyValue(propName);
      if (propValue && mayContainTargetColor(propValue)) {
        const replaced = replaceColorInValue(propValue);
        if (replaced !== propValue) {
          const priority = style.getPropertyPriority(propName);
          style.setProperty(propName, replaced, priority);
        }
      }
    }
  }

  function fetchAndReplaceStylesheet(sheet, root) {
    const href = sheet.href;
    if (!href || fetchedStylesheetHrefs.has(href)) return;
    fetchedStylesheetHrefs.add(href);

    fetch(href, { mode: 'cors', credentials: 'same-origin' })
      .then(res => {
        if (!res.ok) throw new Error('Fetch failed');
        return res.text();
      })
      .then(cssText => {
        if (!mayContainTargetColor(cssText)) return;

        const replaced = replaceColorsInCSSText(cssText);
        if (replaced === cssText) return;

        const style = document.createElement('style');
        style.textContent = replaced;
        style.dataset.noMoreNaReplacement = 'true';

        // Disable the original stylesheet
        sheet.disabled = true;

        const target = root === document ? document.head : root;
        if (target) target.appendChild(style);
      })
      .catch(() => {
        // Cannot fetch cross-origin stylesheet — remove from tracked so retry is possible
        fetchedStylesheetHrefs.delete(href);
      });
  }

  // ========== LAYER 3: DOM Traversal ==========
  function processDOMTree(root) {
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_ELEMENT,
      null
    );

    let node = walker.currentNode;
    while (node) {
      processElement(node);
      node = walker.nextNode();
    }
  }

  function processElement(el) {
    // Inline styles
    if (el.style && el.style.length > 0) {
      processStyleDeclaration(el.style);
    }

    // SVG color attributes
    if (el.namespaceURI === 'http://www.w3.org/2000/svg' || el instanceof SVGElement) {
      for (const attr of SVG_COLOR_ATTRS) {
        const value = el.getAttribute(attr);
        if (value && mayContainTargetColor(value)) {
          const replaced = replaceColorInValue(value);
          if (replaced !== value) {
            el.setAttribute(attr, replaced);
          }
        }
      }
    }

    // Legacy HTML color attributes
    for (const attr of HTML_COLOR_ATTRS) {
      const value = el.getAttribute(attr);
      if (value && mayContainTargetColor(value)) {
        const replaced = replaceColorInValue(value);
        if (replaced !== value) {
          el.setAttribute(attr, replaced);
        }
      }
    }

    // Recurse into open shadow roots
    if (el.shadowRoot) {
      processShadowRoot(el.shadowRoot);
      setupShadowObserver(el.shadowRoot);
    }
  }

  function processShadowRoot(shadow) {
    if (!shadow) return;

    // Process adopted stylesheets if available
    if (shadow.adoptedStyleSheets) {
      for (const sheet of shadow.adoptedStyleSheets) {
        try {
          processStyleSheetRules(sheet);
        } catch (e) { /* skip */ }
      }
    }

    // Process <style> elements inside shadow root
    const styles = shadow.querySelectorAll('style');
    for (const style of styles) {
      if (style.sheet) {
        try {
          processStyleSheetRules(style.sheet);
        } catch (e) { /* skip */ }
      }
    }

    // Walk the shadow DOM tree
    processDOMTree(shadow);
  }

  // ========== MutationObserver ==========
  let stylesheetDebounceTimer = null;

  function setupObserver(root) {
    const observer = new MutationObserver(mutations => {
      if (!enabled || isProcessing) return;

      isProcessing = true;
      try {
        let needsStylesheetRescan = false;

        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            for (const node of mutation.addedNodes) {
              if (node.nodeType !== Node.ELEMENT_NODE) continue;

              if (node.tagName === 'STYLE' || node.tagName === 'LINK') {
                needsStylesheetRescan = true;
              }

              processElement(node);

              // Process descendants of added node via TreeWalker
              const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT, null);
              let child = walker.nextNode();
              while (child) {
                processElement(child);
                child = walker.nextNode();
              }
            }
          } else if (mutation.type === 'attributes') {
            processElement(mutation.target);
          }
        }

        if (needsStylesheetRescan) {
          if (stylesheetDebounceTimer) clearTimeout(stylesheetDebounceTimer);
          stylesheetDebounceTimer = setTimeout(() => {
            processStyleSheets(root === document.documentElement ? document : root);
          }, 100);
        }
      } finally {
        isProcessing = false;
      }
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: OBSERVED_ATTRS
    });

    return observer;
  }

  function setupShadowObserver(shadow) {
    if (!shadow || observedShadowRoots.has(shadow)) return;
    observedShadowRoots.add(shadow);

    const observer = new MutationObserver(mutations => {
      if (!enabled || isProcessing) return;

      isProcessing = true;
      try {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            for (const node of mutation.addedNodes) {
              if (node.nodeType !== Node.ELEMENT_NODE) continue;
              processElement(node);
              const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT, null);
              let child = walker.nextNode();
              while (child) {
                processElement(child);
                child = walker.nextNode();
              }
            }
          } else if (mutation.type === 'attributes') {
            processElement(mutation.target);
          }
        }
      } finally {
        isProcessing = false;
      }
    });

    observer.observe(shadow, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: OBSERVED_ATTRS
    });
  }

  // ========== Main Execution ==========
  function runReplacement() {
    if (hasRun) return;
    hasRun = true;

    isProcessing = true;
    try {
      processStyleSheets(document);
      processDOMTree(document.documentElement);
    } finally {
      isProcessing = false;
    }

    setupObserver(document.documentElement);
  }

  // Check initial state from storage
  chrome.storage.local.get('enabled', (result) => {
    if (chrome.runtime.lastError) return;
    enabled = result.enabled !== false; // Default to true

    if (enabled) {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', runReplacement);
      } else {
        runReplacement();
      }
    }
  });

  // Listen for toggle messages from background/popup
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'toggle') {
      enabled = message.enabled;
      if (enabled && !hasRun) {
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', runReplacement);
        } else {
          runReplacement();
        }
      }
      // When disabled, we don't undo changes — popup handles page reload
    }
  });
})();
