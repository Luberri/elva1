import JSZip from 'jszip'
import { getAllProducts } from '../productService.js'
import { uploadImage } from '../imageService.js'

const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp'])

function getExtension(filename) {
	const idx = filename.lastIndexOf('.')
	if (idx === -1) return ''
	return filename.slice(idx).toLowerCase()
}

function getReferenceFromFilename(filename) {
	const parts = filename.split('/').filter(Boolean)
	const base = parts[parts.length - 1] || ''
	if (base.startsWith('._') || base.startsWith('.DS_Store')) return ''
	const ext = getExtension(base)
	return ext ? base.slice(0, -ext.length) : base
}

export async function importImagesFromZip(zipFile) {
	if (!zipFile) throw new Error('Fichier zip manquant')

	const zip = await JSZip.loadAsync(zipFile)
	const products = await getAllProducts()
	const productMap = new Map(
		products
			.filter(p => p.reference)
			.map(p => [p.reference.trim().toLowerCase(), p])
	)

	const results = {
		uploaded: 0,
		skipped: 0,
		missing: [],
		errors: []
	}

	const files = Object.values(zip.files)
	for (const entry of files) {
		if (entry.dir) continue

		const ext = getExtension(entry.name)
		if (!allowedExtensions.has(ext)) {
			results.skipped++
			continue
		}

		const reference = getReferenceFromFilename(entry.name).trim().toLowerCase()
		if (!reference) {
			results.skipped++
			continue
		}

		const product = productMap.get(reference)
		if (!product) {
			results.missing.push(reference)
			continue
		}

		try {
			const blob = await entry.async('blob')
			const file = new File([blob], `${reference}${ext}`, { type: blob.type || 'image/jpeg' })
			await uploadImage('products', product.id, file)
			results.uploaded++
		} catch (err) {
			results.errors.push(`${entry.name}: ${err.message || err}`)
		}
	}

	return results
}
