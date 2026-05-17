import { createRouter, createWebHistory } from 'vue-router'
import ListProduitView from './components/BOffice/product/ProduitListView.vue'
import ProduitDetailView from './components/BOffice/product/ProduitDetailView.vue'
import CreateProduitView from './components/BOffice/product/ProduitCreateView.vue'
import ListCategoryView from './components/BOffice/category/CategoryListView.vue'
import CategoryDetailView from './components/BOffice/category/CategoryDetailView.vue'
import CreateCategoryView from './components/BOffice/category/CategoryCreateView.vue'
import ListCustomerView from './components/BOffice/customer/CustomerListView.vue'
import CustomerDetailView from './components/BOffice/customer/CustomerDetailView.vue'
import CreateCustomerView from './components/BOffice/customer/CustomerCreateView.vue'
import OrderListView from './components/BOffice/order/OrderListView.vue'
import OrderDetailView from './components/BOffice/order/OrderDetailView.vue'
import OrderCreateView from './components/BOffice/order/OrderCreateView.vue'
import OrderStateListView from './components/BOffice/order/OrderStateListView.vue'
import CartListView from './components/BOffice/cart/CartListView.vue'
import CartDetailView from './components/BOffice/cart/CartDetailView.vue'
import CartCreateView from './components/BOffice/cart/CartCreateView.vue'
import Login from './components/BOffice/Login.vue'
import ImportCSVView from './components/BOffice/import/ImportCSV1View.vue'
import ImportCSV2View from './components/BOffice/import/ImportCSV2View.vue'
import ImportCSV3View from './components/BOffice/import/ImportCSV3View.vue'
import ImportAllView from './components/BOffice/import/ImportAllView.vue'
import Reset from './components/BOffice/Reset.vue'
import LoginCustomerView from './components/FOffice/LoginCustomerView.vue'
import ProductListFOfficeView from './components/FOffice/ProductListView.vue'
import ProductDetailFOfficeView from './components/FOffice/ProductDetailView.vue'
import CartFOfficeView from './components/FOffice/CartView.vue'
import ImportImagesView from './components/BOffice/import/ImportImagesView.vue'
import AddressFOfficeView from './components/FOffice/AddressView.vue'
import AddressCreateFOfficeView from './components/FOffice/AddressCreateView.vue'
import DashboardView from './components/BOffice/DashboardView.vue'
import ListLoginView from './components/FOffice/ListLoginView.vue'
import OrderListFOfficeView from './components/FOffice/OrderListView.vue'
import OrderDetailFOfficeView from './components/FOffice/OrderDetailView.vue'

const routes = [
  {
    path: '/',
    name: 'login',
    component: Login,
  },
    {
    path: '/reset',
    name: 'reset',
    component: Reset,
  },
  {
    path: '/products',
    name: 'list',
    component: ListProduitView,
  },
  {
    path: '/products/create',
    name: 'product-create',
    component: CreateProduitView,
  },
  {
    path: '/product/:id',
    name: 'detail',
    component: ProduitDetailView,
  },
  {
    path: '/categories',
    name: 'categories',
    component: ListCategoryView,
  },
  {
    path: '/categories/create',
    name: 'category-create',
    component: CreateCategoryView,
  },
  {
    path: '/categories/:id',
    name: 'category-detail',
    component: CategoryDetailView,
  },
  {
    path: '/customers',
    name: 'customers',
    component: ListCustomerView,
  },
  {
    path: '/customers/create',
    name: 'customer-create',
    component: CreateCustomerView,
  },
  {
    path: '/customers/:id',
    name: 'customer-detail',
    component: CustomerDetailView,
  },
  {
    path: '/orders',
    name: 'orders',
    component: OrderListView,
  },
  {
    path: '/orders/create',
    name: 'order-create',
    component: OrderCreateView,
  },
  {
    path: '/orders/:id',
    name: 'order-detail',
    component: OrderDetailView,
  },
  {
    path: '/order-states',
    name: 'order-states',
    component: OrderStateListView,
  },
  {
    path: '/carts',
    name: 'carts',
    component: CartListView,
  },
  {
    path: '/carts/create',
    name: 'cart-create',
    component: CartCreateView,
  },
  {
    path: '/carts/:id',
    name: 'cart-detail',
    component: CartDetailView,
  },
  {
    path: '/import',
    name: 'import-csv',
    component: ImportCSVView,
  },
  {
    path: '/import2',
    name: 'import-csv2',
    component: ImportCSV2View,
  },
  {
    path: '/import3',
    name: 'import-csv3',
    component: ImportCSV3View,
  },
  {
    path: '/import-all',
    name: 'import-all',
    component: ImportAllView,
  },
  {
    path: '/fo/login',
    name: 'fo-login',
    component: LoginCustomerView,
  },
  {
    path: '/fo',
    name: 'fo-loginlist',
    component: ListLoginView,
  },
  {
    path: '/fo/products',
    name: 'fo-products',
    component: ProductListFOfficeView,
  },
  {
    path: '/fo/products/:id',
    name: 'fo-product-detail',
    component: ProductDetailFOfficeView,
  },
  {
    path: '/fo/cart',
    name: 'fo-cart',
    component: CartFOfficeView,
  },
  {
    path: '/fo/orders',
    name: 'fo-orders',
    component: OrderListFOfficeView,
  },
  {
    path: '/fo/orders/:id',
    name: 'fo-order-detail',
    component: OrderDetailFOfficeView,
  },
  {
    path: '/fo/address',
    name: 'fo-address',
    component: AddressFOfficeView,
  },
  {
    path: '/fo/address/create',
    name: 'fo-address-create',
    component: AddressCreateFOfficeView,
  },
  {
    path: '/import-images',
    name: 'import-images',
    component: ImportImagesView,
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: DashboardView,
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
