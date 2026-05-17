<template>
  <section class="cart-section">
    <header class="header">
      <h1>Mon panier</h1>
      <RouterLink to="/fo/products" class="btn btn-secondary">Retour aux produits</RouterLink>
    </header>

    <p v-if="error" class="error-msg">{{ error }}</p>
    <p v-if="loading">Chargement...</p>

    <div v-if="!loading && cart" class="card">
      <p class="meta">Panier #{{ cart.id }}</p>

      <div class="checkout">
        <label class="form-label" v-if="openCarts.length">Panier</label>
        <select class="form-select " v-if="openCarts.length" v-model="selectedCartId" @change="handleSelectCart">
          <option v-for="item in openCarts" :key="item.id" :value="String(item.id)">
            Panier #{{ item.id }}
          </option>
        </select>
        <template v-if="!isAnonymous">
        <label class="form-label">Adresse de livraison</label>
        <select class="form-select " v-model="selectedAddressId" :disabled="!addresses.length">
          <option value="">Choisir une adresse</option>
          <option v-for="addr in addresses" :key="addr.id" :value="String(addr.id)">
            {{ addr.alias }} - {{ addr.address1 }} {{ addr.city }}
          </option>
        </select>
        </template>
        <p v-else class="info-msg">Connectez-vous pour commander.</p>
        <label class="form-label">Transporteur</label>
        <select class="form-select " v-model="selectedCarrierId" :disabled="!carriers.length">
          <option value="">Choisir un transporteur</option>
          <option v-for="carrier in carriers" :key="carrier.id" :value="String(carrier.id)">
            {{ carrier.name || carrier.id }}
          </option>
        </select>
        <label class="form-label">Methode de paiement</label>
        <select class="form-select " v-model="paymentMethod">
          <option value="Payer comptant a la livraison">Payer comptant a la livraison</option>
          <option value="Payer par cheque">Payer par cheque</option>
          <option value="Payer par virement bancaire">Payer par virement bancaire</option>
        </select>
        <template v-if="paymentMethod === 'Card'">
          <label class="form-label">Numero de carte</label>
          <input v-model.trim="cardNumber" type="text" placeholder="XXXX XXXX XXXX XXXX" />
          <label class="form-label">Marque</label>
          <input v-model.trim="cardBrand" type="text" placeholder="Visa" />
          <label class="form-label">Expiration</label>
          <input v-model.trim="cardExpiration" type="text" placeholder="MM/AA" />
          <label class="form-label">Titulaire</label>
          <input v-model.trim="cardHolder" type="text" placeholder="Nom complet" />
        </template>
        <RouterLink v-if="!addresses.length" to="/fo/address/create" class="btn btn-secondary">
          Ajouter une adresse
        </RouterLink>
        <button class="btn btn-primary" :disabled="ordering || isAnonymous || !selectedAddressId || !selectedCarrierId" @click="handleOrder">
          {{ ordering ? 'Commande...' : 'Commander' }}
        </button>
      </div>

      <table v-if="cartRows.length" class="table">
        <thead>
          <tr>
            <th>Produit</th>
            <th>Declinaison</th>
            <th>Quantite</th>
            <th>Prix TTC</th>
            <th>Total TTC</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in cartRows" :key="idx">
            <td>{{ getProductName(row.id_product) }}</td>
            <td>{{ row.id_product_attribute || 0 }}</td>
            <td>{{ row.quantity }}</td>
            <td>{{ getRowPriceTtc(row) }}</td>
            <td>{{ getRowTotalTtc(row) }}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" class="total-label">Total panier</td>
            <td class="total-value">{{ cartTotalTtc }}</td>
          </tr>
        </tfoot>
      </table>
      <p v-else>Votre panier est vide.</p>
    </div>

    <p v-else-if="!loading">Aucun panier en cours.</p>
    <p v-if="orderMessage" class="success-msg">{{ orderMessage }}</p>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { deleteCart, getCartByCustomer, getCartDetail, getOpenCartsByCustomer, updateCart } from '../../service/cartService.js'
import { getAllProducts, getPriceTtcWithImpact, parsePriceValue } from '../../service/productService.js'
import { getCombinationsByProduct } from '../../service/combinationService.js'
import { getTaxRateForGroup } from '../../service/taxeService.js'
import { getAddressesByCustomer } from '../../service/addressService.js'
import { createOrder, createOrderHistory, createOrderPayment, getOrderDetail } from '../../service/orderService.js'
import { getAllCarriers } from '../../service/carrierService.js'
import { DEFAULT_CURRENCY_ID, DEFAULT_CURRENCY_NAME } from '../../api/util.js'

const loading = ref(false)
const error = ref('')
const cart = ref(null)
const productMap = ref(new Map())
const taxRateMap = ref(new Map())
const combinationMap = ref(new Map())
const addresses = ref([])
const selectedAddressId = ref('')
const openCarts = ref([])
const selectedCartId = ref('')
const carriers = ref([])
const selectedCarrierId = ref('')
const paymentMethod = ref('Payer comptant a la livraison')
const cardNumber = ref('')
const cardBrand = ref('')
const cardExpiration = ref('')
const cardHolder = ref('')
const ordering = ref(false)
const orderMessage = ref('')
const customer = ref(null)
const isAnonymous = computed(() => !customer.value?.id || customer.value?.is_anonymous)

const cartRows = computed(() => cart.value?.cartRows || [])
const totalProductsHt = computed(() => {
  const total = cartRows.value.reduce((sum, row) => {
    const product = productMap.value.get(String(row.id_product))
    if (!product) return sum
    const comb = combinationMap.value.get(String(row.id_product_attribute || 0))
    const impact = comb ? parsePriceValue(comb.price) : 0
    const unitHt = parsePriceValue(product.price) + impact
    const qty = Number(row.quantity || 0)
    return sum + (Number.isFinite(unitHt) ? unitHt * qty : 0)
  }, 0)

  return Number.isFinite(total) ? total : 0
})
const cartTotalTtc = computed(() => {
  const total = cartRows.value.reduce((sum, row) => {
    const unit = parsePriceValue(getRowPriceTtc(row))
    const qty = Number(row.quantity || 0)
    return sum + (Number.isFinite(unit) ? unit * qty : 0)
  }, 0)

  return formatPrice(total)
})

function getProductName(productId) {
  const product = productMap.value.get(String(productId))
  return product?.titre || productId || '-'
}

function formatPrice(value) {
  return `${value.toFixed(2)} ${DEFAULT_CURRENCY_NAME}`
}

function getRowPriceTtc(row) {
  const product = productMap.value.get(String(row.id_product))
  if (!product) return '-'
  const rate = taxRateMap.value.get(String(product.id_tax_rules_group)) || 0
  const comb = combinationMap.value.get(String(row.id_product_attribute || 0))
  const impact = comb ? parsePriceValue(comb.price) : 0
  const ttc = getPriceTtcWithImpact(product.price, rate, impact)
  return formatPrice(ttc)
}

function getRowTotalTtc(row) {
  const unit = parsePriceValue(getRowPriceTtc(row))
  const qty = Number(row.quantity || 0)
  if (!Number.isFinite(unit)) return '-'
  return formatPrice(unit * qty)
}

async function loadCart() {
  error.value = ''
  loading.value = true
  orderMessage.value = ''

  try {
    const stored = JSON.parse(localStorage.getItem('customer') || 'null')
    customer.value = stored

    if (stored?.id) {
      const carts = await getOpenCartsByCustomer(stored.id)
      openCarts.value = carts
      if (carts.length) {
        const localId = localStorage.getItem('fo_cart_id')
        const selected = carts.find(c => String(c.id) === String(localId)) || carts[0]
        cart.value = selected
        selectedCartId.value = String(selected.id)
        localStorage.setItem('fo_cart_id', String(selected.id))
      }
    }

    if (!cart.value) {
      const cartId = localStorage.getItem('fo_cart_id')
      if (cartId) {
        cart.value = await getCartDetail(cartId)
        if (cart.value && stored?.id && String(cart.value.id_customer) !== String(stored.id)) {
          cart.value = null
          localStorage.removeItem('fo_cart_id')
        }
      }
    }

    if (!cart.value) {
      return
    }

    const products = await getAllProducts({ filters: {} })
    productMap.value = new Map(
      products.map(p => [String(p.id), p])
    )

    const productIds = [...new Set(
      (cart.value?.cartRows || []).map(r => String(r.id_product))
    )]

    const combinationLists = await Promise.all(
      productIds.map(async (id) => getCombinationsByProduct(id))
    )
    const allCombinations = combinationLists.flat()
    combinationMap.value = new Map(
      allCombinations.map(c => [String(c.id), c])
    )

    const groupIds = [...new Set(
      products.map(p => String(p.id_tax_rules_group || '0'))
    )]

    const entries = await Promise.all(
      groupIds.map(async (id) => {
        const rate = await getTaxRateForGroup(id)
        return [id, rate]
      })
    )
    taxRateMap.value = new Map(entries)

    if (stored?.id) {
      const addr = await getAddressesByCustomer(stored.id)
      addresses.value = addr
      if (addr.length && !selectedAddressId.value) {
        selectedAddressId.value = String(addr[0].id)
      }
    }

    const carriersData = await getAllCarriers({ filters: {} })
    carriers.value = carriersData
    if (carriersData.length && !selectedCarrierId.value) {
      selectedCarrierId.value = String(carriersData[0].id)
    }
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

async function handleOrder() {
  error.value = ''
  orderMessage.value = ''

  if (isAnonymous.value) {
    error.value = 'Connectez-vous pour commander'
    return
  }
  if (!customer.value?.id) {
    error.value = 'Client non connecte'
    return
  }
  if (!selectedAddressId.value) {
    error.value = 'Adresse requise'
    return
  }
  if (!selectedCarrierId.value) {
    error.value = 'Transporteur requis'
    return
  }
  if (!cart.value?.id) {
    error.value = 'Panier introuvable'
    return
  }

  ordering.value = true
  try {
    const idCurrency = cart.value.id_currency || DEFAULT_CURRENCY_ID
    const idLang = cart.value.id_lang || 1
    const idCarrier = selectedCarrierId.value || cart.value.id_carrier || 1

    const totalProductsWt = parsePriceValue(cartTotalTtc.value)
    const totalProductsHtValue = totalProductsHt.value

    await updateCart(cart.value.id, {
      id_currency: idCurrency,
      id_lang: idLang,
      id_customer: customer.value.id,
      id_address_delivery: selectedAddressId.value,
      id_address_invoice: selectedAddressId.value,
      id_carrier: idCarrier,
      cartRows: cart.value.cartRows || []
    })

    const orderRes = await createOrder({
      id_address_delivery: selectedAddressId.value,
      id_address_invoice: selectedAddressId.value,
      id_cart: cart.value.id,
      id_currency: idCurrency,
      id_lang: idLang,
      id_customer: customer.value.id,
      id_carrier: idCarrier,
      secure_key: customer.value.secure_key,
      module: 'ps_wirepayment',
      payment: 'Cheque',
      total_paid: totalProductsWt.toFixed(6),
      total_paid_real: totalProductsWt.toFixed(6),
      total_products: totalProductsHtValue.toFixed(6),
      total_products_wt: totalProductsWt.toFixed(6),
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

    const orderDetail = await getOrderDetail(orderId)
    const orderReference = orderDetail?.reference
    if (!orderReference) throw new Error('Reference de commande introuvable')

    await createOrderPayment({
      order_reference: orderReference,
      id_currency: idCurrency,
      amount: totalProductsWt.toFixed(6),
      payment_method: paymentMethod.value,
      conversion_rate: 1,
      transaction_id: String(orderId),
      id_employee: 1,
      card_number: paymentMethod.value === 'Card' ? cardNumber.value : undefined,
      card_brand: paymentMethod.value === 'Card' ? cardBrand.value : undefined,
      card_expiration: paymentMethod.value === 'Card' ? cardExpiration.value : undefined,
      card_holder: paymentMethod.value === 'Card' ? cardHolder.value : undefined
    })

    orderMessage.value = `Commande creee : ${orderReference}`
    try {
      await deleteCart(cart.value.id)
    } catch (deleteError) {
      console.warn('Suppression du panier impossible apres commande:', deleteError)
    }
    cart.value = null
    localStorage.removeItem('fo_cart_id')
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    ordering.value = false
  }
}

async function handleDeleteCart() {
  error.value = ''
  orderMessage.value = ''

  if (!cart.value?.id) {
    error.value = 'Panier introuvable'
    return
  }

  ordering.value = true
  try {
    await deleteCart(cart.value.id)
    cart.value = null
    localStorage.removeItem('fo_cart_id')
    orderMessage.value = 'Panier supprime.'
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    ordering.value = false
  }
}

async function handleSelectCart() {
  if (!selectedCartId.value) return

  try {
    cart.value = await getCartDetail(selectedCartId.value)
    localStorage.setItem('fo_cart_id', String(selectedCartId.value))
  } catch (e) {
    error.value = e?.message || String(e)
  }
}

onMounted(() => {
  loadCart()
})
</script>

<style scoped>
.cart-section {
  padding: 16px;
  max-width: 900px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  padding: 16px;
}

.meta {
  color: #666;
  margin-bottom: 12px;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  border-bottom: 1px solid #eee;
  padding: 8px 6px;
  text-align: left;
}

.total-label {
  text-align: right;
  font-weight: 600;
}

.total-value {
  font-weight: 700;
}

.checkout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  margin-bottom: 16px;
  max-width: 420px;
}

.checkout label {
  font-weight: 600;
  color: #555;
}

.checkout select {
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.btn-primary {
  background: #3f51b5;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #3646a3;
}

.success-msg {
  color: #0f5132;
  background: #d1e7dd;
  padding: 10px;
  border-radius: 4px;
  margin-top: 10px;
}

.btn {
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  text-decoration: none;
}

.btn-secondary {
  background: #e0e0e0;
  color: #333;
}

.error-msg {
  color: #d32f2f;
  background-color: #ffebee;
  padding: 10px;
  border-radius: 4px;
}

.info-msg {
  color: #0f5132;
  background-color: #d1e7dd;
  padding: 8px;
  border-radius: 4px;
}
</style>

