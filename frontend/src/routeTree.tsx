import { createRootRoute, createRoute, redirect, Outlet } from "@tanstack/react-router"
import Layout from "./components/layout/Layout"
import Home from "./pages/Home"
import Login from "./pages/Login"
import Apply from "./pages/Apply"
import TeacherApply from "./pages/TeacherApply"
import InstructorApply from "./pages/InstructorApply"
import PublicProfile from "./pages/PublicProfile"
import Dashboard from "./pages/Dashboard"
import Leads from "./pages/Leads"
import Tasks from "./pages/Tasks"
import Network from "./pages/Network"
import Materials from "./pages/Materials"
import TeacherPortal from "./pages/TeacherPortal"
import Leaderboard from "./pages/Leaderboard"
import Profile from "./pages/Profile"
import Admin from "./pages/Admin"
import AdminAmbassador from "./pages/AdminAmbassador"
import TeacherProfile from "./pages/TeacherProfile"

const rootRoute = createRootRoute({ component: Outlet })

// ── Public routes ─────────────────────────────────────────────
const loginRoute = createRoute({ getParentRoute: () => rootRoute, path: "/login", component: Login })
const applyRoute = createRoute({ getParentRoute: () => rootRoute, path: "/apply", component: Apply })
const teacherApplyRoute = createRoute({ getParentRoute: () => rootRoute, path: "/teacher-apply", component: TeacherApply })
const teacherApplyWithCodeRoute = createRoute({ getParentRoute: () => rootRoute, path: "/teacher-apply/$code", component: TeacherApply })
const inviteRoute = createRoute({ getParentRoute: () => rootRoute, path: "/invite/$code", component: InstructorApply })
const publicProfileRoute = createRoute({ getParentRoute: () => rootRoute, path: "/a/$ambassadorId", component: PublicProfile })
const publicTeacherRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/t/$teacherId",
  component: () => <PublicProfile kind="teacher" />,
})

// ── Authenticated layout ──────────────────────────────────────
const layoutRoute = createRoute({
  id: "_layout",
  getParentRoute: () => rootRoute,
  component: Layout,
  beforeLoad: () => {
    if (!localStorage.getItem("access_token")) {
      throw redirect({ to: "/login" })
    }
  },
})

const homeRoute = createRoute({ getParentRoute: () => layoutRoute, path: "/", component: Home })
const dashboardRoute = createRoute({ getParentRoute: () => layoutRoute, path: "/dashboard", component: Dashboard })
const leadsRoute = createRoute({ getParentRoute: () => layoutRoute, path: "/leads", component: Leads })
const tasksRoute = createRoute({ getParentRoute: () => layoutRoute, path: "/tasks", component: Tasks })
const networkRoute = createRoute({ getParentRoute: () => layoutRoute, path: "/network", component: Network })
const materialsRoute = createRoute({ getParentRoute: () => layoutRoute, path: "/materials", component: Materials })
const teacherRoute = createRoute({ getParentRoute: () => layoutRoute, path: "/teacher", component: TeacherPortal })
const leaderboardRoute = createRoute({ getParentRoute: () => layoutRoute, path: "/leaderboard", component: Leaderboard })
const profileRoute = createRoute({ getParentRoute: () => layoutRoute, path: "/profile", component: Profile })
const adminRoute = createRoute({ getParentRoute: () => layoutRoute, path: "/admin", component: Admin })
const adminAmbassadorRoute = createRoute({ getParentRoute: () => layoutRoute, path: "/admin/ambassador/$ambassadorId", component: AdminAmbassador })
const teacherProfileRoute = createRoute({ getParentRoute: () => layoutRoute, path: "/network/teacher/$teacherId", component: TeacherProfile })

export const routeTree = rootRoute.addChildren([
  loginRoute,
  applyRoute,
  teacherApplyRoute,
  teacherApplyWithCodeRoute,
  inviteRoute,
  publicProfileRoute,
  publicTeacherRoute,
  layoutRoute.addChildren([
    homeRoute,
    dashboardRoute,
    leadsRoute,
    tasksRoute,
    networkRoute,
    materialsRoute,
    teacherRoute,
    leaderboardRoute,
    profileRoute,
    adminRoute,
    adminAmbassadorRoute,
    teacherProfileRoute,
  ]),
])
