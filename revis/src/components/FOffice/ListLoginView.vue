<script setup>
    import { computed, ref ,onMounted } from 'vue'
    import { useRouter } from 'vue-router'
    import { getAllCustomers ,loginCustomer } from '../../service/customerService';

    const router = useRouter()
    const rows = ref([])

    async function charger() {
        try {
            const customers = await getAllCustomers({ filters: {} })
            rows.value = customers
        } catch (e) {
            console.error(e)
        }
    }
    onMounted(() => {
        charger()
    })
    const handleLogin = async (email, password ,is_hash) => {
        try {
            const customer = await loginCustomer(email, password ,is_hash)
            if (customer) {
                localStorage.setItem('customer', JSON.stringify(customer))
                router.push('/fo/products')
            }
        } catch (e) {
            console.error('Login error:', e)
        }
    }
    const list = computed(() => rows.value)
</script>
<template>
    <div class="container">
        <table class="table">
            <thead>

                <tr>
                    <th>Firstname</th>
                    <th>Email</th>
                    <th>Password</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="value in list" :key="value.id">
                    <td>{{ value.firstname }}</td>
                    <td>{{ value.email }}</td>
                    <td>{{ value.passwd }}</td>
                    <td><button @click="handleLogin(value.email, value.passwd ,false)" class="btn btn-primary">Login</button></td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
