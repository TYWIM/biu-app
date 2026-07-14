import { memo, useCallback, useEffect, useRef, useState } from "react";

import { Image as HeroImage, type ImageProps } from "@heroui/react";
import { RiFileImageLine } from "@remixicon/react";
import { twMerge } from "tailwind-merge";

import { formatUrlProtocol } from "@/common/utils/url";

interface Props extends ImageProps {
  params?: string;
  emptyPlaceholder?: React.ReactNode;
}

const Image = memo(
  ({ params, width, height, src, className, emptyPlaceholder, loading = "lazy", onLoad, onError, ...rest }: Props) => {
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

    const handleLoad = useCallback<NonNullable<ImageProps["onLoad"]>>(
      event => {
        setIsLoaded(true);
        onLoad?.(event);
      },
      [onLoad],
    );

    const handleError = useCallback<NonNullable<ImageProps["onError"]>>(() => {
      setIsError(true);
      onError?.();
    }, [onError]);

    if (!src || isError) {
      return (
        <div
          className={twMerge("border-content2 flex h-full items-center justify-center rounded-md border", className)}
          style={{ width, height }}
        >
          {emptyPlaceholder || <RiFileImageLine size="40%" className="text-default-500" />}
        </div>
      );
    }

    return (
      <div className={twMerge("relative overflow-hidden", className)} style={{ width, height }}>
        {/* Skeleton placeholder while loading */}
        {!isLoaded && (
          <div className="bg-default-200/50 dark:bg-default-100/10 absolute inset-0 animate-pulse rounded-md" />
        )}
        <HeroImage
          width={width}
          height={height}
          src={finalSrc}
          loading={loading}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={twMerge(
            "object-cover transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0",
            className,
          )}
          {...rest}
        />
      </div>
    );
  },
);

export default Image;
