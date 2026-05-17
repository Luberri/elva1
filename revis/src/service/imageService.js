import axios from 'axios'
import { get, del, xmlToJson, getPrestashopFetchConfig } from '../api/util.js'

/**
 * Récupérer la liste des images pour une ressource.
 * Ex: getImagesList('products') -> Liste des IDs de produits ayant des images
 * Ex: getImagesList('products', 1) -> Liste des images du produit 1
 */
export async function getImagesList(resource = 'products', id = null) {
  const endpoint = id ? `images/${resource}/${id}` : `images/${resource}`
  const xml = await get(endpoint)
  return xmlToJson(xml)
}

/**
 * Obtenir les métadonnées (XML) d'une image spécifique
 * Ex: getImageDetail('products', 1, 2)
 */
export async function getImageDetail(resource, id, imageId) {
  if (!resource || !id || !imageId) throw new Error('Paramètres manquants pour getImageDetail')
  const xml = await get(`images/${resource}/${id}/${imageId}`)
  return xmlToJson(xml)
}

/**
 * Uploader une nouvelle image pour une ressource.
 * @param {string} resource - Ex: 'products', 'categories'
 * @param {string|number} id - L'ID de la ressource (ex: ID du produit)
 * @param {File} file - L'objet fichier (provenant d'un <input type="file">)
 */
export async function uploadImage(resource, id, file) {
  if (!resource || !id || !file) throw new Error('Paramètres manquants pour uploadImage')

  const { url: apiBaseUrl, headers: baseHeaders } = getPrestashopFetchConfig()
  const requestUrl = `${apiBaseUrl}/images/${resource}/${id}`
  
  const formData = new FormData()
  // L'API PrestaShop recherche spécifiquement la clé "image"
  formData.append('image', file)

  try {
    const response = await axios.post(requestUrl, formData, {
      headers: {
        ...baseHeaders,
        'Content-Type': 'multipart/form-data',
      }
    })
    return xmlToJson(response.data)
  } catch (error) {
    const message = error?.response?.data || error?.message || 'Erreur inconnue'
    throw new Error(`Erreur lors de l'upload de l'image: ${message}`)
  }
}

/**
 * Supprimer une image spécifique
 */
export async function deleteImage(resource, id, imageId) {
  if (!resource || !id || !imageId) throw new Error('Paramètres manquants pour deleteImage')
  const xml = await del(`images/${resource}/${id}/${imageId}`)
  return xmlToJson(xml)
}

/**
 * Helper: Générer l'URL d'une image pour l'afficher dans une balise <img src="...">
 */
export function getImageUrl(resource, id, imageId) {
  const ws_key = '0guZ5RivHuDCeVFCHq1zeygHBCAhHb10'
  return `/ps/api/images/${resource}/${id}/${imageId}?ws_key=${ws_key}`
}
