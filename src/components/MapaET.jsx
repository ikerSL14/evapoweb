import React, { useMemo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Tooltip, /*useMap */ } from 'react-leaflet'

// Componente para animar el vuelo al punto seleccionado
/* function FlyToPoint({ center }) {
  const map = useMap()
  React.useEffect(() => {
    if (center) {
      map.flyTo(center, 8, { duration: 1.2 })
    }
  }, [center, map])
  return null
}*/

export default function MapaET({ data, onPointClick, selectedCoords }) {
  // ✅ usar useMemo siempre, sin return temprano
  const puntos = useMemo(() => {
    if (!data || data.length === 0) return []
    const agrupado = {}

    data.forEach(row => {
      const key = `${row.LAT}_${row.LON}`
      if (!agrupado[key]) agrupado[key] = { LAT: row.LAT, LON: row.LON, items: [] }
      agrupado[key].items.push(row)
    })

    return Object.values(agrupado)
  }, [data])

  const centro = useMemo(() => {
    if (puntos.length > 0) {
      const lat = puntos.reduce((sum, p) => sum + p.LAT, 0) / puntos.length
      const lon = puntos.reduce((sum, p) => sum + p.LON, 0) / puntos.length
      return [lat, lon]
    }
    return [17.5, -91.25]
  }, [puntos])

  const getRepresentativeET = (items) => {
    if (!items || items.length === 0) return 0
    const et = items.map(i => i.ET_CALCULADA).find(v => v != null)
    return et ?? 0
  }

  const getColor = (et) => {
    if (et < 4) return '#2563eb'
    if (et < 6) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div className="w-full h-[600px] rounded-2xl shadow overflow-hidden">
      <MapContainer center={centro} zoom={7} style={{ height: '38%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/*<FlyToPoint center={selectedCoords ? [selectedCoords.LAT, selectedCoords.LON] : null} />*/}

        {puntos.map((p, i) => {
          const repET = getRepresentativeET(p.items)
          return (
            <CircleMarker
              key={i}
              center={[p.LAT, p.LON]}
              radius={8}
              pathOptions={{ color: getColor(repET), fillOpacity: 0.8 }}
              eventHandlers={{ click: () => onPointClick(p) }}
            >
              <Tooltip direction="top" offset={[0, -8]} opacity={0.9}>
                <div className="text-sm">
                  <div><b>Lat:</b> {p.LAT.toFixed(3)}</div>
                  <div><b>Lon:</b> {p.LON.toFixed(3)}</div>
                  <div><b>ET (ej):</b> {repET != null ? repET.toFixed(2) : 'N/A'} mm/día</div>
                </div>
              </Tooltip>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
