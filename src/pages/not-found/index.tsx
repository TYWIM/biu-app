import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

import { useInterval } from "ahooks";

import Empty from "@/components/empty";

/**
 * 路由不匹配处理
 */
const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const [count, setCount] = useState(3);

  useInterval(() => setCount(current => current - 1), 1000);

  useEffect(() => {
    if (count === 0) {
      navigate("/");
    }
  }, [count, navigate]);

  return (
    <div className="h-full w-full">
      <Empty />
    </div>
  );
};

export default NotFound;
