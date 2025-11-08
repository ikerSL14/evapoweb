import Papa from 'papaparse'
import { useEffect, useState } from 'react'

export default function useETdata() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true) // ✅ agregado

  useEffect(() => {
    fetch('/data/evapotranspiracion_completa.csv')
      .then(res => res.text())
      .then(csv => {
        Papa.parse(csv, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (result) => {
            // Normalizar campos: convertir "NA" o "NaN" a null
            const parsed = result.data.map(r => ({
              YEAR: Number(r.YEAR),
              LAT: Number(r.LAT),
              LON: Number(r.LON),
              Mes: String(r.Mes),
              T2M_MAX: isFinite(r.T2M_MAX) ? Number(r.T2M_MAX) : null,
              T2M_MIN: isFinite(r.T2M_MIN) ? Number(r.T2M_MIN) : null,
              RAD: isFinite(r.RAD) ? Number(r.RAD) : null,
              WS2M: isFinite(r.WS2M) ? Number(r.WS2M) : null,
              RH2M: isFinite(r.RH2M) ? Number(r.RH2M) : null,
              PS: isFinite(r.PS) ? Number(r.PS) : null,
              Month: isFinite(r.Month) ? Number(r.Month) : null,
              RAD_ESTIMADA: isFinite(r.RAD_ESTIMADA) ? Number(r.RAD_ESTIMADA) : null,
              ET_CALCULADA: isFinite(r.ET_CALCULADA) ? Number(r.ET_CALCULADA) : null,
            }))

            console.log('✅ Datos cargados:', parsed.slice(0, 5))
            setData(parsed)
            setLoading(false)
          }
        })
      })
      .catch(err => {
        console.error('Error cargando CSV:', err)
        setLoading(false)
      })
  }, [])

  return { data, loading } // ✅ devolvemos ambos
}
