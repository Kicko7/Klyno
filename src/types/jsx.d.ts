import React from 'react';

declare global {
  namespace JSX {
    type Element = React.ReactElement<any, any>
    type IntrinsicElements = React.JSX.IntrinsicElements
    type ElementChildrenAttribute = React.JSX.ElementChildrenAttribute
    type ElementAttributesProperty = React.JSX.ElementAttributesProperty
    type ElementClass = React.JSX.ElementClass
    type ElementType = React.JSX.ElementType
  }
}

// Ensure React is available globally for JSX
declare module 'react' {
  interface JSX {
    Element: React.ReactElement;
    ElementAttributesProperty: React.JSX.ElementAttributesProperty;
    ElementChildrenAttribute: React.JSX.ElementChildrenAttribute;
    ElementClass: React.JSX.ElementClass;
    ElementType: React.JSX.ElementType;
    IntrinsicElements: React.JSX.IntrinsicElements;
  }
}

export {};
