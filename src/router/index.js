import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AdminLayout from '../layouts/AdminLayout.vue'

const routes = [
  // TV (public — no auth required)
  {
    path: '/tv/:id',
    name: 'tv-display',
    component: () => import('../views/TvDisplayView.vue'),
  },

  // Authentication
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
  },

  // Admin (requires auth)
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'admin-dashboard',
        component: () => import('../views/AdminDashboardView.vue'),
      },
      {
        path: 'bloques',
        name: 'admin-blocks',
        component: () => import('../views/AdminBlocksView.vue'),
      },
      {
        path: 'bloques/nuevo',
        name: 'admin-block-create',
        component: () => import('../views/AdminBlockCreateView.vue'),
      },
      {
        path: 'bloques/:id/editar',
        name: 'admin-block-edit',
        component: () => import('../views/AdminBlockCreateView.vue'),
        props: true,
      },
      {
        path: 'clases',
        name: 'admin-classes',
        component: () => import('../views/AdminClassesView.vue'),
      },
      {
        path: 'clases/nueva',
        name: 'admin-class-create',
        component: () => import('../views/AdminClassCreateView.vue'),
      },
      {
        path: 'clases/:id/live',
        name: 'admin-class-live',
        component: () => import('../views/AdminClassLiveView.vue'),
      },
    ],
  },

  // Root redirect
  {
    path: '/',
    redirect: '/login',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return { name: 'login' }
  }

  if (to.name === 'login' && authStore.isLoggedIn) {
    return { name: 'admin-dashboard' }
  }
})

export default router
