"use client";
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Renders a React component to HTML with proper DOCTYPE and structure
 * This is a workaround for the issue with @react-email/render in the Convex environment
 * 
 * @param component The React component to render
 * @returns HTML string with proper DOCTYPE and structure
 */
export function renderEmail(component: React.ReactElement): string {
  // Use renderToStaticMarkup instead of @react-email/render
  const renderedHtml = renderToStaticMarkup(component);
  
  // Add proper DOCTYPE and structure
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
${renderedHtml}`;
}
