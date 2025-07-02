/**
 * Safe DOM manipulation utilities to prevent removeChild errors
 * These functions check for element existence before performing operations
 */

/**
 * Safely removes a child element from its parent
 * @param parent The parent element
 * @param child The child element to remove
 * @returns true if removal was successful, false otherwise
 */
export const safeRemoveChild = (parent: Node | null, child: Node | null): boolean => {
  if (!parent || !child) {
    console.warn('safeRemoveChild: Parent or child element is null/undefined');
    return false;
  }

  try {
    // Check if the child is actually a child of the parent
    if (parent.contains(child)) {
      parent.removeChild(child);
      return true;
    } else {
      console.warn('safeRemoveChild: Child is not a descendant of parent');
      return false;
    }
  } catch (error) {
    console.error('safeRemoveChild: Error removing child:', error);
    return false;
  }
};

/**
 * Safely appends a child element to its parent
 * @param parent The parent element
 * @param child The child element to append
 * @returns true if append was successful, false otherwise
 */
export const safeAppendChild = (parent: Node | null, child: Node | null): boolean => {
  if (!parent || !child) {
    console.warn('safeAppendChild: Parent or child element is null/undefined');
    return false;
  }

  try {
    parent.appendChild(child);
    return true;
  } catch (error) {
    console.error('safeAppendChild: Error appending child:', error);
    return false;
  }
};

/**
 * Safely inserts a child element before a reference node
 * @param parent The parent element
 * @param child The child element to insert
 * @param referenceNode The reference node
 * @returns true if insert was successful, false otherwise
 */
export const safeInsertBefore = (
  parent: Node | null,
  child: Node | null,
  referenceNode: Node | null,
): boolean => {
  if (!parent || !child) {
    console.warn('safeInsertBefore: Parent or child element is null/undefined');
    return false;
  }

  try {
    parent.insertBefore(child, referenceNode);
    return true;
  } catch (error) {
    console.error('safeInsertBefore: Error inserting child:', error);
    return false;
  }
};

/**
 * Safely replaces a child element
 * @param parent The parent element
 * @param newChild The new child element
 * @param oldChild The old child element to replace
 * @returns true if replace was successful, false otherwise
 */
export const safeReplaceChild = (
  parent: Node | null,
  newChild: Node | null,
  oldChild: Node | null,
): boolean => {
  if (!parent || !newChild || !oldChild) {
    console.warn('safeReplaceChild: Parent, newChild, or oldChild element is null/undefined');
    return false;
  }

  try {
    // Check if the old child is actually a child of the parent
    if (parent.contains(oldChild)) {
      parent.replaceChild(newChild, oldChild);
      return true;
    } else {
      console.warn('safeReplaceChild: Old child is not a descendant of parent');
      return false;
    }
  } catch (error) {
    console.error('safeReplaceChild: Error replacing child:', error);
    return false;
  }
};

/**
 * Safely sets innerHTML with error handling
 * @param element The element to set innerHTML on
 * @param html The HTML string to set
 * @returns true if set was successful, false otherwise
 */
export const safeSetInnerHTML = (element: Element | null, html: string): boolean => {
  if (!element) {
    console.warn('safeSetInnerHTML: Element is null/undefined');
    return false;
  }

  try {
    element.innerHTML = html;
    return true;
  } catch (error) {
    console.error('safeSetInnerHTML: Error setting innerHTML:', error);
    return false;
  }
};

/**
 * Safely creates an element with error handling
 * @param tagName The tag name of the element to create
 * @returns The created element or null if failed
 */
export const safeCreateElement = (tagName: string): HTMLElement | null => {
  try {
    return document.createElement(tagName);
  } catch (error) {
    console.error('safeCreateElement: Error creating element:', error);
    return null;
  }
};

/**
 * Safely queries for an element with error handling
 * @param selector The CSS selector
 * @param parent The parent element to search in (defaults to document)
 * @returns The found element or null if not found
 */
export const safeQuerySelector = (
  selector: string,
  parent: Document | Element = document,
): Element | null => {
  try {
    return parent.querySelector(selector);
  } catch (error) {
    console.error('safeQuerySelector: Error querying selector:', error);
    return null;
  }
};

/**
 * Safely queries for all elements with error handling
 * @param selector The CSS selector
 * @param parent The parent element to search in (defaults to document)
 * @returns The found elements or empty NodeList if not found
 */
export const safeQuerySelectorAll = (
  selector: string,
  parent: Document | Element = document,
): NodeListOf<Element> => {
  try {
    return parent.querySelectorAll(selector);
  } catch (error) {
    console.error('safeQuerySelectorAll: Error querying selector:', error);
    return document.querySelectorAll(''); // Return empty NodeList
  }
}; 