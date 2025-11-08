import React, { useMemo, useState, useEffect } from "react";
import useETdata from "./hooks/useETdata";
import MapaET from "./components/MapaET";
import GraficaMensual from "./components/GraficaMensual";
import PanelDatos from "./components/PanelDatos";

export default function App() {
  const { data, loading } = useETdata(); // correcto

  const [selectedPoint, setSelectedPoint] = useState(null);


  const handlePointClick = (p) => {
    if (!p) return;
    const series = (p.items || [])
      .map(it => ({
        ...it,
        YEAR: Number(it.YEAR),
        Month: Number(it.Month)
      }))
      .sort((a, b) => a.YEAR - b.YEAR || a.Month - b.Month);

    const current = series[0] || {};
    setSelectedPoint({ LAT: p.LAT, LON: p.LON, ...current, series });
  };

  const handleChangeDate = (value) => {
    if (!selectedPoint?.series) return;
    const [yStr, mStr] = String(value).split("-");
    const y = Number(yStr), m = Number(mStr);
    const found = selectedPoint.series.find(s => s.YEAR === y && s.Month === m);
    if (found) {
      setSelectedPoint(prev => ({ ...found, LAT: prev.LAT, LON: prev.LON, series: prev.series }));
    }
  };

  const seriesForPlot = useMemo(() => {
    if (!selectedPoint?.series) return [];
    return selectedPoint.series.map(s => ({
      YEAR: s.YEAR,
      Month: s.Month,
      Mes: s.Mes,
      ET: Number(s.ET_CALCULADA),
      label: `${s.YEAR}-${s.Mes}`
    }));
  }, [selectedPoint]);

  return (
    <div className="min-h-screen p-6 bg-slate-900 text-slate-100">
      <div className="max-w-[1400px] mx-auto grid grid-cols-12 gap-6">
        <div className="col-span-5 space-y-4">
          <div className="p-4 flex items-center justify-between bg-slate-800/60 rounded-2xl shadow">
            <h1 className="text-xl font-bold text-blue-300">Evapotranspiración — Dashboard</h1>
            <div className="text-sm text-gray-400">Fuente: NASA POWER • CSV local</div>
          </div>

          {selectedPoint ? (
            <PanelDatos selectedPoint={selectedPoint} onChangeDate={handleChangeDate} />
          ) : (
            <div className="p-4 bg-slate-800/60 rounded-2xl shadow">
              Selecciona un punto en el mapa para ver datos y series.
            </div>
          )}

          <div className="p-4 bg-slate-800/60 rounded-2xl shadow">
            <h2 className="text-sm text-gray-300 mb-3">Gráfica — Serie del punto seleccionado</h2>
            <GraficaMensual series={seriesForPlot} />
          </div>
        </div>

        <div className="col-span-7">
          <div className="p-2 bg-slate-800/60 rounded-2xl shadow h-full">
            {loading ? (
              <div className="p-4">Cargando datos...</div>
            ) : (
              <MapaET
                data={data}
                onPointClick={handlePointClick}
                selectedCoords={selectedPoint ? { LAT: selectedPoint.LAT, LON: selectedPoint.LON } : null}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

