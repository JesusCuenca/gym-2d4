import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "../stores/auth";
import { useUserStore } from "../stores/userStore";
import AdminLayout from "../layouts/AdminLayout.vue";

const routes = [
  // TV (public — no auth required)
  {
    path: "/tv/:id",
    name: "tv-display",
    component: () => import("../views/TvDisplayView.vue"),
  },

  // Authentication
  {
    path: "/login",
    name: "login",
    component: () => import("../views/LoginView.vue"),
  },

  // Admin (requires auth)
  {
    path: "/admin",
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: "",
        name: "admin-dashboard",
        component: () => import("../views/AdminDashboardView.vue"),
      },
      {
        path: "bloques",
        name: "admin-blocks",
        component: () => import("../views/AdminBlocksView.vue"),
      },
      {
        path: "bloques/nuevo",
        name: "admin-block-create",
        component: () => import("../views/AdminBlockCreateView.vue"),
      },
      {
        path: "bloques/:id/editar",
        name: "admin-block-edit",
        component: () => import("../views/AdminBlockCreateView.vue"),
        props: true,
      },
      {
        path: "clases",
        name: "admin-classes",
        component: () => import("../views/AdminClassesView.vue"),
      },
      {
        path: "clases/nueva",
        name: "admin-class-create",
        component: () => import("../views/AdminClassCreateView.vue"),
      },
      {
        path: "clases/:id/editar",
        name: "admin-class-edit",
        component: () => import("../views/AdminClassCreateView.vue"),
        props: true,
      },
      {
        path: "clases/:id/live",
        name: "admin-class-live",
        component: () => import("../views/AdminClassLiveView.vue"),
      },
      {
        path: "pantallas",
        name: "admin-screens",
        component: () => import("../views/AdminScreensView.vue"),
      },
      {
        path: "perfil/setup",
        name: "admin-profile-setup",
        component: () => import("../views/AdminProfileSetupView.vue"),
        meta: { isOnboarding: true },
      },
      {
        path: "perfil",
        name: "admin-profile",
        component: () => import("../views/AdminProfileView.vue"),
      },
    ],
  },

  // Root redirect
  {
    path: "/",
    redirect: "/login",
  },

  // 404 catch-all
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: () => import("../views/NotFoundView.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const authStore = useAuthStore();
  const userStore = useUserStore();

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return { name: "login" };
  }

  if (to.name === "login" && authStore.isLoggedIn) {
    return { name: "admin-dashboard" };
  }

  if (to.meta.requiresAuth && authStore.isLoggedIn && !userStore.hasProfile && !to.meta.isOnboarding) {
    return { name: "admin-profile-setup" };
  }

  if (to.meta.isOnboarding && userStore.hasProfile) {
    return { name: "admin-dashboard" };
  }
});

export default router;
