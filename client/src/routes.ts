import {
    type RouteConfig,
    route,
} from "@react-router/dev/routes";
import { flatRoutes } from "@react-router/fs-routes";

export default [
    route("/", "./routes/home.tsx"),

    // home.tsx jest zdefiniowany wyżej, więc flatRoutes go pomija
    ...(await flatRoutes({ ignoredRouteFiles: ["**/routes/home.tsx"] })),
] satisfies RouteConfig;
