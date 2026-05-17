import { importDataFromCSV } from './importService1.js'
import { importDataFromCSV2 } from './importService2.js'
import { importDataFromCSV3 } from './importService3.js'
import { importImagesFromZip } from './importIMage.js'

export async function importAllData({ csv1Text, csv2Text, csv3Text, zipFile }) {
  if (!csv1Text) throw new Error('CSV1 manquant')
  if (!csv2Text) throw new Error('CSV2 manquant')
  if (!csv3Text) throw new Error('CSV3 manquant')

  const results = {}

  results.csv1 = await importDataFromCSV(csv1Text)
  results.csv2 = await importDataFromCSV2(csv2Text)
  results.csv3 = await importDataFromCSV3(csv3Text)
  if (zipFile) {
    results.images = await importImagesFromZip(zipFile)
  }

  return results
}
