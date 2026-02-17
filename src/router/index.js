import { createRouter, createWebHistory } from 'vue-router'

import AdminLayout from '../layouts/AdminLayout.vue'

const routes = [
  // TV (público)
  {
    path: '/tv/:id',
    name: 'tv-display',
    component: () => import('../views/TvDisplayView.vue'),
  },

  // Autenticación
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/LoginView.vue'),
  },

  // Administración
  {
    path: '/admin',
    component: AdminLayout,
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

  // Redirect raíz al login
  {
    path: '/',
    redirect: '/login',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
