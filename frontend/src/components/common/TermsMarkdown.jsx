import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { prepareTermsMarkdown } from '../../utils/markdownHtmlConverter';

/** Allow safe style attributes used by the TipTap editor */
const schema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    '*': [
      ...(defaultSchema.attributes?.['*'] || []),
      'style',
      'class',
      'data-indent',
      'data-type',
      'data-checked',
      'data-color',
    ],
    span: [...(defaultSchema.attributes?.span || []), 'style'],
    p: [...(defaultSchema.attributes?.p || []), 'style', 'data-indent'],
    h1: [...(defaultSchema.attributes?.h1 || []), 'style', 'data-indent'],
    h2: [...(defaultSchema.attributes?.h2 || []), 'style', 'data-indent'],
    h3: [...(defaultSchema.attributes?.h3 || []), 'style', 'data-indent'],
    h4: [...(defaultSchema.attributes?.h4 || []), 'style', 'data-indent'],
    h5: [...(defaultSchema.attributes?.h5 || []), 'style', 'data-indent'],
    h6: [...(defaultSchema.attributes?.h6 || []), 'style', 'data-indent'],
    mark: [...(defaultSchema.attributes?.mark || []), 'style', 'data-color'],
    a: [...(defaultSchema.attributes?.a || []), 'href', 'target', 'rel'],
    img: [...(defaultSchema.attributes?.img || []), 'src', 'alt'],
    input: [...(defaultSchema.attributes?.input || []), 'type', 'checked', 'disabled'],
  },
  tagNames: [
    ...(defaultSchema.tagNames || []),
    'span',
    'u',
    'mark',
    'sub',
    'sup',
    'input',
  ],
};

const components = {
  h1: ({ children, ...props }) => <h1 {...filterBlockProps(props)}>{children}</h1>,
  h2: ({ children, ...props }) => <h2 {...filterBlockProps(props)}>{children}</h2>,
  h3: ({ children, ...props }) => <h3 {...filterBlockProps(props)}>{children}</h3>,
  h4: ({ children, ...props }) => <h4 {...filterBlockProps(props)}>{children}</h4>,
  h5: ({ children, ...props }) => <h5 {...filterBlockProps(props)}>{children}</h5>,
  h6: ({ children, ...props }) => <h6 {...filterBlockProps(props)}>{children}</h6>,
  p: ({ children, ...props }) => <p {...filterBlockProps(props)}>{children}</p>,
  a: ({ children, href, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-indigo-600 underline underline-offset-2 hover:text-indigo-700 dark:text-indigo-400"
      {...filterBlockProps(props)}
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong>{children}</strong>,
  em: ({ children }) => <em>{children}</em>,
  ul: ({ children }) => <ul>{children}</ul>,
  ol: ({ children }) => <ol>{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
};

function filterBlockProps(props) {
  const out = {};
  if (props.style) out.style = props.style;
  if (props['data-indent'] != null) out['data-indent'] = props['data-indent'];
  if (props.className) out.className = props.className;
  return out;
}

export default function TermsMarkdown({ content, className = 'tc-markdown-body' }) {
  const prepared = prepareTermsMarkdown(content || '');

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]}
        components={components}
      >
        {prepared}
      </ReactMarkdown>
    </div>
  );
}
