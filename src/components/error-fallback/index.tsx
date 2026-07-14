import type { FallbackProps } from "react-error-boundary";
import { useNavigate } from "react-router";

import { Button } from "@heroui/react";

import { ReactComponent as ErrorIllustration } from "@/assets/images/error.svg";

const Fallback = ({ resetErrorBoundary }: FallbackProps) => {
  const navigate = useNavigate();

  const openIssuePage = () => {
    const url = "https://github.com/TYWIM/biu-app/issues";
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="bg-content1 flex h-full w-full flex-col items-center justify-center gap-5 px-6 text-center">
      <ErrorIllustration className="h-auto w-full max-w-70" aria-hidden="true" />
      <div className="flex items-center gap-2">
        <Button className="min-h-11" onPress={openIssuePage}>
          反馈
        </Button>
        <Button
          color="primary"
          className="min-h-11"
          onPress={() => {
            navigate("/");
            resetErrorBoundary();
          }}
        >
          回到首页
        </Button>
      </div>
    </div>
  );
};
export default Fallback;
