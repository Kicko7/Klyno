import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Server-side email renderer
 * This allows using React email components in server-side APIs
 */
export function renderServerEmail(component: React.ReactElement): string {
  const renderedHtml = renderToStaticMarkup(component);

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
${renderedHtml}`;
}
