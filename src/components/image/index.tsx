import { memo, useCallback, useEffect, useRef, useState, type CSSProperties, type ImgHTMLAttributes } from "react";

import { RiFileImageLine } from "@remixicon/react";
import { twMerge } from "tailwind-merge";

import { formatUrlProtocol } from "@/common/utils/url";

type ImageRadius = "none" | "sm" | "md" | "lg" | "full";

interface Props extends Omit<ImgHTMLAttributes<HTMLImageElement>, "height" | "src" | "width"> {
  src?: string;
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
  params?: string;
  emptyPlaceholder?: React.ReactNode;
  radius?: ImageRadius;
  removeWrapper?: boolean;
  classNames?: {
    wrapper?: string;
    img?: string;
  };
}

const radiusClassNames: Record<ImageRadius, string> = {
  none: "rounded-none",
  sm: "rounded-small",
  md: "rounded-medium",
  lg: "rounded-large",
  full: "rounded-full",
};

const Image = memo(
  ({
    params,
    width,
    height,
    src,
    className,
    emptyPlaceholder,
    loading = "lazy",
    decoding = "async",
    radius = "none",
    removeWrapper,
    classNames,
    onLoad,
    onError,
    ...rest
  }: Props) => {
    const [isError, setIsError] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const prevSrcRef = useRef<string | undefined>(undefined);
    const formatSrc = formatUrlProtocol(src);
    const finalSrc =
      params && formatSrc && formatSrc.includes("/bfs/") && !formatSrc.includes("@")
        ? `${formatSrc}@${params}`
        : formatSrc;

    // Reset loaded state when src changes
    useEffect(() => {
      if (prevSrcRef.current !== finalSrc) {
        setIsLoaded(false);
        setIsError(false);
        prevSrcRef.current = finalSrc;
      }
    }, [finalSrc]);

    const handleLoad = useCallback<NonNullable<ImgHTMLAttributes<HTMLImageElement>["onLoad"]>>(
      event => {
        setIsLoaded(true);
        onLoad?.(event);
      },
      [onLoad],
    );

    const handleError = useCallback<NonNullable<ImgHTMLAttributes<HTMLImageElement>["onError"]>>(
      event => {
        setIsError(true);
        onError?.(event);
      },
      [onError],
    );

    const radiusClassName = radiusClassNames[radius];

    if (!src || isError) {
      return (
        <div
          className={twMerge(
            "border-content2 flex h-full items-center justify-center border",
            radiusClassName,
            classNames?.wrapper,
            className,
          )}
          style={{ width, height }}
        >
          {emptyPlaceholder || <RiFileImageLine size="40%" className="text-default-500" />}
        </div>
      );
    }

    const image = (
      <img
        {...rest}
        alt={rest.alt ?? ""}
        src={finalSrc}
        loading={loading}
        decoding={decoding}
        onLoad={handleLoad}
        onError={handleError}
        style={{ width, height, ...rest.style }}
        className={twMerge(
          "object-cover transition-opacity duration-300",
          radiusClassName,
          removeWrapper && !isLoaded && "bg-default-200/50 dark:bg-default-100/10 animate-pulse",
          !removeWrapper && (isLoaded ? "opacity-100" : "opacity-0"),
          classNames?.img,
          className,
        )}
      />
    );

    if (removeWrapper) return image;

    return (
      <div
        className={twMerge("relative overflow-hidden", radiusClassName, classNames?.wrapper, className)}
        style={{ width, height }}
      >
        {/* Skeleton placeholder while loading */}
        {!isLoaded && (
          <div
            className={twMerge(
              "bg-default-200/50 dark:bg-default-100/10 absolute inset-0 animate-pulse",
              radiusClassName,
            )}
          />
        )}
        {image}
      </div>
    );
  },
);

export default Image;
