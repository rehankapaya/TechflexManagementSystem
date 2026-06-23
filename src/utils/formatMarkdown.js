export const formatMarkdown = (text, isUser = false) => {
  if (!text) return { __html: '' };
  
  let html = text;

  // Escape HTML to prevent injection
  html = html.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Bold
  const boldClass = isUser ? 'font-semibold text-white' : 'font-semibold text-slate-900';
  html = html.replace(/\*\*(.*?)\*\*/g, `<strong class="${boldClass}">$1</strong>`);
  
  // Italic
  html = html.replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em class="italic">$1</em>');

  // Headers (### text)
  const h3Class = isUser ? 'text-lg font-bold text-white mt-4 mb-2' : 'text-lg font-bold text-slate-800 mt-4 mb-2';
  html = html.replace(/^### (.*$)/gim, `<h3 class="${h3Class}">$1</h3>`);
  
  // Lists (bullet points)
  html = html.replace(/^[ \t]*[-*][ \t]+(.*)/gim, '<li class="ml-5 list-disc pl-1 mb-1.5">$1</li>');
  
  // Wrap consecutive <li> into <ul>
  html = html.replace(/(<li class="ml-5 list-disc pl-1 mb-1.5">[\s\S]*?<\/li>\n*)+/g, match => `<ul class="mb-4 mt-2">${match}</ul>`);

  // Numbered lists
  html = html.replace(/^[ \t]*\d+\.[ \t]+(.*)/gim, '<li class="ml-5 list-decimal pl-1 mb-1.5">$1</li>');
  html = html.replace(/(<li class="ml-5 list-decimal pl-1 mb-1.5">[\s\S]*?<\/li>\n*)+/g, match => `<ol class="mb-4 mt-2">${match}</ol>`);

  // Paragraphs
  html = html.split(/\n\n+/).map(p => {
    if (p.trim().startsWith('<ul') || p.trim().startsWith('<ol') || p.trim().startsWith('<h')) {
      return p;
    }
    // Single newlines inside paragraphs become <br/>
    const withBr = p.replace(/\n/g, '<br/>');
    return `<p class="mb-4 last:mb-0 leading-relaxed">${withBr}</p>`;
  }).join('');

  // Cleanup stray <br/> inside lists
  html = html.replace(/<\/li><br\/>/g, '</li>');
  html = html.replace(/<\/ul><br\/>/g, '</ul>');
  html = html.replace(/<\/ol><br\/>/g, '</ol>');

  return { __html: html };
};
