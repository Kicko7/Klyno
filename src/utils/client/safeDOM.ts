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
      child.remove();
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
 * Safely appends a child element to a parent
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
    parent.append(child);
    return true;
  } catch (error) {
    console.error('safeAppendChild: Error appending child:', error);
    return false;
  }
};

/**
 * Safely inserts a node before a reference node
 * @param parent The parent element
 * @param newNode The node to insert
 * @param referenceNode The reference node
 * @returns true if successful, false otherwise
 */
export const safeInsertBefore = (
  parent: Node | null,
  newNode: Node | null,
  referenceNode: Node | null,
): boolean => {
  if (!parent || !newNode) {
    console.warn('safeInsertBefore: Parent or newNode is null/undefined');
    return false;
  }

  try {
    referenceNode.before(newNode);
    return true;
  } catch (error) {
    console.error('safeInsertBefore: Error inserting node:', error);
    return false;
  }
};

/**
 * Safely replaces a child node
 * @param parent The parent element
 * @param newChild The new child node
 * @param oldChild The old child node to replace
 * @returns true if successful, false otherwise
 */
export const safeReplaceChild = (
  parent: Node | null,
  newChild: Node | null,
  oldChild: Node | null,
): boolean => {
  if (!parent || !newChild || !oldChild) {
    console.warn('safeReplaceChild: Parent, newChild, or oldChild is null/undefined');
    return false;
  }

  try {
    if (parent.contains(oldChild)) {
      oldChild.replaceWith(newChild);
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
 * Safely creates an HTML element
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
 * @returns Array of found elements or empty array if not found
 */
export const safeQuerySelectorAll = (
  selector: string,
  parent: Document | Element = document,
): Element[] => {
  try {
    const elements = parent.querySelectorAll(selector);
    return Array.from(elements);
  } catch (error) {
    console.error('safeQuerySelectorAll: Error querying selector:', error);
    return []; // Return empty array
  }
};

/**
 * Safely gets elements by class name
 * @param className The class name to search for
 * @param parent The parent element to search within (defaults to document)
 * @returns Array of elements or empty array if failed
 */
export const safeGetElementsByClassName = (
  className: string,
  parent: Element | Document = document,
): Element[] => {
  try {
    const elements = parent.getElementsByClassName(className);
    return Array.from(elements);
  } catch (error) {
    console.error('safeGetElementsByClassName: Error getting elements:', error);
    return [];
  }
};

/**
 * Safely gets elements by tag name
 * @param tagName The tag name to search for
 * @param parent The parent element to search within (defaults to document)
 * @returns Array of elements or empty array if failed
 */
export const safeGetElementsByTagName = (
  tagName: string,
  parent: Element | Document = document,
): Element[] => {
  try {
    const elements = parent.getElementsByTagName(tagName);
    return Array.from(elements);
  } catch (error) {
    console.error('safeGetElementsByTagName: Error getting elements:', error);
    return [];
  }
};

/**
 * Safely removes all children from a parent element
 * @param parent The parent element
 * @returns true if successful, false otherwise
 */
export const safeRemoveAllChildren = (parent: Node | null): boolean => {
  if (!parent) {
    console.warn('safeRemoveAllChildren: Parent element is null/undefined');
    return false;
  }

  try {
    while (parent.firstChild) {
      parent.firstChild.remove();
    }
    return true;
  } catch (error) {
    console.error('safeRemoveAllChildren: Error removing children:', error);
    return false;
  }
};

/**
 * Safely gets the next sibling of a node
 * @param node The node to get the next sibling of
 * @returns The next sibling or null if not found
 */
export const safeGetNextSibling = (node: Node | null): Node | null => {
  if (!node) {
    console.warn('safeGetNextSibling: Node is null/undefined');
    return null;
  }

  try {
    return node.nextSibling;
  } catch (error) {
    console.error('safeGetNextSibling: Error getting next sibling:', error);
    return null;
  }
};

/**
 * Safely gets the previous sibling of a node
 * @param node The node to get the previous sibling of
 * @returns The previous sibling or null if not found
 */
export const safeGetPreviousSibling = (node: Node | null): Node | null => {
  if (!node) {
    console.warn('safeGetPreviousSibling: Node is null/undefined');
    return null;
  }

  try {
    return node.previousSibling;
  } catch (error) {
    console.error('safeGetPreviousSibling: Error getting previous sibling:', error);
    return null;
  }
};

/**
 * Safely gets all child nodes of an element
 * @param parent The parent element
 * @returns Array of child nodes or empty array if failed
 */
export const safeGetChildNodes = (parent: Node | null): Node[] => {
  if (!parent) {
    console.warn('safeGetChildNodes: Parent is null/undefined');
    return [];
  }

  try {
    return Array.from(parent.childNodes);
  } catch (error) {
    console.error('safeGetChildNodes: Error getting child nodes:', error);
    return [];
  }
};
