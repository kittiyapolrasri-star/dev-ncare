import axios from 'axios';
import { useAuthStore } from '@/stores/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 seconds timeout
});

// Request interceptor - add auth token
api.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().token;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid - logout
            useAuthStore.getState().logout();
            if (typeof window !== 'undefined') {
                window.location.href = '/auth/login';
            }
        }
        return Promise.reject(error);
    }
);

// API helper functions
export const apiService = {
    // Direct API access
    api,

    // Auth
    login: (email: string, password: string) =>
        api.post('/auth/login', { email, password }),

    getMe: () => api.get('/auth/me'),

    changePassword: (currentPassword: string, newPassword: string) =>
        api.post('/auth/change-password', { currentPassword, newPassword }),

    // Dashboard
    getDashboard: (branchId?: string) =>
        api.get('/dashboard', { params: { branchId } }),

    getCeoDashboard: () => api.get('/dashboard/ceo'),

    // Products
    getProducts: (params?: Record<string, any>) =>
        api.get('/products', { params }),

    getProduct: (id: string) => api.get(`/products/${id}`),

    createProduct: (data: any) => api.post('/products', data),

    updateProduct: (id: string, data: any) => api.put(`/products/${id}`, data),

    deleteProduct: (id: string) => api.delete(`/products/${id}`),

    // Inventory
    getInventory: (params?: Record<string, any>) =>
        api.get('/inventory', { params }),

    receiveInventory: (data: any) => api.post('/inventory/receive', data),

    adjustInventory: (data: any) => api.post('/inventory/adjust', data),

    transferInventory: (data: any) => api.post('/inventory/transfer', data),

    getStockMovements: (params?: Record<string, any>) =>
        api.get('/inventory/movements', { params }),

    // Sales
    getSales: (params?: Record<string, any>) => api.get('/sales', { params }),

    getSale: (id: string) => api.get(`/sales/${id}`),

    createSale: (data: any) => api.post('/sales', data),

    cancelSale: (id: string, reason: string) =>
        api.post(`/sales/${id}/cancel`, { reason }),

    getDailySummary: (branchId?: string, date?: string) =>
        api.get('/sales/summary/daily', { params: { branchId, date } }),

    // OEM
    getOemOrders: (params?: Record<string, any>) =>
        api.get('/oem/orders', { params }),

    getOemOrder: (id: string) => api.get(`/oem/orders/${id}`),

    createOemOrder: (data: any) => api.post('/oem/orders', data),

    updateOemOrder: (id: string, data: any) => api.put(`/oem/orders/${id}`, data),

    receiveOemOrder: (id: string, data: any) =>
        api.post(`/oem/orders/${id}/receive`, data),

    // Reports
    getSalesReport: (params?: Record<string, any>) =>
        api.get('/reports/sales', { params }),

    getInventoryReport: (params?: Record<string, any>) =>
        api.get('/reports/inventory', { params }),

    getTaxReport: (params?: Record<string, any>) =>
        api.get('/reports/tax', { params }),

    getProductPerformance: (params?: Record<string, any>) =>
        api.get('/reports/product-performance', { params }),

    getDistributorReport: (params?: Record<string, any>) =>
        api.get('/reports/distributors', { params }),

    // Branches
    getBranches: () => api.get('/branches'),

    getBranch: (id: string) => api.get(`/branches/${id}`),

    createBranch: (data: any) => api.post('/branches', data),

    updateBranch: (id: string, data: any) => api.put(`/branches/${id}`, data),

    deleteBranch: (id: string) => api.delete(`/branches/${id}`),

    // Suppliers
    getSuppliers: (params?: Record<string, any>) =>
        api.get('/suppliers', { params }),

    getSupplier: (id: string) => api.get(`/suppliers/${id}`),

    createSupplier: (data: any) => api.post('/suppliers', data),

    updateSupplier: (id: string, data: any) => api.put(`/suppliers/${id}`, data),

    deleteSupplier: (id: string) => api.delete(`/suppliers/${id}`),

    // Customers
    getCustomers: (params?: Record<string, any>) =>
        api.get('/customers', { params }),

    getCustomer: (id: string) => api.get(`/customers/${id}`),

    createCustomer: (data: any) => api.post('/customers', data),

    updateCustomer: (id: string, data: any) => api.put(`/customers/${id}`, data),

    // Distributors
    getDistributors: (params?: Record<string, any>) =>
        api.get('/distributors', { params }),

    getDistributor: (id: string) => api.get(`/distributors/${id}`),

    createDistributor: (data: any) => api.post('/distributors', data),

    updateDistributor: (id: string, data: any) => api.put(`/distributors/${id}`, data),

    // Purchases
    getPurchases: (params?: Record<string, any>) =>
        api.get('/purchases', { params }),

    createPurchase: (data: any) => api.post('/purchases', data),

    // Organizations
    getOrganization: () => api.get('/organizations/current'),

    updateOrganization: (data: any) => api.put('/organizations/current', data),
};

