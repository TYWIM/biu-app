import type { RouteObject } from "react-router";

import Layout from "./layout";
import DynamicFeed from "./pages/dynamic-feed";
import EmptyPage from "./pages/empty";
import FollowList from "./pages/follow-list";
import History from "./pages/history";
import Later from "./pages/later";
import MusicRecommend from "./pages/music-recommend";
import NotFound from "./pages/not-found";
import Search from "./pages/search";
import Settings from "./pages/settings";
import UserProfile from "./pages/user-profile";
import Folder from "./pages/video-collection";

const routes: RouteObject[] = [
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <MusicRecommend />,
      },
      {
        path: "later",
        element: <Later />,
      },
      {
        path: "history",
        element: <History />,
      },
      {
        path: "follow",
        element: <FollowList />,
      },
      {
        path: "collection/:id",
        element: <Folder />,
      },
      {
        path: "user/:id",
        element: <UserProfile />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
      {
        path: "dynamic-feed",
        element: <DynamicFeed />,
      },
      {
        path: "search",
        element: <Search />,
      },
      {
        path: "empty",
        element: <EmptyPage />,
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
];

export default routes;
