// OpenShot UI Camera - Content Script

let overlayElement: HTMLDivElement | null = null;
let currentHighlighted: HTMLElement | null = null;

// Element highlight helper
function createHighlightBox(target: HTMLElement) {
  if (!overlayElement) {
    overlayElement = document.createElement('div');
    overlayElement.style.position = 'fixed';
    overlayElement.style.pointerEvents = 'none';
    overlayElement.style.border = '2px dashed #6366f1';
    overlayElement.style.backgroundColor = 'rgba(99, 102, 241, 0.15)';
    overlayElement.style.zIndex = '2147483647';
    overlayElement.style.transition = 'all 0.05s ease';
    document.body.appendChild(overlayElement);
  }

  const rect = target.getBoundingClientRect();
  overlayElement.style.left = `${rect.left}px`;
  overlayElement.style.top = `${rect.top}px`;
  overlayElement.style.width = `${rect.width}px`;
  overlayElement.style.height = `${rect.height}px`;
  overlayElement.style.display = 'block';
}

function removeHighlightBox() {
  if (overlayElement) {
    overlayElement.style.display = 'none';
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'START_ELEMENT_PICKER') {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && target !== overlayElement) {
        currentHighlighted = target;
        createHighlightBox(target);
      }
    };

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('click', handleClick, true);
      removeHighlightBox();

      if (currentHighlighted) {
        const rect = currentHighlighted.getBoundingClientRect();
        sendResponse({
          success: true,
          tagName: currentHighlighted.tagName,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        });
      }
    };

    window.addEventListener('mouseover', handleMouseOver);
    window.addEventListener('click', handleClick, true);
    return true;
  }

  if (message.type === 'GET_PAGE_METRICS') {
    sendResponse({
      scrollHeight: Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        document.body.offsetHeight,
        document.documentElement.offsetHeight,
        document.body.clientHeight,
        document.documentElement.clientHeight
      ),
      scrollWidth: Math.max(
        document.body.scrollWidth,
        document.documentElement.scrollWidth,
        document.body.offsetWidth,
        document.documentElement.offsetWidth
      ),
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
      devicePixelRatio: window.devicePixelRatio,
    });
    return true;
  }
});
