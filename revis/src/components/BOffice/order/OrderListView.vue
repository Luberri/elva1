<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {createOrder,createOrderHistory,deleteOrder,getAllOrders,getAllOrderStates,isCartOrdered} from '../../../service/orderService.js'
import { getAllCustomers } from '../../../service/customerService.js'
import { getAllCarts } from '../../../service/cartService.js'
import { getAllProducts, getPriceTtcWithImpact, parsePriceValue } from '../../../service/productService.js'
import { getCombinationsByProduct } from '../../../service/combinationService.js'
import { getTaxRateForGroup } from '../../../service/taxeService.js'
import { DEFAULT_CURRENCY_ID } from '../../../api/util.js'

const loading = ref(false)
const error = ref('')
const rows = ref([])
const orderStateMap = ref(new Map())
const orderStates = ref([])
const updatingOrderId = ref(null)
const customerMap = ref(new Map())
const openCarts = ref([])
const creatingCartId = ref(null)

async function loadOrders() {
	error.value = ''
	loading.value = true
	try {
		const [orders, states, customers, carts] = await Promise.all([
			getAllOrders({ filters: {} }),
			getAllOrderStates({ filters: {} }),
			getAllCustomers({ filters: {} }),
			getAllCarts({ filters: {} })
		])
		rows.value = orders
		orderStates.value = states
		orderStateMap.value = new Map(
			states.map(s => [String(s.id), s])
		)
		customerMap.value = new Map(
			customers.map(c => [String(c.id), c])
		)

		const checks = await Promise.all(
			carts.map(async (cart) => ({
				cart,
				ordered: await isCartOrdered(cart.id)
			}))
		)

		openCarts.value = checks
			.filter(item => !item.ordered)
			.map(item => item.cart)
	} catch (e) {
		error.value = e?.message || String(e)
	} finally {
		loading.value = false
	}
}

function getOrderStateLabel(stateId) {
	const state = orderStateMap.value.get(String(stateId))
	if (!state) return '-'
	return state.name || state.id
}

function getOrderStateColor(stateId) {
	const state = orderStateMap.value.get(String(stateId))
	return state?.color || 'transparent'
}

function getCustomerName(customerId) {
	const customer = customerMap.value.get(String(customerId))
	if (!customer) return '-'
	return `${customer.firstname || ''} ${customer.lastname || ''}`.trim() || customer.id
}

function formatDate(value) {
	if (!value) return '-'
	return String(value).split(' ')[0]
}

async function computeCartTotals(cart) {
	const rows = Array.isArray(cart?.cartRows) ? cart.cartRows : []
	if (!rows.length) return { totalHt: 0, totalTtc: 0 }

	const products = await getAllProducts({ filters: {} })
	const productMap = new Map(products.map(p => [String(p.id), p]))

	const productIds = [...new Set(rows.map(r => String(r.id_product)))]
	const combinationLists = await Promise.all(
		productIds.map(id => getCombinationsByProduct(id))
	)
	const combinationMap = new Map(
		combinationLists.flat().map(c => [String(c.id), c])
	)

	const groupIds = [...new Set(
		rows
			.map(r => productMap.get(String(r.id_product)))
			.filter(Boolean)
			.map(p => String(p.id_tax_rules_group || '0'))
	)]

	const groupRates = await Promise.all(
		groupIds.map(async (id) => {
			const rate = await getTaxRateForGroup(id)
			return [id, rate]
		})
	)
	const taxRateMap = new Map(groupRates)

	let totalHt = 0
	let totalTtc = 0

	for (const row of rows) {
		const product = productMap.get(String(row.id_product))
		if (!product) continue
		const rate = taxRateMap.get(String(product.id_tax_rules_group)) || 0
		const comb = combinationMap.get(String(row.id_product_attribute || 0))
		const impact = comb ? parsePriceValue(comb.price) : 0
		const baseHt = parsePriceValue(product.price)
		const unitHt = baseHt + impact
		const unitTtc = getPriceTtcWithImpact(baseHt, rate, impact)
		const qty = Number(row.quantity || 0)
		if (!Number.isFinite(qty) || qty <= 0) continue
		totalHt += unitHt * qty
		totalTtc += unitTtc * qty
	}

	return { totalHt, totalTtc }
}

async function handleCreateFromCart(cart) {
	creatingCartId.value = cart.id
	error.value = ''

	try {
		if (!cart?.id) throw new Error('Panier introuvable')
		if (!cart?.id_customer) throw new Error('Client manquant pour la commande')
		const idAddressDelivery = cart.id_address_delivery || cart.id_address_invoice
		const idAddressInvoice = cart.id_address_invoice || cart.id_address_delivery
		if (!idAddressDelivery || !idAddressInvoice) {
			throw new Error('Adresse de livraison/facturation manquante')
		}

		const totals = await computeCartTotals(cart)
		const totalHt = totals.totalHt
		const totalTtc = totals.totalTtc

		const orderRes = await createOrder({
			id_address_delivery: idAddressDelivery,
			id_address_invoice: idAddressInvoice,
			id_cart: cart.id,
			id_currency: cart.id_currency || DEFAULT_CURRENCY_ID,
			id_lang: cart.id_lang || 1,
			id_customer: cart.id_customer,
			id_carrier: 1,
			secure_key: '',
			module: 'ps_wirepayment',
			payment: 'Bank wire',
			total_paid: totalTtc.toFixed(6),
			total_paid_real: totalTtc.toFixed(6),
			total_products: totalHt.toFixed(6),
			total_products_wt: totalTtc.toFixed(6),
			conversion_rate: 1,
			current_state: 13
		})

		const orderId = orderRes?.prestashop?.order?.id
		if (!orderId) throw new Error('Creation de commande echouee')

		await createOrderHistory({
			id_order: orderId,
			id_order_state: 13,
			id_employee: 1
		})

		await loadOrders()
	} catch (e) {
		error.value = e?.message || String(e)
	} finally {
		creatingCartId.value = null
	}
}

async function handleStateChange(order, newStateId) {
	if (!newStateId || String(newStateId) === String(order.current_state)) return

	const confirmed = confirm('Voulez-vous vraiment changer le statut de cette commande ?')
	if (!confirmed) return

	updatingOrderId.value = order.id
	error.value = ''
	try {
		await createOrderHistory({
			id_order: order.id,
			id_order_state: newStateId,
			id_employee: 1
		})
		order.current_state = String(newStateId)
	} catch (e) {
		error.value = e?.message || String(e)
	} finally {
		updatingOrderId.value = null
	}
}

async function handleDelete(id) {
	if (!confirm('Voulez-vous vraiment supprimer cette commande ?')) return
	try {
		loading.value = true
		await deleteOrder(id)
		await loadOrders()
	} catch (e) {
		error.value = e?.message || String(e)
	} finally {
		loading.value = false
	}
}

onMounted(() => {
	loadOrders()
})

const orderList = computed(() => rows.value)
</script>

<template>
	<section class="list-section">
		<header class="header">
			<h1>Commandes</h1>
			<div class="actions">
				<RouterLink to="/order-states" class="btn btn-secondary">Etats de commande</RouterLink>
				<RouterLink to="/orders/create" class="btn btn-primary">Créer une commande</RouterLink>
				<button class="btn btn-secondary" :disabled="loading" @click="loadOrders">
					{{ loading ? 'Chargement…' : 'Recharger' }}
				</button>
			</div>
		</header>

		<p v-if="error" class="error-msg">{{ error }}</p>
		<p v-if="loading">Chargement…</p>

		<table v-else-if="orderList.length" class="table">
			<thead>
				<tr>
					<th>ID</th>
					<th>Référence</th>
					<th>Client</th>
					<th>Total Payé</th>
					<th>Paiement</th>
					<th>Statut</th>
					<th>Date</th>
					<th>Actions</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="o in orderList" :key="o.id">
					<td>
						<RouterLink :to="{ name: 'order-detail', params: { id: o.id } }">
							{{ o.id }}
						</RouterLink>
					</td>
					<td>{{ o.reference || '-' }}</td>
					<td>{{ getCustomerName(o.id_customer) }}</td>
					<td>{{ o.total_paid }}</td>
					<td>{{ o.payment }}</td>
					<td>
						<select
							:disabled="loading || updatingOrderId === o.id"
							:value="String(o.current_state)"
							:style="{ backgroundColor: getOrderStateColor(o.current_state) }"
							@change="handleStateChange(o, $event.target.value)"
						>
							<option v-for="state in orderStates" :key="state.id" :value="String(state.id)">
								{{ state.name || state.id }}
							</option>
						</select>
					</td>
					<td>{{ o.date_add }}</td>
					<td>
						<button @click="handleDelete(o.id)" class="btn btn-danger">Supprimer</button>
					</td>
				</tr>
			</tbody>
		</table>
		<p v-else>Aucune commande existante.</p>

		<div class="pending-section">
			<h2>Paniers non commandes</h2>
			<table v-if="openCarts.length" class="table">
				<thead>
					<tr>
						<th>ID Panier</th>
						<th>Client</th>
						<th>Date</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="cart in openCarts" :key="cart.id">
						<td>{{ cart.id }}</td>
						<td>{{ getCustomerName(cart.id_customer) }}</td>
						<td>{{ formatDate(cart.date_add) }}</td>
						<td>
							<button
								class="btn btn-primary"
								:disabled="creatingCartId === cart.id"
								@click="handleCreateFromCart(cart)"
							>
								{{ creatingCartId === cart.id ? 'Creation...' : 'Commander' }}
							</button>
						</td>
					</tr>
				</tbody>
			</table>
			<p v-else>Aucun panier en attente.</p>
		</div>
	</section>
</template>

<style scoped>
.list-section { padding: 16px; }
.header {
	display: flex;
	justify-content: space-between;
	margin-bottom: 20px;
}
.actions {
	display: flex;
	gap: 10px;
}

.pending-section {
	margin-top: 24px;
}

</style>