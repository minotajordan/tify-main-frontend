import React from 'react';
import { Image, FileText, Film, File } from 'lucide-react';

export const splitHtmlContent = (html: string, initialOffset: number = 0): string[] => {
  if (typeof document === 'undefined') return [html];

  // Create a container that mimics the page dimensions and styles
  const container = document.createElement('div');
  container.style.width = '21cm'; // Match A4 width
  container.style.paddingLeft = '4rem'; // Match md:p-16 (4rem) - Desktop view
  container.style.paddingRight = '4rem';
  container.style.paddingTop = '0';
  container.style.paddingBottom = '0';
  container.style.position = 'absolute';
  container.style.visibility = 'hidden';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.className = 'prose max-w-none font-serif text-gray-800 leading-relaxed text-justify'; // Match preview classes
  document.body.appendChild(container);

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  const pages: string[] = [];
  let currentPageNodes: Node[] = [];
  let currentHeight = 0;
  // Further reduce height to be extremely safe for headers/footers and margins
  // A4 (297mm) ~ 1123px at 96dpi.
  // Margins (top/bottom) + Header/Footer take significant space.
  // Let's use a smaller safe content area.
  const BASE_MAX_HEIGHT = 600;

  // Helper to get height of a node
  const getNodeHeight = (node: Node): number => {
    const clone = node.cloneNode(true);
    container.innerHTML = '';
    container.appendChild(clone);
    return container.offsetHeight;
  };

  // Helper to check if content is empty/blank
  const isEmptyContent = (htmlContent: string): boolean => {
    const div = document.createElement('div');
    div.innerHTML = htmlContent;
    // Check for images or other meaningful media
    if (div.querySelector('img, video, iframe, svg, table')) return false;
    // Check text content
    const text = div.textContent || div.innerText || '';
    return text.trim().length === 0;
  };

  // Helper to process nodes
  const processNodes = (nodes: NodeList) => {
    Array.from(nodes).forEach((node) => {
      // Determine max height for current page
      // If pages.length is 0, we are on the first page, so subtract initialOffset
      const currentMaxHeight =
        pages.length === 0 ? BASE_MAX_HEIGHT - initialOffset : BASE_MAX_HEIGHT;

      if (node.nodeType === Node.TEXT_NODE) {
        // For text nodes, we might need to wrap them in a span to measure
        if (!node.textContent?.trim()) return;
        const span = document.createElement('span');
        span.textContent = node.textContent;
        const height = getNodeHeight(span);

        if (currentHeight + height > currentMaxHeight && currentPageNodes.length > 0) {
          // Push current page
          const pageDiv = document.createElement('div');
          currentPageNodes.forEach((n) => pageDiv.appendChild(n.cloneNode(true)));
          if (!isEmptyContent(pageDiv.innerHTML)) {
            pages.push(pageDiv.innerHTML);
          }
          currentPageNodes = [];
          currentHeight = 0;
        }
        currentPageNodes.push(node);
        currentHeight += height;
      } else {
        // Element node
        const height = getNodeHeight(node);

        if (currentHeight + height > currentMaxHeight) {
          // If it's a large block that doesn't fit, we might want to push current page first
          if (currentPageNodes.length > 0) {
            const pageDiv = document.createElement('div');
            currentPageNodes.forEach((n) => pageDiv.appendChild(n.cloneNode(true)));
            if (!isEmptyContent(pageDiv.innerHTML)) {
              pages.push(pageDiv.innerHTML);
            }
            currentPageNodes = [];
            currentHeight = 0;
          }

          // If the element itself is larger than max height, we just have to put it on a new page
          // (Note: Ideally we would split the block, but that's complex. For now, pushing to next page is safer)
          currentPageNodes.push(node);
          currentHeight += height;
        } else {
          currentPageNodes.push(node);
          currentHeight += height;
        }
      }
    });
  };

  processNodes(tempDiv.childNodes);

  // Push remaining nodes
  if (currentPageNodes.length > 0) {
    const pageDiv = document.createElement('div');
    currentPageNodes.forEach((n) => pageDiv.appendChild(n.cloneNode(true)));
    if (!isEmptyContent(pageDiv.innerHTML)) {
      pages.push(pageDiv.innerHTML);
    }
  }

  document.body.removeChild(container);
  return pages.length > 0 ? pages : [html];
};

export const getFileIcon = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
    return <Image size={16} className="text-purple-500" />;
  }
  if (['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx'].includes(ext || '')) {
    return <FileText size={16} className="text-blue-500" />;
  }
  if (['mp4', 'mov', 'avi', 'webm'].includes(ext || '')) {
    return <Film size={16} className="text-pink-500" />;
  }
  return <File size={16} className="text-gray-500" />;
};
