import { importDataFromCSV } from './importService1.js'
import { importDataFromCSV2 } from './importService2.js'
import { importDataFromCSV3 } from './importService3.js'
import { importImagesFromZip } from './importIMage.js'

export async function importAllData({ csv1Text, csv2Text, csv3Text, zipFile }) {
  if (!csv1Text) throw new Error('CSV1 manquant')
  if (!csv2Text) throw new Error('CSV2 manquant')
  if (!csv3Text) throw new Error('CSV3 manquant')

  const results = {}

  try {
    results.csv1 = await importDataFromCSV(csv1Text)
  } catch (err) {
    throw { message: `Import CSV1 échoué: ${err.message || err}`, details: [err.message || String(err)] }
  }

  try {
    results.csv2 = await importDataFromCSV2(csv2Text)
  } catch (err) {
    throw { message: `Import CSV2 échoué: ${err.message || err}`, details: [err.message || String(err)] }
  }

  try {
    results.csv3 = await importDataFromCSV3(csv3Text)
  } catch (err) {
    throw { message: `Import CSV3 échoué: ${err.message || err}`, details: [err.message || String(err)] }
  }

  if (zipFile) {
    try {
      results.images = await importImagesFromZip(zipFile)
    } catch (err) {
      // images errors are non-fatal for the rest
      results.images = { uploaded: 0, skipped: 0, missing: [], errors: [err.message || String(err)] }
    }
  }

  return results
}
