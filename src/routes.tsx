import { lazy, Suspense, type ReactElement } from "react";
import type { RouteObject } from "react-router";

import { Spinner } from "@heroui/react";

import Layout from "./layout";

const DynamicFeed = lazy(() => import("./pages/dynamic-feed"));
const EmptyPage = lazy(() => import("./pages/empty"));
const FollowList = lazy(() => import("./pages/follow-list"));
const History = lazy(() => import("./pages/history"));
const Later = lazy(() => import("./pages/later"));
const MusicRecommend = lazy(() => import("./pages/music-recommend"));
const NotFound = lazy(() => import("./pages/not-found"));
const Search = lazy(() => import("./pages/search"));
const Settings = lazy(() => import("./pages/settings"));
const UserProfile = lazy(() => import("./pages/user-profile"));
const Folder = lazy(() => import("./pages/video-collection"));

const renderPage = (page: ReactElement) => (
  <Suspense
    fallback={
      <div className="flex h-full min-h-48 items-center justify-center" role="status" aria-label="正在加载页面">
        <Spinner size="lg" />
      </div>
    }
  >
    {page}
  </Suspense>
);

const routes: RouteObject[] = [
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: renderPage(<MusicRecommend />),
      },
      {
        path: "later",
        element: renderPage(<Later />),
      },
      {
        path: "history",
        element: renderPage(<History />),
      },
      {
        path: "follow",
        element: renderPage(<FollowList />),
      },
      {
        path: "collection/:id",
        element: renderPage(<Folder />),
      },
      {
        path: "user/:id",
        element: renderPage(<UserProfile />),
      },
      {
        path: "settings",
        element: renderPage(<Settings />),
      },
      {
        path: "dynamic-feed",
        element: renderPage(<DynamicFeed />),
      },
      {
        path: "search",
        element: renderPage(<Search />),
      },
      {
        path: "empty",
        element: renderPage(<EmptyPage />),
      },
    ],
  },
  {
    path: "*",
    element: renderPage(<NotFound />),
  },
];

export default routes;
