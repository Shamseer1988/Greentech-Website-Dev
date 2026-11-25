import Markdown from "react-markdown";

/** Article text. Raw HTML and pictures in the text are not shown. */
export function ArticleText({ text }: { text: string }) {
  return (
    <div className="article-text">
      <Markdown
        skipHtml
        disallowedElements={["img"]}
        components={{
          h1: "h2",
          a: ({ href, children }) =>
            href?.startsWith("/") || href?.startsWith("#") ? (
              <a href={href}>{children}</a>
            ) : (
              <a href={href} target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ),
        }}
      >
        {text}
      </Markdown>
    </div>
  );
}
