import ScrollContainer from "../scroll-container";

interface Props {
  content: string;
}

const Typography = ({ content }: Props) => {
  const handleLinkClick: React.MouseEventHandler<HTMLDivElement> = e => {
    const target = (e.target as Element)?.closest("a");

    if (target && target.href) {
      e.preventDefault();
      window.open(target.href, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <ScrollContainer>
      <div
        className="prose dark:prose-invert px-6"
        onClick={handleLinkClick}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    </ScrollContainer>
  );
};

export default Typography;
